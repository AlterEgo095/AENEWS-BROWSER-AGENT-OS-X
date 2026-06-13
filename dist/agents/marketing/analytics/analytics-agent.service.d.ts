import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const ANALYTICS_AGENT_CONFIG: AgentConfig;
export declare class AnalyticsAgentService extends BaseAgentService {
    private readonly bridge?;
    private reports;
    private conversionData;
    private exportCounter;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private generateReport;
    private trackConversions;
    private analyzeFunnel;
    private calculateROI;
    private comparePeriods;
    private exportData;
    private seedConversionData;
    private generateChannelData;
    private generateTrendData;
    private generateCampaignBreakdown;
    private generateFunnelRecommendations;
}
