import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AgentStatus } from '../interfaces/agent.interface';
import { AgentRegistryService } from '../registry/agent-registry.service';
import { EventBusService } from '../events/event-bus.service';
export interface HealthCheckResult {
    agentId: string;
    isHealthy: boolean;
    status: AgentStatus;
    responseTimeMs: number;
    lastHealthCheck: Date;
    consecutiveFailures: number;
    details?: Record<string, any>;
}
export interface CircuitBreakerState {
    agentId: string;
    state: 'closed' | 'open' | 'half_open';
    failureCount: number;
    successCount: number;
    lastFailureTime: Date | null;
    lastStateChange: Date;
    nextRetryTime: Date | null;
}
export interface SystemHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    totalAgents: number;
    healthyAgents: number;
    unhealthyAgents: number;
    agentsInMaintenance: number;
    circuitBreakersOpen: number;
    lastFullCheck: Date;
    agentHealth: Record<string, HealthCheckResult>;
}
export declare class AgentHealthService implements OnModuleInit, OnModuleDestroy {
    private readonly agentRegistry;
    private readonly eventBus;
    private readonly logger;
    private healthCheckInterval;
    private readonly circuitBreakers;
    private readonly healthResults;
    private lastFullCheck;
    private readonly failureThreshold;
    private readonly successThreshold;
    private readonly resetTimeoutMs;
    private readonly healthCheckIntervalMs;
    constructor(agentRegistry: AgentRegistryService, eventBus: EventBusService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    checkAgentHealth(agentId: string): Promise<HealthCheckResult>;
    checkAllAgents(): Promise<SystemHealth>;
    getCircuitBreaker(agentId: string): CircuitBreakerState | null;
    getAllCircuitBreakers(): CircuitBreakerState[];
    getHealthResult(agentId: string): HealthCheckResult | null;
    getSystemHealth(): SystemHealth;
    recoverAgent(agentId: string): Promise<boolean>;
    recoverAllUnhealthy(): Promise<Record<string, boolean>>;
    private updateCircuitBreaker;
    private checkCircuitBreakerTimeouts;
    private startHealthChecks;
    private stopHealthChecks;
}
