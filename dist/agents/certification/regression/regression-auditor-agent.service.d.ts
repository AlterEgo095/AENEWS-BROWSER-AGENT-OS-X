import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const REGRESSION_AUDITOR_CONFIG: AgentConfig;
export declare class RegressionAuditorAgent extends BaseAgentService {
    private readonly bridge?;
    constructor(bridge?: AgentConnectorBridge | undefined);
    private regressionAuditLog;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private performAudit;
    private checkBaselines;
    private detectRegressions;
    private auditPrevention;
    private getRegressionDescription;
}
