import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const AD_CAMPAIGN_AGENT_CONFIG: AgentConfig;
export declare class AdCampaignAgentService extends BaseAgentService {
    private readonly bridge?;
    private campaigns;
    private campaignCounter;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private createCampaign;
    private setBudget;
    private defineTargeting;
    private launchCampaign;
    private optimizeCampaign;
    private generateReport;
    private generateCampaignId;
    private simulatePerformance;
    private simulateAdSetPerformance;
    private generateCampaignRecommendations;
}
