import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const BRAND_AGENT_CONFIG: AgentConfig;
export declare class BrandAgentService extends BaseAgentService {
    private assets;
    private voiceProfiles;
    private assetCounter;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private checkBrandConsistency;
    private manageAssets;
    private generateBrandGuide;
    private analyzeBrandSentiment;
    private updateBrandVoice;
    private seedDefaultAssets;
    private seedDefaultVoiceProfiles;
    private checkToneConsistency;
    private checkTerminologyConsistency;
    private checkFormattingConsistency;
    private checkMessagingConsistency;
    private formatSectionTitle;
    private generateSectionContent;
}
