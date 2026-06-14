import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../interfaces/agent.interface';
import { AgentConnectorBridge } from '../bridge';
export declare enum ErrorCategory {
    NETWORK = "NETWORK",
    TIMEOUT = "TIMEOUT",
    LLM_FAILURE = "LLM_FAILURE",
    PLAYWRIGHT_CRASH = "PLAYWRIGHT_CRASH",
    SHELL_ERROR = "SHELL_ERROR",
    FILE_SYSTEM = "FILE_SYSTEM",
    VALIDATION = "VALIDATION",
    PERMISSION = "PERMISSION",
    RESOURCE_EXHAUSTION = "RESOURCE_EXHAUSTION",
    CONFIGURATION = "CONFIGURATION",
    DEPENDENCY = "DEPENDENCY",
    DATA_CORRUPTION = "DATA_CORRUPTION",
    RATE_LIMIT = "RATE_LIMIT",
    UNKNOWN = "UNKNOWN"
}
export declare enum ErrorSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum RemediationStrategy {
    RETRY = "retry",
    RECONFIGURE = "reconfigure",
    FALLBACK = "fallback",
    ESCALATE = "escalate",
    SKIP = "skip"
}
export interface ErrorAnalysisResult {
    rootCause: string;
    errorCategory: ErrorCategory;
    severity: ErrorSeverity;
    isRecoverable: boolean;
    suggestedRemediation: {
        strategy: RemediationStrategy;
        parameters: Record<string, any>;
        estimatedRecoveryTimeMs: number;
    };
    relatedErrors: string[];
    preventionStrategies: string[];
}
export declare const WATCHDOG_ERROR_ANALYZER_CONFIG: AgentConfig;
export declare class ErrorAnalyzerAgentService extends BaseAgentService {
    private readonly bridge?;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private parseAnalysis;
    private classifyErrorFallback;
    private getPreventionStrategies;
}
