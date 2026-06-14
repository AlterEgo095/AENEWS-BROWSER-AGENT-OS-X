import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const JAVASCRIPT_EXECUTION_AGENT_CONFIG: AgentConfig;
export declare class JavaScriptExecutionAgentService extends BaseAgentService {
    private readonly bridge?;
    private executionHistory;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private evaluateExpression;
    private executeScript;
    private injectScript;
    private evaluateFunction;
    private validateScriptSafety;
    private simulateEvaluation;
    private simulateFunctionEvaluation;
}
