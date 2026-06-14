import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const CONFIGURATION_AGENT_CONFIG: AgentConfig;
export declare class ConfigurationAgentService extends BaseAgentService {
    private readonly bridge?;
    private configStore;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
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
