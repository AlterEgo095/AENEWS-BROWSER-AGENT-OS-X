import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../interfaces/agent.interface';
import { AgentConnectorBridge } from '../bridge';
export declare const MISSION_ORCHESTRATOR_AI_AGENT_CONFIG: AgentConfig;
export declare class MissionOrchestratorAIAgentService extends BaseAgentService {
    private readonly bridge?;
    constructor(bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    private parseOrchestration;
    protected onDestroy(): Promise<void>;
}
