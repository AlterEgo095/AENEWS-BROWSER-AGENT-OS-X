import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const TASK_MANAGEMENT_AGENT_CONFIG: AgentConfig;
export declare class TaskManagementAgentService extends BaseAgentService {
    private tasks;
    private projects;
    private taskCounter;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private createTask;
    private updateTask;
    private assignTask;
    private trackProgress;
    private generateReport;
    private setDeadline;
    private prioritizeTask;
    private generateTaskId;
    private getWeekStart;
}
