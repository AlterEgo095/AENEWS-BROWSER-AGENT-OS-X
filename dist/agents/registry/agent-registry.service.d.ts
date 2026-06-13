import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AgentCluster, AgentState, AgentStatus, AgentInput, TaskPriority } from '../interfaces/agent.interface';
import { BaseAgentService } from '../base/base-agent.service';
import { EventBusService } from '../events/event-bus.service';
export declare enum RoutingStrategy {
    ROUND_ROBIN = "round_robin",
    LEAST_LOADED = "least_loaded",
    RANDOM = "random",
    CAPABILITY_BASED = "capability_based",
    PRIORITY_BASED = "priority_based"
}
export interface RoutingResult {
    agentId: string;
    agentName: string;
    cluster: AgentCluster;
    reason: string;
}
export declare class AgentRegistryService implements OnModuleInit, OnModuleDestroy {
    private readonly eventBusService;
    private readonly logger;
    private readonly registry;
    private readonly clusterIndex;
    private readonly capabilityIndex;
    private readonly nameIndex;
    private roundRobinCounters;
    private heartbeatInterval;
    constructor(eventBusService: EventBusService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    register(agent: BaseAgentService): Promise<void>;
    unregister(agentId: string): Promise<boolean>;
    get(agentId: string): BaseAgentService | undefined;
    getAgent(agentId: string): BaseAgentService | null;
    getAgentByName(name: string): BaseAgentService | null;
    getByCluster(cluster: AgentCluster): BaseAgentService[];
    getAgentsByCluster(cluster: AgentCluster): BaseAgentService[];
    getByCapability(capabilityName: string): BaseAgentService[];
    getAgentsByCapability(capabilityName: string): BaseAgentService[];
    getAll(): BaseAgentService[];
    getAllAgents(): BaseAgentService[];
    getAllStates(): AgentState[];
    getAllAgentStates(): AgentState[];
    getAvailableAgents(cluster?: AgentCluster): BaseAgentService[];
    findBestAgent(capability: string, priority?: TaskPriority): BaseAgentService | undefined;
    routeTask(input: AgentInput, strategy?: RoutingStrategy, targetCluster?: AgentCluster): RoutingResult | null;
    initializeAll(): Promise<void>;
    healthCheckAll(): Promise<Map<string, boolean>>;
    getHealthStatus(): Record<string, {
        isHealthy: boolean;
        status: AgentStatus;
        consecutiveFailures: number;
        uptimeMs: number;
    }>;
    getUnhealthyAgents(): BaseAgentService[];
    recoverAgent(agentId: string): Promise<boolean>;
    private startHeartbeatMonitoring;
    private stopHeartbeatMonitoring;
    private performHeartbeatCheck;
    getStats(): {
        total: number;
        byCluster: Record<string, number>;
        healthy: number;
    };
    getExtendedStats(): {
        totalAgents: number;
        agentsByCluster: Record<string, number>;
        agentsByStatus: Record<string, number>;
        totalCapabilities: number;
        availableAgents: number;
        healthyAgents: number;
    };
    isRegistered(agentId: string): boolean;
    getAgentCount(): number;
}
