/**
 * AENEWS Agent OS X - Task Delivery Service
 * Handles the final delivery of validated orchestration results,
 * including formatting, notification, persistence, event bus delivery,
 * and temporary resource cleanup.
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { StepExecutionResult } from './task-executor.service';
import { ValidationResult } from './task-validator.service';
import { AgentEventType } from '../interfaces/agent-event.interface';
import { EventBusService } from '../events/event-bus.service';
import { MemoryService } from '../memory/memory.service';

// ─── Delivery Format ──────────────────────────────────────────────
export enum DeliveryFormat {
  RAW = 'raw',
  SUMMARY = 'summary',
  DETAILED = 'detailed',
  STRUCTURED = 'structured',
  COMPACT = 'compact',
}

// ─── Delivery Result ──────────────────────────────────────────────
export interface DeliveryResult {
  taskId: string;
  deliveredOutput: any;
  format: DeliveryFormat;
  deliveredAt: Date;
  deliveryMethod: string;
  recipient?: string;
  metadata: Record<string, any>;
}

// ─── Delivery Options ─────────────────────────────────────────────
export interface DeliveryOptions {
  format?: DeliveryFormat;
  recipient?: string;
  persist?: boolean;
  notify?: boolean;
  includeMetrics?: boolean;
  includeSteps?: boolean;
  cleanup?: boolean;
  metadata?: Record<string, any>;
}

@Injectable()
export class TaskDeliveryService {
  private readonly logger = new Logger(TaskDeliveryService.name);

  constructor(
    private readonly eventBusService: EventBusService,
    private readonly memoryService: MemoryService,
  ) {}

  /**
   * Deliver the validated orchestration results.
   * Packages the result, persists to memory, notifies via event bus,
   * and optionally cleans up temporary resources.
   */
  async deliver(
    taskId: string,
    results: StepExecutionResult[],
    validation: ValidationResult,
    options?: DeliveryOptions,
  ): Promise<DeliveryResult> {
    const startTime = Date.now();
    const format = options?.format || DeliveryFormat.STRUCTURED;
    const shouldPersist = options?.persist !== false;
    const shouldNotify = options?.notify !== false;
    const shouldCleanup = options?.cleanup !== false;

    this.logger.log(
      `Delivering task ${taskId} in ${format} format`,
    );

    // Step 1: Format the output
    const deliveredOutput = this.formatOutput(results, validation, format, options);

    // Step 2: Persist the result to memory
    if (shouldPersist) {
      await this.persistResult(taskId, deliveredOutput, results, validation);
    }

    // Step 3: Notify via event bus
    if (shouldNotify) {
      await this.notifyDelivery(taskId, deliveredOutput, validation, options);
    }

    // Step 4: Clean up temporary resources
    if (shouldCleanup) {
      await this.cleanupTemporaryResources(taskId, results);
    }

    const deliveryResult: DeliveryResult = {
      taskId,
      deliveredOutput,
      format,
      deliveredAt: new Date(),
      deliveryMethod: 'standard',
      recipient: options?.recipient,
      metadata: {
        validationScore: validation.score,
        totalSteps: validation.details.totalSteps,
        successfulSteps: validation.details.successfulSteps,
        failedSteps: validation.details.failedSteps,
        deliveryTimeMs: Date.now() - startTime,
        ...options?.metadata,
      },
    };

    // Step 5: Store delivery record in memory
    try {
      await this.memoryService.store(
        'task-delivery',
        `delivery-record:${taskId}`,
        deliveryResult,
        'long_term' as any,
        { tags: ['delivery', 'record'] },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to store delivery record for task ${taskId}: ${(error as Error).message}`,
      );
    }

    this.logger.log(
      `Task ${taskId} delivered successfully in ${Date.now() - startTime}ms`,
    );

    return deliveryResult;
  }

  /**
   * Format execution results into the requested delivery format.
   */
  private formatOutput(
    results: StepExecutionResult[],
    validation: ValidationResult,
    format: DeliveryFormat,
    options?: DeliveryOptions,
  ): any {
    switch (format) {
      case DeliveryFormat.RAW:
        return this.formatRaw(results);

      case DeliveryFormat.SUMMARY:
        return this.formatSummary(results, validation);

      case DeliveryFormat.DETAILED:
        return this.formatDetailed(results, validation, options);

      case DeliveryFormat.STRUCTURED:
        return this.formatStructured(results, validation, options);

      case DeliveryFormat.COMPACT:
        return this.formatCompact(results, validation);

      default:
        return this.formatStructured(results, validation, options);
    }
  }

  /**
   * Raw format: return results as-is.
   */
  private formatRaw(results: StepExecutionResult[]): any {
    return results.map((r) => ({
      stepId: r.stepId,
      success: r.success,
      result: r.output.result,
      error: r.output.error,
    }));
  }

  /**
   * Summary format: high-level overview.
   */
  private formatSummary(
    results: StepExecutionResult[],
    validation: ValidationResult,
  ): any {
    const successfulResults = results.filter((r) => r.success);
    const mainResult = this.extractMainResult(successfulResults);

    return {
      success: validation.isValid,
      score: validation.score,
      result: mainResult,
      summary: {
        totalSteps: validation.details.totalSteps,
        successfulSteps: validation.details.successfulSteps,
        failedSteps: validation.details.failedSteps,
      },
    };
  }

  /**
   * Detailed format: includes all step results and metrics.
   */
  private formatDetailed(
    results: StepExecutionResult[],
    validation: ValidationResult,
    options?: DeliveryOptions,
  ): any {
    return {
      success: validation.isValid,
      score: validation.score,
      result: this.extractMainResult(results.filter((r) => r.success)),
      validation: {
        isValid: validation.isValid,
        score: validation.score,
        errors: validation.errors,
        warnings: validation.warnings,
        details: validation.details,
      },
      steps: options?.includeSteps !== false
        ? results.map((r) => ({
            stepId: r.stepId,
            stepOrder: r.stepOrder,
            agentId: r.agentId,
            success: r.success,
            result: r.output.result,
            error: r.output.error,
            executionTimeMs: r.executionTimeMs,
            retryCount: r.retryCount,
            timedOut: r.timedOut,
            ...(options?.includeMetrics ? { metrics: r.output.metrics } : {}),
          }))
        : undefined,
      metadata: options?.metadata,
    };
  }

  /**
   * Structured format: well-organized output with clear sections.
   */
  private formatStructured(
    results: StepExecutionResult[],
    validation: ValidationResult,
    options?: DeliveryOptions,
  ): any {
    const successfulResults = results.filter((r) => r.success);
    const failedResults = results.filter((r) => !r.success);

    // Aggregate results from all successful steps
    const aggregatedResult = this.aggregateResults(successfulResults);

    return {
      // Core result
      success: validation.isValid,
      data: aggregatedResult,

      // Quality metrics
      quality: {
        score: validation.score,
        completeness: validation.details.completenessScore,
        quality: validation.details.qualityScore,
        performance: validation.details.performanceScore,
        compliance: validation.details.complianceScore,
        integrity: validation.details.integrityScore,
        schemaValidation: validation.details.schemaValidationScore,
      },

      // Execution summary
      execution: {
        totalSteps: validation.details.totalSteps,
        successfulSteps: validation.details.successfulSteps,
        failedSteps: validation.details.failedSteps,
        totalExecutionTimeMs: results.reduce((sum, r) => sum + r.executionTimeMs, 0),
      },

      // Issues (if any)
      issues: {
        errors: validation.errors.length > 0 ? validation.errors : undefined,
        warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
      },

      // Step details (if requested)
      steps: options?.includeSteps
        ? {
            successful: successfulResults.map((r) => ({
              stepId: r.stepId,
              order: r.stepOrder,
              result: r.output.result,
              timeMs: r.executionTimeMs,
            })),
            failed: failedResults.length > 0
              ? failedResults.map((r) => ({
                  stepId: r.stepId,
                  order: r.stepOrder,
                  error: r.output.error,
                  timeMs: r.executionTimeMs,
                  timedOut: r.timedOut,
                }))
              : undefined,
          }
        : undefined,

      // Metadata
      metadata: options?.metadata,
    };
  }

  /**
   * Compact format: minimal output.
   */
  private formatCompact(
    results: StepExecutionResult[],
    validation: ValidationResult,
  ): any {
    const mainResult = this.extractMainResult(results.filter((r) => r.success));
    return {
      ok: validation.isValid,
      data: mainResult,
      score: validation.score,
    };
  }

  /**
   * Extract the main result from successful steps.
   */
  private extractMainResult(successfulResults: StepExecutionResult[]): any {
    if (successfulResults.length === 0) {
      return null;
    }

    if (successfulResults.length === 1) {
      return successfulResults[0].output.result;
    }

    // Try to find a primary result
    const primaryResult = successfulResults.find(
      (r) => r.output.result && typeof r.output.result === 'object',
    );

    if (primaryResult) {
      return primaryResult.output.result;
    }

    return successfulResults[0].output.result;
  }

  /**
   * Aggregate results from multiple successful steps.
   */
  private aggregateResults(successfulResults: StepExecutionResult[]): any {
    if (successfulResults.length === 0) return null;
    if (successfulResults.length === 1) return successfulResults[0].output.result;

    const aggregated: Record<string, any> = {};
    for (const result of successfulResults) {
      const stepResult = result.output.result;
      if (typeof stepResult === 'object' && stepResult !== null) {
        Object.assign(aggregated, stepResult);
      } else if (stepResult !== null && stepResult !== undefined) {
        aggregated[result.stepId] = stepResult;
      }
    }

    return Object.keys(aggregated).length > 0 ? aggregated : null;
  }

  /**
   * Persist the delivery result to long-term memory.
   */
  private async persistResult(
    taskId: string,
    deliveredOutput: any,
    results: StepExecutionResult[],
    validation: ValidationResult,
  ): Promise<void> {
    try {
      await this.memoryService.store(
        'task-delivery',
        `delivery:${taskId}`,
        {
          taskId,
          deliveredOutput,
          resultCount: results.length,
          successCount: results.filter((r) => r.success).length,
          validationScore: validation.score,
          deliveredAt: new Date(),
        },
        'long_term' as any,
        { tags: ['delivery', 'result'] },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to persist delivery result for task ${taskId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Send notification about the delivery via event bus.
   */
  private async notifyDelivery(
    taskId: string,
    deliveredOutput: any,
    validation: ValidationResult,
    options?: DeliveryOptions,
  ): Promise<void> {
    try {
      await this.eventBusService.publish({
        type: AgentEventType.TASK_COMPLETED,
        sourceAgentId: 'task-delivery',
        payload: {
          taskId,
          success: validation.isValid,
          score: validation.score,
          totalSteps: validation.details.totalSteps,
          successfulSteps: validation.details.successfulSteps,
          recipient: options?.recipient,
        },
        priority: validation.isValid ? 1 : 2,
        correlationId: uuidv4(),
        metadata: { deliveryFormat: options?.format || DeliveryFormat.STRUCTURED },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send delivery notification for task ${taskId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Clean up temporary resources created during orchestration.
   * Removes working memory entries, temporary data, and intermediate results.
   */
  private async cleanupTemporaryResources(
    taskId: string,
    results: StepExecutionResult[],
  ): Promise<void> {
    try {
      // Clean up working memory entries for this task
      await this.memoryService.store(
        'task-delivery',
        `cleanup:${taskId}`,
        {
          taskId,
          cleanedUpAt: new Date(),
          cleanedStepCount: results.length,
        },
        'working' as any,
        { tags: ['cleanup'] },
      );

      // Clear working memory for each step
      for (const result of results) {
        try {
          await this.memoryService.store(
            'task-delivery',
            `step-cleanup:${result.stepId}`,
            { cleanedUp: true, taskId },
            'working' as any,
            { tags: ['cleanup', 'step'] },
          );
        } catch {
          // Individual step cleanup failures are non-critical
        }
      }

      this.logger.debug?.(`Cleaned up temporary resources for task ${taskId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to clean up temporary resources for task ${taskId}: ${(error as Error).message}`,
      );
    }
  }
}
