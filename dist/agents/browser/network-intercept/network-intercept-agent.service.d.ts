import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const NETWORK_INTERCEPT_AGENT_CONFIG: AgentConfig;
export declare class NetworkInterceptAgentService extends BaseAgentService {
    private readonly bridge?;
    private interceptRules;
    private mockResponses;
    private blockRules;
    private headerModifications;
    private networkLog;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private interceptRequest;
    private mockResponse;
    private blockRequest;
    private modifyHeaders;
    private getNetworkLog;
}
