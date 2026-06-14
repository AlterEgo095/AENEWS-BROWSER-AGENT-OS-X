import { Injectable, Logger, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { BaseAgent, AgentContext, AgentResult } from '../agent.abstract';
import { ClusterType, AgentStatus } from '../entities/agent.entity';

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

  constructor(private readonly moduleRef: ModuleRef) {
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
   */
  getByCluster(cluster: ClusterType): BaseAgent[] {
    const keys = this.clusterAgents.get(cluster) || new Set();
    return Array.from(keys)
      .map((key) => this.agents.get(key))
      .filter((agent): agent is BaseAgent => agent !== undefined);
  }

  /**
   * Retrieve all registered agents.
   */
  getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  // ─── Best Agent Selection ──────────────────────────────────────

  /**
   * Find the best agent for the given selection criteria.
   *
   * Selection algorithm:
   *   1. Filter by cluster type if specified
   *   2. Filter by capabilities if specified (agent must have at least one match)
   *   3. Exclude specified agent keys
   *   4. Score each candidate:
   *      - Capability match: how many required capabilities the agent has
   *      - Health score: penalize degraded/unhealthy agents (from AgentHealthService)
   *      - Load score: prefer agents with fewer active executions (least-loaded)
   *      - Priority weighting: higher priority tasks prefer more capable agents
   *   5. Return the highest-scoring agent, or null if no match
   *
   * Graceful fallback: works even without AgentHealthService — health
   * scoring is skipped and selection relies on load + capability only.
   *
   * Fallback strategy: if no agent matches all capabilities, returns
   * the closest match (agent with the most capability overlap).
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
    const filtered = capabilityFiltered.filter((agent) => {
      const key = `${agent.cluster}:${agent.name}`;
      return !excludeSet.has(key);
    });

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
   */
  async executeAgent(key: string, context: AgentContext): Promise<AgentResult> {
    const agent = this.agents.get(key);
    if (!agent) {
      throw new Error(`Agent not found: ${key}`);
    }
    if (agent.getStatus() === AgentStatus.RUNNING) {
      throw new Error(`Agent ${key} is already running`);
    }

    this.incrementActiveExecutions(key);
    try {
      const result = await agent.wrapExecution(context);
      return result;
    } finally {
      this.decrementActiveExecutions(key);
    }
  }

  // ─── Statistics ────────────────────────────────────────────────

  /**
   * Compute per-cluster statistics: total agents, idle count, running count, error count.
   */
  getClusterStats(): Record<
    string,
    { total: number; idle: number; running: number; error: number }
  > {
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
