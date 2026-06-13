import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const PERFORMANCE_AUDITOR_CONFIG: AgentConfig;
export declare class PerformanceAuditorAgent extends BaseAgentService {
    private performanceLog;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private performAudit;
    private measureLatency;
    private benchmarkThroughput;
    private profileResources;
}
