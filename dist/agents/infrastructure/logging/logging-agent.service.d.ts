import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const LOGGING_AGENT_CONFIG: AgentConfig;
export declare class LoggingAgentService extends BaseAgentService {
    private readonly bridge?;
    private logAlerts;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
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
