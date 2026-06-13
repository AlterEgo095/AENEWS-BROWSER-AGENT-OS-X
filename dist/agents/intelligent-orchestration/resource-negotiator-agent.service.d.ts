import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../interfaces/agent.interface';
import { AgentConnectorBridge } from '../bridge';
export declare const RESOURCE_NEGOTIATOR_AGENT_CONFIG: AgentConfig;
export declare class ResourceNegotiatorAgentService extends BaseAgentService {
    private readonly bridge?;
    constructor(bridge?: AgentConnectorBridge | undefined);
    private currentAllocations;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    private parseNegotiation;
    private buildFallbackNegotiation;
    protected onDestroy(): Promise<void>;
}
