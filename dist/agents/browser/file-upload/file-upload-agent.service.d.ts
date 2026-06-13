import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const FILE_UPLOAD_AGENT_CONFIG: AgentConfig;
export declare class FileUploadAgentService extends BaseAgentService {
    private uploadHistory;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private uploadFile;
    private uploadMultiple;
    private dragDropUpload;
    private verifyUpload;
    private simulateFileSize;
}
