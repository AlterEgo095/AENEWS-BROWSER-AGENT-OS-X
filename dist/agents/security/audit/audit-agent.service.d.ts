import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const AUDIT_AGENT_CONFIG: AgentConfig;
export declare class AuditAgentService extends BaseAgentService {
    private readonly bridge?;
    private auditHistory;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    private changeLog;
    private findingCounter;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private performAudit;
    private checkCompliance;
    private analyzeLogs;
    private generateAuditReport;
    private trackChanges;
    private reviewPermissions;
}
