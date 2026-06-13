import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const META_SELF_IMPROVEMENT_AGENT_CONFIG: AgentConfig;
export declare class SelfImprovementAgentService extends BaseAgentService {
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
