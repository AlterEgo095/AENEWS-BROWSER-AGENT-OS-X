import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const META_ADAPTATION_AGENT_CONFIG: AgentConfig;
export declare class AdaptationAgentService extends BaseAgentService {
    private adaptationHistory;
    private currentParameters;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private adaptConfiguration;
    private optimizeParameters;
    private respondToChange;
    private predictNeeds;
    private autoTune;
    private generateAdaptationReport;
    private seedParameters;
}
