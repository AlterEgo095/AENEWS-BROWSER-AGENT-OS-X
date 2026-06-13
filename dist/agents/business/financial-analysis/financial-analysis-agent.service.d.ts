import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const FINANCIAL_ANALYSIS_AGENT_CONFIG: AgentConfig;
export declare class FinancialAnalysisAgentService extends BaseAgentService {
    private models;
    private pnlAnalyses;
    private analysisCounter;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private buildFinancialModel;
    private analyzePnL;
    private forecastRevenue;
    private calculateValuation;
    private analyzeCashFlow;
    private generateFinancialReport;
}
