import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const COMPLIANCE_AGENT_CONFIG: AgentConfig;
export declare class ComplianceAgentService extends BaseAgentService {
    private complianceChecks;
    private policies;
    private auditEntries;
    private counter;
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
