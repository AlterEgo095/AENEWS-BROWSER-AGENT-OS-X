import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const FILESYSTEM_AGENT_CONFIG: AgentConfig;
export declare class FileSystemAgentService extends BaseAgentService {
    private root;
    private operationLog;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private readFile;
    private writeFile;
    private createDirectory;
    private deleteFile;
    private moveFile;
    private copyFile;
    private listDirectory;
    private getFileInfo;
    private createDirectoryNode;
    private validatePath;
    private resolveNode;
    private splitPath;
    private getParentPath;
    private getBaseName;
    private deepCloneNode;
    private calculateNodeSize;
    private matchGlob;
}
