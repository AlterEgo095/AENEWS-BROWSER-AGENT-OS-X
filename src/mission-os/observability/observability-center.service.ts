/**
 * AENEWS Agent OS X - Observability Center Service
 *
 * The single pane of glass for the entire system. Unified view of:
 * Logs, Metrics, Traces, EQI, Memory, Browser, Agent Health,
 * CPU, GPU, Redis, RabbitMQ, PostgreSQL.
 *
 * All subsystems push their state here; this service composes the
 * full ObservabilitySnapshot on demand and provides querying,
 * alerting, and time-series aggregation across every dimension.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// ─── Type Definitions ──────────────────────────────────────────────

export interface ObservabilitySnapshot {
  timestamp: Date;
  system: SystemHealth;
  agents: AgentObservability;
  memory: MemoryObservability;
  browser: BrowserObservability;
  infrastructure: InfrastructureObservability;
  eqi: EqiObservability;
  alerts: Alert[];
}

export interface SystemHealth {
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  uptime: number;
  nodeVersion: string;
  activeHandles: number;
  activeRequests: number;
}

export interface AgentObservability {
  totalAgents: number;
  activeAgents: number;
  healthyAgents: number;
  byCluster: Record<string, { total: number; active: number; healthy: number }>;
  byStatus: Record<string, number>;
  totalTasksCompleted: number;
  totalTasksFailed: number;
  avgExecutionTimeMs: number;
  circuitBreakersOpen: number;
}

export interface MemoryObservability {
  workingMemory: { entries: number; sizeBytes: number };
  sessionMemory: { entries: number; sizeBytes: number; activeSessions: number };
  longTermMemory: { entries: number; sizeBytes: number };
  knowledgeGraph: { nodes: number; edges: number };
  vectorSearch: { indexed: number; queries: number; avgLatencyMs: number };
  totalSizeBytes: number;
}

export interface BrowserObservability {
  activeSessions: number;
  totalSessions: number;
  avgPageLoadMs: number;
  errorRate: number;
  byType: Record<string, { count: number; status: string }>;
}

export interface InfrastructureObservability {
  redis: { connected: boolean; memoryUsedMb: number; commandsPerSec: number; keys: number };
  rabbitmq: { connected: boolean; queues: number; messages: number; consumers: number };
  postgresql: { connected: boolean; activeConnections: number; queriesPerSec: number; sizeMb: number };
  cpu: { cores: number; usagePercent: number; loadAvg: number[] };
  gpu: { available: boolean; memoryUsedMb: number; memoryTotalMb: number; utilizationPercent: number };
}

export interface EqiObservability {
  currentScore: number;
  trend: number[];            // Last N scores
  byDomain: Record<string, number>;
  lastCertificationAt: Date | null;
  certificationLevel: string;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt: Date | null;
  metadata: Record<string, any>;
}

export interface ObservabilityMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  labels: Record<string, string>;
}

export interface ObservabilityLogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  source: string;
  message: string;
  timestamp: Date;
  metadata: Record<string, any>;
  correlationId: string | null;
}

export interface ObservabilityTrace {
  id: string;
  operation: string;
  startTime: Date;
  durationMs: number;
  status: 'ok' | 'error';
  spans: TraceSpan[];
  correlationId: string;
}

export interface TraceSpan {
  id: string;
  operation: string;
  startTime: Date;
  durationMs: number;
  status: 'ok' | 'error';
  agentId: string | null;
  metadata: Record<string, any>;
}

// ─── Internal helper types ─────────────────────────────────────────

interface AgentMetricState {
  agentId: string;
  cluster: string;
  status: string;
  healthy: boolean;
  tasksCompleted: number;
  tasksFailed: number;
  lastExecutionTimeMs: number;
  circuitBreakerOpen: boolean;
  updatedAt: Date;
}

interface LogFilter {
  level?: ObservabilityLogEntry['level'];
  source?: string;
  correlationId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

interface Dashboard {
  generatedAt: Date;
  summary: {
    systemHealthy: boolean;
    activeAgents: number;
    totalAgents: number;
    activeAlerts: number;
    criticalAlerts: number;
    eqiScore: number;
    infrastructureConnected: boolean;
  };
  keyMetrics: Array<{ name: string; value: number; unit: string; trend: 'up' | 'down' | 'stable' }>;
  alertSummary: Record<Alert['severity'], number>;
  agentHealth: { healthy: number; degraded: number; failed: number };
  infrastructure: {
    redisConnected: boolean;
    rabbitmqConnected: boolean;
    postgresqlConnected: boolean;
    cpuUsagePercent: number;
    memoryUsagePercent: number;
  };
  charts: {
    cpuHistory: Array<{ timestamp: Date; value: number }>;
    memoryHistory: Array<{ timestamp: Date; value: number }>;
    requestRate: Array<{ timestamp: Date; value: number }>;
    eqiTrend: Array<{ timestamp: Date; value: number }>;
  };
  recentAlerts: Alert[];
}

interface TimeSeriesBucket {
  timestamp: Date;
  min: number;
  max: number;
  avg: number;
  sum: number;
  count: number;
}

// ─── Constants ─────────────────────────────────────────────────────

const MAX_METRICS = 100_000;
const MAX_LOGS = 50_000;
const MAX_TRACES = 20_000;
const MAX_ALERTS = 5_000;
const MAX_EQI_TREND = 100;
const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Service ───────────────────────────────────────────────────────

@Injectable()
export class ObservabilityCenterService implements OnModuleInit {
  private readonly logger = new Logger(ObservabilityCenterService.name);

  /** Bounded time-series buffer for all recorded metrics */
  private readonly metricsBuffer: ObservabilityMetric[] = [];

  /** Bounded log buffer */
  private readonly logBuffer: ObservabilityLogEntry[] = [];

  /** Bounded trace buffer */
  private readonly traceBuffer: ObservabilityTrace[] = [];

  /** Active alerts (unresolved) + recently resolved */
  private readonly alerts: Alert[] = [];

  /** Agent metric states keyed by agentId */
  private readonly agentStates: Map<string, AgentMetricState> = new Map();

  /** Latest infrastructure metrics per component */
  private readonly infraStates: Map<string, Record<string, any>> = new Map();

  /** EQI state */
  private eqiState: EqiObservability = {
    currentScore: 0,
    trend: [],
    byDomain: {},
    lastCertificationAt: null,
    certificationLevel: 'uncertified',
  };

  /** Browser state */
  private browserState: BrowserObservability = {
    activeSessions: 0,
    totalSessions: 0,
    avgPageLoadMs: 0,
    errorRate: 0,
    byType: {},
  };

  /** Memory state */
  private memoryState: MemoryObservability = {
    workingMemory: { entries: 0, sizeBytes: 0 },
    sessionMemory: { entries: 0, sizeBytes: 0, activeSessions: 0 },
    longTermMemory: { entries: 0, sizeBytes: 0 },
    knowledgeGraph: { nodes: 0, edges: 0 },
    vectorSearch: { indexed: 0, queries: 0, avgLatencyMs: 0 },
    totalSizeBytes: 0,
  };

  /** Monotonic counter for alert IDs */
  private alertCounter = 0;

  /** Module start time for uptime calculation */
  private readonly startTime = Date.now();

  // ─── Lifecycle ────────────────────────────────────────────────────

  onModuleInit(): void {
    this.logger.log('ObservabilityCenterService initialised — single pane of glass online');
  }

  // ─── 1. getSnapshot ───────────────────────────────────────────────

  /**
   * THE CORE METHOD. Collect current state from all subsystems and
   * return a unified ObservabilitySnapshot. Reads from internal
   * state since we don't have live external connections yet.
   */
  getSnapshot(): ObservabilitySnapshot {
    const now = new Date();

    const system: SystemHealth = this.computeSystemHealth(now);

    const agents: AgentObservability = this.computeAgentObservability();

    const infrastructure = this.computeInfrastructureObservability();

    return {
      timestamp: now,
      system,
      agents,
      memory: { ...this.memoryState },
      browser: { ...this.browserState },
      infrastructure,
      eqi: {
        ...this.eqiState,
        trend: [...this.eqiState.trend],
        byDomain: { ...this.eqiState.byDomain },
      },
      alerts: this.alerts
        .filter((a) => a.resolvedAt === null)
        .map((a) => ({ ...a, metadata: { ...a.metadata } })),
    };
  }

  // ─── 2. recordMetric ──────────────────────────────────────────────

  /**
   * Record a metric data point into the time-series buffer.
   * The buffer is bounded; oldest entries are evicted when full.
   */
  recordMetric(metric: ObservabilityMetric): void {
    this.metricsBuffer.push({
      ...metric,
      labels: { ...metric.labels },
      timestamp: metric.timestamp ?? new Date(),
    });

    if (this.metricsBuffer.length > MAX_METRICS) {
      this.metricsBuffer.splice(0, this.metricsBuffer.length - MAX_METRICS);
    }
  }

  // ─── 3. recordLog ─────────────────────────────────────────────────

  /**
   * Record a log entry into the bounded log buffer.
   */
  recordLog(entry: ObservabilityLogEntry): void {
    this.logBuffer.push({
      ...entry,
      metadata: { ...entry.metadata },
      timestamp: entry.timestamp ?? new Date(),
    });

    if (this.logBuffer.length > MAX_LOGS) {
      this.logBuffer.splice(0, this.logBuffer.length - MAX_LOGS);
    }
  }

  // ─── 4. recordTrace ───────────────────────────────────────────────

  /**
   * Record a distributed trace into the bounded trace buffer.
   */
  recordTrace(trace: ObservabilityTrace): void {
    this.traceBuffer.push({
      ...trace,
      spans: trace.spans.map((s) => ({
        ...s,
        metadata: { ...s.metadata },
      })),
      startTime: trace.startTime ?? new Date(),
    });

    if (this.traceBuffer.length > MAX_TRACES) {
      this.traceBuffer.splice(0, this.traceBuffer.length - MAX_TRACES);
    }
  }

  // ─── 5. createAlert ───────────────────────────────────────────────

  /**
   * Create a new alert. Auto-generates an ID and timestamp.
   * Returns the created alert.
   */
  createAlert(
    severity: Alert['severity'],
    source: string,
    message: string,
    metadata?: Record<string, any>,
  ): Alert {
    const alert: Alert = {
      id: `alert-${++this.alertCounter}`,
      severity,
      source,
      message,
      timestamp: new Date(),
      acknowledged: false,
      resolvedAt: null,
      metadata: metadata ?? {},
    };

    this.alerts.push(alert);

    if (this.alerts.length > MAX_ALERTS) {
      this.alerts.splice(0, this.alerts.length - MAX_ALERTS);
    }

    this.logger.warn(
      `Alert created [${severity}] from ${source}: ${message}`,
    );

    return { ...alert, metadata: { ...alert.metadata } };
  }

  // ─── 6. acknowledgeAlert ──────────────────────────────────────────

  /**
   * Acknowledge an alert by ID. No-op if not found.
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) {
      this.logger.debug(`Cannot acknowledge alert — id "${alertId}" not found`);
      return;
    }

    if (alert.acknowledged) {
      this.logger.debug(`Alert "${alertId}" is already acknowledged`);
      return;
    }

    alert.acknowledged = true;
    this.logger.log(`Alert acknowledged: ${alertId}`);
  }

  // ─── 7. resolveAlert ──────────────────────────────────────────────

  /**
   * Resolve an alert by ID. Sets resolvedAt to now. No-op if not found
   * or already resolved.
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) {
      this.logger.debug(`Cannot resolve alert — id "${alertId}" not found`);
      return;
    }

    if (alert.resolvedAt !== null) {
      this.logger.debug(`Alert "${alertId}" is already resolved`);
      return;
    }

    alert.resolvedAt = new Date();
    this.logger.log(`Alert resolved: ${alertId}`);
  }

  // ─── 8. getMetrics ────────────────────────────────────────────────

  /**
   * Query metrics by name and/or time range.
   * Returns copies, not references.
   */
  getMetrics(name?: string, from?: Date, to?: Date): ObservabilityMetric[] {
    let result = this.metricsBuffer;

    if (name) {
      result = result.filter((m) => m.name === name);
    }

    if (from) {
      result = result.filter((m) => m.timestamp >= from);
    }

    if (to) {
      result = result.filter((m) => m.timestamp <= to);
    }

    return result.map((m) => ({ ...m, labels: { ...m.labels } }));
  }

  // ─── 9. getLogs ───────────────────────────────────────────────────

  /**
   * Query logs with filter support: level, source, correlationId,
   * and time range. Returns copies.
   */
  getLogs(filter?: LogFilter): ObservabilityLogEntry[] {
    let result = this.logBuffer;

    if (filter) {
      if (filter.level) {
        result = result.filter((l) => l.level === filter.level);
      }
      if (filter.source) {
        result = result.filter((l) => l.source === filter.source);
      }
      if (filter.correlationId) {
        result = result.filter((l) => l.correlationId === filter.correlationId);
      }
      if (filter.from) {
        result = result.filter((l) => l.timestamp >= filter.from!);
      }
      if (filter.to) {
        result = result.filter((l) => l.timestamp <= filter.to!);
      }
    }

    const limited = filter?.limit ? result.slice(-filter.limit) : result;

    return limited.map((l) => ({ ...l, metadata: { ...l.metadata } }));
  }

  // ─── 10. getTraces ────────────────────────────────────────────────

  /**
   * Query traces by operation name and/or correlationId.
   * Returns copies.
   */
  getTraces(operation?: string, correlationId?: string): ObservabilityTrace[] {
    let result = this.traceBuffer;

    if (operation) {
      result = result.filter((t) => t.operation === operation);
    }

    if (correlationId) {
      result = result.filter((t) => t.correlationId === correlationId);
    }

    return result.map((t) => ({
      ...t,
      spans: t.spans.map((s) => ({ ...s, metadata: { ...s.metadata } })),
    }));
  }

  // ─── 11. getAlerts ────────────────────────────────────────────────

  /**
   * Query alerts with optional severity and acknowledgement filters.
   * Returns copies.
   */
  getAlerts(severity?: Alert['severity'], acknowledged?: boolean): Alert[] {
    let result = this.alerts;

    if (severity) {
      result = result.filter((a) => a.severity === severity);
    }

    if (acknowledged !== undefined) {
      result = result.filter((a) => a.acknowledged === acknowledged);
    }

    return result.map((a) => ({ ...a, metadata: { ...a.metadata } }));
  }

  // ─── 12. getDashboard ─────────────────────────────────────────────

  /**
   * Return a structured dashboard object with key metrics, chart data,
   * and alert summary. Designed for frontend consumption.
   */
  getDashboard(): Dashboard {
    const now = new Date();
    const snapshot = this.getSnapshot();

    // Derive key metrics with simple trend detection
    const keyMetrics = this.computeDashboardKeyMetrics(snapshot);

    // Alert summary by severity
    const alertSummary: Record<Alert['severity'], number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };
    for (const alert of this.alerts) {
      if (alert.resolvedAt === null) {
        alertSummary[alert.severity]++;
      }
    }

    // Agent health breakdown
    let healthy = 0;
    let degraded = 0;
    let failed = 0;
    for (const state of this.agentStates.values()) {
      if (state.healthy) {
        healthy++;
      } else if (state.status === 'failed') {
        failed++;
      } else {
        degraded++;
      }
    }

    // Infrastructure connection status
    const redisState = this.infraStates.get('redis') ?? {};
    const rabbitmqState = this.infraStates.get('rabbitmq') ?? {};
    const postgresqlState = this.infraStates.get('postgresql') ?? {};
    const cpuState = this.infraStates.get('cpu') ?? {};
    const memState = this.infraStates.get('system-memory') ?? {};

    // Chart data — last 60 data points for CPU / memory / request rate / EQI
    const cpuHistory = this.extractChartHistory('system.cpu.percent', 60);
    const memoryHistory = this.extractChartHistory('system.memory.percent', 60);
    const requestRate = this.extractChartHistory('system.requests.per_sec', 60);
    const eqiTrend = this.eqiState.trend.map((score, i) => ({
      timestamp: new Date(now.getTime() - (this.eqiState.trend.length - i) * 60_000),
      value: score,
    }));

    const criticalAlerts = this.alerts.filter(
      (a) => a.resolvedAt === null && a.severity === 'critical',
    );

    return {
      generatedAt: now,
      summary: {
        systemHealthy: snapshot.system.cpuPercent < 90 && snapshot.system.memoryPercent < 90,
        activeAgents: snapshot.agents.activeAgents,
        totalAgents: snapshot.agents.totalAgents,
        activeAlerts: this.alerts.filter((a) => a.resolvedAt === null).length,
        criticalAlerts: criticalAlerts.length,
        eqiScore: snapshot.eqi.currentScore,
        infrastructureConnected:
          (redisState.connected as boolean ?? true) &&
          (rabbitmqState.connected as boolean ?? true) &&
          (postgresqlState.connected as boolean ?? true),
      },
      keyMetrics,
      alertSummary,
      agentHealth: { healthy, degraded, failed },
      infrastructure: {
        redisConnected: redisState.connected as boolean ?? true,
        rabbitmqConnected: rabbitmqState.connected as boolean ?? true,
        postgresqlConnected: postgresqlState.connected as boolean ?? true,
        cpuUsagePercent: (cpuState.usagePercent as number) ?? snapshot.system.cpuPercent,
        memoryUsagePercent: (memState.percent as number) ?? snapshot.system.memoryPercent,
      },
      charts: {
        cpuHistory,
        memoryHistory,
        requestRate,
        eqiTrend,
      },
      recentAlerts: this.alerts
        .filter((a) => a.resolvedAt === null)
        .slice(-10)
        .map((a) => ({ ...a, metadata: { ...a.metadata } })),
    };
  }

  // ─── 13. updateAgentMetrics ───────────────────────────────────────

  /**
   * Push agent metrics into observability. Creates or updates the
   * agent's state record.
   */
  updateAgentMetrics(
    agentId: string,
    metrics: {
      cluster?: string;
      status?: string;
      healthy?: boolean;
      tasksCompleted?: number;
      tasksFailed?: number;
      lastExecutionTimeMs?: number;
      circuitBreakerOpen?: boolean;
    },
  ): void {
    const existing = this.agentStates.get(agentId);

    const updated: AgentMetricState = {
      agentId,
      cluster: metrics.cluster ?? existing?.cluster ?? 'default',
      status: metrics.status ?? existing?.status ?? 'idle',
      healthy: metrics.healthy ?? existing?.healthy ?? true,
      tasksCompleted: metrics.tasksCompleted ?? existing?.tasksCompleted ?? 0,
      tasksFailed: metrics.tasksFailed ?? existing?.tasksFailed ?? 0,
      lastExecutionTimeMs: metrics.lastExecutionTimeMs ?? existing?.lastExecutionTimeMs ?? 0,
      circuitBreakerOpen: metrics.circuitBreakerOpen ?? existing?.circuitBreakerOpen ?? false,
      updatedAt: new Date(),
    };

    this.agentStates.set(agentId, updated);
  }

  // ─── 14. updateInfrastructureMetrics ──────────────────────────────

  /**
   * Push infrastructure metrics for a component (redis, rabbitmq,
   * postgresql, cpu, gpu, system-memory, etc.).
   */
  updateInfrastructureMetrics(
    component: string,
    metrics: Record<string, any>,
  ): void {
    this.infraStates.set(component, { ...metrics });

    // Auto-record a metric for the update
    if (typeof metrics.usagePercent === 'number') {
      this.recordMetric({
        name: `infra.${component}.usage_percent`,
        value: metrics.usagePercent,
        unit: 'percent',
        timestamp: new Date(),
        labels: { component },
      });
    }

    if (typeof metrics.connected === 'boolean' && !metrics.connected) {
      this.createAlert(
        'error',
        `infrastructure.${component}`,
        `${component} connection lost`,
        { component, metrics },
      );
    }
  }

  // ─── 15. updateEqiScore ───────────────────────────────────────────

  /**
   * Update EQI observability with the latest score and domain breakdown.
   */
  updateEqiScore(score: number, domains: Record<string, number>): void {
    const trend = [...this.eqiState.trend, score];
    if (trend.length > MAX_EQI_TREND) {
      trend.splice(0, trend.length - MAX_EQI_TREND);
    }

    // Derive certification level from score
    let certificationLevel = 'uncertified';
    if (score >= 95) certificationLevel = 'platinum';
    else if (score >= 85) certificationLevel = 'gold';
    else if (score >= 70) certificationLevel = 'silver';
    else if (score >= 50) certificationLevel = 'bronze';

    this.eqiState = {
      currentScore: score,
      trend,
      byDomain: { ...domains },
      lastCertificationAt: certificationLevel !== 'uncertified' ? new Date() : this.eqiState.lastCertificationAt,
      certificationLevel,
    };

    // Record EQI as a metric
    this.recordMetric({
      name: 'eqi.score',
      value: score,
      unit: 'score',
      timestamp: new Date(),
      labels: { certificationLevel },
    });

    // Alert on score drops
    if (this.eqiState.trend.length >= 2) {
      const prev = this.eqiState.trend[this.eqiState.trend.length - 2];
      if (prev - score >= 10) {
        this.createAlert(
          'warning',
          'eqi',
          `EQI score dropped by ${(prev - score).toFixed(1)} points (from ${prev} to ${score})`,
          { previousScore: prev, currentScore: score },
        );
      }
    }
  }

  // ─── 16. getHealthStatus ──────────────────────────────────────────

  /**
   * Quick health check: is everything OK?
   * Returns { healthy, issues } where issues lists what's wrong.
   */
  getHealthStatus(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    const snapshot = this.getSnapshot();

    // System health checks
    if (snapshot.system.cpuPercent > 90) {
      issues.push(`CPU usage critical: ${snapshot.system.cpuPercent.toFixed(1)}%`);
    }
    if (snapshot.system.memoryPercent > 90) {
      issues.push(`Memory usage critical: ${snapshot.system.memoryPercent.toFixed(1)}%`);
    }
    if (snapshot.system.diskPercent > 95) {
      issues.push(`Disk usage critical: ${snapshot.system.diskPercent.toFixed(1)}%`);
    }

    // Infrastructure connectivity
    if (!snapshot.infrastructure.redis.connected) {
      issues.push('Redis is not connected');
    }
    if (!snapshot.infrastructure.rabbitmq.connected) {
      issues.push('RabbitMQ is not connected');
    }
    if (!snapshot.infrastructure.postgresql.connected) {
      issues.push('PostgreSQL is not connected');
    }

    // Infrastructure resource pressure
    if (snapshot.infrastructure.cpu.usagePercent > 90) {
      issues.push(`Infrastructure CPU critical: ${snapshot.infrastructure.cpu.usagePercent.toFixed(1)}%`);
    }
    if (snapshot.infrastructure.gpu.available && snapshot.infrastructure.gpu.utilizationPercent > 95) {
      issues.push(`GPU utilization critical: ${snapshot.infrastructure.gpu.utilizationPercent.toFixed(1)}%`);
    }

    // Agent health
    if (snapshot.agents.circuitBreakersOpen > 0) {
      issues.push(`${snapshot.agents.circuitBreakersOpen} circuit breaker(s) open`);
    }
    if (snapshot.agents.totalAgents > 0 && snapshot.agents.healthyAgents === 0) {
      issues.push('No healthy agents');
    }

    // Alert-based issues
    const criticalAlerts = this.alerts.filter(
      (a) => a.resolvedAt === null && a.severity === 'critical' && !a.acknowledged,
    );
    if (criticalAlerts.length > 0) {
      issues.push(`${criticalAlerts.length} unacknowledged critical alert(s)`);
    }

    // EQI
    if (snapshot.eqi.currentScore > 0 && snapshot.eqi.currentScore < 50) {
      issues.push(`EQI score below threshold: ${snapshot.eqi.currentScore}`);
    }

    // Browser
    if (snapshot.browser.errorRate > 0.5) {
      issues.push(`Browser error rate high: ${(snapshot.browser.errorRate * 100).toFixed(1)}%`);
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  // ─── 17. getMetricTimeSeries ──────────────────────────────────────

  /**
   * Get time-series data for a metric with aggregation.
   * Buckets data into intervals and computes min/max/avg/sum/count
   * per bucket.
   */
  getMetricTimeSeries(
    name: string,
    from: Date,
    to: Date,
    intervalMs: number,
  ): TimeSeriesBucket[] {
    if (intervalMs <= 0) {
      throw new Error('intervalMs must be positive');
    }

    // Filter metrics by name and time range
    const relevant = this.metricsBuffer.filter(
      (m) => m.name === name && m.timestamp >= from && m.timestamp <= to,
    );

    if (relevant.length === 0) {
      return [];
    }

    // Create buckets
    const buckets: TimeSeriesBucket[] = [];
    const bucketStart = from.getTime();
    const bucketEnd = to.getTime();

    for (let t = bucketStart; t < bucketEnd; t += intervalMs) {
      const bucketTimestamp = new Date(t);
      const bucketEndMs = t + intervalMs;

      const inBucket = relevant.filter(
        (m) => m.timestamp.getTime() >= t && m.timestamp.getTime() < bucketEndMs,
      );

      if (inBucket.length > 0) {
        const values = inBucket.map((m) => m.value);
        buckets.push({
          timestamp: bucketTimestamp,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((s, v) => s + v, 0) / values.length,
          sum: values.reduce((s, v) => s + v, 0),
          count: values.length,
        });
      }
    }

    return buckets;
  }

  // ─── 18. cleanup ──────────────────────────────────────────────────

  /**
   * Clean up old data beyond the retention period. Removes expired
   * metrics, logs, traces, and resolved alerts.
   */
  cleanup(retentionMs?: number): {
    metricsRemoved: number;
    logsRemoved: number;
    tracesRemoved: number;
    alertsRemoved: number;
  } {
    const retention = retentionMs ?? DEFAULT_RETENTION_MS;
    const cutoff = new Date(Date.now() - retention);

    // Count before
    const metricsBefore = this.metricsBuffer.length;
    const logsBefore = this.logBuffer.length;
    const tracesBefore = this.traceBuffer.length;
    const alertsBefore = this.alerts.length;

    // Remove expired metrics
    let writeIdx = 0;
    for (let i = 0; i < this.metricsBuffer.length; i++) {
      if (this.metricsBuffer[i].timestamp >= cutoff) {
        this.metricsBuffer[writeIdx++] = this.metricsBuffer[i];
      }
    }
    this.metricsBuffer.length = writeIdx;

    // Remove expired logs
    writeIdx = 0;
    for (let i = 0; i < this.logBuffer.length; i++) {
      if (this.logBuffer[i].timestamp >= cutoff) {
        this.logBuffer[writeIdx++] = this.logBuffer[i];
      }
    }
    this.logBuffer.length = writeIdx;

    // Remove expired traces
    writeIdx = 0;
    for (let i = 0; i < this.traceBuffer.length; i++) {
      if (this.traceBuffer[i].startTime >= cutoff) {
        this.traceBuffer[writeIdx++] = this.traceBuffer[i];
      }
    }
    this.traceBuffer.length = writeIdx;

    // Remove resolved alerts older than retention
    writeIdx = 0;
    for (let i = 0; i < this.alerts.length; i++) {
      const alert = this.alerts[i];
      // Keep unresolved alerts regardless of age
      if (alert.resolvedAt === null) {
        this.alerts[writeIdx++] = alert;
      } else if (alert.resolvedAt >= cutoff) {
        this.alerts[writeIdx++] = alert;
      }
    }
    this.alerts.length = writeIdx;

    // Clean up stale agent states (not updated within retention)
    const agentCutoff = new Date(Date.now() - retention);
    for (const [agentId, state] of this.agentStates.entries()) {
      if (state.updatedAt < agentCutoff) {
        this.agentStates.delete(agentId);
      }
    }

    const result = {
      metricsRemoved: metricsBefore - this.metricsBuffer.length,
      logsRemoved: logsBefore - this.logBuffer.length,
      tracesRemoved: tracesBefore - this.traceBuffer.length,
      alertsRemoved: alertsBefore - this.alerts.length,
    };

    this.logger.log(
      `Cleanup complete: removed ${result.metricsRemoved} metrics, ` +
      `${result.logsRemoved} logs, ${result.tracesRemoved} traces, ` +
      `${result.alertsRemoved} alerts (retention=${retention}ms)`,
    );

    return result;
  }

  // ─── Public setters for browser & memory state ─────────────────────

  /**
   * Update the browser observability state.
   */
  updateBrowserState(state: Partial<BrowserObservability>): void {
    this.browserState = {
      ...this.browserState,
      ...state,
      byType: state.byType ?? this.browserState.byType,
    };
  }

  /**
   * Update the memory observability state.
   */
  updateMemoryState(state: Partial<MemoryObservability>): void {
    this.memoryState = {
      ...this.memoryState,
      ...state,
      workingMemory: state.workingMemory ?? this.memoryState.workingMemory,
      sessionMemory: state.sessionMemory ?? this.memoryState.sessionMemory,
      longTermMemory: state.longTermMemory ?? this.memoryState.longTermMemory,
      knowledgeGraph: state.knowledgeGraph ?? this.memoryState.knowledgeGraph,
      vectorSearch: state.vectorSearch ?? this.memoryState.vectorSearch,
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Compute the current SystemHealth from process metrics and
   * internal state.
   */
  private computeSystemHealth(now: Date): SystemHealth {
    // Collect CPU metric from buffer
    const cpuMetrics = this.metricsBuffer.filter(
      (m) => m.name === 'system.cpu.percent',
    );
    const cpuPercent = cpuMetrics.length > 0
      ? cpuMetrics[cpuMetrics.length - 1].value
      : process.cpuUsage?.().user
        ? (process.cpuUsage().user / 1_000_000) * 100
        : 0;

    // Memory from process or metric buffer
    const memMetrics = this.metricsBuffer.filter(
      (m) => m.name === 'system.memory.percent',
    );
    let memoryPercent = 0;
    if (memMetrics.length > 0) {
      memoryPercent = memMetrics[memMetrics.length - 1].value;
    } else if (typeof process.memoryUsage === 'function') {
      const mem = process.memoryUsage();
      memoryPercent = (mem.heapUsed / mem.heapTotal) * 100;
    }

    // Disk — read from infra state or default
    const diskState = this.infraStates.get('disk') ?? {};
    const diskPercent = (diskState.percent as number) ?? 0;

    return {
      cpuPercent: Math.min(100, Math.max(0, cpuPercent)),
      memoryPercent: Math.min(100, Math.max(0, memoryPercent)),
      diskPercent: Math.min(100, Math.max(0, diskPercent)),
      uptime: now.getTime() - this.startTime,
      nodeVersion: process.version,
      activeHandles: (process as any)._getActiveHandles?.()?.length ?? 0,
      activeRequests: (process as any)._getActiveRequests?.()?.length ?? 0,
    };
  }

  /**
   * Compute AgentObservability from the agent states map.
   */
  private computeAgentObservability(): AgentObservability {
    const states = [...this.agentStates.values()];

    const byCluster: Record<string, { total: number; active: number; healthy: number }> = {};
    const byStatus: Record<string, number> = {};

    let activeAgents = 0;
    let healthyAgents = 0;
    let totalTasksCompleted = 0;
    let totalTasksFailed = 0;
    let totalExecTimeMs = 0;
    let execTimeCount = 0;
    let circuitBreakersOpen = 0;

    for (const state of states) {
      // Cluster aggregation
      if (!byCluster[state.cluster]) {
        byCluster[state.cluster] = { total: 0, active: 0, healthy: 0 };
      }
      byCluster[state.cluster].total++;
      if (state.status === 'active' || state.status === 'running') {
        byCluster[state.cluster].active++;
        activeAgents++;
      }
      if (state.healthy) {
        byCluster[state.cluster].healthy++;
        healthyAgents++;
      }

      // Status aggregation
      byStatus[state.status] = (byStatus[state.status] ?? 0) + 1;

      // Task counters
      totalTasksCompleted += state.tasksCompleted;
      totalTasksFailed += state.tasksFailed;

      // Execution time
      if (state.lastExecutionTimeMs > 0) {
        totalExecTimeMs += state.lastExecutionTimeMs;
        execTimeCount++;
      }

      // Circuit breakers
      if (state.circuitBreakerOpen) {
        circuitBreakersOpen++;
      }
    }

    return {
      totalAgents: states.length,
      activeAgents,
      healthyAgents,
      byCluster,
      byStatus,
      totalTasksCompleted,
      totalTasksFailed,
      avgExecutionTimeMs: execTimeCount > 0 ? totalExecTimeMs / execTimeCount : 0,
      circuitBreakersOpen,
    };
  }

  /**
   * Compute InfrastructureObservability from the infra states map.
   */
  private computeInfrastructureObservability(): InfrastructureObservability {
    const redis = this.infraStates.get('redis') ?? {};
    const rabbitmq = this.infraStates.get('rabbitmq') ?? {};
    const postgresql = this.infraStates.get('postgresql') ?? {};
    const cpu = this.infraStates.get('cpu') ?? {};
    const gpu = this.infraStates.get('gpu') ?? {};

    return {
      redis: {
        connected: (redis.connected as boolean) ?? false,
        memoryUsedMb: (redis.memoryUsedMb as number) ?? 0,
        commandsPerSec: (redis.commandsPerSec as number) ?? 0,
        keys: (redis.keys as number) ?? 0,
      },
      rabbitmq: {
        connected: (rabbitmq.connected as boolean) ?? false,
        queues: (rabbitmq.queues as number) ?? 0,
        messages: (rabbitmq.messages as number) ?? 0,
        consumers: (rabbitmq.consumers as number) ?? 0,
      },
      postgresql: {
        connected: (postgresql.connected as boolean) ?? false,
        activeConnections: (postgresql.activeConnections as number) ?? 0,
        queriesPerSec: (postgresql.queriesPerSec as number) ?? 0,
        sizeMb: (postgresql.sizeMb as number) ?? 0,
      },
      cpu: {
        cores: (cpu.cores as number) ?? 0,
        usagePercent: (cpu.usagePercent as number) ?? 0,
        loadAvg: Array.isArray(cpu.loadAvg) ? [...cpu.loadAvg] : [],
      },
      gpu: {
        available: (gpu.available as boolean) ?? false,
        memoryUsedMb: (gpu.memoryUsedMb as number) ?? 0,
        memoryTotalMb: (gpu.memoryTotalMb as number) ?? 0,
        utilizationPercent: (gpu.utilizationPercent as number) ?? 0,
      },
    };
  }

  /**
   * Compute dashboard key metrics with trend detection.
   */
  private computeDashboardKeyMetrics(
    snapshot: ObservabilitySnapshot,
  ): Array<{ name: string; value: number; unit: string; trend: 'up' | 'down' | 'stable' }> {
    const metrics: Array<{ name: string; value: number; unit: string; trend: 'up' | 'down' | 'stable' }> = [];

    // CPU
    metrics.push({
      name: 'CPU Usage',
      value: Math.round(snapshot.system.cpuPercent * 10) / 10,
      unit: '%',
      trend: this.detectTrend('system.cpu.percent'),
    });

    // Memory
    metrics.push({
      name: 'Memory Usage',
      value: Math.round(snapshot.system.memoryPercent * 10) / 10,
      unit: '%',
      trend: this.detectTrend('system.memory.percent'),
    });

    // Active agents
    metrics.push({
      name: 'Active Agents',
      value: snapshot.agents.activeAgents,
      unit: 'agents',
      trend: 'stable',
    });

    // EQI Score
    metrics.push({
      name: 'EQI Score',
      value: snapshot.eqi.currentScore,
      unit: 'score',
      trend: this.detectEqiTrend(),
    });

    // Redis commands/sec
    metrics.push({
      name: 'Redis Commands/sec',
      value: snapshot.infrastructure.redis.commandsPerSec,
      unit: 'cmd/s',
      trend: this.detectTrend('infra.redis.usage_percent'),
    });

    // PostgreSQL queries/sec
    metrics.push({
      name: 'PostgreSQL Queries/sec',
      value: snapshot.infrastructure.postgresql.queriesPerSec,
      unit: 'qps',
      trend: this.detectTrend('infra.postgresql.usage_percent'),
    });

    // Browser error rate
    metrics.push({
      name: 'Browser Error Rate',
      value: Math.round(snapshot.browser.errorRate * 1000) / 10,
      unit: '%',
      trend: this.detectTrend('browser.error_rate'),
    });

    return metrics;
  }

  /**
   * Detect the trend direction for a metric by comparing the last
   * two data points (if available).
   */
  private detectTrend(metricName: string): 'up' | 'down' | 'stable' {
    const points = this.metricsBuffer.filter((m) => m.name === metricName).slice(-2);
    if (points.length < 2) return 'stable';

    const diff = points[1].value - points[0].value;
    const threshold = Math.max(Math.abs(points[0].value) * 0.01, 0.1);

    if (diff > threshold) return 'up';
    if (diff < -threshold) return 'down';
    return 'stable';
  }

  /**
   * Detect EQI trend from the internal trend array.
   */
  private detectEqiTrend(): 'up' | 'down' | 'stable' {
    const trend = this.eqiState.trend;
    if (trend.length < 2) return 'stable';

    const latest = trend[trend.length - 1];
    const previous = trend[trend.length - 2];
    const diff = latest - previous;

    if (diff > 2) return 'up';
    if (diff < -2) return 'down';
    return 'stable';
  }

  /**
   * Extract the last N data points for a metric as chart data.
   */
  private extractChartHistory(
    metricName: string,
    maxPoints: number,
  ): Array<{ timestamp: Date; value: number }> {
    const points = this.metricsBuffer
      .filter((m) => m.name === metricName)
      .slice(-maxPoints);

    return points.map((m) => ({ timestamp: m.timestamp, value: m.value }));
  }
}
