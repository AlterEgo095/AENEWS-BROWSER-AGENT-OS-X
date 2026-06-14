export declare enum PlanningLevelType {
    STRATEGIC = "strategic",
    OPERATIONAL = "operational",
    TACTICAL = "tactical",
    EXECUTION = "execution"
}
export interface PlanningLevel {
    level: number;
    type: PlanningLevelType;
    name: string;
    description: string;
    objectives: PlanningObjective[];
    subPlans: LongHorizonPlan[];
    taskGraph: TaskGraphSnapshot | null;
    dependencies: string[];
    estimatedDurationMs: number;
    status: PlanStatus;
}
export declare enum PlanStatus {
    DRAFT = "draft",
    SIMULATING = "simulating",
    READY = "ready",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed",
    REVISED = "revised"
}
export interface PlanningObjective {
    id: string;
    description: string;
    successCriteria: string[];
    priority: number;
    assignedTo: string[];
    dependencies: string[];
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
}
export interface LongHorizonPlan {
    id: string;
    missionId: string;
    levels: PlanningLevel[];
    totalEstimatedDurationMs: number;
    resourceRequirements: ResourceRequirement[];
    riskAssessment: RiskAssessment;
    simulationResult: SimulationSnapshot | null;
    createdAt: Date;
    updatedAt: Date;
    status: PlanStatus;
}
export interface TaskGraphSnapshot {
    nodes: string[];
    edges: Array<{
        from: string;
        to: string;
        type: string;
    }>;
    criticalPathLength: number;
    parallelismFactor: number;
}
export interface ResourceRequirement {
    type: string;
    amount: number;
    unit: string;
    estimatedCost: number;
    timeWindow: {
        start: number;
        end: number;
    };
}
export interface RiskAssessment {
    overallRisk: number;
    risks: RiskItem[];
    mitigations: string[];
}
export interface RiskItem {
    description: string;
    probability: number;
    impact: number;
    mitigation: string;
}
export interface SimulationSnapshot {
    estimatedSuccessRate: number;
    estimatedDurationMs: number;
    estimatedCost: number;
    bottlenecks: string[];
    resourceConflicts: string[];
}
interface PlanConfig {
    maxDepth?: number;
    defaultAgentId?: string;
    timeBudgetMs?: number;
    costBudget?: number;
    monteCarloIterations?: number;
}
interface ExecutionBatch {
    batchIndex: number;
    objectiveIds: string[];
    levelIndices: number[];
    estimatedDurationMs: number;
    parallel: boolean;
}
interface TimelineEntry {
    objectiveId: string;
    description: string;
    levelType: PlanningLevelType;
    startOffsetMs: number;
    durationMs: number;
    dependencies: string[];
    status: PlanningObjective['status'];
}
interface PlanStatusSummary {
    planId: string;
    overallStatus: PlanStatus;
    levelSummaries: Array<{
        level: number;
        type: PlanningLevelType;
        name: string;
        status: PlanStatus;
        totalObjectives: number;
        completedObjectives: number;
        failedObjectives: number;
        progress: number;
    }>;
    overallProgress: number;
}
interface FusionResult {
    planId: string;
    mergedObjectives: PlanningObjective[];
    conflicts: Array<{
        objectiveIds: string[];
        description: string;
        resolution: string;
    }>;
    unifiedStatus: PlanStatus;
    aggregatedMetrics: {
        totalCompleted: number;
        totalFailed: number;
        totalPending: number;
        successRate: number;
        estimatedRemainingMs: number;
    };
}
export declare class LongHorizonPlanningService {
    private readonly logger;
    private readonly plans;
    private readonly objectiveIndex;
    createPlan(missionId: string, missionDescription: string, config?: PlanConfig): LongHorizonPlan;
    decomposeObjective(objective: PlanningObjective, depth: number): PlanningObjective[];
    addLevel(planId: string, level: PlanningLevel): void;
    refineLevel(planId: string, levelIndex: number): PlanningLevel;
    buildExecutionOrder(planId: string): ExecutionBatch[];
    estimateResources(planId: string): ResourceRequirement[];
    assessRisks(planId: string): RiskAssessment;
    simulateExecution(planId: string): SimulationSnapshot;
    revisePlan(planId: string, feedback: {
        completedObjectives?: string[];
        failedObjectives?: string[];
        partialResults?: Record<string, any>;
        issues?: string[];
        adjustedEstimates?: Record<string, {
            durationMs?: number;
            cost?: number;
        }>;
    }): LongHorizonPlan;
    getPlan(planId: string): LongHorizonPlan | null;
    getPlanStatus(planId: string): PlanStatusSummary;
    getExecutionTimeline(planId: string): TimelineEntry[];
    fusion(planId: string, partialResults: Map<string, {
        status: PlanningObjective['status'];
        output?: any;
    }>): FusionResult;
    private getPlanInternal;
    private parseMissionToObjectives;
    private inferSuccessCriteria;
    private splitByMarkers;
    private getLevelTypeForDepth;
    private getLevelNameForType;
    private inferCrossLevelDependencies;
    private buildTaskGraph;
    private calculateGraphCriticalPath;
    private calculateMaxDependencyDepth;
    private estimateObjectiveDuration;
    private estimateSingleObjectiveDuration;
    private estimateSingleObjectiveCost;
    private calculateTotalDuration;
    private calculateLevelDuration;
    private estimateLevelResources;
    private mergeResourceRequirements;
    private detectResourceConflicts;
    private assessLevelRisks;
    private calculateCriticalPathLength;
    private updateObjectiveStatus;
    private rebuildObjectiveIndex;
    private countTotalObjectives;
    private canonicalizeDescription;
    private resolveConflict;
}
export {};
