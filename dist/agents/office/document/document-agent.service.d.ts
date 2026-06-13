import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const DOCUMENT_AGENT_CONFIG: AgentConfig;
export declare class DocumentAgentService extends BaseAgentService {
    private readonly bridge?;
    private documents;
    private templates;
    private documentCounter;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private createDocument;
    private editDocument;
    private convertFormat;
    private extractText;
    private mergeDocuments;
    private applyTemplate;
    private seedTemplates;
    private generateDocumentId;
    private estimatePageCount;
    private stripMarkup;
    private applyFormatMarkup;
    private performConversion;
    private escapeRegex;
}
