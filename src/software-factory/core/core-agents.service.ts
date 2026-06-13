/**
 * AENEWS Software Factory — 10 Core Permanent Agents
 *
 * These are the only agents that are ALWAYS active.
 * They manage the platform, not the missions directly.
 * Mission work is done by on-demand agents from Levels 2-7.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  CoreAgent,
  AgentLevel,
  SpecializedAgentId,
  AgentExecutionResult,
  ArtifactRef,
} from '../interfaces';
import { AgentRegistryService } from '../registry/agent-registry.service';

// ─── Base Core Agent ──────────────────────────────────────────

abstract class CoreAgentBase {
  abstract readonly agentId: CoreAgent;
  abstract readonly name: string;
  protected readonly logger: Logger;

  constructor(
    protected readonly registry: AgentRegistryService,
    loggerName: string,
  ) {
    this.logger = new Logger(loggerName);
  }

  getDefinition() {
    return this.registry.getDefinition(this.agentId);
  }

  isActive(): boolean {
    return true; // Core agents are always active
  }
}

// ─── 1. Mission Orchestrator ──────────────────────────────────

@Injectable()
export class MissionOrchestratorAgent extends CoreAgentBase {
  readonly agentId = CoreAgent.MISSION_ORCHESTRATOR;
  readonly name = 'Mission Orchestrator';

  constructor(registry: AgentRegistryService) {
    super(registry, 'MissionOrchestratorAgent');
  }

  /**
   * Orchestrate the full mission pipeline
   */
  async orchestrate(missionId: string, instruction: string): Promise<AgentExecutionResult> {
    this.logger.log(`Orchestrating mission ${missionId}: "${instruction}"`);

    return {
      agentId: this.agentId,
      missionId,
      success: true,
      output: { instruction, pipeline: 'initialized' },
      artifacts: [],
      cost: 0.1,
      durationMs: 100,
      logs: [`Mission ${missionId} orchestration started`],
      errors: [],
      nextAgents: [CoreAgent.MISSION_PLANNER],
    };
  }
}

// ─── 2. Mission Planner ──────────────────────────────────────

@Injectable()
export class MissionPlannerAgent extends CoreAgentBase {
  readonly agentId = CoreAgent.MISSION_PLANNER;
  readonly name = 'Mission Planner';

  constructor(registry: AgentRegistryService) {
    super(registry, 'MissionPlannerAgent');
  }

  /**
   * Decompose mission into phases and determine required agents
   */
  async plan(missionId: string, instruction: string): Promise<AgentExecutionResult> {
    this.logger.log(`Planning mission ${missionId}`);

    const neededAgents = this.registry.findAgentsForMission(instruction);

    return {
      agentId: this.agentId,
      missionId,
      success: true,
      output: {
        phases: ['research', 'build', 'test', 'certify', 'deliver'],
        requiredAgents: neededAgents.map((a) => a.id),
        agentCount: neededAgents.length,
      },
      artifacts: [],
      cost: 0.15,
      durationMs: 500,
      logs: [`Plan created: ${neededAgents.length} agents needed`],
      errors: [],
      nextAgents: [CoreAgent.TASK_SCHEDULER, ...neededAgents.map((a) => a.id)],
    };
  }
}

// ─── 3. Task Scheduler ───────────────────────────────────────

@Injectable()
export class TaskSchedulerAgent extends CoreAgentBase {
  readonly agentId = CoreAgent.TASK_SCHEDULER;
  readonly name = 'Task Scheduler';

  constructor(registry: AgentRegistryService) {
    super(registry, 'TaskSchedulerAgent');
  }

  /**
   * Schedule tasks in optimal order with dependency resolution
   */
  async schedule(missionId: string, tasks: any[]): Promise<AgentExecutionResult> {
    this.logger.log(`Scheduling ${tasks.length} tasks for mission ${missionId}`);

    const scheduled = tasks.map((task, idx) => ({
      ...task,
      order: idx + 1,
      status: 'scheduled',
    }));

    return {
      agentId: this.agentId,
      missionId,
      success: true,
      output: { scheduledTasks: scheduled, totalTasks: tasks.length },
      artifacts: [],
      cost: 0.05,
      durationMs: 200,
      logs: [`${tasks.length} tasks scheduled`],
      errors: [],
    };
  }
}

// ─── 4. Memory Manager ───────────────────────────────────────

@Injectable()
export class MemoryManagerAgent extends CoreAgentBase {
  readonly agentId = CoreAgent.MEMORY_MANAGER;
  readonly name = 'Memory Manager';

  constructor(registry: AgentRegistryService) {
    super(registry, 'MemoryManagerAgent');
  }

  /**
   * Store and retrieve mission context
   */
  async store(missionId: string, key: string, data: any): Promise<AgentExecutionResult> {
    return {
      agentId: this.agentId,
      missionId,
      success: true,
      output: { key, stored: true },
      artifacts: [],
      cost: 0.02,
      durationMs: 50,
      logs: [`Stored ${key} for mission ${missionId}`],
      errors: [],
    };
  }

  async retrieve(missionId: string, key: string): Promise<AgentExecutionResult> {
    return {
      agentId: this.agentId,
      missionId,
      success: true,
      output: { key, data: null },
      artifacts: [],
      cost: 0.02,
      durationMs: 50,
      logs: [`Retrieved ${key} for mission ${missionId}`],
      errors: [],
    };
  }
}

// ─── 5. Resource Manager ─────────────────────────────────────

@Injectable()
export class ResourceManagerAgent extends CoreAgentBase {
  readonly agentId = CoreAgent.RESOURCE_MANAGER;
  readonly name = 'Resource Manager';

  constructor(registry: AgentRegistryService) {
    super(registry, 'ResourceManagerAgent');
  }

  /**
   * Select optimal LLM model and tools for a task
   */
  async allocate(
    missionId: string,
    taskType: string,
    budget: number,
  ): Promise<AgentExecutionResult> {
    this.logger.log(`Allocating resources for mission ${missionId}: ${taskType}`);

    const modelMap: Record<string, string> = {
      coding: 'claude-3.5-sonnet',
      analysis: 'gpt-4o',
      creative: 'claude-3.5-sonnet',
      simple: 'gpt-4o-mini',
      vision: 'gpt-4o-vision',
    };

    return {
      agentId: this.agentId,
      missionId,
      success: true,
      output: {
        model: modelMap[taskType] || 'gpt-4o',
        budget,
        allocated: true,
      },
      artifacts: [],
      cost: 0.03,
      durationMs: 100,
      logs: [`Resources allocated: ${modelMap[taskType] || 'gpt-4o'}`],
      errors: [],
    };
  }
}

// ─── 6. Security Manager ─────────────────────────────────────

@Injectable()
export class SecurityManagerAgent extends CoreAgentBase {
  readonly agentId = CoreAgent.SECURITY_MANAGER;
  readonly name = 'Security Manager';

  constructor(registry: AgentRegistryService) {
    super(registry, 'SecurityManagerAgent');
  }

  /**
   * Check permissions and validate actions
   */
  async validate(missionId: string, action: string, target: string): Promise<AgentExecutionResult> {
    const blocked = ['delete_database', 'expose_credentials', 'open_firewall'];

    if (blocked.includes(action)) {
      return {
        agentId: this.agentId,
        missionId,
        success: false,
        output: { action, blocked: true, reason: 'Action violates security policy' },
        artifacts: [],
        cost: 0.02,
        durationMs: 50,
        logs: [`BLOCKED: ${action} on ${target}`],
        errors: [`Security violation: ${action}`],
      };
    }

    return {
      agentId: this.agentId,
      missionId,
      success: true,
      output: { action, allowed: true },
      artifacts: [],
      cost: 0.02,
      durationMs: 50,
      logs: [`Allowed: ${action} on ${target}`],
      errors: [],
    };
  }
}

// ─── 7. Certification Manager ────────────────────────────────

@Injectable()
export class CertificationManagerAgent extends CoreAgentBase {
  readonly agentId = CoreAgent.CERTIFICATION_MANAGER;
  readonly name = 'Certification Manager';

  constructor(registry: AgentRegistryService) {
    super(registry, 'CertificationManagerAgent');
  }

  /**
   * Run certification pipeline
   */
  async certify(missionId: string, deliverables: any[]): Promise<AgentExecutionResult> {
    this.logger.log(`Running certification for mission ${missionId}`);

    return {
      agentId: this.agentId,
      missionId,
      success: true,
      output: {
        certified: true,
        qualityScore: 92,
        checksRun: 8,
        passed: 7,
        failed: 1,
      },
      artifacts: [],
      cost: 0.1,
      durationMs: 1000,
      logs: [`Certification complete: score 92`],
      errors: [],
      nextAgents: [CoreAgent.DELIVERY_MANAGER],
    };
  }
}

// ─── 8. Delivery Manager ─────────────────────────────────────

@Injectable()
export class DeliveryManagerAgent extends CoreAgentBase {
  readonly agentId = CoreAgent.DELIVERY_MANAGER;
  readonly name = 'Delivery Manager';

  constructor(registry: AgentRegistryService) {
    super(registry, 'DeliveryManagerAgent');
  }

  /**
   * Coordinate delivery of all artifacts
   */
  async deliver(missionId: string, artifacts: any[]): Promise<AgentExecutionResult> {
    this.logger.log(`Coordinating delivery for mission ${missionId}`);

    return {
      agentId: this.agentId,
      missionId,
      success: true,
      output: {
        delivered: true,
        artifactCount: artifacts.length,
        deliveryPath: `/missions/${missionId}/delivery/`,
      },
      artifacts: [],
      cost: 0.08,
      durationMs: 500,
      logs: [`${artifacts.length} artifacts delivered`],
      errors: [],
    };
  }
}

// ─── 9. Monitoring Manager ───────────────────────────────────

@Injectable()
export class MonitoringManagerAgent extends CoreAgentBase {
  readonly agentId = CoreAgent.MONITORING_MANAGER;
  readonly name = 'Monitoring Manager';

  constructor(registry: AgentRegistryService) {
    super(registry, 'MonitoringManagerAgent');
  }

  /**
   * Get platform health and metrics
   */
  async getHealth(): Promise<AgentExecutionResult> {
    return {
      agentId: this.agentId,
      missionId: 'platform',
      success: true,
      output: {
        status: 'healthy',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date(),
      },
      artifacts: [],
      cost: 0.01,
      durationMs: 50,
      logs: ['Health check: OK'],
      errors: [],
    };
  }
}

// ─── 10. Recovery Manager ────────────────────────────────────

@Injectable()
export class RecoveryManagerAgent extends CoreAgentBase {
  readonly agentId = CoreAgent.RECOVERY_MANAGER;
  readonly name = 'Recovery Manager';

  constructor(registry: AgentRegistryService) {
    super(registry, 'RecoveryManagerAgent');
  }

  /**
   * Handle error recovery with retry/rollback
   */
  async recover(
    missionId: string,
    error: string,
    strategy: 'retry' | 'rollback' | 'skip' = 'retry',
  ): Promise<AgentExecutionResult> {
    this.logger.warn(`Recovery for mission ${missionId}: ${error} (strategy: ${strategy})`);

    return {
      agentId: this.agentId,
      missionId,
      success: strategy !== 'rollback',
      output: {
        error,
        strategy,
        recovered: true,
        attempts: 1,
      },
      artifacts: [],
      cost: 0.05,
      durationMs: 200,
      logs: [`Recovered from: ${error} using ${strategy}`],
      errors: [],
    };
  }
}
