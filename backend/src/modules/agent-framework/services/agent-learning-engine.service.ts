/**
 * AENEWS Agent OS X — Agent Learning Engine
 *
 * Phase 9 — Reinforcement-inspired learning system where agents
 * improve their behavior based on execution outcomes.
 *
 * Learning Mechanisms:
 *   1. Outcome-Based Reinforcement: Successful patterns are reinforced,
 *      failed patterns are penalized. Uses a modified Q-learning approach
 *      where the "Q-value" represents the expected utility of an
 *      agent-action combination in a given context.
 *   2. Experience Replay: Past successful missions are periodically
 *      re-analyzed to extract new insights that may have been missed
 *      during initial execution.
 *   3. Transfer Learning: Learnings from one agent can be transferred
 *      to similar agents in the same cluster.
 *   4. Exploration vs Exploitation: Balances trying new strategies
 *      (exploration) with using proven ones (exploitation).
 *   5. Decay: Old learnings gradually decay in confidence if not
 *      reinforced, ensuring the system adapts to changing conditions.
 *
 * Learning Outputs:
 *   - Agent preference adjustments (which strategies to prefer)
 *   - Capability confidence scores (how reliable each capability is)
 *   - Context-action mappings (what works best in which context)
 *   - Failure predictions (detecting when a mission is likely to fail)
 *   - Optimization suggestions (how to improve execution parameters)
 *
 * Safety:
 *   - All learning is observational — it never modifies agent code
 *   - Learned preferences can be overridden by explicit configuration
 *   - Confidence thresholds prevent low-confidence suggestions
 *   - Learning rate is bounded to prevent radical behavior shifts
 *   - Periodic learning audits ensure quality
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import { AgentHealthService } from './agent-health.service';
import { KnowledgeGraphService, AgentKnowledge } from './knowledge-graph.service';
import { ClusterType } from '../../agent/entities/agent.entity';

// ─── Learning Types ───────────────────────────────────────────────

export type LearningType =
  | 'strategy_preference'
  | 'capability_confidence'
  | 'context_action'
  | 'failure_prediction'
  | 'optimization'
  | 'transfer';

export interface LearningRecord {
  id: string;
  type: LearningType;
  agentId: string;
  cluster: ClusterType;
  context: string;
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  reward: number; // -1.0 to 1.0
  confidence: number; // 0.0 to 1.0
  metadata: Record<string, any>;
  createdAt: number;
  reinforcedAt?: number;
  reinforceCount: number;
}

export interface AgentLearningProfile {
  agentId: string;
  cluster: ClusterType;
  strategyPreferences: Map<string, number>; // strategyId → Q-value
  capabilityConfidence: Map<string, number>; // capability → confidence 0-1
  contextActionMap: Map<string, string[]>; // context hash → preferred actions
  failurePatterns: string[]; // patterns that predict failure
  optimizationHistory: OptimizationRecord[];
  totalLearnings: number;
  avgReward: number;
  lastLearningAt: number;
}

export interface OptimizationRecord {
  id: string;
  parameterName: string;
  previousValue: any;
  suggestedValue: any;
  reason: string;
  confidence: number;
  applied: boolean;
  outcome?: 'improved' | 'unchanged' | 'degraded';
  createdAt: number;
}

export interface LearningFeedback {
  agentId: string;
  missionId: string;
  outcome: 'success' | 'failure' | 'partial';
  durationMs: number;
  score?: number;
  strategyUsed?: string;
  capabilitiesUsed?: string[];
  context: Record<string, any>;
  errorType?: string;
}

export interface LearningInsight {
  id: string;
  type: LearningType;
  description: string;
  confidence: number;
  affectedAgents: string[];
  suggestedActions: string[];
  supportingEvidence: number; // count of supporting records
  createdAt: number;
}

// ─── Configuration ────────────────────────────────────────────────

const LEARNING_RATE = 0.1; // Alpha: how much new info overrides old
const DISCOUNT_FACTOR = 0.95; // Gamma: future reward weighting
const EXPLORATION_RATE = 0.15; // Epsilon: probability of exploring new strategy
const CONFIDENCE_DECAY = 0.995; // Per-period decay for unreinforced learnings
const MIN_CONFIDENCE = 0.1; // Below this, learning is pruned
const MAX_LEARNINGS_PER_AGENT = 500; // Cap to prevent memory bloat
const TRANSFER_THRESHOLD = 0.7; // Min similarity for transfer learning
const REINFORCEMENT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class AgentLearningEngine {
  private readonly logger = new Logger(AgentLearningEngine.name);

  /** Agent learning profiles */
  private readonly profiles = new Map<string, AgentLearningProfile>();

  /** All learning records */
  private readonly learnings: LearningRecord[] = [];
  private readonly MAX_GLOBAL_LEARNINGS = 5000;

  /** Learning insights (derived from records) */
  private readonly insights: LearningInsight[] = [];
  private readonly MAX_INSIGHTS = 100;

  constructor(
    private readonly eventBus: AgentEventBusService,
    private readonly memory: AgentMemoryService,
    @Optional() private readonly knowledgeGraph: KnowledgeGraphService,
    @Optional() private readonly healthService: AgentHealthService,
  ) {}

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Process feedback from a mission execution.
   * This is the main entry point for learning — called after every mission.
   */
  async processFeedback(feedback: LearningFeedback): Promise<LearningInsight[]> {
    const newInsights: LearningInsight[] = [];

    // Get or create agent profile
    const profile = this.getOrCreateProfile(feedback.agentId, feedback.context.cluster as ClusterType);

    // Calculate reward
    const reward = this.calculateReward(feedback);

    // 1. Update strategy preferences (Q-learning update)
    if (feedback.strategyUsed) {
      const previousQ = profile.strategyPreferences.get(feedback.strategyUsed) || 0;
      const newQ = previousQ + LEARNING_RATE * (reward + DISCOUNT_FACTOR * this.maxStrategyQ(profile) - previousQ);
      profile.strategyPreferences.set(feedback.strategyUsed, newQ);

      this.recordLearning({
        id: `learn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: 'strategy_preference',
        agentId: feedback.agentId,
        cluster: feedback.context.cluster as ClusterType,
        context: this.hashContext(feedback.context),
        action: feedback.strategyUsed,
        outcome: feedback.outcome,
        reward,
        confidence: Math.min(1, Math.abs(newQ)),
        metadata: { previousQ, newQ, missionId: feedback.missionId },
        createdAt: Date.now(),
        reinforceCount: 0,
      });
    }

    // 2. Update capability confidence
    if (feedback.capabilitiesUsed) {
      for (const cap of feedback.capabilitiesUsed) {
        const prevConfidence = profile.capabilityConfidence.get(cap) || 0.5;
        const delta = feedback.outcome === 'success' ? 0.05 : feedback.outcome === 'failure' ? -0.08 : -0.02;
        const newConfidence = Math.max(0, Math.min(1, prevConfidence + delta * LEARNING_RATE * 10));
        profile.capabilityConfidence.set(cap, newConfidence);

        this.recordLearning({
          id: `learn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          type: 'capability_confidence',
          agentId: feedback.agentId,
          cluster: feedback.context.cluster as ClusterType,
          context: this.hashContext(feedback.context),
          action: cap,
          outcome: feedback.outcome,
          reward,
          confidence: newConfidence,
          metadata: { prevConfidence, newConfidence, missionId: feedback.missionId },
          createdAt: Date.now(),
          reinforceCount: 0,
        });
      }
    }

    // 3. Update context-action mappings
    const contextHash = this.hashContext(feedback.context);
    if (feedback.outcome === 'success' && feedback.strategyUsed) {
      const actions = profile.contextActionMap.get(contextHash) || [];
      if (!actions.includes(feedback.strategyUsed)) {
        actions.push(feedback.strategyUsed);
        profile.contextActionMap.set(contextHash, actions);
      }
    }

    // 4. Detect failure patterns
    if (feedback.outcome === 'failure') {
      const failurePattern = this.extractFailurePattern(feedback);
      if (failurePattern && !profile.failurePatterns.includes(failurePattern)) {
        profile.failurePatterns.push(failurePattern);

        newInsights.push({
          id: `insight_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          type: 'failure_prediction',
          description: `Agent ${feedback.agentId} fails when: ${failurePattern}`,
          confidence: 0.4, // Low initial confidence
          affectedAgents: [feedback.agentId],
          suggestedActions: [`Avoid ${failurePattern}`, 'Consider alternative strategy'],
          supportingEvidence: 1,
          createdAt: Date.now(),
        });
      }
    }

    // 5. Generate optimization suggestions
    const optimization = this.analyzeForOptimization(feedback, profile);
    if (optimization) {
      profile.optimizationHistory.push(optimization);
      newInsights.push({
        id: `insight_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: 'optimization',
        description: optimization.reason,
        confidence: optimization.confidence,
        affectedAgents: [feedback.agentId],
        suggestedActions: [`Adjust ${optimization.parameterName} from ${optimization.previousValue} to ${optimization.suggestedValue}`],
        supportingEvidence: 1,
        createdAt: Date.now(),
      });
    }

    // Update profile statistics
    profile.totalLearnings++;
    profile.avgReward = profile.avgReward + LEARNING_RATE * (reward - profile.avgReward);
    profile.lastLearningAt = Date.now();

    // Store insights
    for (const insight of newInsights) {
      this.addInsight(insight);
    }

    // Update knowledge graph
    if (this.knowledgeGraph) {
      try {
        await this.knowledgeGraph.registerAgent({
          agentId: profile.agentId,
          name: feedback.agentId,
          cluster: profile.cluster,
          capabilities: [...profile.capabilityConfidence.keys()],
          expertiseScore: this.calculateExpertiseScore(profile),
          missionCount: profile.totalLearnings,
          successRate: 1 - (profile.avgReward < 0 ? Math.abs(profile.avgReward) : 0),
          avgDurationMs: feedback.durationMs,
          collaborationPartners: [],
          learnedStrategies: [...profile.strategyPreferences.keys()],
        });
      } catch {
        // Knowledge graph update is best-effort
      }
    }

    // Emit learning event
    this.eventBus.emit(AgentEventType.AGENT_COMPLETED, 'learning-engine', {
      agentId: feedback.agentId,
      outcome: feedback.outcome,
      reward,
      insightsGenerated: newInsights.length,
    });

    // Apply confidence decay periodically
    if (profile.totalLearnings % 50 === 0) {
      this.applyDecay(profile);
    }

    // Prune old learnings
    if (profile.totalLearnings % 100 === 0) {
      this.pruneProfile(profile);
    }

    return newInsights;
  }

  /**
   * Get the best strategy for an agent in a given context.
   * Uses exploitation (best known) with epsilon-greedy exploration.
   */
  getBestStrategy(agentId: string, context: Record<string, any>): {
    strategy: string | null;
    confidence: number;
    isExploration: boolean;
  } {
    const profile = this.profiles.get(agentId);
    if (!profile || profile.strategyPreferences.size === 0) {
      return { strategy: null, confidence: 0, isExploration: false };
    }

    // Epsilon-greedy: with probability epsilon, explore a random strategy
    if (Math.random() < EXPLORATION_RATE) {
      const strategies = [...profile.strategyPreferences.keys()];
      const randomStrategy = strategies[Math.floor(Math.random() * strategies.length)];
      return { strategy: randomStrategy, confidence: 0.5, isExploration: true };
    }

    // Exploitation: pick the strategy with highest Q-value
    let bestStrategy = '';
    let bestQ = -Infinity;

    for (const [strategy, qValue] of profile.strategyPreferences) {
      if (qValue > bestQ) {
        bestQ = qValue;
        bestStrategy = strategy;
      }
    }

    // Check context-action map for additional guidance
    const contextHash = this.hashContext(context);
    const contextActions = profile.contextActionMap.get(contextHash);
    if (contextActions && contextActions.length > 0 && bestQ < 0) {
      // If Q-values are negative, try context-mapped actions
      return {
        strategy: contextActions[0],
        confidence: 0.6,
        isExploration: false,
      };
    }

    return {
      strategy: bestStrategy || null,
      confidence: Math.min(1, Math.abs(bestQ)),
      isExploration: false,
    };
  }

  /**
   * Get an agent's capability confidence scores.
   */
  getCapabilityConfidence(agentId: string): Map<string, number> {
    const profile = this.profiles.get(agentId);
    return profile?.capabilityConfidence ?? new Map();
  }

  /**
   * Predict whether a mission is likely to fail for an agent.
   */
  predictFailure(agentId: string, context: Record<string, any>): {
    likelyToFail: boolean;
    confidence: number;
    reasons: string[];
  } {
    const profile = this.profiles.get(agentId);
    if (!profile || profile.failurePatterns.length === 0) {
      return { likelyToFail: false, confidence: 0, reasons: [] };
    }

    const contextStr = JSON.stringify(context).toLowerCase();
    const matchedPatterns: string[] = [];

    for (const pattern of profile.failurePatterns) {
      if (contextStr.includes(pattern.toLowerCase())) {
        matchedPatterns.push(pattern);
      }
    }

    if (matchedPatterns.length === 0) {
      return { likelyToFail: false, confidence: 0, reasons: [] };
    }

    const confidence = Math.min(0.9, matchedPatterns.length * 0.3);
    return {
      likelyToFail: confidence > 0.5,
      confidence,
      reasons: matchedPatterns,
    };
  }

  /**
   * Transfer learnings from one agent to similar agents in the same cluster.
   */
  async transferLearning(sourceAgentId: string, targetAgentId: string): Promise<{
    transferred: number;
    skipped: number;
  }> {
    const sourceProfile = this.profiles.get(sourceAgentId);
    const targetProfile = this.getOrCreateProfile(targetAgentId, sourceProfile?.cluster || ClusterType.WATCHDOG);

    if (!sourceProfile) {
      return { transferred: 0, skipped: 0 };
    }

    let transferred = 0;
    let skipped = 0;

    // Transfer strategy preferences (with reduced confidence)
    for (const [strategy, qValue] of sourceProfile.strategyPreferences) {
      if (Math.abs(qValue) > TRANSFER_THRESHOLD) {
        const existingQ = targetProfile.strategyPreferences.get(strategy) || 0;
        // Blend with reduced weight for transferred knowledge
        const blendedQ = existingQ * 0.7 + qValue * 0.3;
        targetProfile.strategyPreferences.set(strategy, blendedQ);
        transferred++;
      } else {
        skipped++;
      }
    }

    // Transfer capability confidence (with reduced weight)
    for (const [cap, confidence] of sourceProfile.capabilityConfidence) {
      if (confidence > TRANSFER_THRESHOLD) {
        const existingConf = targetProfile.capabilityConfidence.get(cap) || 0.5;
        targetProfile.capabilityConfidence.set(cap, existingConf * 0.6 + confidence * 0.4);
        transferred++;
      } else {
        skipped++;
      }
    }

    // Transfer failure patterns
    for (const pattern of sourceProfile.failurePatterns) {
      if (!targetProfile.failurePatterns.includes(pattern)) {
        targetProfile.failurePatterns.push(pattern);
        transferred++;
      }
    }

    this.logger.log({
      msg: 'Learning transfer complete',
      source: sourceAgentId,
      target: targetAgentId,
      transferred,
      skipped,
    });

    // Record transfer learning
    this.addInsight({
      id: `insight_transfer_${Date.now()}`,
      type: 'transfer',
      description: `Transferred ${transferred} learnings from ${sourceAgentId} to ${targetAgentId}`,
      confidence: 0.6,
      affectedAgents: [sourceAgentId, targetAgentId],
      suggestedActions: [`Monitor ${targetAgentId} for degradation`],
      supportingEvidence: transferred,
      createdAt: Date.now(),
    });

    return { transferred, skipped };
  }

  /**
   * Get all learning insights.
   */
  getInsights(type?: LearningType, minConfidence = 0.3): LearningInsight[] {
    return this.insights
      .filter((i) => (!type || i.type === type) && i.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get an agent's learning profile.
   */
  getProfile(agentId: string): AgentLearningProfile | null {
    return this.profiles.get(agentId) ?? null;
  }

  /**
   * Get learning statistics across all agents.
   */
  getStatistics(): {
    totalProfiles: number;
    totalLearnings: number;
    totalInsights: number;
    avgReward: number;
    topStrategies: Array<{ strategy: string; avgQ: number }>;
    clusterBreakdown: Record<string, number>;
  } {
    let totalReward = 0;
    let profileCount = 0;
    const strategyAgg = new Map<string, { totalQ: number; count: number }>();
    const clusterBreakdown: Record<string, number> = {};

    for (const profile of this.profiles.values()) {
      totalReward += profile.avgReward;
      profileCount++;

      clusterBreakdown[profile.cluster] = (clusterBreakdown[profile.cluster] || 0) + 1;

      for (const [strategy, qValue] of profile.strategyPreferences) {
        const agg = strategyAgg.get(strategy) || { totalQ: 0, count: 0 };
        agg.totalQ += qValue;
        agg.count++;
        strategyAgg.set(strategy, agg);
      }
    }

    const topStrategies = [...strategyAgg.entries()]
      .map(([strategy, agg]) => ({ strategy, avgQ: agg.totalQ / agg.count }))
      .sort((a, b) => b.avgQ - a.avgQ)
      .slice(0, 10);

    return {
      totalProfiles: profileCount,
      totalLearnings: this.learnings.length,
      totalInsights: this.insights.length,
      avgReward: profileCount > 0 ? totalReward / profileCount : 0,
      topStrategies,
      clusterBreakdown,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private getOrCreateProfile(agentId: string, cluster: ClusterType): AgentLearningProfile {
    let profile = this.profiles.get(agentId);
    if (!profile) {
      profile = {
        agentId,
        cluster,
        strategyPreferences: new Map(),
        capabilityConfidence: new Map(),
        contextActionMap: new Map(),
        failurePatterns: [],
        optimizationHistory: [],
        totalLearnings: 0,
        avgReward: 0,
        lastLearningAt: Date.now(),
      };
      this.profiles.set(agentId, profile);
    }
    return profile;
  }

  private calculateReward(feedback: LearningFeedback): number {
    switch (feedback.outcome) {
      case 'success':
        // Reward based on speed and quality
        let reward = 0.8;
        if (feedback.score !== undefined) {
          reward = 0.5 + (feedback.score / 100) * 0.5; // 0.5 to 1.0
        }
        // Bonus for fast execution
        if (feedback.durationMs < 10000) reward += 0.1;
        return Math.min(1.0, reward);

      case 'partial':
        return 0.2;

      case 'failure':
        // Penalty based on failure type
        let penalty = -0.5;
        if (feedback.errorType === 'timeout') penalty = -0.3;
        if (feedback.errorType === 'circuit_breaker') penalty = -0.4;
        if (feedback.errorType === 'safety_violation') penalty = -0.9;
        return penalty;

      default:
        return 0;
    }
  }

  private maxStrategyQ(profile: AgentLearningProfile): number {
    if (profile.strategyPreferences.size === 0) return 0;
    return Math.max(...profile.strategyPreferences.values());
  }

  private hashContext(context: Record<string, any>): string {
    // Simple context hashing — creates a deterministic key from context properties
    const keys = Object.keys(context).sort();
    const parts = keys.map((k) => {
      const v = context[k];
      if (typeof v === 'object') return `${k}:${JSON.stringify(v)}`;
      return `${k}:${v}`;
    });
    return parts.join('|');
  }

  private extractFailurePattern(feedback: LearningFeedback): string | null {
    if (feedback.outcome !== 'failure') return null;

    const parts: string[] = [];
    if (feedback.errorType) parts.push(`error:${feedback.errorType}`);
    if (feedback.context.cluster) parts.push(`cluster:${feedback.context.cluster}`);
    if (feedback.strategyUsed) parts.push(`strategy:${feedback.strategyUsed}`);
    if (feedback.durationMs > 30000) parts.push('slow_execution');

    return parts.length > 0 ? parts.join('+') : null;
  }

  private analyzeForOptimization(feedback: LearningFeedback, profile: AgentLearningProfile): OptimizationRecord | null {
    // Only suggest optimizations after enough data
    if (profile.totalLearnings < 10) return null;

    // Check for consistently slow execution
    if (feedback.durationMs > 60000 && profile.avgReward > 0) {
      return {
        id: `opt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        parameterName: 'timeoutMs',
        previousValue: feedback.durationMs,
        suggestedValue: Math.round(feedback.durationMs * 0.7),
        reason: `Consistently slow execution (${feedback.durationMs}ms) suggests timeout can be reduced`,
        confidence: 0.5,
        applied: false,
        createdAt: Date.now(),
      };
    }

    // Check for low-capability confidence suggesting parameter adjustment
    if (feedback.capabilitiesUsed) {
      for (const cap of feedback.capabilitiesUsed) {
        const conf = profile.capabilityConfidence.get(cap);
        if (conf !== undefined && conf < 0.3) {
          return {
            id: `opt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            parameterName: `${cap}_retry_count`,
            previousValue: 1,
            suggestedValue: 3,
            reason: `Low capability confidence for ${cap} (${(conf * 100).toFixed(0)}%) — increase retries`,
            confidence: 0.6,
            applied: false,
            createdAt: Date.now(),
          };
        }
      }
    }

    return null;
  }

  private recordLearning(record: LearningRecord): void {
    this.learnings.push(record);
    if (this.learnings.length > this.MAX_GLOBAL_LEARNINGS) {
      this.learnings.shift();
    }
  }

  private addInsight(insight: LearningInsight): void {
    this.insights.push(insight);
    if (this.insights.length > this.MAX_INSIGHTS) {
      this.insights.shift();
    }
  }

  private applyDecay(profile: AgentLearningProfile): void {
    // Decay capability confidence
    for (const [cap, conf] of profile.capabilityConfidence) {
      const decayed = conf * CONFIDENCE_DECAY;
      if (decayed < MIN_CONFIDENCE) {
        profile.capabilityConfidence.delete(cap);
      } else {
        profile.capabilityConfidence.set(cap, decayed);
      }
    }

    // Decay strategy Q-values toward 0
    for (const [strategy, qValue] of profile.strategyPreferences) {
      const decayed = qValue * CONFIDENCE_DECAY;
      if (Math.abs(decayed) < MIN_CONFIDENCE) {
        profile.strategyPreferences.delete(strategy);
      } else {
        profile.strategyPreferences.set(strategy, decayed);
      }
    }
  }

  private pruneProfile(profile: AgentLearningProfile): void {
    // Prune low-confidence capabilities
    for (const [cap, conf] of profile.capabilityConfidence) {
      if (conf < MIN_CONFIDENCE) profile.capabilityConfidence.delete(cap);
    }

    // Prune low-Q strategies
    for (const [strategy, qValue] of profile.strategyPreferences) {
      if (Math.abs(qValue) < MIN_CONFIDENCE) profile.strategyPreferences.delete(strategy);
    }

    // Prune old optimization history
    if (profile.optimizationHistory.length > 50) {
      profile.optimizationHistory = profile.optimizationHistory.slice(-50);
    }

    // Prune context-action map
    if (profile.contextActionMap.size > 100) {
      // Keep only the most recent 50
      const entries = [...profile.contextActionMap.entries()].slice(-50);
      profile.contextActionMap.clear();
      for (const [k, v] of entries) {
        profile.contextActionMap.set(k, v);
      }
    }
  }

  private calculateExpertiseScore(profile: AgentLearningProfile): number {
    // Weighted combination of mission count, success rate, and strategy quality
    const missionScore = Math.min(1, profile.totalLearnings / 100);
    const rewardScore = (profile.avgReward + 1) / 2; // Normalize -1..1 to 0..1
    const strategyScore = profile.strategyPreferences.size > 0
      ? Math.max(0, ...profile.strategyPreferences.values())
      : 0;

    return missionScore * 0.3 + rewardScore * 0.4 + strategyScore * 0.3;
  }
}
