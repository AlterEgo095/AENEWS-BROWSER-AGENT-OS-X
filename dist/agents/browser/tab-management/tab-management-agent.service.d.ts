import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const TAB_MANAGEMENT_AGENT_CONFIG: AgentConfig;
export declare class TabManagementAgentService extends BaseAgentService {
    private tabs;
    private activeTabId;
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
