import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const NAVIGATION_AGENT_CONFIG: AgentConfig;
export declare class NavigationAgentService extends BaseAgentService {
    private navigationHistory;
    private currentUrl;
    private historyIndex;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private navigateTo;
    private goBack;
    private goForward;
    private refresh;
    private waitForNavigation;
    private simulateRedirectCheck;
    private simulateStatusCode;
}
