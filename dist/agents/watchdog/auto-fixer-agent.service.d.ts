import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../interfaces/agent.interface';
import { AgentConnectorBridge } from '../bridge';
export declare enum RepairStrategy {
    RETRY = "RETRY",
    REASSIGN = "REASSIGN",
    SIMPLIFY = "SIMPLIFY",
    FALLBACK = "FALLBACK",
    ESCALATE = "ESCALATE"
}
export interface RepairPlan {
    repairStrategy: RepairStrategy;
    modifiedParameters: Record<string, any>;
    expectedSuccessRate: number;
    alternativeApproaches: string[];
    reasoning: string;
}
export interface RepairExecutionResult {
    plan: RepairPlan;
    executed: boolean;
    executionSuccess: boolean;
    executionOutput: any;
    totalCostUsd: number;
    totalDurationMs: number;
}
export declare const WATCHDOG_AUTO_FIXER_CONFIG: AgentConfig;
export declare class AutoFixerAgentService extends BaseAgentService {
    private readonly bridge?;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private planRepair;
    private executeRepair;
    private autoRepair;
    private parseRepairPlan;
    private createFallbackRepairPlan;
}
