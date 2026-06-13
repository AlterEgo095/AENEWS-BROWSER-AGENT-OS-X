import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const AUTHENTICATION_AGENT_CONFIG: AgentConfig;
export declare class AuthenticationAgentService extends BaseAgentService {
    private readonly bridge?;
    private authEvents;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    private activeTokens;
    private mfaStates;
    private ssoProviders;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private authenticate;
    private validateToken;
    private manageMFA;
    private configureSSO;
    private revokeAccess;
    private auditAuthEvents;
}
