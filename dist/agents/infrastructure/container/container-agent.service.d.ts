import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
export declare const CONTAINER_AGENT_CONFIG: AgentConfig;
export declare class ContainerAgentService extends BaseAgentService {
    private containers;
    private pods;
    private services;
    private namespaces;
    private containerCounter;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private createContainer;
    private managePod;
    private scaleReplicaSet;
    private configureService;
    private checkClusterHealth;
    private manageNamespace;
    private generatePodSuffix;
    private seedInitialData;
}
