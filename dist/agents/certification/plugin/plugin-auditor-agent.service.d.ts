import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const PLUGIN_AUDITOR_CONFIG: AgentConfig;
export declare class PluginAuditorAgent extends BaseAgentService {
    private pluginAuditLog;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private performAudit;
    private checkIsolation;
    private checkCompatibility;
    private auditLifecycle;
}
