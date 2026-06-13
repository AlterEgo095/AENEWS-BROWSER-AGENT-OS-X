import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const TEST_AUDITOR_CONFIG: AgentConfig;
export declare class TestAuditorAgent extends BaseAgentService {
    private testAuditLog;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private performAudit;
    private checkCoverage;
    private auditTestQuality;
    private auditE2E;
    private getTestDescription;
}
