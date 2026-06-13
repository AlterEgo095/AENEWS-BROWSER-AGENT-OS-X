import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const FILE_DOWNLOAD_AGENT_CONFIG: AgentConfig;
export declare class FileDownloadAgentService extends BaseAgentService {
    private readonly bridge?;
    private downloads;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
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
