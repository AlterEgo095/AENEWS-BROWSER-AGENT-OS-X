import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const CLICK_AGENT_CONFIG: AgentConfig;
export declare class ClickAgentService extends BaseAgentService {
    private readonly bridge?;
    private knownElements;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private clickElement;
    private doubleClick;
    private rightClick;
    private dragAndDrop;
    private hoverElement;
    private validateSelector;
    private simulateElementLookup;
}
