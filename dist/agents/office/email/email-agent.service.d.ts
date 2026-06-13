import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const EMAIL_AGENT_CONFIG: AgentConfig;
export declare class EmailAgentService extends BaseAgentService {
    private emails;
    private folders;
    private emailCounter;
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
