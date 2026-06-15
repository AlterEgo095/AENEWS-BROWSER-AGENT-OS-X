import { Injectable, Logger, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { BaseAgent, AgentContext, AgentResult } from '../agent.abstract';
import { ClusterType, AgentStatus } from '../entities/agent.entity';
import {
  CircuitBreakerService,
  CircuitState,
  CIRCUIT_KEY_PREFIX,
} from '../../agent-framework/services/circuit-breaker.service';
import { AgentRegistryCache } from './agent-registry-cache.service';

// ─── Agent Selection Criteria ────────────────────────────────────

export interface AgentSelectionCriteria {
  /** Filter by cluster type if specified */
  clusterType?: ClusterType;
  /** Required capabilities — agent must have at least one matching capability */
  capabilities?: string[];
  /** Priority of the task — influences agent selection weighting */
  priority?: 'low' | 'medium' | 'high' | 'critical';
  /** Agent keys to exclude from selection */
  excludeAgentKeys?: string[];
}

// ─── Agent Score (internal) ──────────────────────────────────────

interface AgentScore {
  key: string;
  agent: BaseAgent;
  score: number;
  capabilityMatch: number;
  healthPenalty: number;
  loadPenalty: number;
  priorityBonus: number;
  circuitBreakerPenalty: number;
}

// ─── Health Snapshot ─────────────────────────────────────────────

export interface AgentHealthSnapshot {
  agentId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  successRate: number;
  consecutiveFailures: number;
}

// ─── Service ─────────────────────────────────────────────────────

@Injectable()
export class AgentRegistryService {
  private readonly logger = new Logger(AgentRegistryService.name);
  private readonly agents: Map<string, BaseAgent> = new Map();
  private readonly clusterAgents: Map<ClusterType, Set<string>> = new Map();

  /** Track concurrent executions per agent key */
  private readonly activeExecutions = new Map<string, number>();

  /** Lazily-resolved health service (optional) */
  private healthService: any = null;
  private healthServiceResolved = false;

  /** Lazily-resolved credit service (optional) */
  private creditService: any = null;
  private creditServiceResolved = false;

  constructor(
    private readonly moduleRef: ModuleRef,
    @Optional() private readonly circuitBreakerService: CircuitBreakerService,
    @Optional() private readonly registryCache: AgentRegistryCache,
  ) {
    Object.values(ClusterType).forEach((cluster) => {
      this.clusterAgents.set(cluster as ClusterType, new Set());
    });
  }

  // ─── Lazy Health Service Resolution ────────────────────────────

  /**
   * Lazily resolve the AgentHealthService from the DI container.
   * Uses ModuleRef to avoid hard circular dependencies.
   * If the health module is not loaded, gracefully falls back.
   */
  private resolveHealthService(): any {
    if (this.healthServiceResolved) return this.healthService;

    try {
      // Dynamic import to avoid hard dep; health module may not be loaded
      const { AgentHealthService } = require('../../agent-framework/services/agent-health.service');
      this.healthService = this.moduleRef.get(AgentHealthService, { strict: false });
      this.healthServiceResolved = true;

      if (this.healthService) {
        this.logger.debug('AgentHealthService connected to AgentRegistryService');
      }
    } catch {
      this.healthServiceResolved = true; // don't retry on every call
      this.healthService = null;
    }

    return this.healthService;
  }

  // ─── Lazy Credit Service Resolution ─────────────────────────────

  /**
   * Lazily resolve the CreditService from the DI container.
   * Uses ModuleRef to avoid hard circular dependencies.
   * If the credit module is not loaded, gracefully falls back.
   */
  private resolveCreditService(): any {
    if (this.creditServiceResolved) return this.creditService;

    try {
      const { CreditService } = require('../../credit/credit.service');
      this.creditService = this.moduleRef.get(CreditService, { strict: false });
      this.creditServiceResolved = true;

      if (this.creditService) {
        this.logger.debug('CreditService connected to AgentRegistryService');
      }
    } catch {
      this.creditServiceResolved = true; // don't retry on every call
      this.creditService = null;
    }

    return this.creditService;
  }

  /**
   * Get health snapshot for an agent. Returns null if health service
   * is unavailable or the agent has no health data.
   */
  private getHealthSnapshot(agentKey: string): AgentHealthSnapshot | null {
    const healthService = this.resolveHealthService();
    if (!healthService) return null;

    try {
      const health = healthService.getHealth(agentKey);
      if (health) {
        return {
          agentId: health.agentId,
          status: health.status,
          successRate: health.successRate,
          consecutiveFailures: health.consecutiveFailures,
        };
      }
    } catch {
      // Graceful fallback — don't let health check failures affect selection
    }

    return null;
  }

  // ─── Registration ──────────────────────────────────────────────

  /**
   * Register an agent instance into the registry.
   * The key is composed of `{cluster}:{name}` to ensure uniqueness across clusters.
   */
  register(agent: BaseAgent): void {
    const key = `${agent.cluster}:${agent.name}`;

    if (this.agents.has(key)) {
      this.logger.warn(
        `Agent ${key} is already registered. Overwriting with new instance (v${agent.version}).`,
      );
    }

    this.agents.set(key, agent);
    this.clusterAgents.get(agent.cluster)?.add(key);
    this.activeExecutions.set(key, 0);
    this.logger.log(`Registered agent: ${key} (v${agent.version})`);

    // Invalidate cache on registration
    this.registryCache?.invalidateAll();
  }

  /**
   * Remove an agent from the registry.
   */
  unregister(agent: BaseAgent): void {
    const key = `${agent.cluster}:${agent.name}`;
    this.agents.delete(key);
    this.clusterAgents.get(agent.cluster)?.delete(key);
    this.activeExecutions.delete(key);
    this.logger.log(`Unregistered agent: ${key}`);

    // Invalidate cache on unregistration
    this.registryCache?.invalidateAll();
  }

  // ─── Basic Lookup ──────────────────────────────────────────────

  /**
   * Retrieve a single agent by its registry key (`cluster:name`).
   */
  get(key: string): BaseAgent | undefined {
    return this.agents.get(key);
  }

  /**
   * Retrieve all agents belonging to a specific cluster.
   * Results are cached for performance.
   */
  getByCluster(cluster: ClusterType): BaseAgent[] {
    const cacheKey = `cluster:${cluster}`;
    const cached = this.registryCache?.get<BaseAgent[]>(cacheKey);
    if (cached) return cached;

    const keys = this.clusterAgents.get(cluster) || new Set();
    const result = Array.from(keys)
      .map((key) => this.agents.get(key))
      .filter((agent): agent is BaseAgent => agent !== undefined);

    this.registryCache?.set(cacheKey, result);
    return result;
  }

  /**
   * Retrieve all registered agents.
   * Results are cached for performance.
   */
  getAll(): BaseAgent[] {
    const cached = this.registryCache?.get<BaseAgent[]>('all:agents');
    if (cached) return cached;

    const result = Array.from(this.agents.values());
    this.registryCache?.set('all:agents', result);
    return result;
  }

  // ─── Best Agent Selection ──────────────────────────────────────

  /**
   * Find the best agent for the given selection criteria.
   *
   * Selection algorithm:
   *   1. Filter by cluster type if specified
   *   2. Filter by capabilities if specified (agent must have at least one match)
   *   3. Exclude specified agent keys
   *   4. **Skip agents with OPEN circuit breakers**
   *   5. Score each candidate:
   *      - Capability match: how many required capabilities the agent has
   *      - Health score: penalize degraded/unhealthy agents (from AgentHealthService)
   *      - **Circuit breaker score: penalize agents with recent circuit openings**
   *      - Load score: prefer agents with fewer active executions (least-loaded)
   *      - Priority weighting: higher priority tasks prefer more capable agents
   *   6. Return the highest-scoring agent, or null if no match
   *
   * Circuit Breaker Integration:
   *   - Agents with OPEN circuits are completely skipped (unavailable)
   *   - Agents with HALF_OPEN circuits get a moderate penalty (testing recovery)
   *   - Agents with recent circuit state changes get a penalty (instability signal)
   *
   * Graceful fallback: works even without AgentHealthService or CircuitBreakerService.
   */
  findBestAgent(criteria: AgentSelectionCriteria): BaseAgent | null {
    const {
      clusterType,
      capabilities,
      priority = 'medium',
      excludeAgentKeys = [],
    } = criteria;

    // ── Step 1: Start with all agents or filtered by cluster ──
    let candidates = clusterType
      ? this.getByCluster(clusterType)
      : this.getAll();

    if (candidates.length === 0) {
      this.logger.warn(
        `No agents found${clusterType ? ` in cluster ${clusterType}` : ''} for findBestAgent`,
      );
      return null;
    }

    // ── Step 2: Filter by capabilities (soft match: at least one) ──
    let capabilityFiltered = candidates;
    if (capabilities && capabilities.length > 0) {
      capabilityFiltered = candidates.filter((agent) =>
        capabilities.some((cap) => agent.capabilities.includes(cap)),
      );

      // If no exact match, fall back to closest match (most capability overlap)
      if (capabilityFiltered.length === 0) {
        this.logger.warn(
          `No agent matches capabilities [${capabilities.join(', ')}]. ` +
            `Falling back to closest match.`,
        );

        // Score by capability overlap count
        const scored = candidates
          .map((agent) => {
            const overlap = capabilities.filter((cap) =>
              agent.capabilities.includes(cap),
            ).length;
            return { agent, overlap };
          })
          .sort((a, b) => b.overlap - a.overlap);

        if (scored.length > 0 && scored[0].overlap > 0) {
          capabilityFiltered = [scored[0].agent];
        } else {
          // Truly no overlap — return the first agent as last resort
          capabilityFiltered = [candidates[0]];
        }
      }
    }

    // ── Step 3: Exclude specified agent keys ──
    const excludeSet = new Set(excludeAgentKeys);
    let filtered = capabilityFiltered.filter((agent) => {
      const key = `${agent.cluster}:${agent.name}`;
      return !excludeSet.has(key);
    });

    // ── Step 3.5: Filter out agents with OPEN circuits ──
    if (this.circuitBreakerService) {
      const beforeCount = filtered.length;
      filtered = filtered.filter((agent) => {
        const key = `${agent.cluster}:${agent.name}`;
        const circuitKey = `${CIRCUIT_KEY_PREFIX.CLUSTER}:${agent.cluster}`;
        // Check both the cluster circuit and a potential agent-specific circuit
        const clusterCircuitOpen = this.circuitBreakerService.isOpen(circuitKey);
        const agentCircuitKey = `agent:${key}`;
        const agentCircuitOpen = this.circuitBreakerService.isOpen(agentCircuitKey);

        if (clusterCircuitOpen || agentCircuitOpen) {
          this.logger.debug(
            `Agent "${key}" skipped — circuit breaker is OPEN ` +
              `(cluster: ${clusterCircuitOpen}, agent: ${agentCircuitOpen})`,
          );
          return false;
        }
        return true;
      });

      if (filtered.length === 0 && beforeCount > 0) {
        this.logger.warn(
          `All ${beforeCount} candidate agents have OPEN circuit breakers — ` +
            `no agent available for selection`,
        );
        return null;
      }
    }

    if (filtered.length === 0) {
      this.logger.warn('All agents excluded by criteria — no candidate available');
      return null;
    }

    // ── Step 4: Score each candidate ──
    const scored: AgentScore[] = filtered.map((agent) => {
      const key = `${agent.cluster}:${agent.name}`;

      // Capability match: fraction of required capabilities the agent has
      let capabilityMatch = 1.0;
      if (capabilities && capabilities.length > 0) {
        const matched = capabilities.filter((cap) =>
          agent.capabilities.includes(cap),
        ).length;
        capabilityMatch = matched / capabilities.length;
      }

      // Health penalty: 0 for healthy, -0.3 for degraded, -0.7 for unhealthy
      let healthPenalty = 0;
      const healthSnapshot = this.getHealthSnapshot(key);
      if (healthSnapshot) {
        if (healthSnapshot.status === 'unhealthy') {
          healthPenalty = 0.7;
        } else if (healthSnapshot.status === 'degraded') {
          healthPenalty = 0.3;
        }
        // Also penalize low success rate
        if (healthSnapshot.successRate < 0.5) {
          healthPenalty += 0.2;
        }
      } else {
        // No health data — small penalty for unknown health
        healthPenalty = 0.05;
      }

      // Circuit breaker penalty: penalize agents with recent circuit activity
      let circuitBreakerPenalty = 0;
      if (this.circuitBreakerService) {
        const agentCircuitKey = `agent:${key}`;
        const agentCircuitState = this.circuitBreakerService.getState(agentCircuitKey);

        if (agentCircuitState.state === CircuitState.HALF_OPEN) {
          // Agent is recovering — moderate penalty
          circuitBreakerPenalty = 0.3;
        } else if (agentCircuitState.totalFailures > 0) {
          // Agent has had failures — penalty proportional to failure rate
          const failureRate = agentCircuitState.totalFailures /
            Math.max(1, agentCircuitState.totalRequests);
          circuitBreakerPenalty = Math.min(0.5, failureRate * 0.5);
        }

        // Also check cluster-level circuit
        const clusterCircuitKey = `${CIRCUIT_KEY_PREFIX.CLUSTER}:${agent.cluster}`;
        const clusterCircuitState = this.circuitBreakerService.getState(clusterCircuitKey);
        if (clusterCircuitState.state === CircuitState.HALF_OPEN) {
          circuitBreakerPenalty += 0.15; // cluster is recovering — small additional penalty
        } else if (clusterCircuitState.totalFailures > 0) {
          const clusterFailureRate = clusterCircuitState.totalFailures /
            Math.max(1, clusterCircuitState.totalRequests);
          circuitBreakerPenalty += Math.min(0.2, clusterFailureRate * 0.2);
        }
      }

      // Load penalty: agents with more active executions get penalized
      const activeCount = this.activeExecutions.get(key) || 0;
      const loadPenalty = activeCount * 0.15;

      // Priority bonus: for higher priority tasks, agents with more capabilities
      // and better health get a bonus
      const priorityWeights: Record<string, number> = {
        low: 0,
        medium: 0.05,
        high: 0.15,
        critical: 0.25,
      };
      const priorityBonus =
        (priorityWeights[priority] || 0) * capabilityMatch * (1 - healthPenalty);

      // Agent status check: penalize non-idle agents
      let statusPenalty = 0;
      if (agent.getStatus() === AgentStatus.ERROR) {
        statusPenalty = 0.5;
      } else if (agent.getStatus() === AgentStatus.RUNNING) {
        statusPenalty = 0.2;
      } else if (agent.getStatus() === AgentStatus.STOPPED) {
        statusPenalty = 0.4;
      }

      const score =
        capabilityMatch -
        healthPenalty -
        circuitBreakerPenalty -
        loadPenalty -
        statusPenalty +
        priorityBonus;

      return {
        key,
        agent,
        score,
        capabilityMatch,
        healthPenalty,
        loadPenalty,
        priorityBonus,
        circuitBreakerPenalty,
      };
    });

    // ── Step 5: Sort by score descending ──
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];

    this.logger.log({
      step: 'findBestAgent',
      criteria: { clusterType, capabilities, priority },
      selectedKey: best.key,
      selectedScore: best.score,
      candidateCount: scored.length,
      capabilityMatch: best.capabilityMatch,
      healthPenalty: best.healthPenalty,
      loadPenalty: best.loadPenalty,
      priorityBonus: best.priorityBonus,
      circuitBreakerPenalty: best.circuitBreakerPenalty,
    });

    return best.agent;
  }

  // ─── Execution Tracking ────────────────────────────────────────

  /**
   * Increment the active execution counter for an agent.
   */
  incrementActiveExecutions(agentKey: string): void {
    const current = this.activeExecutions.get(agentKey) || 0;
    this.activeExecutions.set(agentKey, current + 1);
  }

  /**
   * Decrement the active execution counter for an agent.
   */
  decrementActiveExecutions(agentKey: string): void {
    const current = this.activeExecutions.get(agentKey) || 0;
    this.activeExecutions.set(agentKey, Math.max(0, current - 1));
  }

  /**
   * Get the current active execution count for an agent.
   */
  getActiveExecutionCount(agentKey: string): number {
    return this.activeExecutions.get(agentKey) || 0;
  }

  // ─── Agent Execution ───────────────────────────────────────────

  /**
   * Execute an agent by its registry key within a given context.
   * Validates that the agent exists and is not already running before delegating
   * to the agent's wrapExecution lifecycle wrapper.
   * Tracks active executions for load balancing.
   *
   * Circuit Breaker Integration:
   *   - Each agent execution is wrapped in a circuit breaker (`agent:{key}`)
   *   - If the circuit is OPEN, the execution is rejected with a meaningful error
   *   - On HALF_OPEN, the execution is allowed as a probe
   */
  async executeAgent(key: string, context: AgentContext): Promise<AgentResult> {
    const agent = this.agents.get(key);
    if (!agent) {
      throw new Error(`Agent not found: ${key}`);
    }
    if (agent.getStatus() === AgentStatus.RUNNING) {
      throw new Error(`Agent ${key} is already running`);
    }

    // Wrap execution in circuit breaker if available
    if (this.circuitBreakerService) {
      const circuitKey = `agent:${key}`;
      return this.circuitBreakerService.execute<AgentResult>(
        circuitKey,
        () => this.executeAgentInternal(key, agent, context),
        // Fallback: return a failed result when circuit is OPEN
        async () => ({
          success: false,
          error: `Agent "${key}" circuit breaker is OPEN — execution rejected. Will retry after circuit recovers.`,
          duration: 0,
        }),
      );
    }

    return this.executeAgentInternal(key, agent, context);
  }

  /**
   * Internal agent execution with tracking and credit integration.
   *
   * Credit Integration:
   *   - Before execution: Check if the user has enough credits for the agent's creditCost
   *   - If insufficient credits, throw an error with a descriptive message
   *   - After successful execution: Deduct the credits from the user's account
   *   - If credit service is unavailable, execution proceeds without credit checks
   */
  private async executeAgentInternal(
    key: string,
    agent: BaseAgent,
    context: AgentContext,
  ): Promise<AgentResult> {
    // ── Credit Check: Verify sufficient credits before execution ──
    const creditService = this.resolveCreditService();
    if (creditService) {
      const hasCredits = await creditService.hasCredits(context.tenantId, agent.creditCost);
      if (!hasCredits) {
        throw new Error(`Insufficient credits. Agent "${agent.name}" requires ${agent.creditCost} credits.`);
      }
    }

    this.incrementActiveExecutions(key);
    try {
      const result = await agent.wrapExecution(context);

      // ── Credit Deduction: Deduct credits after successful execution ──
      if (creditService && result.success) {
        try {
          await creditService.deductCredits(
            context.tenantId,
            agent.creditCost,
            agent.name,
            context.missionId,
            `Executed ${agent.name} (v${agent.version})`,
          );
        } catch (error: any) {
          // Log but don't fail the execution if credit deduction fails
          this.logger.warn(
            `Failed to deduct credits for agent ${key}: ${error.message}`,
          );
        }
      }

      return result;
    } finally {
      this.decrementActiveExecutions(key);
    }
  }

  // ─── Statistics ────────────────────────────────────────────────

  /**
   * Compute per-cluster statistics: total agents, idle count, running count, error count.
   * Results are cached for performance.
   */
  getClusterStats(): Record<
    string,
    { total: number; idle: number; running: number; error: number }
  > {
    const cached = this.registryCache?.get<Record<string, { total: number; idle: number; running: number; error: number }>>('stats:clusters');
    if (cached) return cached;

    const stats: Record<string, any> = {};
    for (const [cluster, keys] of this.clusterAgents.entries()) {
      const agents = Array.from(keys)
        .map((key) => this.agents.get(key))
        .filter((a): a is BaseAgent => a !== undefined);

      stats[cluster] = {
        total: agents.length,
        idle: agents.filter((a) => a.getStatus() === AgentStatus.IDLE).length,
        running: agents.filter((a) => a.getStatus() === AgentStatus.RUNNING)
          .length,
        error: agents.filter((a) => a.getStatus() === AgentStatus.ERROR)
          .length,
      };
    }

    this.registryCache?.set('stats:clusters', stats);
    return stats;
  }

  /**
   * Return the total number of registered agents.
   */
  getRegistrySize(): number {
    return this.agents.size;
  }

  /**
   * Get load distribution across all agents.
   * Returns a map of agent key → active execution count.
   */
  getLoadDistribution(): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const [key, count] of this.activeExecutions) {
      if (this.agents.has(key)) {
        dist[key] = count;
      }
    }
    return dist;
  }
}
