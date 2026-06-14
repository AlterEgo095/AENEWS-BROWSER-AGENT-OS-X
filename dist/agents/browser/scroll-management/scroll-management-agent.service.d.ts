import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const SCROLL_MANAGEMENT_AGENT_CONFIG: AgentConfig;
export declare class ScrollManagementAgentService extends BaseAgentService {
    private readonly bridge?;
    private scrollPosition;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
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
