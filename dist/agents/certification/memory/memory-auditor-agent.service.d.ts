import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const MEMORY_AUDITOR_CONFIG: AgentConfig;
export declare class MemoryAuditorAgent extends BaseAgentService {
    private memoryAuditLog;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private performAudit;
    private auditTiers;
    private auditGateway;
    private auditCrossTierRetrieval;
}
