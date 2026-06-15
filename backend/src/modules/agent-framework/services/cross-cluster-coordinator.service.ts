/**
 * AENEWS Agent OS X — Cross-Cluster Coordinator Service
 *
 * Phase 8 — Coordinates agents across different clusters for complex
 * missions that require multi-domain expertise.
 *
 * Responsibilities:
 *   1. Route sub-tasks to the best cluster based on capabilities
 *   2. Manage cross-cluster data flow and dependencies
 *   3. Handle cluster-specific rate limits and circuit breakers
 *   4. Provide cluster health monitoring and failover
 *   5. Optimize resource allocation across clusters
 *   6. Track inter-cluster communication patterns
 *
 * Coordination patterns:
 *   - Sequential: Cluster A → Cluster B → Cluster C
 *   - Parallel: Cluster A ‖ Cluster B ‖ Cluster C
 *   - Fan-out: Cluster A → [B, C, D]
 *   - Fan-in: [A, B, C] → D
 *   - Pipeline: A → B → C (with data transformation at each step)
 *   - Scatter-Gather: A scatters to [B, C, D], gathers results
 *
 * Integration:
 *   - Works with AgentCollaborationService for multi-agent coordination
 *   - Uses UnifiedConnectorRegistry for tool routing
 *   - Leverages AgentOrchestratorService for pipeline management
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { AgentRegistryService } from '../../agent/registry/agent-registry.service';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import { AgentHealthService } from './agent-health.service';
import { ClusterType } from '../../agent/entities/agent.entity';
import { BaseAgent, AgentContext, AgentResult } from '../../agent/agent.abstract';

// ─── Cross-Cluster Types ────────────────────────────────────────

export type CoordinationPattern =
  | 'sequential'
  | 'parallel'
  | 'fan-out'
  | 'fan-in'
  | 'pipeline'
  | 'scatter-gather';

export interface ClusterTask {
  id: string;
  cluster: ClusterType;
  description: string;
  requiredCapabilities: string[];
  input?: any;
  priority: number;
  timeoutMs: number;
}

export interface ClusterResult {
  taskId: string;
  cluster: ClusterType;
  agentKey: string;
  success: boolean;
  data?: any;
  error?: string;
  durationMs: number;
}

export interface CoordinationPlan {
  id: string;
  pattern: CoordinationPattern;
  tasks: ClusterTask[];
  executionWaves: ClusterTask[][];
  estimatedDurationMs: number;
  clusterUtilization: Record<ClusterType, number>;
}

export interface CoordinationResult {
  planId: string;
  pattern: CoordinationPattern;
  results: ClusterResult[];
  totalDurationMs: number;
  successCount: number;
  failureCount: number;
  clusterMetrics: Record<ClusterType, {
    tasksExecuted: number;
    successRate: number;
    avgDurationMs: number;
  }>;
}

export interface ClusterHealthInfo {
  cluster: ClusterType;
  agentCount: number;
  availableAgents: number;
  avgLoad: number;
  circuitBreakerStatus: 'closed' | 'open' | 'half_open';
  lastHealthCheck: number;
}

// ─── Cluster Capability Mapping ──────────────────────────────────

const CLUSTER_CAPABILITIES: Record<ClusterType, string[]> = {
  [ClusterType.BROWSER]: ['navigation', 'scraping', 'form-filling', 'screenshot', 'browser-automation', 'web-interaction'],
  [ClusterType.COMPUTER]: ['file-operations', 'process-management', 'system-ops', 'screenshot', 'clipboard'],
  [ClusterType.CODING]: ['code-generation', 'code-analysis', 'refactoring', 'debugging', 'testing', 'documentation', 'git', 'github'],
  [ClusterType.OFFICE]: ['documents', 'spreadsheets', 'presentations', 'email', 'calendar', 'pdf'],
  [ClusterType.MARKETING]: ['content-creation', 'seo', 'social-media', 'campaigns', 'analytics', 'copywriting'],
  [ClusterType.BUSINESS]: ['reporting', 'dashboards', 'data-analysis', 'forecasting', 'kpi', 'crm'],
  [ClusterType.INFRASTRUCTURE]: ['deployment', 'monitoring', 'scaling', 'containers', 'ci-cd', 'networking'],
  [ClusterType.SECURITY]: ['vulnerability-scanning', 'authentication', 'encryption', 'audit', 'compliance', 'threat-detection'],
  [ClusterType.META_INTELLIGENCE]: ['orchestration', 'optimization', 'learning', 'adaptation', 'meta-reasoning'],
  [ClusterType.LLM_INTELLIGENCE]: ['llm-operations', 'prompt-engineering', 'model-selection', 'token-optimization'],
  [ClusterType.INTELLIGENT_ORCHESTRATION]: ['workflow-design', 'task-routing', 'resource-allocation', 'pipeline-optimization'],
  [ClusterType.WATCHDOG]: ['health-monitoring', 'anomaly-detection', 'alerting', 'recovery', 'circuit-breaker'],
  [ClusterType.SELF_EVOLUTION]: ['self-improvement', 'code-modification', 'pattern-learning', 'evolution'],
  [ClusterType.CERTIFICATION]: ['quality-assurance', 'testing', 'auditing', 'certification', 'compliance-check'],
  [ClusterType.STEALTH_OPS]: ['stealth-navigation', 'fingerprint-spoofing', 'proxy-rotation', 'anti-detection', 'covert-ops'],
  [ClusterType.DATA_INTELLIGENCE]: ['DataPipelineAgent', 'DataWarehouseAgent', 'RealTimeAnalyticsAgent', 'DataQualityAgent', 'MLPipelineAgent'],
  [ClusterType.COMMUNICATION]: ['APIGatewayAgent', 'WebhookAgent', 'NotificationAgent', 'WebSocketAgent'],
};

// ─── Service ─────────────────────────────────────────────────────

@Injectable()
export class CrossClusterCoordinatorService {
  private readonly logger = new Logger(CrossClusterCoordinatorService.name);

  /** Active coordination plans */
  private readonly activePlans = new Map<string, CoordinationPlan>();

  /** Coordination history */
  private readonly history: CoordinationResult[] = [];
  private readonly MAX_HISTORY = 200;

  /** Cluster health cache */
  private readonly clusterHealthCache = new Map<ClusterType, ClusterHealthInfo>();

  constructor(
    private readonly registry: AgentRegistryService,
    private readonly eventBus: AgentEventBusService,
    private readonly memory: AgentMemoryService,
    @Optional() private readonly healthService: AgentHealthService,
  ) {}

  // ─── Public API ───────────────────────────────────────────────

  /**
   * Create a coordination plan for a set of cross-cluster tasks.
   *
   * Automatically determines the best coordination pattern based on
   * task dependencies and cluster requirements.
   */
  createCoordinationPlan(tasks: ClusterTask[]): CoordinationPlan {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Determine coordination pattern
    const pattern = this.determinePattern(tasks);

    // Compute execution waves
    const executionWaves = this.computeWaves(tasks, pattern);

    // Calculate cluster utilization
    const clusterUtilization = this.calculateClusterUtilization(tasks);

    // Estimate total duration
    const estimatedDurationMs = executionWaves.reduce(
      (sum, wave) => sum + Math.max(...wave.map((t) => t.timeoutMs)),
      0,
    );

    const plan: CoordinationPlan = {
      id: planId,
      pattern,
      tasks,
      executionWaves,
      estimatedDurationMs,
      clusterUtilization,
    };

    this.activePlans.set(planId, plan);

    this.logger.log({
      msg: 'Created coordination plan',
      planId,
      pattern,
      taskCount: tasks.length,
      waveCount: executionWaves.length,
      clusters: [...new Set(tasks.map((t) => t.cluster))],
    });

    return plan;
  }

  /**
   * Execute a coordination plan.
   */
  async executeCoordinationPlan(plan: CoordinationPlan): Promise<CoordinationResult> {
    const startTime = Date.now();
    const results: ClusterResult[] = [];

    this.eventBus.emit(AgentEventType.AGENT_STARTED, 'cross-cluster', {
      planId: plan.id,
      pattern: plan.pattern,
      taskCount: plan.tasks.length,
    });

    for (let waveIndex = 0; waveIndex < plan.executionWaves.length; waveIndex++) {
      const wave = plan.executionWaves[waveIndex];

      this.logger.debug({
        msg: `Executing wave ${waveIndex + 1}/${plan.executionWaves.length}`,
        planId: plan.id,
        tasksInWave: wave.length,
      });

      // Execute wave tasks (parallel within wave)
      const waveResults = await this.executeWave(wave, results);
      results.push(...waveResults);

      // Check if we should stop (all critical tasks failed)
      const criticalFailed = wave.some(
        (task) => task.priority === 1 && waveResults.find(
          (r) => r.taskId === task.id && !r.success,
        ),
      );
      if (criticalFailed) {
        this.logger.warn(`Critical task failed in wave ${waveIndex + 1} — stopping coordination`);
        break;
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    // Calculate cluster metrics
    const clusterMetrics = this.calculateClusterMetrics(results);

    const result: CoordinationResult = {
      planId: plan.id,
      pattern: plan.pattern,
      results,
      totalDurationMs: Date.now() - startTime,
      successCount,
      failureCount,
      clusterMetrics,
    };

    // Store in memory
    await this.memory.store(
      plan.id,
      MemoryTier.SESSION,
      'coordination_result',
      this.serializeResult(result),
    );

    // Add to history
    this.history.push(result);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    // Clean up
    this.activePlans.delete(plan.id);

    this.eventBus.emit(AgentEventType.AGENT_COMPLETED, 'cross-cluster', {
      planId: plan.id,
      successCount,
      failureCount,
      durationMs: result.totalDurationMs,
    });

    return result;
  }

  /**
   * Convenience method: create and execute a coordination plan in one call.
   */
  async coordinate(tasks: ClusterTask[]): Promise<CoordinationResult> {
    const plan = this.createCoordinationPlan(tasks);
    return this.executeCoordinationPlan(plan);
  }

  /**
   * Get the health status of all clusters.
   */
  getClusterHealth(): ClusterHealthInfo[] {
    const healthInfos: ClusterHealthInfo[] = [];

    for (const clusterType of Object.values(ClusterType)) {
      const agents = this.registry.getByCluster(clusterType);
      const available = agents.filter((a: BaseAgent) => a.getStatus() === 'idle' || a.getStatus() === 'running');

      const cached = this.clusterHealthCache.get(clusterType);
      let avgLoad = 0;
      if (this.healthService) {
        const loads = agents.map((a: BaseAgent) => {
          const m = this.healthService.getMetrics(a.name);
          return m ? (m.totalExecutions > 0 ? m.avgDurationMs / 1000 : 0) : 0;
        });
        avgLoad = loads.length > 0 ? loads.reduce((a: number, b: number) => a + b, 0) / loads.length : 0;
      }

      const info: ClusterHealthInfo = {
        cluster: clusterType,
        agentCount: agents.length,
        availableAgents: available.length,
        avgLoad,
        circuitBreakerStatus: cached?.circuitBreakerStatus ?? 'closed',
        lastHealthCheck: Date.now(),
      };

      this.clusterHealthCache.set(clusterType, info);
      healthInfos.push(info);
    }

    return healthInfos;
  }

  /**
   * Find the best cluster for a given set of capabilities.
   */
  findBestCluster(capabilities: string[]): ClusterType | null {
    let bestCluster: ClusterType | null = null;
    let bestScore = -1;

    for (const [cluster, clusterCaps] of Object.entries(CLUSTER_CAPABILITIES)) {
      const matchCount = capabilities.filter((cap) =>
        clusterCaps.some((cc) => cc.includes(cap.toLowerCase()) || cap.toLowerCase().includes(cc)),
      ).length;

      const score = matchCount / Math.max(capabilities.length, 1);

      // Bonus for cluster health
      const health = this.clusterHealthCache.get(cluster as ClusterType);
      const healthBonus = health
        ? (health.availableAgents / Math.max(health.agentCount, 1)) * 0.3
        : 0;

      const totalScore = score + healthBonus;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestCluster = cluster as ClusterType;
      }
    }

    return bestCluster;
  }

  /**
   * Get coordination history.
   */
  getHistory(limit?: number): CoordinationResult[] {
    return limit ? this.history.slice(-limit) : [...this.history];
  }

  // ─── Private Helpers ──────────────────────────────────────────

  /**
   * Determine the best coordination pattern for a set of tasks.
   */
  private determinePattern(tasks: ClusterTask[]): CoordinationPattern {
    const uniqueClusters = new Set(tasks.map((t) => t.cluster));

    // Single cluster → sequential or parallel based on dependencies
    if (uniqueClusters.size === 1) {
      return tasks.every((t) => t.priority === tasks[0].priority)
        ? 'parallel'
        : 'sequential';
    }

    // All tasks independent → parallel
    if (tasks.every((t) => t.priority === 1)) {
      return 'parallel';
    }

    // Check for fan-out pattern: one task feeds multiple
    const highPriority = tasks.filter((t) => t.priority === 1);
    const lowPriority = tasks.filter((t) => t.priority > 1);
    if (highPriority.length === 1 && lowPriority.length > 1) {
      return 'fan-out';
    }

    // Check for fan-in pattern: multiple tasks feed one
    if (highPriority.length > 1 && lowPriority.length === 1) {
      return 'fan-in';
    }

    // Check for scatter-gather: multiple tasks scatter to different clusters,
    // results gathered by one
    if (uniqueClusters.size >= 3) {
      return 'scatter-gather';
    }

    // Default to pipeline for multi-cluster sequential work
    return 'pipeline';
  }

  /**
   * Compute execution waves based on pattern and task dependencies.
   */
  private computeWaves(tasks: ClusterTask[], pattern: CoordinationPattern): ClusterTask[][] {
    switch (pattern) {
      case 'parallel':
        return [tasks]; // All in one wave

      case 'sequential':
        return tasks.sort((a, b) => a.priority - b.priority).map((t) => [t]);

      case 'fan-out': {
        const source = tasks.filter((t) => t.priority === 1);
        const targets = tasks.filter((t) => t.priority > 1);
        return [source, targets];
      }

      case 'fan-in': {
        const sources = tasks.filter((t) => t.priority === 1);
        const target = tasks.filter((t) => t.priority > 1);
        return [sources, target];
      }

      case 'pipeline':
        return tasks
          .sort((a, b) => a.priority - b.priority)
          .reduce((waves: ClusterTask[][], task) => {
            // Group tasks of same priority into same wave
            const lastWave = waves[waves.length - 1];
            if (lastWave && lastWave[0]?.priority === task.priority) {
              lastWave.push(task);
            } else {
              waves.push([task]);
            }
            return waves;
          }, []);

      case 'scatter-gather': {
        // First wave: scatter to all clusters
        const scatter = tasks.filter((t) => t.priority <= 2);
        // Second wave: gather results
        const gather = tasks.filter((t) => t.priority > 2);
        return gather.length > 0 ? [scatter, gather] : [scatter];
      }

      default:
        return [tasks];
    }
  }

  /**
   * Execute a wave of tasks (in parallel within the wave).
   */
  private async executeWave(
    wave: ClusterTask[],
    previousResults: ClusterResult[],
  ): Promise<ClusterResult[]> {
    const executionPromises = wave.map(async (task) => {
      // Find best agent in the task's cluster
      const agent = this.findBestAgentInCluster(task.cluster, task.requiredCapabilities);

      if (!agent) {
        return {
          taskId: task.id,
          cluster: task.cluster,
          agentKey: 'none',
          success: false,
          error: `No available agent in cluster ${task.cluster} with capabilities: ${task.requiredCapabilities.join(', ')}`,
          durationMs: 0,
        } as ClusterResult;
      }

      // Build context with previous results as input
      const context: AgentContext = {
        agentId: agent.name,
        tenantId: 'system',
        config: {
          taskDescription: task.description,
          requiredCapabilities: task.requiredCapabilities,
          input: task.input,
          previousResults: previousResults
            .filter((r) => r.success)
            .map((r) => ({ taskId: r.taskId, data: r.data })),
        },
      };

      try {
        const result = await this.withTimeout(
          agent.wrapExecution(context),
          task.timeoutMs,
        );

        return {
          taskId: task.id,
          cluster: task.cluster,
          agentKey: agent.name,
          success: result.success,
          data: result.data,
          error: result.error,
          durationMs: result.duration ?? 0,
        };
      } catch (error: any) {
        return {
          taskId: task.id,
          cluster: task.cluster,
          agentKey: agent.name,
          success: false,
          error: error.message,
          durationMs: 0,
        };
      }
    });

    const settled = await Promise.allSettled(executionPromises);

    return settled.map((outcome) => {
      if (outcome.status === 'fulfilled') {
        return outcome.value;
      }
      return {
        taskId: 'unknown',
        cluster: ClusterType.WATCHDOG,
        agentKey: 'none',
        success: false,
        error: outcome.reason?.message ?? 'Unknown error',
        durationMs: 0,
      };
    });
  }

  /**
   * Find the best agent within a specific cluster.
   */
  private findBestAgentInCluster(
    cluster: ClusterType,
    capabilities: string[],
  ): BaseAgent | null {
    const agents = this.registry.getByCluster(cluster);
    let bestAgent: BaseAgent | null = null;
    let bestScore = -1;

    for (const agent of agents) {
      let score = 0;

      // Capability matching
      const capMatch = capabilities.filter((cap) =>
        agent.capabilities.some((ac: string) =>
          ac.toLowerCase().includes(cap.toLowerCase()) ||
          cap.toLowerCase().includes(ac.toLowerCase()),
        ),
      ).length;
      score += capMatch * 10;

      // Health bonus
      if (this.healthService) {
        const metrics = this.healthService.getMetrics(agent.name);
        if (metrics) {
          score += metrics.successRate * 15;
        }
      }

      // Status bonus (prefer idle agents)
      if (agent.getStatus() === 'idle') score += 5;

      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  /**
   * Calculate cluster utilization for a set of tasks.
   */
  private calculateClusterUtilization(tasks: ClusterTask[]): Record<ClusterType, number> {
    const utilization: Record<ClusterType, number> = {} as any;

    for (const task of tasks) {
      utilization[task.cluster] = (utilization[task.cluster] ?? 0) + 1;
    }

    return utilization;
  }

  /**
   * Calculate per-cluster metrics from results.
   */
  private calculateClusterMetrics(
    results: ClusterResult[],
  ): Record<ClusterType, { tasksExecuted: number; successRate: number; avgDurationMs: number }> {
    const metrics: Record<string, { tasks: number; successes: number; totalDuration: number }> = {};

    for (const result of results) {
      if (!metrics[result.cluster]) {
        metrics[result.cluster] = { tasks: 0, successes: 0, totalDuration: 0 };
      }
      metrics[result.cluster].tasks++;
      if (result.success) metrics[result.cluster].successes++;
      metrics[result.cluster].totalDuration += result.durationMs;
    }

    const output: any = {};
    for (const [cluster, data] of Object.entries(metrics)) {
      output[cluster] = {
        tasksExecuted: data.tasks,
        successRate: data.tasks > 0 ? data.successes / data.tasks : 0,
        avgDurationMs: data.tasks > 0 ? Math.round(data.totalDuration / data.tasks) : 0,
      };
    }

    return output;
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); },
      );
    });
  }

  private serializeResult(result: CoordinationResult): Record<string, any> {
    return {
      planId: result.planId,
      pattern: result.pattern,
      successCount: result.successCount,
      failureCount: result.failureCount,
      totalDurationMs: result.totalDurationMs,
      clusterMetrics: result.clusterMetrics,
    };
  }
}
