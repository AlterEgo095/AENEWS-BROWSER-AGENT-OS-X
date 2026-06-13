import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const META_REASONING_AGENT_CONFIG: AgentConfig;
export declare class MetaReasoningAgentService extends BaseAgentService {
    private readonly bridge?;
    constructor(bridge?: AgentConnectorBridge | undefined);
    private analyses;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private analyzeReasoning;
    private detectBias;
    private evaluateLogic;
    private improveReasoning;
    private generateAlternative;
    private validateInference;
}
