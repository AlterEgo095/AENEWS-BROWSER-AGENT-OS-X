/**
 * AENEWS Agent OS X — Phase 13: Slow Query Logger Service
 *
 * Intercepts TypeORM queries and logs those exceeding a configurable threshold.
 * Integrates with Prometheus metrics for slow query tracking.
 * Provides a REST API for querying recent slow queries.
 */

import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as promClient from 'prom-client';

export interface SlowQueryEntry {
  query: string;
  parameters?: any[];
  durationMs: number;
  timestamp: Date;
  correlationId?: string;
  schema?: string;
}

@Injectable()
export class SlowQueryLoggerService implements OnModuleDestroy {
  private readonly logger = new Logger(SlowQueryLoggerService.name);
  private readonly thresholdMs: number;
  private readonly maxEntries: number;
  private readonly recentQueries: SlowQueryEntry[] = [];
  private readonly enabled: boolean;

  // Prometheus metrics
  private readonly slowQueryCounter: promClient.Counter;
  private readonly slowQueryDuration: promClient.Histogram;

  constructor(@Optional() private readonly configService?: ConfigService) {
    this.thresholdMs = this.configService?.get<number>('performance.slowQueryThresholdMs') ?? 500;
    this.maxEntries = this.configService?.get<number>('performance.slowQueryMaxEntries') ?? 1000;
    this.enabled = this.configService?.get<string>('performance.slowQueryEnabled') !== 'false';

    // Initialize Prometheus metrics
    const registry = this.getRegistry();
    this.slowQueryCounter = new promClient.Counter({
      name: 'aenews_slow_queries_total',
      help: 'Total number of slow database queries',
      labelNames: ['schema'],
      registers: [registry],
    });

    this.slowQueryDuration = new promClient.Histogram({
      name: 'aenews_slow_query_duration_seconds',
      help: 'Duration of slow database queries in seconds',
      labelNames: ['schema'],
      buckets: [0.5, 1, 2, 5, 10, 30, 60],
      registers: [registry],
    });

    if (this.enabled) {
      this.logger.log(`Slow query logger enabled (threshold: ${this.thresholdMs}ms)`);
    }
  }

  /**
   * Record a query execution. Called from TypeORM logger or interceptor.
   */
  recordQuery(query: string, parameters: any[] | undefined, durationMs: number, schema?: string): void {
    if (!this.enabled || durationMs < this.thresholdMs) return;

    const entry: SlowQueryEntry = {
      query: this.truncateQuery(query),
      parameters: this.sanitizeParameters(parameters),
      durationMs,
      timestamp: new Date(),
      schema,
    };

    this.recentQueries.push(entry);
    if (this.recentQueries.length > this.maxEntries) {
      this.recentQueries.shift();
    }

    // Prometheus metrics
    const schemaLabel = schema || 'unknown';
    this.slowQueryCounter.labels(schemaLabel).inc();
    this.slowQueryDuration.labels(schemaLabel).observe(durationMs / 1000);

    // Log warning for very slow queries (>5x threshold)
    if (durationMs > this.thresholdMs * 5) {
      this.logger.warn(
        `Very slow query (${durationMs}ms): ${entry.query.substring(0, 200)}`,
      );
    } else {
      this.logger.debug(
        `Slow query (${durationMs}ms): ${entry.query.substring(0, 200)}`,
      );
    }
  }

  /**
   * Get recent slow queries with optional filters.
   */
  getRecentQueries(options?: {
    limit?: number;
    minDurationMs?: number;
    schema?: string;
    since?: Date;
  }): SlowQueryEntry[] {
    let filtered = [...this.recentQueries];

    if (options?.minDurationMs) {
      filtered = filtered.filter((q) => q.durationMs >= options.minDurationMs!);
    }
    if (options?.schema) {
      filtered = filtered.filter((q) => q.schema === options.schema);
    }
    if (options?.since) {
      filtered = filtered.filter((q) => q.timestamp >= options.since!);
    }

    const limit = options?.limit ?? 100;
    return filtered.slice(-limit).reverse();
  }

  /**
   * Get slow query statistics.
   */
  getStats(): {
    totalSlowQueries: number;
    averageDurationMs: number;
    maxDurationMs: number;
    p95DurationMs: number;
    bySchema: Record<string, { count: number; avgMs: number }>;
    thresholdMs: number;
  } {
    if (this.recentQueries.length === 0) {
      return {
        totalSlowQueries: 0,
        averageDurationMs: 0,
        maxDurationMs: 0,
        p95DurationMs: 0,
        bySchema: {},
        thresholdMs: this.thresholdMs,
      };
    }

    const durations = this.recentQueries.map((q) => q.durationMs).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);
    const p95Index = Math.ceil(durations.length * 0.95) - 1;

    const bySchema: Record<string, { count: number; totalMs: number; avgMs: number }> = {};
    for (const q of this.recentQueries) {
      const schema = q.schema || 'unknown';
      if (!bySchema[schema]) {
        bySchema[schema] = { count: 0, totalMs: 0, avgMs: 0 };
      }
      bySchema[schema].count++;
      bySchema[schema].totalMs += q.durationMs;
    }
    for (const s of Object.values(bySchema)) {
      s.avgMs = Math.round(s.totalMs / s.count);
    }

    return {
      totalSlowQueries: this.recentQueries.length,
      averageDurationMs: Math.round(sum / durations.length),
      maxDurationMs: durations[durations.length - 1],
      p95DurationMs: durations[p95Index],
      bySchema: Object.fromEntries(
        Object.entries(bySchema).map(([k, v]) => [k, { count: v.count, avgMs: v.avgMs }]),
      ),
      thresholdMs: this.thresholdMs,
    };
  }

  /**
   * Clear recent slow query log.
   */
  clearLog(): void {
    this.recentQueries.length = 0;
  }

  private truncateQuery(query: string): string {
    if (query.length <= 500) return query;
    return query.substring(0, 500) + '... [truncated]';
  }

  private sanitizeParameters(params: any[] | undefined): any[] | undefined {
    if (!params) return undefined;
    return params.map((p) => {
      if (typeof p === 'string' && p.length > 100) {
        return p.substring(0, 100) + '... [truncated]';
      }
      return p;
    });
  }

  private getRegistry(): promClient.Registry {
    try {
      return promClient.register;
    } catch {
      return new promClient.Registry();
    }
  }

  onModuleDestroy(): void {
    this.recentQueries.length = 0;
  }
}
