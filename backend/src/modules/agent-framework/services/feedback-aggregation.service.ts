/**
 * AENEWS Agent OS X — Feedback Aggregation Service
 *
 * Phase 9 — Collects feedback from multiple sources (user ratings,
 * system metrics, agent self-assessment, peer review) and produces
 * actionable insights.
 *
 * Feedback Sources:
 *   1. User Feedback: Explicit ratings (1-5 stars), comments, satisfaction scores
 *   2. System Metrics: Duration, success rate, resource usage, error rates
 *   3. Agent Self-Assessment: Agent's own confidence score, perceived difficulty
 *   4. Peer Review: Other agents' assessment of collaboration quality
 *   5. Outcome Verification: Automated quality checks on deliverables
 *
 * Aggregation Pipeline:
 *   Collect → Normalize → Weight → Aggregate → Analyze → Action
 *
 * Features:
 *   - Multi-source feedback normalization (all sources → 0-1 scale)
 *   - Weighted aggregation with configurable source trust levels
 *   - Temporal decay (recent feedback weighted more)
 *   - Sentiment analysis for textual feedback
 *   - Trend detection (improving, degrading, stable)
 *   - Action trigger (generate actionable tasks from feedback patterns)
 *
 * Integration:
 *   - Feeds aggregated feedback to AgentLearningEngine
 *   - Feeds trends to AdaptiveStrategyService
 *   - Stores in KnowledgeGraphService for cross-reference
 *   - Emits events via AgentEventBusService
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import { AgentLearningEngine, LearningFeedback } from './agent-learning-engine.service';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { ClusterType } from '../../agent/entities/agent.entity';

// ─── Feedback Types ───────────────────────────────────────────────

export type FeedbackSource = 'user' | 'system' | 'agent_self' | 'peer' | 'outcome_verification';

export interface FeedbackEntry {
  id: string;
  source: FeedbackSource;
  missionId: string;
  agentId?: string;
  cluster?: ClusterType;
  timestamp: number;

  // Quantitative feedback
  rating?: number;        // 1-5 (for user feedback)
  score?: number;         // 0-100 (for system/outcome)
  success?: boolean;      // For system metrics
  durationMs?: number;    // For system metrics

  // Qualitative feedback
  comment?: string;
  tags?: string[];

  // Context
  context: Record<string, any>;
}

export interface AggregatedFeedback {
  missionId: string;
  overallScore: number;       // 0-1, weighted aggregate
  sourceBreakdown: Record<FeedbackSource, number>;
  trend: 'improving' | 'degrading' | 'stable';
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  keyInsights: string[];
  actionItems: ActionItem[];
  confidence: number;
  sampleSize: number;
  lastUpdated: number;
}

export interface ActionItem {
  id: string;
  type: 'improve_agent' | 'adjust_strategy' | 'fix_process' | 'escalate' | 'optimize' | 'investigate';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  affectedAgents: string[];
  affectedClusters: ClusterType[];
  supportingFeedback: string[]; // Feedback entry IDs
  estimatedImpact: number; // 0-1
  createdAt: number;
}

export interface FeedbackTrend {
  period: string; // '1h', '24h', '7d', '30d'
  metric: string;
  values: Array<{ timestamp: number; value: number }>;
  direction: 'up' | 'down' | 'flat';
  changeRate: number; // Percentage change
}

export interface FeedbackSummary {
  totalFeedback: number;
  avgScore: number;
  sourceDistribution: Record<FeedbackSource, number>;
  topIssues: Array<{ description: string; count: number }>;
  topPraise: Array<{ description: string; count: number }>;
  trendDirection: 'improving' | 'degrading' | 'stable';
}

// ─── Source Weights (trust levels) ────────────────────────────────

const SOURCE_WEIGHTS: Record<FeedbackSource, number> = {
  user: 0.30,
  outcome_verification: 0.25,
  system: 0.20,
  peer: 0.15,
  agent_self: 0.10,
};

const TEMPORAL_DECAY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class FeedbackAggregationService {
  private readonly logger = new Logger(FeedbackAggregationService.name);

  /** Raw feedback entries */
  private readonly entries: FeedbackEntry[] = [];
  private readonly MAX_ENTRIES = 5000;

  /** Aggregated feedback per mission */
  private readonly aggregated = new Map<string, AggregatedFeedback>();

  /** Action items */
  private readonly actions: ActionItem[] = [];
  private readonly MAX_ACTIONS = 200;

  constructor(
    private readonly eventBus: AgentEventBusService,
    private readonly memory: AgentMemoryService,
    @Optional() private readonly learningEngine: AgentLearningEngine,
    @Optional() private readonly knowledgeGraph: KnowledgeGraphService,
  ) {}

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Submit a feedback entry.
   */
  async submitFeedback(entry: FeedbackEntry): Promise<void> {
    this.entries.push(entry);
    if (this.entries.length > this.MAX_ENTRIES) {
      this.entries.shift();
    }

    // Re-aggregate for this mission
    await this.aggregateForMission(entry.missionId);

    // Feed to learning engine
    if (this.learningEngine && entry.agentId) {
      const normalizedScore = this.normalizeEntry(entry);
      await this.learningEngine.processFeedback({
        agentId: entry.agentId,
        missionId: entry.missionId,
        outcome: normalizedScore > 0.6 ? 'success' : normalizedScore < 0.4 ? 'failure' : 'partial',
        durationMs: entry.durationMs ?? 0,
        score: normalizedScore * 100,
        context: entry.context,
      });
    }

    // Emit feedback event
    this.eventBus.emit(AgentEventType.AGENT_COMPLETED, 'feedback-aggregation', {
      source: entry.source,
      missionId: entry.missionId,
      agentId: entry.agentId,
    });

    // Check if new action items should be generated
    this.detectActionItems(entry.missionId);
  }

  /**
   * Submit bulk feedback entries.
   */
  async submitBulk(entries: FeedbackEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.submitFeedback(entry);
    }
  }

  /**
   * Get aggregated feedback for a mission.
   */
  getAggregatedFeedback(missionId: string): AggregatedFeedback | null {
    return this.aggregated.get(missionId) ?? null;
  }

  /**
   * Get feedback summary across all missions.
   */
  getSummary(cluster?: ClusterType): FeedbackSummary {
    let filtered = this.entries;
    if (cluster) {
      filtered = filtered.filter((e) => e.cluster === cluster);
    }

    const totalFeedback = filtered.length;
    const scores = filtered.map((e) => this.normalizeEntry(e));
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Source distribution
    const sourceDistribution: Record<FeedbackSource, number> = {
      user: 0,
      system: 0,
      agent_self: 0,
      peer: 0,
      outcome_verification: 0,
    };
    for (const entry of filtered) {
      sourceDistribution[entry.source]++;
    }

    // Top issues (negative feedback)
    const negativeEntries = filtered.filter((e) => this.normalizeEntry(e) < 0.4 && e.comment);
    const issueMap = new Map<string, number>();
    for (const entry of negativeEntries) {
      const key = entry.comment!.substring(0, 80);
      issueMap.set(key, (issueMap.get(key) || 0) + 1);
    }
    const topIssues = [...issueMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([description, count]) => ({ description, count }));

    // Top praise (positive feedback)
    const positiveEntries = filtered.filter((e) => this.normalizeEntry(e) > 0.7 && e.comment);
    const praiseMap = new Map<string, number>();
    for (const entry of positiveEntries) {
      const key = entry.comment!.substring(0, 80);
      praiseMap.set(key, (praiseMap.get(key) || 0) + 1);
    }
    const topPraise = [...praiseMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([description, count]) => ({ description, count }));

    // Trend direction
    const recentScores = filtered
      .filter((e) => Date.now() - e.timestamp < 24 * 60 * 60 * 1000)
      .map((e) => this.normalizeEntry(e));
    const olderScores = filtered
      .filter((e) => Date.now() - e.timestamp >= 24 * 60 * 60 * 1000 && Date.now() - e.timestamp < 7 * 24 * 60 * 60 * 1000)
      .map((e) => this.normalizeEntry(e));

    const recentAvg = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0;
    const olderAvg = olderScores.length > 0 ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length : 0;

    const trendDirection: 'improving' | 'degrading' | 'stable' =
      recentAvg - olderAvg > 0.05 ? 'improving' :
      recentAvg - olderAvg < -0.05 ? 'degrading' : 'stable';

    return {
      totalFeedback,
      avgScore,
      sourceDistribution,
      topIssues,
      topPraise,
      trendDirection,
    };
  }

  /**
   * Get feedback trends.
   */
  getTrends(metric: string = 'overall', period: string = '24h'): FeedbackTrend[] {
    const periodMs = this.parsePeriod(period);
    const now = Date.now();
    const cutoff = now - periodMs;

    const relevantEntries = this.entries.filter((e) => e.timestamp >= cutoff);
    if (relevantEntries.length === 0) return [];

    // Group entries into time buckets
    const bucketCount = 12; // 12 data points
    const bucketSize = periodMs / bucketCount;
    const buckets: Array<{ timestamp: number; values: number[] }> = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = cutoff + i * bucketSize;
      const bucketEnd = bucketStart + bucketSize;
      const bucketEntries = relevantEntries.filter(
        (e) => e.timestamp >= bucketStart && e.timestamp < bucketEnd,
      );
      buckets.push({
        timestamp: bucketStart + bucketSize / 2,
        values: bucketEntries.map((e) => this.normalizeEntry(e)),
      });
    }

    const values = buckets.map((b) => ({
      timestamp: b.timestamp,
      value: b.values.length > 0 ? b.values.reduce((a, c) => a + c, 0) / b.values.length : 0,
    }));

    // Calculate direction
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s, v) => s + v.value, 0) / firstHalf.length : 0;
    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, v) => s + v.value, 0) / secondHalf.length : 0;

    const direction: 'up' | 'down' | 'flat' =
      secondAvg - firstAvg > 0.05 ? 'up' :
      secondAvg - firstAvg < -0.05 ? 'down' : 'flat';

    const changeRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    return [{
      period,
      metric,
      values,
      direction,
      changeRate,
    }];
  }

  /**
   * Get action items.
   */
  getActionItems(priority?: ActionItem['priority'], limit = 20): ActionItem[] {
    let items = [...this.actions];
    if (priority) items = items.filter((a) => a.priority === priority);
    return items.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }).slice(0, limit);
  }

  /**
   * Get feedback statistics.
   */
  getStatistics(): {
    totalEntries: number;
    totalAggregated: number;
    totalActions: number;
    avgScore: number;
    sourceBreakdown: Record<FeedbackSource, number>;
    recentTrend: 'improving' | 'degrading' | 'stable';
  } {
    const sourceBreakdown: Record<FeedbackSource, number> = {
      user: 0,
      system: 0,
      agent_self: 0,
      peer: 0,
      outcome_verification: 0,
    };

    let totalScore = 0;
    for (const entry of this.entries) {
      sourceBreakdown[entry.source]++;
      totalScore += this.normalizeEntry(entry);
    }

    const summary = this.getSummary();

    return {
      totalEntries: this.entries.length,
      totalAggregated: this.aggregated.size,
      totalActions: this.actions.length,
      avgScore: this.entries.length > 0 ? totalScore / this.entries.length : 0,
      sourceBreakdown,
      recentTrend: summary.trendDirection,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private normalizeEntry(entry: FeedbackEntry): number {
    switch (entry.source) {
      case 'user':
        // Rating 1-5 → 0-1
        return entry.rating ? (entry.rating - 1) / 4 : 0.5;

      case 'system':
        // Success + duration → score
        if (entry.success !== undefined) {
          let score = entry.success ? 0.8 : 0.2;
          if (entry.durationMs) {
            // Penalty for very long durations
            if (entry.durationMs > 120_000) score -= 0.1;
            if (entry.durationMs < 10_000) score += 0.1;
          }
          return Math.max(0, Math.min(1, score));
        }
        return entry.score ? entry.score / 100 : 0.5;

      case 'outcome_verification':
        // Score 0-100 → 0-1
        return entry.score !== undefined ? entry.score / 100 : 0.5;

      case 'agent_self':
        // Agent's own confidence → discount by 20% (agents tend to overestimate)
        const selfScore = entry.score !== undefined ? entry.score / 100 : 0.5;
        return selfScore * 0.8 + 0.1;

      case 'peer':
        // Peer review score 0-100 → 0-1
        return entry.score !== undefined ? entry.score / 100 : 0.5;

      default:
        return 0.5;
    }
  }

  private async aggregateForMission(missionId: string): Promise<void> {
    const missionEntries = this.entries.filter((e) => e.missionId === missionId);
    if (missionEntries.length === 0) return;

    // Weighted aggregation
    let weightedSum = 0;
    let totalWeight = 0;
    const sourceScores: Record<FeedbackSource, number[]> = {
      user: [],
      system: [],
      agent_self: [],
      peer: [],
      outcome_verification: [],
    };

    for (const entry of missionEntries) {
      const normalizedScore = this.normalizeEntry(entry);
      const weight = SOURCE_WEIGHTS[entry.source];
      const temporalWeight = this.calculateTemporalWeight(entry.timestamp);

      weightedSum += normalizedScore * weight * temporalWeight;
      totalWeight += weight * temporalWeight;

      sourceScores[entry.source].push(normalizedScore);
    }

    const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Calculate source breakdown averages
    const sourceBreakdown: Record<FeedbackSource, number> = {
      user: 0,
      system: 0,
      agent_self: 0,
      peer: 0,
      outcome_verification: 0,
    };
    for (const [source, scores] of Object.entries(sourceScores)) {
      sourceBreakdown[source as FeedbackSource] = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
    }

    // Determine trend
    const sortedEntries = [...missionEntries].sort((a, b) => a.timestamp - b.timestamp);
    const recentHalf = sortedEntries.slice(Math.floor(sortedEntries.length / 2));
    const olderHalf = sortedEntries.slice(0, Math.floor(sortedEntries.length / 2));

    const recentAvg = recentHalf.length > 0
      ? recentHalf.reduce((s, e) => s + this.normalizeEntry(e), 0) / recentHalf.length
      : overallScore;
    const olderAvg = olderHalf.length > 0
      ? olderHalf.reduce((s, e) => s + this.normalizeEntry(e), 0) / olderHalf.length
      : overallScore;

    const trend: 'improving' | 'degrading' | 'stable' =
      recentAvg - olderAvg > 0.05 ? 'improving' :
      recentAvg - olderAvg < -0.05 ? 'degrading' : 'stable';

    // Determine sentiment
    const sentiment: 'positive' | 'negative' | 'neutral' | 'mixed' =
      overallScore > 0.7 ? 'positive' :
      overallScore < 0.3 ? 'negative' :
      Math.max(...Object.values(sourceBreakdown)) - Math.min(...Object.values(sourceBreakdown)) > 0.3 ? 'mixed' : 'neutral';

    // Extract key insights
    const keyInsights: string[] = [];
    if (sourceBreakdown.user > 0.7) keyInsights.push('User satisfaction is high');
    if (sourceBreakdown.user < 0.4) keyInsights.push('User satisfaction is low — investigate');
    if (sourceBreakdown.outcome_verification > 0.8) keyInsights.push('Deliverable quality is excellent');
    if (sourceBreakdown.outcome_verification < 0.5) keyInsights.push('Deliverable quality needs improvement');
    if (sourceBreakdown.agent_self > 0.8 && overallScore < 0.5) keyInsights.push('Agent confidence may be overestimated');
    if (sourceBreakdown.system < 0.5) keyInsights.push('System metrics indicate performance issues');

    const aggregated: AggregatedFeedback = {
      missionId,
      overallScore,
      sourceBreakdown,
      trend,
      sentiment,
      keyInsights,
      actionItems: [], // Populated by detectActionItems
      confidence: Math.min(1, missionEntries.length / 5), // Higher confidence with more feedback
      sampleSize: missionEntries.length,
      lastUpdated: Date.now(),
    };

    this.aggregated.set(missionId, aggregated);
  }

  private detectActionItems(missionId: string): void {
    const aggregated = this.aggregated.get(missionId);
    if (!aggregated) return;

    const missionEntries = this.entries.filter((e) => e.missionId === missionId);

    // Generate action items based on feedback patterns
    if (aggregated.overallScore < 0.3) {
      this.addAction({
        id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: 'escalate',
        description: `Mission ${missionId} has very low feedback score (${(aggregated.overallScore * 100).toFixed(0)}%) — escalation recommended`,
        priority: 'critical',
        affectedAgents: [...new Set(missionEntries.filter((e) => e.agentId).map((e) => e.agentId!))],
        affectedClusters: [...new Set(missionEntries.filter((e) => e.cluster).map((e) => e.cluster!))],
        supportingFeedback: missionEntries.slice(-5).map((e) => e.id),
        estimatedImpact: 0.8,
        createdAt: Date.now(),
      });
    }

    if (aggregated.sourceBreakdown.system < 0.4) {
      this.addAction({
        id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: 'optimize',
        description: `System metrics for mission ${missionId} indicate performance issues — optimization needed`,
        priority: 'high',
        affectedAgents: [],
        affectedClusters: [...new Set(missionEntries.filter((e) => e.cluster).map((e) => e.cluster!))],
        supportingFeedback: missionEntries.filter((e) => e.source === 'system').slice(-3).map((e) => e.id),
        estimatedImpact: 0.6,
        createdAt: Date.now(),
      });
    }

    if (aggregated.trend === 'degrading') {
      this.addAction({
        id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: 'investigate',
        description: `Mission ${missionId} feedback trend is degrading — investigate root cause`,
        priority: 'medium',
        affectedAgents: [...new Set(missionEntries.filter((e) => e.agentId).map((e) => e.agentId!))],
        affectedClusters: [...new Set(missionEntries.filter((e) => e.cluster).map((e) => e.cluster!))],
        supportingFeedback: missionEntries.slice(-3).map((e) => e.id),
        estimatedImpact: 0.5,
        createdAt: Date.now(),
      });
    }
  }

  private addAction(action: ActionItem): void {
    this.actions.push(action);
    if (this.actions.length > this.MAX_ACTIONS) {
      this.actions.shift();
    }
  }

  private calculateTemporalWeight(timestamp: number): number {
    const ageMs = Date.now() - timestamp;
    // Exponential decay: weight halves every HALF_LIFE_MS
    return Math.pow(0.5, ageMs / TEMPORAL_DECAY_HALF_LIFE_MS);
  }

  private parsePeriod(period: string): number {
    const match = period.match(/^(\d+)(h|d|m)$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 24h

    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }
}
