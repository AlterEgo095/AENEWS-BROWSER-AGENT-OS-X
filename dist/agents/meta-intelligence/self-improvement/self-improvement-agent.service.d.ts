import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const META_SELF_IMPROVEMENT_AGENT_CONFIG: AgentConfig;
export declare class SelfImprovementAgentService extends BaseAgentService {
    private readonly bridge?;
    constructor(bridge?: AgentConnectorBridge | undefined);
    private improvementPlans;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private assessCapabilities;
    private identifyWeaknesses;
    private generateImprovementPlan;
    private trackProgress;
    private measurePerformance;
    private suggestUpgrades;
}
