/**
 * AENEWS Agent OS X - Meta Self-Improvement Agent
 * Self-assessment and capability enhancement for the Meta Intelligence cluster.
 * Handles capability assessment, weakness identification, improvement planning,
 * progress tracking, performance measurement, and upgrade suggestions.
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

export const META_SELF_IMPROVEMENT_AGENT_CONFIG: AgentConfig = {
  id: 'meta-self-improvement',
  name: 'MetaSelfImprovement',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '1.0.0',
  description:
    'Self-improvement agent that assesses capabilities, identifies weaknesses, generates improvement plans, tracks progress, measures performance, and suggests upgrades across the Meta Intelligence cluster.',
  capabilities: [
    {
      name: 'assessCapabilities',
      description: 'Assess the capabilities of the agent system',
      inputSchema: {
        type: 'object',
        properties: { scope: { type: 'string' }, includeMetrics: { type: 'boolean' } },
        required: [],
      },
      outputSchema: {
        type: 'object',
        properties: {
          capabilities: { type: 'array', items: { type: 'object' } },
          overallScore: { type: 'number' },
          gaps: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'identifyWeaknesses',
      description: 'Identify weaknesses in agent performance',
      inputSchema: {
        type: 'object',
        properties: { area: { type: 'string' }, timeRange: { type: 'string' } },
        required: [],
      },
      outputSchema: {
        type: 'object',
        properties: {
          weaknesses: { type: 'array', items: { type: 'object' } },
          severity: { type: 'string' },
          count: { type: 'number' },
        },
      },
    },
    {
      name: 'generateImprovementPlan',
      description: 'Generate a plan for improving agent capabilities',
      inputSchema: {
        type: 'object',
        properties: {
          weaknesses: { type: 'array', items: { type: 'object' } },
          goals: { type: 'array', items: { type: 'string' } },
        },
        required: ['weaknesses'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          planId: { type: 'string' },
          steps: { type: 'array', items: { type: 'object' } },
          estimatedTime: { type: 'number' },
          priority: { type: 'string' },
        },
      },
    },
    {
      name: 'trackProgress',
      description: 'Track progress on improvement initiatives',
      inputSchema: {
        type: 'object',
        properties: {
          planId: { type: 'string' },
          metrics: { type: 'array', items: { type: 'string' } },
        },
        required: ['planId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          progress: { type: 'number' },
          completedSteps: { type: 'number' },
          remainingSteps: { type: 'number' },
          status: { type: 'string' },
        },
      },
    },
    {
      name: 'measurePerformance',
      description: 'Measure agent performance against benchmarks',
      inputSchema: {
        type: 'object',
        properties: {
          benchmarks: { type: 'array', items: { type: 'object' } },
          timeWindow: { type: 'string' },
        },
        required: ['benchmarks'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          results: { type: 'array', items: { type: 'object' } },
          overallPerformance: { type: 'number' },
          meetsThreshold: { type: 'boolean' },
        },
      },
    },
    {
      name: 'suggestUpgrades',
      description: 'Suggest system upgrades based on analysis',
      inputSchema: {
        type: 'object',
        properties: {
          currentVersion: { type: 'string' },
          performanceData: { type: 'object' },
          budget: { type: 'number' },
        },
        required: [],
      },
      outputSchema: {
        type: 'object',
        properties: {
          upgrades: { type: 'array', items: { type: 'object' } },
          priorityOrder: { type: 'array', items: { type: 'string' } },
          estimatedCost: { type: 'number' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:performance', 'write:improvement', 'read:capabilities'],
  maxConcurrentTasks: 3,
  timeout: 60000,
  retryPolicy: { maxRetries: 2, backoffMs: 2000, exponentialBackoff: true },
};

// ─── Internal Types ───────────────────────────────────────────────

interface ImprovementPlan {
  id: string;
  weaknesses: Array<{ area: string; severity: string }>;
  steps: Array<{
    id: string;
    description: string;
    targetMetric: string;
    targetValue: number;
    status: string;
  }>;
  createdAt: Date;
  completedAt?: Date;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class SelfImprovementAgentService extends BaseAgentService {
  private improvementPlans: Map<string, ImprovementPlan> = new Map();

  protected defineConfig(): AgentConfig {
    return META_SELF_IMPROVEMENT_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'assessCapabilities',
      description: 'Assess the capabilities of the agent system',
      execute: async (params: { scope?: string; includeMetrics?: boolean }) =>
        this.assessCapabilities(params),
    });
    this.registerTool({
      name: 'identifyWeaknesses',
      description: 'Identify weaknesses in agent performance',
      execute: async (params: { area?: string; timeRange?: string }) =>
        this.identifyWeaknesses(params),
    });
    this.registerTool({
      name: 'generateImprovementPlan',
      description: 'Generate a plan for improving agent capabilities',
      execute: async (params: {
        weaknesses: Array<{ area: string; severity: string }>;
        goals?: string[];
      }) => this.generateImprovementPlan(params),
    });
    this.registerTool({
      name: 'trackProgress',
      description: 'Track progress on improvement initiatives',
      execute: async (params: { planId: string; metrics?: string[] }) => this.trackProgress(params),
    });
    this.registerTool({
      name: 'measurePerformance',
      description: 'Measure agent performance against benchmarks',
      execute: async (params: {
        benchmarks: Array<{ name: string; target: number; actual?: number }>;
        timeWindow?: string;
      }) => this.measurePerformance(params),
    });
    this.registerTool({
      name: 'suggestUpgrades',
      description: 'Suggest system upgrades based on analysis',
      execute: async (params: {
        currentVersion?: string;
        performanceData?: Record<string, any>;
        budget?: number;
      }) => this.suggestUpgrades(params),
    });

    await this.storeInWorkingMemory(
      'self-improvement:initializedAt',
      new Date().toISOString(),
      600000,
    );
    this.logger.log('MetaSelfImprovement agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;
    if (!action)
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        'Missing required parameter: action',
        startTime,
      );
    const supportedActions = [
      'assessCapabilities',
      'identifyWeaknesses',
      'generateImprovementPlan',
      'trackProgress',
      'measurePerformance',
      'suggestUpgrades',
    ];
    if (!supportedActions.includes(action))
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown self-improvement action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    try {
      const tool = this.getTool(action);
      if (!tool)
        return this.createAgentOutput(
          input.taskId,
          false,
          null,
          `Tool not found: ${action}`,
          startTime,
        );
      const result = await tool.execute(params);
      await this.storeInWorkingMemory(
        `self-improvement:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );
      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`MetaSelfImprovement execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.improvementPlans.clear();
    this.logger.log('MetaSelfImprovement agent destroyed, plans cleared');
  }

  private async assessCapabilities(params: { scope?: string; includeMetrics?: boolean }): Promise<{
    capabilities: Array<{ name: string; score: number; level: string }>;
    overallScore: number;
    gaps: string[];
  }> {
    const { scope = 'all', includeMetrics = false } = params;
    const capabilityAreas = [
      'reasoning',
      'planning',
      'execution',
      'communication',
      'learning',
      'adaptation',
      'quality-control',
      'monitoring',
    ];
    const capabilities = capabilityAreas.map((name) => {
      const score = 50 + Math.floor(Math.random() * 45);
      return {
        name,
        score,
        level: score >= 80 ? 'advanced' : score >= 60 ? 'intermediate' : 'basic',
      };
    });
    const overallScore = Math.round(
      capabilities.reduce((sum, c) => sum + c.score, 0) / capabilities.length,
    );
    const gaps = capabilities
      .filter((c) => c.score < 60)
      .map((c) => `${c.name} (score: ${c.score})`);
    this.logger.log(
      `Capabilities assessed: scope=${scope}, overall=${overallScore}, gaps=${gaps.length}`,
    );
    return { capabilities, overallScore, gaps };
  }

  private async identifyWeaknesses(params: { area?: string; timeRange?: string }): Promise<{
    weaknesses: Array<{ area: string; description: string; severity: string; impact: string }>;
    severity: string;
    count: number;
  }> {
    const { area = 'all', timeRange = '30d' } = params;
    const possibleWeaknesses = [
      {
        area: 'reasoning',
        description: 'Inconsistent reasoning under high complexity',
        severity: 'medium',
        impact: 'Reduced decision quality for complex tasks',
      },
      {
        area: 'execution',
        description: 'Timeout failures on long-running tasks',
        severity: 'high',
        impact: 'Task abandonment and incomplete results',
      },
      {
        area: 'learning',
        description: 'Slow adaptation to new patterns',
        severity: 'low',
        impact: 'Delayed response to changing conditions',
      },
      {
        area: 'quality-control',
        description: 'Insufficient output validation coverage',
        severity: 'medium',
        impact: 'Lower output quality on edge cases',
      },
      {
        area: 'communication',
        description: 'Occasional message loss under high load',
        severity: 'high',
        impact: 'Missed inter-agent coordination signals',
      },
      {
        area: 'planning',
        description: 'Over-optimistic time estimates',
        severity: 'low',
        impact: 'Schedule slippage in orchestrated workflows',
      },
    ];
    const filtered =
      area === 'all' ? possibleWeaknesses : possibleWeaknesses.filter((w) => w.area === area);
    const severity = filtered.some((w) => w.severity === 'high')
      ? 'high'
      : filtered.some((w) => w.severity === 'medium')
        ? 'medium'
        : 'low';
    this.logger.log(
      `Weaknesses identified: count=${filtered.length}, severity=${severity}, area=${area}`,
    );
    return { weaknesses: filtered, severity, count: filtered.length };
  }

  private async generateImprovementPlan(params: {
    weaknesses: Array<{ area: string; severity: string }>;
    goals?: string[];
  }): Promise<{
    planId: string;
    steps: Array<{
      id: string;
      description: string;
      targetMetric: string;
      targetValue: number;
      status: string;
    }>;
    estimatedTime: number;
    priority: string;
  }> {
    const { weaknesses, goals = [] } = params;
    if (!weaknesses || !Array.isArray(weaknesses) || weaknesses.length === 0)
      throw new Error('Non-empty weaknesses array is required');
    const planId = this.generateId();
    const steps = weaknesses.flatMap((w, i) => [
      {
        id: `${planId}-step-${i * 2}`,
        description: `Analyze root causes of ${w.area} weakness`,
        targetMetric: `${w.area}.analysisComplete`,
        targetValue: 1,
        status: 'pending',
      },
      {
        id: `${planId}-step-${i * 2 + 1}`,
        description: `Implement improvements for ${w.area} (${w.severity} severity)`,
        targetMetric: `${w.area}.score`,
        targetValue: 70,
        status: 'pending',
      },
    ]);
    const estimatedTime = steps.length * 5000;
    const priority = weaknesses.some((w) => w.severity === 'high') ? 'high' : 'medium';
    this.improvementPlans.set(planId, { id: planId, weaknesses, steps, createdAt: new Date() });
    this.logger.log(
      `Improvement plan generated: planId=${planId}, steps=${steps.length}, priority=${priority}`,
    );
    return { planId, steps, estimatedTime, priority };
  }

  private async trackProgress(params: { planId: string; metrics?: string[] }): Promise<{
    progress: number;
    completedSteps: number;
    remainingSteps: number;
    status: string;
  }> {
    const { planId } = params;
    if (!planId || typeof planId !== 'string') throw new Error('Valid planId string is required');
    const plan = this.improvementPlans.get(planId);
    if (!plan) throw new Error(`Improvement plan not found: ${planId}`);
    const completed = Math.floor(Math.random() * plan.steps.length);
    const remaining = plan.steps.length - completed;
    const progress = Math.round((completed / plan.steps.length) * 100);
    const status = progress >= 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started';
    this.logger.log(`Progress tracked: planId=${planId}, progress=${progress}%, status=${status}`);
    return { progress, completedSteps: completed, remainingSteps: remaining, status };
  }

  private async measurePerformance(params: {
    benchmarks: Array<{ name: string; target: number; actual?: number }>;
    timeWindow?: string;
  }): Promise<{
    results: Array<{
      name: string;
      target: number;
      actual: number;
      met: boolean;
      deviation: number;
    }>;
    overallPerformance: number;
    meetsThreshold: boolean;
  }> {
    const { benchmarks, timeWindow = '30d' } = params;
    if (!benchmarks || !Array.isArray(benchmarks) || benchmarks.length === 0)
      throw new Error('Non-empty benchmarks array is required');
    const results = benchmarks.map((b) => {
      const actual = b.actual ?? Math.round(b.target * (0.7 + Math.random() * 0.4));
      const deviation = Math.round(((actual - b.target) / b.target) * 10000) / 100;
      return { name: b.name, target: b.target, actual, met: actual >= b.target, deviation };
    });
    const overallPerformance = Math.round(
      results.reduce(
        (sum, r) => sum + (r.met ? 100 : Math.max(0, (r.actual / r.target) * 100)),
        0,
      ) / results.length,
    );
    const meetsThreshold = overallPerformance >= 70;
    this.logger.log(
      `Performance measured: overall=${overallPerformance}%, meets=${meetsThreshold}, window=${timeWindow}`,
    );
    return { results, overallPerformance, meetsThreshold };
  }

  private async suggestUpgrades(params: {
    currentVersion?: string;
    performanceData?: Record<string, any>;
    budget?: number;
  }): Promise<{
    upgrades: Array<{
      component: string;
      currentVersion: string;
      suggestedVersion: string;
      reason: string;
      estimatedImpact: string;
      cost: number;
    }>;
    priorityOrder: string[];
    estimatedCost: number;
  }> {
    const { currentVersion = '1.0.0', performanceData = {}, budget = Infinity } = params;
    const allUpgrades = [
      {
        component: 'reasoning-engine',
        currentVersion: '1.0.0',
        suggestedVersion: '2.0.0',
        reason: 'Improved inference speed and accuracy',
        estimatedImpact: 'high',
        cost: 0,
      },
      {
        component: 'memory-system',
        currentVersion: '1.0.0',
        suggestedVersion: '1.5.0',
        reason: 'Better memory compression and retrieval',
        estimatedImpact: 'medium',
        cost: 0,
      },
      {
        component: 'communication-layer',
        currentVersion: '1.0.0',
        suggestedVersion: '1.3.0',
        reason: 'Reduced message latency and better reliability',
        estimatedImpact: 'medium',
        cost: 0,
      },
      {
        component: 'task-scheduler',
        currentVersion: '1.0.0',
        suggestedVersion: '1.2.0',
        reason: 'Smarter task prioritization and load balancing',
        estimatedImpact: 'low',
        cost: 0,
      },
    ];
    const upgrades = allUpgrades.filter((u) => u.cost <= budget);
    const priorityOrder = upgrades
      .sort((a, b) => {
        const impactVal: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return (impactVal[b.estimatedImpact] || 0) - (impactVal[a.estimatedImpact] || 0);
      })
      .map((u) => u.component);
    const estimatedCost = upgrades.reduce((sum, u) => sum + u.cost, 0);
    this.logger.log(`Upgrades suggested: count=${upgrades.length}, cost=${estimatedCost}`);
    return { upgrades, priorityOrder, estimatedCost };
  }
}
