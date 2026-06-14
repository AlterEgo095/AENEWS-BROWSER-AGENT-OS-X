/**
 * AENEWS Agent OS X - Dynamic Scheduler Agent
 * Uses LLM to make intelligent scheduling decisions — which tasks to run in
 * parallel vs sequential, optimal resource allocation, and dynamic re-scheduling
 * based on execution feedback. Falls back to a dependency-based topological
 * sort when LLM is unavailable.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { BaseAgentService } from '../base/base-agent.service';
import { AgentConfig, AgentCluster, AgentInput, AgentOutput } from '../interfaces/agent.interface';
import { AgentConnectorBridge } from '../bridge';

// ─── Agent Configuration ──────────────────────────────────────────

export const DYNAMIC_SCHEDULER_AGENT_CONFIG: AgentConfig = {
  id: 'intelligent-dynamic-scheduler',
  name: 'DynamicScheduler',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '2.0.0',
  description:
    'LLM-driven dynamic task scheduler that creates optimal execution schedules considering task priority, dependency chains, resource availability, estimated duration, and failure risk',
  capabilities: [
    {
      name: 'createSchedule',
      description: 'Create an optimal execution schedule for a set of tasks with dependencies',
      inputSchema: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: { type: 'object' },
            description: 'Tasks with dependencies and resource requirements',
          },
          resourceConstraints: { type: 'object', description: 'Available resources and limits' },
          optimizationGoal: {
            type: 'string',
            enum: ['speed', 'cost', 'reliability', 'balanced'],
            description: 'Optimization objective',
          },
        },
        required: ['tasks'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          schedule: { type: 'array', items: { type: 'object' } },
          parallelGroups: { type: 'array', items: { type: 'array' } },
          criticalPath: { type: 'array', items: { type: 'string' } },
          estimatedTotalDurationMs: { type: 'number' },
        },
      },
    },
    {
      name: 'reschedule',
      description: 'Dynamically reschedule based on execution feedback and changing conditions',
      inputSchema: {
        type: 'object',
        properties: {
          originalSchedule: { type: 'object' },
          completedTasks: { type: 'array', items: { type: 'string' } },
          failedTasks: { type: 'array', items: { type: 'string' } },
          newTasks: { type: 'array', items: { type: 'object' } },
          resourceChanges: { type: 'object' },
        },
        required: ['originalSchedule'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          updatedSchedule: { type: 'object' },
          rescheduleReason: { type: 'string' },
          impactAssessment: { type: 'object' },
        },
      },
    },
    {
      name: 'optimizeParallelism',
      description: 'Analyze task dependencies and maximize parallel execution opportunities',
      inputSchema: {
        type: 'object',
        properties: {
          tasks: { type: 'array', items: { type: 'object' } },
          maxConcurrency: { type: 'number' },
        },
        required: ['tasks'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          parallelBatches: { type: 'array', items: { type: 'object' } },
          estimatedSpeedup: { type: 'number' },
          bottlenecks: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:schedule',
    'write:schedule',
    'manage:resources',
    'read:agents',
  ],
  maxConcurrentTasks: 5,
  timeout: 90000,
  retryPolicy: { maxRetries: 2, backoffMs: 2500, exponentialBackoff: true },
};

// ─── Internal Types ───────────────────────────────────────────────

interface ScheduleTask {
  taskId: string;
  capability: string;
  parameters: Record<string, any>;
  priority?: number;
  estimatedDurationMs?: number;
  dependsOn?: string[];
  resourceRequirements?: Record<string, number>;
}

interface ScheduleBatch {
  batch: number;
  tasks: Array<{ taskId: string; capability: string; parameters: Record<string, any> }>;
}

interface ScheduleResult {
  schedule: ScheduleBatch[];
  parallelGroups: string[][];
  criticalPath: string[];
  estimatedTotalDurationMs: number;
  resourceUtilization?: Record<string, number>;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class DynamicSchedulerAgentService extends BaseAgentService {
  constructor(
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super();
  }

  /** In-memory schedule history for fallback rescheduling */
  private scheduleHistory: Map<string, ScheduleResult> = new Map();

  protected defineConfig(): AgentConfig {
    return DYNAMIC_SCHEDULER_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.logger.log('Dynamic Scheduler agent initialized');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { tasks, resourceConstraints, optimizationGoal, action } = input.payload;

    // ── LLM-driven scheduling ─────────────────────────────────────
    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: `You are a dynamic task scheduler for an AI agent platform. Given a set of tasks with dependencies and resource requirements, create an optimal execution schedule. Consider: task priority, dependency chains, resource availability, estimated duration, and failure risk. Output JSON with: schedule (array of {batch: number, tasks: [{taskId, capability, parameters}]}), parallelGroups, criticalPath, estimatedTotalDurationMs, resourceUtilization.`,
          userPrompt: `Schedule these tasks:\nTasks: ${JSON.stringify(tasks || [])}\nResource constraints: ${JSON.stringify(resourceConstraints || {})}\nOptimization goal: ${optimizationGoal || 'balanced'}\nAction: ${action || 'createSchedule'}`,
          temperature: 0.2,
          maxTokens: 4096,
        });

        const schedule = this.parseSchedule(llmResult.content);

        // Store in history for rescheduling
        this.scheduleHistory.set(input.taskId, schedule);

        await this.storeInWorkingMemory(
          'dynamic-scheduler:last-schedule',
          { tasks, schedule, timestamp: new Date() },
          300000,
        );

        return this.createAgentOutput(
          input.taskId,
          true,
          {
            schedule,
            rawAnalysis: llmResult.content,
            costUsd: llmResult.costUsd,
          },
          undefined,
          startTime,
        );
      } catch (error) {
        this.logger.warn(`LLM scheduling failed: ${(error as Error).message}`);
      }
    }

    // ── Fallback: dependency-based topological sort ───────────────
    const fallbackSchedule = this.buildFallbackSchedule(
      tasks || [],
      optimizationGoal || 'balanced',
    );

    this.scheduleHistory.set(input.taskId, fallbackSchedule);

    return this.createAgentOutput(
      input.taskId,
      true,
      { schedule: fallbackSchedule },
      undefined,
      startTime,
    );
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private parseSchedule(content: string): ScheduleResult {
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          schedule: parsed.schedule || [],
          parallelGroups: parsed.parallelGroups || [],
          criticalPath: parsed.criticalPath || [],
          estimatedTotalDurationMs: parsed.estimatedTotalDurationMs || 0,
          resourceUtilization: parsed.resourceUtilization,
        };
      }
      return {
        schedule: [],
        parallelGroups: [],
        criticalPath: [],
        estimatedTotalDurationMs: 0,
        raw: content,
      } as any;
    } catch {
      return {
        schedule: [],
        parallelGroups: [],
        criticalPath: [],
        estimatedTotalDurationMs: 0,
        raw: content,
      } as any;
    }
  }

  /**
   * Builds a schedule using topological sorting of task dependencies.
   * Groups independent tasks into parallel batches.
   */
  private buildFallbackSchedule(tasks: ScheduleTask[], optimizationGoal: string): ScheduleResult {
    if (tasks.length === 0) {
      return {
        schedule: [],
        parallelGroups: [],
        criticalPath: [],
        estimatedTotalDurationMs: 0,
      };
    }

    // Build dependency graph
    const taskMap = new Map<string, ScheduleTask>();
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();

    for (const task of tasks) {
      taskMap.set(task.taskId, task);
      inDegree.set(task.taskId, 0);
      dependents.set(task.taskId, []);
    }

    for (const task of tasks) {
      const deps = task.dependsOn || [];
      inDegree.set(task.taskId, deps.length);
      for (const dep of deps) {
        if (dependents.has(dep)) {
          dependents.get(dep)!.push(task.taskId);
        }
      }
    }

    // Topological sort with parallel batch grouping
    const schedule: ScheduleBatch[] = [];
    const parallelGroups: string[][] = [];
    const completed = new Set<string>();
    let batch = 0;

    while (completed.size < tasks.length) {
      const readyTasks: string[] = [];

      for (const [taskId, degree] of inDegree.entries()) {
        if (degree === 0 && !completed.has(taskId)) {
          readyTasks.push(taskId);
        }
      }

      if (readyTasks.length === 0) {
        // Circular dependency detected — break remaining tasks into single batches
        for (const [taskId] of inDegree.entries()) {
          if (!completed.has(taskId)) {
            const task = taskMap.get(taskId);
            if (task) {
              schedule.push({
                batch: batch++,
                tasks: [
                  { taskId: task.taskId, capability: task.capability, parameters: task.parameters },
                ],
              });
              completed.add(taskId);
            }
          }
        }
        break;
      }

      // Sort ready tasks by priority (higher first) then by estimated duration (shorter first for speed)
      const sorted = readyTasks.sort((a, b) => {
        const taskA = taskMap.get(a)!;
        const taskB = taskMap.get(b)!;
        const priDiff = (taskB.priority || 1) - (taskA.priority || 1);
        if (priDiff !== 0) return priDiff;
        if (optimizationGoal === 'speed') {
          return (taskA.estimatedDurationMs || 5000) - (taskB.estimatedDurationMs || 5000);
        }
        return 0;
      });

      const batchTasks = sorted.map((id) => {
        const task = taskMap.get(id)!;
        return { taskId: task.taskId, capability: task.capability, parameters: task.parameters };
      });

      schedule.push({ batch, tasks: batchTasks });
      parallelGroups.push(sorted);

      for (const taskId of sorted) {
        completed.add(taskId);
        for (const dep of dependents.get(taskId) || []) {
          inDegree.set(dep, (inDegree.get(dep) || 1) - 1);
        }
      }

      batch++;
    }

    // Calculate critical path (longest dependency chain)
    const criticalPath = this.computeCriticalPath(tasks, taskMap);

    // Estimate total duration
    let totalDuration = 0;
    for (const s of schedule) {
      const maxBatchDuration = Math.max(
        ...s.tasks.map((t) => taskMap.get(t.taskId)?.estimatedDurationMs || 5000),
      );
      totalDuration += maxBatchDuration;
    }

    return {
      schedule,
      parallelGroups,
      criticalPath,
      estimatedTotalDurationMs: totalDuration,
      resourceUtilization: this.computeResourceUtilization(schedule, taskMap),
    };
  }

  private computeCriticalPath(tasks: ScheduleTask[], taskMap: Map<string, ScheduleTask>): string[] {
    const cache = new Map<string, string[]>();

    const dfs = (taskId: string): string[] => {
      if (cache.has(taskId)) return cache.get(taskId)!;
      const task = taskMap.get(taskId);
      if (!task || !task.dependsOn || task.dependsOn.length === 0) {
        cache.set(taskId, [taskId]);
        return [taskId];
      }
      let longest: string[] = [];
      for (const dep of task.dependsOn) {
        const path = dfs(dep);
        if (path.length > longest.length) {
          longest = path;
        }
      }
      const result = [...longest, taskId];
      cache.set(taskId, result);
      return result;
    };

    let overallLongest: string[] = [];
    for (const task of tasks) {
      const path = dfs(task.taskId);
      if (path.length > overallLongest.length) {
        overallLongest = path;
      }
    }

    return overallLongest;
  }

  private computeResourceUtilization(
    schedule: ScheduleBatch[],
    taskMap: Map<string, ScheduleTask>,
  ): Record<string, number> {
    const utilization: Record<string, number> = {};
    for (const batch of schedule) {
      const batchResources: Record<string, number> = {};
      for (const t of batch.tasks) {
        const task = taskMap.get(t.taskId);
        if (task?.resourceRequirements) {
          for (const [resource, amount] of Object.entries(task.resourceRequirements)) {
            batchResources[resource] = (batchResources[resource] || 0) + amount;
          }
        }
      }
      for (const [resource, amount] of Object.entries(batchResources)) {
        utilization[resource] = Math.max(utilization[resource] || 0, amount);
      }
    }
    return utilization;
  }

  protected async onDestroy(): Promise<void> {
    this.scheduleHistory.clear();
    this.logger.log('Dynamic Scheduler agent destroyed, schedule history cleared');
  }
}
