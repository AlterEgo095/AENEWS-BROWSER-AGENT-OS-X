import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const WAIT_STRATEGY_AGENT_CONFIG: AgentConfig;
export declare class WaitStrategyAgentService extends BaseAgentService {
    private readonly bridge?;
    private activeWaits;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private waitForSelector;
    private waitForNavigation;
    private waitForNetworkIdle;
    private waitForFunction;
    private waitForTimeout;
}
