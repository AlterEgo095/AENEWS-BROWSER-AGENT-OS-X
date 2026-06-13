/**
 * AENEWS Agent OS X - Task Planner Service
 * Creates optimized execution plans from decomposed subtasks,
 * considering dependencies, parallelism, agent capabilities,
 * resource constraints, and duration estimation.
 */

import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  TaskDefinition,
  TaskStatus,
  TaskPriority,
  OrchestrationPlan,
  OrchestrationStep,
  StepDependency,
  AgentCluster,
  AgentInput,
  ExecutionPlan,
} from '../interfaces/agent.interface';
import { AgentRegistryService, RoutingStrategy } from '../registry/agent-registry.service';
import { OrchestrationRequest } from './orchestrator.service';
import { AgentConnectorBridge } from '../bridge';

// ─── Planning Constraints ─────────────────────────────────────────
export interface PlanningConstraints {
  maxParallelSteps: number;
  maxTotalDurationMs: number;
  requiredCluster?: AgentCluster;
  priorityBoost?: TaskPriority;
  respectDependencies: boolean;
  optimizeForSpeed: boolean;
  maxMemoryPerStepMb: number;
  maxCpuPerStepPercent: number;
  maxAgentLoadPercent: number;
}

// ─── Planning Result ──────────────────────────────────────────────
export interface PlanningResult {
  plan: OrchestrationPlan;
  warnings: string[];
  estimatedDurationMs: number;
  parallelGroups: number;
  resourceUtilization: ResourceUtilization;
}

// ─── Resource Utilization ─────────────────────────────────────────
export interface ResourceUtilization {
  estimatedPeakMemoryMb: number;
  estimatedPeakCpuPercent: number;
  estimatedTotalMemoryMbHours: number;
  agentAssignments: Map<string, number>;
}

// ─── Step Estimation ──────────────────────────────────────────────
interface StepEstimation {
  stepId: string;
  estimatedDurationMs: number;
  estimatedMemoryMb: number;
  estimatedCpuPercent: number;
  parallelizable: boolean;
}

@Injectable()
export class TaskPlannerService {
  private readonly logger = new Logger(TaskPlannerService.name);

  constructor(
    private readonly agentRegistry: AgentRegistryService,
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {}

  /**
   * Create an execution plan from decomposed subtasks.
   * Considers dependencies, parallelism, agent capabilities,
   * and resource constraints.
   */
  async createPlan(
    subtasks: TaskDefinition[],
    request: OrchestrationRequest,
  ): Promise<OrchestrationPlan> {
    const startTime = Date.now();
    this.logger.log(`Creating execution plan for ${subtasks.length} subtasks`);

    const constraints: PlanningConstraints = {
      maxParallelSteps: request.context?.maxParallelSteps ?? 10,
      maxTotalDurationMs: request.context?.maxDurationMs ?? 600000,
      requiredCluster: request.cluster,
      respectDependencies: true,
      optimizeForSpeed: request.context?.optimizeForSpeed ?? true,
      maxMemoryPerStepMb: request.context?.maxMemoryPerStepMb ?? 512,
      maxCpuPerStepPercent: request.context?.maxCpuPerStepPercent ?? 80,
      maxAgentLoadPercent: request.context?.maxAgentLoadPercent ?? 90,
    };

    // Build execution steps from subtasks
    const steps = this.buildSteps(subtasks, request);

    // Estimate step resources
    const estimations = this.estimateStepResources(steps);

    // Resolve dependencies
    const dependencies = this.resolveDependencies(subtasks, steps);

    // Optimize execution order
    const optimizedSteps = this.optimizeExecutionOrder(steps, dependencies, constraints);

    // Route each step to an agent based on capabilities
    const warnings: string[] = [];
    for (const step of optimizedSteps) {
      if (!step.agentId) {
        const routing = this.agentRegistry.routeTask(
          step.input,
          RoutingStrategy.LEAST_LOADED,
          step.cluster || request.cluster,
        );
        if (routing) {
          step.agentId = routing.agentId;
        } else {
          warnings.push(
            `No available agent for step ${step.id} (cluster: ${step.cluster || 'any'})`,
          );
        }
      }
    }

    // Validate resource constraints
    const resourceWarnings = this.validateResourceConstraints(
      optimizedSteps,
      estimations,
      constraints,
    );
    warnings.push(...resourceWarnings);

    // Estimate total duration
    const estimatedDurationMs = this.estimateDuration(optimizedSteps, dependencies);

    const plan: OrchestrationPlan = {
      id: uuidv4(),
      taskId: subtasks[0]?.parentId || uuidv4(),
      steps: optimizedSteps,
      dependencies,
      createdAt: new Date(),
      estimatedDurationMs,
    };

    this.logger.log(
      `Plan created: ${plan.steps.length} steps, ` +
        `estimated ${estimatedDurationMs}ms, ` +
        `took ${Date.now() - startTime}ms to plan`,
    );

    return plan;
  }

  /**
   * LLM-powered planning: uses the AgentConnectorBridge to create an optimal
   * execution plan via an LLM call. Returns an ExecutionPlan or null on error.
   */
  async llmPlan(input: AgentInput, subtasks: TaskDefinition[]): Promise<ExecutionPlan | null> {
    if (!this.bridge) {
      return null;
    }

    const userPrompt = JSON.stringify({
      taskId: input.taskId,
      payload: input.payload,
      subtasks: subtasks.map((s) => ({
        id: s.id,
        cluster: s.cluster,
        priority: s.priority,
        dependencies: s.metadata?.dependencies || [],
        description: s.metadata?.stepDescription || s.input?.context?.stepDescription,
      })),
    });

    const result = await this.bridge.callLLM({
      systemPrompt:
        'You are an expert execution planner. Given subtasks and their dependencies, create an optimal execution plan. ' +
        'Output JSON: {steps: [{taskId, agentId, dependsOn[], estimatedDurationMs, retryCount}], totalEstimatedDurationMs, parallelizable: boolean}',
      userPrompt,
      temperature: 0.2,
      maxTokens: 4096,
    });

    const parsed = JSON.parse(result.content);

    return {
      steps: (parsed.steps || []).map((step: any) => ({
        taskId: step.taskId,
        agentId: step.agentId || '',
        dependsOn: step.dependsOn || [],
        estimatedDurationMs: step.estimatedDurationMs || 5000,
        retryCount: step.retryCount || 0,
      })),
      totalEstimatedDurationMs: parsed.totalEstimatedDurationMs || 0,
      parallelizable: parsed.parallelizable ?? false,
    };
  }

  // ─── Step Building ───────────────────────────────────────────────

  private buildSteps(
    subtasks: TaskDefinition[],
    request: OrchestrationRequest,
  ): OrchestrationStep[] {
    return subtasks.map((subtask, index) => ({
      id: subtask.id,
      order: index,
      agentId: subtask.agentId,
      cluster: subtask.cluster || request.cluster,
      capability: subtask.metadata?.capability as string | undefined,
      input: subtask.input,
      status: TaskStatus.PENDING,
      output: undefined,
      retryCount: 0,
    }));
  }

  // ─── Resource Estimation ─────────────────────────────────────────

  private estimateStepResources(steps: OrchestrationStep[]): Map<string, StepEstimation> {
    const estimations = new Map<string, StepEstimation>();

    for (const step of steps) {
      const payload = step.input.payload;
      const payloadSize = JSON.stringify(payload).length;

      // Estimate based on payload size and cluster type
      let estimatedDurationMs = 5000; // Default 5 seconds
      let estimatedMemoryMb = 64; // Default 64MB
      let estimatedCpuPercent = 30; // Default 30%

      // Adjust based on payload size
      if (payloadSize > 100000) {
        estimatedDurationMs = 30000;
        estimatedMemoryMb = 256;
        estimatedCpuPercent = 60;
      } else if (payloadSize > 10000) {
        estimatedDurationMs = 15000;
        estimatedMemoryMb = 128;
        estimatedCpuPercent = 40;
      }

      // Adjust based on cluster type
      if (step.cluster === 'browser') {
        estimatedMemoryMb += 128; // Browsers use more memory
      } else if (step.cluster === 'coding') {
        estimatedDurationMs += 10000; // Code tasks often take longer
      }

      // Override with explicit estimates from context
      const contextEstimate = step.input.context?.estimatedDurationMs as number | undefined;
      if (contextEstimate) {
        estimatedDurationMs = contextEstimate;
      }

      const contextMemory = step.input.context?.estimatedMemoryMb as number | undefined;
      if (contextMemory) {
        estimatedMemoryMb = contextMemory;
      }

      // A step is parallelizable if it has no dependencies
      const hasDeps = step.input.context?.dependencies as string[] | undefined;
      const parallelizable = !hasDeps || hasDeps.length === 0;

      estimations.set(step.id, {
        stepId: step.id,
        estimatedDurationMs,
        estimatedMemoryMb,
        estimatedCpuPercent,
        parallelizable,
      });
    }

    return estimations;
  }

  // ─── Dependency Resolution ───────────────────────────────────────

  private resolveDependencies(
    subtasks: TaskDefinition[],
    steps: OrchestrationStep[],
  ): StepDependency[] {
    const dependencies: StepDependency[] = [];
    const stepMap = new Map(steps.map((s) => [s.id, s]));

    for (const subtask of subtasks) {
      const stepDeps: string[] = [];

      // Explicit dependencies from metadata
      const explicitDeps = subtask.metadata?.dependencies as string[] | undefined;
      if (explicitDeps && Array.isArray(explicitDeps)) {
        for (const dep of explicitDeps) {
          // Resolve dependency names to step IDs
          const depStep = this.findStepByNameOrId(steps, dep);
          if (depStep) {
            stepDeps.push(depStep.id);
          }
        }
      }

      // Parent-child dependencies
      if (subtask.parentId) {
        const parentStep = steps.find((s) => s.id === subtask.parentId);
        if (parentStep) {
          stepDeps.push(parentStep.id);
        }
      }

      dependencies.push({
        stepId: subtask.id,
        dependsOnStepIds: stepDeps,
      });
    }

    return dependencies;
  }

  private findStepByNameOrId(
    steps: OrchestrationStep[],
    reference: string,
  ): OrchestrationStep | undefined {
    // First try exact ID match
    const byId = steps.find((s) => s.id === reference);
    if (byId) return byId;

    // Then try by metadata name
    return steps.find((s) => {
      const name = s.input.context?.stepDescription || s.input.context?.componentName;
      return name === reference;
    });
  }

  // ─── Execution Order Optimization ────────────────────────────────

  private optimizeExecutionOrder(
    steps: OrchestrationStep[],
    dependencies: StepDependency[],
    constraints: PlanningConstraints,
  ): OrchestrationStep[] {
    // Build dependency graph
    const depMap = new Map<string, Set<string>>();
    for (const dep of dependencies) {
      depMap.set(dep.stepId, new Set(dep.dependsOnStepIds));
    }

    // Topological sort with parallelism
    const sorted = this.topologicalSort(steps, depMap);

    // Assign order numbers
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].order = i;
    }

    // Group steps that can run in parallel
    const groups = this.groupParallelSteps(sorted, depMap, constraints.maxParallelSteps);

    // Re-order to maximize parallelism
    let order = 0;
    for (const group of groups) {
      for (const step of group) {
        step.order = order++;
      }
    }

    return sorted;
  }

  private topologicalSort(
    steps: OrchestrationStep[],
    depMap: Map<string, Set<string>>,
  ): OrchestrationStep[] {
    const sorted: OrchestrationStep[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const stepMap = new Map(steps.map((s) => [s.id, s]));

    const visit = (stepId: string): void => {
      if (visited.has(stepId)) return;
      if (visiting.has(stepId)) {
        // Cycle detected, break it
        this.logger.warn(`Circular dependency detected involving step ${stepId}`);
        visited.add(stepId);
        const step = stepMap.get(stepId);
        if (step) sorted.push(step);
        return;
      }

      visiting.add(stepId);

      const deps = depMap.get(stepId);
      if (deps) {
        for (const depId of deps) {
          visit(depId);
        }
      }

      visiting.delete(stepId);
      visited.add(stepId);
      const step = stepMap.get(stepId);
      if (step) sorted.push(step);
    };

    for (const step of steps) {
      visit(step.id);
    }

    return sorted;
  }

  private groupParallelSteps(
    sortedSteps: OrchestrationStep[],
    depMap: Map<string, Set<string>>,
    maxParallel: number,
  ): OrchestrationStep[][] {
    const groups: OrchestrationStep[][] = [];
    const completed = new Set<string>();
    const remaining = [...sortedSteps];

    while (remaining.length > 0) {
      // Find steps that can run now (all deps completed)
      const ready = remaining.filter((step) => {
        const deps = depMap.get(step.id);
        if (!deps || deps.size === 0) return true;
        return Array.from(deps).every((depId) => completed.has(depId));
      });

      if (ready.length === 0) {
        groups.push([remaining.shift()!]);
        continue;
      }

      // Limit parallelism
      const batch = ready.slice(0, maxParallel);
      groups.push(batch);

      for (const step of batch) {
        completed.add(step.id);
        const idx = remaining.indexOf(step);
        if (idx >= 0) remaining.splice(idx, 1);
      }
    }

    return groups;
  }

  // ─── Resource Constraint Validation ──────────────────────────────

  private validateResourceConstraints(
    steps: OrchestrationStep[],
    estimations: Map<string, StepEstimation>,
    constraints: PlanningConstraints,
  ): string[] {
    const warnings: string[] = [];

    // Check individual step resource limits
    for (const step of steps) {
      const est = estimations.get(step.id);
      if (!est) continue;

      if (est.estimatedMemoryMb > constraints.maxMemoryPerStepMb) {
        warnings.push(
          `Step ${step.id} estimated memory (${est.estimatedMemoryMb}MB) exceeds ` +
            `limit (${constraints.maxMemoryPerStepMb}MB)`,
        );
      }

      if (est.estimatedCpuPercent > constraints.maxCpuPerStepPercent) {
        warnings.push(
          `Step ${step.id} estimated CPU (${est.estimatedCpuPercent}%) exceeds ` +
            `limit (${constraints.maxCpuPerStepPercent}%)`,
        );
      }
    }

    // Check total duration
    const totalEstimatedDuration = Array.from(estimations.values()).reduce(
      (sum, est) => sum + est.estimatedDurationMs,
      0,
    );
    if (totalEstimatedDuration > constraints.maxTotalDurationMs) {
      warnings.push(
        `Total estimated duration (${totalEstimatedDuration}ms) exceeds ` +
          `limit (${constraints.maxTotalDurationMs}ms)`,
      );
    }

    return warnings;
  }

  // ─── Duration Estimation ─────────────────────────────────────────

  private estimateDuration(steps: OrchestrationStep[], dependencies: StepDependency[]): number {
    const depMap = new Map<string, Set<string>>();
    for (const dep of dependencies) {
      depMap.set(dep.stepId, new Set(dep.dependsOnStepIds));
    }

    // Assign base durations
    const stepDurations = new Map<string, number>();

    for (const step of steps) {
      stepDurations.set(step.id, step.input.context?.estimatedDurationMs || 5000);
    }

    // Calculate earliest completion time for each step (critical path)
    const earliestCompletion = new Map<string, number>();
    const calculateECT = (stepId: string): number => {
      if (earliestCompletion.has(stepId)) {
        return earliestCompletion.get(stepId)!;
      }

      const deps = depMap.get(stepId);
      let maxDepCompletion = 0;

      if (deps && deps.size > 0) {
        for (const depId of deps) {
          maxDepCompletion = Math.max(maxDepCompletion, calculateECT(depId));
        }
      }

      const duration = stepDurations.get(stepId) || 5000;
      const ect = maxDepCompletion + duration;
      earliestCompletion.set(stepId, ect);

      return ect;
    };

    let maxCompletion = 0;
    for (const step of steps) {
      maxCompletion = Math.max(maxCompletion, calculateECT(step.id));
    }

    return maxCompletion;
  }
}
