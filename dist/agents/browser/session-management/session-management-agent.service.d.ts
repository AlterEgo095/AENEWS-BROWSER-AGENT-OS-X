import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const SESSION_MANAGEMENT_AGENT_CONFIG: AgentConfig;
export declare class SessionManagementAgentService extends BaseAgentService {
    private readonly bridge?;
    private sessions;
    private currentAccountId;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
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
