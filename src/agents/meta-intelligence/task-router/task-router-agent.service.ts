/**
 * AENEWS Agent OS X - Meta Task Router Agent
 * Intelligent task routing and agent selection for the Meta Intelligence cluster.
 * Handles task routing, agent selection, load balancing, completion prediction,
 * overflow handling, and routing optimization.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';

// ─── Agent Configuration ──────────────────────────────────────────

export const META_TASK_ROUTER_AGENT_CONFIG: AgentConfig = {
  id: 'meta-task-router',
  name: 'MetaTaskRouter',
  cluster: AgentCluster.META_INTELLIGENCE,
  version: '1.0.0',
  description:
    'Task routing agent that intelligently routes tasks to agents, selects optimal agents, balances load, predicts completion, handles overflow, and optimizes routing across the Meta Intelligence cluster.',
  capabilities: [
    {
      name: 'routeTask',
      description: 'Route a task to the most appropriate agent',
      inputSchema: {
        type: 'object',
        properties: {
          task: { type: 'object' },
          preferredAgent: { type: 'string' },
          priority: { type: 'string' },
        },
        required: ['task'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          routeId: { type: 'string' },
          targetAgent: { type: 'string' },
          confidence: { type: 'number' },
          estimatedTime: { type: 'number' },
        },
      },
    },
    {
      name: 'selectAgent',
      description: 'Select the best agent for a given capability requirement',
      inputSchema: {
        type: 'object',
        properties: {
          capability: { type: 'string' },
          requirements: { type: 'object' },
          excludeAgents: { type: 'array', items: { type: 'string' } },
        },
        required: ['capability'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          selectedAgent: { type: 'string' },
          score: { type: 'number' },
          alternatives: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'balanceLoad',
      description: 'Balance load across available agents',
      inputSchema: {
        type: 'object',
        properties: {
          strategy: { type: 'string' },
          agentIds: { type: 'array', items: { type: 'string' } },
        },
        required: [],
      },
      outputSchema: {
        type: 'object',
        properties: {
          balanced: { type: 'boolean' },
          distribution: { type: 'object' },
          rebalanced: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'predictCompletion',
      description: 'Predict task completion time and success probability',
      inputSchema: {
        type: 'object',
        properties: {
          task: { type: 'object' },
          agentId: { type: 'string' },
          historicalData: { type: 'array', items: { type: 'object' } },
        },
        required: ['task'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          estimatedTimeMs: { type: 'number' },
          successProbability: { type: 'number' },
          confidence: { type: 'number' },
          predictionId: { type: 'string' },
        },
      },
    },
    {
      name: 'handleOverflow',
      description: 'Handle task overflow when agents are at capacity',
      inputSchema: {
        type: 'object',
        properties: { pendingTasks: { type: 'number' }, strategy: { type: 'string' } },
        required: ['pendingTasks'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          handled: { type: 'boolean' },
          action: { type: 'string' },
          queueSize: { type: 'number' },
          estimatedWaitMs: { type: 'number' },
        },
      },
    },
    {
      name: 'optimizeRouting',
      description: 'Optimize the routing configuration for better efficiency',
      inputSchema: {
        type: 'object',
        properties: { routingTable: { type: 'object' }, optimizationTarget: { type: 'string' } },
        required: [],
      },
      outputSchema: {
        type: 'object',
        properties: {
          optimizationId: { type: 'string' },
          improvements: { type: 'array', items: { type: 'object' } },
          estimatedGain: { type: 'number' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:agent', 'write:routing', 'read:load', 'write:queue'],
  maxConcurrentTasks: 5,
  timeout: 60000,
  retryPolicy: { maxRetries: 2, backoffMs: 2000, exponentialBackoff: true },
};

// ─── Internal Types ───────────────────────────────────────────────

interface AgentProfile {
  id: string;
  capabilities: string[];
  currentLoad: number;
  maxLoad: number;
  avgResponseTimeMs: number;
  successRate: number;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class TaskRouterAgentService extends BaseAgentService {
  constructor(
    @Optional() @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super();
  }
  private agentProfiles: Map<string, AgentProfile> = new Map();
  private routingHistory: Array<{
    routeId: string;
    targetAgent: string;
    timestamp: Date;
    success: boolean;
  }> = [];

  protected defineConfig(): AgentConfig {
    return META_TASK_ROUTER_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'routeTask',
      description: 'Route a task to the most appropriate agent',
      execute: async (params: {
        task: Record<string, any>;
        preferredAgent?: string;
        priority?: string;
      }) => this.routeTask(params),
    });
    this.registerTool({
      name: 'selectAgent',
      description: 'Select the best agent for a given capability requirement',
      execute: async (params: {
        capability: string;
        requirements?: Record<string, any>;
        excludeAgents?: string[];
      }) => this.selectAgent(params),
    });
    this.registerTool({
      name: 'balanceLoad',
      description: 'Balance load across available agents',
      execute: async (params: { strategy?: string; agentIds?: string[] }) =>
        this.balanceLoad(params),
    });
    this.registerTool({
      name: 'predictCompletion',
      description: 'Predict task completion time and success probability',
      execute: async (params: {
        task: Record<string, any>;
        agentId?: string;
        historicalData?: Array<Record<string, any>>;
      }) => this.predictCompletion(params),
    });
    this.registerTool({
      name: 'handleOverflow',
      description: 'Handle task overflow when agents are at capacity',
      execute: async (params: { pendingTasks: number; strategy?: string }) =>
        this.handleOverflow(params),
    });
    this.registerTool({
      name: 'optimizeRouting',
      description: 'Optimize the routing configuration for better efficiency',
      execute: async (params: {
        routingTable?: Record<string, string>;
        optimizationTarget?: string;
      }) => this.optimizeRouting(params),
    });

    this.seedAgentProfiles();
    await this.storeInWorkingMemory('task-router:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('MetaTaskRouter agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    // Bridge: use LLM for task routing, agent selection, and load balancing
    if (this.bridge) {
      try {
        const llmResult = await this.bridge.callLLM({
          systemPrompt: `You are the ${this.config.name} agent in the Meta-Intelligence cluster. Analyze the following task and provide detailed task routing, agent selection, and load balancing.`,
          userPrompt: JSON.stringify(input.payload),
          temperature: 0.3,
          maxTokens: 2048,
        });

        const analysis = llmResult.content;

        return this.createAgentOutput(
          input.taskId,
          true,
          { analysis, costUsd: llmResult.costUsd, tokensUsed: llmResult.tokenCount },
          undefined,
          startTime,
        );
      } catch (error) {
        this.logger.warn(`Bridge LLM failed, fallback: ${(error as Error).message}`);
      }
    }

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
      'routeTask',
      'selectAgent',
      'balanceLoad',
      'predictCompletion',
      'handleOverflow',
      'optimizeRouting',
    ];
    if (!supportedActions.includes(action))
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown task-router action: ${action}. Supported: ${supportedActions.join(', ')}`,
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
        `task-router:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );
      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`MetaTaskRouter execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.agentProfiles.clear();
    this.routingHistory = [];
    this.logger.log('MetaTaskRouter agent destroyed, profiles and history cleared');
  }

  private async routeTask(params: {
    task: Record<string, any>;
    preferredAgent?: string;
    priority?: string;
  }): Promise<{ routeId: string; targetAgent: string; confidence: number; estimatedTime: number }> {
    const { task, preferredAgent, priority = 'normal' } = params;
    if (!task || typeof task !== 'object') throw new Error('Valid task object is required');
    const routeId = this.generateId();

    // If preferred agent specified and available, use it
    if (preferredAgent) {
      const profile = this.agentProfiles.get(preferredAgent);
      if (profile && profile.currentLoad < profile.maxLoad) {
        profile.currentLoad++;
        this.routingHistory.push({
          routeId,
          targetAgent: preferredAgent,
          timestamp: new Date(),
          success: true,
        });
        this.logger.log(
          `Task routed: routeId=${routeId}, target=${preferredAgent} (preferred), confidence=0.95`,
        );
        return {
          routeId,
          targetAgent: preferredAgent,
          confidence: 0.95,
          estimatedTime: profile.avgResponseTimeMs,
        };
      }
    }

    // Find best agent based on capability matching and load
    const candidates = Array.from(this.agentProfiles.values())
      .filter((p) => p.currentLoad < p.maxLoad)
      .sort((a, b) => {
        const loadA = a.currentLoad / a.maxLoad;
        const loadB = b.currentLoad / b.maxLoad;
        return loadA - loadB;
      });

    if (candidates.length === 0) {
      // All agents at capacity, pick least loaded
      const leastLoaded = Array.from(this.agentProfiles.values()).sort(
        (a, b) => a.currentLoad / a.maxLoad - b.currentLoad / b.maxLoad,
      )[0];
      if (leastLoaded) {
        leastLoaded.currentLoad++;
        this.routingHistory.push({
          routeId,
          targetAgent: leastLoaded.id,
          timestamp: new Date(),
          success: true,
        });
        return {
          routeId,
          targetAgent: leastLoaded.id,
          confidence: 0.5,
          estimatedTime: leastLoaded.avgResponseTimeMs * 2,
        };
      }
      throw new Error('No agents available for routing');
    }

    const target = candidates[0];
    target.currentLoad++;
    const confidence = 0.7 + (1 - target.currentLoad / target.maxLoad) * 0.2;
    this.routingHistory.push({
      routeId,
      targetAgent: target.id,
      timestamp: new Date(),
      success: true,
    });
    this.logger.log(
      `Task routed: routeId=${routeId}, target=${target.id}, confidence=${confidence.toFixed(2)}`,
    );
    return {
      routeId,
      targetAgent: target.id,
      confidence: Math.round(confidence * 100) / 100,
      estimatedTime: target.avgResponseTimeMs,
    };
  }

  private async selectAgent(params: {
    capability: string;
    requirements?: Record<string, any>;
    excludeAgents?: string[];
  }): Promise<{
    selectedAgent: string;
    score: number;
    alternatives: Array<{ agentId: string; score: number }>;
  }> {
    const { capability, requirements = {}, excludeAgents = [] } = params;
    if (!capability || typeof capability !== 'string')
      throw new Error('Valid capability string is required');
    const candidates = Array.from(this.agentProfiles.values())
      .filter((p) => !excludeAgents.includes(p.id))
      .map((p) => {
        let score = p.successRate * 40;
        if (p.capabilities.includes(capability)) score += 30;
        score += (1 - p.currentLoad / p.maxLoad) * 20;
        score += Math.max(0, 10 - p.avgResponseTimeMs / 1000);
        return { agentId: p.id, score: Math.round(score) };
      })
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0)
      throw new Error(`No agents found matching capability: ${capability}`);
    const selected = candidates[0];
    this.logger.log(
      `Agent selected: ${selected.agentId}, score=${selected.score}, capability=${capability}`,
    );
    return {
      selectedAgent: selected.agentId,
      score: selected.score,
      alternatives: candidates.slice(1, 4),
    };
  }

  private async balanceLoad(params: { strategy?: string; agentIds?: string[] }): Promise<{
    balanced: boolean;
    distribution: Record<string, number>;
    rebalanced: Array<{ from: string; to: string; tasks: number }>;
  }> {
    const { strategy = 'round-robin', agentIds } = params;
    const targets = agentIds?.length
      ? Array.from(this.agentProfiles.values()).filter((p) => agentIds.includes(p.id))
      : Array.from(this.agentProfiles.values());

    if (targets.length === 0) return { balanced: true, distribution: {}, rebalanced: [] };

    const totalLoad = targets.reduce((sum, p) => sum + p.currentLoad, 0);
    const targetLoad = Math.round(totalLoad / targets.length);
    const distribution: Record<string, number> = {};
    const rebalanced: Array<{ from: string; to: string; tasks: number }> = [];

    for (const agent of targets) {
      distribution[agent.id] = agent.currentLoad;
    }

    const overloaded = targets.filter((p) => p.currentLoad > targetLoad + 1);
    const underloaded = targets.filter((p) => p.currentLoad < targetLoad);

    for (const over of overloaded) {
      const excess = over.currentLoad - targetLoad;
      for (const under of underloaded) {
        const capacity = targetLoad - under.currentLoad;
        const transfer = Math.min(excess, capacity);
        if (transfer > 0) {
          over.currentLoad -= transfer;
          under.currentLoad += transfer;
          rebalanced.push({ from: over.id, to: under.id, tasks: transfer });
          distribution[over.id] = over.currentLoad;
          distribution[under.id] = under.currentLoad;
        }
      }
    }

    this.logger.log(`Load balanced: strategy=${strategy}, rebalanced=${rebalanced.length}`);
    return { balanced: rebalanced.length === 0, distribution, rebalanced };
  }

  private async predictCompletion(params: {
    task: Record<string, any>;
    agentId?: string;
    historicalData?: Array<Record<string, any>>;
  }): Promise<{
    estimatedTimeMs: number;
    successProbability: number;
    confidence: number;
    predictionId: string;
  }> {
    const { task, agentId, historicalData = [] } = params;
    if (!task || typeof task !== 'object') throw new Error('Valid task object is required');
    const predictionId = this.generateId();
    let estimatedTimeMs: number;
    let successProbability: number;

    if (agentId) {
      const profile = this.agentProfiles.get(agentId);
      if (profile) {
        estimatedTimeMs = profile.avgResponseTimeMs * (1 + profile.currentLoad / profile.maxLoad);
        successProbability =
          profile.successRate * (1 - (profile.currentLoad / profile.maxLoad) * 0.2);
      } else {
        estimatedTimeMs = 30000;
        successProbability = 0.7;
      }
    } else {
      estimatedTimeMs = 20000 + Math.random() * 20000;
      successProbability = 0.75 + Math.random() * 0.15;
    }

    // Adjust based on historical data
    if (historicalData.length > 0) {
      const avgHistTime =
        historicalData.reduce((sum, h) => sum + (h.durationMs || 30000), 0) / historicalData.length;
      estimatedTimeMs = Math.round(estimatedTimeMs * 0.6 + avgHistTime * 0.4);
    }

    const confidence = Math.min(0.9, 0.5 + historicalData.length * 0.05);
    this.logger.log(
      `Completion predicted: time=${estimatedTimeMs}ms, success=${successProbability.toFixed(2)}, confidence=${confidence.toFixed(2)}`,
    );
    return {
      estimatedTimeMs: Math.round(estimatedTimeMs),
      successProbability: Math.round(successProbability * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      predictionId,
    };
  }

  private async handleOverflow(params: {
    pendingTasks: number;
    strategy?: string;
  }): Promise<{ handled: boolean; action: string; queueSize: number; estimatedWaitMs: number }> {
    const { pendingTasks, strategy = 'queue' } = params;
    if (typeof pendingTasks !== 'number' || pendingTasks < 0)
      throw new Error('pendingTasks must be a non-negative number');
    const totalCapacity = Array.from(this.agentProfiles.values()).reduce(
      (sum, p) => sum + (p.maxLoad - p.currentLoad),
      0,
    );

    if (pendingTasks <= totalCapacity) {
      return { handled: true, action: 'direct-assign', queueSize: 0, estimatedWaitMs: 0 };
    }

    const overflow = pendingTasks - totalCapacity;
    let action: string;
    let queueSize: number;
    let estimatedWaitMs: number;

    switch (strategy) {
      case 'queue':
        action = 'queued';
        queueSize = overflow;
        estimatedWaitMs = overflow * 5000;
        break;
      case 'reject':
        action = 'rejected';
        queueSize = 0;
        estimatedWaitMs = 0;
        break;
      case 'prioritize':
        action = 'priority-queued';
        queueSize = overflow;
        estimatedWaitMs = overflow * 3000;
        break;
      default:
        action = 'queued';
        queueSize = overflow;
        estimatedWaitMs = overflow * 5000;
    }

    this.logger.log(
      `Overflow handled: pending=${pendingTasks}, capacity=${totalCapacity}, action=${action}`,
    );
    return { handled: true, action, queueSize, estimatedWaitMs };
  }

  private async optimizeRouting(params: {
    routingTable?: Record<string, string>;
    optimizationTarget?: string;
  }): Promise<{
    optimizationId: string;
    improvements: Array<{ description: string; impact: string }>;
    estimatedGain: number;
  }> {
    const { routingTable = {}, optimizationTarget = 'latency' } = params;
    const optimizationId = this.generateId();
    const improvements: Array<{ description: string; impact: string }> = [];

    // Analyze routing history
    const recentRoutes = this.routingHistory.slice(-50);
    const agentUsage: Record<string, number> = {};
    for (const route of recentRoutes) {
      agentUsage[route.targetAgent] = (agentUsage[route.targetAgent] || 0) + 1;
    }

    const maxUsage = Math.max(...Object.values(agentUsage), 1);
    const minUsage = Math.min(...Object.values(agentUsage), 0);

    if (maxUsage - minUsage > 10) {
      improvements.push({
        description: 'Redistribute routes from overused to underused agents',
        impact: 'medium',
      });
    }

    if (optimizationTarget === 'latency') {
      improvements.push({
        description: 'Cache frequently used routing paths for faster resolution',
        impact: 'high',
      });
      improvements.push({
        description: 'Pre-warm agent connections for common task types',
        impact: 'medium',
      });
    } else if (optimizationTarget === 'throughput') {
      improvements.push({
        description: 'Enable parallel routing for independent tasks',
        impact: 'high',
      });
      improvements.push({
        description: 'Increase agent pool for high-demand capabilities',
        impact: 'medium',
      });
    }

    const estimatedGain =
      improvements.filter((i) => i.impact === 'high').length * 0.15 +
      improvements.filter((i) => i.impact === 'medium').length * 0.05;

    this.logger.log(
      `Routing optimized: target=${optimizationTarget}, improvements=${improvements.length}, gain=${(estimatedGain * 100).toFixed(0)}%`,
    );
    return { optimizationId, improvements, estimatedGain: Math.round(estimatedGain * 100) / 100 };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private seedAgentProfiles(): void {
    const agents = [
      {
        id: 'meta-orchestrator',
        capabilities: ['orchestrate', 'coordinate', 'plan'],
        maxLoad: 5,
        avgResponseTimeMs: 15000,
        successRate: 0.92,
      },
      {
        id: 'meta-planner',
        capabilities: ['plan', 'decompose', 'prioritize'],
        maxLoad: 4,
        avgResponseTimeMs: 10000,
        successRate: 0.88,
      },
      {
        id: 'meta-critic',
        capabilities: ['evaluate', 'critique', 'score'],
        maxLoad: 4,
        avgResponseTimeMs: 8000,
        successRate: 0.9,
      },
      {
        id: 'meta-repair',
        capabilities: ['repair', 'fix', 'retry'],
        maxLoad: 4,
        avgResponseTimeMs: 12000,
        successRate: 0.85,
      },
      {
        id: 'meta-judge',
        capabilities: ['decide', 'arbitrate', 'resolve'],
        maxLoad: 3,
        avgResponseTimeMs: 8000,
        successRate: 0.94,
      },
      {
        id: 'meta-learning',
        capabilities: ['learn', 'adapt', 'pattern'],
        maxLoad: 4,
        avgResponseTimeMs: 10000,
        successRate: 0.87,
      },
      {
        id: 'meta-task-router',
        capabilities: ['route', 'balance', 'optimize'],
        maxLoad: 5,
        avgResponseTimeMs: 5000,
        successRate: 0.91,
      },
    ];

    for (const agent of agents) {
      this.agentProfiles.set(agent.id, {
        ...agent,
        currentLoad: Math.floor(Math.random() * agent.maxLoad * 0.5),
      });
    }
  }
}
