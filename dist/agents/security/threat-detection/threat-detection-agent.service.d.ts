import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const THREAT_DETECTION_AGENT_CONFIG: AgentConfig;
export declare class ThreatDetectionAgentService extends BaseAgentService {
    private readonly bridge?;
    private threatLog;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    private anomalyLog;
    private lastScanTime;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private scanForThreats;
    private analyzeAnomaly;
    private detectIntrusion;
    private monitorTraffic;
    private assessVulnerability;
    private generateThreatReport;
}
