import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const DATA_EXTRACTION_AGENT_CONFIG: AgentConfig;
export declare class DataExtractionAgentService extends BaseAgentService {
    private pageCache;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private extractText;
    private extractTable;
    private extractList;
    private extractLinks;
    private extractMetadata;
    private extractStructuredData;
}
