/**
 * AENEWS Agent OS X - Task Repair Service
 * Attempts to repair failed steps and improve quality of execution results.
 * Features: repair iteration limiting, history tracking, multiple strategies,
 * and suggestion-based improvements.
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  OrchestrationPlan,
  OrchestrationStep,
  TaskStatus,
  AgentInput,
} from '../interfaces/agent.interface';
import { CritiqueResult, CritiqueIssue, CritiqueCategory } from './task-critic.service';
import { StepExecutionResult } from './task-executor.service';
import { OrchestrationRequest } from './orchestrator.service';
import { TaskPlannerService } from './task-planner.service';

// ─── Repair Result ────────────────────────────────────────────────
export interface RepairResult {
  repairedPlan: OrchestrationPlan | null;
  repairedSteps: string[];
  failedRepairs: string[];
  error?: string;
  history: RepairHistoryEntry[];
}

// ─── Repair Strategy ──────────────────────────────────────────────
export enum RepairStrategy {
  RETRY = 'retry',
  REASSIGN = 'reassign',
  SIMPLIFY = 'simplify',
  DECOMPOSE_FURTHER = 'decompose_further',
  FALLBACK = 'fallback',
  SKIP = 'skip',
}

// ─── Repair History Entry ─────────────────────────────────────────
export interface RepairHistoryEntry {
  stepId: string;
  strategy: RepairStrategy;
  timestamp: Date;
  attemptNumber: number;
  success: boolean;
  error?: string;
  previousError?: string;
}

// ─── Repair Config ────────────────────────────────────────────────
export interface RepairConfig {
  maxRepairIterations: number;
  maxRetryPerStep: number;
  enableReassignment: boolean;
  enableSimplification: boolean;
  enableDecomposition: boolean;
  enableFallback: boolean;
  trackHistory: boolean;
}

const DEFAULT_REPAIR_CONFIG: RepairConfig = {
  maxRepairIterations: 3,
  maxRetryPerStep: 3,
  enableReassignment: true,
  enableSimplification: true,
  enableDecomposition: true,
  enableFallback: true,
  trackHistory: true,
};

@Injectable()
export class TaskRepairService {
  private readonly logger = new Logger(TaskRepairService.name);
  private readonly config: RepairConfig = { ...DEFAULT_REPAIR_CONFIG };
  private readonly repairHistory: Map<string, RepairHistoryEntry[]> = new Map();

  constructor(private readonly plannerService: TaskPlannerService) {}

  /**
   * Attempt to repair execution results based on critique issues.
   * Tracks repair history and respects iteration limits.
   */
  async repair(
    results: StepExecutionResult[],
    critique: CritiqueResult,
    request: OrchestrationRequest,
  ): Promise<RepairResult> {
    const startTime = Date.now();
    this.logger.log(
      `Repairing ${critique.issues.length} issues from ${results.length} results`,
    );

    const repairedSteps: string[] = [];
    const failedRepairs: string[] = [];
    const repairedPlanSteps: OrchestrationStep[] = [];
    const historyEntries: RepairHistoryEntry[] = [];

    // Check repair iteration limits
    const taskId = request.taskId || 'unknown';
    const existingHistory = this.repairHistory.get(taskId) || [];
    const currentIteration = existingHistory.length + 1;

    if (currentIteration > this.config.maxRepairIterations) {
      this.logger.warn(
        `Max repair iterations (${this.config.maxRepairIterations}) reached for task ${taskId}`,
      );
      return {
        repairedPlan: null,
        repairedSteps: [],
        failedRepairs: critique.issues.map((i) => i.stepId),
        error: 'Max repair iterations reached',
        history: existingHistory,
      };
    }

    // Group issues by repair strategy
    const issuesByStrategy = this.categorizeIssues(critique.issues);

    // Process each repair strategy
    for (const [strategy, issues] of issuesByStrategy) {
      for (const issue of issues) {
        const relatedResult = results.find((r) => r.stepId === issue.stepId);

        // Check if this step has exceeded max retries
        const stepRetryCount = existingHistory.filter(
          (h) => h.stepId === issue.stepId && h.strategy === RepairStrategy.RETRY,
        ).length;

        if (strategy === RepairStrategy.RETRY && stepRetryCount >= this.config.maxRetryPerStep) {
          failedRepairs.push(issue.stepId);
          this.logger.warn(
            `Step ${issue.stepId} has exceeded max retry count (${this.config.maxRetryPerStep})`,
          );
          continue;
        }

        try {
          const repairedStep = await this.applyRepairStrategy(
            strategy,
            issue,
            relatedResult,
            request,
            currentIteration,
          );

          if (repairedStep) {
            repairedPlanSteps.push(repairedStep);
            repairedSteps.push(issue.stepId);
            this.logger.log(
              `Repaired step ${issue.stepId} using ${strategy} strategy`,
            );

            // Record success
            const historyEntry: RepairHistoryEntry = {
              stepId: issue.stepId,
              strategy,
              timestamp: new Date(),
              attemptNumber: currentIteration,
              success: true,
              previousError: issue.message,
            };
            historyEntries.push(historyEntry);
          } else {
            failedRepairs.push(issue.stepId);
            this.logger.warn(
              `Failed to repair step ${issue.stepId} using ${strategy} strategy`,
            );

            // Record failure
            const historyEntry: RepairHistoryEntry = {
              stepId: issue.stepId,
              strategy,
              timestamp: new Date(),
              attemptNumber: currentIteration,
              success: false,
              error: `Repair strategy ${strategy} returned null`,
              previousError: issue.message,
            };
            historyEntries.push(historyEntry);
          }
        } catch (error) {
          failedRepairs.push(issue.stepId);
          this.logger.error(
            `Error repairing step ${issue.stepId}: ${(error as Error).message}`,
          );

          // Record error
          const historyEntry: RepairHistoryEntry = {
            stepId: issue.stepId,
            strategy,
            timestamp: new Date(),
            attemptNumber: currentIteration,
            success: false,
            error: (error as Error).message,
            previousError: issue.message,
          };
          historyEntries.push(historyEntry);
        }
      }
    }

    // Update repair history
    if (this.config.trackHistory) {
      const updatedHistory = [...existingHistory, ...historyEntries];
      this.repairHistory.set(taskId, updatedHistory);
    }

    // Build repaired plan
    let repairedPlan: OrchestrationPlan | null = null;

    if (repairedPlanSteps.length > 0) {
      const allSteps = this.mergeRepairedSteps(results, repairedPlanSteps);

      repairedPlan = {
        id: uuidv4(),
        taskId: taskId,
        steps: allSteps,
        dependencies: this.rebuildDependencies(allSteps),
        createdAt: new Date(),
        estimatedDurationMs: this.estimateRepairedDuration(allSteps),
      };
    }

    this.logger.log(
      `Repair completed: ${repairedSteps.length} repaired, ` +
      `${failedRepairs.length} failed in ${Date.now() - startTime}ms`,
    );

    return {
      repairedPlan,
      repairedSteps,
      failedRepairs,
      error: failedRepairs.length > 0
        ? `${failedRepairs.length} step(s) could not be repaired`
        : undefined,
      history: historyEntries,
    };
  }

  /**
   * Get repair history for a task.
   */
  getRepairHistory(taskId: string): RepairHistoryEntry[] {
    return this.repairHistory.get(taskId) || [];
  }

  /**
   * Clear repair history for a task.
   */
  clearRepairHistory(taskId: string): void {
    this.repairHistory.delete(taskId);
  }

  /**
   * Get current repair iteration count for a task.
   */
  getRepairIterationCount(taskId: string): number {
    return (this.repairHistory.get(taskId) || []).length;
  }

  /**
   * Categorize issues by the best repair strategy.
   */
  private categorizeIssues(
    issues: CritiqueIssue[],
  ): Map<RepairStrategy, CritiqueIssue[]> {
    const categorized = new Map<RepairStrategy, CritiqueIssue[]>();

    for (const issue of issues) {
      const strategy = this.selectRepairStrategy(issue);
      const existing = categorized.get(strategy) || [];
      existing.push(issue);
      categorized.set(strategy, existing);
    }

    return categorized;
  }

  /**
   * Select the best repair strategy for an issue.
   */
  private selectRepairStrategy(issue: CritiqueIssue): RepairStrategy {
    // Critical issues that can't be auto-repaired
    if (!issue.autoRepairable) {
      if (issue.severity === 'critical') {
        return RepairStrategy.SKIP;
      }
      return this.config.enableFallback ? RepairStrategy.FALLBACK : RepairStrategy.SKIP;
    }

    // Category-based strategy selection
    switch (issue.category) {
      case CritiqueCategory.ERROR_HANDLING:
        if (issue.severity === 'error') {
          return RepairStrategy.RETRY;
        }
        return this.config.enableReassignment ? RepairStrategy.REASSIGN : RepairStrategy.RETRY;

      case CritiqueCategory.PERFORMANCE:
        return this.config.enableSimplification ? RepairStrategy.SIMPLIFY : RepairStrategy.RETRY;

      case CritiqueCategory.COMPLETENESS:
        return this.config.enableDecomposition ? RepairStrategy.DECOMPOSE_FURTHER : RepairStrategy.RETRY;

      case CritiqueCategory.CONSISTENCY:
        return RepairStrategy.RETRY;

      case CritiqueCategory.ACCURACY:
        return RepairStrategy.RETRY;

      case CritiqueCategory.DATA_QUALITY:
        return RepairStrategy.RETRY;

      case CritiqueCategory.COMPLIANCE:
        return this.config.enableFallback ? RepairStrategy.FALLBACK : RepairStrategy.SKIP;

      default:
        return RepairStrategy.RETRY;
    }
  }

  /**
   * Apply a specific repair strategy to an issue.
   */
  private async applyRepairStrategy(
    strategy: RepairStrategy,
    issue: CritiqueIssue,
    relatedResult: StepExecutionResult | undefined,
    request: OrchestrationRequest,
    iteration: number,
  ): Promise<OrchestrationStep | null> {
    switch (strategy) {
      case RepairStrategy.RETRY:
        return this.retryStep(issue, relatedResult, request, iteration);

      case RepairStrategy.REASSIGN:
        return this.reassignStep(issue, relatedResult, request);

      case RepairStrategy.SIMPLIFY:
        return this.simplifyStep(issue, relatedResult, request);

      case RepairStrategy.DECOMPOSE_FURTHER:
        return this.decomposeStep(issue, relatedResult, request);

      case RepairStrategy.FALLBACK:
        return this.fallbackStep(issue, relatedResult, request);

      case RepairStrategy.SKIP:
        return null;

      default:
        return null;
    }
  }

  /**
   * Retry a failed step with adjusted parameters.
   */
  private retryStep(
    issue: CritiqueIssue,
    relatedResult: StepExecutionResult | undefined,
    request: OrchestrationRequest,
    iteration: number,
  ): OrchestrationStep {
    const baseStep = relatedResult
      ? this.resultToStep(relatedResult)
      : this.createDefaultStep(issue, request);

    return {
      ...baseStep,
      id: uuidv4(),
      status: TaskStatus.PENDING,
      retryCount: (relatedResult?.retryCount || 0) + 1,
      input: {
        ...baseStep.input,
        context: {
          ...baseStep.input.context,
          isRetry: true,
          retryReason: issue.message,
          previousError: relatedResult?.output.error,
          repairStrategy: RepairStrategy.RETRY,
          repairIteration: iteration,
        },
      },
    };
  }

  /**
   * Reassign a step to a different agent.
   */
  private reassignStep(
    issue: CritiqueIssue,
    relatedResult: StepExecutionResult | undefined,
    request: OrchestrationRequest,
  ): OrchestrationStep {
    const baseStep = relatedResult
      ? this.resultToStep(relatedResult)
      : this.createDefaultStep(issue, request);

    return {
      ...baseStep,
      id: uuidv4(),
      agentId: undefined, // Let the planner reassign
      status: TaskStatus.PENDING,
      retryCount: 0,
      input: {
        ...baseStep.input,
        context: {
          ...baseStep.input.context,
          isReassignment: true,
          previousAgentId: relatedResult?.agentId,
          reassignmentReason: issue.message,
          repairStrategy: RepairStrategy.REASSIGN,
        },
      },
    };
  }

  /**
   * Simplify a step by reducing its scope.
   */
  private simplifyStep(
    issue: CritiqueIssue,
    relatedResult: StepExecutionResult | undefined,
    request: OrchestrationRequest,
  ): OrchestrationStep {
    const baseStep = relatedResult
      ? this.resultToStep(relatedResult)
      : this.createDefaultStep(issue, request);

    const simplifiedPayload = this.simplifyPayload(baseStep.input.payload);

    return {
      ...baseStep,
      id: uuidv4(),
      status: TaskStatus.PENDING,
      retryCount: 0,
      input: {
        ...baseStep.input,
        payload: simplifiedPayload,
        context: {
          ...baseStep.input.context,
          isSimplified: true,
          simplificationReason: issue.message,
          originalPayload: baseStep.input.payload,
          repairStrategy: RepairStrategy.SIMPLIFY,
        },
      },
    };
  }

  /**
   * Further decompose a complex step.
   */
  private decomposeStep(
    issue: CritiqueIssue,
    relatedResult: StepExecutionResult | undefined,
    request: OrchestrationRequest,
  ): OrchestrationStep {
    const baseStep = relatedResult
      ? this.resultToStep(relatedResult)
      : this.createDefaultStep(issue, request);

    return {
      ...baseStep,
      id: uuidv4(),
      status: TaskStatus.PENDING,
      retryCount: 0,
      input: {
        ...baseStep.input,
        context: {
          ...baseStep.input.context,
          requiresFurtherDecomposition: true,
          decomposeReason: issue.message,
          repairStrategy: RepairStrategy.DECOMPOSE_FURTHER,
        },
      },
    };
  }

  /**
   * Use a fallback approach for the step.
   */
  private fallbackStep(
    issue: CritiqueIssue,
    relatedResult: StepExecutionResult | undefined,
    request: OrchestrationRequest,
  ): OrchestrationStep {
    const baseStep = relatedResult
      ? this.resultToStep(relatedResult)
      : this.createDefaultStep(issue, request);

    return {
      ...baseStep,
      id: uuidv4(),
      status: TaskStatus.PENDING,
      retryCount: 0,
      input: {
        ...baseStep.input,
        payload: request.payload, // Fall back to original request payload
        context: {
          ...baseStep.input.context,
          isFallback: true,
          fallbackReason: issue.message,
          repairStrategy: RepairStrategy.FALLBACK,
        },
      },
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private resultToStep(result: StepExecutionResult): OrchestrationStep {
    return {
      id: result.stepId,
      order: result.stepOrder,
      agentId: result.agentId,
      input: {
        taskId: result.output.taskId,
        payload: result.output.result,
        context: {},
      },
      status: TaskStatus.PENDING,
      retryCount: result.retryCount,
    };
  }

  private createDefaultStep(
    issue: CritiqueIssue,
    request: OrchestrationRequest,
  ): OrchestrationStep {
    return {
      id: issue.stepId,
      order: 0,
      cluster: request.cluster,
      input: {
        taskId: uuidv4(),
        payload: request.payload,
        context: { ...request.context },
      },
      status: TaskStatus.PENDING,
      retryCount: 0,
    };
  }

  private simplifyPayload(payload: any): any {
    if (typeof payload !== 'object' || payload === null) {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.length > 3 ? payload.slice(0, 3) : payload;
    }

    const simplified: Record<string, any> = {};
    const keys = Object.keys(payload);
    const importantKeys = keys.filter((k) =>
      !/optional|extra|metadata|debug/i.test(k),
    );

    for (const key of importantKeys.slice(0, 10)) {
      simplified[key] = payload[key];
    }

    return simplified;
  }

  private mergeRepairedSteps(
    results: StepExecutionResult[],
    repairedSteps: OrchestrationStep[],
  ): OrchestrationStep[] {
    const repairedMap = new Map(repairedSteps.map((s) => [s.id, s]));
    const allSteps: OrchestrationStep[] = [];

    // Add repaired steps
    for (const step of repairedSteps) {
      allSteps.push(step);
    }

    // Add remaining steps from original results that weren't repaired
    for (const result of results) {
      if (result.success && !repairedMap.has(result.stepId)) {
        allSteps.push({
          id: result.stepId,
          order: result.stepOrder,
          agentId: result.agentId,
          input: {
            taskId: result.output.taskId,
            payload: result.output.result,
          },
          status: TaskStatus.COMPLETED,
          output: result.output,
          retryCount: result.retryCount,
        });
      }
    }

    // Re-number order
    allSteps.sort((a, b) => a.order - b.order);
    for (let i = 0; i < allSteps.length; i++) {
      allSteps[i].order = i;
    }

    return allSteps;
  }

  private rebuildDependencies(
    steps: OrchestrationStep[],
  ): Array<{ stepId: string; dependsOnStepIds: string[] }> {
    const dependencies: Array<{ stepId: string; dependsOnStepIds: string[] }> = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const deps: string[] = [];

      // Pending steps depend on completed steps before them
      if (step.status === TaskStatus.PENDING && i > 0) {
        const prevCompleted = steps
          .slice(0, i)
          .filter((s) => s.status === TaskStatus.COMPLETED)
          .map((s) => s.id);

        if (prevCompleted.length > 0) {
          deps.push(prevCompleted[prevCompleted.length - 1]);
        }
      }

      dependencies.push({
        stepId: step.id,
        dependsOnStepIds: deps,
      });
    }

    return dependencies;
  }

  private estimateRepairedDuration(steps: OrchestrationStep[]): number {
    let total = 0;
    for (const step of steps) {
      if (step.status === TaskStatus.COMPLETED) {
        total += 0; // Already completed
      } else {
        total += step.input.context?.estimatedDurationMs || 5000;
      }
    }
    return total;
  }
}
