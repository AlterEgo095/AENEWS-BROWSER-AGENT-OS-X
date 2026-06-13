import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const AD_CAMPAIGN_AGENT_CONFIG: AgentConfig;
export declare class AdCampaignAgentService extends BaseAgentService {
    private campaigns;
    private campaignCounter;
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
