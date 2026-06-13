import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const SOCIAL_MEDIA_AGENT_CONFIG: AgentConfig;
export declare class SocialMediaAgentService extends BaseAgentService {
    private posts;
    private hashtagIndex;
    private postCounter;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private createPost;
    private schedulePost;
    private analyzeEngagement;
    private getAnalytics;
    private manageHashtags;
    private findTrendingTopics;
    private seedHashtagData;
    private generatePostId;
    private getPlatformCharLimit;
    private generateEngagementRecommendations;
    private generateTrendData;
    private generateTrendingTopics;
}
