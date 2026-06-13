import { Logger } from '@nestjs/common';
import { CoreAgent, AgentExecutionResult } from '../interfaces';
import { AgentRegistryService } from '../registry/agent-registry.service';
declare abstract class CoreAgentBase {
    protected readonly registry: AgentRegistryService;
    abstract readonly agentId: CoreAgent;
    abstract readonly name: string;
    protected readonly logger: Logger;
    constructor(registry: AgentRegistryService, loggerName: string);
    getDefinition(): import("../interfaces").AgentDefinition | undefined;
    isActive(): boolean;
}
export declare class MissionOrchestratorAgent extends CoreAgentBase {
    readonly agentId = CoreAgent.MISSION_ORCHESTRATOR;
    readonly name = "Mission Orchestrator";
    constructor(registry: AgentRegistryService);
    orchestrate(missionId: string, instruction: string): Promise<AgentExecutionResult>;
}
export declare class MissionPlannerAgent extends CoreAgentBase {
    readonly agentId = CoreAgent.MISSION_PLANNER;
    readonly name = "Mission Planner";
    constructor(registry: AgentRegistryService);
    plan(missionId: string, instruction: string): Promise<AgentExecutionResult>;
}
export declare class TaskSchedulerAgent extends CoreAgentBase {
    readonly agentId = CoreAgent.TASK_SCHEDULER;
    readonly name = "Task Scheduler";
    constructor(registry: AgentRegistryService);
    schedule(missionId: string, tasks: any[]): Promise<AgentExecutionResult>;
}
export declare class MemoryManagerAgent extends CoreAgentBase {
    readonly agentId = CoreAgent.MEMORY_MANAGER;
    readonly name = "Memory Manager";
    constructor(registry: AgentRegistryService);
    store(missionId: string, key: string, data: any): Promise<AgentExecutionResult>;
    retrieve(missionId: string, key: string): Promise<AgentExecutionResult>;
}
export declare class ResourceManagerAgent extends CoreAgentBase {
    readonly agentId = CoreAgent.RESOURCE_MANAGER;
    readonly name = "Resource Manager";
    constructor(registry: AgentRegistryService);
    allocate(missionId: string, taskType: string, budget: number): Promise<AgentExecutionResult>;
}
export declare class SecurityManagerAgent extends CoreAgentBase {
    readonly agentId = CoreAgent.SECURITY_MANAGER;
    readonly name = "Security Manager";
    constructor(registry: AgentRegistryService);
    validate(missionId: string, action: string, target: string): Promise<AgentExecutionResult>;
}
export declare class CertificationManagerAgent extends CoreAgentBase {
    readonly agentId = CoreAgent.CERTIFICATION_MANAGER;
    readonly name = "Certification Manager";
    constructor(registry: AgentRegistryService);
    certify(missionId: string, deliverables: any[]): Promise<AgentExecutionResult>;
}
export declare class DeliveryManagerAgent extends CoreAgentBase {
    readonly agentId = CoreAgent.DELIVERY_MANAGER;
    readonly name = "Delivery Manager";
    constructor(registry: AgentRegistryService);
    deliver(missionId: string, artifacts: any[]): Promise<AgentExecutionResult>;
}
export declare class MonitoringManagerAgent extends CoreAgentBase {
    readonly agentId = CoreAgent.MONITORING_MANAGER;
    readonly name = "Monitoring Manager";
    constructor(registry: AgentRegistryService);
    getHealth(): Promise<AgentExecutionResult>;
}
export declare class RecoveryManagerAgent extends CoreAgentBase {
    readonly agentId = CoreAgent.RECOVERY_MANAGER;
    readonly name = "Recovery Manager";
    constructor(registry: AgentRegistryService);
    recover(missionId: string, error: string, strategy?: 'retry' | 'rollback' | 'skip'): Promise<AgentExecutionResult>;
}
export {};
