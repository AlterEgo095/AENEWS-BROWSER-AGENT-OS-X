import { OrchestrationRequest } from './orchestrator.service';
import { StepExecutionResult } from './task-executor.service';
import { AgentConnectorBridge } from '../bridge';
export interface CritiqueResult {
    passed: boolean;
    score: number;
    issues: CritiqueIssue[];
    summary: string;
    recommendations: string[];
}
export interface CritiqueIssue {
    stepId: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    category: CritiqueCategory;
    message: string;
    details?: Record<string, any>;
    autoRepairable: boolean;
}
export declare enum CritiqueCategory {
    COMPLETENESS = "completeness",
    ACCURACY = "accuracy",
    CONSISTENCY = "consistency",
    PERFORMANCE = "performance",
    ERROR_HANDLING = "error_handling",
    DATA_QUALITY = "data_quality",
    COMPLIANCE = "compliance"
}
export interface CritiqueConfig {
    passingScoreThreshold: number;
    criticalSeverityBlocks: boolean;
    maxIssuesPerStep: number;
    enableCrossStepConsistencyCheck: boolean;
    enableCompletenessCheck: boolean;
    enableDataQualityCheck: boolean;
}
export declare class TaskCriticService {
    private readonly bridge?;
    private readonly logger;
    private readonly config;
    constructor(bridge?: AgentConnectorBridge | undefined);
    critique(results: StepExecutionResult[], request: OrchestrationRequest): Promise<CritiqueResult>;
    llmCritique(results: StepExecutionResult[], request: OrchestrationRequest): Promise<CritiqueResult | null>;
    private evaluateStepResult;
    private assessOutputQuality;
    private checkCrossStepConsistency;
    private checkCompleteness;
    private checkDataQuality;
    private findConflicts;
    private hashResult;
    private generateRecommendations;
    private generateSummary;
}
