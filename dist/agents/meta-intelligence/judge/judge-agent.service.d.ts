import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const META_JUDGE_AGENT_CONFIG: AgentConfig;
export declare class JudgeAgentService extends BaseAgentService {
    private decisions;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private arbitrate;
    private makeDecision;
    private resolveConflict;
    private evaluateEvidence;
    private generateRuling;
    private explainReasoning;
}
