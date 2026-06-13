import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const STRATEGY_AGENT_CONFIG: AgentConfig;
export declare class StrategyAgentService extends BaseAgentService {
    private strategicPlans;
    private swotAnalyses;
    private okrSets;
    private analysisCounter;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private createStrategicPlan;
    private performSWOT;
    private defineOKRs;
    private analyzeCompetitivePosition;
    private identifyOpportunities;
    private assessRisks;
}
