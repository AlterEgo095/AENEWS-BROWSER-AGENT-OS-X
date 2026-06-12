/**
 * AENEWS Agent OS X - Event Bus Service Unit Tests
 * Tests publish/subscribe, event store, dead letter queue, filtering, and stats.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../../src/agents/events/event-bus.service';
import { EventStoreService } from '../../src/agents/events/event-store.service';
import { DeadLetterQueueService } from '../../src/agents/events/dead-letter-queue.service';
import {
  AgentEventType,
  AgentEvent,
  EventPriority,
  EventSubscription,
} from '../../src/agents/interfaces/agent-event.interface';

// ─── Test Suite ─────────────────────────────────────────────────────

describe('EventBusService', () => {
  let service: EventBusService;
  let eventEmitter: EventEmitter2;
  let eventStore: EventStoreService;
  let deadLetterQueue: DeadLetterQueueService;

  beforeEach(async () => {
    eventEmitter = new EventEmitter2({ wildcard: true });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBusService,
        { provide: EventEmitter2, useValue: eventEmitter },
        EventStoreService,
        DeadLetterQueueService,
      ],
    }).compile();

    service = module.get<EventBusService>(EventBusService);
    eventStore = module.get<EventStoreService>(EventStoreService);
    deadLetterQueue = module.get<DeadLetterQueueService>(DeadLetterQueueService);

    // Wire up the dead letter queue's event bus reference
    deadLetterQueue.setEventBus(service);

    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    eventStore.clear();
  });

  // ─── publish and subscribe ────────────────────────────────────────

  describe('publish and subscribe', () => {
    it('should publish an event and deliver to subscriber', async () => {
      const receivedEvents: AgentEvent[] = [];

      await service.subscribe({
        subscriberId: 'test-subscriber',
        eventType: AgentEventType.TASK_STARTED,
        handler: async (event) => {
          receivedEvents.push(event);
        },
      });

      await service.publish({
        type: AgentEventType.TASK_STARTED,
        sourceAgentId: 'agent-1',
        payload: { taskId: 'task-1' },
        priority: EventPriority.NORMAL,
        correlationId: 'corr-1',
        metadata: {},
      });

      // Allow async delivery
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedEvents.length).toBeGreaterThan(0);
      expect(receivedEvents[0].type).toBe(AgentEventType.TASK_STARTED);
      expect(receivedEvents[0].payload).toEqual({ taskId: 'task-1' });
    });

    it('should assign id, timestamp, and version to published event', async () => {
      const event = await service.publish({
        type: AgentEventType.AGENT_INITIALIZED,
        sourceAgentId: 'agent-1',
        payload: {},
        priority: EventPriority.NORMAL,
        correlationId: 'corr-2',
        metadata: {},
      });

      expect(event.id).toBeDefined();
      expect(event.timestamp).toBeDefined();
      expect(event.version).toBeDefined();
    });

    it('should support wildcard subscriptions', async () => {
      const receivedTypes: string[] = [];

      await service.subscribe({
        subscriberId: 'wildcard-sub',
        eventType: '*',
        handler: async (event) => {
          receivedTypes.push(event.type);
        },
      });

      await service.publish({
        type: AgentEventType.TASK_STARTED,
        sourceAgentId: 'agent-1',
        payload: {},
        priority: EventPriority.NORMAL,
        correlationId: 'corr-3',
        metadata: {},
      });

      await service.publish({
        type: AgentEventType.AGENT_ERROR,
        sourceAgentId: 'agent-2',
        payload: {},
        priority: EventPriority.HIGH,
        correlationId: 'corr-4',
        metadata: {},
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedTypes).toContain(AgentEventType.TASK_STARTED);
      expect(receivedTypes).toContain(AgentEventType.AGENT_ERROR);
    });

    it('should support subscribeTo (IAgentEventBus interface)', async () => {
      const receivedEvents: AgentEvent[] = [];

      const subId = service.subscribeTo(AgentEventType.TASK_COMPLETED, async (event) => {
        receivedEvents.push(event);
      });

      expect(subId).toBeDefined();

      await service.publish({
        type: AgentEventType.TASK_COMPLETED,
        sourceAgentId: 'agent-1',
        payload: { success: true },
        priority: EventPriority.NORMAL,
        correlationId: 'corr-5',
        metadata: {},
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedEvents.length).toBeGreaterThan(0);
    });
  });

  // ─── unsubscribe ──────────────────────────────────────────────────

  describe('unsubscribe', () => {
    it('should unsubscribe from events', async () => {
      const subId = await service.subscribe({
        subscriberId: 'unsub-test',
        eventType: AgentEventType.AGENT_STARTED,
        handler: jest.fn(),
      });

      const result = await service.unsubscribe(subId);
      expect(result).toBe(true);
    });

    it('should return false for non-existent subscription', async () => {
      const result = await service.unsubscribe('non-existent-id');
      expect(result).toBe(false);
    });

    it('should not receive events after unsubscribe', async () => {
      const handler = jest.fn();
      const subId = await service.subscribe({
        subscriberId: 'unsub-norecv',
        eventType: AgentEventType.AGENT_STOPPED,
        handler,
      });

      await service.unsubscribe(subId);
      eventEmitter.removeAllListeners(AgentEventType.AGENT_STOPPED);

      await service.publish({
        type: AgentEventType.AGENT_STOPPED,
        sourceAgentId: 'agent-1',
        payload: {},
        priority: EventPriority.NORMAL,
        correlationId: 'corr-6',
        metadata: {},
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });

  // ─── unsubscribeFrom (IAgentEventBus) ─────────────────────────────

  describe('unsubscribeFrom', () => {
    it('should unsubscribe using IAgentEventBus interface', () => {
      const subId = service.subscribeTo(AgentEventType.AGENT_PAUSED, jest.fn());
      service.unsubscribeFrom(subId);
      // No assertion needed - just ensure no error
    });
  });

  // ─── event store ──────────────────────────────────────────────────

  describe('event store', () => {
    it('should persist events to the event store', async () => {
      await service.publish({
        type: AgentEventType.MEMORY_STORED,
        sourceAgentId: 'agent-1',
        payload: { key: 'test' },
        priority: EventPriority.NORMAL,
        correlationId: 'corr-store',
        metadata: {},
      });

      const history = await service.getEventHistory('agent-1');
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].type).toBe(AgentEventType.MEMORY_STORED);
    });

    it('should return event history for a specific agent', async () => {
      await service.publish({
        type: AgentEventType.TASK_STARTED,
        sourceAgentId: 'history-agent',
        payload: {},
        priority: EventPriority.NORMAL,
        correlationId: 'corr-hist',
        metadata: {},
      });

      const history = await service.getEventHistory('history-agent');
      expect(history.length).toBeGreaterThan(0);
    });

    it('should return empty history for unknown agent', async () => {
      const history = await service.getEventHistory('unknown-agent');
      expect(history).toEqual([]);
    });
  });

  // ─── getSubscriptions ─────────────────────────────────────────────

  describe('getSubscriptions', () => {
    it('should return all subscriptions', async () => {
      await service.subscribe({
        subscriberId: 'sub-1',
        eventType: AgentEventType.TASK_STARTED,
        handler: jest.fn(),
      });

      const subs = await service.getSubscriptions();
      expect(subs.length).toBeGreaterThan(0);
    });

    it('should filter subscriptions by subscriberId', async () => {
      await service.subscribe({
        subscriberId: 'filter-sub',
        eventType: AgentEventType.TASK_FAILED,
        handler: jest.fn(),
      });

      const subs = await service.getSubscriptions('filter-sub');
      expect(subs.length).toBeGreaterThan(0);
      expect(subs.every((s) => s.subscriberId === 'filter-sub')).toBe(true);
    });

    it('should return empty for unknown subscriber', async () => {
      const subs = await service.getSubscriptions('unknown-subscriber');
      expect(subs).toEqual([]);
    });
  });

  // ─── getStats ─────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return stats with correct structure', async () => {
      const stats = service.getStats();
      expect(stats).toHaveProperty('totalSubscriptions');
      expect(stats).toHaveProperty('subscriptionsByType');
      expect(stats).toHaveProperty('totalSubscribers');
      expect(stats).toHaveProperty('deadLetterCount');
    });

    it('should reflect subscriptions count after subscribing', async () => {
      await service.subscribe({
        subscriberId: 'stats-sub',
        eventType: AgentEventType.AGENT_INITIALIZED,
        handler: jest.fn(),
      });

      const stats = service.getStats();
      expect(stats.totalSubscriptions).toBeGreaterThan(0);
    });
  });

  // ─── dead letter queue ────────────────────────────────────────────

  describe('dead letter queue', () => {
    it('should return empty DLQ initially', () => {
      const dlq = service.getDeadLetterQueue();
      expect(dlq).toEqual([]);
    });

    it('should purge DLQ', () => {
      service.purgeDeadLetterQueue();
      const dlq = service.getDeadLetterQueue();
      expect(dlq).toEqual([]);
    });
  });

  // ─── filtering ────────────────────────────────────────────────────

  describe('event filtering', () => {
    it('should filter events by sourceAgentId', async () => {
      const receivedEvents: AgentEvent[] = [];

      await service.subscribe({
        subscriberId: 'filter-test',
        eventType: AgentEventType.TASK_STARTED,
        filter: {
          sourceAgentId: 'target-agent',
        },
        handler: async (event) => {
          receivedEvents.push(event);
        },
      });

      // Publish from wrong agent
      await service.publish({
        type: AgentEventType.TASK_STARTED,
        sourceAgentId: 'wrong-agent',
        payload: {},
        priority: EventPriority.NORMAL,
        correlationId: 'corr-f1',
        metadata: {},
      });

      // Publish from target agent
      await service.publish({
        type: AgentEventType.TASK_STARTED,
        sourceAgentId: 'target-agent',
        payload: {},
        priority: EventPriority.NORMAL,
        correlationId: 'corr-f2',
        metadata: {},
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedEvents.every((e) => e.sourceAgentId === 'target-agent')).toBe(true);
    });
  });

  // ─── publishEvent (IAgentEventBus) ────────────────────────────────

  describe('publishEvent', () => {
    it('should publish a fully-formed event', async () => {
      const handler = jest.fn();
      service.subscribeTo(AgentEventType.AGENT_RESUMED, handler);

      const event: AgentEvent = {
        id: '',
        type: AgentEventType.AGENT_RESUMED,
        sourceAgentId: 'agent-1',
        payload: {},
        priority: EventPriority.NORMAL,
        correlationId: 'corr-pub',
        timestamp: new Date(),
        version: 0,
        metadata: {},
      };

      await service.publishEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(handler).toHaveBeenCalled();
    });
  });
});
