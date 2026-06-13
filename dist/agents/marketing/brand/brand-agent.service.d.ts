import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const BRAND_AGENT_CONFIG: AgentConfig;
export declare class BrandAgentService extends BaseAgentService {
    private readonly bridge?;
    private assets;
    private voiceProfiles;
    private assetCounter;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
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
