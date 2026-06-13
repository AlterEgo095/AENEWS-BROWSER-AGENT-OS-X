import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../interfaces/agent.interface';
export declare const SELF_EVOLUTION_WEAKNESS_DETECTOR_CONFIG: AgentConfig;
export declare class WeaknessDetectorAgent extends BaseAgentService {
    private weaknesses;
    private eqiHistory;
    private bottlenecks;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private detectWeakness;
    private analyzeEqiTrends;
    private identifyBottlenecks;
    private inferRegressionCause;
}
