import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const ARCHITECTURE_AUDITOR_CONFIG: AgentConfig;
export declare class ArchitectureAuditorAgent extends BaseAgentService {
    private readonly bridge?;
    constructor(bridge?: AgentConnectorBridge | undefined);
    private auditLog;
    private detectedCycles;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private performAudit;
    private detectCircularDeps;
    private analyzeCoupling;
    private checkBoundaries;
}
