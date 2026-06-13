import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const DOCUMENTATION_AUDITOR_CONFIG: AgentConfig;
export declare class DocumentationAuditorAgent extends BaseAgentService {
    private documentationAuditLog;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private performAudit;
    private checkJSDoc;
    private checkApiDocs;
    private checkDiagrams;
    private getDocDescription;
}
