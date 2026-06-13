import { OrchestrationPlan } from '../interfaces/agent.interface';
import { CritiqueResult } from './task-critic.service';
import { StepExecutionResult } from './task-executor.service';
import { OrchestrationRequest } from './orchestrator.service';
import { TaskPlannerService } from './task-planner.service';
export interface RepairResult {
    repairedPlan: OrchestrationPlan | null;
    repairedSteps: string[];
    failedRepairs: string[];
    error?: string;
    history: RepairHistoryEntry[];
}
export declare enum RepairStrategy {
    RETRY = "retry",
    REASSIGN = "reassign",
    SIMPLIFY = "simplify",
    DECOMPOSE_FURTHER = "decompose_further",
    FALLBACK = "fallback",
    SKIP = "skip"
}
export interface RepairHistoryEntry {
    stepId: string;
    strategy: RepairStrategy;
    timestamp: Date;
    attemptNumber: number;
    success: boolean;
    error?: string;
    previousError?: string;
}
export interface RepairConfig {
    maxRepairIterations: number;
    maxRetryPerStep: number;
    enableReassignment: boolean;
    enableSimplification: boolean;
    enableDecomposition: boolean;
    enableFallback: boolean;
    trackHistory: boolean;
}
export declare class TaskRepairService {
    private readonly plannerService;
    private readonly logger;
    private readonly config;
    private readonly repairHistory;
    constructor(plannerService: TaskPlannerService);
    repair(results: StepExecutionResult[], critique: CritiqueResult, request: OrchestrationRequest): Promise<RepairResult>;
    getRepairHistory(taskId: string): RepairHistoryEntry[];
    clearRepairHistory(taskId: string): void;
    getRepairIterationCount(taskId: string): number;
    private categorizeIssues;
    private selectRepairStrategy;
    private applyRepairStrategy;
    private retryStep;
    private reassignStep;
    private simplifyStep;
    private decomposeStep;
    private fallbackStep;
    private resultToStep;
    private createDefaultStep;
    private simplifyPayload;
    private mergeRepairedSteps;
    private rebuildDependencies;
    private estimateRepairedDuration;
}
