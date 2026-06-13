import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const FILE_DOWNLOAD_AGENT_CONFIG: AgentConfig;
export declare class FileDownloadAgentService extends BaseAgentService {
    private downloads;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private downloadFile;
    private waitForDownload;
    private verifyDownload;
    private cancelDownload;
    private getDownloadHistory;
    private simulateChecksum;
}
