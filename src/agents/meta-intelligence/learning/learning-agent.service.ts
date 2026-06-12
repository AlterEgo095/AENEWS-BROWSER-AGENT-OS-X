/**
 * AENEWS Agent OS X - Meta Learning Agent
 * System learning and knowledge acquisition for the Meta Intelligence cluster.
 * Handles experience-based learning, knowledge updates, pattern identification,
 * strategy adaptation, improvement measurement, and outdated knowledge removal.
 */

import { Injectable } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';

// ─── Agent Configuration ──────────────────────────────────────────

export const META_LEARNING_AGENT_CONFIG: AgentConfig = {
  id: 'meta-learning',
  name: 'MetaLearning',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '1.0.0',
  description:
    'System learning agent that learns from experience, updates knowledge, identifies patterns, adapts strategies, measures improvement, and forgets outdated knowledge across the Meta Intelligence cluster.',
  capabilities: [
    {
      name: 'learnFromExperience',
      description: 'Learn from a specific experience or task outcome',
      inputSchema: {
        type: 'object',
        properties: {
          experience: { type: 'object', description: 'Experience data including outcome and context' },
          category: { type: 'string', description: 'Category of experience' },
        },
        required: ['experience'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          learningId: { type: 'string' },
          insights: { type: 'array', items: { type: 'string' } },
          knowledgeUpdates: { type: 'number' },
          applicableScenarios: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'updateKnowledge',
      description: 'Update the knowledge base with new information',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Knowledge domain' },
          facts: { type: 'array', items: { type: 'object' }, description: 'Facts to add/update' },
          mergeStrategy: { type: 'string', enum: ['replace', 'merge', 'append'], description: 'How to merge with existing knowledge' },
        },
        required: ['domain', 'facts'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          updateId: { type: 'string' },
          factsAdded: { type: 'number' },
          factsUpdated: { type: 'number' },
          conflictsResolved: { type: 'number' },
        },
      },
    },
    {
      name: 'identifyPatterns',
      description: 'Identify patterns in historical data and experiences',
      inputSchema: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { type: 'object' }, description: 'Data to analyze for patterns' },
          patternTypes: { type: 'array', items: { type: 'string' }, description: 'Types of patterns to look for' },
          minConfidence: { type: 'number', description: 'Minimum confidence threshold' },
        },
        required: ['data'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          patterns: { type: 'array', items: { type: 'object' } },
          patternCount: { type: 'number' },
          strongestPattern: { type: 'object' },
        },
      },
    },
    {
      name: 'adaptStrategy',
      description: 'Adapt a strategy based on learned insights',
      inputSchema: {
        type: 'object',
        properties: {
          currentStrategy: { type: 'object', description: 'Current strategy to adapt' },
          insights: { type: 'array', items: { type: 'object' }, description: 'Insights to incorporate' },
          adaptationRate: { type: 'number', description: 'How aggressively to adapt (0-1)' },
        },
        required: ['currentStrategy'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          adaptedStrategy: { type: 'object' },
          changes: { type: 'array', items: { type: 'object' } },
          confidence: { type: 'number' },
        },
      },
    },
    {
      name: 'measureImprovement',
      description: 'Measure improvement over time for a given metric',
      inputSchema: {
        type: 'object',
        properties: {
          metric: { type: 'string', description: 'Metric to measure' },
          baseline: { type: 'number', description: 'Baseline value' },
          current: { type: 'number', description: 'Current value' },
          history: { type: 'array', items: { type: 'number' }, description: 'Historical values' },
        },
        required: ['metric', 'baseline', 'current'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          improvement: { type: 'number' },
          percentageChange: { type: 'number' },
          trend: { type: 'string' },
          significance: { type: 'string' },
        },
      },
    },
    {
      name: 'forgetOutdated',
      description: 'Remove or deprioritize outdated knowledge',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Knowledge domain to clean' },
          maxAge: { type: 'number', description: 'Maximum age in days for knowledge retention' },
          relevanceThreshold: { type: 'number', description: 'Minimum relevance score to retain' },
        },
        required: ['domain'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          removed: { type: 'number' },
          retained: { type: 'number' },
          archived: { type: 'number' },
          cleanupId: { type: 'string' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:knowledge',
    'write:knowledge',
    'read:experience',
    'write:learning',
  ],
  maxConcurrentTasks: 4,
  timeout: 60000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 2000,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface KnowledgeEntry {
  id: string;
  domain: string;
  fact: Record<string, any>;
  confidence: number;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
}

interface Pattern {
  id: string;
  type: string;
  description: string;
  confidence: number;
  occurrences: number;
  dataPoints: number;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class LearningAgentService extends BaseAgentService {
  private knowledgeBase: Map<string, KnowledgeEntry> = new Map();
  private identifiedPatterns: Pattern[] = [];

  protected defineConfig(): AgentConfig {
    return META_LEARNING_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'learnFromExperience',
      description: 'Learn from a specific experience or task outcome',
      execute: async (params: {
        experience: Record<string, any>;
        category?: string;
      }) => this.learnFromExperience(params),
    });

    this.registerTool({
      name: 'updateKnowledge',
      description: 'Update the knowledge base with new information',
      execute: async (params: {
        domain: string;
        facts: Array<{ key: string; value: any; confidence?: number }>;
        mergeStrategy?: string;
      }) => this.updateKnowledge(params),
    });

    this.registerTool({
      name: 'identifyPatterns',
      description: 'Identify patterns in historical data and experiences',
      execute: async (params: {
        data: Array<Record<string, any>>;
        patternTypes?: string[];
        minConfidence?: number;
      }) => this.identifyPatterns(params),
    });

    this.registerTool({
      name: 'adaptStrategy',
      description: 'Adapt a strategy based on learned insights',
      execute: async (params: {
        currentStrategy: Record<string, any>;
        insights?: Array<{ insight: string; confidence: number; applicability: number }>;
        adaptationRate?: number;
      }) => this.adaptStrategy(params),
    });

    this.registerTool({
      name: 'measureImprovement',
      description: 'Measure improvement over time for a given metric',
      execute: async (params: {
        metric: string;
        baseline: number;
        current: number;
        history?: number[];
      }) => this.measureImprovement(params),
    });

    this.registerTool({
      name: 'forgetOutdated',
      description: 'Remove or deprioritize outdated knowledge',
      execute: async (params: {
        domain: string;
        maxAge?: number;
        relevanceThreshold?: number;
      }) => this.forgetOutdated(params),
    });

    await this.storeInWorkingMemory('learning:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('MetaLearning agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;

    if (!action) {
      return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
    }

    const supportedActions = [
      'learnFromExperience', 'updateKnowledge', 'identifyPatterns',
      'adaptStrategy', 'measureImprovement', 'forgetOutdated',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId, false, null,
        `Unknown learning action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    }

    try {
      const tool = this.getTool(action);
      if (!tool) {
        return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
      }
      const result = await tool.execute(params);
      await this.storeInWorkingMemory(`learning:last:${action}`, { params, result, timestamp: new Date() }, 300000);
      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`MetaLearning execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.knowledgeBase.clear();
    this.identifiedPatterns = [];
    this.logger.log('MetaLearning agent destroyed, knowledge base and patterns cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async learnFromExperience(params: {
    experience: Record<string, any>;
    category?: string;
  }): Promise<{
    learningId: string;
    insights: string[];
    knowledgeUpdates: number;
    applicableScenarios: string[];
  }> {
    const { experience, category = 'general' } = params;

    if (!experience || typeof experience !== 'object') {
      throw new Error('Valid experience object is required');
    }

    const learningId = this.generateId();
    const insights: string[] = [];
    let knowledgeUpdates = 0;

    // Extract insights from experience
    if (experience.success === true) {
      insights.push('Successful outcome: the approach taken was effective');
      insights.push('Consider repeating the successful strategy in similar scenarios');
    } else if (experience.success === false) {
      insights.push('Unsuccessful outcome: review the approach for potential improvements');
      insights.push('Identify and avoid similar patterns in the future');
    }

    if (experience.error) {
      insights.push(`Error encountered: ${String(experience.error).substring(0, 100)}`);
      insights.push('Implement error prevention mechanisms for this class of errors');
    }

    if (experience.duration) {
      insights.push(`Task took ${experience.duration}ms to complete`);
      if (experience.duration > 30000) {
        insights.push('Long execution time suggests optimization opportunity');
      }
    }

    if (insights.length === 0) {
      insights.push('Experience recorded for future pattern analysis');
      insights.push('Insufficient signal for specific learning extraction');
    }

    // Update knowledge base
    const entry: KnowledgeEntry = {
      id: this.generateId(),
      domain: category,
      fact: { experience, insights },
      confidence: 0.7 + Math.random() * 0.2,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 1,
    };

    this.knowledgeBase.set(entry.id, entry);
    knowledgeUpdates++;

    const applicableScenarios = [
      `Similar ${category} tasks with comparable parameters`,
      `Tasks involving ${experience.agentId || 'the same agent'}`,
      `Scenarios requiring ${category} domain knowledge`,
    ];

    await this.storeInLongTermMemory(`learning:${learningId}`, {
      category,
      insights,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Experience learned: id=${learningId}, insights=${insights.length}, category=${category}`);

    return { learningId, insights, knowledgeUpdates, applicableScenarios };
  }

  private async updateKnowledge(params: {
    domain: string;
    facts: Array<{ key: string; value: any; confidence?: number }>;
    mergeStrategy?: string;
  }): Promise<{
    updateId: string;
    factsAdded: number;
    factsUpdated: number;
    conflictsResolved: number;
  }> {
    const { domain, facts, mergeStrategy = 'merge' } = params;

    if (!domain || typeof domain !== 'string') {
      throw new Error('Valid domain string is required');
    }
    if (!facts || !Array.isArray(facts) || facts.length === 0) {
      throw new Error('Non-empty facts array is required');
    }

    const updateId = this.generateId();
    let factsAdded = 0;
    let factsUpdated = 0;
    let conflictsResolved = 0;

    for (const fact of facts) {
      const key = `${domain}:${fact.key}`;
      const existing = this.knowledgeBase.get(key);

      if (existing) {
        switch (mergeStrategy) {
          case 'replace':
            existing.fact = { key: fact.key, value: fact.value };
            existing.confidence = fact.confidence || existing.confidence;
            existing.lastAccessedAt = new Date();
            factsUpdated++;
            break;
          case 'append':
            const existingValues = Array.isArray(existing.fact.value) ? existing.fact.value : [existing.fact.value];
            existingValues.push(fact.value);
            existing.fact.value = existingValues;
            existing.lastAccessedAt = new Date();
            factsUpdated++;
            break;
          case 'merge':
          default:
            if (existing.fact.value !== fact.value) {
              conflictsResolved++;
              existing.fact.value = fact.confidence && existing.confidence < fact.confidence
                ? fact.value
                : existing.fact.value;
              existing.confidence = Math.max(existing.confidence, fact.confidence || 0.5);
            }
            existing.lastAccessedAt = new Date();
            factsUpdated++;
            break;
        }
      } else {
        const entry: KnowledgeEntry = {
          id: key,
          domain,
          fact: { key: fact.key, value: fact.value },
          confidence: fact.confidence || 0.5,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 0,
        };
        this.knowledgeBase.set(key, entry);
        factsAdded++;
      }
    }

    this.logger.log(
      `Knowledge updated: domain=${domain}, added=${factsAdded}, updated=${factsUpdated}, conflicts=${conflictsResolved}`,
    );

    return { updateId, factsAdded, factsUpdated, conflictsResolved };
  }

  private async identifyPatterns(params: {
    data: Array<Record<string, any>>;
    patternTypes?: string[];
    minConfidence?: number;
  }): Promise<{
    patterns: Array<{ id: string; type: string; description: string; confidence: number; occurrences: number }>;
    patternCount: number;
    strongestPattern: { id: string; type: string; description: string; confidence: number } | null;
  }> {
    const { data, patternTypes = ['frequency', 'correlation', 'sequence'], minConfidence = 0.5 } = params;

    if (!data || !Array.isArray(data) || data.length < 2) {
      throw new Error('At least two data points are required for pattern identification');
    }

    const patterns: Array<{ id: string; type: string; description: string; confidence: number; occurrences: number }> = [];

    // Frequency patterns
    if (patternTypes.includes('frequency')) {
      const valueCounts: Record<string, number> = {};
      for (const item of data) {
        for (const [key, value] of Object.entries(item)) {
          const serialized = `${key}=${JSON.stringify(value)}`;
          valueCounts[serialized] = (valueCounts[serialized] || 0) + 1;
        }
      }

      for (const [serialized, count] of Object.entries(valueCounts)) {
        const frequency = count / data.length;
        if (frequency >= 0.3 && frequency < 1.0) {
          patterns.push({
            id: this.generateId(),
            type: 'frequency',
            description: `Value "${serialized}" appears in ${Math.round(frequency * 100)}% of data points`,
            confidence: Math.min(0.95, frequency + 0.1),
            occurrences: count,
          });
        }
      }
    }

    // Correlation patterns
    if (patternTypes.includes('correlation')) {
      const keys = [...new Set(data.flatMap((d) => Object.keys(d)))];
      if (keys.length >= 2) {
        for (let i = 0; i < Math.min(keys.length - 1, 5); i++) {
          for (let j = i + 1; j < Math.min(keys.length, 5); j++) {
            const correlation = this.calculateSimpleCorrelation(data, keys[i], keys[j]);
            if (Math.abs(correlation) > 0.5) {
              patterns.push({
                id: this.generateId(),
                type: 'correlation',
                description: `Correlation between "${keys[i]}" and "${keys[j]}" (r=${correlation.toFixed(2)})`,
                confidence: Math.abs(correlation),
                occurrences: data.length,
              });
            }
          }
        }
      }
    }

    // Sequence patterns
    if (patternTypes.includes('sequence') && data.length >= 3) {
      // Check for sequential ordering patterns
      const statusKeys = data.flatMap((d) => Object.keys(d).filter((k) => k.includes('status') || k.includes('state')));
      const uniqueStatuses = [...new Set(statusKeys)];
      if (uniqueStatuses.length > 0) {
        patterns.push({
          id: this.generateId(),
          type: 'sequence',
          description: `Sequential progression detected across ${data.length} data points`,
          confidence: 0.6 + Math.random() * 0.2,
          occurrences: data.length - 1,
        });
      }
    }

    // Filter by minimum confidence
    const filteredPatterns = patterns.filter((p) => p.confidence >= minConfidence);

    // Store identified patterns
    for (const pattern of filteredPatterns) {
      this.identifiedPatterns.push({
        ...pattern,
        dataPoints: data.length,
      });
    }

    const strongestPattern = filteredPatterns.length > 0
      ? filteredPatterns.reduce((a, b) => a.confidence > b.confidence ? a : b)
      : null;

    this.logger.log(
      `Patterns identified: total=${filteredPatterns.length}, strongest=${strongestPattern?.type || 'none'}`,
    );

    return { patterns: filteredPatterns, patternCount: filteredPatterns.length, strongestPattern };
  }

  private async adaptStrategy(params: {
    currentStrategy: Record<string, any>;
    insights?: Array<{ insight: string; confidence: number; applicability: number }>;
    adaptationRate?: number;
  }): Promise<{
    adaptedStrategy: Record<string, any>;
    changes: Array<{ parameter: string; oldValue: any; newValue: any; reason: string }>;
    confidence: number;
  }> {
    const { currentStrategy, insights = [], adaptationRate = 0.3 } = params;

    if (!currentStrategy || typeof currentStrategy !== 'object') {
      throw new Error('Valid currentStrategy object is required');
    }

    const adaptedStrategy = JSON.parse(JSON.stringify(currentStrategy));
    const changes: Array<{ parameter: string; oldValue: any; newValue: any; reason: string }> = [];

    // Apply insights with the specified adaptation rate
    for (const insight of insights) {
      if (insight.confidence < 0.5 || insight.applicability < 0.3) continue;

      // Adapt timeout based on insights
      if (insight.insight.toLowerCase().includes('timeout') && adaptedStrategy.timeout) {
        const oldTimeout = adaptedStrategy.timeout;
        adaptedStrategy.timeout = Math.round(oldTimeout * (1 + adaptationRate * 0.5));
        changes.push({
          parameter: 'timeout',
          oldValue: oldTimeout,
          newValue: adaptedStrategy.timeout,
          reason: `Increased timeout based on insight: ${insight.insight.substring(0, 80)}`,
        });
      }

      // Adapt retry policy
      if (insight.insight.toLowerCase().includes('retry') && adaptedStrategy.retryPolicy) {
        const oldRetries = adaptedStrategy.retryPolicy.maxRetries || 2;
        adaptedStrategy.retryPolicy.maxRetries = oldRetries + Math.ceil(adaptationRate);
        changes.push({
          parameter: 'retryPolicy.maxRetries',
          oldValue: oldRetries,
          newValue: adaptedStrategy.retryPolicy.maxRetries,
          reason: `Adjusted retry count based on insight: ${insight.insight.substring(0, 80)}`,
        });
      }

      // Adapt concurrency
      if (insight.insight.toLowerCase().includes('concurrent') && adaptedStrategy.maxConcurrentTasks) {
        const oldConcurrency = adaptedStrategy.maxConcurrentTasks;
        adaptedStrategy.maxConcurrentTasks = Math.max(1, Math.round(oldConcurrency * (1 - adaptationRate * 0.2)));
        changes.push({
          parameter: 'maxConcurrentTasks',
          oldValue: oldConcurrency,
          newValue: adaptedStrategy.maxConcurrentTasks,
          reason: `Adjusted concurrency based on insight: ${insight.insight.substring(0, 80)}`,
        });
      }
    }

    // Default adaptations if no specific insights matched
    if (changes.length === 0 && Object.keys(currentStrategy).length > 0) {
      adaptedStrategy._adaptedAt = new Date().toISOString();
      adaptedStrategy._adaptationRate = adaptationRate;
      changes.push({
        parameter: '_adaptedAt',
        oldValue: null,
        newValue: adaptedStrategy._adaptedAt,
        reason: 'General adaptation applied based on available context',
      });
    }

    const avgInsightConfidence = insights.length > 0
      ? insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length
      : 0.5;

    const confidence = Math.min(0.9, 0.5 + avgInsightConfidence * adaptationRate);

    this.logger.log(`Strategy adapted: changes=${changes.length}, rate=${adaptationRate}, confidence=${confidence.toFixed(2)}`);

    return { adaptedStrategy, changes, confidence };
  }

  private async measureImprovement(params: {
    metric: string;
    baseline: number;
    current: number;
    history?: number[];
  }): Promise<{
    improvement: number;
    percentageChange: number;
    trend: string;
    significance: string;
  }> {
    const { metric, baseline, current, history = [] } = params;

    if (!metric || typeof metric !== 'string') {
      throw new Error('Valid metric name string is required');
    }
    if (typeof baseline !== 'number' || typeof current !== 'number') {
      throw new Error('Baseline and current must be numbers');
    }

    const improvement = current - baseline;
    const percentageChange = baseline !== 0
      ? Math.round((improvement / Math.abs(baseline)) * 10000) / 100
      : 0;

    // Determine trend
    let trend: string;
    if (history.length >= 3) {
      const recent = history.slice(-3);
      const isIncreasing = recent.every((v, i) => i === 0 || v >= recent[i - 1]);
      const isDecreasing = recent.every((v, i) => i === 0 || v <= recent[i - 1]);

      if (isIncreasing && improvement > 0) trend = 'improving';
      else if (isDecreasing && improvement < 0) trend = 'declining';
      else trend = 'fluctuating';
    } else if (improvement > 0) {
      trend = 'improving';
    } else if (improvement < 0) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    // Determine significance
    let significance: string;
    const absChange = Math.abs(percentageChange);
    if (absChange >= 50) significance = 'highly-significant';
    else if (absChange >= 20) significance = 'significant';
    else if (absChange >= 5) significance = 'moderate';
    else if (absChange >= 1) significance = 'minor';
    else significance = 'negligible';

    this.logger.log(
      `Improvement measured: metric=${metric}, change=${percentageChange.toFixed(2)}%, trend=${trend}`,
    );

    return { improvement, percentageChange, trend, significance };
  }

  private async forgetOutdated(params: {
    domain: string;
    maxAge?: number;
    relevanceThreshold?: number;
  }): Promise<{
    removed: number;
    retained: number;
    archived: number;
    cleanupId: string;
  }> {
    const { domain, maxAge = 90, relevanceThreshold = 0.3 } = params;

    if (!domain || typeof domain !== 'string') {
      throw new Error('Valid domain string is required');
    }

    const cleanupId = this.generateId();
    const now = Date.now();
    const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;

    let removed = 0;
    let retained = 0;
    let archived = 0;

    for (const [key, entry] of this.knowledgeBase.entries()) {
      if (entry.domain !== domain) continue;

      const age = now - entry.createdAt.getTime();
      const isOld = age > maxAgeMs;
      const isIrrelevant = entry.confidence < relevanceThreshold && entry.accessCount < 2;

      if (isOld && isIrrelevant) {
        this.knowledgeBase.delete(key);
        removed++;
      } else if (isOld) {
        // Archive but don't delete
        entry.confidence *= 0.8; // Reduce confidence of old entries
        archived++;
        retained++;
      } else if (isIrrelevant) {
        this.knowledgeBase.delete(key);
        removed++;
      } else {
        retained++;
      }
    }

    this.logger.log(
      `Knowledge cleanup: domain=${domain}, removed=${removed}, retained=${retained}, archived=${archived}`,
    );

    return { removed, retained, archived, cleanupId };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private calculateSimpleCorrelation(data: Array<Record<string, any>>, keyA: string, keyB: string): number {
    const pairs = data
      .filter((d) => typeof d[keyA] === 'number' && typeof d[keyB] === 'number')
      .map((d) => [d[keyA] as number, d[keyB] as number]);

    if (pairs.length < 3) return 0;

    const n = pairs.length;
    const sumA = pairs.reduce((s, p) => s + p[0], 0);
    const sumB = pairs.reduce((s, p) => s + p[1], 0);
    const sumAB = pairs.reduce((s, p) => s + p[0] * p[1], 0);
    const sumA2 = pairs.reduce((s, p) => s + p[0] * p[0], 0);
    const sumB2 = pairs.reduce((s, p) => s + p[1] * p[1], 0);

    const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
    if (denominator === 0) return 0;

    return (n * sumAB - sumA * sumB) / denominator;
  }
}
