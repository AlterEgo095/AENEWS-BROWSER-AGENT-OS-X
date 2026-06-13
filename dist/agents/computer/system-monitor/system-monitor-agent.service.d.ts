import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const SYSTEM_MONITOR_AGENT_CONFIG: AgentConfig;
export declare class SystemMonitorAgentService extends BaseAgentService {
    private systemState;
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
