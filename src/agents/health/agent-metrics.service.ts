/**
 * AENEWS Agent OS X - Agent Metrics Service
 * Collects, aggregates, and reports metrics for all agents.
 * Provides execution time tracking, memory usage monitoring,
 * CPU usage estimation, request/response counting, error rate calculation,
 * and metrics aggregation by cluster.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AgentMetrics, AgentStatus, AgentCluster } from '../interfaces/agent.interface';
import { AgentRegistryService } from '../registry/agent-registry.service';

// ─── Metric Types ─────────────────────────────────────────────────
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
}

// ─── Metric Data Point ────────────────────────────────────────────
export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  labels: Record<string, string>;
}

// ─── Metric Series ────────────────────────────────────────────────
export interface MetricSeries {
  name: string;
  type: MetricType;
  description: string;
  unit: string;
  dataPoints: MetricDataPoint[];
}

// ─── Agent Metrics Summary ────────────────────────────────────────
export interface AgentMetricsSummary {
  agentId: string;
  cluster: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTimeMs: number;
  maxExecutionTimeMs: number;
  minExecutionTimeMs: number;
  averageMemoryUsedMb: number;
  peakMemoryUsedMb: number;
  totalCpuUsage: number;
  uptimeMs: number;
  successRate: number;
  errorRate: number;
  throughputPerMinute: number;
  lastExecutionAt: Date | null;
  p50ExecutionTimeMs: number;
  p95ExecutionTimeMs: number;
  p99ExecutionTimeMs: number;
}

// ─── Cluster Metrics Summary ──────────────────────────────────────
export interface ClusterMetricsSummary {
  cluster: AgentCluster;
  totalAgents: number;
  activeAgents: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTimeMs: number;
  errorRate: number;
  throughputPerMinute: number;
  totalMemoryUsedMb: number;
}

// ─── System Metrics Summary ───────────────────────────────────────
export interface SystemMetricsSummary {
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  errorAgents: number;
  totalExecutions: number;
  totalSuccessfulExecutions: number;
  totalFailedExecutions: number;
  overallSuccessRate: number;
  overallErrorRate: number;
  averageExecutionTimeMs: number;
  totalMemoryUsedMb: number;
  totalCpuUsagePercent: number;
  systemThroughputPerMinute: number;
  clusterMetrics: Record<string, ClusterMetricsSummary>;
  timestamp: Date;
}

@Injectable()
export class AgentMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentMetricsService.name);
  private metricsCollectionInterval: NodeJS.Timer | null = null;
  private readonly agentExecutionTimes: Map<string, number[]> = new Map();
  private readonly agentMemoryUsage: Map<string, number[]> = new Map();
  private readonly agentCpuUsage: Map<string, number[]> = new Map();
  private readonly counters: Map<string, number> = new Map();
  private readonly gauges: Map<string, number> = new Map();
  private readonly timeSeries: Map<string, MetricDataPoint[]> = new Map();
  private static readonly MAX_DATA_POINTS = 1440; // 24 hours at 1-minute intervals
  private static readonly COLLECTION_INTERVAL_MS = 60000;

  constructor(private readonly agentRegistry: AgentRegistryService) {}

  onModuleInit(): void {
    this.startMetricsCollection();
    this.logger.log('Agent Metrics service initialized');
  }

  onModuleDestroy(): void {
    this.stopMetricsCollection();
  }

  /**
   * Record an execution metric for an agent.
   */
  recordExecution(
    agentId: string,
    executionTimeMs: number,
    success: boolean,
    metrics?: AgentMetrics,
  ): void {
    // Increment counters
    this.incrementCounter(`agent:${agentId}:total_executions`);
    if (success) {
      this.incrementCounter(`agent:${agentId}:successful_executions`);
    } else {
      this.incrementCounter(`agent:${agentId}:failed_executions`);
    }

    // Record execution time
    const times = this.agentExecutionTimes.get(agentId) || [];
    times.push(executionTimeMs);
    if (times.length > 1000) times.shift();
    this.agentExecutionTimes.set(agentId, times);

    // Record memory usage if available
    if (metrics?.memoryUsedMb) {
      const memoryUsage = this.agentMemoryUsage.get(agentId) || [];
      memoryUsage.push(metrics.memoryUsedMb);
      if (memoryUsage.length > 1000) memoryUsage.shift();
      this.agentMemoryUsage.set(agentId, memoryUsage);
    }

    // Record CPU usage if available
    if (metrics?.cpuUsagePercent) {
      const cpuUsage = this.agentCpuUsage.get(agentId) || [];
      cpuUsage.push(metrics.cpuUsagePercent);
      if (cpuUsage.length > 1000) cpuUsage.shift();
      this.agentCpuUsage.set(agentId, cpuUsage);
    }

    // Record time series
    this.addTimeSeriesPoint(`agent:${agentId}:execution_time`, executionTimeMs, {
      agentId,
      status: success ? 'success' : 'failure',
    });

    if (metrics?.memoryUsedMb) {
      this.addTimeSeriesPoint(`agent:${agentId}:memory_usage`, metrics.memoryUsedMb, { agentId });
    }

    if (metrics?.cpuUsagePercent) {
      this.addTimeSeriesPoint(`agent:${agentId}:cpu_usage`, metrics.cpuUsagePercent, { agentId });
    }
  }

  /**
   * Get metrics summary for a specific agent.
   */
  getAgentMetrics(agentId: string): AgentMetricsSummary {
    const agent = this.agentRegistry.getAgent(agentId);
    const state = agent?.getState();
    const config = agent?.getConfig();

    const totalExecutions = this.getCounter(`agent:${agentId}:total_executions`);
    const successfulExecutions = this.getCounter(`agent:${agentId}:successful_executions`);
    const failedExecutions = this.getCounter(`agent:${agentId}:failed_executions`);
    const executionTimes = this.agentExecutionTimes.get(agentId) || [];
    const memoryUsage = this.agentMemoryUsage.get(agentId) || [];
    const cpuUsage = this.agentCpuUsage.get(agentId) || [];

    const avgExecTime =
      executionTimes.length > 0
        ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
        : 0;

    const sortedTimes = [...executionTimes].sort((a, b) => a - b);

    // Calculate CPU usage estimate
    const totalCpuUsage = cpuUsage.length > 0 ? cpuUsage.reduce((a, b) => a + b, 0) : 0;

    // Calculate error rate
    const errorRate = totalExecutions > 0 ? failedExecutions / totalExecutions : 0;

    return {
      agentId,
      cluster: config?.cluster || 'unknown',
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTimeMs: Math.round(avgExecTime),
      maxExecutionTimeMs: sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0,
      minExecutionTimeMs: sortedTimes.length > 0 ? sortedTimes[0] : 0,
      averageMemoryUsedMb:
        memoryUsage.length > 0
          ? Math.round((memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length) * 100) / 100
          : 0,
      peakMemoryUsedMb: memoryUsage.length > 0 ? Math.max(...memoryUsage) : 0,
      totalCpuUsage: Math.round(totalCpuUsage * 100) / 100,
      uptimeMs: state?.health.uptimeMs || 0,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      errorRate,
      throughputPerMinute: this.calculateThroughput(agentId),
      lastExecutionAt: executionTimes.length > 0 ? new Date() : null,
      p50ExecutionTimeMs: this.percentile(sortedTimes, 50),
      p95ExecutionTimeMs: this.percentile(sortedTimes, 95),
      p99ExecutionTimeMs: this.percentile(sortedTimes, 99),
    };
  }

  /**
   * Get metrics aggregated by cluster.
   */
  getClusterMetrics(cluster: AgentCluster): ClusterMetricsSummary {
    const agents = this.agentRegistry.getByCluster(cluster);

    let totalExecutions = 0;
    let successfulExecutions = 0;
    let failedExecutions = 0;
    let totalExecTime = 0;
    let totalMemory = 0;
    let execCount = 0;
    let activeAgents = 0;

    for (const agent of agents) {
      const id = agent.getConfig().id;
      const agentMetrics = this.getAgentMetrics(id);

      totalExecutions += agentMetrics.totalExecutions;
      successfulExecutions += agentMetrics.successfulExecutions;
      failedExecutions += agentMetrics.failedExecutions;
      totalExecTime += agentMetrics.averageExecutionTimeMs * agentMetrics.totalExecutions;
      totalMemory += agentMetrics.averageMemoryUsedMb;
      if (agentMetrics.totalExecutions > 0) execCount++;

      if (agent.getStatus() === AgentStatus.RUNNING) {
        activeAgents++;
      }
    }

    const errorRate = totalExecutions > 0 ? failedExecutions / totalExecutions : 0;

    return {
      cluster,
      totalAgents: agents.length,
      activeAgents,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTimeMs: execCount > 0 ? Math.round(totalExecTime / totalExecutions) : 0,
      errorRate,
      throughputPerMinute: this.calculateClusterThroughput(cluster),
      totalMemoryUsedMb: Math.round(totalMemory * 100) / 100,
    };
  }

  /**
   * Get system-wide metrics summary with per-cluster breakdown.
   */
  getSystemMetrics(): SystemMetricsSummary {
    const agents = this.agentRegistry.getAllAgents();
    const states = agents.map((a) => a.getState());

    const activeAgents = states.filter((s) => s.status === AgentStatus.RUNNING).length;
    const idleAgents = states.filter((s) => s.status === AgentStatus.IDLE).length;
    const errorAgents = states.filter((s) => s.status === AgentStatus.ERROR).length;

    let totalExecutions = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalExecTime = 0;
    let totalMemory = 0;
    let totalCpu = 0;
    let execCount = 0;

    for (const agent of agents) {
      const id = agent.getConfig().id;
      const agentMetrics = this.getAgentMetrics(id);
      totalExecutions += agentMetrics.totalExecutions;
      totalSuccessful += agentMetrics.successfulExecutions;
      totalFailed += agentMetrics.failedExecutions;
      totalExecTime += agentMetrics.averageExecutionTimeMs * agentMetrics.totalExecutions;
      totalMemory += agentMetrics.averageMemoryUsedMb;
      totalCpu += agentMetrics.totalCpuUsage;
      if (agentMetrics.totalExecutions > 0) execCount++;
    }

    // Build cluster metrics
    const clusterMetrics: Record<string, ClusterMetricsSummary> = {};
    for (const cluster of Object.values(AgentCluster)) {
      clusterMetrics[cluster] = this.getClusterMetrics(cluster);
    }

    return {
      totalAgents: agents.length,
      activeAgents,
      idleAgents,
      errorAgents,
      totalExecutions,
      totalSuccessfulExecutions: totalSuccessful,
      totalFailedExecutions: totalFailed,
      overallSuccessRate: totalExecutions > 0 ? totalSuccessful / totalExecutions : 0,
      overallErrorRate: totalExecutions > 0 ? totalFailed / totalExecutions : 0,
      averageExecutionTimeMs: execCount > 0 ? Math.round(totalExecTime / totalExecutions) : 0,
      totalMemoryUsedMb: Math.round(totalMemory * 100) / 100,
      totalCpuUsagePercent: Math.round(totalCpu * 100) / 100,
      systemThroughputPerMinute: this.calculateSystemThroughput(),
      clusterMetrics,
      timestamp: new Date(),
    };
  }

  /**
   * Get a time series for a metric.
   */
  getTimeSeries(name: string, limit?: number): MetricDataPoint[] {
    const data = this.timeSeries.get(name) || [];
    return limit ? data.slice(-limit) : data;
  }

  /**
   * Get all available metric names.
   */
  getMetricNames(): string[] {
    return Array.from(this.timeSeries.keys());
  }

  /**
   * Set a gauge value.
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.gauges.set(name, value);
    this.addTimeSeriesPoint(name, value, labels || {});
  }

  /**
   * Increment a counter.
   */
  incrementCounter(name: string, value?: number): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + (value || 1));
  }

  /**
   * Get a counter value.
   */
  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  /**
   * Get a gauge value.
   */
  getGauge(name: string): number {
    return this.gauges.get(name) || 0;
  }

  /**
   * Calculate current error rate for an agent.
   */
  getErrorRate(agentId: string): number {
    const total = this.getCounter(`agent:${agentId}:total_executions`);
    const failed = this.getCounter(`agent:${agentId}:failed_executions`);
    return total > 0 ? failed / total : 0;
  }

  /**
   * Calculate current success rate for an agent.
   */
  getSuccessRate(agentId: string): number {
    const total = this.getCounter(`agent:${agentId}:total_executions`);
    const successful = this.getCounter(`agent:${agentId}:successful_executions`);
    return total > 0 ? successful / total : 0;
  }

  // ─── Private Methods ─────────────────────────────────────────────

  private addTimeSeriesPoint(name: string, value: number, labels: Record<string, string>): void {
    if (!this.timeSeries.has(name)) {
      this.timeSeries.set(name, []);
    }

    const series = this.timeSeries.get(name)!;
    series.push({
      timestamp: new Date(),
      value,
      labels,
    });

    // Enforce max data points
    if (series.length > AgentMetricsService.MAX_DATA_POINTS) {
      series.shift();
    }
  }

  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  private calculateThroughput(agentId: string): number {
    const series = this.timeSeries.get(`agent:${agentId}:execution_time`);
    if (!series || series.length < 2) return 0;

    const oneMinuteAgo = Date.now() - 60000;
    const recentPoints = series.filter((p) => p.timestamp.getTime() > oneMinuteAgo);

    return recentPoints.length;
  }

  private calculateClusterThroughput(cluster: AgentCluster): number {
    const agents = this.agentRegistry.getByCluster(cluster);
    let total = 0;
    for (const agent of agents) {
      total += this.calculateThroughput(agent.getConfig().id);
    }
    return total;
  }

  private calculateSystemThroughput(): number {
    let total = 0;
    for (const agent of this.agentRegistry.getAllAgents()) {
      total += this.calculateThroughput(agent.getConfig().id);
    }
    return total;
  }

  private collectAgentMetrics(): void {
    for (const agent of this.agentRegistry.getAllAgents()) {
      const config = agent.getConfig();
      const state = agent.getState();

      // Record status as gauge
      const statusValue =
        {
          [AgentStatus.IDLE]: 0,
          [AgentStatus.INITIALIZING]: 1,
          [AgentStatus.RUNNING]: 2,
          [AgentStatus.PAUSED]: 3,
          [AgentStatus.ERROR]: 4,
          [AgentStatus.STOPPED]: 5,
          [AgentStatus.MAINTENANCE]: 6,
        }[state.status] ?? -1;

      this.setGauge(`agent:${config.id}:status`, statusValue, {
        agentId: config.id,
        cluster: config.cluster,
      });

      // Record current task count
      this.setGauge(`agent:${config.id}:current_tasks`, state.currentTasks.length, {
        agentId: config.id,
      });

      // Record uptime
      this.setGauge(`agent:${config.id}:uptime_ms`, state.health.uptimeMs, { agentId: config.id });

      // Estimate memory usage from process
      const processMemory = process.memoryUsage();
      this.setGauge(
        `agent:${config.id}:process_memory_mb`,
        Math.round((processMemory.heapUsed / 1024 / 1024) * 100) / 100,
        { agentId: config.id },
      );

      // Estimate CPU usage
      const processCpu = process.cpuUsage();
      const cpuPercent = (processCpu.user + processCpu.system) / 1000;
      this.setGauge(`agent:${config.id}:cpu_estimate_ms`, Math.round(cpuPercent * 100) / 100, {
        agentId: config.id,
      });
    }
  }

  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(() => {
      this.collectAgentMetrics();
    }, AgentMetricsService.COLLECTION_INTERVAL_MS);
  }

  private stopMetricsCollection(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval as any);
      this.metricsCollectionInterval = null;
    }
  }
}
