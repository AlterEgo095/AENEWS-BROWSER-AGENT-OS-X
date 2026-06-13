import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const SYSTEM_MONITOR_AGENT_CONFIG: AgentConfig;
export declare class SystemMonitorAgentService extends BaseAgentService {
    private readonly bridge?;
    private systemState;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    private historicalCpu;
    private historicalMemory;
    private maxHistorySize;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private getCpuUsage;
    private getMemoryUsage;
    private getDiskUsage;
    private getNetworkStats;
    private getSystemInfo;
    private monitorResource;
    private fluctuateCpu;
    private fluctuateMemory;
    private fluctuateNetwork;
    private trimHistory;
}
