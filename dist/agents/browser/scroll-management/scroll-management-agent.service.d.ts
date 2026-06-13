import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const SCROLL_MANAGEMENT_AGENT_CONFIG: AgentConfig;
export declare class ScrollManagementAgentService extends BaseAgentService {
    private scrollPosition;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private scrollToElement;
    private scrollBy;
    private scrollToTop;
    private scrollToBottom;
    private handleInfiniteScroll;
    private simulateSmoothScroll;
}
