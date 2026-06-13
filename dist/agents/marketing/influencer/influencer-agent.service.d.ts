import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const INFLUENCER_AGENT_CONFIG: AgentConfig;
export declare class InfluencerAgentService extends BaseAgentService {
    private influencers;
    private outreachCampaigns;
    private collaborations;
    private influencerCounter;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private findInfluencers;
    private analyzeInfluencer;
    private createOutreach;
    private manageCollaboration;
    private trackCampaignROI;
    private seedInfluencerData;
    private generateInfluencerResults;
    private generateROIRecommendations;
}
