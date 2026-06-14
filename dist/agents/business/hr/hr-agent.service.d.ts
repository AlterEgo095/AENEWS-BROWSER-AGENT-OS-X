import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const HR_AGENT_CONFIG: AgentConfig;
export declare class HRAgentService extends BaseAgentService {
    private readonly bridge?;
    private jobPostings;
    private employees;
    private onboardingProcesses;
    private leaveRequests;
    private counter;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private createJobPosting;
    private screenCandidates;
    private manageOnboarding;
    private trackPerformance;
    private generateHRReport;
    private manageLeave;
    private seedEmployees;
}
