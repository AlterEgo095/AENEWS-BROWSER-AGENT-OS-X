import { BaseAgentService } from '../../base/base-agent.service';
import { AgentConfig, AgentInput, AgentOutput } from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
export declare const NETWORK_AGENT_CONFIG: AgentConfig;
export declare class NetworkAgentService extends BaseAgentService {
    private readonly bridge?;
    private dnsRecords;
    constructor(eventBusService?: any, memoryService?: any, permissionEvaluator?: any, bridge?: AgentConnectorBridge | undefined);
    private loadBalancers;
    private firewallRules;
    private sslCerts;
    private dnsCounter;
    private firewallCounter;
    protected defineConfig(): AgentConfig;
    protected onInitialize(): Promise<void>;
    protected onExecute(input: AgentInput): Promise<AgentOutput>;
    protected onDestroy(): Promise<void>;
    private configureDNS;
    private manageLoadBalancer;
    private configureFirewall;
    private checkConnectivity;
    private analyzeTraffic;
    private manageSSL;
    private seedInitialData;
}
