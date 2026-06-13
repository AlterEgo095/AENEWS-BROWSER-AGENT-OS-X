import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const DATA_EXTRACTION_AGENT_CONFIG: AgentConfig;
export declare class DataExtractionAgentService extends BaseAgentService {
    private readonly bridge?;
    private pageCache;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
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
