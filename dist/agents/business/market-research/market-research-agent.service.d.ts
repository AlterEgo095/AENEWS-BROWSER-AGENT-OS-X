import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const MARKET_RESEARCH_AGENT_CONFIG: AgentConfig;
export declare class MarketResearchAgentService extends BaseAgentService {
    private readonly bridge?;
    private marketAnalyses;
    private competitors;
    private trendReports;
    private analysisCounter;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private analyzeMarket;
    private researchCompetitor;
    private identifyTrends;
    private analyzeDemand;
    private generateMarketReport;
    private assessMarketSize;
    private pickRandom;
}
