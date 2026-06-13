import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../interfaces/agent.interface';
export declare const SELF_EVOLUTION_METRIC_ANALYZER_CONFIG: AgentConfig;
export declare class MetricAnalyzerAgent extends BaseAgentService {
    private baselines;
    private analysisReports;
    private anomalyHistory;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private analyzeMetrics;
    private collectBaseline;
    private detectAnomaly;
}
