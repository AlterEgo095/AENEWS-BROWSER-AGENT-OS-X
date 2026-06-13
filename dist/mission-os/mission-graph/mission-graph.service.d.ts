export declare enum MissionStatus {
    DRAFT = "draft",
    SIMULATING = "simulating",
    APPROVED = "approved",
    IN_PROGRESS = "in_progress",
    PAUSED = "paused",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare enum TaskEdgeType {
    HARD_DEPENDENCY = "hard_dependency",
    SOFT_DEPENDENCY = "soft_dependency",
    RESOURCE_DEPENDENCY = "resource_dependency"
}
export declare enum MissionTaskStatus {
    PENDING = "pending",
    READY = "ready",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    SKIPPED = "skipped",
    BLOCKED = "blocked"
}
export interface MissionTaskNode {
    id: string;
    type: 'objective' | 'sub_objective' | 'task';
    objectiveId: string;
    agentId: string | null;
    capability: string | null;
    description: string;
    dependencies: string[];
    estimatedDurationMs: number;
    actualDurationMs: number | null;
    status: MissionTaskStatus;
    priority: number;
    payload: any;
    result: any;
    retryCount: number;
    maxRetries: number;
}
export interface MissionTaskEdge {
    fromId: string;
    toId: string;
    type: TaskEdgeType;
    metadata?: Record<string, any>;
}
export interface MissionTaskGraph {
    nodes: Map<string, MissionTaskNode>;
    edges: MissionTaskEdge[];
    criticalPath: string[];
    parallelGroups: string[][];
}
export interface MissionObjective {
    id: string;
    missionId: string;
    description: string;
    status: MissionStatus;
    subObjectives: MissionObjective[];
    assignedAgents: string[];
    taskIds: string[];
    progress: number;
    priority: number;
}
export interface MissionDefinition {
    id: string;
    name: string;
    description: string;
    status: MissionStatus;
    objectives: MissionObjective[];
    taskGraph: MissionTaskGraph | null;
    executionGraph: ExecutionGraph | null;
    resultGraph: ResultGraph | null;
    priority: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    metadata: Record<string, any>;
}
export interface ExecutionGraph {
    executionOrder: string[][];
    currentLevel: number;
    completedNodes: Set<string>;
    failedNodes: Set<string>;
}
export interface ResultGraph {
    results: Map<string, MissionTaskResult>;
    overallSuccess: boolean;
    totalExecutionTimeMs: number;
    completedObjectives: number;
    failedObjectives: number;
}
export interface MissionTaskResult {
    nodeId: string;
    success: boolean;
    result: any;
    executionTimeMs: number;
    agentId: string;
    timestamp: Date;
}
interface MissionStatusSummary {
    missionId: string;
    name: string;
    status: MissionStatus;
    totalObjectives: number;
    completedObjectives: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    overallProgress: number;
    currentExecutionLevel: number | null;
    totalExecutionLevels: number | null;
    criticalPathLength: number | null;
}
interface MissionGlobalStats {
    totalMissions: number;
    byStatus: Record<string, number>;
    avgCompletionTimeMs: number | null;
    totalCompleted: number;
    totalFailed: number;
}
export declare class MissionGraphService {
    private readonly logger;
    private readonly missions;
    private idCounter;
    createMission(name: string, description: string, createdBy: string, priority?: number): MissionDefinition;
    addObjective(missionId: string, objective: Omit<MissionObjective, 'missionId' | 'subObjectives' | 'taskIds' | 'progress'>): MissionObjective;
    addSubObjective(missionId: string, parentObjectiveId: string, subObjective: Omit<MissionObjective, 'missionId' | 'subObjectives' | 'taskIds' | 'progress'>): MissionObjective;
    buildTaskGraph(missionId: string): MissionTaskGraph;
    buildExecutionGraph(missionId: string): ExecutionGraph;
    advanceExecution(missionId: string, completedNodeId: string, result: any): string[];
    markNodeFailed(missionId: string, nodeId: string, error: any): void;
    buildResultGraph(missionId: string): ResultGraph;
    getMission(missionId: string): MissionDefinition | null;
    getMissionStatus(missionId: string): MissionStatusSummary;
    getReadyNodes(missionId: string): MissionTaskNode[];
    getCriticalPath(missionId: string): string[];
    updateObjectiveProgress(missionId: string, objectiveId: string): number;
    cancelMission(missionId: string): MissionDefinition;
    getMissionStats(): MissionGlobalStats;
    private generateId;
    private getMissionOrThrow;
    private findObjectiveRecursive;
    private collectTaskNodesFromObjectives;
    private topologicalSort;
    private computeCriticalPath;
    private computeParallelGroups;
    private calculateObjectiveProgress;
    private getAllTaskIdsRecursive;
    private isObjectiveFailed;
}
export {};
