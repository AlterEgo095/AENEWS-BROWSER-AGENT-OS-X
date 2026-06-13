import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const CONFIGURATION_AGENT_CONFIG: AgentConfig;
export declare class ConfigurationAgentService extends BaseAgentService {
    private configStore;
    private featureFlags;
    private configVersion;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private retrieveConfig;
    private setConfig;
    private manageFeatureFlag;
    private detectDrift;
    private validateConfig;
    private rollbackConfig;
}
