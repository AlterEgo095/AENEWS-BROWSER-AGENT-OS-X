import { StepExecutionResult } from './task-executor.service';
import { OrchestrationRequest } from './orchestrator.service';
export interface ValidationResult {
    isValid: boolean;
    score: number;
    errors: string[];
    warnings: string[];
    details: ValidationDetails;
}
export interface ValidationDetails {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    completenessScore: number;
    qualityScore: number;
    performanceScore: number;
    complianceScore: number;
    integrityScore: number;
    schemaValidationScore: number;
}
export declare class TaskValidatorService {
    private readonly logger;
    validate(results: StepExecutionResult[], request: OrchestrationRequest): Promise<ValidationResult>;
    private validateCompleteness;
    private validateQuality;
    private validatePerformance;
    private validateCompliance;
    private validateIntegrity;
    private validateAgainstSchema;
    private validateSchema;
    private findNumericIssues;
}
