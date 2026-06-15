/**
 * AENEWS Agent OS X — Phase 13: Performance Profiling Service
 *
 * Real-time performance profiling and optimization recommendations.
 * Tracks CPU, memory, event loop lag, and custom spans.
 * Provides APM-like functionality without external dependencies.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as promClient from 'prom-client';
import * as v8 from 'v8';
import * as os from 'os';

// ─── Types ────────────────────────────────────────────────────

interface PerformanceSpan {
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  metadata?: Record<string, any>;
  status: 'running' | 'completed' | 'failed';
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
}

interface EventLoopSnapshot {
  timestamp: number;
  lagMs: number;
}

export interface PerformanceReport {
  timestamp: string;
  uptime: number;
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
    external: string;
    heapUtilization: string;
    gcPauseEstimate: string;
  };
  cpu: {
    userMs: number;
    systemMs: number;
    utilizationPercent: string;
  };
  eventLoop: {
    currentLagMs: number;
    p50LagMs: number;
    p95LagMsMs: number;
    p99LagMs: number;
  };
  activeSpans: number;
  topSlowSpans: Array<{ name: string; avgMs: number; count: number }>;
  recommendations: string[];
}

@Injectable()
export class PerformanceProfilingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PerformanceProfilingService.name);
  private readonly enabled: boolean;
  private readonly samplingIntervalMs: number;
  private samplingTimer: NodeJS.Timer | null = null;

  // Span tracking
  private readonly activeSpans = new Map<string, PerformanceSpan>();
  private readonly completedSpans: Array<PerformanceSpan & { durationMs: number }> = [];
  private readonly maxCompletedSpans = 5000;

  // Time series for monitoring
  private readonly memoryHistory: MemorySnapshot[] = [];
  private readonly eventLoopHistory: EventLoopSnapshot[] = [];
  private readonly maxHistorySize = 3600; // 1 hour at 1s intervals

  // CPU tracking
  private lastCpuUsage = process.cpuUsage();
  private lastCpuTimestamp = Date.now();

  // Event loop lag detection
  private eventLoopLag = 0;

  // Prometheus metrics
  private readonly eventLoopLagGauge: promClient.Gauge;
  private readonly heapUsedGauge: promClient.Gauge;
  private readonly activeSpansGauge: promClient.Gauge;
  private readonly spanDuration: promClient.Histogram;

  constructor(@Optional() private readonly configService?: ConfigService) {
    this.enabled = this.configService?.get<string>('performance.profilingEnabled') !== 'false';
    this.samplingIntervalMs =
      this.configService?.get<number>('performance.profilingIntervalMs') ?? 10000; // 10s default

    const registry = this.getRegistry();

    this.eventLoopLagGauge = new promClient.Gauge({
      name: 'aenews_event_loop_lag_ms',
      help: 'Event loop lag in milliseconds',
      registers: [registry],
    });

    this.heapUsedGauge = new promClient.Gauge({
      name: 'aenews_heap_used_bytes',
      help: 'Heap memory used in bytes',
      registers: [registry],
    });

    this.activeSpansGauge = new promClient.Gauge({
      name: 'aenews_active_profiling_spans',
      help: 'Number of currently active profiling spans',
      registers: [registry],
    });

    this.spanDuration = new promClient.Histogram({
      name: 'aenews_span_duration_seconds',
      help: 'Duration of profiling spans in seconds',
      labelNames: ['name', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [registry],
    });

    if (this.enabled) {
      this.logger.log(`Performance profiling enabled (sampling: ${this.samplingIntervalMs}ms)`);
    }
  }

  onModuleInit(): void {
    if (!this.enabled) return;

    // Start periodic sampling
    this.samplingTimer = setInterval(() => {
      this.sampleMemory();
      this.sampleEventLoop();
      this.updatePrometheusMetrics();
    }, this.samplingIntervalMs) as unknown as NodeJS.Timer;

    // Don't prevent process exit
    if (this.samplingTimer && 'unref' in (this.samplingTimer as any)) {
      (this.samplingTimer as any).unref();
    }
  }

  onModuleDestroy(): void {
    if (this.samplingTimer) {
      clearInterval(this.samplingTimer as unknown as number);
      this.samplingTimer = null;
    }
  }

  // ─── Span API ───────────────────────────────────────────────

  /**
   * Start a performance span. Returns span ID for ending.
   */
  startSpan(name: string, metadata?: Record<string, any>): string {
    const id = `${name}:${Date.now()}:${Math.random().toString(36).substring(2, 8)}`;
    this.activeSpans.set(id, {
      name,
      startTime: performance.now(),
      metadata,
      status: 'running',
    });
    return id;
  }

  /**
   * End a performance span.
   */
  endSpan(spanId: string, status: 'completed' | 'failed' = 'completed'): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTime = performance.now();
    span.durationMs = span.endTime - span.startTime;
    span.status = status;

    // Record in Prometheus
    this.spanDuration.labels(span.name, status).observe(span.durationMs / 1000);

    // Store completed span
    this.completedSpans.push(span as any);
    if (this.completedSpans.length > this.maxCompletedSpans) {
      this.completedSpans.shift();
    }

    this.activeSpans.delete(spanId);

    // Log very slow spans
    if (span.durationMs > 30000) {
      this.logger.warn(`Slow span: ${span.name} took ${span.durationMs.toFixed(0)}ms`);
    }
  }

  /**
   * Convenience: measure async function execution.
   */
  async measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const spanId = this.startSpan(name, metadata);
    try {
      const result = await fn();
      this.endSpan(spanId, 'completed');
      return result;
    } catch (error) {
      this.endSpan(spanId, 'failed');
      throw error;
    }
  }

  // ─── Report API ─────────────────────────────────────────────

  /**
   * Generate a comprehensive performance report.
   */
  getReport(): PerformanceReport {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage(this.lastCpuUsage);
    const elapsed = (Date.now() - this.lastCpuTimestamp) / 1000;

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: this.formatBytes(mem.heapUsed),
        heapTotal: this.formatBytes(mem.heapTotal),
        rss: this.formatBytes(mem.rss),
        external: this.formatBytes(mem.external),
        heapUtilization: `${((mem.heapUsed / mem.heapTotal) * 100).toFixed(1)}%`,
        gcPauseEstimate: this.estimateGcPause(),
      },
      cpu: {
        userMs: cpu.user,
        systemMs: cpu.system,
        utilizationPercent: ((cpu.user + cpu.system) / (elapsed * 1000) * 100).toFixed(1),
      },
      eventLoop: {
        currentLagMs: this.eventLoopLag,
        p50LagMs: this.getEventLoopPercentile(50),
        p95LagMsMs: this.getEventLoopPercentile(95),
        p99LagMs: this.getEventLoopPercentile(99),
      },
      activeSpans: this.activeSpans.size,
      topSlowSpans: this.getTopSlowSpans(10),
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Get memory statistics with heap details.
   */
  getMemoryStats(): {
    current: MemorySnapshot;
    heapStatistics: Record<string, number>;
    trend: 'increasing' | 'stable' | 'decreasing';
  } {
    const mem = process.memoryUsage();
    const current: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      rss: mem.rss,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
    };

    const heapStats = v8.getHeapStatistics() as unknown as Record<string, number>;

    // Determine memory trend over last 10 samples
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (this.memoryHistory.length >= 10) {
      const recent = this.memoryHistory.slice(-10);
      const firstHalf = recent.slice(0, 5).reduce((s, m) => s + m.heapUsed, 0) / 5;
      const secondHalf = recent.slice(5).reduce((s, m) => s + m.heapUsed, 0) / 5;
      const change = (secondHalf - firstHalf) / firstHalf;
      if (change > 0.1) trend = 'increasing';
      else if (change < -0.1) trend = 'decreasing';
    }

    return { current, heapStatistics: heapStats, trend };
  }

  /**
   * Get active spans snapshot.
   */
  getActiveSpans(): Array<{ name: string; durationMs: number; metadata?: Record<string, any> }> {
    const now = performance.now();
    return Array.from(this.activeSpans.values()).map((span) => ({
      name: span.name,
      durationMs: now - span.startTime,
      metadata: span.metadata,
    }));
  }

  /**
   * Get heap snapshot (for memory leak debugging).
   */
  takeHeapSnapshot(): { nodeCount: number; edgeCount: number; sizeBytes: number } {
    const stats = v8.getHeapStatistics();
    return {
      nodeCount: 0, // v8 doesn't expose this directly
      edgeCount: 0,
      sizeBytes: stats.used_heap_size,
    };
  }

  // ─── Private Methods ────────────────────────────────────────

  private sampleMemory(): void {
    const mem = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      rss: mem.rss,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
    };

    this.memoryHistory.push(snapshot);
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // Alert on memory pressure
    const utilization = mem.heapUsed / mem.heapTotal;
    if (utilization > 0.9) {
      this.logger.warn(
        `High heap utilization: ${(utilization * 100).toFixed(1)}% (${this.formatBytes(mem.heapUsed)} / ${this.formatBytes(mem.heapTotal)})`,
      );
    }
  }

  private sampleEventLoop(): void {
    const start = performance.now();
    setImmediate(() => {
      this.eventLoopLag = performance.now() - start;
      this.eventLoopHistory.push({
        timestamp: Date.now(),
        lagMs: this.eventLoopLag,
      });
      if (this.eventLoopHistory.length > this.maxHistorySize) {
        this.eventLoopHistory.shift();
      }
    });
  }

  private updatePrometheusMetrics(): void {
    const mem = process.memoryUsage();
    this.heapUsedGauge.set(mem.heapUsed);
    this.eventLoopLagGauge.set(this.eventLoopLag);
    this.activeSpansGauge.set(this.activeSpans.size);
  }

  private getEventLoopPercentile(percentile: number): number {
    if (this.eventLoopHistory.length === 0) return 0;
    const sorted = this.eventLoopHistory
      .map((s) => s.lagMs)
      .sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  }

  private getTopSlowSpans(limit: number): Array<{ name: string; avgMs: number; count: number }> {
    const byName = new Map<string, { totalMs: number; count: number }>();
    for (const span of this.completedSpans) {
      const existing = byName.get(span.name) || { totalMs: 0, count: 0 };
      existing.totalMs += span.durationMs;
      existing.count++;
      byName.set(span.name, existing);
    }

    return Array.from(byName.entries())
      .map(([name, { totalMs, count }]) => ({ name, avgMs: totalMs / count, count }))
      .sort((a, b) => b.avgMs - a.avgMs)
      .slice(0, limit);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const mem = process.memoryUsage();
    const heapUtil = mem.heapUsed / mem.heapTotal;

    if (heapUtil > 0.85) {
      recommendations.push(
        'Heap utilization >85%. Consider increasing --max-old-space-size or optimizing memory-heavy services.',
      );
    }

    if (this.eventLoopLag > 100) {
      recommendations.push(
        `Event loop lag ${this.eventLoopLag.toFixed(0)}ms >100ms. Check for blocking operations or heavy synchronous work.`,
      );
    }

    if (this.activeSpans.size > 100) {
      recommendations.push(
        `${this.activeSpans.size} active spans. Possible span leak — ensure all spans are ended.`,
      );
    }

    // Check for memory leak pattern
    if (this.memoryHistory.length >= 20) {
      const recent = this.memoryHistory.slice(-20);
      const isGrowing = recent.every((m, i) =>
        i === 0 || m.heapUsed >= recent[i - 1].heapUsed * 0.99,
      );
      if (isGrowing) {
        recommendations.push(
          'Memory appears to be monotonically increasing over last 20 samples. Possible memory leak.',
        );
      }
    }

    const avgElLag = this.getEventLoopPercentile(50);
    if (avgElLag > 50) {
      recommendations.push(
        `Median event loop lag ${avgElLag.toFixed(0)}ms is high. Consider offloading CPU-intensive work to worker threads.`,
      );
    }

    const slowSpans = this.getTopSlowSpans(3);
    for (const span of slowSpans) {
      if (span.avgMs > 10000) {
        recommendations.push(
          `Span "${span.name}" averages ${span.avgMs.toFixed(0)}ms across ${span.count} calls. Consider caching or async optimization.`,
        );
      }
    }

    return recommendations;
  }

  private estimateGcPause(): string {
    // Rough estimate based on heap size changes
    if (this.memoryHistory.length < 2) return '<unknown>';
    const recent = this.memoryHistory.slice(-10);
    const maxDrop = Math.max(
      ...recent.map((m, i) =>
        i > 0 ? recent[i - 1].heapUsed - m.heapUsed : 0,
      ),
    );
    if (maxDrop <= 0) return '<none detected>';
    // GC pause is roughly proportional to freed memory
    const estimatedPauseMs = Math.min(maxDrop / 1_000_000, 500); // Cap at 500ms
    return `~${estimatedPauseMs.toFixed(0)}ms`;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }

  private getRegistry(): promClient.Registry {
    try {
      return promClient.register;
    } catch {
      return new promClient.Registry();
    }
  }
}
