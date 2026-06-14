import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const SCALING_AGENT_CONFIG: AgentConfig;
export declare class ScalingAgentService extends BaseAgentService {
    private readonly bridge?;
    private serviceResources;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    private autoScalingPolicies;
    private capacityPlans;
    private policyCounter;
    private planCounter;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private scaleUp;
    private scaleDown;
    private setAutoScaling;
    private analyzeCapacity;
    private optimizeResources;
    private planCapacity;
    private getOrCreateServiceResources;
    private seedInitialResources;
}
