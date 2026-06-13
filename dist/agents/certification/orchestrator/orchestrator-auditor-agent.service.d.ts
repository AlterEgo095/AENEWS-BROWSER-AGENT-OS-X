import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const ORCHESTRATOR_AUDITOR_CONFIG: AgentConfig;
export declare class OrchestratorAuditorAgent extends BaseAgentService {
    private orchestratorAuditLog;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private performAudit;
    private auditPipeline;
    private auditRouting;
    private auditResilience;
    private getStageDescription;
}
