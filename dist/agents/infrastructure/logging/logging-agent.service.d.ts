import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const LOGGING_AGENT_CONFIG: AgentConfig;
export declare class LoggingAgentService extends BaseAgentService {
    private logAlerts;
    private retentionPolicies;
    private logAlertCounter;
    private retentionCounter;
    private exportCounter;
    private readonly simulatedServices;
    private readonly simulatedLevels;
    private readonly simulatedMessages;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private searchLogs;
    private aggregateLogs;
    private createLogAlert;
    private exportLogs;
    private analyzePatterns;
    private setRetentionPolicy;
    private timeRangeToMs;
    private intervalToMs;
    private generateTraceId;
}
