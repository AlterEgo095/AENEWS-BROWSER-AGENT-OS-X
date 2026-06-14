import { TeamType } from './mission-orchestrator.service';
export declare enum PhaseType {
    PLANNING = "PLANNING",
    BROWSER = "BROWSER",
    DEVELOPMENT = "DEVELOPMENT",
    BUSINESS = "BUSINESS",
    CERTIFICATION = "CERTIFICATION",
    DELIVERY = "DELIVERY"
}
export declare enum TaskPriority {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
export declare enum TaskStatus {
    PENDING = "PENDING",
    READY = "READY",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    SKIPPED = "SKIPPED"
}
export interface PlannedTask {
    id: string;
    title: string;
    description: string;
    phase: PhaseType;
    team: TeamType;
    priority: TaskPriority;
    status: TaskStatus;
    dependencies: string[];
    estimatedDurationMs: number;
    metadata: Record<string, unknown>;
}
export interface PlannedPhase {
    type: PhaseType;
    team: TeamType;
    tasks: PlannedTask[];
    status: TaskStatus;
    estimatedDurationMs: number;
    dependsOn: PhaseType[];
}
export interface MissionPlan {
    id: string;
    instruction: string;
    phases: PlannedPhase[];
    tasks: PlannedTask[];
    dependencies: Record<string, string[]>;
    totalEstimatedDurationMs: number;
    complexity: ComplexityAssessment;
    requiredTeams: TeamType[];
    createdAt: Date;
    updatedAt: Date;
}
export interface ComplexityAssessment {
    score: number;
    level: 'TRIVIAL' | 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'EPIC';
    reasoning: string;
}
export declare class MissionPlannerService {
    private readonly logger;
    private readonly plans;
    private idCounter;
    createPlan(instruction: string, context?: Record<string, unknown>): MissionPlan;
    estimateComplexity(instruction: string): ComplexityAssessment;
    identifyRequiredTeams(instruction: string): TeamType[];
    decomposeIntoTasks(instruction: string, team: TeamType): PlannedTask[];
    buildDependencyGraph(phases: PlannedPhase[], tasks: PlannedTask[]): Record<string, string[]>;
    getPlan(missionId: string): MissionPlan | null;
    getAllPlans(): MissionPlan[];
    updatePlan(planId: string, updates: Partial<MissionPlan>): MissionPlan;
    private containsKeywords;
    private createTask;
    private generateId;
}
