/**
 * AENEWS Agent OS X — Experience Replay Service
 *
 * Phase 9 — Stores complete mission experiences for replay analysis
 * and strategy optimization. Enables "what if" analysis.
 *
 * Purpose:
 *   Just as experience replay in reinforcement learning helps agents
 *   learn more efficiently from past experiences, this service allows
 *   the system to re-analyze completed missions, extract insights that
 *   may have been missed during initial execution, and simulate
 *   alternative strategies on historical data.
 *
 * Features:
 *   1. Experience Storage: Full mission execution traces with context,
 *      decisions, actions, and outcomes.
 *   2. Replay Analysis: Re-examine past missions with current knowledge
 *      to find new insights.
 *   3. What-If Simulation: Simulate alternative strategies on historical
 *      missions to evaluate potential improvements.
 *   4. Experience Compression: Summarize long execution traces into
 *      key decision points and outcomes.
 *   5. Cross-Mission Learning: Find similar missions and transfer
 *      successful strategies between them.
 *
 * Experience Lifecycle:
 *   Recorded → Stored → Indexed → Replayed → Insights Extracted → Compressed
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { AgentLearningEngine } from './agent-learning-engine.service';
import { PatternMiningService, MissionExecutionRecord } from './pattern-mining.service';
import { ClusterType } from '../../agent/entities/agent.entity';

// ─── Experience Types ─────────────────────────────────────────────

export interface MissionExperience {
  id: string;
  missionId: string;
  recordedAt: number;
  compressedAt?: number;

  // Context
  context: {
    description: string;
    cluster: ClusterType;
    priority: string;
    objectives: string[];
    requiredCapabilities: string[];
    constraints: Record<string, any>;
  };

  // Execution trace
  trace: ExecutionStep[];

  // Strategy used
  strategy: {
    name: string;
    parameters: Record<string, any>;
    decomposition?: string[];
    agentAssignments: Array<{ agentId: string; role: string }>;
  };

  // Outcome
  outcome: {
    success: boolean;
    durationMs: number;
    score?: number;
    errorType?: string;
    errorMessage?: string;
    artifacts: string[];
  };

  // Metadata
  metadata: {
    agentCount: number;
    stepCount: number;
    retryCount: number;
    circuitBreakerTrips: number;
    llmCalls: number;
    estimatedCostUsd: number;
  };
}

export interface ExecutionStep {
  stepIndex: number;
  stepName: string;
  agentId: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  input: any;
  output: any;
  success: boolean;
  retryAttempt: number;
  error?: string;
  decisionPoint: boolean; // Key decision point?
  alternativeOptions?: string[]; // What alternatives were available
}

export interface ReplayAnalysis {
  experienceId: string;
  analyzedAt: number;
  originalOutcome: MissionExperience['outcome'];
  insights: ReplayInsight[];
  alternativeStrategies: AlternativeStrategy[];
  improvementPotential: number; // 0-1
}

export interface ReplayInsight {
  type: 'missed_optimization' | 'wrong_agent' | 'unnecessary_retry' | 'better_decomposition' | 'timing_issue' | 'circuit_breaker_avoidance';
  description: string;
  confidence: number;
  affectedStep: number; // Step index
  suggestedAction: string;
}

export interface AlternativeStrategy {
  name: string;
  description: string;
  estimatedDurationMs: number;
  estimatedScore: number;
  confidence: number;
  reasoning: string;
}

export interface WhatIfResult {
  originalExperienceId: string;
  modifiedStrategy: string;
  modifications: Record<string, any>;
  predictedOutcome: {
    success: boolean;
    durationMs: number;
    score: number;
  };
  confidence: number;
  comparisonToOriginal: {
    durationChange: number; // Percentage
    scoreChange: number;
  };
}

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class ExperienceReplayService {
  private readonly logger = new Logger(ExperienceReplayService.name);

  /** Experience store */
  private readonly experiences = new Map<string, MissionExperience>();
  private readonly MAX_EXPERIENCES = 500;

  /** Replay analysis cache */
  private readonly analyses = new Map<string, ReplayAnalysis>();

  /** Experience index for fast retrieval */
  private readonly clusterIndex = new Map<ClusterType, string[]>();
  private readonly outcomeIndex = new Map<string, string[]>(); // 'success' | 'failure' → ids

  constructor(
    private readonly eventBus: AgentEventBusService,
    private readonly memory: AgentMemoryService,
    @Optional() private readonly knowledgeGraph: KnowledgeGraphService,
    @Optional() private readonly learningEngine: AgentLearningEngine,
    @Optional() private readonly patternMining: PatternMiningService,
  ) {}

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Record a mission experience.
   */
  async recordExperience(experience: MissionExperience): Promise<void> {
    this.experiences.set(experience.id, experience);

    // Index by cluster
    const clusterExps = this.clusterIndex.get(experience.context.cluster) || [];
    clusterExps.push(experience.id);
    this.clusterIndex.set(experience.context.cluster, clusterExps);

    // Index by outcome
    const outcomeKey = experience.outcome.success ? 'success' : 'failure';
    const outcomeExps = this.outcomeIndex.get(outcomeKey) || [];
    outcomeExps.push(experience.id);
    this.outcomeIndex.set(outcomeKey, outcomeExps);

    // Store in memory
    await this.memory.store(
      experience.missionId,
      MemoryTier.LONG_TERM,
      'experience',
      this.compressExperience(experience),
    );

    // Feed to pattern mining
    if (this.patternMining) {
      this.patternMining.recordExecution(this.toExecutionRecord(experience));
    }

    // Prune if needed
    if (this.experiences.size > this.MAX_EXPERIENCES) {
      this.pruneExperiences();
    }
  }

  /**
   * Replay a specific experience and generate new insights.
   */
  async replayExperience(experienceId: string): Promise<ReplayAnalysis | null> {
    const experience = this.experiences.get(experienceId);
    if (!experience) return null;

    // Check cache
    const cached = this.analyses.get(experienceId);
    if (cached && Date.now() - cached.analyzedAt < 60 * 60 * 1000) {
      return cached; // Use cached analysis less than 1 hour old
    }

    const insights: ReplayInsight[] = [];
    const alternativeStrategies: AlternativeStrategy[] = [];

    // 1. Analyze each step for missed optimizations
    for (const step of experience.trace) {
      // Check for slow steps that could be optimized
      if (step.durationMs > 30000 && step.success) {
        insights.push({
          type: 'missed_optimization',
          description: `Step "${step.stepName}" took ${step.durationMs}ms — consider parallelizing or simplifying`,
          confidence: 0.5,
          affectedStep: step.stepIndex,
          suggestedAction: 'Investigate if this step can be parallelized with adjacent steps',
        });
      }

      // Check for unnecessary retries
      if (step.retryAttempt > 0 && step.success) {
        insights.push({
          type: 'unnecessary_retry',
          description: `Step "${step.stepName}" succeeded after ${step.retryAttempt} retries — root cause analysis recommended`,
          confidence: 0.6,
          affectedStep: step.stepIndex,
          suggestedAction: 'Investigate retry cause to prevent future occurrences',
        });
      }

      // Check decision points for better alternatives
      if (step.decisionPoint && step.alternativeOptions && step.alternativeOptions.length > 0) {
        // If the mission failed, suggest alternatives at decision points
        if (!experience.outcome.success) {
          insights.push({
            type: 'better_decomposition',
            description: `At decision point "${step.stepName}", alternatives were available: ${step.alternativeOptions.join(', ')}`,
            confidence: 0.4,
            affectedStep: step.stepIndex,
            suggestedAction: `Consider alternatives: ${step.alternativeOptions.join(', ')}`,
          });
        }
      }

      // Check for timing issues
      if (!step.success && step.error?.includes('timeout')) {
        insights.push({
          type: 'timing_issue',
          description: `Step "${step.stepName}" timed out — may need increased timeout or different approach`,
          confidence: 0.7,
          affectedStep: step.stepIndex,
          suggestedAction: 'Increase timeout or break into smaller sub-steps',
        });
      }
    }

    // 2. Generate alternative strategies
    if (experience.outcome.success) {
      // For successful missions, suggest faster alternatives
      alternativeStrategies.push({
        name: 'parallel_execution',
        description: 'Execute independent steps in parallel instead of sequentially',
        estimatedDurationMs: Math.round(experience.outcome.durationMs * 0.6),
        estimatedScore: experience.outcome.score || 70,
        confidence: 0.4,
        reasoning: 'Many sequential steps could run concurrently based on dependency analysis',
      });
    } else {
      // For failed missions, suggest safer alternatives
      alternativeStrategies.push({
        name: 'conservative_pipeline',
        description: 'Use a more conservative approach with additional validation at each step',
        estimatedDurationMs: Math.round(experience.outcome.durationMs * 1.3),
        estimatedScore: 60,
        confidence: 0.5,
        reasoning: 'Additional validation could catch errors before they cascade',
      });

      alternativeStrategies.push({
        name: 'smaller_decomposition',
        description: 'Decompose the mission into smaller, more manageable sub-missions',
        estimatedDurationMs: Math.round(experience.outcome.durationMs * 1.1),
        estimatedScore: 65,
        confidence: 0.4,
        reasoning: 'Smaller missions are easier to complete and recover from errors',
      });
    }

    // Calculate improvement potential
    const improvementPotential = experience.outcome.success
      ? Math.min(0.5, insights.length * 0.1)
      : Math.min(0.9, insights.length * 0.15);

    const analysis: ReplayAnalysis = {
      experienceId,
      analyzedAt: Date.now(),
      originalOutcome: experience.outcome,
      insights,
      alternativeStrategies,
      improvementPotential,
    };

    // Cache the analysis
    this.analyses.set(experienceId, analysis);

    this.eventBus.emit(AgentEventType.AGENT_COMPLETED, 'experience-replay', {
      experienceId,
      insightsFound: insights.length,
      alternativesGenerated: alternativeStrategies.length,
      improvementPotential,
    });

    return analysis;
  }

  /**
   * Run a what-if analysis — simulate a different strategy on a past mission.
   */
  async whatIf(
    experienceId: string,
    modifiedStrategy: string,
    modifications: Record<string, any>,
  ): Promise<WhatIfResult | null> {
    const experience = this.experiences.get(experienceId);
    if (!experience) return null;

    // Estimate outcome based on strategy and modifications
    let durationFactor = 1.0;
    let scoreFactor = 1.0;

    switch (modifiedStrategy) {
      case 'parallel_execution':
        durationFactor = 0.6;
        scoreFactor = 0.95; // Slightly lower score due to less sequential validation
        break;
      case 'conservative_pipeline':
        durationFactor = 1.3;
        scoreFactor = 1.15; // Higher score due to more validation
        break;
      case 'smaller_decomposition':
        durationFactor = 1.1;
        scoreFactor = 1.1;
        break;
      case 'aggressive_timeout':
        durationFactor = 0.5;
        scoreFactor = 0.8; // Risk of timeout
        break;
      default:
        break;
    }

    // Apply modifications
    if (modifications.timeoutFactor) {
      durationFactor *= modifications.timeoutFactor;
    }
    if (modifications.retryBonus) {
      scoreFactor *= 1 + modifications.retryBonus * 0.05;
    }

    const predictedDurationMs = Math.round(experience.outcome.durationMs * durationFactor);
    const predictedScore = Math.min(100, Math.round((experience.outcome.score || 50) * scoreFactor));

    // Determine if mission would succeed
    const predictedSuccess = experience.outcome.success
      ? true // Original succeeded — most alternatives should too
      : predictedScore > 50; // If original failed, predict success if score > 50

    return {
      originalExperienceId: experienceId,
      modifiedStrategy,
      modifications,
      predictedOutcome: {
        success: predictedSuccess,
        durationMs: predictedDurationMs,
        score: predictedScore,
      },
      confidence: 0.3, // Low confidence for what-if analysis
      comparisonToOriginal: {
        durationChange: ((predictedDurationMs - experience.outcome.durationMs) / experience.outcome.durationMs) * 100,
        scoreChange: predictedScore - (experience.outcome.score || 0),
      },
    };
  }

  /**
   * Find similar past experiences for a given context.
   */
  findSimilarExperiences(context: {
    cluster?: ClusterType;
    capabilities?: string[];
    priority?: string;
    outcome?: 'success' | 'failure';
  }, limit = 10): MissionExperience[] {
    let candidateIds: string[] = [];

    // Filter by cluster
    if (context.cluster) {
      candidateIds = this.clusterIndex.get(context.cluster) || [];
    } else {
      candidateIds = [...this.experiences.keys()];
    }

    // Filter by outcome
    if (context.outcome) {
      const outcomeIds = new Set(this.outcomeIndex.get(context.outcome) || []);
      candidateIds = candidateIds.filter((id) => outcomeIds.has(id));
    }

    // Filter by capability overlap and sort by similarity
    const scored = candidateIds.map((id) => {
      const exp = this.experiences.get(id);
      if (!exp) return { id, score: 0 };

      let similarity = 0;

      // Priority match
      if (context.priority && exp.context.priority === context.priority) {
        similarity += 0.3;
      }

      // Capability overlap
      if (context.capabilities) {
        const overlap = context.capabilities.filter((cap) =>
          exp.context.requiredCapabilities.includes(cap),
        ).length;
        similarity += (overlap / Math.max(context.capabilities.length, 1)) * 0.4;
      }

      // Recency bonus
      const ageDays = (Date.now() - exp.recordedAt) / (24 * 60 * 60 * 1000);
      similarity += Math.max(0, 0.3 - ageDays * 0.01);

      return { id, score: similarity };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored
      .slice(0, limit)
      .map((s) => this.experiences.get(s.id))
      .filter((e): e is MissionExperience => e !== undefined);
  }

  /**
   * Get an experience by ID.
   */
  getExperience(id: string): MissionExperience | null {
    return this.experiences.get(id) ?? null;
  }

  /**
   * Get replay statistics.
   */
  getStatistics(): {
    totalExperiences: number;
    successCount: number;
    failureCount: number;
    totalInsights: number;
    avgDurationMs: number;
    clusterBreakdown: Record<string, number>;
    topInsights: ReplayInsight[];
  } {
    let successCount = 0;
    let failureCount = 0;
    let totalDuration = 0;
    const clusterBreakdown: Record<string, number> = {};
    const allInsights: ReplayInsight[] = [];

    for (const exp of this.experiences.values()) {
      if (exp.outcome.success) successCount++;
      else failureCount++;
      totalDuration += exp.outcome.durationMs;

      clusterBreakdown[exp.context.cluster] = (clusterBreakdown[exp.context.cluster] || 0) + 1;
    }

    for (const analysis of this.analyses.values()) {
      allInsights.push(...analysis.insights);
    }

    return {
      totalExperiences: this.experiences.size,
      successCount,
      failureCount,
      totalInsights: allInsights.length,
      avgDurationMs: this.experiences.size > 0 ? Math.round(totalDuration / this.experiences.size) : 0,
      clusterBreakdown,
      topInsights: allInsights
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10),
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private compressExperience(experience: MissionExperience): Record<string, any> {
    return {
      id: experience.id,
      missionId: experience.missionId,
      cluster: experience.context.cluster,
      strategy: experience.strategy.name,
      success: experience.outcome.success,
      durationMs: experience.outcome.durationMs,
      score: experience.outcome.score,
      stepCount: experience.trace.length,
      decisionPoints: experience.trace
        .filter((s) => s.decisionPoint)
        .map((s) => ({ step: s.stepName, alternatives: s.alternativeOptions })),
      keyMetrics: experience.metadata,
    };
  }

  private toExecutionRecord(experience: MissionExperience): MissionExecutionRecord {
    return {
      missionId: experience.missionId,
      description: experience.context.description,
      cluster: experience.context.cluster,
      strategy: experience.strategy.name,
      agents: experience.strategy.agentAssignments.map((a) => a.agentId),
      capabilities: experience.context.requiredCapabilities,
      steps: experience.trace.map((s) => s.stepName),
      durationMs: experience.outcome.durationMs,
      score: experience.outcome.score,
      outcome: experience.outcome.success ? 'success' : 'failure',
      errorType: experience.outcome.errorType,
      timestamp: experience.recordedAt,
    };
  }

  private pruneExperiences(): void {
    // Keep recent experiences and successful ones
    const entries = [...this.experiences.entries()]
      .sort((a, b) => {
        // Prioritize: recent + successful
        const scoreA = (a[1].outcome.success ? 1 : 0) + (a[1].recordedAt / Date.now());
        const scoreB = (b[1].outcome.success ? 1 : 0) + (b[1].recordedAt / Date.now());
        return scoreB - scoreA;
      });

    this.experiences.clear();
    this.clusterIndex.clear();
    this.outcomeIndex.clear();

    for (const [key, exp] of entries.slice(0, this.MAX_EXPERIENCES * 0.8)) {
      this.experiences.set(key, exp);

      const clusterExps = this.clusterIndex.get(exp.context.cluster) || [];
      clusterExps.push(key);
      this.clusterIndex.set(exp.context.cluster, clusterExps);

      const outcomeKey = exp.outcome.success ? 'success' : 'failure';
      const outcomeExps = this.outcomeIndex.get(outcomeKey) || [];
      outcomeExps.push(key);
      this.outcomeIndex.set(outcomeKey, outcomeExps);
    }
  }
}
