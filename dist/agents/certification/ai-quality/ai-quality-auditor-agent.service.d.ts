import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const AI_QUALITY_AUDITOR_CONFIG: AgentConfig;
export declare class AIQualityAuditorAgent extends BaseAgentService {
    private aiQualityAuditLog;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private performAudit;
    private detectHallucination;
    private assessBias;
    private checkPromptInjection;
    private auditOutputReliability;
    private getAIQualityDescription;
    private getMitigations;
}
