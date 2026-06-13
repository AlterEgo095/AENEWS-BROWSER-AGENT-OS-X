import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const META_GOVERNANCE_AGENT_CONFIG: AgentConfig;
export declare class GovernanceAgentService extends BaseAgentService {
    private policies;
    private violations;
    private exceptions;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private enforcePolicy;
    private auditCompliance;
    private reviewGovernance;
    private updatePolicy;
    private generateGovernanceReport;
    private manageExceptions;
    private seedPolicies;
}
