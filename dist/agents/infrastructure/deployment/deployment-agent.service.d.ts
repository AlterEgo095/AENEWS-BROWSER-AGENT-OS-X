import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const DEPLOYMENT_AGENT_CONFIG: AgentConfig;
export declare class DeploymentAgentService extends BaseAgentService {
    private readonly bridge?;
    private deployments;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    private deploymentCounter;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private deploy;
    private rollback;
    private promoteCanary;
    private getDeploymentStatus;
    private scaleDeployment;
    private generateDeploymentReport;
    private findPreviousVersion;
    private generateSimulatedHistory;
}
