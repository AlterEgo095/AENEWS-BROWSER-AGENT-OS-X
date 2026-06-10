import { Injectable, Logger } from '@nestjs/common';
import { BaseAgent, AgentContext, AgentResult } from '../agent.abstract';
import { ClusterType, AgentStatus } from '../entities/agent.entity';

@Injectable()
export class AgentRegistryService {
  private readonly logger = new Logger(AgentRegistryService.name);
  private readonly agents: Map<string, BaseAgent> = new Map();
  private readonly clusterAgents: Map<ClusterType, Set<string>> = new Map();

  constructor() {
    Object.values(ClusterType).forEach((cluster) => {
      this.clusterAgents.set(cluster as ClusterType, new Set());
    });
  }

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
    this.logger.log(`Registered agent: ${key} (v${agent.version})`);
  }

  /**
   * Remove an agent from the registry.
   */
  unregister(agent: BaseAgent): void {
    const key = `${agent.cluster}:${agent.name}`;
    this.agents.delete(key);
    this.clusterAgents.get(agent.cluster)?.delete(key);
    this.logger.log(`Unregistered agent: ${key}`);
  }

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

  /**
   * Execute an agent by its registry key within a given context.
   * Validates that the agent exists and is not already running before delegating
   * to the agent's wrapExecution lifecycle wrapper.
   */
  async executeAgent(key: string, context: AgentContext): Promise<AgentResult> {
    const agent = this.agents.get(key);
    if (!agent) {
      throw new Error(`Agent not found: ${key}`);
    }
    if (agent.getStatus() === AgentStatus.RUNNING) {
      throw new Error(`Agent ${key} is already running`);
    }
    return agent.wrapExecution(context);
  }

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
}
