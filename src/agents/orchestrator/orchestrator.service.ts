/**
 * AENEWS Agent OS X - Orchestrator Service
 * Full task orchestration pipeline that coordinates the entire
 * Decompose → Plan → Execute → Critique → Repair → Validate → Deliver cycle.
 * Features enhanced error handling, metrics collection, and cancellation support.
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentInput,
  AgentOutput,
  TaskDefinition,
  TaskStatus,
  TaskPriority,
  OrchestrationPlan,
  OrchestrationStep,
  AgentCluster,
} from '../interfaces/agent.interface';
import {
  AgentEventType,
  OrchestrationStartedPayload,
  OrchestrationCompletedPayload,
} from '../interfaces/agent-event.interface';
import { TaskDecomposerService } from './task-decomposer.service';
import { TaskPlannerService } from './task-planner.service';
import { TaskExecutorService } from './task-executor.service';
import { TaskCriticService } from './task-critic.service';
import { TaskRepairService } from './task-repair.service';
import { TaskValidatorService } from './task-validator.service';
import { TaskDeliveryService } from './task-delivery.service';
import { EventBusService } from '../events/event-bus.service';
import { AgentRegistryService } from '../registry/agent-registry.service';
import { MemoryService } from '../memory/memory.service';

// ─── Orchestration Request ────────────────────────────────────────
export interface OrchestrationRequest {
  taskId?: string;
  payload: any;
  cluster?: AgentCluster;
  priority?: TaskPriority;
  context?: Record<string, any>;
  parentTaskId?: string;
  maxRepairAttempts?: number;
  timeoutMs?: number;
  skipCritique?: boolean;
  skipValidation?: boolean;
  deliveryFormat?: string;
}

// ─── Orchestration Result ─────────────────────────────────────────
export interface OrchestrationResult {
  taskId: string;
  success: boolean;
  result: any;
  plan: OrchestrationPlan;
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  repairAttempts: number;
  totalExecutionTimeMs: number;
  error?: string;
  phaseTimings: PhaseTiming[];
  validationScore?: number;
  critiqueScore?: number;
}

// ─── Phase Timing ─────────────────────────────────────────────────
export interface PhaseTiming {
  phase: OrchestrationPhase;
  durationMs: number;
  success: boolean;
}

// ─── Orchestration Phase ──────────────────────────────────────────
export enum OrchestrationPhase {
  DECOMPOSE = 'decompose',
  PLAN = 'plan',
  EXECUTE = 'execute',
  CRITIQUE = 'critique',
  REPAIR = 'repair',
  VALIDATE = 'validate',
  DELIVER = 'deliver',
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly activeOrchestrations: Map<string, OrchestrationResult> = new Map();
  private readonly cancelledTasks: Set<string> = new Set();

  constructor(
    private readonly decomposer: TaskDecomposerService,
    private readonly planner: TaskPlannerService,
    private readonly executor: TaskExecutorService,
    private readonly critic: TaskCriticService,
    private readonly repairService: TaskRepairService,
    private readonly validator: TaskValidatorService,
    private readonly deliveryService: TaskDeliveryService,
    private readonly eventBusService: EventBusService,
    private readonly agentRegistry: AgentRegistryService,
    private readonly memoryService: MemoryService,
  ) {}

  /**
   * Orchestrate a task through the full pipeline:
   * Decompose → Plan → Execute → Critique → Repair → Validate → Deliver
   */
  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const taskId = request.taskId || uuidv4();
    const correlationId = request.context?.correlationId || uuidv4();
    const startTime = Date.now();

    const result: OrchestrationResult = {
      taskId,
      success: false,
      result: null,
      plan: null!,
      totalSteps: 0,
      successfulSteps: 0,
      failedSteps: 0,
      repairAttempts: 0,
      totalExecutionTimeMs: 0,
      phaseTimings: [],
    };

    this.activeOrchestrations.set(taskId, result);

    try {
      // ─── Phase 1: Receive & Create Task ──────────────────────────
      this.logger.log(`Starting orchestration for task ${taskId}`);
      await this.emitOrchestrationEvent(taskId, correlationId, request);

      // Check for cancellation
      if (this.isCancelled(taskId)) {
        return this.cancelResult(result, taskId, startTime);
      }

      // ─── Phase 2: Decompose ──────────────────────────────────────
      this.logger.log(`Decomposing task ${taskId}`);
      const decomposeStart = Date.now();
      const subtasks = await this.decomposer.decompose({
        taskId,
        payload: request.payload,
        context: { ...request.context, correlationId },
        parentTaskId: request.parentTaskId,
        priority: request.priority || TaskPriority.NORMAL,
      });
      result.phaseTimings.push({
        phase: OrchestrationPhase.DECOMPOSE,
        durationMs: Date.now() - decomposeStart,
        success: true,
      });

      result.totalSteps = subtasks.length;

      if (this.isCancelled(taskId)) {
        return this.cancelResult(result, taskId, startTime);
      }

      // ─── Phase 3: Plan ───────────────────────────────────────────
      this.logger.log(`Planning execution for task ${taskId}`);
      const planStart = Date.now();
      const plan = await this.planner.createPlan(subtasks, request);
      result.plan = plan;
      result.phaseTimings.push({
        phase: OrchestrationPhase.PLAN,
        durationMs: Date.now() - planStart,
        success: true,
      });

      this.eventBusService
        .publish({
          type: AgentEventType.ORCHESTRATION_PLANNED,
          sourceAgentId: 'orchestrator',
          cluster: request.cluster,
          payload: {
            taskId,
            totalSteps: plan.steps.length,
            estimatedDurationMs: plan.estimatedDurationMs,
          },
          priority: 1,
          correlationId,
          metadata: {},
        })
        .catch(() => {});

      if (this.isCancelled(taskId)) {
        return this.cancelResult(result, taskId, startTime);
      }

      // ─── Phase 4: Execute ────────────────────────────────────────
      this.logger.log(`Executing plan for task ${taskId}`);
      const executeStart = Date.now();
      let executionResults = await this.executor.executePlan(plan, correlationId);
      result.phaseTimings.push({
        phase: OrchestrationPhase.EXECUTE,
        durationMs: Date.now() - executeStart,
        success: executionResults.some((r) => r.success),
      });

      if (this.isCancelled(taskId)) {
        return this.cancelResult(result, taskId, startTime);
      }

      // ─── Phase 5: Critique ──────────────────────────────────────
      let critiqueResult;
      if (!request.skipCritique) {
        this.logger.log(`Critiquing results for task ${taskId}`);
        const critiqueStart = Date.now();
        critiqueResult = await this.critic.critique(executionResults, request);
        result.critiqueScore = critiqueResult.score;
        result.phaseTimings.push({
          phase: OrchestrationPhase.CRITIQUE,
          durationMs: Date.now() - critiqueStart,
          success: critiqueResult.passed,
        });
      } else {
        critiqueResult = {
          passed: true,
          score: 100,
          issues: [],
          summary: 'Skipped',
          recommendations: [],
        };
        result.critiqueScore = 100;
      }

      // ─── Phase 6: Repair (if needed) ────────────────────────────
      let repairAttempts = 0;
      const maxRepairAttempts = request.maxRepairAttempts ?? 3;

      if (!request.skipCritique) {
        const repairStart = Date.now();
        while (!critiqueResult.passed && repairAttempts < maxRepairAttempts) {
          repairAttempts++;
          this.logger.warn(
            `Critique failed for task ${taskId}, repair attempt ${repairAttempts}/${maxRepairAttempts}`,
          );

          const repairResult = await this.repairService.repair(
            executionResults,
            critiqueResult,
            request,
          );

          if (repairResult.repairedPlan) {
            executionResults = await this.executor.executePlan(
              repairResult.repairedPlan,
              correlationId,
            );
            const reCritique = await this.critic.critique(executionResults, request);
            critiqueResult.passed = reCritique.passed;
            critiqueResult.score = reCritique.score;
            critiqueResult.issues = reCritique.issues;
          } else {
            this.logger.error(`Repair failed for task ${taskId}: ${repairResult.error}`);
            break;
          }
        }
        result.phaseTimings.push({
          phase: OrchestrationPhase.REPAIR,
          durationMs: Date.now() - repairStart,
          success: critiqueResult.passed,
        });
      }

      result.repairAttempts = repairAttempts;

      // ─── Phase 7: Validate ──────────────────────────────────────
      let validationResult;
      if (!request.skipValidation) {
        this.logger.log(`Validating output for task ${taskId}`);
        const validateStart = Date.now();
        validationResult = await this.validator.validate(executionResults, request);
        result.validationScore = validationResult.score;
        result.phaseTimings.push({
          phase: OrchestrationPhase.VALIDATE,
          durationMs: Date.now() - validateStart,
          success: validationResult.isValid,
        });

        if (!validationResult.isValid) {
          result.success = false;
          result.error = `Validation failed: ${validationResult.errors.join('; ')}`;
          result.failedSteps = executionResults.filter((r) => !r.success).length;
          result.successfulSteps = executionResults.filter((r) => r.success).length;

          this.eventBusService
            .publish({
              type: AgentEventType.ORCHESTRATION_FAILED,
              sourceAgentId: 'orchestrator',
              payload: { taskId, error: result.error },
              priority: 2,
              correlationId,
              metadata: {},
            })
            .catch(() => {});

          return this.finalize(result, startTime, taskId);
        }
      } else {
        validationResult = {
          isValid: true,
          score: 100,
          errors: [],
          warnings: [],
          details: {
            totalSteps: executionResults.length,
            successfulSteps: executionResults.filter((r) => r.success).length,
            failedSteps: executionResults.filter((r) => !r.success).length,
            completenessScore: 100,
            qualityScore: 100,
            performanceScore: 100,
            complianceScore: 100,
            integrityScore: 100,
            schemaValidationScore: 100,
          },
        };
        result.validationScore = 100;
      }

      // ─── Phase 8: Deliver ───────────────────────────────────────
      this.logger.log(`Delivering result for task ${taskId}`);
      const deliverStart = Date.now();
      const deliveryResult = await this.deliveryService.deliver(
        taskId,
        executionResults,
        validationResult,
      );
      result.phaseTimings.push({
        phase: OrchestrationPhase.DELIVER,
        durationMs: Date.now() - deliverStart,
        success: true,
      });

      result.success = true;
      result.result = deliveryResult.deliveredOutput;
      result.successfulSteps = executionResults.filter((r) => r.success).length;
      result.failedSteps = executionResults.filter((r) => !r.success).length;

      // Store result in memory
      await this.storeOrchestrationResult(taskId, result);

      this.eventBusService
        .publish({
          type: AgentEventType.ORCHESTRATION_COMPLETED,
          sourceAgentId: 'orchestrator',
          cluster: request.cluster,
          payload: {
            taskId,
            correlationId,
            totalSteps: result.totalSteps,
            successfulSteps: result.successfulSteps,
            failedSteps: result.failedSteps,
            totalExecutionTimeMs: result.totalExecutionTimeMs,
          } as OrchestrationCompletedPayload,
          priority: 1,
          correlationId,
          metadata: {},
        })
        .catch(() => {});

      this.logger.log(
        `Orchestration completed for task ${taskId}: ` +
          `${result.successfulSteps}/${result.totalSteps} steps succeeded`,
      );

      return this.finalize(result, startTime, taskId);
    } catch (error) {
      result.success = false;
      result.error = (error as Error).message;

      this.logger.error(
        `Orchestration failed for task ${taskId}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      this.eventBusService
        .publish({
          type: AgentEventType.ORCHESTRATION_FAILED,
          sourceAgentId: 'orchestrator',
          payload: { taskId, error: result.error },
          priority: 2,
          correlationId,
          metadata: {},
        })
        .catch(() => {});

      return this.finalize(result, startTime, taskId);
    }
  }

  /**
   * Get the status of an active orchestration.
   */
  getOrchestrationStatus(taskId: string): OrchestrationResult | null {
    return this.activeOrchestrations.get(taskId) || null;
  }

  /**
   * Cancel an active orchestration.
   */
  async cancelOrchestration(taskId: string): Promise<boolean> {
    const result = this.activeOrchestrations.get(taskId);
    if (!result) return false;

    this.cancelledTasks.add(taskId);

    this.eventBusService
      .publish({
        type: AgentEventType.TASK_CANCELLED,
        sourceAgentId: 'orchestrator',
        payload: { taskId, reason: 'Manual cancellation' },
        priority: 2,
        correlationId: uuidv4(),
        metadata: {},
      })
      .catch(() => {});

    return true;
  }

  /**
   * Get all active orchestration IDs.
   */
  getActiveOrchestrations(): string[] {
    return Array.from(this.activeOrchestrations.keys());
  }

  /**
   * Get orchestration statistics.
   */
  getStats(): {
    activeOrchestrations: number;
    cancelledTasks: number;
  } {
    return {
      activeOrchestrations: this.activeOrchestrations.size,
      cancelledTasks: this.cancelledTasks.size,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────

  private isCancelled(taskId: string): boolean {
    return this.cancelledTasks.has(taskId);
  }

  private cancelResult(
    result: OrchestrationResult,
    taskId: string,
    startTime: number,
  ): OrchestrationResult {
    result.success = false;
    result.error = 'Orchestration cancelled';
    this.cancelledTasks.delete(taskId);
    return this.finalize(result, startTime, taskId);
  }

  private async emitOrchestrationEvent(
    taskId: string,
    correlationId: string,
    request: OrchestrationRequest,
  ): Promise<void> {
    const payloadSummary =
      typeof request.payload === 'string'
        ? request.payload.substring(0, 200)
        : JSON.stringify(request.payload).substring(0, 200);

    this.eventBusService
      .publish({
        type: AgentEventType.ORCHESTRATION_STARTED,
        sourceAgentId: 'orchestrator',
        cluster: request.cluster,
        payload: {
          taskId,
          correlationId,
          inputSummary: payloadSummary,
        } as OrchestrationStartedPayload,
        priority: 1,
        correlationId,
        metadata: {},
      })
      .catch(() => {});
  }

  private finalize(
    result: OrchestrationResult,
    startTime: number,
    taskId: string,
  ): OrchestrationResult {
    result.totalExecutionTimeMs = Date.now() - startTime;
    this.activeOrchestrations.delete(taskId);
    this.cancelledTasks.delete(taskId);
    return result;
  }

  private async storeOrchestrationResult(
    taskId: string,
    result: OrchestrationResult,
  ): Promise<void> {
    try {
      await this.memoryService.store(
        'orchestrator',
        `orchestration:${taskId}`,
        result,
        'long_term' as any,
        { tags: ['orchestration', 'result'] },
      );
    } catch (error) {
      this.logger.warn(`Failed to store orchestration result: ${(error as Error).message}`);
    }
  }
}
