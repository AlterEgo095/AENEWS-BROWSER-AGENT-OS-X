import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const MONITORING_AGENT_CONFIG: AgentConfig;
export declare class MonitoringAgentService extends BaseAgentService {
    private alerts;
    private dashboards;
    private alertCounter;
    private dashboardCounter;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private getMetrics;
    private createAlert;
    private listAlerts;
    private acknowledgeAlert;
    private generateDashboard;
    private checkServiceHealth;
    private calculateDataPointCount;
    private generateMetricSet;
    private seedInitialAlerts;
}
