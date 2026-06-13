import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const PROJECT_MANAGEMENT_AGENT_CONFIG: AgentConfig;
export declare class ProjectManagementAgentService extends BaseAgentService {
    private projects;
    private counter;
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
