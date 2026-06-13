/**
 * AENEWS Agent OS X - Task Executor Service
 * Executes orchestration plans by dispatching steps to agents,
 * managing parallelism, retries, error handling, and per-step timeouts.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  AgentOutput,
  OrchestrationPlan,
  OrchestrationStep,
  StepDependency,
  TaskStatus,
  AgentError,
  AgentErrorCode,
} from '../interfaces/agent.interface';
import {
  AgentEventType,
  TaskProgressPayload,
  TaskCompletedPayload,
} from '../interfaces/agent-event.interface';
import { AgentRegistryService } from '../registry/agent-registry.service';
import { EventBusService } from '../events/event-bus.service';

// ─── Execution Result ─────────────────────────────────────────────
export interface StepExecutionResult {
  stepId: string;
  stepOrder: number;
  agentId: string;
  success: boolean;
  output: AgentOutput;
  executionTimeMs: number;
  retryCount: number;
  timedOut: boolean;
}

// ─── Execution Config ─────────────────────────────────────────────
export interface ExecutionConfig {
  defaultStepTimeoutMs: number;
  maxStepRetries: number;
  retryBackoffBaseMs: number;
  maxParallelSteps: number;
  continueOnFailure: boolean;
}

const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  defaultStepTimeoutMs: 60000, // 1 minute
  maxStepRetries: 3,
  retryBackoffBaseMs: 1000,
  maxParallelSteps: 10,
  continueOnFailure: true,
};

@Injectable()
export class TaskExecutorService {
  private readonly logger = new Logger(TaskExecutorService.name);
  private readonly config: ExecutionConfig = { ...DEFAULT_EXECUTION_CONFIG };

  constructor(
    private readonly agentRegistry: AgentRegistryService,
    private readonly eventBusService: EventBusService,
  ) {}

  /**
   * Execute an orchestration plan, respecting dependencies and parallelism.
   * Handles per-step timeouts, retries, and error recovery.
   */
  async executePlan(
    plan: OrchestrationPlan,
    correlationId: string,
  ): Promise<StepExecutionResult[]> {
    const startTime = Date.now();
    this.logger.log(`Executing plan ${plan.id} with ${plan.steps.length} steps`);

    const results: StepExecutionResult[] = [];
    const completedSteps = new Set<string>();
    const failedSteps = new Set<string>();

    // Build dependency map
    const depMap = this.buildDependencyMap(plan.dependencies);

    // Execute steps in dependency order with parallelism
    const pendingSteps = [...plan.steps].sort((a, b) => a.order - b.order);

    while (pendingSteps.length > 0) {
      // Find steps ready to execute (all deps completed)
      const readySteps = pendingSteps.filter((step) => {
        const deps = depMap.get(step.id);
        if (!deps || deps.length === 0) return true;
        return deps.every((depId) => completedSteps.has(depId));
      });

      if (readySteps.length === 0) {
        // Check if all remaining steps are blocked by failed steps
        const blockedByFailure = pendingSteps.every((step) => {
          const deps = depMap.get(step.id);
          return deps && deps.some((depId) => failedSteps.has(depId));
        });

        if (blockedByFailure) {
          this.logger.error('All remaining steps are blocked by failed dependencies');
          // Mark remaining steps as failed
          for (const step of pendingSteps) {
            results.push({
              stepId: step.id,
              stepOrder: step.order,
              agentId: step.agentId || 'none',
              success: false,
              output: {
                taskId: step.input.taskId,
                success: false,
                result: null,
                error: 'Blocked by failed dependency',
                metrics: { executionTimeMs: 0, memoryUsedMb: 0, cpuUsagePercent: 0 },
                timestamp: new Date(),
              },
              executionTimeMs: 0,
              retryCount: 0,
              timedOut: false,
            });
          }
          break;
        }

        // Wait a bit and try again
        await this.sleep(100);
        continue;
      }

      // Execute ready steps in parallel (limit concurrency)
      const batchSize = Math.min(readySteps.length, this.config.maxParallelSteps);
      const batch = readySteps.slice(0, batchSize);

      const batchResults = await Promise.allSettled(
        batch.map((step) => this.executeStep(step, correlationId)),
      );

      for (let i = 0; i < batchResults.length; i++) {
        const settledResult = batchResults[i];
        const step = batch[i];

        if (settledResult.status === 'fulfilled') {
          const result = settledResult.value;
          results.push(result);

          if (result.success) {
            completedSteps.add(step.id);
          } else {
            failedSteps.add(step.id);
          }
        } else {
          // Step execution threw an error
          const error = settledResult.reason as Error;
          results.push({
            stepId: step.id,
            stepOrder: step.order,
            agentId: step.agentId || 'none',
            success: false,
            output: {
              taskId: step.input.taskId,
              success: false,
              result: null,
              error: error.message,
              metrics: { executionTimeMs: 0, memoryUsedMb: 0, cpuUsagePercent: 0 },
              timestamp: new Date(),
            },
            executionTimeMs: 0,
            retryCount: 0,
            timedOut: false,
          });
          failedSteps.add(step.id);
        }

        // Remove completed step from pending
        const pendingIdx = pendingSteps.indexOf(step);
        if (pendingIdx >= 0) {
          pendingSteps.splice(pendingIdx, 1);
        }
      }

      // If not continuing on failure and we have failures, stop
      if (!this.config.continueOnFailure && failedSteps.size > 0) {
        this.logger.warn('Stopping execution due to step failures (continueOnFailure=false)');
        break;
      }
    }

    this.logger.log(
      `Plan ${plan.id} execution completed in ${Date.now() - startTime}ms: ` +
        `${completedSteps.size} succeeded, ${failedSteps.size} failed`,
    );

    return results;
  }

  /**
   * Execute a single orchestration step with timeout and retry.
   */
  private async executeStep(
    step: OrchestrationStep,
    correlationId: string,
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();
    step.status = TaskStatus.EXECUTING;

    // Determine timeout for this step
    const stepTimeoutMs =
      (step.input.context?.timeout as number | undefined) || this.config.defaultStepTimeoutMs;

    this.logger.log(
      `Executing step ${step.id} (order: ${step.order}) on agent ${step.agentId || 'auto'} ` +
        `(timeout: ${stepTimeoutMs}ms)`,
    );

    // Emit progress event
    this.eventBusService
      .publish({
        type: AgentEventType.TASK_PROGRESS,
        sourceAgentId: 'task-executor',
        payload: {
          taskId: step.input.taskId,
          agentId: step.agentId || 'pending',
          progress: 0,
          message: `Starting step ${step.order}`,
          currentStep: step.id,
        } as TaskProgressPayload,
        priority: 1,
        correlationId,
        metadata: { stepId: step.id },
      })
      .catch(() => {});

    try {
      // Find the agent to execute on
      const agent = this.findAgentForStep(step);

      if (!agent) {
        throw new AgentError(
          `No available agent for step ${step.id}`,
          AgentErrorCode.NOT_FOUND,
          'task-executor',
          step.input.taskId,
        );
      }

      // Set correlation ID on the agent
      if (typeof (agent as any).setCorrelationId === 'function') {
        (agent as any).setCorrelationId(correlationId);
      }

      // Execute with retry and timeout
      let output: AgentOutput | null = null;
      let retryCount = 0;
      const maxRetries = this.config.maxStepRetries;
      let timedOut = false;

      while (retryCount <= maxRetries) {
        try {
          // Execute with per-step timeout
          output = await this.executeWithTimeout(agent, step.input, stepTimeoutMs);

          if (output.success) break;

          retryCount++;
          if (retryCount <= maxRetries) {
            const backoff = this.config.retryBackoffBaseMs * Math.pow(2, retryCount - 1);
            this.logger.warn(
              `Step ${step.id} failed (attempt ${retryCount}/${maxRetries}), retrying in ${backoff}ms`,
            );
            await this.sleep(backoff);
          }
        } catch (error) {
          if ((error as AgentError).code === AgentErrorCode.TIMEOUT) {
            timedOut = true;
            retryCount++;
            if (retryCount <= maxRetries) {
              const backoff = this.config.retryBackoffBaseMs * Math.pow(2, retryCount - 1);
              this.logger.warn(
                `Step ${step.id} timed out (attempt ${retryCount}/${maxRetries}), retrying in ${backoff}ms`,
              );
              await this.sleep(backoff);
            } else {
              throw error;
            }
          } else {
            retryCount++;
            if (retryCount > maxRetries) {
              throw error;
            }
            const backoff = this.config.retryBackoffBaseMs * Math.pow(2, retryCount - 1);
            await this.sleep(backoff);
          }
        }
      }

      step.output = output!;
      step.status = output?.success ? TaskStatus.COMPLETED : TaskStatus.FAILED;
      step.retryCount = retryCount;

      const executionTimeMs = Date.now() - startTime;

      // Emit completion event
      this.eventBusService
        .publish({
          type: output?.success
            ? AgentEventType.ORCHESTRATION_STEP_COMPLETED
            : AgentEventType.TASK_FAILED,
          sourceAgentId: step.agentId || 'task-executor',
          payload: {
            taskId: step.input.taskId,
            agentId: step.agentId || 'unknown',
            success: output?.success ?? false,
            executionTimeMs,
          } as TaskCompletedPayload,
          priority: 1,
          correlationId,
          metadata: { stepId: step.id },
        })
        .catch(() => {});

      return {
        stepId: step.id,
        stepOrder: step.order,
        agentId: step.agentId || agent.getConfig().id,
        success: output?.success ?? false,
        output: output!,
        executionTimeMs,
        retryCount,
        timedOut,
      };
    } catch (error) {
      step.status = TaskStatus.FAILED;
      const executionTimeMs = Date.now() - startTime;
      const isTimeout = (error as AgentError).code === AgentErrorCode.TIMEOUT;

      this.logger.error(`Step ${step.id} execution failed: ${(error as Error).message}`);

      return {
        stepId: step.id,
        stepOrder: step.order,
        agentId: step.agentId || 'unknown',
        success: false,
        output: {
          taskId: step.input.taskId,
          success: false,
          result: null,
          error: (error as Error).message,
          metrics: { executionTimeMs, memoryUsedMb: 0, cpuUsagePercent: 0 },
          timestamp: new Date(),
        },
        executionTimeMs,
        retryCount: step.retryCount,
        timedOut: isTimeout,
      };
    }
  }

  /**
   * Execute an agent task with a per-step timeout.
   */
  private executeWithTimeout(agent: any, input: any, timeoutMs: number): Promise<AgentOutput> {
    return new Promise<AgentOutput>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new AgentError(
            `Step timed out after ${timeoutMs}ms`,
            AgentErrorCode.TIMEOUT,
            'task-executor',
            input.taskId,
          ),
        );
      }, timeoutMs);

      agent
        .execute(input)
        .then((output: AgentOutput) => {
          clearTimeout(timeoutId);
          resolve(output);
        })
        .catch((error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Find the best agent for a step.
   */
  private findAgentForStep(step: OrchestrationStep): any | null {
    // First, try the specified agent
    if (step.agentId) {
      const agent = this.agentRegistry.getAgent(step.agentId);
      if (agent && agent.canAcceptTask()) {
        return agent;
      }
    }

    // Then try by capability if specified
    if (step.capability) {
      const agent = this.agentRegistry.findBestAgent(step.capability);
      if (agent) {
        return agent;
      }
    }

    // Then try by cluster
    if (step.cluster) {
      const agents = this.agentRegistry.getAvailableAgents(step.cluster);
      if (agents.length > 0) {
        return agents.reduce((best, agent) => {
          return agent.getCurrentTaskCount() < best.getCurrentTaskCount() ? agent : best;
        });
      }
    }

    // Finally, try any available agent
    const allAvailable = this.agentRegistry.getAvailableAgents();
    if (allAvailable.length > 0) {
      return allAvailable.reduce((best, agent) => {
        return agent.getCurrentTaskCount() < best.getCurrentTaskCount() ? agent : best;
      });
    }

    return null;
  }

  /**
   * Update execution configuration.
   */
  setConfig(config: Partial<ExecutionConfig>): void {
    Object.assign(this.config, config);
    this.logger.log(`Execution config updated: ${JSON.stringify(this.config)}`);
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private buildDependencyMap(dependencies: StepDependency[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const dep of dependencies) {
      map.set(dep.stepId, dep.dependsOnStepIds);
    }
    return map;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
