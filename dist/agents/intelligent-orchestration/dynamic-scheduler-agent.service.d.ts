import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../interfaces/agent.interface';
import { AgentConnectorBridge } from '../bridge';
export declare const DYNAMIC_SCHEDULER_AGENT_CONFIG: AgentConfig;
export declare class DynamicSchedulerAgentService extends BaseAgentService {
    private readonly bridge?;
    constructor(bridge?: AgentConnectorBridge | undefined);
    private scheduleHistory;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    private parseSchedule;
    private buildFallbackSchedule;
    private computeCriticalPath;
    private computeResourceUtilization;
    protected onDestroy(): Promise<void>;
}
