import { Job } from 'bull';
import { EventBusService } from '../agents/events/event-bus.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
export declare enum EventJobType {
    REPLAY_EVENTS = "replay_events",
    BATCH_NOTIFY = "batch_notify",
    AGGREGATE_METRICS = "aggregate_metrics",
    PROCESS_DLQ = "process_dlq"
}
export interface EventJobData {
    type: EventJobType;
    payload: any;
}
export declare class EventQueueProcessor {
    private readonly eventBus;
    private readonly realtimeGateway;
    private readonly logger;
    constructor(eventBus: EventBusService, realtimeGateway: RealtimeGateway);
    processEventJob(job: Job<EventJobData>): Promise<any>;
    private handleReplayEvents;
    private handleBatchNotify;
    private handleAggregateMetrics;
    private handleProcessDLQ;
    onActive(job: Job): void;
    onCompleted(job: Job): void;
    onFailed(job: Job, error: Error): void;
}
