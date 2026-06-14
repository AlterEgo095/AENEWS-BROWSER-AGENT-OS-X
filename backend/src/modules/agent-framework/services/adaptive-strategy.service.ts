/**
 * AENEWS Agent OS X — Adaptive Strategy Service
 *
 * Phase 9 — Self-tuning orchestration that dynamically adjusts
 * pipeline parameters, agent selection weights, collaboration patterns,
 * and execution strategies based on learned performance data.
 *
 * Adaptive Mechanisms:
 *   1. Dynamic Timeout Tuning: Adjusts step timeouts based on historical
 *      execution durations. Slow agents get more time; fast agents get less.
 *   2. Agent Selection Weighting: Adjusts agent selection scores based on
 *      past performance in similar contexts. Proven agents get boosted.
 *   3. Strategy Selection: Chooses the best strategy (collaboration pattern,
 *      decomposition approach, execution order) based on mission characteristics.
 *   4. Retry Policy Tuning: Adjusts retry counts and backoff intervals based
 *      on failure type frequency. Transient failures get more retries.
 *   5. Resource Allocation: Allocates more resources (concurrent agents,
 *      memory tiers) to high-priority or historically difficult missions.
 *   6. Pipeline Step Ordering: Can reorder non-dependent pipeline steps
 *      for optimal throughput based on historical data.
 *
 * Adaptation Rules:
 *   - Adaptations are gradual (bounded change rate per cycle)
 *   - All adaptations are logged and auditable
 *   - Adaptations can be pinned (locked) by operators
 *   - Emergency reset reverts all adaptations to defaults
 *   - A/B testing: can run two configurations and compare outcomes
 *
 * Integration:
 *   - Reads from AgentLearningEngine for strategy preferences
 *   - Reads from KnowledgeGraphService for agent expertise
 *   - Reads from PatternMiningService for pattern predictions
 *   - Provides parameters to AgentOrchestratorService pipeline
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import { AgentLearningEngine } from './agent-learning-engine.service';
import { KnowledgeGraphService, StrategyRecommendation } from './knowledge-graph.service';
import { PatternMiningService, PatternPrediction } from './pattern-mining.service';
import { ClusterType } from '../../agent/entities/agent.entity';

// ─── Adaptive Types ───────────────────────────────────────────────

export interface AdaptiveConfiguration {
  id: string;
  version: number;
  createdAt: number;
  updatedAt: number;

  // Pipeline parameters
  timeouts: {
    decompose: number;
    plan: number;
    execute: number;
    critique: number;
    repair: number;
    validate: number;
    deliver: number;
  };

  // Agent selection
  agentSelectionWeights: {
    capabilityMatch: number;   // Default: 10
    healthScore: number;       // Default: 15
    idleBonus: number;         // Default: 5
    expertiseBoost: number;    // Default: 8
    learningBonus: number;     // Default: 5
    collaborationBonus: number; // Default: 3
  };

  // Strategy selection
  strategyPreferences: Map<string, number>; // strategy → weight

  // Retry policies
  retryPolicy: {
    defaultRetries: number;          // Default: 2
    timeoutRetries: number;          // Default: 3
    circuitBreakerRetries: number;   // Default: 1
    backoffBaseMs: number;           // Default: 1000
    backoffMultiplier: number;       // Default: 2
  };

  // Resource allocation
  resourceAllocation: {
    maxConcurrentMissions: number;  // Default: 5
    maxConcurrentAgents: number;    // Default: 10
    preferredMemoryTier: MemoryTier; // Default: WORKING
  };

  // Collaboration
  collaborationDefaults: {
    preferredPattern: string;       // Default: 'pipeline'
    maxCollaborationDepth: number;  // Default: 3
    consensusThreshold: number;     // Default: 0.7
  };

  // Pinned values (operator overrides)
  pinned: Set<string>;
}

export interface StrategyAdaptation {
  id: string;
  parameterName: string;
  previousValue: any;
  newValue: any;
  reason: string;
  confidence: number;
  source: 'learning' | 'pattern' | 'knowledge_graph' | 'correlation' | 'operator';
  timestamp: number;
  applied: boolean;
  outcome?: 'improved' | 'unchanged' | 'degraded';
}

export interface AdaptationContext {
  missionId: string;
  cluster?: ClusterType;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  capabilities?: string[];
  agentCount?: number;
  historicalOutcome?: 'success' | 'failure' | 'partial';
}

// ─── Defaults ─────────────────────────────────────────────────────

const DEFAULT_CONFIG: Omit<AdaptiveConfiguration, 'id' | 'version' | 'createdAt' | 'updatedAt'> = {
  timeouts: {
    decompose: 30_000,
    plan: 30_000,
    execute: 120_000,
    critique: 30_000,
    repair: 60_000,
    validate: 20_000,
    deliver: 15_000,
  },
  agentSelectionWeights: {
    capabilityMatch: 10,
    healthScore: 15,
    idleBonus: 5,
    expertiseBoost: 8,
    learningBonus: 5,
    collaborationBonus: 3,
  },
  strategyPreferences: new Map([
    ['pipeline', 1.0],
    ['parallel', 0.8],
    ['consensus', 0.6],
    ['delegation', 0.5],
    ['swarm', 0.4],
    ['handoff', 0.3],
  ]),
  retryPolicy: {
    defaultRetries: 2,
    timeoutRetries: 3,
    circuitBreakerRetries: 1,
    backoffBaseMs: 1000,
    backoffMultiplier: 2,
  },
  resourceAllocation: {
    maxConcurrentMissions: 5,
    maxConcurrentAgents: 10,
    preferredMemoryTier: MemoryTier.WORKING,
  },
  collaborationDefaults: {
    preferredPattern: 'pipeline',
    maxCollaborationDepth: 3,
    consensusThreshold: 0.7,
  },
  pinned: new Set(),
};

const MAX_ADAPTATION_RATE = 0.2; // Max 20% change per adaptation cycle
const ADAPTATION_COOLDOWN_MS = 60_000; // 1 minute between adaptations

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class AdaptiveStrategyService {
  private readonly logger = new Logger(AdaptiveStrategyService.name);

  /** Current active configuration */
  private activeConfig: AdaptiveConfiguration;

  /** Adaptation history */
  private readonly adaptations: StrategyAdaptation[] = [];
  private readonly MAX_ADAPTATIONS = 500;

  /** Last adaptation timestamp */
  private lastAdaptationAt = 0;

  constructor(
    private readonly eventBus: AgentEventBusService,
    private readonly memory: AgentMemoryService,
    @Optional() private readonly learningEngine: AgentLearningEngine,
    @Optional() private readonly knowledgeGraph: KnowledgeGraphService,
    @Optional() private readonly patternMining: PatternMiningService,
  ) {
    this.activeConfig = this.createDefaultConfig();
  }

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Get the current adaptive configuration.
   */
  getConfiguration(): AdaptiveConfiguration {
    return this.activeConfig;
  }

  /**
   * Get adaptive parameters for a specific mission context.
   * This is the primary method called by the orchestrator.
   */
  async getAdaptiveParameters(context: AdaptationContext): Promise<{
    timeouts: AdaptiveConfiguration['timeouts'];
    agentWeights: AdaptiveConfiguration['agentSelectionWeights'];
    retryPolicy: AdaptiveConfiguration['retryPolicy'];
    strategy: {
      recommended: string;
      confidence: number;
      alternatives: Array<{ strategy: string; confidence: number }>;
    };
    resourceAllocation: AdaptiveConfiguration['resourceAllocation'];
    collaboration: AdaptiveConfiguration['collaborationDefaults'];
    predictions: {
      failureRisk: number; // 0-1
      estimatedDurationMs: number;
      recommendedAgentCount: number;
    };
  }> {
    const config = this.activeConfig;

    // Get strategy recommendations from all sources
    const learningStrategy = this.learningEngine?.getBestStrategy(
      context.missionId,
      { cluster: context.cluster },
    );

    const knowledgeStrategies = this.knowledgeGraph
      ? await this.knowledgeGraph.getStrategyRecommendations({
          cluster: context.cluster,
          capabilities: context.capabilities,
        })
      : [];

    const patternPredictions = this.patternMining
      ? this.patternMining.predictOutcome({
          cluster: context.cluster || ClusterType.WATCHDOG,
          strategy: learningStrategy?.strategy || 'pipeline',
          agents: [],
          capabilities: context.capabilities || [],
          steps: [],
        })
      : [];

    // Aggregate strategy recommendations
    const strategyScores = new Map<string, number>();

    // Base scores from config
    for (const [strategy, weight] of config.strategyPreferences) {
      strategyScores.set(strategy, weight * 0.3); // 30% weight for defaults
    }

    // Learning engine scores
    if (learningStrategy?.strategy) {
      const current = strategyScores.get(learningStrategy.strategy) || 0;
      strategyScores.set(learningStrategy.strategy, current + learningStrategy.confidence * 0.4);
    }

    // Knowledge graph scores
    for (const rec of knowledgeStrategies) {
      const current = strategyScores.get(rec.strategyName) || 0;
      strategyScores.set(rec.strategyName, current + rec.confidence * 0.3);
    }

    // Pick best strategy
    const sortedStrategies = [...strategyScores.entries()]
      .sort((a, b) => b[1] - a[1]);

    const recommended = sortedStrategies[0]?.[0] || config.collaborationDefaults.preferredPattern;
    const recommendedConfidence = sortedStrategies[0]?.[1] || 0.5;

    const alternatives = sortedStrategies.slice(1, 4).map(([strategy, score]) => ({
      strategy,
      confidence: score,
    }));

    // Calculate failure risk from pattern predictions
    const failurePredictions = patternPredictions.filter((p) => p.predictedOutcome === 'failure');
    const failureRisk = failurePredictions.length > 0
      ? Math.min(1, Math.max(...failurePredictions.map((p) => p.confidence)))
      : 0;

    // Adjust timeouts based on priority
    let timeouts = { ...config.timeouts };
    if (context.priority === 'critical') {
      timeouts = this.scaleTimeouts(timeouts, 1.5);
    } else if (context.priority === 'low') {
      timeouts = this.scaleTimeouts(timeouts, 0.7);
    }

    // Adjust retries based on failure risk
    let retryPolicy = { ...config.retryPolicy };
    if (failureRisk > 0.6) {
      retryPolicy.defaultRetries = Math.min(5, retryPolicy.defaultRetries + 1);
    }

    return {
      timeouts,
      agentWeights: { ...config.agentSelectionWeights },
      retryPolicy,
      strategy: {
        recommended,
        confidence: recommendedConfidence,
        alternatives,
      },
      resourceAllocation: { ...config.resourceAllocation },
      collaboration: { ...config.collaborationDefaults },
      predictions: {
        failureRisk,
        estimatedDurationMs: this.estimateDuration(context, config),
        recommendedAgentCount: this.recommendAgentCount(context),
      },
    };
  }

  /**
   * Run an adaptation cycle — adjust configuration based on recent data.
   */
  async adapt(): Promise<StrategyAdaptation[]> {
    const now = Date.now();

    // Cooldown check
    if (now - this.lastAdaptationAt < ADAPTATION_COOLDOWN_MS) {
      return [];
    }

    this.lastAdaptationAt = now;
    const newAdaptations: StrategyAdaptation[] = [];

    // 1. Adapt timeouts based on pattern mining
    if (this.patternMining) {
      const correlations = this.patternMining.analyzeCorrelations();
      for (const corr of correlations) {
        if (corr.metric1 === 'duration' && corr.metric2 === 'score' && corr.correlation < -0.3) {
          // Longer missions have lower scores — reduce timeouts
          const adaptation = this.createAdaptation(
            'timeouts.execute',
            this.activeConfig.timeouts.execute,
            Math.round(this.activeConfig.timeouts.execute * 0.9),
            `Negative duration-score correlation (${corr.correlation.toFixed(2)}) suggests reducing execution timeout`,
            0.5,
            'correlation',
          );
          if (adaptation) newAdaptations.push(adaptation);
        }
      }
    }

    // 2. Adapt strategy preferences based on learning
    if (this.learningEngine) {
      const stats = this.learningEngine.getStatistics();
      for (const { strategy, avgQ } of stats.topStrategies) {
        const currentWeight = this.activeConfig.strategyPreferences.get(strategy) || 0;
        const targetWeight = Math.max(0, Math.min(1, (avgQ + 1) / 2)); // Normalize -1..1 to 0..1

        if (Math.abs(targetWeight - currentWeight) > 0.1) {
          const adaptation = this.createAdaptation(
            `strategyPreferences.${strategy}`,
            currentWeight,
            this.boundedChange(currentWeight, targetWeight, MAX_ADAPTATION_RATE),
            `Learning engine reports Q-value ${avgQ.toFixed(2)} for strategy "${strategy}"`,
            0.6,
            'learning',
          );
          if (adaptation) newAdaptations.push(adaptation);
        }
      }
    }

    // 3. Adapt agent selection weights based on knowledge graph
    if (this.knowledgeGraph) {
      try {
        const rankings = await this.knowledgeGraph.getExpertiseRanking(undefined, 5);
        if (rankings.length > 0) {
          const avgExpertise = rankings.reduce((s, r) => s + r.expertiseScore, 0) / rankings.length;
          if (avgExpertise > 0.7) {
            // High expertise agents — boost expertise weight
            const adaptation = this.createAdaptation(
              'agentSelectionWeights.expertiseBoost',
              this.activeConfig.agentSelectionWeights.expertiseBoost,
              this.boundedChange(
                this.activeConfig.agentSelectionWeights.expertiseBoost,
                12,
                MAX_ADAPTATION_RATE,
              ),
              `High average expertise score (${(avgExpertise * 100).toFixed(0)}%) — boosting expertise weight`,
              0.5,
              'knowledge_graph',
            );
            if (adaptation) newAdaptations.push(adaptation);
          }
        }
      } catch {
        // Knowledge graph may be unavailable
      }
    }

    // Apply adaptations
    for (const adaptation of newAdaptations) {
      if (adaptation.applied) {
        this.applyAdaptation(adaptation);
      }
    }

    // Store adaptations
    this.adaptations.push(...newAdaptations);
    if (this.adaptations.length > this.MAX_ADAPTATIONS) {
      this.adaptations.splice(0, this.adaptations.length - this.MAX_ADAPTATIONS);
    }

    // Update config version
    this.activeConfig.version++;
    this.activeConfig.updatedAt = now;

    // Emit adaptation event
    if (newAdaptations.length > 0) {
      this.eventBus.emit(AgentEventType.AGENT_COMPLETED, 'adaptive-strategy', {
        adaptationsApplied: newAdaptations.filter((a) => a.applied).length,
        adaptationsSkipped: newAdaptations.filter((a) => !a.applied).length,
        configVersion: this.activeConfig.version,
      });

      this.logger.log({
        msg: 'Adaptation cycle complete',
        adaptations: newAdaptations.length,
        applied: newAdaptations.filter((a) => a.applied).length,
        configVersion: this.activeConfig.version,
      });
    }

    return newAdaptations;
  }

  /**
   * Pin a parameter — prevent it from being adapted.
   */
  pinParameter(parameterName: string): void {
    this.activeConfig.pinned.add(parameterName);
    this.logger.log(`Pinned parameter: ${parameterName}`);
  }

  /**
   * Unpin a parameter — allow it to be adapted again.
   */
  unpinParameter(parameterName: string): void {
    this.activeConfig.pinned.delete(parameterName);
    this.logger.log(`Unpinned parameter: ${parameterName}`);
  }

  /**
   * Emergency reset — revert all adaptations to defaults.
   */
  emergencyReset(): void {
    this.activeConfig = this.createDefaultConfig();
    this.logger.warn('Emergency reset: all adaptations reverted to defaults');

    this.eventBus.emit(AgentEventType.AGENT_ERROR, 'adaptive-strategy', {
      action: 'emergency_reset',
      configVersion: this.activeConfig.version,
    });
  }

  /**
   * Get adaptation history.
   */
  getAdaptationHistory(limit = 20): StrategyAdaptation[] {
    return this.adaptations.slice(-limit);
  }

  /**
   * Get adaptation statistics.
   */
  getStatistics(): {
    configVersion: number;
    totalAdaptations: number;
    appliedCount: number;
    improvedCount: number;
    degradedCount: number;
    pinnedParameters: string[];
    lastAdaptationAt: number;
  } {
    return {
      configVersion: this.activeConfig.version,
      totalAdaptations: this.adaptations.length,
      appliedCount: this.adaptations.filter((a) => a.applied).length,
      improvedCount: this.adaptations.filter((a) => a.outcome === 'improved').length,
      degradedCount: this.adaptations.filter((a) => a.outcome === 'degraded').length,
      pinnedParameters: [...this.activeConfig.pinned],
      lastAdaptationAt: this.lastAdaptationAt,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private createDefaultConfig(): AdaptiveConfiguration {
    return {
      id: `config_default`,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...JSON.parse(JSON.stringify({
        timeouts: DEFAULT_CONFIG.timeouts,
        agentSelectionWeights: DEFAULT_CONFIG.agentSelectionWeights,
        retryPolicy: DEFAULT_CONFIG.retryPolicy,
        resourceAllocation: DEFAULT_CONFIG.resourceAllocation,
        collaborationDefaults: DEFAULT_CONFIG.collaborationDefaults,
      })),
      strategyPreferences: new Map(DEFAULT_CONFIG.strategyPreferences),
      pinned: new Set(),
    };
  }

  private createAdaptation(
    parameterName: string,
    previousValue: any,
    newValue: any,
    reason: string,
    confidence: number,
    source: StrategyAdaptation['source'],
  ): StrategyAdaptation | null {
    // Check if pinned
    if (this.activeConfig.pinned.has(parameterName)) {
      return {
        id: `adapt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        parameterName,
        previousValue,
        newValue,
        reason: `SKIPPED (pinned): ${reason}`,
        confidence,
        source,
        timestamp: Date.now(),
        applied: false,
      };
    }

    // Check if change is meaningful
    if (previousValue === newValue) return null;

    return {
      id: `adapt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      parameterName,
      previousValue,
      newValue,
      reason,
      confidence,
      source,
      timestamp: Date.now(),
      applied: true,
    };
  }

  private applyAdaptation(adaptation: StrategyAdaptation): void {
    const parts = adaptation.parameterName.split('.');
    let target: any = this.activeConfig;

    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i]];
      if (!target) return;
    }

    const lastKey = parts[parts.length - 1];
    if (target instanceof Map) {
      target.set(lastKey, adaptation.newValue);
    } else if (typeof target === 'object' && lastKey in target) {
      target[lastKey] = adaptation.newValue;
    }
  }

  private boundedChange(current: number, target: number, maxRate: number): number {
    const diff = target - current;
    const maxDelta = Math.abs(current) * maxRate;
    const clampedDiff = Math.max(-maxDelta, Math.min(maxDelta, diff));
    return current + clampedDiff;
  }

  private scaleTimeouts(timeouts: AdaptiveConfiguration['timeouts'], factor: number): AdaptiveConfiguration['timeouts'] {
    return {
      decompose: Math.round(timeouts.decompose * factor),
      plan: Math.round(timeouts.plan * factor),
      execute: Math.round(timeouts.execute * factor),
      critique: Math.round(timeouts.critique * factor),
      repair: Math.round(timeouts.repair * factor),
      validate: Math.round(timeouts.validate * factor),
      deliver: Math.round(timeouts.deliver * factor),
    };
  }

  private estimateDuration(context: AdaptationContext, config: AdaptiveConfiguration): number {
    const baseMs = config.timeouts.decompose + config.timeouts.plan + config.timeouts.execute;
    const priorityMultiplier = context.priority === 'critical' ? 1.5 :
      context.priority === 'high' ? 1.2 :
        context.priority === 'low' ? 0.7 : 1.0;
    return Math.round(baseMs * priorityMultiplier);
  }

  private recommendAgentCount(context: AdaptationContext): number {
    const baseCount = context.agentCount || 3;
    if (context.priority === 'critical') return baseCount + 2;
    if (context.priority === 'high') return baseCount + 1;
    if (context.priority === 'low') return Math.max(1, baseCount - 1);
    return baseCount;
  }
}
