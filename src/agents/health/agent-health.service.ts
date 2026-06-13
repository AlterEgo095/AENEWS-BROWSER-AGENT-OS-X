/**
 * AENEWS Agent OS X - Agent Health Service
 * Monitors agent health, implements the circuit breaker pattern
 * (closed → open → half-open), provides health status aggregation,
 * alerts on consecutive failures, and supports auto-recovery attempts.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AgentStatus, AgentHealthState } from '../interfaces/agent.interface';
import { AgentRegistryService } from '../registry/agent-registry.service';
import { EventBusService } from '../events/event-bus.service';
import { AgentEventType, AgentHealthChangedPayload } from '../interfaces/agent-event.interface';

// ─── Health Check Result ──────────────────────────────────────────
export interface HealthCheckResult {
  agentId: string;
  isHealthy: boolean;
  status: AgentStatus;
  responseTimeMs: number;
  lastHealthCheck: Date;
  consecutiveFailures: number;
  details?: Record<string, any>;
}

// ─── Circuit Breaker State ────────────────────────────────────────
export interface CircuitBreakerState {
  agentId: string;
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  successCount: number;
  lastFailureTime: Date | null;
  lastStateChange: Date;
  nextRetryTime: Date | null;
}

// ─── System Health ────────────────────────────────────────────────
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

@Injectable()
export class AgentHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentHealthService.name);
  private healthCheckInterval: NodeJS.Timer | null = null;
  private readonly circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly healthResults: Map<string, HealthCheckResult> = new Map();
  private lastFullCheck: Date = new Date();

  // Circuit breaker configuration
  private readonly failureThreshold = 5;
  private readonly successThreshold = 3;
  private readonly resetTimeoutMs = 60000;
  private readonly healthCheckIntervalMs = 15000;

  constructor(
    private readonly agentRegistry: AgentRegistryService,
    private readonly eventBus: EventBusService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.startHealthChecks();
    this.logger.log('Agent Health service initialized');
  }

  onModuleDestroy(): void {
    this.stopHealthChecks();
  }

  /**
   * Perform a health check on a specific agent.
   */
  async checkAgentHealth(agentId: string): Promise<HealthCheckResult> {
    const agent = this.agentRegistry.getAgent(agentId);
    const startTime = Date.now();

    if (!agent) {
      return {
        agentId,
        isHealthy: false,
        status: AgentStatus.STOPPED,
        responseTimeMs: Date.now() - startTime,
        lastHealthCheck: new Date(),
        consecutiveFailures: Infinity,
        details: { error: 'Agent not found in registry' },
      };
    }

    const state = agent.getState();
    let isHealthy = false;
    let details: Record<string, any> = {};

    try {
      // Check agent status
      const isStatusHealthy = [AgentStatus.IDLE, AgentStatus.RUNNING, AgentStatus.PAUSED].includes(
        state.status,
      );

      // Check agent's custom health check
      const customHealthy = (await (agent as any).performHealthCheck?.()) ?? true;

      isHealthy = isStatusHealthy && customHealthy;

      details = {
        status: state.status,
        currentTasks: state.currentTasks.length,
        completedTasks: state.completedTasks,
        failedTasks: state.failedTasks,
        uptimeMs: state.health.uptimeMs,
        customHealthCheck: customHealthy,
      };
    } catch (error) {
      isHealthy = false;
      details = { error: (error as Error).message };
    }

    const responseTimeMs = Date.now() - startTime;

    // Update consecutive failures tracking
    const previousResult = this.healthResults.get(agentId);
    const consecutiveFailures = isHealthy ? 0 : (previousResult?.consecutiveFailures || 0) + 1;

    // Alert on consecutive failures
    if (consecutiveFailures > 0 && consecutiveFailures % 3 === 0) {
      this.logger.warn(
        `Agent ${agentId} has ${consecutiveFailures} consecutive health check failures`,
      );
    }

    // Update circuit breaker
    this.updateCircuitBreaker(agentId, isHealthy);

    const result: HealthCheckResult = {
      agentId,
      isHealthy,
      status: state.status,
      responseTimeMs,
      lastHealthCheck: new Date(),
      consecutiveFailures,
      details,
    };

    // Check for health state change and emit event
    if (previousResult && previousResult.isHealthy !== isHealthy) {
      await this.eventBus.publish({
        type: AgentEventType.AGENT_HEALTH_CHANGED,
        sourceAgentId: 'health-service',
        payload: {
          isHealthy,
          previousHealth: previousResult.isHealthy,
          consecutiveFailures,
          details,
        } as AgentHealthChangedPayload,
        priority: isHealthy ? 1 : 2,
        correlationId: agentId,
        metadata: {},
      });
    }

    this.healthResults.set(agentId, result);

    return result;
  }

  /**
   * Perform health checks on all registered agents.
   */
  async checkAllAgents(): Promise<SystemHealth> {
    const agents = this.agentRegistry.getAllAgents();
    const results: Record<string, HealthCheckResult> = {};

    // Run health checks in parallel with a concurrency limit
    const batchSize = 10;
    for (let i = 0; i < agents.length; i += batchSize) {
      const batch = agents.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(async (agent) => {
          const config = agent.getConfig();
          return { id: config.id, result: await this.checkAgentHealth(config.id) };
        }),
      );

      for (const settled of batchResults) {
        if (settled.status === 'fulfilled') {
          results[settled.value.id] = settled.value.result;
        }
      }
    }

    this.lastFullCheck = new Date();

    const healthyCount = Object.values(results).filter((r) => r.isHealthy).length;
    const unhealthyCount = Object.values(results).filter((r) => !r.isHealthy).length;
    const maintenanceCount = Object.values(results).filter(
      (r) => r.status === AgentStatus.MAINTENANCE,
    ).length;
    const openBreakers = Array.from(this.circuitBreakers.values()).filter(
      (cb) => cb.state === 'open',
    ).length;

    let status: SystemHealth['status'];
    if (unhealthyCount === 0 && openBreakers === 0) {
      status = 'healthy';
    } else if (unhealthyCount <= healthyCount && openBreakers <= 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const systemHealth: SystemHealth = {
      status,
      totalAgents: agents.length,
      healthyAgents: healthyCount,
      unhealthyAgents: unhealthyCount,
      agentsInMaintenance: maintenanceCount,
      circuitBreakersOpen: openBreakers,
      lastFullCheck: this.lastFullCheck,
      agentHealth: results,
    };

    return systemHealth;
  }

  /**
   * Get the circuit breaker state for an agent.
   */
  getCircuitBreaker(agentId: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(agentId) || null;
  }

  /**
   * Get all circuit breakers.
   */
  getAllCircuitBreakers(): CircuitBreakerState[] {
    return Array.from(this.circuitBreakers.values());
  }

  /**
   * Get the last health check result for an agent.
   */
  getHealthResult(agentId: string): HealthCheckResult | null {
    return this.healthResults.get(agentId) || null;
  }

  /**
   * Get the overall system health (from cached results).
   */
  getSystemHealth(): SystemHealth {
    const healthyCount = Array.from(this.healthResults.values()).filter((r) => r.isHealthy).length;
    const unhealthyCount = Array.from(this.healthResults.values()).filter(
      (r) => !r.isHealthy,
    ).length;
    const maintenanceCount = Array.from(this.healthResults.values()).filter(
      (r) => r.status === AgentStatus.MAINTENANCE,
    ).length;
    const openBreakers = Array.from(this.circuitBreakers.values()).filter(
      (cb) => cb.state === 'open',
    ).length;

    let status: SystemHealth['status'];
    if (unhealthyCount === 0 && openBreakers === 0) {
      status = 'healthy';
    } else if (unhealthyCount <= healthyCount) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      totalAgents: this.agentRegistry.getAgentCount(),
      healthyAgents: healthyCount,
      unhealthyAgents: unhealthyCount,
      agentsInMaintenance: maintenanceCount,
      circuitBreakersOpen: openBreakers,
      lastFullCheck: this.lastFullCheck,
      agentHealth: Object.fromEntries(this.healthResults),
    };
  }

  /**
   * Attempt to recover an unhealthy agent (auto-recovery).
   */
  async recoverAgent(agentId: string): Promise<boolean> {
    this.logger.log(`Attempting to recover agent: ${agentId}`);

    try {
      const recovered = await this.agentRegistry.recoverAgent(agentId);

      if (recovered) {
        // Reset circuit breaker on successful recovery
        const cb = this.circuitBreakers.get(agentId);
        if (cb) {
          cb.state = 'closed';
          cb.failureCount = 0;
          cb.successCount = 0;
          cb.lastStateChange = new Date();
          cb.nextRetryTime = null;
        }

        // Reset health result
        const healthResult = this.healthResults.get(agentId);
        if (healthResult) {
          healthResult.isHealthy = true;
          healthResult.consecutiveFailures = 0;
        }

        this.logger.log(`Agent ${agentId} recovered successfully`);
      }

      return recovered;
    } catch (error) {
      this.logger.error(`Failed to recover agent ${agentId}: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Attempt auto-recovery for all agents with open circuit breakers.
   */
  async recoverAllUnhealthy(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [agentId, cb] of this.circuitBreakers) {
      if (cb.state === 'open' || cb.state === 'half_open') {
        results[agentId] = await this.recoverAgent(agentId);
      }
    }

    return results;
  }

  // ─── Circuit Breaker ─────────────────────────────────────────────

  private updateCircuitBreaker(agentId: string, isHealthy: boolean): void {
    let cb = this.circuitBreakers.get(agentId);

    if (!cb) {
      cb = {
        agentId,
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
        lastStateChange: new Date(),
        nextRetryTime: null,
      };
      this.circuitBreakers.set(agentId, cb);
    }

    if (isHealthy) {
      cb.failureCount = 0;
      cb.successCount++;

      if (cb.state === 'half_open' && cb.successCount >= this.successThreshold) {
        cb.state = 'closed';
        cb.lastStateChange = new Date();
        cb.nextRetryTime = null;
        this.logger.log(`Circuit breaker CLOSED for agent ${agentId}`);

        this.eventBus
          .publish({
            type: AgentEventType.CIRCUIT_BREAKER_CLOSED,
            sourceAgentId: 'health-service',
            payload: {
              agentId,
              state: cb.state,
              failureCount: cb.failureCount,
              lastFailureTime: cb.lastFailureTime || new Date(),
            },
            priority: 1,
            correlationId: agentId,
            metadata: {},
          })
          .catch(() => {});
      }
    } else {
      cb.failureCount++;
      cb.successCount = 0;
      cb.lastFailureTime = new Date();

      if (cb.state === 'half_open') {
        cb.state = 'open';
        cb.lastStateChange = new Date();
        cb.nextRetryTime = new Date(Date.now() + this.resetTimeoutMs);
        this.logger.warn(`Circuit breaker OPENED for agent ${agentId} (half-open failure)`);
      } else if (cb.state === 'closed' && cb.failureCount >= this.failureThreshold) {
        cb.state = 'open';
        cb.lastStateChange = new Date();
        cb.nextRetryTime = new Date(Date.now() + this.resetTimeoutMs);
        this.logger.warn(
          `Circuit breaker OPENED for agent ${agentId} (${cb.failureCount} failures)`,
        );

        // Emit circuit breaker event
        this.eventBus
          .publish({
            type: AgentEventType.CIRCUIT_BREAKER_OPENED,
            sourceAgentId: 'health-service',
            payload: {
              agentId,
              state: cb.state,
              failureCount: cb.failureCount,
              lastFailureTime: cb.lastFailureTime || new Date(),
            },
            priority: 2,
            correlationId: agentId,
            metadata: {},
          })
          .catch(() => {});
      }
    }
  }

  private checkCircuitBreakerTimeouts(): void {
    const now = new Date();

    for (const [agentId, cb] of this.circuitBreakers) {
      if (cb.state === 'open' && cb.nextRetryTime && now >= cb.nextRetryTime) {
        cb.state = 'half_open';
        cb.successCount = 0;
        cb.lastStateChange = now;
        cb.nextRetryTime = null;
        this.logger.log(`Circuit breaker HALF-OPEN for agent ${agentId}`);
      }
    }
  }

  // ─── Health Check Loop ───────────────────────────────────────────

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkAllAgents();
        this.checkCircuitBreakerTimeouts();
      } catch (error) {
        this.logger.error(`Health check cycle failed: ${(error as Error).message}`);
      }
    }, this.healthCheckIntervalMs);
  }

  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval as any);
      this.healthCheckInterval = null;
    }
  }
}
