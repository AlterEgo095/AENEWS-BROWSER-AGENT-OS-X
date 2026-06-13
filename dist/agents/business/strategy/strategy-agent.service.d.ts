import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const STRATEGY_AGENT_CONFIG: AgentConfig;
export declare class StrategyAgentService extends BaseAgentService {
    private readonly bridge?;
    private strategicPlans;
    private swotAnalyses;
    private okrSets;
    private analysisCounter;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
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
