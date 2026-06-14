import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const VERSION_CONTROL_AGENT_CONFIG: AgentConfig;
export declare class VersionControlAgentService extends BaseAgentService {
    private readonly bridge?;
    private commits;
    private branches;
    private currentBranch;
    private stagingArea;
    private workingTree;
    private headHash;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private initializeVirtualRepo;
    private commit;
    private branch;
    private merge;
    private rebase;
    private resolveConflict;
    private getDiff;
    private getLog;
    private generateHash;
    private getBranchList;
}
