import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const META_KNOWLEDGE_SYNTHESIS_AGENT_CONFIG: AgentConfig;
export declare class KnowledgeSynthesisAgentService extends BaseAgentService {
    private readonly bridge?;
    constructor(bridge?: AgentConnectorBridge | undefined);
    private knowledgeGraph;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private synthesizeKnowledge;
    private mergeInsights;
    private resolveContradictions;
    private buildKnowledgeGraph;
    private generateSummary;
    private identifyGaps;
    private areContradictory;
}
