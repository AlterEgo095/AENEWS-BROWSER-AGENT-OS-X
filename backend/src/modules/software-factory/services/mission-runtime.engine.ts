/**
 * AENEWS Software Factory — Mission Runtime Engine
 *
 * THE execution motor — orchestrates step-by-step mission execution.
 *
 * Handles:
 *   1. Step execution with timeout and error handling
 *   2. Result evaluation and quality gates
 *   3. Retry logic with exponential backoff
 *   4. Fallback strategies for failed steps
 *   5. Progress event emission
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  MissionState,
  TransitionTrigger,
  TransitionContext,
} from '../interfaces/mission.interface';
import { AgentEventBusService } from '../../agent-framework/services/agent-event-bus.service';
import { MissionStateMachineService } from './mission-state-machine.service';
import { MissionContractService } from './mission-contract.service';
import { ConnectorRegistryService } from './connector-registry.service';

// ─── Step Definitions ────────────────────────────────────────

export interface MissionStep {
  id: string;
  name: string;
  description: string;
  phase: MissionPhase;
  connectorName?: string;
  action?: string;
  parameters: Record<string, any>;
  maxRetries: number;
  timeoutMs: number;
  dependencies: string[];
}

export enum MissionPhase {
  PLANNING = 'PLANNING',
  RESEARCH = 'RESEARCH',
  BUILDING = 'BUILDING',
  TESTING = 'TESTING',
  AUDITING = 'AUDITING',
  CERTIFYING = 'CERTIFYING',
  DELIVERING = 'DELIVERING',
}

export interface StepResult {
  stepId: string;
  success: boolean;
  output: any;
  artifacts: string[];
  durationMs: number;
  costUsd: number;
  retryCount: number;
  error?: string;
}

export interface StepEvaluation {
  stepId: string;
  passed: boolean;
  qualityScore: number; // 0-100
  issues: string[];
  recommendation: 'continue' | 'retry' | 'skip' | 'abort';
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryableErrors: string[];
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  backoffMs: 1000,
  backoffMultiplier: 2,
  maxBackoffMs: 30000,
  retryableErrors: ['TIMEOUT', 'RATE_LIMIT', 'TEMPORARY_FAILURE'],
};

@Injectable()
export class MissionRuntimeEngine {
  private readonly logger = new Logger(MissionRuntimeEngine.name);
  private readonly stepResults = new Map<string, StepResult[]>();
  private readonly stepEvaluations = new Map<string, StepEvaluation[]>();

  constructor(
    private readonly eventBus: AgentEventBusService,
    private readonly stateMachine: MissionStateMachineService,
    private readonly contractService: MissionContractService,
    private readonly connectorRegistry: ConnectorRegistryService,
  ) {}

  /**
   * Execute a single mission step
   */
  async executeStep(missionId: string, step: MissionStep): Promise<StepResult> {
    const startTime = Date.now();
    this.logger.log(`Executing step ${step.id} (${step.name}) for mission ${missionId}`);

    let retryCount = 0;
    let lastError: string | undefined;

    while (retryCount <= step.maxRetries) {
      try {
        // Execute via connector if specified
        let output: any;
        let costUsd = 0;

        if (step.connectorName && step.action) {
          const result = await this.connectorRegistry.executeAction(
            step.connectorName,
            step.action,
            {
              missionId,
              ...step.parameters,
            },
          );
          output = result.output;
          costUsd = result.costUsd;
        } else {
          // Simulation mode — return mock output
          output = this.simulateStepOutput(step);
          costUsd = 0.5;
        }

        const result: StepResult = {
          stepId: step.id,
          success: true,
          output,
          artifacts: output?.artifacts || [],
          durationMs: Date.now() - startTime,
          costUsd,
          retryCount,
        };

        // Track step result
        const results = this.stepResults.get(missionId) || [];
        results.push(result);
        this.stepResults.set(missionId, results);

        // Track spending
        this.contractService.trackSpend(
          this.getContractIdForMission(missionId),
          costUsd,
        );

        // Emit progress event
        await this.eventBus.emitProgress(missionId, 0, step.name);

        this.logger.log(
          `Step ${step.id} completed for mission ${missionId} in ${result.durationMs}ms (cost: $${costUsd.toFixed(3)})`,
        );

        return result;
      } catch (error) {
        lastError = (error as Error).message;
        retryCount++;

        if (retryCount <= step.maxRetries) {
          const backoff = this.calculateBackoff(retryCount, DEFAULT_RETRY_POLICY);
          this.logger.warn(
            `Step ${step.id} failed (attempt ${retryCount}/${step.maxRetries}), retrying in ${backoff}ms: ${lastError}`,
          );
          await this.sleep(backoff);
        }
      }
    }

    // All retries exhausted
    const failedResult: StepResult = {
      stepId: step.id,
      success: false,
      output: null,
      artifacts: [],
      durationMs: Date.now() - startTime,
      costUsd: 0,
      retryCount,
      error: lastError,
    };

    const results = this.stepResults.get(missionId) || [];
    results.push(failedResult);
    this.stepResults.set(missionId, results);

    this.logger.error(
      `Step ${step.id} failed for mission ${missionId} after ${retryCount} retries: ${lastError}`,
    );

    return failedResult;
  }

  /**
   * Evaluate a step result
   */
  async evaluateStepResult(missionId: string, result: StepResult): Promise<StepEvaluation> {
    this.logger.log(`Evaluating step result ${result.stepId} for mission ${missionId}`);

    const issues: string[] = [];
    let qualityScore = 100;
    let recommendation: StepEvaluation['recommendation'] = 'continue';

    if (!result.success) {
      qualityScore = 0;
      issues.push(`Step failed: ${result.error || 'Unknown error'}`);

      if (result.retryCount < DEFAULT_RETRY_POLICY.maxRetries) {
        recommendation = 'retry';
      } else {
        recommendation = 'abort';
      }
    } else {
      // Quality checks on output
      if (!result.output) {
        qualityScore -= 20;
        issues.push('Step produced no output');
      }

      if (result.durationMs > 60000) {
        qualityScore -= 10;
        issues.push('Step took longer than expected');
      }

      if (result.costUsd > 5) {
        qualityScore -= 15;
        issues.push(`Step cost exceeded threshold ($${result.costUsd.toFixed(2)})`);
      }
    }

    qualityScore = Math.max(0, qualityScore);

    // Determine recommendation based on quality
    if (qualityScore >= 70) {
      recommendation = 'continue';
    } else if (qualityScore >= 40) {
      recommendation = 'retry';
    } else if (qualityScore >= 20) {
      recommendation = 'skip';
    } else {
      recommendation = 'abort';
    }

    const evaluation: StepEvaluation = {
      stepId: result.stepId,
      passed: qualityScore >= 60,
      qualityScore,
      issues,
      recommendation,
    };

    const evaluations = this.stepEvaluations.get(missionId) || [];
    evaluations.push(evaluation);
    this.stepEvaluations.set(missionId, evaluations);

    this.logger.log(
      `Step ${result.stepId} evaluation: score ${qualityScore}, recommendation: ${recommendation}`,
    );

    return evaluation;
  }

  /**
   * Handle a failed step — retry, fallback, or abort
   */
  async handleStepFailure(
    missionId: string,
    step: MissionStep,
    result: StepResult,
  ): Promise<'retried' | 'fallback' | 'aborted'> {
    this.logger.warn(`Handling failure for step ${step.id} on mission ${missionId}`);

    // Check if we can retry
    if (result.retryCount < step.maxRetries) {
      this.logger.log(`Retrying step ${step.id} (attempt ${result.retryCount + 1})`);
      const retryResult = await this.executeStep(missionId, step);
      if (retryResult.success) {
        return 'retried';
      }
    }

    // Try fallback if connector provides one
    if (step.connectorName) {
      try {
        const fallbackResult = await this.connectorRegistry.executeAction(
          step.connectorName,
          'fallback',
          { missionId, originalStep: step.id, error: result.error, ...step.parameters },
        );

        if (fallbackResult.success) {
          this.logger.log(`Fallback succeeded for step ${step.id}`);
          return 'fallback';
        }
      } catch {
        this.logger.warn(`Fallback failed for step ${step.id}`);
      }
    }

    // Abort the step
    this.logger.error(`Aborting step ${step.id} for mission ${missionId}`);
    return 'aborted';
  }

  /**
   * Get all step results for a mission
   */
  getStepResults(missionId: string): StepResult[] {
    return this.stepResults.get(missionId) || [];
  }

  /**
   * Get all step evaluations for a mission
   */
  getStepEvaluations(missionId: string): StepEvaluation[] {
    return this.stepEvaluations.get(missionId) || [];
  }

  /**
   * Get overall mission progress from step results
   */
  getMissionProgress(missionId: string): {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    progressPercent: number;
  } {
    const results = this.stepResults.get(missionId) || [];
    const totalSteps = results.length;
    const completedSteps = results.filter((r) => r.success).length;
    const failedSteps = results.filter((r) => !r.success).length;

    return {
      totalSteps,
      completedSteps,
      failedSteps,
      progressPercent: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
    };
  }

  // ─── Private Helpers ────────────────────────────────────────

  private calculateBackoff(retryCount: number, policy: RetryPolicy): number {
    const backoff = policy.backoffMs * Math.pow(policy.backoffMultiplier, retryCount - 1);
    return Math.min(backoff, policy.maxBackoffMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private simulateStepOutput(step: MissionStep): any {
    return {
      phase: step.phase,
      stepName: step.name,
      status: 'simulated',
      artifacts: [`/artifacts/${step.id}/output.json`],
      summary: `Simulated output for step: ${step.description}`,
    };
  }

  private getContractIdForMission(missionId: string): string {
    // This is a simplified lookup; in production, the mission→contract mapping
    // would be maintained by the orchestrator
    return `contract-for-${missionId}`;
  }
}
