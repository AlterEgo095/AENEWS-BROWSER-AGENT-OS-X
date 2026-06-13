import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const TAB_MANAGEMENT_AGENT_CONFIG: AgentConfig;
export declare class TabManagementAgentService extends BaseAgentService {
    private readonly bridge?;
    private tabs;
    private activeTabId;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private openTab;
    private closeTab;
    private switchTab;
    private getTabList;
    private waitForTab;
}
