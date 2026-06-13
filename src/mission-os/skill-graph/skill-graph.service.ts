/**
 * AENEWS Agent OS X - Skill Graph Service
 * Tracks each agent's skills with level, cost, latency, history, and success rate.
 * The Planner uses this to select the best agent for a given task by scoring
 * candidates across multiple weighted dimensions.
 */

import { Injectable, Logger } from '@nestjs/common';

// ─── Enums ───────────────────────────────────────────────────────────

export enum SkillLevel {
  NOVICE = 'novice',
  COMPETENT = 'competent',
  PROFICIENT = 'proficient',
  EXPERT = 'expert',
  MASTER = 'master',
}

// ─── Interfaces ──────────────────────────────────────────────────────

export interface SkillHistoryEntry {
  timestamp: Date;
  success: boolean;
  latencyMs: number;
  cost: number;
}

export interface SkillEntry {
  name: string;
  level: SkillLevel;
  costPerExecution: number;
  avgLatencyMs: number;
  successRate: number;
  executionCount: number;
  lastExecutedAt: Date | null;
  improvementTrend: number; // -1 to 1, positive = improving
  history: SkillHistoryEntry[];
}

export interface SkillProfile {
  agentId: string;
  skills: Map<string, SkillEntry>;
  overallScore: number;
  lastUpdated: Date;
}

export interface AgentSelectionCriteria {
  requiredSkill: string;
  minLevel?: SkillLevel;
  maxCost?: number;
  maxLatencyMs?: number;
  minSuccessRate?: number;
  preferAgentId?: string;
  excludeAgentIds?: string[];
}

// ─── Internal types ──────────────────────────────────────────────────

interface ExecutionResult {
  success: boolean;
  latencyMs: number;
  cost: number;
}

interface AgentScore {
  agentId: string;
  skill: SkillEntry;
  totalScore: number;
  breakdown: {
    skillLevelScore: number;
    successRateScore: number;
    costEfficiencyScore: number;
    latencyEfficiencyScore: number;
    improvementTrendScore: number;
  };
}

interface PredictionResult {
  estimatedLatencyMs: number;
  estimatedCost: number;
  successProbability: number;
  confidence: number; // 0-1, based on sample size
}

interface SkillRecommendation {
  skillName: string;
  currentLevel: SkillLevel;
  currentSuccessRate: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface SkillGraphNode {
  agentId: string;
  overallScore: number;
  skills: Record<
    string,
    {
      level: SkillLevel;
      successRate: number;
      executionCount: number;
      avgLatencyMs: number;
      costPerExecution: number;
      improvementTrend: number;
    }
  >;
}

// ─── Level ordering helper ───────────────────────────────────────────

const SKILL_LEVEL_ORDER: Record<SkillLevel, number> = {
  [SkillLevel.NOVICE]: 0,
  [SkillLevel.COMPETENT]: 1,
  [SkillLevel.PROFICIENT]: 2,
  [SkillLevel.EXPERT]: 3,
  [SkillLevel.MASTER]: 4,
};

const SKILL_LEVELS_ASC = [
  SkillLevel.NOVICE,
  SkillLevel.COMPETENT,
  SkillLevel.PROFICIENT,
  SkillLevel.EXPERT,
  SkillLevel.MASTER,
];

// ─── Scoring weights ─────────────────────────────────────────────────

const WEIGHT_SKILL_LEVEL = 0.3;
const WEIGHT_SUCCESS_RATE = 0.25;
const WEIGHT_COST_EFFICIENCY = 0.2;
const WEIGHT_LATENCY_EFFICIENCY = 0.15;
const WEIGHT_IMPROVEMENT_TREND = 0.1;

// ─── Service ─────────────────────────────────────────────────────────

@Injectable()
export class SkillGraphService {
  private readonly logger = new Logger(SkillGraphService.name);
  private readonly profiles: Map<string, SkillProfile> = new Map();

  /** Maximum history entries retained per skill to bound memory. */
  private readonly maxHistoryPerSkill = 200;

  /** Moving-average smoothing factor (0–1). Higher = more weight to new data. */
  private readonly smoothingFactor = 0.3;

  // ─── 1. registerSkillProfile ─────────────────────────────────────

  /**
   * Create an empty skill profile for an agent.
   * If a profile already exists it is returned unchanged.
   */
  registerSkillProfile(agentId: string): SkillProfile {
    const existing = this.profiles.get(agentId);
    if (existing) {
      this.logger.warn(`Skill profile already exists for agent ${agentId}`);
      return existing;
    }

    const profile: SkillProfile = {
      agentId,
      skills: new Map(),
      overallScore: 0,
      lastUpdated: new Date(),
    };

    this.profiles.set(agentId, profile);
    this.logger.log(`Registered skill profile for agent ${agentId}`);
    return profile;
  }

  // ─── 2. updateSkill ─────────────────────────────────────────────

  /**
   * After each execution, update the skill entry with new data.
   * - Increment executionCount
   * - Update avgLatencyMs (exponential moving average)
   * - Update successRate (exponential moving average)
   * - Recalculate improvementTrend (recent 30% vs older 70% success rate)
   * - Potentially upgrade / downgrade SkillLevel
   * - Store history entry (capped at maxHistoryPerSkill)
   */
  updateSkill(agentId: string, skillName: string, executionResult: ExecutionResult): SkillEntry {
    let profile = this.profiles.get(agentId);
    if (!profile) {
      profile = this.registerSkillProfile(agentId);
    }

    let skill = profile.skills.get(skillName);

    // --- Create skill if it doesn't exist yet ---
    if (!skill) {
      skill = {
        name: skillName,
        level: SkillLevel.NOVICE,
        costPerExecution: executionResult.cost,
        avgLatencyMs: executionResult.latencyMs,
        successRate: executionResult.success ? 1 : 0,
        executionCount: 1,
        lastExecutedAt: new Date(),
        improvementTrend: 0,
        history: [],
      };
    } else {
      // --- Update existing skill ---
      const n = skill.executionCount;
      const alpha = this.smoothingFactor;

      // Exponential moving average for latency
      skill.avgLatencyMs = alpha * executionResult.latencyMs + (1 - alpha) * skill.avgLatencyMs;

      // Exponential moving average for success rate
      const successBinary = executionResult.success ? 1 : 0;
      skill.successRate = alpha * successBinary + (1 - alpha) * skill.successRate;

      // Exponential moving average for cost
      skill.costPerExecution = alpha * executionResult.cost + (1 - alpha) * skill.costPerExecution;

      skill.executionCount = n + 1;
      skill.lastExecutedAt = new Date();

      // --- Improvement trend: compare recent vs older success rate ---
      skill.improvementTrend = this.calculateImprovementTrend(skill.history, executionResult);

      // --- Level upgrade / downgrade ---
      skill.level = this.evaluateSkillLevel(skill);
    }

    // --- Store history entry ---
    const historyEntry: SkillHistoryEntry = {
      timestamp: new Date(),
      success: executionResult.success,
      latencyMs: executionResult.latencyMs,
      cost: executionResult.cost,
    };
    skill.history.push(historyEntry);

    // Trim oldest entries if over cap
    if (skill.history.length > this.maxHistoryPerSkill) {
      skill.history = skill.history.slice(skill.history.length - this.maxHistoryPerSkill);
    }

    profile.skills.set(skillName, skill);

    // --- Recalculate overall profile score ---
    profile.overallScore = this.calculateOverallScore(profile);
    profile.lastUpdated = new Date();

    this.logger.debug(
      `Updated skill "${skillName}" for agent ${agentId} → level=${skill.level}, ` +
        `successRate=${skill.successRate.toFixed(3)}, executions=${skill.executionCount}`,
    );

    return skill;
  }

  // ─── 3. getSkillProfile ─────────────────────────────────────────

  /**
   * Get the full skill profile for an agent, or null if not registered.
   */
  getSkillProfile(agentId: string): SkillProfile | null {
    return this.profiles.get(agentId) ?? null;
  }

  // ─── 4. getSkill ────────────────────────────────────────────────

  /**
   * Get a specific skill entry for an agent, or null if not found.
   */
  getSkill(agentId: string, skillName: string): SkillEntry | null {
    return this.profiles.get(agentId)?.skills.get(skillName) ?? null;
  }

  // ─── 5. getBestAgent ────────────────────────────────────────────

  /**
   * Core selection method. Find the best agent for a skill based on criteria.
   *
   * Scoring weights:
   *   skillLevel       30%
   *   successRate      25%
   *   costEfficiency   20%
   *   latencyEfficiency 15%
   *   improvementTrend  10%
   *
   * Returns a ranked list of AgentScore entries (best first).
   */
  getBestAgent(criteria: AgentSelectionCriteria): AgentScore[] {
    const candidates: AgentScore[] = [];
    const excludeSet = new Set(criteria.excludeAgentIds ?? []);

    // Collect reference values for normalisation across candidates
    let maxCost = 0;
    let maxLatency = 0;

    const profileEntries = Array.from(this.profiles.entries());
    for (const [agentId, profile] of profileEntries) {
      if (excludeSet.has(agentId)) continue;
      const skill = profile.skills.get(criteria.requiredSkill);
      if (!skill) continue;

      // --- Hard filters ---
      if (
        criteria.minLevel &&
        SKILL_LEVEL_ORDER[skill.level] < SKILL_LEVEL_ORDER[criteria.minLevel]
      ) {
        continue;
      }
      if (criteria.maxCost !== undefined && skill.costPerExecution > criteria.maxCost) {
        continue;
      }
      if (criteria.maxLatencyMs !== undefined && skill.avgLatencyMs > criteria.maxLatencyMs) {
        continue;
      }
      if (criteria.minSuccessRate !== undefined && skill.successRate < criteria.minSuccessRate) {
        continue;
      }

      if (skill.costPerExecution > maxCost) maxCost = skill.costPerExecution;
      if (skill.avgLatencyMs > maxLatency) maxLatency = skill.avgLatencyMs;

      candidates.push({
        agentId,
        skill,
        totalScore: 0,
        breakdown: {
          skillLevelScore: 0,
          successRateScore: 0,
          costEfficiencyScore: 0,
          latencyEfficiencyScore: 0,
          improvementTrendScore: 0,
        },
      });
    }

    // Guard: avoid division by zero
    if (maxCost === 0) maxCost = 1;
    if (maxLatency === 0) maxLatency = 1;

    // --- Score each candidate ---
    for (const candidate of candidates) {
      const skill = candidate.skill;

      // Skill level normalised to 0–1
      const skillLevelScore = SKILL_LEVEL_ORDER[skill.level] / (SKILL_LEVELS_ASC.length - 1);

      // Success rate is already 0–1
      const successRateScore = skill.successRate;

      // Cost efficiency: lower cost = higher score (inverted)
      const costEfficiencyScore = 1 - skill.costPerExecution / maxCost;

      // Latency efficiency: lower latency = higher score (inverted)
      const latencyEfficiencyScore = 1 - skill.avgLatencyMs / maxLatency;

      // Improvement trend normalised from [-1,1] to [0,1]
      const improvementTrendScore = (skill.improvementTrend + 1) / 2;

      candidate.breakdown = {
        skillLevelScore,
        successRateScore,
        costEfficiencyScore,
        latencyEfficiencyScore,
        improvementTrendScore,
      };

      candidate.totalScore =
        WEIGHT_SKILL_LEVEL * skillLevelScore +
        WEIGHT_SUCCESS_RATE * successRateScore +
        WEIGHT_COST_EFFICIENCY * costEfficiencyScore +
        WEIGHT_LATENCY_EFFICIENCY * latencyEfficiencyScore +
        WEIGHT_IMPROVEMENT_TREND * improvementTrendScore;

      // Preference bonus: if a preferred agent meets criteria, give it a small boost
      if (criteria.preferAgentId && candidate.agentId === criteria.preferAgentId) {
        candidate.totalScore += 0.05; // tie-breaker bonus, does not distort scoring
      }
    }

    // Sort descending by totalScore
    candidates.sort((a, b) => b.totalScore - a.totalScore);

    this.logger.debug(
      `getBestAgent("${criteria.requiredSkill}"): ${candidates.length} candidates, ` +
        `top=${candidates[0]?.agentId ?? 'none'} (${candidates[0]?.totalScore.toFixed(3) ?? '-'})`,
    );

    return candidates;
  }

  // ─── 6. compareAgents ───────────────────────────────────────────

  /**
   * Compare agents side-by-side for a specific skill.
   * Returns each agent's skill entry (or null if they don't have it) keyed by agentId.
   */
  compareAgents(agentIds: string[], skillName: string): Record<string, SkillEntry | null> {
    const result: Record<string, SkillEntry | null> = {};
    for (const agentId of agentIds) {
      result[agentId] = this.getSkill(agentId, skillName);
    }
    return result;
  }

  // ─── 7. getSkillGraph ───────────────────────────────────────────

  /**
   * Return the full graph of agent → skills with levels and metrics.
   * Uses plain objects (no Map) so it is easily serialisable.
   */
  getSkillGraph(): SkillGraphNode[] {
    const nodes: SkillGraphNode[] = [];

    const profileEntries = Array.from(this.profiles.entries());
    for (const [agentId, profile] of profileEntries) {
      const skills: SkillGraphNode['skills'] = {};

      const skillEntries = Array.from(profile.skills.entries());
      for (const [skillName, entry] of skillEntries) {
        skills[skillName] = {
          level: entry.level,
          successRate: entry.successRate,
          executionCount: entry.executionCount,
          avgLatencyMs: entry.avgLatencyMs,
          costPerExecution: entry.costPerExecution,
          improvementTrend: entry.improvementTrend,
        };
      }

      nodes.push({
        agentId,
        overallScore: profile.overallScore,
        skills,
      });
    }

    return nodes;
  }

  // ─── 8. predictExecution ────────────────────────────────────────

  /**
   * Predict execution outcome based on historical data:
   *  - estimated latency  (recent moving average with trend adjustment)
   *  - estimated cost     (recent moving average)
   *  - success probability (recent success rate with trend adjustment)
   *  - confidence         (based on sample size, 0–1)
   */
  predictExecution(agentId: string, skillName: string): PredictionResult | null {
    const skill = this.getSkill(agentId, skillName);
    if (!skill || skill.executionCount === 0) {
      return null;
    }

    const n = skill.executionCount;

    // Confidence grows logarithmically: at 1 execution → 0.1, at 10 → 0.52, at 50 → 0.78, asymptotes toward 1
    const confidence = Math.min(1, Math.log10(n + 1) / Math.log10(101));

    // --- Estimated latency ---
    // Use the more recent half of the history for a trend-adjusted estimate
    const recentCount = Math.max(1, Math.floor(skill.history.length / 2));
    const recentHistory = skill.history.slice(-recentCount);
    const recentAvgLatency =
      recentHistory.reduce((sum, h) => sum + h.latencyMs, 0) / recentHistory.length;

    // Adjust by improvement trend (positive trend → latency decreasing)
    const trendAdjustment = 1 - skill.improvementTrend * 0.1; // subtle adjustment
    const estimatedLatencyMs = recentAvgLatency * trendAdjustment;

    // --- Estimated cost ---
    const recentAvgCost = recentHistory.reduce((sum, h) => sum + h.cost, 0) / recentHistory.length;

    // --- Success probability ---
    // Base: recent success rate
    const recentSuccessRate = recentHistory.filter((h) => h.success).length / recentHistory.length;
    // Adjust by improvement trend (positive → slightly higher probability)
    const successProbability = Math.min(
      1,
      Math.max(0, recentSuccessRate + skill.improvementTrend * 0.05),
    );

    return {
      estimatedLatencyMs: Math.round(estimatedLatencyMs * 100) / 100,
      estimatedCost: Math.round(recentAvgCost * 10000) / 10000,
      successProbability: Math.round(successProbability * 1000) / 1000,
      confidence: Math.round(confidence * 1000) / 1000,
    };
  }

  // ─── 9. getSkillRecommendations ─────────────────────────────────

  /**
   * Suggest which skills the agent should improve.
   * A skill is flagged when:
   *  - success rate < 0.6 (high priority)
   *  - success rate < 0.75 (medium priority)
   *  - level is NOVICE or COMPETENT with executionCount > 5 (medium/low priority)
   *  - negative improvementTrend (medium priority)
   */
  getSkillRecommendations(agentId: string): SkillRecommendation[] {
    const profile = this.profiles.get(agentId);
    if (!profile) {
      this.logger.warn(`No profile found for agent ${agentId}`);
      return [];
    }

    const recommendations: SkillRecommendation[] = [];

    const skillEntries = Array.from(profile.skills.entries());
    for (const [skillName, skill] of skillEntries) {
      const reasons: string[] = [];
      let priority: SkillRecommendation['priority'] = 'low' as SkillRecommendation['priority'];

      // Low success rate
      if (skill.successRate < 0.5) {
        reasons.push(`Very low success rate (${(skill.successRate * 100).toFixed(1)}%)`);
        priority = 'high';
      } else if (skill.successRate < 0.6) {
        reasons.push(`Low success rate (${(skill.successRate * 100).toFixed(1)}%)`);
        priority = 'high';
      } else if (skill.successRate < 0.75) {
        reasons.push(`Below-target success rate (${(skill.successRate * 100).toFixed(1)}%)`);
        if (priority !== ('high' as const)) priority = 'medium';
      }

      // Negative trend
      if (skill.improvementTrend < -0.2) {
        reasons.push(`Declining performance (trend=${skill.improvementTrend.toFixed(2)})`);
        if (priority === ('low' as const)) priority = 'medium';
      }

      // Low level with enough executions to have levelled up
      if (
        skill.executionCount > 5 &&
        (skill.level === SkillLevel.NOVICE || skill.level === SkillLevel.COMPETENT)
      ) {
        reasons.push(`Skill level "${skill.level}" despite ${skill.executionCount} executions`);
        if (priority === ('low' as const)) priority = 'medium';
      }

      if (reasons.length > 0) {
        recommendations.push({
          skillName,
          currentLevel: skill.level,
          currentSuccessRate: skill.successRate,
          reason: reasons.join('; '),
          priority,
        });
      }
    }

    // Sort: high → medium → low
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  // ─── 10. decayInactiveSkills ────────────────────────────────────

  /**
   * Reduce skill levels for skills not used recently (simulation of skill decay).
   * If a skill has not been executed within `decayThresholdMs` milliseconds,
   * its level is downgraded by one step and its successRate is decreased slightly.
   *
   * Returns the list of skills that were decayed.
   */
  decayInactiveSkills(decayThresholdMs: number): Array<{
    agentId: string;
    skillName: string;
    previousLevel: SkillLevel;
    newLevel: SkillLevel;
  }> {
    const now = Date.now();
    const decayed: Array<{
      agentId: string;
      skillName: string;
      previousLevel: SkillLevel;
      newLevel: SkillLevel;
    }> = [];

    const profileEntries = Array.from(this.profiles.entries());
    for (const [agentId, profile] of profileEntries) {
      const skillEntries = Array.from(profile.skills.entries());
      for (const [skillName, skill] of skillEntries) {
        if (!skill.lastExecutedAt) continue;

        const elapsed = now - skill.lastExecutedAt.getTime();
        if (elapsed < decayThresholdMs) continue;

        // Only decay if not already at NOVICE
        if (skill.level === SkillLevel.NOVICE) {
          // Still reduce success rate even at NOVICE
          skill.successRate = Math.max(0, skill.successRate - 0.05);
          skill.improvementTrend = Math.max(-1, skill.improvementTrend - 0.05);
          continue;
        }

        const previousLevel = skill.level;
        const currentIdx = SKILL_LEVEL_ORDER[skill.level];
        const newLevel = SKILL_LEVELS_ASC[Math.max(0, currentIdx - 1)];

        skill.level = newLevel;
        skill.successRate = Math.max(0, skill.successRate - 0.05);
        skill.improvementTrend = Math.max(-1, skill.improvementTrend - 0.1);

        decayed.push({ agentId, skillName, previousLevel, newLevel });

        this.logger.debug(
          `Decayed skill "${skillName}" for agent ${agentId}: ${previousLevel} → ${newLevel}`,
        );
      }

      // Refresh overall score after batch decay
      profile.overallScore = this.calculateOverallScore(profile);
      profile.lastUpdated = new Date();
    }

    if (decayed.length > 0) {
      this.logger.log(`Decayed ${decayed.length} inactive skill(s)`);
    }

    return decayed;
  }

  // ─── Private helpers ──────────────────────────────────────────────

  /**
   * Calculate improvement trend by comparing recent 30% of history
   * against older 70%. Returns a value in [-1, 1].
   */
  private calculateImprovementTrend(
    history: SkillHistoryEntry[],
    latestResult: ExecutionResult,
  ): number {
    // We need at least 2 data points for a meaningful trend
    const allEntries = [
      ...history,
      {
        timestamp: new Date(),
        success: latestResult.success,
        latencyMs: latestResult.latencyMs,
        cost: latestResult.cost,
      },
    ];

    if (allEntries.length < 2) {
      return 0;
    }

    const splitIdx = Math.floor(allEntries.length * 0.7);
    const older = allEntries.slice(0, splitIdx);
    const newer = allEntries.slice(splitIdx);

    if (older.length === 0 || newer.length === 0) {
      return 0;
    }

    const olderSuccessRate = older.filter((h) => h.success).length / older.length;
    const newerSuccessRate = newer.filter((h) => h.success).length / newer.length;

    // Difference clamped to [-1, 1]
    const trend = Math.max(-1, Math.min(1, newerSuccessRate - olderSuccessRate));

    return Math.round(trend * 1000) / 1000;
  }

  /**
   * Evaluate and return the appropriate SkillLevel based on execution count
   * and success rate thresholds.
   *
   * NOVICE → COMPETENT:  ≥10 executions, >60% success
   * COMPETENT → PROFICIENT: ≥25 executions, >75% success
   * PROFICIENT → EXPERT: ≥50 executions, >85% success
   * EXPERT → MASTER:  ≥100 executions, >95% success
   *
   * Downgrade: if success rate drops significantly below threshold for current level.
   */
  private evaluateSkillLevel(skill: SkillEntry): SkillLevel {
    const { executionCount, successRate, level: currentLevel } = skill;
    const currentIdx = SKILL_LEVEL_ORDER[currentLevel];

    // --- Check for upgrade ---
    const upgradeThresholds: Array<{
      requiredCount: number;
      requiredRate: number;
      targetLevel: SkillLevel;
    }> = [
      { requiredCount: 100, requiredRate: 0.95, targetLevel: SkillLevel.MASTER },
      { requiredCount: 50, requiredRate: 0.85, targetLevel: SkillLevel.EXPERT },
      { requiredCount: 25, requiredRate: 0.75, targetLevel: SkillLevel.PROFICIENT },
      { requiredCount: 10, requiredRate: 0.6, targetLevel: SkillLevel.COMPETENT },
    ];

    for (const threshold of upgradeThresholds) {
      if (
        SKILL_LEVEL_ORDER[threshold.targetLevel] > currentIdx &&
        executionCount >= threshold.requiredCount &&
        successRate > threshold.requiredRate
      ) {
        this.logger.log(
          `Skill "${skill.name}" upgraded: ${currentLevel} → ${threshold.targetLevel}`,
        );
        return threshold.targetLevel;
      }
    }

    // --- Check for downgrade ---
    // Downgrade if success rate falls well below the threshold that justified the current level
    const downgradeThresholds: Array<{ minRate: number; floorLevel: SkillLevel }> = [
      { minRate: 0.55, floorLevel: SkillLevel.COMPETENT }, // below 55% → at most COMPETENT
      { minRate: 0.7, floorLevel: SkillLevel.PROFICIENT }, // below 70% → at most PROFICIENT
      { minRate: 0.8, floorLevel: SkillLevel.EXPERT }, // below 80% → at most EXPERT
      { minRate: 0.9, floorLevel: SkillLevel.MASTER }, // below 90% → at most MASTER
    ];

    for (const threshold of downgradeThresholds) {
      if (successRate < threshold.minRate && currentIdx > SKILL_LEVEL_ORDER[threshold.floorLevel]) {
        const downgraded = threshold.floorLevel;
        this.logger.log(
          `Skill "${skill.name}" downgraded: ${currentLevel} → ${downgraded} (successRate=${(successRate * 100).toFixed(1)}%)`,
        );
        return downgraded;
      }
    }

    return currentLevel;
  }

  /**
   * Calculate the overall score for a profile as the average of all skill
   * scores. Each skill score is a weighted composite of level and success rate.
   */
  private calculateOverallScore(profile: SkillProfile): number {
    if (profile.skills.size === 0) return 0;

    let total = 0;
    const skillValues = Array.from(profile.skills.values());
    for (const skill of skillValues) {
      const levelNorm = SKILL_LEVEL_ORDER[skill.level] / (SKILL_LEVELS_ASC.length - 1);
      const skillScore = 0.5 * levelNorm + 0.5 * skill.successRate;
      total += skillScore;
    }

    return Math.round((total / profile.skills.size) * 1000) / 1000;
  }
}
