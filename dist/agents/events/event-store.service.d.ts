import { OnModuleInit } from '@nestjs/common';
import { IEventStoreService, AgentEvent, AgentEventType, EventStoreEntry, EventProcessingStatus } from '../interfaces/agent-event.interface';
export interface EventStoreStatistics {
    totalEvents: number;
    byStatus: Record<EventProcessingStatus, number>;
    byType: Record<string, number>;
    byAgentId: Record<string, number>;
    oldestEvent?: Date;
    newestEvent?: Date;
    totalPayloadSizeBytes: number;
    eventsPerMinute: number;
    avgProcessingTimeMs: number;
}
export declare class EventStoreService implements IEventStoreService, OnModuleInit {
    private readonly logger;
    private readonly records;
    private readonly typeIndex;
    private readonly sourceIndex;
    private readonly targetIndex;
    private readonly correlationIndex;
    private readonly timeIndex;
    private maxStoreSize;
    private initializedAt;
    private totalProcessingTimeMs;
    private processedCount;
    onModuleInit(): Promise<void>;
    store(event: AgentEvent): Promise<EventStoreEntry>;
    getEvent(id: string): Promise<EventStoreEntry | null>;
    getRawEvent(entryId: string): AgentEvent | null;
    query(filter: {
        eventTypes?: AgentEventType[];
        sourceAgentId?: string;
        targetAgentId?: string;
        correlationId?: string;
        fromTimestamp?: Date;
        toTimestamp?: Date;
        limit?: number;
        offset?: number;
    }): Promise<EventStoreEntry[]>;
    queryByAgent(agentId: string, options?: {
        eventTypes?: AgentEventType[];
        fromTimestamp?: Date;
        toTimestamp?: Date;
        limit?: number;
    }): Promise<EventStoreEntry[]>;
    queryByType(eventType: AgentEventType, options?: {
        sourceAgentId?: string;
        fromTimestamp?: Date;
        toTimestamp?: Date;
        limit?: number;
    }): Promise<EventStoreEntry[]>;
    queryByTimeRange(from: Date, to: Date, limit?: number): Promise<EventStoreEntry[]>;
    markProcessed(id: string): Promise<void>;
    markFailed(id: string, error: string): Promise<void>;
    getCount(): number;
    getCountByType(eventType: AgentEventType): number;
    getCountByAgent(agentId: string): number;
    getCountByTimeRange(from: Date, to: Date): number;
    getStatistics(): EventStoreStatistics;
    getStats(): {
        totalEvents: number;
        byStatus: Record<EventProcessingStatus, number>;
        byType: Record<string, number>;
        oldestEvent?: Date;
        newestEvent?: Date;
    };
    clear(): number;
    private insertIntoTimeIndex;
    private evictOldest;
    private removeEntry;
}
