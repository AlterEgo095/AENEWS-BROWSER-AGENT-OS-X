import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const COMPLIANCE_AGENT_CONFIG: AgentConfig;
export declare class ComplianceAgentService extends BaseAgentService {
    private readonly bridge?;
    private complianceChecks;
    private policies;
    private auditEntries;
    private counter;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private checkCompliance;
    private generateAuditTrail;
    private managePolicies;
    private assessRisk;
    private generateComplianceReport;
    private trackRegulations;
}
