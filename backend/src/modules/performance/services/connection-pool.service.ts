/**
 * AENEWS Agent OS X — Phase 13: Connection Pool Service
 *
 * Manages and monitors all connection pools (PostgreSQL, Redis, Neo4j, HTTP).
 * Provides:
 *   - Pool health monitoring
 *   - Pool size recommendations
 *   - Connection leak detection
 *   - Prometheus metrics for each pool
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as promClient from 'prom-client';

export interface PoolStats {
  name: string;
  active: number;
  idle: number;
  max: number;
  waiting: number;
  totalAcquired: number;
  totalReleased: number;
  totalTimeouts: number;
}

@Injectable()
export class ConnectionPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectionPoolService.name);
  private readonly enabled: boolean;
  private monitoringTimer: NodeJS.Timer | null = null;

  // Pool tracking
  private readonly pools = new Map<string, PoolStats>();

  // Prometheus metrics
  private readonly poolActiveGauge: promClient.Gauge;
  private readonly poolIdleGauge: promClient.Gauge;
  private readonly poolWaitingGauge: promClient.Gauge;
  private readonly poolAcquiredCounter: promClient.Counter;
  private readonly poolReleasedCounter: promClient.Counter;
  private readonly poolTimeoutCounter: promClient.Counter;

  constructor(@Optional() private readonly configService?: ConfigService) {
    this.enabled = this.configService?.get<string>('performance.poolMonitoringEnabled') !== 'false';

    const registry = this.getRegistry();

    this.poolActiveGauge = new promClient.Gauge({
      name: 'aenews_pool_active_connections',
      help: 'Number of active connections in pool',
      labelNames: ['pool'],
      registers: [registry],
    });

    this.poolIdleGauge = new promClient.Gauge({
      name: 'aenews_pool_idle_connections',
      help: 'Number of idle connections in pool',
      labelNames: ['pool'],
      registers: [registry],
    });

    this.poolWaitingGauge = new promClient.Gauge({
      name: 'aenews_pool_waiting_connections',
      help: 'Number of connections waiting for checkout',
      labelNames: ['pool'],
      registers: [registry],
    });

    this.poolAcquiredCounter = new promClient.Counter({
      name: 'aenews_pool_acquired_total',
      help: 'Total number of connections acquired from pool',
      labelNames: ['pool'],
      registers: [registry],
    });

    this.poolReleasedCounter = new promClient.Counter({
      name: 'aenews_pool_released_total',
      help: 'Total number of connections released back to pool',
      labelNames: ['pool'],
      registers: [registry],
    });

    this.poolTimeoutCounter = new promClient.Counter({
      name: 'aenews_pool_timeout_total',
      help: 'Total number of connection checkout timeouts',
      labelNames: ['pool'],
      registers: [registry],
    });
  }

  onModuleInit(): void {
    if (!this.enabled) return;

    // Initialize pool configurations
    this.initializePoolConfigs();

    // Start monitoring every 30 seconds
    this.monitoringTimer = setInterval(() => {
      this.monitor();
    }, 30000) as unknown as NodeJS.Timer;

    if (this.monitoringTimer && 'unref' in (this.monitoringTimer as any)) {
      (this.monitoringTimer as any).unref();
    }

    this.logger.log('Connection pool monitoring enabled');
  }

  onModuleDestroy(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer as unknown as number);
      this.monitoringTimer = null;
    }
  }

  /**
   * Register a pool for monitoring.
   */
  registerPool(name: string, maxConnections: number): void {
    this.pools.set(name, {
      name,
      active: 0,
      idle: maxConnections,
      max: maxConnections,
      waiting: 0,
      totalAcquired: 0,
      totalReleased: 0,
      totalTimeouts: 0,
    });
    this.logger.log(`Registered pool "${name}" with max ${maxConnections} connections`);
  }

  /**
   * Record a connection acquisition.
   */
  acquire(name: string): void {
    const pool = this.pools.get(name);
    if (!pool) return;

    pool.active++;
    pool.idle = Math.max(0, pool.idle - 1);
    pool.totalAcquired++;

    this.poolAcquiredCounter.labels(name).inc();
    this.updateGauges(name, pool);
  }

  /**
   * Record a connection release.
   */
  release(name: string): void {
    const pool = this.pools.get(name);
    if (!pool) return;

    pool.active = Math.max(0, pool.active - 1);
    pool.idle++;
    pool.totalReleased++;

    this.poolReleasedCounter.labels(name).inc();
    this.updateGauges(name, pool);
  }

  /**
   * Record a connection timeout.
   */
  timeout(name: string): void {
    const pool = this.pools.get(name);
    if (!pool) return;

    pool.waiting = Math.max(0, pool.waiting - 1);
    pool.totalTimeouts++;

    this.poolTimeoutCounter.labels(name).inc();
  }

  /**
   * Get all pool statistics.
   */
  getPoolStats(): PoolStats[] {
    return Array.from(this.pools.values());
  }

  /**
   * Get pool configuration recommendations.
   */
  getRecommendations(): Array<{ pool: string; recommendation: string; severity: 'info' | 'warning' | 'critical' }> {
    const recommendations: Array<{ pool: string; recommendation: string; severity: 'info' | 'warning' | 'critical' }> = [];

    for (const pool of this.pools.values()) {
      const utilization = pool.active / pool.max;

      if (utilization > 0.9) {
        recommendations.push({
          pool: pool.name,
          recommendation: `Pool utilization at ${(utilization * 100).toFixed(0)}%. Consider increasing max connections from ${pool.max} to ${Math.ceil(pool.max * 1.5)}.`,
          severity: 'critical',
        });
      } else if (utilization > 0.75) {
        recommendations.push({
          pool: pool.name,
          recommendation: `Pool utilization at ${(utilization * 100).toFixed(0)}%. Monitor for saturation.`,
          severity: 'warning',
        });
      }

      if (pool.waiting > 0) {
        recommendations.push({
          pool: pool.name,
          recommendation: `${pool.waiting} connections waiting. Pool may be undersized.`,
          severity: 'warning',
        });
      }

      if (pool.totalTimeouts > 10) {
        recommendations.push({
          pool: pool.name,
          recommendation: `${pool.totalTimeouts} connection timeouts detected. Increase pool size or connection timeout.`,
          severity: 'critical',
        });
      }

      // Connection leak detection: acquired >> released
      if (pool.totalAcquired > pool.totalReleased + 50) {
        recommendations.push({
          pool: pool.name,
          recommendation: `Connection leak suspected: ${pool.totalAcquired} acquired vs ${pool.totalReleased} released.`,
          severity: 'critical',
        });
      }
    }

    return recommendations;
  }

  /**
   * Calculate optimal pool size based on Little's Law:
   * pool_size = (avg_query_time * target_qps) / (1 - safety_margin)
   */
  calculateOptimalPoolSize(
    avgQueryTimeMs: number,
    targetQps: number,
    safetyMargin: number = 0.2,
  ): number {
    const connections = Math.ceil((avgQueryTimeMs / 1000) * targetQps);
    return Math.ceil(connections / (1 - safetyMargin));
  }

  // ─── Private Methods ────────────────────────────────────────

  private initializePoolConfigs(): void {
    // PostgreSQL pool
    const pgMax = this.configService?.get<number>('database.poolMax') ?? 20;
    this.registerPool('postgresql', pgMax);

    // Redis pool
    const redisMax = this.configService?.get<number>('redis.poolMax') ?? 10;
    this.registerPool('redis', redisMax);

    // Neo4j pool
    const neo4jMax = this.configService?.get<number>('neo4j.poolMax') ?? 10;
    this.registerPool('neo4j', neo4jMax);

    // HTTP Agent pool (for external API calls)
    const httpMax = this.configService?.get<number>('performance.httpPoolMax') ?? 50;
    this.registerPool('http-agent', httpMax);
  }

  private monitor(): void {
    for (const [name, pool] of this.pools) {
      this.updateGauges(name, pool);

      // Log warnings for saturated pools
      const utilization = pool.active / pool.max;
      if (utilization > 0.9) {
        this.logger.warn(
          `Pool "${name}" at ${(utilization * 100).toFixed(0)}% capacity (${pool.active}/${pool.max})`,
        );
      }
    }
  }

  private updateGauges(name: string, pool: PoolStats): void {
    this.poolActiveGauge.labels(name).set(pool.active);
    this.poolIdleGauge.labels(name).set(pool.idle);
    this.poolWaitingGauge.labels(name).set(pool.waiting);
  }

  private getRegistry(): promClient.Registry {
    try {
      return promClient.register;
    } catch {
      return new promClient.Registry();
    }
  }
}
