import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const EMAIL_AGENT_CONFIG: AgentConfig;
export declare class EmailAgentService extends BaseAgentService {
    private readonly bridge?;
    private emails;
    private folders;
    private emailCounter;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private compose;
    private send;
    private read;
    private reply;
    private forward;
    private search;
    private deleteEmail;
    private organizeInFolder;
    private seedDefaultFolders;
    private generateEmailId;
    private addEmailToFolder;
    private removeEmailFromFolder;
    private isValidEmail;
}
