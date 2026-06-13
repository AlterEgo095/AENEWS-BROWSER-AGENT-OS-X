import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../interfaces/agent.interface';
export declare const SELF_EVOLUTION_REFACTOR_PROPOSER_CONFIG: AgentConfig;
export declare class RefactorProposerAgent extends BaseAgentService {
    private proposals;
    private impactAnalyses;
    private executionPlans;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private proposeRefactor;
    private generateRefactorActions;
    private analyzeImpact;
    private generatePlan;
}
