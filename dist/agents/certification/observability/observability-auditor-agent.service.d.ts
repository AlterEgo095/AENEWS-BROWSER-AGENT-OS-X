import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const OBSERVABILITY_AUDITOR_CONFIG: AgentConfig;
export declare class ObservabilityAuditorAgent extends BaseAgentService {
    private observabilityAuditLog;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private performAudit;
    private auditMetrics;
    private auditTracing;
    private auditLogging;
    private auditAlerting;
    private getObservabilityDescription;
}
