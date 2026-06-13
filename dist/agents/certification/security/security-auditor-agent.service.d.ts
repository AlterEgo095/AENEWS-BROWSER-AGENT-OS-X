import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const SECURITY_AUDITOR_CONFIG: AgentConfig;
export declare class SecurityAuditorAgent extends BaseAgentService {
    private vulnerabilityLog;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private performAudit;
    private checkInjectionPrevention;
    private auditRBAC;
    private auditAuthentication;
}
