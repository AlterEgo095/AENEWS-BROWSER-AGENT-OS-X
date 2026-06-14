import { Injectable, Logger } from '@nestjs/common';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';

/**
 * Health status for an individual agent.
 */
export interface AgentHealth {
  agentId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  executionCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDuration: number;
  lastExecutionAt: number | null;
  consecutiveFailures: number;
  lastError: string | null;
}

/**
 * Execution metrics snapshot.
 */
export interface AgentMetrics {
  agentId: string;
  totalExecutions: number;
  successRate: number;
  failureRate: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  lastExecutionAt: number | null;
  consecutiveFailures: number;
  uptime: number; // time since first execution (ms)
}

/**
 * System-wide health summary.
 */
export interface SystemHealth {
  totalAgents: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  agents: Array<{ agentId: string; status: AgentHealth['status'] }>;
}

/**
 * Internal execution record.
 */
interface ExecutionRecord {
  duration: number;
  success: boolean;
  timestamp: number;
  error?: string;
}

/**
 * Agent Health Monitor — tracks execution metrics and raises alerts
 * when agent health degrades.
 *
 * Thresholds:
 *   - Degraded: success rate < 80% or consecutive failures >= 3
 *   - Unhealthy: success rate < 50% or consecutive failures >= 5
 */
@Injectable()
export class AgentHealthService {
  private readonly logger = new Logger(AgentHealthService.name);

  /** Per-agent execution history (capped at last 100 records) */
  private readonly executionHistory = new Map<string, ExecutionRecord[]>();

  private readonly MAX_HISTORY = 100;

  /** Thresholds */
  private readonly DEGRADED_SUCCESS_RATE = 0.8;
  private readonly UNHEALTHY_SUCCESS_RATE = 0.5;
  private readonly DEGRADED_CONSECUTIVE_FAILURES = 3;
  private readonly UNHEALTHY_CONSECUTIVE_FAILURES = 5;

  constructor(private readonly eventBus: AgentEventBusService) {}

  // ─── Public API ─────────────────────────────────────────────

  /**
   * Record an execution result for health tracking.
   * This should be called after every agent execution.
   */
  recordExecution(
    agentId: string,
    duration: number,
    success: boolean,
    error?: string,
  ): void {
    const history = this.getOrCreateHistory(agentId);
    history.push({ duration, success, timestamp: Date.now(), error });

    // Cap the history
    if (history.length > this.MAX_HISTORY) {
      history.shift();
    }

    // Check for health state changes
    const previousHealth = this.computeHealth(agentId);

    if (!success) {
      this.logger.warn(
        `Agent ${agentId} execution failed (duration: ${duration}ms${error ? ` — ${error}` : ''})`,
      );
    }

    const currentHealth = this.computeHealth(agentId);

    // Emit alert if health degraded
    if (
      this.healthWorsened(previousHealth.status, currentHealth.status)
    ) {
      this.eventBus.emit(AgentEventType.AGENT_FAILED, agentId, {
        healthStatus: currentHealth.status,
        consecutiveFailures: currentHealth.consecutiveFailures,
        successRate: currentHealth.successRate,
        alert: `Agent ${agentId} health degraded to ${currentHealth.status}`,
      });

      this.logger.warn(
        `⚠️ Agent ${agentId} health degraded: ${currentHealth.status} ` +
          `(success rate: ${(currentHealth.successRate * 100).toFixed(1)}%, ` +
          `consecutive failures: ${currentHealth.consecutiveFailures})`,
      );
    }
  }

  /**
   * Get the current health status for an agent.
   */
  getHealth(agentId: string): AgentHealth {
    return this.computeHealth(agentId);
  }

  /**
   * Get detailed execution metrics for an agent.
   */
  getMetrics(agentId: string): AgentMetrics {
    const history = this.getOrCreateHistory(agentId);

    if (history.length === 0) {
      return {
        agentId,
        totalExecutions: 0,
        successRate: 0,
        failureRate: 0,
        avgDurationMs: 0,
        minDurationMs: 0,
        maxDurationMs: 0,
        p50DurationMs: 0,
        p95DurationMs: 0,
        p99DurationMs: 0,
        lastExecutionAt: null,
        consecutiveFailures: 0,
        uptime: 0,
      };
    }

    const successes = history.filter((r) => r.success);
    const failures = history.filter((r) => !r.success);
    const durations = history.map((r) => r.duration).sort((a, b) => a - b);

    const consecutiveFailures = this.countConsecutiveFailures(history);
    const firstTimestamp = history[0].timestamp;
    const lastTimestamp = history[history.length - 1].timestamp;

    return {
      agentId,
      totalExecutions: history.length,
      successRate: successes.length / history.length,
      failureRate: failures.length / history.length,
      avgDurationMs:
        durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDurationMs: durations[0],
      maxDurationMs: durations[durations.length - 1],
      p50DurationMs: this.percentile(durations, 50),
      p95DurationMs: this.percentile(durations, 95),
      p99DurationMs: this.percentile(durations, 99),
      lastExecutionAt: lastTimestamp,
      consecutiveFailures,
      uptime: Date.now() - firstTimestamp,
    };
  }

  /**
   * Get a system-wide health overview across all tracked agents.
   */
  getSystemHealth(): SystemHealth {
    const agentIds = Array.from(this.executionHistory.keys());
    const healthEntries = agentIds.map((id) => ({
      agentId: id,
      health: this.computeHealth(id),
    }));

    const healthy = healthEntries.filter(
      (e) => e.health.status === 'healthy',
    ).length;
    const degraded = healthEntries.filter(
      (e) => e.health.status === 'degraded',
    ).length;
    const unhealthy = healthEntries.filter(
      (e) => e.health.status === 'unhealthy',
    ).length;

    const overallStatus: SystemHealth['overallStatus'] =
      unhealthy > 0 ? 'unhealthy' : degraded > 0 ? 'degraded' : 'healthy';

    return {
      totalAgents: agentIds.length,
      healthy,
      degraded,
      unhealthy,
      overallStatus,
      agents: healthEntries.map((e) => ({
        agentId: e.agentId,
        status: e.health.status,
      })),
    };
  }

  // ─── Private helpers ────────────────────────────────────────

  private getOrCreateHistory(agentId: string): ExecutionRecord[] {
    if (!this.executionHistory.has(agentId)) {
      this.executionHistory.set(agentId, []);
    }
    return this.executionHistory.get(agentId)!;
  }

  private computeHealth(agentId: string): AgentHealth {
    const history = this.getOrCreateHistory(agentId);

    if (history.length === 0) {
      return {
        agentId,
        status: 'healthy',
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 1,
        avgDuration: 0,
        lastExecutionAt: null,
        consecutiveFailures: 0,
        lastError: null,
      };
    }

    const successCount = history.filter((r) => r.success).length;
    const failureCount = history.filter((r) => !r.success).length;
    const successRate = successCount / history.length;
    const avgDuration =
      history.reduce((sum, r) => sum + r.duration, 0) / history.length;
    const consecutiveFailures = this.countConsecutiveFailures(history);
    const lastRecord = history[history.length - 1];

    let status: AgentHealth['status'] = 'healthy';
    if (
      successRate < this.UNHEALTHY_SUCCESS_RATE ||
      consecutiveFailures >= this.UNHEALTHY_CONSECUTIVE_FAILURES
    ) {
      status = 'unhealthy';
    } else if (
      successRate < this.DEGRADED_SUCCESS_RATE ||
      consecutiveFailures >= this.DEGRADED_CONSECUTIVE_FAILURES
    ) {
      status = 'degraded';
    }

    return {
      agentId,
      status,
      executionCount: history.length,
      successCount,
      failureCount,
      successRate,
      avgDuration,
      lastExecutionAt: lastRecord.timestamp,
      consecutiveFailures,
      lastError: lastRecord.error || null,
    };
  }

  private countConsecutiveFailures(history: ExecutionRecord[]): number {
    let count = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (!history[i].success) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private healthWorsened(
    previous: AgentHealth['status'],
    current: AgentHealth['status'],
  ): boolean {
    const order: Record<AgentHealth['status'], number> = {
      healthy: 0,
      degraded: 1,
      unhealthy: 2,
    };
    return order[current] > order[previous];
  }
}
