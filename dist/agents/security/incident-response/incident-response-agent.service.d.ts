import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const INCIDENT_RESPONSE_AGENT_CONFIG: AgentConfig;
export declare class IncidentResponseAgentService extends BaseAgentService {
    private readonly bridge?;
    private incidents;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private getIncidentOrThrow;
    private addTimelineEntry;
    private createIncident;
    private investigateIncident;
    private containThreat;
    private remediateIssue;
    private generateForensicReport;
    private postMortem;
}
