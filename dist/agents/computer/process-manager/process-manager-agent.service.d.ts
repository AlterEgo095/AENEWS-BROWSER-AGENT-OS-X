import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const PROCESS_MANAGER_AGENT_CONFIG: AgentConfig;
export declare class ProcessManagerAgentService extends BaseAgentService {
    private processes;
    private nextPid;
    private monitorResults;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private startProcess;
    private stopProcess;
    private listProcesses;
    private getProcessInfo;
    private monitorProcess;
    private killProcess;
    private seedSystemProcesses;
}
