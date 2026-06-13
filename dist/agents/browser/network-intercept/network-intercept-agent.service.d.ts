import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const NETWORK_INTERCEPT_AGENT_CONFIG: AgentConfig;
export declare class NetworkInterceptAgentService extends BaseAgentService {
    private interceptRules;
    private mockResponses;
    private blockRules;
    private headerModifications;
    private networkLog;
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
