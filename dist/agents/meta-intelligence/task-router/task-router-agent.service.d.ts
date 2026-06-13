import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const META_TASK_ROUTER_AGENT_CONFIG: AgentConfig;
export declare class TaskRouterAgentService extends BaseAgentService {
    private agentProfiles;
    private routingHistory;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private routeTask;
    private selectAgent;
    private balanceLoad;
    private predictCompletion;
    private handleOverflow;
    private optimizeRouting;
    private seedAgentProfiles;
}
