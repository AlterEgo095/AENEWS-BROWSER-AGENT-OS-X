/**
 * AENEWS Software Factory — Dynamic Agent Pool
 *
 * Agents are ephemeral. They are:
 * 1. Spawned on-demand when a mission needs them
 * 2. Execute their assigned tasks
 * 3. Terminated after mission completion or exhaustion
 * 4. Results are archived for reproducibility
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  PooledAgent,
  AgentStatus,
  SpawnRequest,
  SpawnResult,
  TerminateRequest,
  TerminateResult,
  PoolStatistics,
  PoolConstraints,
} from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AgentPoolService {
  private readonly logger = new Logger(AgentPoolService.name);
  private readonly agents = new Map<string, PooledAgent>();
  private readonly archive: PooledAgent[] = [];

  private constraints: PoolConstraints = {
    maxConcurrentAgents: 30,
    maxAgentsPerRole: 5,
    maxTotalCostUsd: 500,
    defaultAgentLifetimeMs: 4 * 60 * 60 * 1000, // 4 hours
    defaultMaxTasksPerAgent: 50,
  };

  /**
   * Spawn a new ephemeral agent for a mission
   */
  async spawn(request: SpawnRequest): Promise<SpawnResult> {
    // Check constraints
    const activeCount = this.getActiveCount();
    if (activeCount >= this.constraints.maxConcurrentAgents) {
      this.logger.warn(`Agent pool full: ${activeCount}/${this.constraints.maxConcurrentAgents}`);
      return {
        agentId: '',
        role: request.role,
        status: AgentStatus.FAILED,
        ready: false,
      };
    }

    const roleCount = this.getActiveCountByRole(request.role);
    if (roleCount >= this.constraints.maxAgentsPerRole) {
      this.logger.warn(
        `Role ${request.role} at capacity: ${roleCount}/${this.constraints.maxAgentsPerRole}`,
      );
      return {
        agentId: '',
        role: request.role,
        status: AgentStatus.FAILED,
        ready: false,
      };
    }

    const agentId = `agent-${uuidv4().slice(0, 8)}`;
    const agent: PooledAgent = {
      id: agentId,
      role: request.role,
      missionId: request.missionId,
      status: AgentStatus.SPAWNING,
      spawnedAt: new Date(),
      tasksCompleted: 0,
      tasksFailed: 0,
      totalCostUsd: 0,
      config: {
        ...request.config,
        maxLifetime: request.maxLifetime || this.constraints.defaultAgentLifetimeMs,
        maxTasks: request.maxTasks || this.constraints.defaultMaxTasksPerAgent,
        skills: request.skills,
      },
    };

    this.agents.set(agentId, agent);

    // Simulate initialization (in real implementation, this would create agent instance)
    await this.initializeAgent(agent);

    this.logger.log(`Agent spawned: ${agentId} [${request.role}] for mission ${request.missionId}`);
    return {
      agentId,
      role: request.role,
      status: agent.status,
      ready: agent.status === AgentStatus.READY,
    };
  }

  /**
   * Terminate an agent and archive its results
   */
  async terminate(request: TerminateRequest): Promise<TerminateResult> {
    const agent = this.agents.get(request.agentId);
    if (!agent) {
      return {
        agentId: request.agentId,
        terminated: false,
        finalStatus: AgentStatus.FAILED,
        tasksCompleted: 0,
        totalCostUsd: 0,
      };
    }

    agent.status = AgentStatus.TERMINATING;

    // Note: if agent was executing, we force-terminate
    if (agent.status === AgentStatus.TERMINATING) {
      this.logger.warn(`Force-terminating agent ${request.agentId}`);
    }

    agent.terminatedAt = new Date();
    agent.status = AgentStatus.TERMINATED;

    const result: TerminateResult = {
      agentId: request.agentId,
      terminated: true,
      finalStatus: AgentStatus.TERMINATED,
      tasksCompleted: agent.tasksCompleted,
      totalCostUsd: agent.totalCostUsd,
      archivedPath: undefined,
    };

    // Archive if requested
    if (request.archiveResults) {
      this.archive.push({ ...agent });
      result.archivedPath = `archive/${agent.missionId}/${agent.id}`;
      this.logger.log(`Agent ${request.agentId} archived to ${result.archivedPath}`);
    }

    // Remove from active pool
    this.agents.delete(request.agentId);
    this.logger.log(
      `Agent terminated: ${request.agentId} [${request.reason}] — ${agent.tasksCompleted} tasks, $${agent.totalCostUsd.toFixed(2)}`,
    );

    return result;
  }

  /**
   * Terminate all agents for a specific mission
   */
  async terminateMissionAgents(
    missionId: string,
    reason: TerminateRequest['reason'],
  ): Promise<TerminateResult[]> {
    const missionAgents = this.getAgentsByMission(missionId);
    const results: TerminateResult[] = [];

    for (const agent of missionAgents) {
      const result = await this.terminate({
        agentId: agent.id,
        reason,
        archiveResults: true,
      });
      results.push(result);
    }

    this.logger.log(`Terminated ${results.length} agents for mission ${missionId}`);
    return results;
  }

  /**
   * Mark an agent as executing a task
   */
  startTask(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== AgentStatus.READY) return false;

    agent.status = AgentStatus.EXECUTING;
    this.agents.set(agentId, agent);
    return true;
  }

  /**
   * Mark a task as completed for an agent
   */
  completeTask(agentId: string, costUsd: number = 0, success: boolean = true): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    if (success) {
      agent.tasksCompleted++;
    } else {
      agent.tasksFailed++;
    }
    agent.totalCostUsd += costUsd;
    agent.status = AgentStatus.READY;

    // Check if agent has exhausted its task limit
    if (
      agent.tasksCompleted + agent.tasksFailed >=
      (agent.config.maxTasks || this.constraints.defaultMaxTasksPerAgent)
    ) {
      this.logger.log(`Agent ${agentId} reached task limit, auto-terminating`);
      this.terminate({ agentId, reason: 'mission_complete', archiveResults: true });
      return true;
    }

    this.agents.set(agentId, agent);
    return true;
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): PooledAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents for a mission
   */
  getAgentsByMission(missionId: string): PooledAgent[] {
    const result: PooledAgent[] = [];
    for (const agent of this.agents.values()) {
      if (agent.missionId === missionId) {
        result.push(agent);
      }
    }
    return result;
  }

  /**
   * Get pool statistics
   */
  getStatistics(): PoolStatistics {
    const active = this.getActiveAgents();
    const byRole: Record<string, number> = {};

    for (const agent of active) {
      byRole[agent.role] = (byRole[agent.role] || 0) + 1;
    }

    const allAgents = [...this.archive];
    const totalLifetime = allAgents.reduce((sum, a) => {
      if (a.terminatedAt) {
        return sum + (a.terminatedAt.getTime() - a.spawnedAt.getTime());
      }
      return sum;
    }, 0);

    return {
      totalSpawned: this.archive.length + active.length,
      totalTerminated: this.archive.length,
      currentlyActive: active.length,
      byRole,
      totalCostUsd: [...active, ...this.archive].reduce((sum, a) => sum + a.totalCostUsd, 0),
      averageLifetimeMs: allAgents.length > 0 ? totalLifetime / allAgents.length : 0,
      averageTasksPerAgent:
        allAgents.length > 0
          ? allAgents.reduce((sum, a) => sum + a.tasksCompleted, 0) / allAgents.length
          : 0,
    };
  }

  /**
   * Get pool constraints
   */
  getConstraints(): PoolConstraints {
    return { ...this.constraints };
  }

  /**
   * Update pool constraints
   */
  updateConstraints(constraints: Partial<PoolConstraints>): void {
    this.constraints = { ...this.constraints, ...constraints };
  }

  // --- Private helpers ---

  private async initializeAgent(agent: PooledAgent): Promise<void> {
    // Simulate initialization delay
    agent.status = AgentStatus.READY;
    this.agents.set(agent.id, agent);
  }

  private getActiveCount(): number {
    let count = 0;
    for (const agent of this.agents.values()) {
      if (agent.status !== AgentStatus.TERMINATED && agent.status !== AgentStatus.FAILED) {
        count++;
      }
    }
    return count;
  }

  private getActiveCountByRole(role: string): number {
    let count = 0;
    for (const agent of this.agents.values()) {
      if (
        agent.role === role &&
        agent.status !== AgentStatus.TERMINATED &&
        agent.status !== AgentStatus.FAILED
      ) {
        count++;
      }
    }
    return count;
  }

  private getActiveAgents(): PooledAgent[] {
    const result: PooledAgent[] = [];
    for (const agent of this.agents.values()) {
      if (agent.status !== AgentStatus.TERMINATED && agent.status !== AgentStatus.FAILED) {
        result.push(agent);
      }
    }
    return result;
  }
}
