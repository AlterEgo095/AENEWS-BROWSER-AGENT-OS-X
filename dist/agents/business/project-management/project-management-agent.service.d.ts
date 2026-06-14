import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const PROJECT_MANAGEMENT_AGENT_CONFIG: AgentConfig;
export declare class ProjectManagementAgentService extends BaseAgentService {
    private readonly bridge?;
    private projects;
    private counter;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private createProject;
    private planSprint;
    private allocateResources;
    private trackMilestones;
    private manageRisks;
    private generateProjectReport;
}
