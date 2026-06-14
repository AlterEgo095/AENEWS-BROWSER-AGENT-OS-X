import { StepExecutionResult } from './task-executor.service';
import { OrchestrationRequest } from './orchestrator.service';
import { AgentConnectorBridge } from '../bridge';
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
    private readonly bridge?;
    private readonly logger;
    constructor(bridge?: AgentConnectorBridge | undefined);
    validate(results: StepExecutionResult[], request: OrchestrationRequest): Promise<ValidationResult>;
    llmValidate(results: any, requirements: any): Promise<ValidationResult | null>;
    private validateCompleteness;
    private validateQuality;
    private validatePerformance;
    private validateCompliance;
    private validateIntegrity;
    private validateAgainstSchema;
    private validateSchema;
    private findNumericIssues;
}
