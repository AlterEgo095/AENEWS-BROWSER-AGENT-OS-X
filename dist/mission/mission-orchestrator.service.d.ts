export declare enum MissionStatus {
    RECEIVED = "received",
    PLANNING = "planning",
    EXECUTING = "executing",
    CERTIFYING = "certifying",
    DELIVERING = "delivering",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    PAUSED = "paused"
}
export declare enum TeamType {
    BROWSER = "browser",
    DEVELOPMENT = "development",
    BUSINESS = "business",
    MEMORY = "memory",
    CERTIFICATION = "certification",
    DELIVERY = "delivery"
}
export interface MissionInput {
    instruction: string;
    userId?: string;
    projectId?: string;
    priority?: 'low' | 'normal' | 'high' | 'critical';
    context?: Record<string, any>;
    attachments?: Array<{
        name: string;
        type: string;
        data: any;
    }>;
}
export interface MissionDefinition {
    id: string;
    instruction: string;
    status: MissionStatus;
    plan: MissionPlan | null;
    phases: MissionPhase[];
    currentPhase: MissionPhaseType;
    results: Map<string, PhaseResult>;
    deliverables: Deliverable[];
    certificationReport: CertificationReport | null;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    error: string | null;
    metadata: Record<string, any>;
}
export declare enum MissionPhaseType {
    PLAN = "plan",
    BROWSER = "browser",
    DEVELOP = "develop",
    BUSINESS = "business",
    CERTIFY = "certify",
    DELIVER = "deliver"
}
export interface MissionPlan {
    missionId: string;
    phases: PlannedPhase[];
    estimatedDurationMs: number;
    estimatedCost: number;
    requiredTeams: TeamType[];
    dependencies: Array<{
        from: string;
        to: string;
    }>;
}
export interface PlannedPhase {
    id: string;
    type: MissionPhaseType;
    team: TeamType;
    description: string;
    tasks: PlannedTask[];
    dependsOn: string[];
    parallel: boolean;
    estimatedDurationMs: number;
}
export interface PlannedTask {
    id: string;
    agentCapability: string;
    description: string;
    input: Record<string, any>;
    dependsOn: string[];
}
export interface MissionPhase {
    type: MissionPhaseType;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    startedAt: Date | null;
    completedAt: Date | null;
    tasks: PhaseTask[];
}
export interface PhaseTask {
    id: string;
    capability: string;
    status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed';
    assignedAgent: string | null;
    result: any;
    startedAt: Date | null;
    completedAt: Date | null;
    error: string | null;
    retryCount: number;
}
export interface PhaseResult {
    phaseType: MissionPhaseType;
    success: boolean;
    output: any;
    durationMs: number;
    artifacts: string[];
}
export interface Deliverable {
    type: 'pdf' | 'zip' | 'repository' | 'docker_image' | 'deployed_url' | 'report' | 'code' | 'data';
    name: string;
    description: string;
    location: string;
    size?: number;
    checksum?: string;
    createdAt: Date;
}
export interface CertificationReport {
    missionId: string;
    overallScore: number;
    passed: boolean;
    domains: CertificationDomain[];
    certifiedAt: Date;
}
export interface CertificationDomain {
    name: string;
    score: number;
    passed: boolean;
    details: string;
}
export interface MissionEvent {
    type: string;
    missionId: string;
    timestamp: Date;
    data: Record<string, any>;
}
export interface MissionStats {
    totalMissions: number;
    byStatus: Record<MissionStatus, number>;
    byPriority: Record<string, number>;
    averageDurationMs: number;
    successRate: number;
    totalDeliverables: number;
    totalCertifications: number;
    averageCertificationScore: number;
}
export declare class MissionOrchestratorService {
    private readonly logger;
    private readonly missions;
    private readonly missionEvents;
    private readonly cancelledMissions;
    private readonly pausedMissions;
    private readonly repairAttempts;
    submitMission(input: MissionInput): Promise<string>;
    planMission(missionId: string): Promise<MissionPlan>;
    executeMission(missionId: string): Promise<void>;
    executePhase(missionId: string, phaseType: MissionPhaseType): Promise<PhaseResult>;
    certifyMission(missionId: string): Promise<CertificationReport>;
    deliverMission(missionId: string): Promise<Deliverable[]>;
    getMission(missionId: string): MissionDefinition | null;
    getMissionStatus(missionId: string): {
        id: string;
        status: MissionStatus;
        currentPhase: MissionPhaseType;
        progress: number;
        error: string | null;
    } | null;
    cancelMission(missionId: string): Promise<boolean>;
    pauseMission(missionId: string): Promise<boolean>;
    resumeMission(missionId: string): Promise<boolean>;
    getMissionHistory(userId?: string, limit?: number): Array<{
        id: string;
        instruction: string;
        status: MissionStatus;
        createdAt: Date;
        completedAt: Date | null;
        priority: string;
        deliverableCount: number;
    }>;
    getMissionStats(): MissionStats;
    private executePipeline;
    private executePlanPhase;
    private executeCertifyPhase;
    private executeDeliverPhase;
    private executeTask;
    private simulateTaskExecution;
    private attemptRepair;
    private transitionStatus;
    private emitEvent;
    private detectIntents;
    private assessComplexity;
    private estimateEffort;
    private computeAverageQuality;
    private assessSecurity;
    private getMissionOrThrow;
    private inferTeamForPhase;
    private topologicalSortTasks;
    private artifactToDeliverable;
    private sleep;
}
