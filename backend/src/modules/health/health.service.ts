import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheckResult,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { AgentHealthIndicator } from './health.indicator';
import { InfrastructureHealthIndicator } from './infrastructure-health.indicator';

export interface HealthCheckOptions {
  includeDetailed?: boolean;
  timeout?: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly typeOrm: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly agentHealth: AgentHealthIndicator,
    @Optional() private readonly infrastructureHealth: InfrastructureHealthIndicator,
  ) {}

  /**
   * Run the full health check suite covering all system components.
   * This is the comprehensive check used by the GET /health endpoint.
   *
   * Checks: PostgreSQL, Redis, Memory (heap + RSS), Disk, Agent System,
   *         Circuit Breakers, Rate Limiters
   */
  async checkFull(_options?: HealthCheckOptions): Promise<HealthCheckResult> {
    this.logger.debug('Running full health check suite');

    const checks: Array<() => Promise<any>> = [
      () => this.checkDatabase(),
      () => this.checkRedis(),
      () => this.checkMemoryHeap(),
      () => this.checkMemoryRSS(),
      () => this.checkDisk(),
      () => this.checkAgentSystem(),
    ];

    // Add infrastructure checks (circuit breakers + rate limiters) if available
    if (this.infrastructureHealth) {
      checks.push(
        () => this.infrastructureHealth.checkCircuitBreakers('circuit_breakers'),
        () => this.infrastructureHealth.checkRateLimiters('rate_limiters'),
      );
    }

    const result = await this.health.check(checks);

    this.logger.debug(`Health check completed with status: ${result.status}`);

    return result;
  }

  /**
   * Run a lightweight readiness check for Kubernetes readiness probe.
   * Checks database, Redis, agent system readiness, and circuit breaker readiness.
   * Memory and disk checks are excluded for faster response time.
   */
  async checkReadiness(): Promise<HealthCheckResult> {
    this.logger.debug('Running readiness health check');

    const checks: Array<() => Promise<any>> = [
      () => this.checkDatabase(),
      () => this.checkRedis(),
      () => this.checkAgentSystem(),
    ];

    // Add circuit breaker readiness check
    if (this.infrastructureHealth) {
      checks.push(
        () => this.infrastructureHealth.checkReadiness('system_readiness'),
      );
    }

    return this.health.check(checks);
  }

  /**
   * Run a liveness check — basic process and memory check.
   * Used for Kubernetes liveness probe to verify the process is responsive
   * and not suffering from memory leaks.
   */
  async checkLiveness(): Promise<HealthCheckResult> {
    this.logger.debug('Running liveness health check');

    return this.health.check([
      () => this.checkMemoryHeap(),
      () => this.checkMemoryRSS(),
    ]);
  }

  /**
   * Check PostgreSQL database connectivity via TypeORM.
   * Uses a 5-second timeout to avoid long-hanging connections.
   */
  private async checkDatabase() {
    return this.typeOrm.pingCheck('database', {
      timeout: 5000,
    });
  }

  /**
   * Check Redis connectivity using a live PING command.
   * Also retrieves server metadata for diagnostic purposes.
   */
  private async checkRedis() {
    return this.agentHealth.checkRedisConnectivity('redis');
  }

  /**
   * Check heap memory usage.
   * Triggers a degraded status when heap exceeds 150 MB.
   * This threshold is suitable for a Node.js process running
   * multiple agent workers with moderate concurrent load.
   */
  private async checkMemoryHeap() {
    const heapThreshold = 150 * 1024 * 1024; // 150 MB
    return this.memory.checkHeap('memory_heap', heapThreshold);
  }

  /**
   * Check RSS (Resident Set Size) memory usage.
   * Triggers a degraded status when RSS exceeds 300 MB.
   * RSS includes heap, code segments, and shared libraries —
   * a higher threshold accounts for V8 overhead and native addons.
   */
  private async checkMemoryRSS() {
    const rssThreshold = 300 * 1024 * 1024; // 300 MB
    return this.memory.checkRSS('memory_rss', rssThreshold);
  }

  /**
   * Check available disk space on the root partition.
   * Triggers a degraded status when disk usage exceeds 80%.
   * Critical for agents that write logs, artifacts, and temporary files.
   */
  private async checkDisk() {
    return this.disk.checkStorage('disk', {
      thresholdPercent: 0.8,
      path: '/',
    });
  }

  /**
   * Check the Agent system readiness.
   * The agent system is healthy when both the agent registry
   * is initialized and the queue system is connected.
   */
  private async checkAgentSystem() {
    return this.agentHealth.isAgentSystemReady('agent_system');
  }
}
