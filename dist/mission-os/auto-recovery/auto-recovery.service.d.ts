import { OnModuleInit } from '@nestjs/common';
export declare enum FailureType {
    CRASH = "crash",
    TIMEOUT = "timeout",
    OOM = "oom",
    CIRCUIT_BREAKER_OPEN = "circuit_breaker_open",
    HEALTH_CHECK_FAILED = "health_check_failed",
    UNHANDLED_EXCEPTION = "unhandled_exception",
    DEADLOCK = "deadlock",
    DEPENDENCY_FAILURE = "dependency_failure"
}
export declare enum RecoveryStrategy {
    RESTART = "restart",
    RESTORE_MEMORY_RESUME = "restore_memory_resume",
    FAILOVER = "failover",
    SCALE_OUT = "scale_out",
    DEGRADE = "degrade",
    QUARANTINE = "quarantine"
}
export declare enum RecoveryStatus {
    DETECTED = "detected",
    ANALYZING = "analyzing",
    RECOVERING = "recovering",
    SUCCEEDED = "succeeded",
    FAILED = "failed",
    ESCALATED = "escalated"
}
export interface AutoRecoveryAction {
    id: string;
    agentId: string;
    failureType: FailureType;
    failureDescription: string;
    detectionTime: Date;
    recoveryStrategy: RecoveryStrategy;
    status: RecoveryStatus;
    attempts: number;
    maxAttempts: number;
    lastAttemptAt: Date | null;
    result: string | null;
    taskId: string | null;
    memorySnapshotId: string | null;
    escalationReason: string | null;
    metadata: Record<string, any>;
}
export interface RecoveryPolicy {
    failureType: FailureType;
    strategy: RecoveryStrategy;
    maxAttempts: number;
    cooldownMs: number;
    escalationAfterAttempts: number;
    autoRestart: boolean;
    preserveMemory: boolean;
}
export interface RecoveryContext {
    agentId: string;
    failureType: FailureType;
    taskId?: string;
    errorMessage?: string;
    stackTrace?: string;
    memoryState?: any;
    lastKnownGoodState?: any;
}
export interface MemorySnapshot {
    id: string;
    agentId: string;
    timestamp: Date;
    state: any;
    taskId: string | null;
    metadata: Record<string, any>;
}
export interface AgentHealthStatus {
    agentId: string;
    healthy: boolean;
    lastChecked: Date;
    issues: string[];
    metrics: {
        responseTimeMs: number;
        errorRate: number;
        memoryUsageMb: number;
        cpuUsagePercent: number;
        taskQueueDepth: number;
    };
}
export interface RecoveryStats {
    totalRecoveries: number;
    byFailureType: Record<string, number>;
    byStrategy: Record<string, number>;
    byStatus: Record<string, number>;
    successRate: number;
    averageRecoveryTimeMs: number;
    totalEscalations: number;
    activeRecoveryCount: number;
}
export interface EscalationRecord {
    id: string;
    actionId: string;
    agentId: string;
    failureType: FailureType;
    reason: string;
    timestamp: Date;
    acknowledged: boolean;
    acknowledgedBy: string | null;
    acknowledgedAt: Date | null;
}
export declare const RECOVERY_STARTED = "recovery.started";
export declare const RECOVERY_SUCCEEDED = "recovery.succeeded";
export declare const RECOVERY_FAILED = "recovery.failed";
export declare const RECOVERY_ESCALATED = "recovery.escalated";
export declare const HEALTH_CHECK_FAILED_EVENT = "health_check.failed";
export declare const MEMORY_SNAPSHOT_TAKEN = "memory.snapshot_taken";
export declare const MEMORY_RESTORED = "memory.restored";
export interface RecoveryEventPayload {
    actionId: string;
    agentId: string;
    failureType: FailureType;
    strategy: RecoveryStrategy;
    timestamp: number;
    [key: string]: any;
}
export declare class AutoRecoveryService implements OnModuleInit {
    private readonly logger;
    private readonly actions;
    private readonly policies;
    private readonly snapshots;
    private readonly agentSnapshots;
    private readonly history;
    private readonly escalations;
    private readonly healthStatuses;
    private readonly degradedAgents;
    private readonly quarantinedAgents;
    private readonly agentCapabilities;
    private readonly agentRunningState;
    private readonly eventListeners;
    private healthCheckInterval;
    private readonly recoveryDurations;
    onModuleInit(): void;
    on(event: string, listener: (payload: RecoveryEventPayload) => void): () => void;
    private emitEvent;
    initialize(): void;
    detectFailure(agentId: string, failureType: FailureType, context?: RecoveryContext): AutoRecoveryAction;
    executeRecovery(actionId: string): Promise<void>;
    handleRecoverySuccess(actionId: string): void;
    handleRecoveryFailure(actionId: string): void;
    escalate(actionId: string): EscalationRecord;
    getRecoveryAction(actionId: string): AutoRecoveryAction | null;
    getActiveRecoveries(): AutoRecoveryAction[];
    getRecoveryHistory(agentId?: string): AutoRecoveryAction[];
    getRecoveryPolicies(): RecoveryPolicy[];
    updatePolicy(failureType: FailureType, policy: Partial<RecoveryPolicy>): RecoveryPolicy;
    getRecoveryStats(): RecoveryStats;
    performHealthChecks(): AgentHealthStatus[];
    snapshotAgentMemory(agentId: string): string;
    restoreAgentMemory(agentId: string, snapshotId: string): boolean;
    registerAgent(agentId: string, capabilities?: string[]): void;
    unregisterAgent(agentId: string): void;
    isAgentDegraded(agentId: string): boolean;
    isAgentQuarantined(agentId: string): boolean;
    getAgentHealthStatus(agentId: string): AgentHealthStatus | null;
    acknowledgeEscalation(escalationId: string, acknowledgedBy: string): EscalationRecord | null;
    getUnacknowledgedEscalations(): EscalationRecord[];
    getEscalations(agentId?: string): EscalationRecord[];
    private executeRestart;
    private executeRestoreMemoryResume;
    private executeFailover;
    private executeScaleOut;
    private executeDegrade;
    private executeQuarantine;
    private buildFailureDescription;
    private checkAgentHealth;
    private startHealthCheckLoop;
    stopHealthCheckLoop(): void;
    private addToHistory;
    private generateActionId;
    private generateEscalationId;
    private generateSnapshotId;
    private sleep;
    getSnapshot(snapshotId: string): MemorySnapshot | null;
    getAgentSnapshots(agentId: string): string[];
    getRegisteredAgentIds(): string[];
    getAgentRunningState(agentId: string): string | null;
    clear(): void;
}
