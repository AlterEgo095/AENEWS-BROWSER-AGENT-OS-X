/**
 * AENEWS Agent OS X - Task Critic Service
 * Evaluates execution results and identifies quality issues,
 * inconsistencies, and areas needing repair.
 * Scores quality on a 0-100 scale and determines if repair is needed.
 */

import { Injectable, Logger } from '@nestjs/common';
import { AgentOutput } from '../interfaces/agent.interface';
import { OrchestrationRequest } from './orchestrator.service';
import { StepExecutionResult } from './task-executor.service';

// ─── Critique Result ──────────────────────────────────────────────
export interface CritiqueResult {
  passed: boolean;
  score: number;
  issues: CritiqueIssue[];
  summary: string;
  recommendations: string[];
}

export interface CritiqueIssue {
  stepId: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: CritiqueCategory;
  message: string;
  details?: Record<string, any>;
  autoRepairable: boolean;
}

export enum CritiqueCategory {
  COMPLETENESS = 'completeness',
  ACCURACY = 'accuracy',
  CONSISTENCY = 'consistency',
  PERFORMANCE = 'performance',
  ERROR_HANDLING = 'error_handling',
  DATA_QUALITY = 'data_quality',
  COMPLIANCE = 'compliance',
}

// ─── Critique Config ──────────────────────────────────────────────
export interface CritiqueConfig {
  passingScoreThreshold: number;
  criticalSeverityBlocks: boolean;
  maxIssuesPerStep: number;
  enableCrossStepConsistencyCheck: boolean;
  enableCompletenessCheck: boolean;
  enableDataQualityCheck: boolean;
}

const DEFAULT_CRITIQUE_CONFIG: CritiqueConfig = {
  passingScoreThreshold: 60,
  criticalSeverityBlocks: true,
  maxIssuesPerStep: 10,
  enableCrossStepConsistencyCheck: true,
  enableCompletenessCheck: true,
  enableDataQualityCheck: true,
};

@Injectable()
export class TaskCriticService {
  private readonly logger = new Logger(TaskCriticService.name);
  private readonly config: CritiqueConfig = { ...DEFAULT_CRITIQUE_CONFIG };

  /**
   * Critique execution results to determine if they meet quality standards.
   * Returns a score (0-100) and detailed issues.
   */
  async critique(
    results: StepExecutionResult[],
    request: OrchestrationRequest,
  ): Promise<CritiqueResult> {
    const startTime = Date.now();
    this.logger.log(`Critiquing ${results.length} execution results`);

    const issues: CritiqueIssue[] = [];
    let totalScore = 0;
    const maxScore = results.length * 100;

    // ─── Per-Step Evaluation ─────────────────────────────────────
    for (const result of results) {
      const stepScore = this.evaluateStepResult(result, request, issues);
      totalScore += stepScore;
    }

    // ─── Cross-Step Consistency Check ────────────────────────────
    if (this.config.enableCrossStepConsistencyCheck) {
      this.checkCrossStepConsistency(results, issues);
    }

    // ─── Completeness Check ──────────────────────────────────────
    if (this.config.enableCompletenessCheck) {
      this.checkCompleteness(results, request, issues);
    }

    // ─── Data Quality Check ──────────────────────────────────────
    if (this.config.enableDataQualityCheck) {
      this.checkDataQuality(results, issues);
    }

    // ─── Calculate Final Score (0-100) ───────────────────────────
    const score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const hasCriticalIssues = issues.some((i) => i.severity === 'critical');
    const passed =
      score >= this.config.passingScoreThreshold &&
      !(this.config.criticalSeverityBlocks && hasCriticalIssues);

    const recommendations = this.generateRecommendations(issues);

    const critiqueResult: CritiqueResult = {
      passed,
      score,
      issues,
      summary: this.generateSummary(results, score, issues),
      recommendations,
    };

    this.logger.log(
      `Critique completed: ${passed ? 'PASSED' : 'FAILED'} (score: ${score}) ` +
        `with ${issues.length} issues in ${Date.now() - startTime}ms`,
    );

    return critiqueResult;
  }

  /**
   * Evaluate a single step result and collect issues.
   * Returns a score (0-100) for this step.
   */
  private evaluateStepResult(
    result: StepExecutionResult,
    request: OrchestrationRequest,
    issues: CritiqueIssue[],
  ): number {
    let score = 100;

    // Check if step succeeded
    if (!result.success) {
      score -= 50;
      issues.push({
        stepId: result.stepId,
        severity: 'error',
        category: CritiqueCategory.ERROR_HANDLING,
        message: `Step failed: ${result.output.error || 'Unknown error'}`,
        details: {
          error: result.output.error,
          retryCount: result.retryCount,
          executionTimeMs: result.executionTimeMs,
          timedOut: result.timedOut,
        },
        autoRepairable: result.retryCount < 3 && !result.timedOut,
      });
    }

    // Check for timeout
    if (result.timedOut) {
      score -= 20;
      issues.push({
        stepId: result.stepId,
        severity: 'warning',
        category: CritiqueCategory.PERFORMANCE,
        message: `Step timed out after ${result.executionTimeMs}ms`,
        autoRepairable: false,
      });
    }

    // Check execution time
    const expectedMaxTime = request.context?.maxStepDurationMs ?? 60000;
    if (result.executionTimeMs > expectedMaxTime && !result.timedOut) {
      score -= 15;
      issues.push({
        stepId: result.stepId,
        severity: 'warning',
        category: CritiqueCategory.PERFORMANCE,
        message: `Step took ${result.executionTimeMs}ms, exceeding expected ${expectedMaxTime}ms`,
        details: { executionTimeMs: result.executionTimeMs, expectedMaxTime },
        autoRepairable: false,
      });
    }

    // Check output quality
    if (result.success && result.output.result !== null && result.output.result !== undefined) {
      const outputQuality = this.assessOutputQuality(result.output);
      score -= outputQuality.deduction;
      issues.push(...outputQuality.issues);
    } else if (result.success && result.output.result === null) {
      score -= 20;
      issues.push({
        stepId: result.stepId,
        severity: 'warning',
        category: CritiqueCategory.COMPLETENESS,
        message: 'Step succeeded but produced null result',
        autoRepairable: true,
      });
    }

    // Check metrics
    if (result.output.metrics) {
      if (result.output.metrics.memoryUsedMb > 500) {
        score -= 10;
        issues.push({
          stepId: result.stepId,
          severity: 'warning',
          category: CritiqueCategory.PERFORMANCE,
          message: `High memory usage: ${result.output.metrics.memoryUsedMb}MB`,
          autoRepairable: false,
        });
      }
    }

    // High retry count indicates instability
    if (result.retryCount > 1) {
      score -= 5 * result.retryCount;
      issues.push({
        stepId: result.stepId,
        severity: 'info',
        category: CritiqueCategory.ERROR_HANDLING,
        message: `Step required ${result.retryCount} retries`,
        details: { retryCount: result.retryCount },
        autoRepairable: false,
      });
    }

    return Math.max(0, score);
  }

  /**
   * Assess the quality of a step's output.
   */
  private assessOutputQuality(output: AgentOutput): {
    deduction: number;
    issues: CritiqueIssue[];
  } {
    const issues: CritiqueIssue[] = [];
    let deduction = 0;

    const result = output.result;

    // Check for empty results
    if (typeof result === 'string' && result.trim().length === 0) {
      deduction += 15;
      issues.push({
        stepId: output.taskId,
        severity: 'warning',
        category: CritiqueCategory.COMPLETENESS,
        message: 'Output is an empty string',
        autoRepairable: true,
      });
    }

    // Check for error indicators in successful output
    if (typeof result === 'object' && result !== null) {
      if (result.error || result.errors) {
        deduction += 20;
        issues.push({
          stepId: output.taskId,
          severity: 'warning',
          category: CritiqueCategory.ACCURACY,
          message: 'Successful output contains error indicators',
          details: { error: result.error, errors: result.errors },
          autoRepairable: true,
        });
      }

      // Check for partial results
      if (result.partial === true) {
        deduction += 10;
        issues.push({
          stepId: output.taskId,
          severity: 'info',
          category: CritiqueCategory.COMPLETENESS,
          message: 'Output is marked as partial',
          autoRepairable: true,
        });
      }

      // Check for truncated results
      if (result.truncated === true) {
        deduction += 15;
        issues.push({
          stepId: output.taskId,
          severity: 'warning',
          category: CritiqueCategory.COMPLETENESS,
          message: 'Output was truncated',
          autoRepairable: true,
        });
      }
    }

    return { deduction, issues };
  }

  /**
   * Check consistency across steps.
   */
  private checkCrossStepConsistency(results: StepExecutionResult[], issues: CritiqueIssue[]): void {
    const successResults = results.filter((r) => r.success);

    // Check for conflicting results
    for (let i = 0; i < successResults.length; i++) {
      for (let j = i + 1; j < successResults.length; j++) {
        const a = successResults[i].output.result;
        const b = successResults[j].output.result;

        if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
          const conflicting = this.findConflicts(a, b);
          if (conflicting.length > 0) {
            issues.push({
              stepId: `${successResults[i].stepId}+${successResults[j].stepId}`,
              severity: 'warning',
              category: CritiqueCategory.CONSISTENCY,
              message: `Conflicting results between steps: ${conflicting.join(', ')}`,
              details: { conflicts: conflicting },
              autoRepairable: true,
            });
          }
        }
      }
    }

    // Check for duplicate results
    const resultHashes = new Map<string, string>();
    for (const result of successResults) {
      const hash = this.hashResult(result.output.result);
      if (resultHashes.has(hash)) {
        issues.push({
          stepId: result.stepId,
          severity: 'info',
          category: CritiqueCategory.CONSISTENCY,
          message: `Duplicate result detected, same as step ${resultHashes.get(hash)}`,
          autoRepairable: false,
        });
      } else {
        resultHashes.set(hash, result.stepId);
      }
    }
  }

  /**
   * Check if all required results are present.
   */
  private checkCompleteness(
    results: StepExecutionResult[],
    request: OrchestrationRequest,
    issues: CritiqueIssue[],
  ): void {
    const requiredSteps = request.context?.requiredSteps as string[] | undefined;
    if (requiredSteps && Array.isArray(requiredSteps)) {
      const completedStepIds = new Set(results.map((r) => r.stepId));
      for (const requiredId of requiredSteps) {
        if (!completedStepIds.has(requiredId)) {
          issues.push({
            stepId: requiredId,
            severity: 'error',
            category: CritiqueCategory.COMPLETENESS,
            message: `Required step ${requiredId} is missing from results`,
            autoRepairable: true,
          });
        }
      }
    }

    // Check that we have results for all steps
    const failedCount = results.filter((r) => !r.success).length;
    const totalSteps = results.length;

    if (totalSteps > 0 && failedCount === totalSteps) {
      issues.push({
        stepId: 'all',
        severity: 'critical',
        category: CritiqueCategory.COMPLETENESS,
        message: 'All steps failed',
        autoRepairable: false,
      });
    }

    // Check for required outputs
    const requiredOutputs = request.context?.requiredOutputs as string[] | undefined;
    if (requiredOutputs && Array.isArray(requiredOutputs)) {
      const resultKeys = new Set<string>();
      for (const result of results) {
        if (result.success && typeof result.output.result === 'object' && result.output.result) {
          Object.keys(result.output.result).forEach((k) => resultKeys.add(k));
        }
      }
      for (const required of requiredOutputs) {
        if (!resultKeys.has(required)) {
          issues.push({
            stepId: 'output',
            severity: 'warning',
            category: CritiqueCategory.COMPLETENESS,
            message: `Required output key '${required}' not found in results`,
            autoRepairable: true,
          });
        }
      }
    }
  }

  /**
   * Check data quality of results.
   */
  private checkDataQuality(results: StepExecutionResult[], issues: CritiqueIssue[]): void {
    for (const result of results) {
      if (!result.success || !result.output.result) continue;

      const resultValue = result.output.result;

      // Check for suspicious data patterns
      if (typeof resultValue === 'string') {
        // Check for encoding issues
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(resultValue)) {
          issues.push({
            stepId: result.stepId,
            severity: 'warning',
            category: CritiqueCategory.DATA_QUALITY,
            message: 'Output contains control characters',
            autoRepairable: true,
          });
        }
      }

      if (typeof resultValue === 'object' && resultValue !== null) {
        // Check for NaN or Infinity values
        const serialized = JSON.stringify(resultValue);
        if (serialized.includes('NaN') || serialized.includes('Infinity')) {
          issues.push({
            stepId: result.stepId,
            severity: 'warning',
            category: CritiqueCategory.DATA_QUALITY,
            message: 'Output contains NaN or Infinity values',
            autoRepairable: true,
          });
        }
      }
    }
  }

  /**
   * Find conflicting fields between two objects.
   */
  private findConflicts(a: Record<string, any>, b: Record<string, any>): string[] {
    const conflicts: string[] = [];
    const commonKeys = Object.keys(a).filter((k) => k in b);

    for (const key of commonKeys) {
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
        conflicts.push(key);
      }
    }

    return conflicts;
  }

  /**
   * Generate a simple hash of a result for duplicate detection.
   */
  private hashResult(result: any): string {
    const str = JSON.stringify(result);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Generate recommendations based on issues.
   */
  private generateRecommendations(issues: CritiqueIssue[]): string[] {
    const recommendations: string[] = [];
    const errorIssues = issues.filter((i) => i.severity === 'error' || i.severity === 'critical');
    const warningIssues = issues.filter((i) => i.severity === 'warning');

    if (errorIssues.length > 0) {
      recommendations.push(`Address ${errorIssues.length} error(s) before accepting results`);
    }

    for (const error of errorIssues) {
      if (error.autoRepairable) {
        recommendations.push(`Auto-repair step ${error.stepId}: ${error.message}`);
      }
    }

    if (warningIssues.some((i) => i.category === CritiqueCategory.PERFORMANCE)) {
      recommendations.push('Consider optimizing steps with high execution time or memory usage');
    }

    if (warningIssues.some((i) => i.category === CritiqueCategory.CONSISTENCY)) {
      recommendations.push('Review conflicting results between steps for data integrity');
    }

    if (warningIssues.some((i) => i.category === CritiqueCategory.DATA_QUALITY)) {
      recommendations.push('Review data quality issues in step outputs');
    }

    if (issues.every((i) => i.severity === 'info')) {
      recommendations.push('Results look good, no significant issues found');
    }

    return recommendations;
  }

  /**
   * Generate a human-readable summary.
   */
  private generateSummary(
    results: StepExecutionResult[],
    score: number,
    issues: CritiqueIssue[],
  ): string {
    const total = results.length;
    const succeeded = results.filter((r) => r.success).length;
    const failed = total - succeeded;
    const critical = issues.filter((i) => i.severity === 'critical').length;
    const errors = issues.filter((i) => i.severity === 'error').length;
    const warnings = issues.filter((i) => i.severity === 'warning').length;
    const timedOut = results.filter((r) => r.timedOut).length;

    return (
      `Execution summary: ${succeeded}/${total} steps succeeded (score: ${score}/100). ` +
      `Issues: ${critical} critical, ${errors} errors, ${warnings} warnings. ` +
      `${failed} step(s) failed${timedOut > 0 ? `, ${timedOut} timed out` : ''}.`
    );
  }
}
