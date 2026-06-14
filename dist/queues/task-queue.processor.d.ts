import { Job } from 'bull';
import { AgentRegistryService } from '../agents/registry/agent-registry.service';
import { InterAgentCommService } from '../agents/communication/inter-agent-comm.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { EventBusService } from '../agents/events/event-bus.service';
export interface TaskJobData {
    taskId: string;
    agentId: string;
    cluster?: string;
    payload: any;
    priority?: number;
    timeoutMs?: number;
    correlationId?: string;
    parentMissionId?: string;
}
export interface TaskJobResult {
    taskId: string;
    agentId: string;
    success: boolean;
    result: any;
    executionTimeMs: number;
    error?: string;
}
export declare class TaskQueueProcessor {
    private readonly agentRegistry;
    private readonly interAgentComm;
    private readonly realtimeGateway;
    private readonly eventBus;
    private readonly logger;
    constructor(agentRegistry: AgentRegistryService, interAgentComm: InterAgentCommService, realtimeGateway: RealtimeGateway, eventBus: EventBusService);
    processTask(job: Job<TaskJobData>): Promise<TaskJobResult>;
    onActive(job: Job<TaskJobData>): void;
    onCompleted(job: Job<TaskJobData>, result: TaskJobResult): void;
    onFailed(job: Job<TaskJobData>, error: Error): void;
}
