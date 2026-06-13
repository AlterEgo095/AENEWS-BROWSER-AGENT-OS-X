import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const EMAIL_MARKETING_AGENT_CONFIG: AgentConfig;
export declare class EmailMarketingAgentService extends BaseAgentService {
    private campaigns;
    private templates;
    private lists;
    private abTests;
    private campaignCounter;
    private templateCounter;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private createCampaign;
    private sendCampaign;
    private createTemplate;
    private abTest;
    private analyzeResults;
    private manageSubscribers;
    private seedTemplates;
    private seedDefaultList;
    private generateCampaignId;
    private generateTemplateId;
    private isValidEmail;
    private generateInsights;
}
