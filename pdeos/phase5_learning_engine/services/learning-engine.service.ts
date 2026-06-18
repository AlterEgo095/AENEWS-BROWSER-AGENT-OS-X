/**
 * AENEWS Agent OS X → PDEOS — Phase 5
 *
 * File: backend/src/modules/learning-engine/services/learning-engine.service.ts
 *
 * LearningEngine — Point d'entrée central qui orchestre les 8 composants.
 *
 * Flow principal :
 *   1. Ingest mission result (success/failure)
 *   2. Pattern Mining détecte patterns récurrents
 *   3. Experience Replay stocke pour retrieval par similarité
 *   4. Feedback Aggregation collecte feedback explicite/implicite
 *   5. Prompt Optimizer propose améliorations de prompts
 *   6. Adaptive Strategy ajuste la stratégie de planning
 *   7. Habit Detector détecte habitudes utilisateur
 *   8. Automation Suggester propose nouvelles automatisations
 *   9. Threshold Calibrator ajuste seuils alerting
 */
import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { ExperienceRecord, LearningPattern } from '../dto/learning.dto';

@Injectable()
export class LearningEngine implements OnModuleInit {
  private readonly logger = new Logger(LearningEngine.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly llmService: LLMService,
  ) {}

  onModuleInit() {
    this.logger.log('LearningEngine initialized');
    // Consume self-healing memory channel (from Phase 11)
    this.consumeSelfHealingEvents().catch((err) =>
      this.logger.error(`Self-healing consumer failed: ${err.message}`),
    );
  }

  // ==========================================================================
  // INGEST — Called after every mission
  // ==========================================================================

  async ingestMissionResult(params: {
    missionId: string;
    agentName: string;
    input: any;
    plan: any;
    output: any;
    success: boolean;
    durationMs: number;
    costUSD: number;
    qualityScore?: number;
    feedback?: 'positive' | 'negative' | 'neutral';
  }): Promise<void> {
    const record: ExperienceRecord = {
      id: `exp_${uuidv4()}`,
      missionId: params.missionId,
      agentName: params.agentName,
      input: params.input,
      plan: params.plan,
      output: params.output,
      success: params.success,
      durationMs: params.durationMs,
      costUSD: params.costUSD,
      qualityScore: params.qualityScore,
      feedback: params.feedback,
      timestamp: new Date(),
    };

    // Store in experience replay (Redis list + sorted set by similarity key)
    await this.redis.lpush('learning:experiences', JSON.stringify(record));
    await this.redis.ltrim('learning:experiences', 0, 9999); // keep last 10k
    await this.redis.zadd(
      `learning:experiences:${params.agentName}`,
      Date.now(),
      record.id,
    );

    this.logger.debug(`Ingested experience ${record.id} for ${params.agentName} (success=${params.success})`);

    // Trigger pattern mining (async, non-blocking)
    this.minePatternsForAgent(params.agentName).catch((err) =>
      this.logger.error(`Pattern mining failed: ${err.message}`),
    );
  }

  // ==========================================================================
  // PATTERN MINING — Détecte patterns récurrents
  // ==========================================================================

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async dailyPatternMining(): Promise<void> {
    this.logger.log('Daily pattern mining starting');
    const agents = await this.getRecentAgents();
    for (const agent of agents) {
      await this.minePatternsForAgent(agent);
    }
    await this.detectAutomationOpportunities();
    this.logger.log('Daily pattern mining completed');
  }

  private async minePatternsForAgent(agentName: string): Promise<LearningPattern[]> {
    // Get last 100 experiences for this agent
    const experiences = await this.getExperiencesForAgent(agentName, 100);
    if (experiences.length < 5) return [];

    const patterns: LearningPattern[] = [];

    // Pattern 1: Success rate by input type
    const successRate = experiences.filter((e) => e.success).length / experiences.length;
    if (successRate < 0.7 && experiences.length >= 10) {
      patterns.push({
        id: `pat_${uuidv4()}`,
        type: 'agent_performance' as any,
        name: `${agentName} low success rate`,
        description: `${agentName} has ${(successRate * 100).toFixed(0)}% success rate over ${experiences.length} missions`,
        occurrences: experiences.length,
        confidence: Math.min(1, experiences.length / 20),
        firstSeenAt: experiences[experiences.length - 1].timestamp,
        lastSeenAt: experiences[0].timestamp,
        examples: experiences.slice(0, 3),
        recommendedAction: 'Review failing missions + consider prompt optimization',
        autoApplied: false,
      });
    }

    // Pattern 2: Cost spike
    const avgCost = experiences.reduce((s, e) => s + e.costUSD, 0) / experiences.length;
    const recentAvg = experiences.slice(0, 10).reduce((s, e) => s + e.costUSD, 0) / Math.min(10, experiences.length);
    if (recentAvg > avgCost * 1.5) {
      patterns.push({
        id: `pat_${uuidv4()}`,
        type: 'cost_pattern' as any,
        name: `${agentName} cost spike`,
        description: `Recent avg cost $${recentAvg.toFixed(2)} vs overall $${avgCost.toFixed(2)}`,
        occurrences: 10,
        confidence: 0.7,
        firstSeenAt: experiences[9]?.timestamp || new Date(),
        lastSeenAt: experiences[0].timestamp,
        examples: experiences.slice(0, 3),
        recommendedAction: 'Investigate cost increase — may need prompt optimization',
        autoApplied: false,
      });
    }

    // Persist patterns
    for (const pattern of patterns) {
      await this.redis.lpush('learning:patterns', JSON.stringify(pattern));
      await this.redis.ltrim('learning:patterns', 0, 499);
    }

    return patterns;
  }

  // ==========================================================================
  // EXPERIENCE REPLAY — Retrieval par similarité pour nouvelles missions
  // ==========================================================================

  async findSimilarExperiences(query: {
    agentName?: string;
    inputDescription: string;
    limit?: number;
  }): Promise<ExperienceRecord[]> {
    const limit = query.limit || 5;
    let candidates: ExperienceRecord[] = [];

    if (query.agentName) {
      candidates = await this.getExperiencesForAgent(query.agentName, 50);
    } else {
      const raw = await this.redis.lrange('learning:experiences', 0, 99);
      candidates = raw.map((r) => JSON.parse(r));
    }

    // Simple similarity: keyword matching on input description
    const queryLower = query.inputDescription.toLowerCase();
    const scored = candidates.map((exp) => {
      const expText = JSON.stringify(exp.input).toLowerCase();
      const words = queryLower.split(/\s+/).filter((w) => w.length > 3);
      const matches = words.filter((w) => expText.includes(w)).length;
      return { exp, score: matches / Math.max(1, words.length) };
    });

    return scored
      .filter((s) => s.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.exp);
  }

  // ==========================================================================
  // FEEDBACK AGGREGATION
  // ==========================================================================

  async recordFeedback(params: {
    userId: string;
    targetType: 'mission' | 'agent' | 'content' | 'system';
    targetId: string;
    feedback: 'positive' | 'negative' | 'neutral';
    rating: number;
    comment?: string;
    implicit?: boolean;
  }): Promise<void> {
    const entry = {
      id: `fb_${uuidv4()}`,
      ...params,
      implicit: params.implicit ?? false,
      timestamp: new Date(),
    };
    await this.redis.lpush('learning:feedback', JSON.stringify(entry));
    await this.redis.ltrim('learning:feedback', 0, 9999);
    await this.redis.hincrby(
      `learning:feedback:aggregate:${params.targetType}:${params.targetId}`,
      params.feedback,
      1,
    );
  }

  async getFeedbackSummary(targetType: string, targetId: string): Promise<{
    positive: number; negative: number; neutral: number; avgRating: number;
  }> {
    const raw = await this.redis.hgetall(`learning:feedback:aggregate:${targetType}:${targetId}`);
    return {
      positive: parseInt(raw.positive || '0'),
      negative: parseInt(raw.negative || '0'),
      neutral: parseInt(raw.neutral || '0'),
      avgRating: 0, // would compute from individual entries
    };
  }

  // ==========================================================================
  // PROMPT OPTIMIZER — A/B testing prompts
  // ==========================================================================

  async suggestPromptOptimization(agentName: string): Promise<any> {
    const experiences = await this.getExperiencesForAgent(agentName, 50);
    const failing = experiences.filter((e) => !e.success);
    if (failing.length < 3) return null;

    const prompt = `You are a prompt engineer. Analyze these failing missions for agent "${agentName}" and suggest a better system prompt.

FAILING MISSIONS (input + error):
${JSON.stringify(failing.slice(0, 5).map((e) => ({ input: e.input, output: e.output })), null, 2).substring(0, 3000)}

Respond in JSON:
{
  "optimizedPrompt": "...",
  "rationale": "...",
  "expectedImprovement": "..."
}`;

    try {
      const response = await this.llmService.complete({
        prompt, temperature: 0.3, maxTokens: 1500,
      });
      const optimization = {
        id: `opt_${uuidv4()}`,
        agentName,
        ...JSON.parse(response.text),
        createdAt: new Date(),
      };
      await this.redis.lpush('learning:prompt-optimizations', JSON.stringify(optimization));
      return optimization;
    } catch (err) {
      this.logger.warn(`Prompt optimization failed: ${err.message}`);
      return null;
    }
  }

  // ==========================================================================
  // ADAPTIVE STRATEGY — Ajuste stratégie de planning
  // ==========================================================================

  async getAdaptiveStrategy(agentName: string): Promise<{
    suggestedDepth: 'simple' | 'standard' | 'deep';
    suggestedBudget: number;
    suggestedTimeout: number;
    reasoning: string;
  }> {
    const experiences = await this.getExperiencesForAgent(agentName, 30);
    if (experiences.length < 5) {
      return {
        suggestedDepth: 'standard',
        suggestedBudget: 2,
        suggestedTimeout: 300000,
        reasoning: 'Insufficient history — using defaults',
      };
    }

    const successRate = experiences.filter((e) => e.success).length / experiences.length;
    const avgDuration = experiences.reduce((s, e) => s + e.durationMs, 0) / experiences.length;
    const avgCost = experiences.reduce((s, e) => s + e.costUSD, 0) / experiences.length;

    return {
      suggestedDepth: successRate > 0.85 ? 'simple' : successRate > 0.6 ? 'standard' : 'deep',
      suggestedBudget: Math.ceil(avgCost * 1.5 * 100) / 100,
      suggestedTimeout: Math.ceil(avgDuration * 1.5),
      reasoning: `Success rate ${(successRate * 100).toFixed(0)}%, avg cost $${avgCost.toFixed(2)}, avg duration ${(avgDuration / 1000).toFixed(1)}s`,
    };
  }

  // ==========================================================================
  // HABIT DETECTOR — Détecte habitudes utilisateur
  // ==========================================================================

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async dailyHabitDetection(): Promise<void> {
    this.logger.log('Daily habit detection running');
    // Analyze user activity patterns from Redis (mission timestamps, types)
    const activities = await this.redis.lrange('user:activities', 0, 999);
    if (activities.length < 20) return;

    const parsed = activities.map((a) => JSON.parse(a));
    const patterns = this.detectTimePatterns(parsed);

    for (const pattern of patterns) {
      await this.redis.lpush('learning:habits', JSON.stringify(pattern));
    }
    await this.redis.ltrim('learning:habits', 0, 199);
  }

  private detectTimePatterns(activities: any[]): any[] {
    const patterns: any[] = [];
    // Group by day-of-week + hour
    const slots: Record<string, number> = {};
    for (const act of activities) {
      const date = new Date(act.timestamp);
      const day = date.getDay();
      const hour = date.getHours();
      const key = `${day}-${hour}`;
      slots[key] = (slots[key] || 0) + 1;
    }

    // Find slots with high frequency (>= 3 occurrences)
    for (const [key, count] of Object.entries(slots)) {
      if (count >= 3) {
        const [day, hour] = key.split('-').map(Number);
        patterns.push({
          id: `habit_${uuidv4()}`,
          userId: 'default',
          pattern: `Activity on day ${day} at ${hour}:00`,
          frequency: 'weekly',
          dayOfWeek: day,
          hourOfDay: hour,
          occurrences: count,
          confidence: Math.min(1, count / 10),
          suggestedAutomation: `Automate recurring task at this time slot`,
          acceptedByUser: false,
          detectedAt: new Date(),
        });
      }
    }
    return patterns;
  }

  // ==========================================================================
  // AUTOMATION SUGGESTER — Propose nouvelles automatisations
  // ==========================================================================

  async detectAutomationOpportunities(): Promise<any[]> {
    const experiences = await this.redis.lrange('learning:experiences', 0, 199);
    const parsed = experiences.map((e) => JSON.parse(e));

    // Group by input similarity
    const groups: Record<string, any[]> = {};
    for (const exp of parsed) {
      const key = this.normalizeInputKey(exp.input);
      if (!groups[key]) groups[key] = [];
      groups[key].push(exp);
    }

    const suggestions: any[] = [];
    for (const [key, group] of Object.entries(groups)) {
      if (group.length >= 3) {
        suggestions.push({
          id: `sugg_${uuidv4()}`,
          pattern: `Recurring mission: ${key}`,
          rationale: `${group.length} similar missions in last 200`,
          potentialTimeSavedHours: group.length * 0.5,
          estimatedSetupEffortHours: 2,
          implementationPlan: 'Create a scheduled mission that runs this workflow periodically',
          status: 'pending',
          suggestedBy: 'LearningEngine',
          createdAt: new Date(),
        });
      }
    }

    for (const s of suggestions) {
      await this.redis.lpush('learning:suggestions', JSON.stringify(s));
    }
    await this.redis.ltrim('learning:suggestions', 0, 99);

    return suggestions;
  }

  // ==========================================================================
  // THRESHOLD CALIBRATOR — Ajuste seuils alerting
  // ==========================================================================

  @Cron(CronExpression.EVERY_1ST_OF_MONTH)
  async monthlyThresholdCalibration(): Promise<void> {
    this.logger.log('Monthly threshold calibration running');
    const metrics = ['cpu_usage', 'ram_usage', 'api_latency_p95', 'error_rate'];

    for (const metric of metrics) {
      const values = await this.redis.lrange(`metrics:history:${metric}`, 0, 999);
      if (values.length < 30) continue;

      const nums = values.map(Number).filter((n) => !isNaN(n));
      const avg = nums.reduce((s, n) => s + n, 0) / nums.length;
      const variance = nums.reduce((s, n) => s + Math.pow(n - avg, 2), 0) / nums.length;
      const stdDev = Math.sqrt(variance);

      // New threshold = avg + 3 * stdDev (99.7% confidence)
      const newThreshold = avg + 3 * stdDev;
      const currentThreshold = parseFloat(
        await this.redis.get(`alert:threshold:${metric}`) || '0',
      );

      if (currentThreshold === 0 || Math.abs(newThreshold - currentThreshold) / currentThreshold > 0.2) {
        const calibration = {
          id: `cal_${uuidv4()}`,
          metric,
          previousThreshold: currentThreshold,
          newThreshold,
          baseline: avg,
          stdDev,
          rationale: `Statistical baseline from ${nums.length} samples. New threshold = avg + 3σ`,
          confidence: Math.min(1, nums.length / 100),
          appliedAt: new Date(),
        };
        await this.redis.set(`alert:threshold:${metric}`, newThreshold);
        await this.redis.lpush('learning:calibrations', JSON.stringify(calibration));
        this.logger.log(`Calibrated ${metric}: ${currentThreshold} → ${newThreshold}`);
      }
    }
  }

  // ==========================================================================
  // SELF-HEALING consumer — Learn from auto-repairs
  // ==========================================================================

  private async consumeSelfHealingEvents(): Promise<void> {
    // Subscribe to self-healing channel (Phase 11 publishes here)
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe('learning:incident-resolved');
    subscriber.on('message', async (_channel, message) => {
      try {
        const event = JSON.parse(message);
        this.logger.log(`Learning from self-healing event: ${event.strategy} for ${event.source}`);

        // Store as experience
        await this.ingestMissionResult({
          missionId: event.incidentId,
          agentName: 'SelfHealingAgent',
          input: { incident: event.title, source: event.source },
          plan: { strategy: event.strategy },
          output: { resolved: true, attempts: event.attempts },
          success: true,
          durationMs: 0,
          costUSD: 0,
        });
      } catch (err) {
        this.logger.error(`Failed to process self-healing event: ${err.message}`);
      }
    });
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private async getRecentAgents(): Promise<string[]> {
    const experiences = await this.redis.lrange('learning:experiences', 0, 99);
    const agents = new Set<string>();
    for (const exp of experiences) {
      try {
        const parsed = JSON.parse(exp);
        agents.add(parsed.agentName);
      } catch {}
    }
    return Array.from(agents);
  }

  private async getExperiencesForAgent(agentName: string, limit: number): Promise<ExperienceRecord[]> {
    const all = await this.redis.lrange('learning:experiences', 0, 999);
    const result: ExperienceRecord[] = [];
    for (const raw of all) {
      try {
        const exp = JSON.parse(raw);
        if (exp.agentName === agentName) {
          result.push(exp);
          if (result.length >= limit) break;
        }
      } catch {}
    }
    return result;
  }

  private normalizeInputKey(input: any): string {
    if (typeof input === 'string') return input.substring(0, 50).toLowerCase();
    if (input?.prompt) return input.prompt.substring(0, 50).toLowerCase();
    if (input?.topic) return input.topic.substring(0, 50).toLowerCase();
    if (input?.title) return input.title.substring(0, 50).toLowerCase();
    return JSON.stringify(input).substring(0, 50).toLowerCase();
  }

  // ==========================================================================
  // PUBLIC API for dashboard
  // ==========================================================================

  async getStats(): Promise<any> {
    const [patterns, suggestions, calibrations, optimizations] = await Promise.all([
      this.redis.llen('learning:patterns'),
      this.redis.llen('learning:suggestions'),
      this.redis.llen('learning:calibrations'),
      this.redis.llen('learning:prompt-optimizations'),
    ]);
    return {
      totalExperiences: await this.redis.llen('learning:experiences'),
      patterns,
      suggestions,
      calibrations,
      promptOptimizations: optimizations,
    };
  }

  async getRecentPatterns(limit = 20): Promise<any[]> {
    return (await this.redis.lrange('learning:patterns', 0, limit - 1)).map((p) => JSON.parse(p));
  }

  async getRecentSuggestions(limit = 20): Promise<any[]> {
    return (await this.redis.lrange('learning:suggestions', 0, limit - 1)).map((s) => JSON.parse(s));
  }

  async approveSuggestion(suggestionId: string): Promise<boolean> {
    const suggestions = await this.redis.lrange('learning:suggestions', 0, -1);
    for (let i = 0; i < suggestions.length; i++) {
      const parsed = JSON.parse(suggestions[i]);
      if (parsed.id === suggestionId) {
        parsed.status = 'approved';
        parsed.reviewedAt = new Date();
        await this.redis.lset('learning:suggestions', i, JSON.stringify(parsed));
        return true;
      }
    }
    return false;
  }
}
