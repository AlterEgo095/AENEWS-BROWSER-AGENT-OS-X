import { CapabilityId, CapabilityPack, MissionState, TransitionTrigger, WorkerStatus, GraphNodeStatus } from '../interfaces';
export declare class MissionOrchestratorService {
    private readonly logger;
    private readonly activeMissions;
    registerMission(missionId: string, contractId: string): MissionExecutionState;
    updateMission(missionId: string, updates: Partial<MissionExecutionState>): MissionExecutionState | undefined;
    getMission(missionId: string): MissionExecutionState | undefined;
    getActiveMissions(): MissionExecutionState[];
    removeMission(missionId: string): boolean;
}
export declare class MissionPlannerService {
    private readonly logger;
    createPlan(instruction: string, context?: any): MissionPlan;
    private matchesAny;
}
export declare class TaskSchedulerService {
    private readonly logger;
    scheduleNextPhase(missionId: string, readyNodeIds: string[], workers: {
        id: string;
        capabilities: CapabilityId[];
        assignedNodeIds: string[];
        status: WorkerStatus;
    }[]): SchedulingDecision[];
}
export declare class ResourceManagerService {
    private readonly logger;
    checkBudget(currentSpend: number, maxBudget: number, estimatedCost: number): {
        allowed: boolean;
        remaining: number;
        warning?: string;
    };
    getAvailableResources(): ComputeResources;
}
export declare class SecurityManagerService {
    private readonly logger;
    validatePermissions(workerCapabilities: CapabilityId[], requiredPermissions: string[]): SecurityValidation;
    createSecurityContext(missionId: string): SecurityContext;
}
export declare class CertificationManagerService {
    private readonly logger;
    certify(missionId: string, results: any): CertificationGate;
}
export declare class DeliveryManagerService {
    private readonly logger;
    private readonly deliveries;
    deliver(missionId: string, artifacts: any[], contract: any): DeliveryPackage;
    getDelivery(missionId: string): DeliveryPackage | undefined;
}
export declare class MonitoringManagerService {
    private readonly logger;
    private readonly metrics;
    recordMetric(missionId: string, key: string, value: number): void;
    getSystemHealth(): SystemHealth;
    getMissionMetrics(missionId: string): MissionMetrics | undefined;
}
export declare class RecoveryManagerService {
    private readonly logger;
    handleNodeFailure(missionId: string, nodeId: string, error: string, retryCount: number, maxRetries: number): RecoveryDecision;
    getRollbackStrategy(fromState: MissionState): RollbackStrategy;
}
export interface MissionExecutionState {
    missionId: string;
    contractId: string;
    status: MissionState;
    progress: number;
    currentPhase: string;
    activeWorkers: number;
    totalCost: number;
    startedAt: Date;
    estimatedCompletion?: Date;
    errors: string[];
    warnings: string[];
}
export interface MissionPlan {
    id: string;
    instruction: string;
    requiredPacks: CapabilityPack[];
    requiredCapabilities: CapabilityId[];
    complexity: 'low' | 'medium' | 'high';
    flags: {
        requiresBrowser: boolean;
        requiresDevelopment: boolean;
        requiresOffice: boolean;
        requiresBusiness: boolean;
        requiresCertification: boolean;
        requiresDeployment: boolean;
    };
}
export interface SchedulingDecision {
    nodeId: string;
    workerId: string;
    action: 'execute' | 'spawn_worker' | 'skip';
}
export interface ComputeResources {
    availableCpuCores: number;
    availableMemoryGb: number;
    availableDiskGb: number;
    currentLoadPercent: number;
}
export interface SecurityValidation {
    allowed: boolean;
    missingPermissions: string[];
    sandboxed: boolean;
}
export interface SecurityContext {
    missionId: string;
    sandboxEnabled: boolean;
    networkAccess: 'full' | 'restricted' | 'none';
    filesystemAccess: 'full' | 'sandbox' | 'none';
    maxExecutionTimeMs: number;
    allowedDomains: string[];
    blockedOperations: string[];
}
export interface CertificationGate {
    missionId: string;
    certified: boolean;
    qualityScore: number;
    checks: CertificationCheck[];
    certifiedAt?: Date;
    reasons: string[];
}
export interface CertificationCheck {
    domain: string;
    passed: boolean;
    score: number;
    threshold: number;
}
export interface DeliveryPackage {
    id: string;
    missionId: string;
    status: 'preparing' | 'ready' | 'delivered' | 'failed';
    artifacts: {
        name: string;
        type: string;
        path: string;
        size: number;
        validated: boolean;
    }[];
    summary: {
        missionObjective: string;
        qualityScore: number;
        certified: boolean;
        totalArtifacts: number;
    };
    preparedAt: Date;
    deliveredAt?: Date;
}
export interface MissionMetrics {
    missionId: string;
    dataPoints: {
        key: string;
        value: number;
        timestamp: Date;
    }[];
}
export interface SystemHealth {
    status: 'healthy' | 'degraded' | 'critical';
    uptime: number;
    activeMissions: number;
    activeWorkers: number;
    memoryUsage: number;
    cpuUsage: number;
}
export interface RecoveryDecision {
    action: 'retry' | 'abort' | 'skip';
    retryDelayMs?: number;
    newNodeStatus: GraphNodeStatus;
    rollbackRequired?: boolean;
}
export interface RollbackStrategy {
    targetState: MissionState;
    trigger: TransitionTrigger;
}
