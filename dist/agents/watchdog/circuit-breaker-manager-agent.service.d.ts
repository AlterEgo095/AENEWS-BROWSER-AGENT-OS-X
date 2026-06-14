import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../interfaces/agent.interface';
import { AgentConnectorBridge } from '../bridge';
export declare enum CircuitBreakerState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
}
export interface AgentCircuitState {
    agentId: string;
    currentState: CircuitBreakerState;
    failureCount: number;
    lastFailureTime: string | null;
    lastSuccessTime: string | null;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    recommendedAction: string;
    failureHistory: AgentFailureRecord[];
}
export interface AgentFailureRecord {
    timestamp: string;
    errorCategory: string;
    errorMessage: string;
    taskId: string;
}
export declare enum GlobalHealthStatus {
    HEALTHY = "healthy",
    DEGRADED = "degraded",
    CRITICAL = "critical"
}
export interface RecoveryPlan {
    immediateActions: string[];
    phasedRecovery: {
        phase: number;
        description: string;
        agentsToRecover: string[];
        estimatedDurationMs: number;
    }[];
    monitoringStrategy: string;
    rollbackTriggers: string[];
}
export interface CircuitBreakerAssessment {
    agentStates: Record<string, AgentCircuitState>;
    globalHealth: GlobalHealthStatus;
    recoveryPlan: RecoveryPlan;
    timestamp: string;
}
export declare const WATCHDOG_CIRCUIT_BREAKER_MANAGER_CONFIG: AgentConfig;
export declare class CircuitBreakerManagerAgentService extends BaseAgentService {
    private readonly bridge?;
    private readonly circuitStates;
    private readonly defaultThresholds;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private assessHealth;
    private updateCircuitState;
    private planRecovery;
    private getOrCreateCircuitState;
    private getRecommendedAction;
    private calculateGlobalHealth;
    private describeAction;
    private parseAssessment;
    private parseRecoveryPlan;
    private applyRecommendedStateChanges;
    private generateFallbackRecoveryPlan;
    private persistCircuitStates;
    private restoreCircuitStates;
}
