import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const ACCESS_CONTROL_AGENT_CONFIG: AgentConfig;
export declare class AccessControlAgentService extends BaseAgentService {
    private readonly bridge?;
    private policies;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    private roles;
    private auditLog;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private grantAccess;
    private revokeAccess;
    private checkAgentPermission;
    private manageRole;
    private auditAccess;
    private definePolicy;
}
