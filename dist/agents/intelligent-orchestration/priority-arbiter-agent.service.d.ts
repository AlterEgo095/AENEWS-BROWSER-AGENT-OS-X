import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../interfaces/agent.interface';
import { AgentConnectorBridge } from '../bridge';
export declare const PRIORITY_ARBITER_AGENT_CONFIG: AgentConfig;
export declare class PriorityArbiterAgentService extends BaseAgentService {
    private readonly bridge?;
    constructor(bridge?: AgentConnectorBridge | undefined);
    private arbitrationHistory;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    private parseArbitration;
    private buildFallbackArbitration;
    private getPolicyWeights;
    private computeDeadlineProximity;
    private computeDependencyWeight;
    private generateReasoning;
    protected onDestroy(): Promise<void>;
}
