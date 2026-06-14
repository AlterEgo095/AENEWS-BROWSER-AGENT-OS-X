import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const META_REPAIR_AGENT_CONFIG: AgentConfig;
export declare class RepairAgentService extends BaseAgentService {
    private readonly bridge?;
    constructor(bridge?: AgentConnectorBridge | undefined);
    private repairHistory;
    private failureLessons;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private diagnoseFailure;
    private repairOutput;
    private retryWithModifications;
    private applyPatch;
    private verifyRepair;
    private learnFromFailure;
    private getDefaultValueForKey;
}
