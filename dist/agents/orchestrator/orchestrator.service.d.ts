import { TaskPriority, OrchestrationPlan, AgentCluster } from '../interfaces/agent.interface';
import { TaskDecomposerService } from './task-decomposer.service';
import { TaskPlannerService } from './task-planner.service';
import { TaskExecutorService } from './task-executor.service';
import { TaskCriticService } from './task-critic.service';
import { TaskRepairService } from './task-repair.service';
import { TaskValidatorService } from './task-validator.service';
import { TaskDeliveryService } from './task-delivery.service';
import { EventBusService } from '../events/event-bus.service';
import { AgentRegistryService } from '../registry/agent-registry.service';
import { MemoryService } from '../memory/memory.service';
export interface OrchestrationRequest {
    taskId?: string;
    payload: any;
    cluster?: AgentCluster;
    priority?: TaskPriority;
    context?: Record<string, any>;
    parentTaskId?: string;
    maxRepairAttempts?: number;
    timeoutMs?: number;
    skipCritique?: boolean;
    skipValidation?: boolean;
    deliveryFormat?: string;
}
export interface OrchestrationResult {
    taskId: string;
    success: boolean;
    result: any;
    plan: OrchestrationPlan;
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    repairAttempts: number;
    totalExecutionTimeMs: number;
    error?: string;
    phaseTimings: PhaseTiming[];
    validationScore?: number;
    critiqueScore?: number;
}
export interface PhaseTiming {
    phase: OrchestrationPhase;
    durationMs: number;
    success: boolean;
}
export declare enum OrchestrationPhase {
    DECOMPOSE = "decompose",
    PLAN = "plan",
    EXECUTE = "execute",
    CRITIQUE = "critique",
    REPAIR = "repair",
    VALIDATE = "validate",
    DELIVER = "deliver"
}
export declare class OrchestratorService {
    private readonly decomposer;
    private readonly planner;
    private readonly executor;
    private readonly critic;
    private readonly repairService;
    private readonly validator;
    private readonly deliveryService;
    private readonly eventBusService;
    private readonly agentRegistry;
    private readonly memoryService;
    private readonly logger;
    private readonly activeOrchestrations;
    private readonly cancelledTasks;
    constructor(decomposer: TaskDecomposerService, planner: TaskPlannerService, executor: TaskExecutorService, critic: TaskCriticService, repairService: TaskRepairService, validator: TaskValidatorService, deliveryService: TaskDeliveryService, eventBusService: EventBusService, agentRegistry: AgentRegistryService, memoryService: MemoryService);
    orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult>;
    getOrchestrationStatus(taskId: string): OrchestrationResult | null;
    cancelOrchestration(taskId: string): Promise<boolean>;
    getActiveOrchestrations(): string[];
    getStats(): {
        activeOrchestrations: number;
        cancelledTasks: number;
    };
    private isCancelled;
    private cancelResult;
    private emitOrchestrationEvent;
    private finalize;
    private storeOrchestrationResult;
}
