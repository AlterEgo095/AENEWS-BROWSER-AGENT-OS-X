import { Job } from 'bull';
import { MissionRuntimeEngine } from '../software-factory/runtime/mission-runtime.engine';
import { MissionMetricsService } from '../software-factory/runtime/mission-metrics.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { EventBusService } from '../agents/events/event-bus.service';
export interface MissionJobData {
    missionId: string;
    instruction: string;
    description?: string;
    quality?: string;
    budgetMaxUsd?: number;
    deadline?: string;
    priority?: number;
    submittedBy?: string;
    tenantId?: string;
}
export interface MissionJobResult {
    missionId: string;
    success: boolean;
    certified: boolean;
    qualityScore: number;
    totalDurationMs: number;
    totalCostUsd: number;
    artifactCount: number;
    errors: string[];
}
export declare class MissionQueueProcessor {
    private readonly runtimeEngine;
    private readonly metricsService;
    private readonly realtimeGateway;
    private readonly eventBus;
    private readonly logger;
    constructor(runtimeEngine: MissionRuntimeEngine, metricsService: MissionMetricsService, realtimeGateway: RealtimeGateway, eventBus: EventBusService);
    processMission(job: Job<MissionJobData>): Promise<MissionJobResult>;
    onActive(job: Job<MissionJobData>): void;
    onCompleted(job: Job<MissionJobData>, result: MissionJobResult): void;
    onFailed(job: Job<MissionJobData>, error: Error): void;
    private categorizeMission;
}
