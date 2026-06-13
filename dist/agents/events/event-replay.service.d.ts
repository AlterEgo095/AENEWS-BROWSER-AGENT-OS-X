import { IEventReplayService, EventReplayRequest, EventReplayResult, AgentEvent, AgentEventType } from '../interfaces/agent-event.interface';
import { EventStoreService } from './event-store.service';
import { EventBusService } from './event-bus.service';
interface ReplayState {
    id: string;
    request: EventReplayRequest;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    result: EventReplayResult | null;
    startedAt: Date;
    completedAt?: Date;
    progress: number;
    processedCount: number;
}
interface RateLimiterConfig {
    eventsPerSecond: number;
    burstSize: number;
}
export interface ReplayFilter {
    eventTypes?: AgentEventType[];
    sourceAgentId?: string;
    targetAgentId?: string;
    minPriority?: number;
    customFilter?: (event: AgentEvent) => boolean;
}
export declare class EventReplayService implements IEventReplayService {
    private readonly eventStore;
    private readonly eventBus;
    private readonly logger;
    private readonly activeReplays;
    private readonly rateLimiterConfig;
    private lastReplayTimestamp;
    private tokenBucket;
    constructor(eventStore: EventStoreService, eventBus: EventBusService);
    replay(request: EventReplayRequest): Promise<EventReplayResult>;
    replayForAgent(agentId: string, fromTimestamp: Date, toTimestamp: Date, options?: {
        eventTypes?: AgentEventType[];
        maxEvents?: number;
        targetSubscriberId?: string;
    }): Promise<EventReplayResult>;
    replayWithFilter(fromTimestamp: Date, toTimestamp: Date, filter: ReplayFilter, options?: {
        maxEvents?: number;
        targetSubscriberId?: string;
    }): Promise<EventReplayResult>;
    getReplayStatus(replayId: string): Promise<EventReplayResult | null>;
    getReplayState(replayId: string): ReplayState | null;
    cancelReplay(replayId: string): boolean;
    getActiveReplays(): Array<{
        id: string;
        status: string;
        startedAt: Date;
        progress: number;
        processedCount: number;
    }>;
    setRateLimiterConfig(config: Partial<RateLimiterConfig>): void;
    private rateLimit;
    private sleep;
}
export {};
