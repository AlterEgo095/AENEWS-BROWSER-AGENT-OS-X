import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const META_ORCHESTRATOR_AGENT_CONFIG: AgentConfig;
export declare class OrchestratorAgentService extends BaseAgentService {
    private orchestrations;
    private assignments;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private orchestrateTask;
    private assignAgent;
    private monitorProgress;
    private rebalanceWorkload;
    private generateOrchestrationPlan;
    private evaluateOutcome;
    private decomposeTask;
    private identifyBottlenecks;
    private assessCompletionScore;
    private extractLessons;
    private generateRecommendations;
}
