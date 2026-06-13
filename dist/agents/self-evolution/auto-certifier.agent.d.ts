import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../interfaces/agent.interface';
import { AgentConnectorBridge } from '../bridge';
export declare const SELF_EVOLUTION_AUTO_CERTIFIER_CONFIG: AgentConfig;
export declare class AutoCertifierAgent extends BaseAgentService {
    private readonly bridge?;
    constructor(bridge?: AgentConnectorBridge | undefined);
    private certifications;
    private eqiComparisons;
    private mergeDecisions;
    private currentBaselineEQI;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private runCertification;
    private compareEqi;
    private mergeIfImproved;
    private generateCommitHash;
}
