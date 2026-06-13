import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const SESSION_MANAGEMENT_AGENT_CONFIG: AgentConfig;
export declare class SessionManagementAgentService extends BaseAgentService {
    private sessions;
    private currentAccountId;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private login;
    private logout;
    private checkSession;
    private refreshSession;
    private switchAccount;
}
