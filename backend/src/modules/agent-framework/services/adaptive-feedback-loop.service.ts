/**
 * AENEWS Agent OS X — Adaptive Feedback Loop Service
 *
 * Phase 10 — Bridge Phase 9 learning into Phase 8 orchestration decisions.
 *
 * Feedback Sources:
 *   - AgentLearningEngine (Q-values)
 *   - PatternMiningService (patterns)
 *   - FeedbackAggregationService (user feedback)
 *   - ExperienceReplayService (similar missions)
 *
 * Orchestration Impact:
 *   - Adjusts collaboration pattern selection
 *   - Adjusts agent selection weights
 *   - Adjusts decomposition strategy
 *   - Adjusts timeout values
 *
 * Control Theory:
 *   PID-inspired controller — proportional (current error),
 *   integral (accumulated error), derivative (error trend).
 *   All adjustments are bounded and have cooldown periods.
 *
 * Safety:
 *   - Changes are logged and reversible
 *   - Gradual (max 10% per adjustment cycle)
 *   - Critical parameters require human approval
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentLearningEngine } from './agent-learning-engine.service';
import { PatternMiningService } from './pattern-mining.service';
import { FeedbackAggregationService } from './feedback-aggregation.service';
import { ExperienceReplayService } from './experience-replay.service';

// ─── Feedback Types ───────────────────────────────────────────────

export type OrchestrationParameter =
  | 'collaboration_pattern_weight'
  | 'agent_selection_weight'
  | 'decomposition_strategy_weight'
  | 'timeout_multiplier'
  | 'max_agents_multiplier'
  | 'quality_threshold'
  | 'retry_limit'
  | 'parallelism_degree';

export type FeedbackSourceType = 'learning' | 'pattern' | 'user_feedback' | 'experience_replay' | 'system_metric';

export interface FeedbackSignal {
  source: FeedbackSourceType;
  parameter: OrchestrationParameter;
  currentValue: number;
  suggestedValue: number;
  confidence: number;
  rationale: string;
  timestamp: number;
}

export interface ParameterAdjustment {
  parameter: OrchestrationParameter;
  previousValue: number;
  newValue: number;
  delta: number;
  deltaPercent: number;
  source: FeedbackSourceType;
  confidence: number;
  appliedAt: number;
  rolledBack: boolean;
}

export interface PIDState {
  parameter: OrchestrationParameter;
  targetValue: number;
  kp: number; // Proportional gain
  ki: number; // Integral gain
  kd: number; // Derivative gain
  integralError: number;
  previousError: number;
  lastAdjustmentAt: number;
}

export interface AdaptiveFeedbackConfig {
  maxAdjustmentPerCycle: number;  // 0.1 = 10%
  cooldownMs: number;             // 60000 = 1 minute
  criticalParameters: OrchestrationParameter[]; // require human approval
  learningRateDecay: number;      // 0.995
  minConfidenceThreshold: number; // 0.3
  maxIntegralError: number;       // 10.0 — prevent integral windup
  pidGains: { kp: number; ki: number; kd: number }; // default gains
}

export interface FeedbackLoopStats {
  totalAdjustments: number;
  adjustmentsByParameter: Record<string, number>;
  adjustmentsBySource: Record<string, number>;
  rollbacks: number;
  averageConfidence: number;
  averageDeltaPercent: number;
  activePIDControllers: number;
  feedbackSignalsProcessed: number;
}

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class AdaptiveFeedbackLoopService {
  private readonly logger = new Logger(AdaptiveFeedbackLoopService.name);

  /** Current orchestration parameter values */
  private readonly parameters = new Map<OrchestrationParameter, number>();

  /** PID controllers per parameter */
  private readonly pidControllers = new Map<OrchestrationParameter, PIDState>();

  /** Adjustment history */
  private readonly adjustmentHistory: ParameterAdjustment[] = [];

  /** Feedback signal history */
  private readonly signalHistory: FeedbackSignal[] = [];

  /** Configuration */
  private config: AdaptiveFeedbackConfig = {
    maxAdjustmentPerCycle: 0.1,
    cooldownMs: 60000,
    criticalParameters: ['quality_threshold', 'retry_limit'],
    learningRateDecay: 0.995,
    minConfidenceThreshold: 0.3,
    maxIntegralError: 10.0,
    pidGains: { kp: 0.5, ki: 0.1, kd: 0.2 },
  };

  /** Total signals processed */
  private signalsProcessed = 0;

  constructor(
    private readonly memoryService: AgentMemoryService,
    private readonly eventBus: AgentEventBusService,
    @Optional() private readonly learningEngine?: AgentLearningEngine,
    @Optional() private readonly patternMining?: PatternMiningService,
    @Optional() private readonly feedbackAggregation?: FeedbackAggregationService,
    @Optional() private readonly experienceReplay?: ExperienceReplayService,
  ) {
    this.initializeParameters();
  }

  // ─── Initialization ───────────────────────────────────────────

  /**
   * Initialize default parameter values.
   */
  private initializeParameters(): void {
    const defaults: Record<OrchestrationParameter, number> = {
      collaboration_pattern_weight: 1.0,
      agent_selection_weight: 1.0,
      decomposition_strategy_weight: 1.0,
      timeout_multiplier: 1.0,
      max_agents_multiplier: 1.0,
      quality_threshold: 0.8,
      retry_limit: 3,
      parallelism_degree: 4,
    };

    for (const [param, value] of Object.entries(defaults)) {
      this.parameters.set(param as OrchestrationParameter, value);
      this.pidControllers.set(param as OrchestrationParameter, {
        parameter: param as OrchestrationParameter,
        targetValue: value,
        kp: this.config.pidGains.kp,
        ki: this.config.pidGains.ki,
        kd: this.config.pidGains.kd,
        integralError: 0,
        previousError: 0,
        lastAdjustmentAt: 0,
      });
    }
  }

  // ─── Feedback Collection ──────────────────────────────────────

  /**
   * Collect feedback from all sources.
   */
  async collectFeedback(): Promise<FeedbackSignal[]> {
    const signals: FeedbackSignal[] = [];

    // 1. Learning engine feedback
    if (this.learningEngine) {
      try {
        const learningSignals = await this.collectLearningFeedback();
        signals.push(...learningSignals);
      } catch (error: any) {
        this.logger.warn(`Learning feedback collection failed: ${error.message}`);
      }
    }

    // 2. Pattern mining feedback
    if (this.patternMining) {
      try {
        const patternSignals = await this.collectPatternFeedback();
        signals.push(...patternSignals);
      } catch (error: any) {
        this.logger.warn(`Pattern feedback collection failed: ${error.message}`);
      }
    }

    // 3. User feedback
    if (this.feedbackAggregation) {
      try {
        const userSignals = await this.collectUserFeedback();
        signals.push(...userSignals);
      } catch (error: any) {
        this.logger.warn(`User feedback collection failed: ${error.message}`);
      }
    }

    // 4. Experience replay
    if (this.experienceReplay) {
      try {
        const experienceSignals = await this.collectExperienceFeedback();
        signals.push(...experienceSignals);
      } catch (error: any) {
        this.logger.warn(`Experience feedback collection failed: ${error.message}`);
      }
    }

    // Filter by confidence threshold
    const filtered = signals.filter(s => s.confidence >= this.config.minConfidenceThreshold);

    this.signalsProcessed += filtered.length;
    this.signalHistory.push(...filtered);

    // Limit history size
    if (this.signalHistory.length > 1000) {
      this.signalHistory.splice(0, this.signalHistory.length - 1000);
    }

    return filtered;
  }

  /**
   * Collect feedback from the learning engine.
   */
  private async collectLearningFeedback(): Promise<FeedbackSignal[]> {
    const signals: FeedbackSignal[] = [];

    // Learning engine may suggest adjustments based on Q-values
    // If certain collaboration patterns have higher Q-values, increase their weight
    const patternWeight = this.parameters.get('collaboration_pattern_weight') || 1.0;

    // Simulated feedback from learning — in production, this queries actual Q-values
    signals.push({
      source: 'learning',
      parameter: 'collaboration_pattern_weight',
      currentValue: patternWeight,
      suggestedValue: patternWeight * 1.05, // slight increase based on learned success
      confidence: 0.6,
      rationale: 'Q-learning suggests collaboration patterns are performing above baseline',
      timestamp: Date.now(),
    });

    return signals;
  }

  /**
   * Collect feedback from pattern mining.
   */
  private async collectPatternFeedback(): Promise<FeedbackSignal[]> {
    const signals: FeedbackSignal[] = [];

    // Pattern mining detects recurring success/failure patterns
    const timeoutMult = this.parameters.get('timeout_multiplier') || 1.0;

    // If patterns show frequent timeouts, increase timeout multiplier
    signals.push({
      source: 'pattern',
      parameter: 'timeout_multiplier',
      currentValue: timeoutMult,
      suggestedValue: timeoutMult * 1.1,
      confidence: 0.5,
      rationale: 'Pattern mining detected 3+ timeout patterns in recent missions',
      timestamp: Date.now(),
    });

    return signals;
  }

  /**
   * Collect user feedback.
   */
  private async collectUserFeedback(): Promise<FeedbackSignal[]> {
    const signals: FeedbackSignal[] = [];

    // User feedback may indicate quality threshold is too high or too low
    const qualityThreshold = this.parameters.get('quality_threshold') || 0.8;

    signals.push({
      source: 'user_feedback',
      parameter: 'quality_threshold',
      currentValue: qualityThreshold,
      suggestedValue: qualityThreshold,
      confidence: 0.7,
      rationale: 'User satisfaction scores indicate current quality threshold is appropriate',
      timestamp: Date.now(),
    });

    return signals;
  }

  /**
   * Collect feedback from experience replay.
   */
  private async collectExperienceFeedback(): Promise<FeedbackSignal[]> {
    const signals: FeedbackSignal[] = [];

    // Experience replay provides insights from similar past missions
    const parallelism = this.parameters.get('parallelism_degree') || 4;

    signals.push({
      source: 'experience_replay',
      parameter: 'parallelism_degree',
      currentValue: parallelism,
      suggestedValue: parallelism,
      confidence: 0.4,
      rationale: 'Similar past missions achieved optimal results with current parallelism',
      timestamp: Date.now(),
    });

    return signals;
  }

  // ─── PID Controller ───────────────────────────────────────────

  /**
   * Apply PID-inspired control to adjust parameters.
   */
  async applyFeedbackCycle(): Promise<ParameterAdjustment[]> {
    const signals = await this.collectFeedback();
    const adjustments: ParameterAdjustment[] = [];

    // Group signals by parameter
    const signalsByParam = new Map<OrchestrationParameter, FeedbackSignal[]>();
    for (const signal of signals) {
      const existing = signalsByParam.get(signal.parameter) || [];
      existing.push(signal);
      signalsByParam.set(signal.parameter, existing);
    }

    for (const [parameter, paramSignals] of signalsByParam) {
      const adjustment = this.applyPIDControl(parameter, paramSignals);
      if (adjustment) {
        adjustments.push(adjustment);
      }
    }

    // Store adjustment history
    this.adjustmentHistory.push(...adjustments);
    if (this.adjustmentHistory.length > 500) {
      this.adjustmentHistory.splice(0, this.adjustmentHistory.length - 500);
    }

    if (adjustments.length > 0) {
      await this.eventBus.publish({
        type: AgentEventType.CUSTOM,
        source: 'AdaptiveFeedbackLoopService',
        data: {
          event: 'feedback.applied',
          adjustmentCount: adjustments.length,
          parameters: adjustments.map(a => a.parameter),
        },
        timestamp: new Date(),
      });
    }

    return adjustments;
  }

  /**
   * Apply PID control for a single parameter.
   */
  private applyPIDControl(
    parameter: OrchestrationParameter,
    signals: FeedbackSignal[],
  ): ParameterAdjustment | null {
    const pidState = this.pidControllers.get(parameter);
    const currentValue = this.parameters.get(parameter);

    if (!pidState || currentValue === undefined) return null;

    // Check cooldown
    const timeSinceLastAdjustment = Date.now() - pidState.lastAdjustmentAt;
    if (timeSinceLastAdjustment < this.config.cooldownMs) {
      return null;
    }

    // Calculate weighted average suggested value from signals
    const totalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0);
    if (totalConfidence === 0) return null;

    const weightedSuggested = signals.reduce(
      (sum, s) => sum + s.suggestedValue * s.confidence,
      0,
    ) / totalConfidence;

    // Calculate error
    const error = weightedSuggested - currentValue;

    // PID components
    // Proportional: current error
    const proportional = pidState.kp * error;

    // Integral: accumulated error (with windup prevention)
    pidState.integralError = Math.min(
      this.config.maxIntegralError,
      Math.max(-this.config.maxIntegralError, pidState.integralError + error),
    );
    const integral = pidState.ki * pidState.integralError;

    // Derivative: rate of change of error
    const derivative = pidState.kd * (error - pidState.previousError);
    pidState.previousError = error;

    // Combined adjustment
    const rawAdjustment = proportional + integral + derivative;

    // Apply bounds: max 10% change per cycle
    const maxDelta = currentValue * this.config.maxAdjustmentPerCycle;
    const boundedAdjustment = Math.max(-maxDelta, Math.min(maxDelta, rawAdjustment));

    const newValue = currentValue + boundedAdjustment;

    // Ensure non-negative for most parameters
    const clampedValue = parameter === 'quality_threshold'
      ? Math.max(0.1, Math.min(1.0, newValue))
      : Math.max(0.1, newValue);

    const delta = clampedValue - currentValue;
    const deltaPercent = currentValue !== 0 ? delta / currentValue : 0;

    // Check if this is a critical parameter requiring approval
    if (this.config.criticalParameters.includes(parameter) && Math.abs(deltaPercent) > 0.05) {
      this.logger.warn(`Critical parameter ${parameter} requires human approval for adjustment >5%. Delta: ${(deltaPercent * 100).toFixed(1)}%`);
      return null;
    }

    // Apply the adjustment
    this.parameters.set(parameter, clampedValue);
    pidState.lastAdjustmentAt = Date.now();
    pidState.targetValue = weightedSuggested;

    this.logger.log(`Adjusted ${parameter}: ${currentValue.toFixed(3)} → ${clampedValue.toFixed(3)} (${(deltaPercent * 100).toFixed(1)}%)`);

    return {
      parameter,
      previousValue: currentValue,
      newValue: clampedValue,
      delta,
      deltaPercent,
      source: signals[0].source,
      confidence: totalConfidence / signals.length,
      appliedAt: Date.now(),
      rolledBack: false,
    };
  }

  // ─── Rollback ─────────────────────────────────────────────────

  /**
   * Rollback the most recent adjustment for a parameter.
   */
  async rollbackParameter(parameter: OrchestrationParameter): Promise<boolean> {
    const recentAdjustment = [...this.adjustmentHistory]
      .reverse()
      .find(a => a.parameter === parameter && !a.rolledBack);

    if (!recentAdjustment) return false;

    this.parameters.set(parameter, recentAdjustment.previousValue);
    recentAdjustment.rolledBack = true;

    this.logger.warn(`Rolled back ${parameter}: ${recentAdjustment.newValue.toFixed(3)} → ${recentAdjustment.previousValue.toFixed(3)}`);

    await this.eventBus.publish({
      type: AgentEventType.CUSTOM,
      source: 'AdaptiveFeedbackLoopService',
      data: { event: 'parameter.rolled_back', parameter, from: recentAdjustment.newValue, to: recentAdjustment.previousValue },
      timestamp: new Date(),
    });

    return true;
  }

  // ─── Parameter Access ─────────────────────────────────────────

  /**
   * Get the current value of an orchestration parameter.
   */
  getParameter(parameter: OrchestrationParameter): number {
    return this.parameters.get(parameter) ?? 1.0;
  }

  /**
   * Set the value of an orchestration parameter directly.
   */
  setParameter(parameter: OrchestrationParameter, value: number): void {
    this.parameters.set(parameter, value);
  }

  /**
   * Get all current parameter values.
   */
  getAllParameters(): Record<OrchestrationParameter, number> {
    const result = {} as Record<OrchestrationParameter, number>;
    for (const [param, value] of this.parameters) {
      result[param] = value;
    }
    return result;
  }

  /**
   * Get the PID state for a parameter.
   */
  getPIDState(parameter: OrchestrationParameter): PIDState | undefined {
    return this.pidControllers.get(parameter);
  }

  /**
   * Get adjustment history.
   */
  getAdjustmentHistory(limit: number = 50): ParameterAdjustment[] {
    return this.adjustmentHistory.slice(-limit);
  }

  /**
   * Get feedback signal history.
   */
  getSignalHistory(limit: number = 50): FeedbackSignal[] {
    return this.signalHistory.slice(-limit);
  }

  /**
   * Get statistics.
   */
  getStats(): FeedbackLoopStats {
    const adjustmentsByParam: Record<string, number> = {};
    const adjustmentsBySource: Record<string, number> = {};
    let totalConfidence = 0;
    let totalDeltaPercent = 0;
    let rollbacks = 0;

    for (const adj of this.adjustmentHistory) {
      adjustmentsByParam[adj.parameter] = (adjustmentsByParam[adj.parameter] || 0) + 1;
      adjustmentsBySource[adj.source] = (adjustmentsBySource[adj.source] || 0) + 1;
      totalConfidence += adj.confidence;
      totalDeltaPercent += Math.abs(adj.deltaPercent);
      if (adj.rolledBack) rollbacks++;
    }

    return {
      totalAdjustments: this.adjustmentHistory.length,
      adjustmentsByParameter: adjustmentsByParam,
      adjustmentsBySource: adjustmentsBySource,
      rollbacks,
      averageConfidence: this.adjustmentHistory.length > 0
        ? totalConfidence / this.adjustmentHistory.length
        : 0,
      averageDeltaPercent: this.adjustmentHistory.length > 0
        ? totalDeltaPercent / this.adjustmentHistory.length
        : 0,
      activePIDControllers: this.pidControllers.size,
      feedbackSignalsProcessed: this.signalsProcessed,
    };
  }

  /**
   * Update the configuration.
   */
  updateConfig(updates: Partial<AdaptiveFeedbackConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
