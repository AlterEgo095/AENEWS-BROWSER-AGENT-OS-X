import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const BROWSER_AUDITOR_CONFIG: AgentConfig;
export declare class BrowserAuditorAgent extends BaseAgentService {
    private browserAuditLog;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private performAudit;
    private auditNavigation;
    private auditSessions;
    private auditCookieManagement;
}
