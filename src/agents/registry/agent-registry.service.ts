/**
 * AENEWS Agent OS X - Agent Registry Service
 * Central registry for all agents. Handles registration, discovery,
 * routing, health monitoring, failover, and initialization.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentConfig,
  AgentCluster,
  AgentState,
  AgentStatus,
  AgentCapability,
  AgentInput,
  TaskPriority,
} from '../interfaces/agent.interface';
import { AgentEventType } from '../interfaces/agent-event.interface';
import { BaseAgentService } from '../base/base-agent.service';
import { EventBusService } from '../events/event-bus.service';

// ─── Registry Entry ───────────────────────────────────────────────
interface RegistryEntry {
  agentInstance: BaseAgentService;
  config: AgentConfig;
  registeredAt: Date;
  lastHeartbeat: Date;
}

// ─── Routing Strategy ─────────────────────────────────────────────
export enum RoutingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_LOADED = 'least_loaded',
  RANDOM = 'random',
  CAPABILITY_BASED = 'capability_based',
  PRIORITY_BASED = 'priority_based',
}

// ─── Routing Result ───────────────────────────────────────────────
export interface RoutingResult {
  agentId: string;
  agentName: string;
  cluster: AgentCluster;
  reason: string;
}

@Injectable()
export class AgentRegistryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentRegistryService.name);
  private readonly registry: Map<string, RegistryEntry> = new Map();
  private readonly clusterIndex: Map<AgentCluster, Set<string>> = new Map();
  private readonly capabilityIndex: Map<string, Set<string>> = new Map();
  private readonly nameIndex: Map<string, string> = new Map();
  private roundRobinCounters: Map<string, number> = new Map();
  private heartbeatInterval: NodeJS.Timer | null = null;

  constructor(private readonly eventBusService: EventBusService) {
    // Initialize cluster index
    for (const cluster of Object.values(AgentCluster)) {
      this.clusterIndex.set(cluster, new Set());
    }
  }

  // ─── Module Lifecycle ────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    this.startHeartbeatMonitoring();
    this.logger.log('Agent Registry initialized');
  }

  async onModuleDestroy(): Promise<void> {
    this.stopHeartbeatMonitoring();
    this.logger.log('Agent Registry destroyed');
  }

  // ─── Registration ────────────────────────────────────────────────

  /**
   * Register an agent instance with the registry.
   */
  async register(agent: BaseAgentService): Promise<void> {
    const config = agent.getConfig();
    const existingEntry = this.registry.get(config.id);

    if (existingEntry) {
      this.logger.warn(`Agent ${config.id} already registered, updating entry`);
      await this.unregister(config.id);
    }

    const entry: RegistryEntry = {
      agentInstance: agent,
      config,
      registeredAt: new Date(),
      lastHeartbeat: new Date(),
    };

    this.registry.set(config.id, entry);

    // Update cluster index
    const clusterAgents = this.clusterIndex.get(config.cluster);
    if (clusterAgents) {
      clusterAgents.add(config.id);
    }

    // Update capability index
    for (const capability of config.capabilities) {
      if (!this.capabilityIndex.has(capability.name)) {
        this.capabilityIndex.set(capability.name, new Set());
      }
      this.capabilityIndex.get(capability.name)!.add(config.id);
    }

    // Update name index
    this.nameIndex.set(config.name, config.id);

    this.logger.log(`Registered agent: ${config.id} (${config.name}) in cluster ${config.cluster}`);

    this.eventBusService
      .publish({
        type: AgentEventType.AGENT_INITIALIZED,
        sourceAgentId: config.id,
        cluster: config.cluster,
        payload: {
          agentId: config.id,
          name: config.name,
          cluster: config.cluster,
          capabilities: config.capabilities.map((c) => c.name),
        },
        priority: 1,
        correlationId: uuidv4(),
        metadata: {},
      })
      .catch((err: Error) => {
        this.logger.warn(`Failed to publish registration event: ${err.message}`);
      });
  }

  /**
   * Unregister an agent from the registry.
   */
  async unregister(agentId: string): Promise<boolean> {
    const entry = this.registry.get(agentId);
    if (!entry) {
      return false;
    }

    const { config } = entry;

    // Remove from cluster index
    const clusterAgents = this.clusterIndex.get(config.cluster);
    if (clusterAgents) {
      clusterAgents.delete(agentId);
    }

    // Remove from capability index
    for (const capability of config.capabilities) {
      const capAgents = this.capabilityIndex.get(capability.name);
      if (capAgents) {
        capAgents.delete(agentId);
        if (capAgents.size === 0) {
          this.capabilityIndex.delete(capability.name);
        }
      }
    }

    // Remove from name index
    if (this.nameIndex.get(config.name) === agentId) {
      this.nameIndex.delete(config.name);
    }

    this.registry.delete(agentId);

    this.logger.log(`Unregistered agent: ${agentId} (${config.name})`);
    return true;
  }

  // ─── Agent Discovery ─────────────────────────────────────────────

  /**
   * Get an agent by its ID.
   * Primary lookup method matching the task spec.
   */
  get(agentId: string): BaseAgentService | undefined {
    const entry = this.registry.get(agentId);
    return entry?.agentInstance;
  }

  /**
   * Get an agent by its ID (alias for get, returns null instead of undefined).
   */
  getAgent(agentId: string): BaseAgentService | null {
    const entry = this.registry.get(agentId);
    return entry?.agentInstance ?? null;
  }

  /**
   * Get an agent by its name.
   */
  getAgentByName(name: string): BaseAgentService | null {
    const agentId = this.nameIndex.get(name);
    if (!agentId) return null;
    return this.getAgent(agentId);
  }

  /**
   * Get all agents in a specific cluster.
   * Primary cluster lookup method matching the task spec.
   */
  getByCluster(cluster: AgentCluster): BaseAgentService[] {
    const agentIds = this.clusterIndex.get(cluster);
    if (!agentIds) return [];

    return Array.from(agentIds)
      .map((id) => this.registry.get(id)?.agentInstance)
      .filter((agent): agent is BaseAgentService => agent !== undefined);
  }

  /**
   * Alias for getByCluster (existing API compatibility).
   */
  getAgentsByCluster(cluster: AgentCluster): BaseAgentService[] {
    return this.getByCluster(cluster);
  }

  /**
   * Get all agents that have a specific capability.
   * Primary capability lookup method matching the task spec.
   */
  getByCapability(capabilityName: string): BaseAgentService[] {
    const agentIds = this.capabilityIndex.get(capabilityName);
    if (!agentIds) return [];

    return Array.from(agentIds)
      .map((id) => this.registry.get(id)?.agentInstance)
      .filter((agent): agent is BaseAgentService => agent !== undefined);
  }

  /**
   * Alias for getByCapability (existing API compatibility).
   */
  getAgentsByCapability(capabilityName: string): BaseAgentService[] {
    return this.getByCapability(capabilityName);
  }

  /**
   * Get all registered agents.
   * Primary method matching the task spec.
   */
  getAll(): BaseAgentService[] {
    return Array.from(this.registry.values()).map((entry) => entry.agentInstance);
  }

  /**
   * Alias for getAll (existing API compatibility).
   */
  getAllAgents(): BaseAgentService[] {
    return this.getAll();
  }

  /**
   * Get all agent states.
   * Primary method matching the task spec.
   */
  getAllStates(): AgentState[] {
    return Array.from(this.registry.values()).map((entry) => entry.agentInstance.getState());
  }

  /**
   * Alias for getAllStates (existing API compatibility).
   */
  getAllAgentStates(): AgentState[] {
    return this.getAllStates();
  }

  /**
   * Get agents that can accept new tasks.
   */
  getAvailableAgents(cluster?: AgentCluster): BaseAgentService[] {
    const agents = cluster ? this.getByCluster(cluster) : this.getAll();

    return agents.filter((agent) => agent.canAcceptTask());
  }

  // ─── Best Agent Selection ────────────────────────────────────────

  /**
   * Find the best agent for a given capability and optional priority.
   * Selects the least-loaded agent that has the required capability and can accept tasks.
   *
   * @param capability - The capability name to search for
   * @param priority - Optional task priority to influence selection
   * @returns The best agent or undefined if none found
   */
  findBestAgent(capability: string, priority?: TaskPriority): BaseAgentService | undefined {
    // Find agents with the required capability
    const capableAgents = this.getByCapability(capability);
    if (capableAgents.length === 0) {
      this.logger.warn(`No agents found with capability: ${capability}`);
      return undefined;
    }

    // Filter to agents that can accept tasks
    const availableAgents = capableAgents.filter((agent) => agent.canAcceptTask());

    if (availableAgents.length === 0) {
      this.logger.warn(
        `No available agents with capability: ${capability} (all busy or unhealthy)`,
      );
      return undefined;
    }

    // If priority is specified, prefer agents with fewer current tasks for high priority
    if (priority !== undefined && priority >= TaskPriority.HIGH) {
      // For high priority tasks, select the agent with the fewest current tasks
      availableAgents.sort((a, b) => a.getCurrentTaskCount() - b.getCurrentTaskCount());
      return availableAgents[0];
    }

    // Default: least loaded selection
    availableAgents.sort((a, b) => a.getCurrentTaskCount() - b.getCurrentTaskCount());
    return availableAgents[0];
  }

  // ─── Task Routing ────────────────────────────────────────────────

  /**
   * Route a task to the most appropriate agent.
   */
  routeTask(
    input: AgentInput,
    strategy: RoutingStrategy = RoutingStrategy.LEAST_LOADED,
    targetCluster?: AgentCluster,
  ): RoutingResult | null {
    const availableAgents = this.getAvailableAgents(targetCluster);

    if (availableAgents.length === 0) {
      this.logger.warn(
        `No available agents${targetCluster ? ` in cluster ${targetCluster}` : ''} for task ${input.taskId}`,
      );
      return null;
    }

    let selectedAgent: BaseAgentService | null = null;
    let reason = '';

    switch (strategy) {
      case RoutingStrategy.ROUND_ROBIN: {
        const clusterKey = targetCluster || 'global';
        const counter = (this.roundRobinCounters.get(clusterKey) || 0) + 1;
        this.roundRobinCounters.set(clusterKey, counter);
        selectedAgent = availableAgents[counter % availableAgents.length];
        reason = `Round-robin selection (counter: ${counter})`;
        break;
      }

      case RoutingStrategy.LEAST_LOADED: {
        selectedAgent = availableAgents.reduce((best, agent) => {
          const bestCount = best.getCurrentTaskCount();
          const agentCount = agent.getCurrentTaskCount();
          return agentCount < bestCount ? agent : best;
        });
        reason = `Least loaded agent (${selectedAgent.getCurrentTaskCount()} tasks)`;
        break;
      }

      case RoutingStrategy.RANDOM: {
        const index = Math.floor(Math.random() * availableAgents.length);
        selectedAgent = availableAgents[index];
        reason = `Random selection (index: ${index})`;
        break;
      }

      case RoutingStrategy.CAPABILITY_BASED: {
        const requiredCapability = input.context?.requiredCapability;
        if (requiredCapability) {
          const capableAgents = availableAgents.filter((agent) =>
            agent.hasCapability(requiredCapability),
          );
          if (capableAgents.length > 0) {
            selectedAgent = capableAgents.reduce((best, agent) => {
              const bestCount = best.getCurrentTaskCount();
              const agentCount = agent.getCurrentTaskCount();
              return agentCount < bestCount ? agent : best;
            });
            reason = `Capability-based: ${requiredCapability}`;
          }
        }
        if (!selectedAgent) {
          // Fallback to least loaded
          selectedAgent = availableAgents.reduce((best, agent) => {
            const bestCount = best.getCurrentTaskCount();
            const agentCount = agent.getCurrentTaskCount();
            return agentCount < bestCount ? agent : best;
          });
          reason = 'Capability-based: fallback to least loaded';
        }
        break;
      }

      case RoutingStrategy.PRIORITY_BASED: {
        const priority = input.priority ?? TaskPriority.NORMAL;
        if (priority >= TaskPriority.HIGH) {
          // For high priority, find the least loaded agent in the target cluster
          selectedAgent = availableAgents.reduce((best, agent) => {
            const bestCount = best.getCurrentTaskCount();
            const agentCount = agent.getCurrentTaskCount();
            return agentCount < bestCount ? agent : best;
          });
          reason = `Priority-based routing (priority: ${priority})`;
        } else {
          // For normal/low priority, use round-robin
          const clusterKey = targetCluster || 'global';
          const counter = (this.roundRobinCounters.get(clusterKey) || 0) + 1;
          this.roundRobinCounters.set(clusterKey, counter);
          selectedAgent = availableAgents[counter % availableAgents.length];
          reason = `Priority-based: round-robin (priority: ${priority})`;
        }
        break;
      }
    }

    if (!selectedAgent) {
      return null;
    }

    const config = selectedAgent.getConfig();
    return {
      agentId: config.id,
      agentName: config.name,
      cluster: config.cluster,
      reason,
    };
  }

  // ─── Batch Operations ────────────────────────────────────────────

  /**
   * Initialize all registered agents.
   * Calls onModuleInit on each agent in the registry.
   */
  async initializeAll(): Promise<void> {
    this.logger.log(`Initializing ${this.registry.size} agents...`);

    const results = await Promise.allSettled(
      Array.from(this.registry.values()).map(async (entry) => {
        try {
          await (entry.agentInstance as any).onModuleInit();
          return { agentId: entry.config.id, success: true };
        } catch (error) {
          this.logger.error(
            `Failed to initialize agent ${entry.config.id}: ${(error as Error).message}`,
          );
          return { agentId: entry.config.id, success: false, error: (error as Error).message };
        }
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - succeeded;

    this.logger.log(
      `Agent initialization complete: ${succeeded} succeeded, ${failed} failed out of ${results.length} total`,
    );
  }

  /**
   * Perform health checks on all registered agents.
   * Returns a map of agent ID to health status.
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const healthResults = new Map<string, boolean>();

    const checkPromises = Array.from(this.registry.entries()).map(async ([agentId, entry]) => {
      try {
        const isHealthy = await entry.agentInstance.healthCheck();
        healthResults.set(agentId, isHealthy);
      } catch (error) {
        this.logger.error(`Health check failed for agent ${agentId}: ${(error as Error).message}`);
        healthResults.set(agentId, false);
      }
    });

    await Promise.allSettled(checkPromises);

    this.logger.log(
      `Health check complete: ${Array.from(healthResults.values()).filter(Boolean).length}/${healthResults.size} healthy`,
    );

    return healthResults;
  }

  // ─── Health Monitoring ───────────────────────────────────────────

  /**
   * Get health status of all agents.
   */
  getHealthStatus(): Record<
    string,
    {
      isHealthy: boolean;
      status: AgentStatus;
      consecutiveFailures: number;
      uptimeMs: number;
    }
  > {
    const status: Record<string, any> = {};
    for (const [agentId, entry] of this.registry) {
      const state = entry.agentInstance.getState();
      status[agentId] = {
        isHealthy: state.health.isHealthy,
        status: state.status,
        consecutiveFailures: state.health.consecutiveFailures,
        uptimeMs: state.health.uptimeMs,
      };
    }
    return status;
  }

  /**
   * Get agents that are in an unhealthy state.
   */
  getUnhealthyAgents(): BaseAgentService[] {
    return this.getAll().filter((agent) => {
      const state = agent.getState();
      return !state.health.isHealthy || state.status === AgentStatus.ERROR;
    });
  }

  /**
   * Attempt to recover a failed agent.
   */
  async recoverAgent(agentId: string): Promise<boolean> {
    const entry = this.registry.get(agentId);
    if (!entry) {
      this.logger.warn(`Cannot recover unknown agent: ${agentId}`);
      return false;
    }

    const agent = entry.agentInstance;
    const state = agent.getState();

    try {
      this.logger.log(`Attempting to recover agent: ${agentId}`);

      if (state.status === AgentStatus.ERROR) {
        // Try to stop and reinitialize
        try {
          await agent.stop();
        } catch {
          // Ignore stop errors in recovery
        }

        // Reinitialize via onModuleInit pattern
        await (agent as any).onModuleInit();
        this.logger.log(`Agent ${agentId} recovered successfully`);
        return true;
      }

      if (state.status === AgentStatus.STOPPED) {
        await (agent as any).onModuleInit();
        await agent.start();
        this.logger.log(`Agent ${agentId} restarted successfully`);
        return true;
      }

      this.logger.warn(`Agent ${agentId} is in ${state.status} state, not recoverable`);
      return false;
    } catch (error) {
      this.logger.error(`Failed to recover agent ${agentId}: ${(error as Error).message}`);
      return false;
    }
  }

  // ─── Heartbeat Monitoring ────────────────────────────────────────

  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeatCheck();
    }, 60000); // Check every minute
  }

  private stopHeartbeatMonitoring(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval as any);
      this.heartbeatInterval = null;
    }
  }

  private performHeartbeatCheck(): void {
    for (const [agentId, entry] of this.registry) {
      try {
        const state = entry.agentInstance.getState();
        entry.lastHeartbeat = new Date();

        // Check for stale agents (no activity in 5 minutes while running)
        const timeSinceActivity = Date.now() - state.lastActivity.getTime();
        if (state.status === AgentStatus.RUNNING && timeSinceActivity > 300000) {
          this.logger.warn(
            `Agent ${agentId} has been idle for ${Math.round(timeSinceActivity / 1000)}s while in RUNNING state`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Heartbeat check failed for agent ${agentId}: ${(error as Error).message}`,
        );
      }
    }
  }

  // ─── Registry Statistics ─────────────────────────────────────────

  /**
   * Get registry statistics.
   * Returns total agents, by cluster, and healthy count.
   */
  getStats(): {
    total: number;
    byCluster: Record<string, number>;
    healthy: number;
  } {
    const byCluster: Record<string, number> = {};

    for (const cluster of Object.values(AgentCluster)) {
      const agents = this.getByCluster(cluster);
      byCluster[cluster] = agents.length;
    }

    let healthy = 0;
    for (const entry of this.registry.values()) {
      const state = entry.agentInstance.getState();
      if (state.health.isHealthy) {
        healthy++;
      }
    }

    return {
      total: this.registry.size,
      byCluster,
      healthy,
    };
  }

  /**
   * Get extended registry statistics.
   */
  getExtendedStats(): {
    totalAgents: number;
    agentsByCluster: Record<string, number>;
    agentsByStatus: Record<string, number>;
    totalCapabilities: number;
    availableAgents: number;
    healthyAgents: number;
  } {
    const agentsByCluster: Record<string, number> = {};
    const agentsByStatus: Record<string, number> = {};

    for (const cluster of Object.values(AgentCluster)) {
      const agents = this.getByCluster(cluster);
      agentsByCluster[cluster] = agents.length;
    }

    let healthyAgents = 0;
    for (const entry of this.registry.values()) {
      const status = entry.agentInstance.getStatus();
      agentsByStatus[status] = (agentsByStatus[status] || 0) + 1;

      const state = entry.agentInstance.getState();
      if (state.health.isHealthy) {
        healthyAgents++;
      }
    }

    return {
      totalAgents: this.registry.size,
      agentsByCluster,
      agentsByStatus,
      totalCapabilities: this.capabilityIndex.size,
      availableAgents: this.getAvailableAgents().length,
      healthyAgents,
    };
  }

  /**
   * Check if an agent is registered.
   */
  isRegistered(agentId: string): boolean {
    return this.registry.has(agentId);
  }

  /**
   * Get count of registered agents.
   */
  getAgentCount(): number {
    return this.registry.size;
  }
}
