/**
 * AENEWS Agent OS X - Event Bus Service
 * Central publish/subscribe event system for agent communication.
 * Implements both IEventBusService and IAgentEventBus interfaces.
 * Supports typed events, filtering, persistence, dead letter handling,
 * event history queries, and async event replay.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  IEventBusService,
  IAgentEventBus,
  AgentEvent,
  AgentEventType,
  EventSubscription,
  EventFilter,
  EventHandler,
  EventPriority,
  DeadLetterEntry,
} from '../interfaces/agent-event.interface';
import { EventStoreService } from './event-store.service';
import { DeadLetterQueueService } from './dead-letter-queue.service';

@Injectable()
export class EventBusService implements IEventBusService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private readonly subscriptions: Map<string, EventSubscription> = new Map();
  private readonly typeIndex: Map<string, Set<string>> = new Map();
  private readonly subscriberIndex: Map<string, Set<string>> = new Map();
  private eventVersion = 1;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly eventStore: EventStoreService,
    private readonly deadLetterQueue: DeadLetterQueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Event Bus initialized');
  }

  async onModuleDestroy(): Promise<void> {
    this.subscriptions.clear();
    this.typeIndex.clear();
    this.subscriberIndex.clear();
    this.logger.log('Event Bus destroyed');
  }

  // ─── IEventBusService Implementation ──────────────────────────────

  /**
   * Publish an event to all subscribers.
   * Also persists the event to the event store.
   */
  async publish<T>(
    eventData: Omit<AgentEvent<T>, 'id' | 'timestamp' | 'version'>,
  ): Promise<AgentEvent<T>> {
    const event: AgentEvent<T> = {
      ...eventData,
      id: uuidv4(),
      timestamp: new Date(),
      version: this.eventVersion,
    };

    this.logger.debug?.(`Publishing event ${event.type} from ${event.sourceAgentId}`);

    // Persist event to the event store
    try {
      await this.eventStore.store(event);
    } catch (error) {
      this.logger.warn(`Failed to store event ${event.id}: ${(error as Error).message}`);
    }

    // Emit via NestJS EventEmitter2
    try {
      await this.eventEmitter.emitAsync(event.type, event);

      // Also emit wildcard for '*' subscribers
      await this.eventEmitter.emitAsync('*', event);

      // Emit to cluster-specific listeners
      if (event.cluster) {
        await this.eventEmitter.emitAsync(`cluster:${event.cluster}`, event);
      }
    } catch (error) {
      this.logger.error(`Error emitting event ${event.type}: ${(error as Error).message}`);
    }

    // Deliver to matching subscriptions
    await this.deliverToSubscriptions(event);

    return event;
  }

  /**
   * Subscribe to events of a specific type (IEventBusService interface).
   */
  async subscribe(subscription: Omit<EventSubscription, 'id' | 'createdAt'>): Promise<string> {
    const id = uuidv4();
    const fullSubscription: EventSubscription = {
      ...subscription,
      id,
      createdAt: new Date(),
    };

    this.subscriptions.set(id, fullSubscription);

    // Update type index
    const eventType = subscription.eventType;
    if (!this.typeIndex.has(eventType)) {
      this.typeIndex.set(eventType, new Set());
    }
    this.typeIndex.get(eventType)!.add(id);

    // Update subscriber index
    const subscriberId = subscription.subscriberId;
    if (!this.subscriberIndex.has(subscriberId)) {
      this.subscriberIndex.set(subscriberId, new Set());
    }
    this.subscriberIndex.get(subscriberId)!.add(id);

    // Register handler with EventEmitter2
    if (eventType === '*') {
      this.eventEmitter.on('*', (event: AgentEvent) => {
        this.handleEvent(fullSubscription, event);
      });
    } else {
      this.eventEmitter.on(eventType, (event: AgentEvent) => {
        this.handleEvent(fullSubscription, event);
      });
    }

    this.logger.debug?.(`Subscription ${id} created for ${eventType} by ${subscriberId}`);

    return id;
  }

  /**
   * Unsubscribe from events (IEventBusService interface).
   */
  async unsubscribe(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    // Remove from type index
    const typeSet = this.typeIndex.get(subscription.eventType);
    if (typeSet) {
      typeSet.delete(subscriptionId);
      if (typeSet.size === 0) {
        this.typeIndex.delete(subscription.eventType);
      }
    }

    // Remove from subscriber index
    const subscriberSet = this.subscriberIndex.get(subscription.subscriberId);
    if (subscriberSet) {
      subscriberSet.delete(subscriptionId);
      if (subscriberSet.size === 0) {
        this.subscriberIndex.delete(subscription.subscriberId);
      }
    }

    // Remove handler from EventEmitter2
    this.eventEmitter.removeListener(subscription.eventType, subscription.handler);

    this.subscriptions.delete(subscriptionId);

    this.logger.debug?.(`Subscription ${subscriptionId} removed`);
    return true;
  }

  /**
   * Get subscriptions, optionally filtered by subscriber.
   */
  async getSubscriptions(subscriberId?: string): Promise<EventSubscription[]> {
    if (subscriberId) {
      const subscriptionIds = this.subscriberIndex.get(subscriberId);
      if (!subscriptionIds) return [];

      return Array.from(subscriptionIds)
        .map((id) => this.subscriptions.get(id))
        .filter((s): s is EventSubscription => s !== undefined);
    }

    return Array.from(this.subscriptions.values());
  }

  // ─── IAgentEventBus Implementation ────────────────────────────────

  /**
   * Publish a fully-formed AgentEvent (IAgentEventBus interface).
   * If the event lacks id/timestamp/version, they will be assigned.
   */
  async publishEvent(event: AgentEvent): Promise<void> {
    // Ensure event has required fields
    if (!event.id) {
      (event as any).id = uuidv4();
    }
    if (!event.timestamp) {
      (event as any).timestamp = new Date();
    }
    if (!(event as any).version) {
      (event as any).version = this.eventVersion;
    }

    this.logger.debug?.(`Publishing event ${event.type} from ${event.sourceAgentId}`);

    // Persist to event store
    try {
      await this.eventStore.store(event);
    } catch (error) {
      this.logger.warn(`Failed to store event ${event.id}: ${(error as Error).message}`);
    }

    // Emit via EventEmitter2
    try {
      await this.eventEmitter.emitAsync(event.type, event);
      await this.eventEmitter.emitAsync('*', event);
      if (event.cluster) {
        await this.eventEmitter.emitAsync(`cluster:${event.cluster}`, event);
      }
    } catch (error) {
      this.logger.error(`Error emitting event ${event.type}: ${(error as Error).message}`);
    }

    // Deliver to matching subscriptions
    await this.deliverToSubscriptions(event);
  }

  /**
   * Simple subscribe by event type and handler (IAgentEventBus interface).
   * Returns the subscription ID.
   */
  subscribeTo(eventType: string, handler: (event: AgentEvent) => Promise<void>): string {
    const id = uuidv4();

    const subscription: EventSubscription = {
      id,
      subscriberId: `sub-${id.substring(0, 8)}`,
      eventType: eventType as AgentEventType | '*',
      handler,
      createdAt: new Date(),
    };

    this.subscriptions.set(id, subscription);

    // Update indexes
    if (!this.typeIndex.has(eventType)) {
      this.typeIndex.set(eventType, new Set());
    }
    this.typeIndex.get(eventType)!.add(id);

    if (!this.subscriberIndex.has(subscription.subscriberId)) {
      this.subscriberIndex.set(subscription.subscriberId, new Set());
    }
    this.subscriberIndex.get(subscription.subscriberId)!.add(id);

    // Register handler with EventEmitter2
    this.eventEmitter.on(eventType, (event: AgentEvent) => {
      this.handleEvent(subscription, event);
    });

    this.logger.debug?.(`Simple subscription ${id} created for ${eventType}`);

    return id;
  }

  /**
   * Unsubscribe by subscription ID (IAgentEventBus interface).
   */
  unsubscribeFrom(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Remove from type index
    const typeSet = this.typeIndex.get(subscription.eventType);
    if (typeSet) {
      typeSet.delete(subscriptionId);
      if (typeSet.size === 0) {
        this.typeIndex.delete(subscription.eventType);
      }
    }

    // Remove from subscriber index
    const subscriberSet = this.subscriberIndex.get(subscription.subscriberId);
    if (subscriberSet) {
      subscriberSet.delete(subscriptionId);
      if (subscriberSet.size === 0) {
        this.subscriberIndex.delete(subscription.subscriberId);
      }
    }

    this.eventEmitter.removeListener(subscription.eventType, subscription.handler);
    this.subscriptions.delete(subscriptionId);

    this.logger.debug?.(`Subscription ${subscriptionId} removed (IAgentEventBus)`);
  }

  /**
   * Get event history for a specific agent (IAgentEventBus interface).
   */
  async getEventHistory(agentId: string, limit?: number): Promise<AgentEvent[]> {
    const entries = await this.eventStore.query({
      sourceAgentId: agentId,
      limit: limit || 100,
    });

    return entries.map((entry) => entry.event);
  }

  /**
   * Replay events from a time range as an async iterable (IAgentEventBus interface).
   */
  async *replayEvents(fromTimestamp: Date, toTimestamp: Date): AsyncIterable<AgentEvent> {
    const entries = await this.eventStore.query({
      fromTimestamp,
      toTimestamp,
      limit: 10000,
    });

    for (const entry of entries) {
      yield entry.event;
    }
  }

  // ─── Dead Letter Queue Integration ────────────────────────────────

  /**
   * Get the current dead letter queue entries.
   */
  getDeadLetterQueue(): DeadLetterEntry[] {
    // The DLQ service stores entries in a Map internally, we need to expose them
    return this.deadLetterQueue.getAll();
  }

  /**
   * Retry a dead letter queue entry.
   */
  async retryDeadLetter(entryId: string): Promise<void> {
    const success = await this.deadLetterQueue.retry(entryId);
    if (!success) {
      this.logger.warn(`Failed to retry dead letter entry ${entryId}`);
    }
  }

  /**
   * Purge all entries from the dead letter queue.
   */
  purgeDeadLetterQueue(): void {
    this.deadLetterQueue.purge();
    this.logger.log('Dead letter queue purged');
  }

  // ─── Private Methods ──────────────────────────────────────────────

  /**
   * Deliver an event to matching subscriptions.
   */
  private async deliverToSubscriptions(event: AgentEvent): Promise<void> {
    const matchingSubscriptions: EventSubscription[] = [];

    // Exact type match
    const typeSubs = this.typeIndex.get(event.type);
    if (typeSubs) {
      for (const subId of typeSubs) {
        const sub = this.subscriptions.get(subId);
        if (sub) matchingSubscriptions.push(sub);
      }
    }

    // Wildcard match
    const wildcardSubs = this.typeIndex.get('*');
    if (wildcardSubs) {
      for (const subId of wildcardSubs) {
        const sub = this.subscriptions.get(subId);
        if (sub && !matchingSubscriptions.includes(sub)) {
          matchingSubscriptions.push(sub);
        }
      }
    }

    // Deliver to each matching subscription
    for (const subscription of matchingSubscriptions) {
      await this.handleEvent(subscription, event);
    }
  }

  /**
   * Handle an event for a subscription with filtering and error handling.
   * Failed handlers send the event to the dead letter queue.
   */
  private async handleEvent(subscription: EventSubscription, event: AgentEvent): Promise<void> {
    try {
      // Apply filter
      if (subscription.filter && !this.matchesFilter(event, subscription.filter)) {
        return;
      }

      await subscription.handler(event);

      // Mark event as processed in store
      const storeEntry = await this.eventStore.getEvent(event.id);
      if (storeEntry) {
        await this.eventStore.markProcessed(storeEntry.id);
      }
    } catch (error) {
      this.logger.error(
        `Error handling event ${event.type} for subscription ${subscription.id}: ${(error as Error).message}`,
      );

      // Add to dead letter queue
      try {
        await this.deadLetterQueue.add({
          originalEvent: event,
          error: (error as Error).message,
          failureCount: 1,
          lastFailedAt: new Date(),
          canRetry: true,
          metadata: {
            subscriptionId: subscription.id,
            subscriberId: subscription.subscriberId,
          },
        });
      } catch (dlqError) {
        this.logger.error(
          `Failed to add event to dead letter queue: ${(dlqError as Error).message}`,
        );
      }

      // Re-emit as failed event for system-level handling
      this.eventEmitter.emit('event.handler.failed', {
        event,
        subscription,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Check if an event matches a filter.
   */
  private matchesFilter(event: AgentEvent, filter: EventFilter): boolean {
    if (filter.sourceAgentId && event.sourceAgentId !== filter.sourceAgentId) {
      return false;
    }

    if (filter.cluster && event.cluster !== filter.cluster) {
      return false;
    }

    if (filter.priorityMin !== undefined && event.priority < filter.priorityMin) {
      return false;
    }

    if (filter.custom && !filter.custom(event)) {
      return false;
    }

    return true;
  }

  /**
   * Get event bus statistics.
   */
  getStats(): {
    totalSubscriptions: number;
    subscriptionsByType: Record<string, number>;
    totalSubscribers: number;
    deadLetterCount: number;
  } {
    const subscriptionsByType: Record<string, number> = {};

    for (const [type, subs] of this.typeIndex) {
      subscriptionsByType[type] = subs.size;
    }

    return {
      totalSubscriptions: this.subscriptions.size,
      subscriptionsByType,
      totalSubscribers: this.subscriberIndex.size,
      deadLetterCount: this.deadLetterQueue.getCount(),
    };
  }
}
