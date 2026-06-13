import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const DOCUMENT_AGENT_CONFIG: AgentConfig;
export declare class DocumentAgentService extends BaseAgentService {
    private documents;
    private templates;
    private documentCounter;
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
