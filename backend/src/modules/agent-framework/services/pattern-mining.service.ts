/**
 * AENEWS Agent OS X — Pattern Recognition & Mining Service
 *
 * Phase 9 — Mines historical mission data for recurring patterns,
 * anti-patterns, and optimization opportunities.
 *
 * Pattern Types:
 *   1. Success Patterns: Sequences of actions/strategies that consistently lead to success
 *   2. Failure Patterns: Conditions and action sequences that predict mission failure
 *   3. Optimization Patterns: Opportunities to improve efficiency (speed, cost, quality)
 *   4. Anti-Patterns: Common mistakes or sub-optimal approaches
 *   5. Collaboration Patterns: Effective agent team compositions and communication flows
 *   6. Seasonal Patterns: Time-based variations in mission success/behavior
 *
 * Mining Techniques:
 *   - Sequential Pattern Mining: Find recurring action sequences
 *   - Frequent Itemset Mining: Find commonly co-occurring capabilities/agents
 *   - Anomaly Detection: Identify deviant executions (both positive and negative)
 *   - Correlation Analysis: Find correlated metrics (e.g., duration ↔ score)
 *   - Temporal Analysis: Time-based pattern detection
 *
 * Integration:
 *   - Feeds discovered patterns into KnowledgeGraphService
 *   - Provides pattern-based predictions to AgentLearningEngine
 *   - Supports AdaptiveStrategyService with historical evidence
 *   - Emits pattern events via AgentEventBusService
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import { KnowledgeGraphService, PatternKnowledge } from './knowledge-graph.service';
import { ClusterType } from '../../agent/entities/agent.entity';

// ─── Pattern Types ────────────────────────────────────────────────

export type PatternCategory =
  | 'success_sequence'
  | 'failure_sequence'
  | 'optimization'
  | 'anti_pattern'
  | 'collaboration_effective'
  | 'collaboration_ineffective'
  | 'resource_bottleneck'
  | 'quality_degradation'
  | 'seasonal_variation';

export interface DiscoveredPattern {
  id: string;
  name: string;
  category: PatternCategory;
  description: string;
  sequence: string[]; // Action/step sequence
  conditions: PatternCondition[];
  frequency: number; // How often this pattern occurs
  confidence: number; // 0-1, statistical confidence
  impact: 'positive' | 'negative' | 'neutral';
  impactScore: number; // -1 to 1
  firstSeen: number;
  lastSeen: number;
  occurrences: PatternOccurrence[];
  suggestedActions: string[];
  relatedPatterns: string[];
}

export interface PatternCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'regex';
  value: any;
}

export interface PatternOccurrence {
  missionId: string;
  timestamp: number;
  outcome: 'success' | 'failure' | 'partial';
  context: Record<string, any>;
}

export interface MiningRequest {
  sourceData: MissionExecutionRecord[];
  categories?: PatternCategory[];
  minFrequency?: number; // Minimum occurrences to consider (default: 3)
  minConfidence?: number; // Minimum confidence (default: 0.4)
  maxPatterns?: number; // Maximum patterns to return (default: 50)
  cluster?: ClusterType;
}

export interface MissionExecutionRecord {
  missionId: string;
  description: string;
  cluster: ClusterType;
  strategy: string;
  agents: string[];
  capabilities: string[];
  steps: string[];
  durationMs: number;
  score?: number;
  outcome: 'success' | 'failure' | 'partial';
  errorType?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PatternPrediction {
  patternId: string;
  patternName: string;
  predictedOutcome: 'success' | 'failure' | 'partial';
  confidence: number;
  basedOnPatterns: string[];
}

export interface CorrelationFinding {
  metric1: string;
  metric2: string;
  correlation: number; // -1 to 1
  significance: number; // 0 to 1
  description: string;
}

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class PatternMiningService {
  private readonly logger = new Logger(PatternMiningService.name);

  /** Discovered patterns */
  private readonly patterns = new Map<string, DiscoveredPattern>();
  private readonly MAX_PATTERNS = 200;

  /** Execution history for mining */
  private readonly executionHistory: MissionExecutionRecord[] = [];
  private readonly MAX_HISTORY = 1000;

  constructor(
    private readonly eventBus: AgentEventBusService,
    private readonly memory: AgentMemoryService,
    @Optional() private readonly knowledgeGraph: KnowledgeGraphService,
  ) {}

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Record a mission execution for future pattern mining.
   */
  recordExecution(record: MissionExecutionRecord): void {
    this.executionHistory.push(record);
    if (this.executionHistory.length > this.MAX_HISTORY) {
      this.executionHistory.shift();
    }

    // Check if this execution matches any known patterns
    this.matchPatterns(record);
  }

  /**
   * Run a pattern mining session on the accumulated execution history.
   */
  async minePatterns(request?: MiningRequest): Promise<DiscoveredPattern[]> {
    const data = request?.sourceData ?? this.executionHistory;
    const minFrequency = request?.minFrequency ?? 3;
    const minConfidence = request?.minConfidence ?? 0.4;
    const maxPatterns = request?.maxPatterns ?? 50;
    const categories = request?.categories;

    if (data.length < minFrequency) {
      this.logger.debug('Not enough data for pattern mining');
      return [];
    }

    const startTime = Date.now();
    const discovered: DiscoveredPattern[] = [];

    // 1. Sequential Pattern Mining
    if (!categories || categories.includes('success_sequence') || categories.includes('failure_sequence')) {
      const successPatterns = this.mineSequentialPatterns(data, 'success', minFrequency);
      const failurePatterns = this.mineSequentialPatterns(data, 'failure', minFrequency);
      discovered.push(...successPatterns, ...failurePatterns);
    }

    // 2. Frequent Itemset Mining (capabilities, agents)
    if (!categories || categories.includes('collaboration_effective') || categories.includes('collaboration_ineffective')) {
      const collabPatterns = this.mineCollaborationPatterns(data, minFrequency);
      discovered.push(...collabPatterns);
    }

    // 3. Optimization Pattern Mining
    if (!categories || categories.includes('optimization')) {
      const optPatterns = this.mineOptimizationPatterns(data, minFrequency);
      discovered.push(...optPatterns);
    }

    // 4. Anti-Pattern Mining
    if (!categories || categories.includes('anti_pattern')) {
      const antiPatterns = this.mineAntiPatterns(data, minFrequency);
      discovered.push(...antiPatterns);
    }

    // 5. Correlation Analysis
    if (!categories || categories.includes('quality_degradation')) {
      const qualityPatterns = this.mineQualityPatterns(data, minFrequency);
      discovered.push(...qualityPatterns);
    }

    // Filter by confidence and frequency
    const filtered = discovered
      .filter((p) => p.frequency >= minFrequency && p.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxPatterns);

    // Register discovered patterns
    for (const pattern of filtered) {
      this.patterns.set(pattern.id, pattern);

      // Register in knowledge graph
      if (this.knowledgeGraph) {
        await this.knowledgeGraph.registerPattern({
          id: pattern.id,
          name: pattern.name,
          type: this.mapToPatternType(pattern.category),
          description: pattern.description,
          frequency: pattern.frequency,
          confidence: pattern.confidence,
          lastSeen: pattern.lastSeen,
          suggestedStrategies: pattern.suggestedActions,
        });
      }
    }

    // Emit mining event
    this.eventBus.emit(AgentEventType.AGENT_COMPLETED, 'pattern-mining', {
      patternsDiscovered: filtered.length,
      dataPoints: data.length,
      durationMs: Date.now() - startTime,
    });

    this.logger.log({
      msg: 'Pattern mining complete',
      patterns: filtered.length,
      dataPoints: data.length,
      durationMs: Date.now() - startTime,
    });

    // Prune old patterns
    if (this.patterns.size > this.MAX_PATTERNS) {
      this.prunePatterns();
    }

    return filtered;
  }

  /**
   * Predict outcome for a new mission based on known patterns.
   */
  predictOutcome(mission: {
    cluster: ClusterType;
    strategy: string;
    agents: string[];
    capabilities: string[];
    steps: string[];
  }): PatternPrediction[] {
    const predictions: PatternPrediction[] = [];

    for (const pattern of this.patterns.values()) {
      const matchScore = this.calculateMatchScore(mission, pattern);
      if (matchScore < 0.4) continue;

      const predictedOutcome: 'success' | 'failure' | 'partial' =
        pattern.impact === 'positive' ? 'success' :
        pattern.impact === 'negative' ? 'failure' : 'partial';

      predictions.push({
        patternId: pattern.id,
        patternName: pattern.name,
        predictedOutcome,
        confidence: matchScore * pattern.confidence,
        basedOnPatterns: [pattern.id],
      });
    }

    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Get all discovered patterns.
   */
  getPatterns(category?: PatternCategory, minConfidence = 0.3): DiscoveredPattern[] {
    return [...this.patterns.values()]
      .filter((p) => (!category || p.category === category) && p.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get correlation analysis results.
   */
  analyzeCorrelations(): CorrelationFinding[] {
    if (this.executionHistory.length < 10) return [];

    const findings: CorrelationFinding[] = [];

    // Duration vs Score correlation
    const durationScoreCorr = this.calculateCorrelation(
      this.executionHistory.map((r) => r.durationMs),
      this.executionHistory.map((r) => r.score ?? 50),
    );
    findings.push({
      metric1: 'duration',
      metric2: 'score',
      correlation: durationScoreCorr,
      significance: Math.abs(durationScoreCorr),
      description: `Duration and score correlation: ${durationScoreCorr.toFixed(3)}`,
    });

    // Agent count vs success rate
    const agentCounts = this.executionHistory.map((r) => r.agents.length);
    const successValues = this.executionHistory.map((r) => r.outcome === 'success' ? 1 : 0);
    const agentSuccessCorr = this.calculateCorrelation(agentCounts, successValues);
    findings.push({
      metric1: 'agent_count',
      metric2: 'success_rate',
      correlation: agentSuccessCorr,
      significance: Math.abs(agentSuccessCorr),
      description: `Agent count and success correlation: ${agentSuccessCorr.toFixed(3)}`,
    });

    // Capability count vs duration
    const capCounts = this.executionHistory.map((r) => r.capabilities.length);
    const durations = this.executionHistory.map((r) => r.durationMs);
    const capDurationCorr = this.calculateCorrelation(capCounts, durations);
    findings.push({
      metric1: 'capability_count',
      metric2: 'duration',
      correlation: capDurationCorr,
      significance: Math.abs(capDurationCorr),
      description: `Capability count and duration correlation: ${capDurationCorr.toFixed(3)}`,
    });

    return findings;
  }

  /**
   * Get mining statistics.
   */
  getStatistics(): {
    totalPatterns: number;
    totalExecutions: number;
    categoryBreakdown: Record<string, number>;
    avgConfidence: number;
    topPatterns: DiscoveredPattern[];
  } {
    const categoryBreakdown: Record<string, number> = {};
    let totalConfidence = 0;

    for (const pattern of this.patterns.values()) {
      categoryBreakdown[pattern.category] = (categoryBreakdown[pattern.category] || 0) + 1;
      totalConfidence += pattern.confidence;
    }

    return {
      totalPatterns: this.patterns.size,
      totalExecutions: this.executionHistory.length,
      categoryBreakdown,
      avgConfidence: this.patterns.size > 0 ? totalConfidence / this.patterns.size : 0,
      topPatterns: [...this.patterns.values()]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10),
    };
  }

  // ─── Mining Algorithms ─────────────────────────────────────────

  /**
   * Mine sequential patterns (action sequences leading to success/failure).
   */
  private mineSequentialPatterns(
    data: MissionExecutionRecord[],
    outcome: 'success' | 'failure',
    minFrequency: number,
  ): DiscoveredPattern[] {
    const patterns: DiscoveredPattern[] = [];
    const sequences = data.filter((r) => r.outcome === outcome);

    if (sequences.length < minFrequency) return patterns;

    // Find common subsequences of steps
    const sequenceCounts = new Map<string, { count: number; missions: string[] }>();

    for (const record of sequences) {
      // Generate 2-grams and 3-grams from steps
      for (let len = 2; len <= Math.min(3, record.steps.length); len++) {
        for (let i = 0; i <= record.steps.length - len; i++) {
          const subseq = record.steps.slice(i, i + len).join(' → ');
          const existing = sequenceCounts.get(subseq);
          if (existing) {
            existing.count++;
            existing.missions.push(record.missionId);
          } else {
            sequenceCounts.set(subseq, { count: 1, missions: [record.missionId] });
          }
        }
      }
    }

    // Convert frequent sequences to patterns
    const totalRecords = data.length;
    for (const [sequence, info] of sequenceCounts) {
      if (info.count < minFrequency) continue;

      const confidence = info.count / totalRecords;
      const category: PatternCategory = outcome === 'success' ? 'success_sequence' : 'failure_sequence';

      patterns.push({
        id: `pattern_seq_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: `${outcome === 'success' ? 'Success' : 'Failure'} sequence: ${sequence}`,
        category,
        description: `The action sequence "${sequence}" appears in ${info.count} ${outcome} missions (confidence: ${(confidence * 100).toFixed(1)}%)`,
        sequence: sequence.split(' → '),
        conditions: [{ field: 'outcome', operator: 'eq', value: outcome }],
        frequency: info.count,
        confidence,
        impact: outcome === 'success' ? 'positive' : 'negative',
        impactScore: outcome === 'success' ? confidence : -confidence,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        occurrences: info.missions.slice(0, 10).map((id) => ({
          missionId: id,
          timestamp: Date.now(),
          outcome,
          context: {},
        })),
        suggestedActions: outcome === 'success'
          ? ['Replicate this sequence in similar missions', 'Prefer agents that support these steps']
          : ['Avoid this sequence', 'Consider alternative approach'],
        relatedPatterns: [],
      });
    }

    return patterns;
  }

  /**
   * Mine collaboration patterns (effective/ineffective team compositions).
   */
  private mineCollaborationPatterns(
    data: MissionExecutionRecord[],
    minFrequency: number,
  ): DiscoveredPattern[] {
    const patterns: DiscoveredPattern[] = [];

    // Group by agent combinations
    const teamResults = new Map<string, { successes: number; failures: number; missions: string[] }>();

    for (const record of data) {
      const teamKey = [...record.agents].sort().join('+');
      const existing = teamResults.get(teamKey);
      if (existing) {
        if (record.outcome === 'success') existing.successes++;
        else existing.failures++;
        existing.missions.push(record.missionId);
      } else {
        teamResults.set(teamKey, {
          successes: record.outcome === 'success' ? 1 : 0,
          failures: record.outcome !== 'success' ? 1 : 0,
          missions: [record.missionId],
        });
      }
    }

    for (const [team, results] of teamResults) {
      const total = results.successes + results.failures;
      if (total < minFrequency) continue;

      const successRate = results.successes / total;
      const category: PatternCategory = successRate > 0.7
        ? 'collaboration_effective'
        : successRate < 0.3
          ? 'collaboration_ineffective'
          : 'collaboration_effective'; // Default to effective for moderate rates

      if (successRate > 0.7 || successRate < 0.3) {
        patterns.push({
          id: `pattern_collab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          name: `${successRate > 0.7 ? 'Effective' : 'Ineffective'} team: ${team}`,
          category,
          description: `Team composition [${team}] has ${(successRate * 100).toFixed(1)}% success rate across ${total} missions`,
          sequence: team.split('+'),
          conditions: [{ field: 'agents', operator: 'contains', value: team.split('+') }],
          frequency: total,
          confidence: Math.min(0.95, total / 10),
          impact: successRate > 0.7 ? 'positive' : 'negative',
          impactScore: successRate > 0.7 ? successRate : -(1 - successRate),
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          occurrences: results.missions.slice(0, 5).map((id) => ({
            missionId: id,
            timestamp: Date.now(),
            outcome: successRate > 0.7 ? 'success' : 'failure',
            context: { team },
          })),
          suggestedActions: successRate > 0.7
            ? ['Reuse this team composition for similar missions', 'Consider scaling this team pattern']
            : ['Avoid this team composition', 'Consider replacing underperforming agents'],
          relatedPatterns: [],
        });
      }
    }

    return patterns;
  }

  /**
   * Mine optimization patterns (opportunities to improve efficiency).
   */
  private mineOptimizationPatterns(
    data: MissionExecutionRecord[],
    minFrequency: number,
  ): DiscoveredPattern[] {
    const patterns: DiscoveredPattern[] = [];

    // Find strategies that are consistently faster
    const strategyDurations = new Map<string, { durations: number[]; scores: number[]; missions: string[] }>();

    for (const record of data) {
      if (record.outcome !== 'success') continue;
      const existing = strategyDurations.get(record.strategy);
      if (existing) {
        existing.durations.push(record.durationMs);
        existing.scores.push(record.score ?? 50);
        existing.missions.push(record.missionId);
      } else {
        strategyDurations.set(record.strategy, {
          durations: [record.durationMs],
          scores: [record.score ?? 50],
          missions: [record.missionId],
        });
      }
    }

    // Find strategies with significantly different performance
    const strategyStats = new Map<string, { avgDuration: number; avgScore: number; count: number }>();
    for (const [strategy, data_] of strategyDurations) {
      if (data_.durations.length < minFrequency) continue;
      strategyStats.set(strategy, {
        avgDuration: data_.durations.reduce((a, b) => a + b, 0) / data_.durations.length,
        avgScore: data_.scores.reduce((a, b) => a + b, 0) / data_.scores.length,
        count: data_.durations.length,
      });
    }

    // Compare strategies and find optimization opportunities
    const strategies = [...strategyStats.entries()];
    for (let i = 0; i < strategies.length; i++) {
      for (let j = i + 1; j < strategies.length; j++) {
        const [nameA, statsA] = strategies[i];
        const [nameB, statsB] = strategies[j];

        // Check if one strategy is significantly faster with similar quality
        const durationDiff = (statsA.avgDuration - statsB.avgDuration) / Math.max(statsA.avgDuration, statsB.avgDuration);
        const scoreDiff = Math.abs(statsA.avgScore - statsB.avgScore) / 100;

        if (Math.abs(durationDiff) > 0.3 && scoreDiff < 0.15) {
          const faster = durationDiff > 0 ? nameB : nameA;
          const slower = durationDiff > 0 ? nameA : nameB;
          const speedup = Math.abs(durationDiff) * 100;

          patterns.push({
            id: `pattern_opt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            name: `Optimization: ${faster} is ${speedup.toFixed(0)}% faster than ${slower}`,
            category: 'optimization',
            description: `Strategy "${faster}" achieves similar quality (${statsA.avgScore.toFixed(0)}/${statsB.avgScore.toFixed(0)}) but is ${speedup.toFixed(0)}% faster than "${slower}"`,
            sequence: [faster],
            conditions: [{ field: 'strategy', operator: 'eq', value: slower }],
            frequency: Math.min(statsA.count, statsB.count),
            confidence: Math.min(0.9, speedup / 50),
            impact: 'positive',
            impactScore: durationDiff / 2,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            occurrences: [],
            suggestedActions: [`Switch from ${slower} to ${faster} for similar missions`, `Expected speedup: ${speedup.toFixed(0)}%`],
            relatedPatterns: [],
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Mine anti-patterns (common mistakes or sub-optimal approaches).
   */
  private mineAntiPatterns(
    data: MissionExecutionRecord[],
    minFrequency: number,
  ): DiscoveredPattern[] {
    const patterns: DiscoveredPattern[] = [];

    // Find conditions that strongly correlate with failure
    const failures = data.filter((r) => r.outcome === 'failure');
    if (failures.length < minFrequency) return patterns;

    // Check for timeout-related failures
    const timeoutFailures = failures.filter((r) => r.errorType === 'timeout');
    if (timeoutFailures.length >= minFrequency) {
      const avgDuration = timeoutFailures.reduce((s, r) => s + r.durationMs, 0) / timeoutFailures.length;
      patterns.push({
        id: `pattern_anti_timeout_${Date.now()}`,
        name: 'Anti-pattern: Timeout cascade',
        category: 'anti_pattern',
        description: `${timeoutFailures.length} missions failed due to timeout with average duration ${avgDuration.toFixed(0)}ms. Consider reducing scope or increasing timeout.`,
        sequence: [],
        conditions: [{ field: 'durationMs', operator: 'gt', value: avgDuration }],
        frequency: timeoutFailures.length,
        confidence: Math.min(0.9, timeoutFailures.length / failures.length),
        impact: 'negative',
        impactScore: -0.7,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        occurrences: timeoutFailures.slice(0, 5).map((r) => ({
          missionId: r.missionId,
          timestamp: r.timestamp,
          outcome: 'failure',
          context: { durationMs: r.durationMs },
        })),
        suggestedActions: ['Increase timeout for complex missions', 'Decompose into smaller sub-missions', 'Add intermediate checkpointing'],
        relatedPatterns: [],
      });
    }

    // Check for single-point-of-failure (one agent doing too much)
    const agentWorkload = new Map<string, { missions: number; failures: number }>();
    for (const record of failures) {
      for (const agent of record.agents) {
        const existing = agentWorkload.get(agent);
        if (existing) {
          existing.missions++;
          existing.failures++;
        } else {
          agentWorkload.set(agent, { missions: 1, failures: 1 });
        }
      }
    }

    for (const [agent, stats] of agentWorkload) {
      if (stats.failures >= minFrequency) {
        patterns.push({
          id: `pattern_anti_spoof_${Date.now()}_${agent.replace(/[^a-z0-9]/gi, '_')}`,
          name: `Anti-pattern: Single point of failure — ${agent}`,
          category: 'anti_pattern',
          description: `Agent "${agent}" appears in ${stats.failures} failed missions. Consider load balancing or redundancy.`,
          sequence: [],
          conditions: [{ field: 'agents', operator: 'contains', value: agent }],
          frequency: stats.failures,
          confidence: Math.min(0.8, stats.failures / 10),
          impact: 'negative',
          impactScore: -0.5,
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          occurrences: [],
          suggestedActions: [`Redistribute workload from ${agent}`, 'Add redundancy for critical operations', 'Implement circuit breaker for this agent'],
          relatedPatterns: [],
        });
      }
    }

    return patterns;
  }

  /**
   * Mine quality degradation patterns.
   */
  private mineQualityPatterns(
    data: MissionExecutionRecord[],
    minFrequency: number,
  ): DiscoveredPattern[] {
    const patterns: DiscoveredPattern[] = [];
    const scored = data.filter((r) => r.score !== undefined && r.outcome === 'success');
    if (scored.length < minFrequency) return patterns;

    // Find capabilities associated with low scores
    const capScores = new Map<string, { scores: number[]; missions: string[] }>();
    for (const record of scored) {
      for (const cap of record.capabilities) {
        const existing = capScores.get(cap);
        if (existing) {
          existing.scores.push(record.score!);
          existing.missions.push(record.missionId);
        } else {
          capScores.set(cap, { scores: [record.score!], missions: [record.missionId] });
        }
      }
    }

    for (const [cap, info] of capScores) {
      if (info.scores.length < minFrequency) continue;
      const avgScore = info.scores.reduce((a, b) => a + b, 0) / info.scores.length;
      if (avgScore < 50) {
        patterns.push({
          id: `pattern_quality_${Date.now()}_${cap.replace(/[^a-z0-9]/gi, '_')}`,
          name: `Quality concern: ${cap} produces low scores`,
          category: 'quality_degradation',
          description: `Capability "${cap}" averages ${avgScore.toFixed(1)} score across ${info.scores.length} missions (below 50 threshold)`,
          sequence: [],
          conditions: [{ field: 'capabilities', operator: 'contains', value: cap }],
          frequency: info.scores.length,
          confidence: Math.min(0.85, (50 - avgScore) / 50),
          impact: 'negative',
          impactScore: -(50 - avgScore) / 100,
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          occurrences: info.missions.slice(0, 5).map((id) => ({
            missionId: id,
            timestamp: Date.now(),
            outcome: 'success',
            context: { avgScore },
          })),
          suggestedActions: [`Review ${cap} implementation`, 'Consider alternative approach', 'Add quality checkpoints'],
          relatedPatterns: [],
        });
      }
    }

    return patterns;
  }

  // ─── Utility Methods ───────────────────────────────────────────

  private matchPatterns(record: MissionExecutionRecord): void {
    for (const pattern of this.patterns.values()) {
      if (this.matchesConditions(record, pattern.conditions)) {
        // Update pattern frequency and last seen
        pattern.frequency++;
        pattern.lastSeen = Date.now();
        pattern.occurrences.push({
          missionId: record.missionId,
          timestamp: Date.now(),
          outcome: record.outcome,
          context: { cluster: record.cluster, strategy: record.strategy },
        });

        // Keep only recent occurrences
        if (pattern.occurrences.length > 20) {
          pattern.occurrences.shift();
        }

        // Update confidence based on continued matching
        pattern.confidence = Math.min(0.95, pattern.confidence + 0.02);
      }
    }
  }

  private matchesConditions(record: MissionExecutionRecord, conditions: PatternCondition[]): boolean {
    return conditions.every((cond) => {
      const value = (record as any)[cond.field];
      switch (cond.operator) {
        case 'eq': return value === cond.value;
        case 'neq': return value !== cond.value;
        case 'gt': return value > cond.value;
        case 'lt': return value < cond.value;
        case 'contains': return Array.isArray(value) && Array.isArray(cond.value)
          ? cond.value.every((v: any) => value.includes(v))
          : value?.includes(cond.value);
        case 'regex': return new RegExp(cond.value).test(String(value));
        default: return false;
      }
    });
  }

  private calculateMatchScore(
    mission: { cluster: ClusterType; strategy: string; agents: string[]; capabilities: string[]; steps: string[] },
    pattern: DiscoveredPattern,
  ): number {
    let score = 0;
    let factors = 0;

    // Cluster match
    if (pattern.conditions.some((c) => c.field === 'outcome')) {
      factors++;
    }

    // Strategy match
    if (pattern.sequence.length > 0 && pattern.sequence.includes(mission.strategy)) {
      score += 0.5;
      factors++;
    }

    // Step overlap
    if (mission.steps.length > 0 && pattern.sequence.length > 0) {
      const overlap = pattern.sequence.filter((s) => mission.steps.includes(s)).length;
      const overlapRatio = overlap / Math.max(pattern.sequence.length, 1);
      score += overlapRatio * 0.3;
      factors++;
    }

    // Agent overlap
    if (mission.agents.length > 0 && pattern.sequence.length > 0) {
      const agentOverlap = pattern.sequence.filter((s) => mission.agents.includes(s)).length;
      score += (agentOverlap / Math.max(mission.agents.length, 1)) * 0.2;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 3) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let denX = 0;
    let denY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
  }

  private mapToPatternType(category: PatternCategory): PatternKnowledge['type'] {
    switch (category) {
      case 'success_sequence': return 'success';
      case 'failure_sequence': return 'failure';
      case 'optimization': return 'optimization';
      case 'anti_pattern': return 'anti-pattern';
      case 'collaboration_effective':
      case 'collaboration_ineffective': return 'collaboration';
      default: return 'optimization';
    }
  }

  private prunePatterns(): void {
    // Remove lowest-confidence patterns
    const entries = [...this.patterns.entries()]
      .sort((a, b) => b[1].confidence - a[1].confidence);

    this.patterns.clear();
    for (const [key, pattern] of entries.slice(0, this.MAX_PATTERNS * 0.8)) {
      this.patterns.set(key, pattern);
    }
  }
}
