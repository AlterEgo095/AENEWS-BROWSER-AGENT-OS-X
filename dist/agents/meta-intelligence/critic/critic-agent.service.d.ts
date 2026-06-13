import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const META_CRITIC_AGENT_CONFIG: AgentConfig;
export declare class CriticAgentService extends BaseAgentService {
    private readonly bridge?;
    constructor(bridge?: AgentConnectorBridge | undefined);
    private evaluationHistory;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private evaluateOutput;
    private scoreQuality;
    private identifyIssues;
    private suggestImprovements;
    private compareOutputs;
    private validateConsistency;
    private evaluateCriterion;
    private scoreDimension;
    private scoreToGrade;
    private generateEvaluationSummary;
}
