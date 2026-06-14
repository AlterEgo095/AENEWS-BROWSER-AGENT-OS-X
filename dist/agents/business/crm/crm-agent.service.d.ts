import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const CRM_AGENT_CONFIG: AgentConfig;
export declare class CRMAgentService extends BaseAgentService {
    private readonly bridge?;
    private contacts;
    private deals;
    private counter;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private createContact;
    private updateContact;
    private trackDeal;
    private managePipeline;
    private analyzeConversion;
    private generateCRMReport;
    private groupByField;
}
