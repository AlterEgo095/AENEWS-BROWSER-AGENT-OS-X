import { TaskDefinition, TaskPriority, OrchestrationPlan, AgentCluster, AgentInput, ExecutionPlan } from '../interfaces/agent.interface';
import { AgentRegistryService } from '../registry/agent-registry.service';
import { OrchestrationRequest } from './orchestrator.service';
import { AgentConnectorBridge } from '../bridge';
export interface PlanningConstraints {
    maxParallelSteps: number;
    maxTotalDurationMs: number;
    requiredCluster?: AgentCluster;
    priorityBoost?: TaskPriority;
    respectDependencies: boolean;
    optimizeForSpeed: boolean;
    maxMemoryPerStepMb: number;
    maxCpuPerStepPercent: number;
    maxAgentLoadPercent: number;
}
export interface PlanningResult {
    plan: OrchestrationPlan;
    warnings: string[];
    estimatedDurationMs: number;
    parallelGroups: number;
    resourceUtilization: ResourceUtilization;
}
export interface ResourceUtilization {
    estimatedPeakMemoryMb: number;
    estimatedPeakCpuPercent: number;
    estimatedTotalMemoryMbHours: number;
    agentAssignments: Map<string, number>;
}
export declare class TaskPlannerService {
    private readonly agentRegistry;
    private readonly bridge?;
    private readonly logger;
    constructor(agentRegistry: AgentRegistryService, bridge?: AgentConnectorBridge | undefined);
    createPlan(subtasks: TaskDefinition[], request: OrchestrationRequest): Promise<OrchestrationPlan>;
    llmPlan(input: AgentInput, subtasks: TaskDefinition[]): Promise<ExecutionPlan | null>;
    private buildSteps;
    private estimateStepResources;
    private resolveDependencies;
    private findStepByNameOrId;
    private optimizeExecutionOrder;
    private topologicalSort;
    private groupParallelSteps;
    private validateResourceConstraints;
    private estimateDuration;
}
