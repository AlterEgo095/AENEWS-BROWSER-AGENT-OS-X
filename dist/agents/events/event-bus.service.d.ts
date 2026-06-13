import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IEventBusService, AgentEvent, EventSubscription, DeadLetterEntry } from '../interfaces/agent-event.interface';
import { EventStoreService } from './event-store.service';
import { DeadLetterQueueService } from './dead-letter-queue.service';
export declare class EventBusService implements IEventBusService, OnModuleInit, OnModuleDestroy {
    private readonly eventEmitter;
    private readonly eventStore;
    private readonly deadLetterQueue;
    private readonly logger;
    private readonly subscriptions;
    private readonly typeIndex;
    private readonly subscriberIndex;
    private eventVersion;
    constructor(eventEmitter: EventEmitter2, eventStore: EventStoreService, deadLetterQueue: DeadLetterQueueService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    publish<T>(eventData: Omit<AgentEvent<T>, 'id' | 'timestamp' | 'version'>): Promise<AgentEvent<T>>;
    subscribe(subscription: Omit<EventSubscription, 'id' | 'createdAt'>): Promise<string>;
    unsubscribe(subscriptionId: string): Promise<boolean>;
    getSubscriptions(subscriberId?: string): Promise<EventSubscription[]>;
    publishEvent(event: AgentEvent): Promise<void>;
    subscribeTo(eventType: string, handler: (event: AgentEvent) => Promise<void>): string;
    unsubscribeFrom(subscriptionId: string): void;
    getEventHistory(agentId: string, limit?: number): Promise<AgentEvent[]>;
    replayEvents(fromTimestamp: Date, toTimestamp: Date): AsyncIterable<AgentEvent>;
    getDeadLetterQueue(): DeadLetterEntry[];
    retryDeadLetter(entryId: string): Promise<void>;
    purgeDeadLetterQueue(): void;
    private deliverToSubscriptions;
    private handleEvent;
    private matchesFilter;
    getStats(): {
        totalSubscriptions: number;
        subscriptionsByType: Record<string, number>;
        totalSubscribers: number;
        deadLetterCount: number;
    };
}
