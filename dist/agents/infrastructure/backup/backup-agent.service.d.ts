import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const BACKUP_AGENT_CONFIG: AgentConfig;
export declare class BackupAgentService extends BaseAgentService {
    private readonly bridge?;
    private backups;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    private schedules;
    private backupCounter;
    private scheduleCounter;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private createBackup;
    private restoreBackup;
    private scheduleBackup;
    private verifyBackup;
    private listBackups;
    private deleteBackup;
    private generateChecksum;
    private formatBytes;
    private seedInitialBackups;
}
