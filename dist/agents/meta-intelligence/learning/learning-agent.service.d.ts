import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const META_LEARNING_AGENT_CONFIG: AgentConfig;
export declare class LearningAgentService extends BaseAgentService {
    private readonly bridge?;
    constructor(bridge?: AgentConnectorBridge | undefined);
    private knowledgeBase;
    private identifiedPatterns;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private learnFromExperience;
    private updateKnowledge;
    private identifyPatterns;
    private adaptStrategy;
    private measureImprovement;
    private forgetOutdated;
    private calculateSimpleCorrelation;
}
