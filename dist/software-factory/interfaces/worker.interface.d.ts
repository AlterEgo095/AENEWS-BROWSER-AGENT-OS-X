import { CapabilityId, CapabilityExecutionResult, CapabilityDefinition } from './capability.interface';
export declare enum WorkerStatus {
    SPAWNING = "SPAWNING",
    READY = "READY",
    EXECUTING = "EXECUTING",
    IDLE = "IDLE",
    TERMINATING = "TERMINATING",
    TERMINATED = "TERMINATED",
    FAILED = "FAILED"
}
export interface WorkerProfile {
    id: string;
    missionId: string;
    capabilities: CapabilityId[];
    capabilityDefinitions: CapabilityDefinition[];
    status: WorkerStatus;
    spawnedAt: Date;
    terminatedAt?: Date;
    tasksCompleted: number;
    tasksFailed: number;
    totalCostUsd: number;
    totalDurationMs: number;
    maxLifetimeMs: number;
    maxTasks: number;
    assignedNodeIds: string[];
    results: CapabilityExecutionResult[];
}
export interface WorkerSpawnRequest {
    missionId: string;
    capabilities: CapabilityId[];
    assignedNodeIds: string[];
    maxLifetimeMs?: number;
    maxTasks?: number;
}
export interface WorkerSpawnResult {
    workerId: string;
    capabilities: CapabilityId[];
    status: WorkerStatus;
    ready: boolean;
}
export interface WorkerTerminateRequest {
    workerId: string;
    reason: 'mission_complete' | 'failed' | 'timeout' | 'manual' | 'budget_exceeded';
    archiveResults: boolean;
}
export interface WorkerTerminateResult {
    workerId: string;
    terminated: boolean;
    finalStatus: WorkerStatus;
    tasksCompleted: number;
    tasksFailed: number;
    totalCostUsd: number;
    totalDurationMs: number;
    results: CapabilityExecutionResult[];
    archivedPath?: string;
}
export interface WorkerExecutionRequest {
    workerId: string;
    nodeId: string;
    input: any;
    timeoutMs?: number;
}
export interface WorkerExecutionResult {
    workerId: string;
    nodeId: string;
    success: boolean;
    output: any;
    artifacts: string[];
    durationMs: number;
    costUsd: number;
    error?: string;
}
export interface WorkerPoolStatistics {
    totalSpawned: number;
    totalTerminated: number;
    currentlyActive: number;
    byCapability: Record<string, number>;
    totalCostUsd: number;
    averageLifetimeMs: number;
    averageTasksPerWorker: number;
    missionsServed: number;
}
export interface WorkerPoolConstraints {
    maxConcurrentWorkers: number;
    maxWorkersPerCapability: number;
    maxTotalCostUsd: number;
    defaultLifetimeMs: number;
    defaultMaxTasksPerWorker: number;
}
export declare const DEFAULT_WORKER_CONSTRAINTS: WorkerPoolConstraints;
