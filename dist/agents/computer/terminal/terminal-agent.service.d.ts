import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const TERMINAL_AGENT_CONFIG: AgentConfig;
export declare class TerminalAgentService extends BaseAgentService {
    private readonly bridge?;
    private commandHistory;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    private historyIdCounter;
    private currentCwd;
    private environmentVars;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private executeCommand;
    private executeScript;
    private getCommandHistory;
    private clearHistory;
    private pipeCommands;
    private recordHistory;
    private generateSimulatedOutput;
}
