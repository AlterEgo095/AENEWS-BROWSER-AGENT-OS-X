import { AgentOutput, OrchestrationPlan } from '../interfaces/agent.interface';
import { AgentRegistryService } from '../registry/agent-registry.service';
import { EventBusService } from '../events/event-bus.service';
export interface StepExecutionResult {
    stepId: string;
    stepOrder: number;
    agentId: string;
    success: boolean;
    output: AgentOutput;
    executionTimeMs: number;
    retryCount: number;
    timedOut: boolean;
}
export interface ExecutionConfig {
    defaultStepTimeoutMs: number;
    maxStepRetries: number;
    retryBackoffBaseMs: number;
    maxParallelSteps: number;
    continueOnFailure: boolean;
}
export declare class TaskExecutorService {
    private readonly agentRegistry;
    private readonly eventBusService;
    private readonly logger;
    private readonly config;
    constructor(agentRegistry: AgentRegistryService, eventBusService: EventBusService);
    executePlan(plan: OrchestrationPlan, correlationId: string): Promise<StepExecutionResult[]>;
    private executeStep;
    private executeWithTimeout;
    private findAgentForStep;
    setConfig(config: Partial<ExecutionConfig>): void;
    private buildDependencyMap;
    private sleep;
}
