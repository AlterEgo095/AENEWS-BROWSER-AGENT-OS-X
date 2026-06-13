import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const ORCHESTRATOR_AUDITOR_CONFIG: AgentConfig;
export declare class OrchestratorAuditorAgent extends BaseAgentService {
    private readonly bridge?;
    constructor(bridge?: AgentConnectorBridge | undefined);
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
