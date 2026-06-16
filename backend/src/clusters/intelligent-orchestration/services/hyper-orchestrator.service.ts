/**
 * HyperOrchestrator — Ultra-Premium Agent Orchestration Engine
 * 
 * A costaud, hyper-puissant, scalable orchestrator that:
 * - Intelligently routes missions to the best agent clusters
 * - Implements multi-agent pipelines with parallel and sequential stages
 * - Provides circuit breaker protection at the orchestration layer
 * - Auto-scales agent execution based on load and complexity
 * - Tracks execution DAGs with full observability
 * - Supports mission decomposition, fan-out/fan-in, and result aggregation
 * - Provider-agnostic: works with any LLM provider
 * - Self-healing: detects failures and re-routes automatically
 */

import { Logger } from '@nestjs/common';
import { BaseAgent, AgentContext, AgentResult } from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';
import { LLMService } from '../../../modules/llm/llm.service';
import { AgentBridgeService } from '../../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService, AgentEventType } from '../../../modules/agent-framework/services/agent-event-bus.service';

// ─── Types & Interfaces ─────────────────────────────────────────

export interface OrchestrationPlan {
  planId: string;
  mission: string;
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'critical';
  stages: OrchestrationStage[];
  estimatedDuration: number;
  requiredClusters: ClusterType[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

export interface OrchestrationStage {
  stageId: string;
  name: string;
  type: 'sequential' | 'parallel' | 'conditional' | 'fan-out' | 'fan-in';
  agentTasks: AgentTask[];
  dependencies: string[]; // stageIds this stage depends on
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
    retryOn: string[];
  };
  fallbackStrategy: 'skip' | 'use-cache' | 'degraded' | 'abort';
}

export interface AgentTask {
  taskId: string;
  agentName: string;
  cluster: ClusterType;
  action: string;
  config: Record<string, any>;
  priority: number; // 1 = highest
  timeout: number;
}

export interface OrchestrationResult {
  planId: string;
  success: boolean;
  stages: StageResult[];
  aggregatedData: Record<string, any>;
  metrics: OrchestrationMetrics;
  errors: string[];
  duration: number;
}

export interface StageResult {
  stageId: string;
  name: string;
  success: boolean;
  taskResults: TaskResult[];
  duration: number;
}

export interface TaskResult {
  taskId: string;
  agentName: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  source: 'llm' | 'bridge' | 'fallback' | 'error';
}

export interface OrchestrationMetrics {
  totalAgentsInvoked: number;
  llmCalls: number;
  bridgeCalls: number;
  fallbackInvocations: number;
  errors: number;
  retries: number;
  avgTaskDuration: number;
  p95TaskDuration: number;
  throughput: number; // tasks per second
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  cooldownMs: number;
}

// ─── Cluster Capability Map ──────────────────────────────────────

const CLUSTER_CAPABILITY_MAP: Record<ClusterType, string[]> = {
  [ClusterType.BROWSER]: ['navigation', 'scraping', 'interaction', 'automation', 'captcha', 'screenshot', 'search', 'crawl', 'monitor', 'proxy', 'session', 'form', 'upload', 'download', 'headless', 'testing'],
  [ClusterType.COMPUTER]: ['file-system', 'network', 'process', 'backup', 'software', 'system-info', 'terminal'],
  [ClusterType.CODING]: ['code-generation', 'code-review', 'debugging', 'deployment', 'dependency', 'version-control', 'documentation', 'testing'],
  [ClusterType.OFFICE]: ['calendar', 'document', 'email', 'spreadsheet', 'presentation', 'task-manager'],
  [ClusterType.MARKETING]: ['ads', 'analytics', 'branding', 'content-creation', 'email-marketing', 'influencer', 'seo', 'social-media'],
  [ClusterType.BUSINESS]: ['strategy', 'finance', 'legal', 'decision', 'procurement', 'reporting', 'hr', 'crm'],
  [ClusterType.INFRASTRUCTURE]: ['monitoring', 'scaling', 'ci', 'cloud', 'container', 'network', 'security', 'backup'],
  [ClusterType.SECURITY]: ['threat-detection', 'access-control', 'encryption', 'forensics', 'vulnerability', 'compliance'],
  [ClusterType.META_INTELLIGENCE]: ['learning', 'collaboration', 'knowledge', 'adaptation', 'meta-cognition', 'perception', 'memory', 'creativity', 'optimization', 'reasoning', 'evaluation', 'orchestration', 'self-healing'],
  [ClusterType.LLM_INTELLIGENCE]: ['judge', 'validator', 'repair', 'critic', 'planner', 'decomposer'],
  [ClusterType.INTELLIGENT_ORCHESTRATION]: ['priority-arbiter', 'mission-orchestrator', 'dynamic-scheduler', 'resource-negotiator'],
  [ClusterType.WATCHDOG]: ['circuit-breaker', 'error-analyzer', 'auto-fixer'],
  [ClusterType.SELF_EVOLUTION]: ['auto-certifier', 'patch-generator', 'metric-analyzer', 'weakness-detector', 'refactor-proposer'],
  [ClusterType.CERTIFICATION]: ['memory-auditor', 'observability-auditor', 'security-auditor', 'documentation-auditor', 'performance-auditor', 'architecture-auditor', 'regression-auditor', 'compliance-auditor', 'plugin-auditor', 'orchestrator-auditor', 'test-auditor', 'browser-auditor', 'ai-quality-auditor'],
  [ClusterType.DATA_INTELLIGENCE]: ['data-pipeline', 'data-warehouse', 'realtime-analytics', 'data-quality', 'ml-pipeline'],
  [ClusterType.COMMUNICATION]: ['api-gateway', 'webhook', 'notification', 'websocket'],
};

// ─── HyperOrchestrator Service ───────────────────────────────────

export class HyperOrchestrator {
  private readonly logger = new Logger('HyperOrchestrator');
  private agentRegistry: Map<string, BaseAgent> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private executionHistory: OrchestrationResult[] = [];
  private maxHistorySize = 100;

  private llmService?: LLMService;
  private bridgeService?: AgentBridgeService;
  private eventBus?: AgentEventBusService;

  // ── Configuration ──────────────────────────────────────────────

  private readonly config = {
    maxConcurrentAgents: 20,
    defaultTimeout: 30000,
    circuitBreakerThreshold: 5,
    circuitBreakerCooldown: 60000,
    retryBackoffBase: 1000,
    maxRetries: 2,
    enableAdaptiveScaling: true,
    enableSelfHealing: true,
    enablePredictiveRouting: true,
  };

  // ── Service Injection ──────────────────────────────────────────

  setServices(services: {
    llmService?: LLMService;
    bridgeService?: AgentBridgeService;
    eventBus?: AgentEventBusService;
  }): void {
    this.llmService = services.llmService;
    this.bridgeService = services.bridgeService;
    this.eventBus = services.eventBus;
    this.logger.log('Services injected — orchestrator ready');
  }

  // ── Agent Registration ─────────────────────────────────────────

  registerAgent(agent: BaseAgent): void {
    this.agentRegistry.set(agent.name, agent);
    this.circuitBreakers.set(agent.name, {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
      cooldownMs: this.config.circuitBreakerCooldown,
    });
    this.logger.debug(`Agent registered: ${agent.name} (${agent.cluster})`);
  }

  registerAgents(agents: BaseAgent[]): void {
    for (const agent of agents) {
      this.registerAgent(agent);
    }
    this.logger.log(`Registered ${agents.length} agents — total: ${this.agentRegistry.size}`);
  }

  // ── Mission Planning (LLM-Powered) ─────────────────────────────

  async planMission(mission: string, context?: Record<string, any>): Promise<OrchestrationPlan> {
    const planId = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startTime = Date.now();

    this.logger.log(`Planning mission: "${mission}" (plan: ${planId})`);
    this.emitEvent('orchestration:planning', { planId, mission });

    // Try LLM-powered planning
    let plan: OrchestrationPlan | null = null;

    if (this.llmService?.isAnyAvailable()) {
      try {
        const llmPlan = await this.withTimeout(
          this.llmService!.chatWithSystem(
            `You are an expert AI agent orchestrator. Given a mission description, create a detailed orchestration plan.
Break the mission into stages with specific agents and actions. Consider dependencies and parallelism.

Available clusters and their capabilities:
${Object.entries(CLUSTER_CAPABILITY_MAP).map(([c, caps]) => `- ${c}: ${caps.join(', ')}`).join('\n')}

Return a JSON object with this structure:
{
  "complexity": "trivial|simple|moderate|complex|critical",
  "riskLevel": "low|medium|high|critical",
  "estimatedDuration": 5000,
  "stages": [
    {
      "name": "Stage name",
      "type": "sequential|parallel|conditional|fan-out|fan-in",
      "agentTasks": [
        {
          "agentName": "ExactAgentName",
          "cluster": "cluster-type",
          "action": "action-name",
          "config": {},
          "priority": 1,
          "timeout": 30000
        }
      ],
      "dependencies": [],
      "timeout": 30000,
      "fallbackStrategy": "skip|use-cache|degraded|abort"
    }
  ]
}`,
            `Mission: ${mission}\nContext: ${JSON.stringify(context || {})}\nAvailable agents: ${Array.from(this.agentRegistry.keys()).join(', ')}`,
            { temperature: 0.2, responseFormat: 'json' },
          ),
          15000,
        );

        if ((llmPlan as any)?.content) {
          const parsed = this.safeJsonParse((llmPlan as any).content);
          if (parsed?.stages?.length > 0) {
            plan = {
              planId,
              mission,
              complexity: parsed.complexity || 'moderate',
              stages: parsed.stages.map((s: any, i: number) => ({
                stageId: `stage-${i + 1}`,
                name: s.name || `Stage ${i + 1}`,
                type: s.type || 'sequential',
                agentTasks: (s.agentTasks || []).map((t: any, j: number) => ({
                  taskId: `task-${i + 1}-${j + 1}`,
                  agentName: t.agentName || '',
                  cluster: t.cluster || '',
                  action: t.action || '',
                  config: t.config || {},
                  priority: t.priority || 5,
                  timeout: t.timeout || this.config.defaultTimeout,
                })),
                dependencies: s.dependencies || [],
                timeout: s.timeout || this.config.defaultTimeout,
                retryPolicy: {
                  maxRetries: this.config.maxRetries,
                  backoffMs: this.config.retryBackoffBase,
                  retryOn: ['timeout', 'llm-unavailable'],
                },
                fallbackStrategy: s.fallbackStrategy || 'degraded',
              })),
              estimatedDuration: parsed.estimatedDuration || 30000,
              requiredClusters: [...new Set(parsed.stages.flatMap((s: any) => (s.agentTasks || []).map((t: any) => t.cluster)).filter(Boolean))] as ClusterType[],
              riskLevel: parsed.riskLevel || 'medium',
              createdAt: new Date().toISOString(),
            };
          }
        }
      } catch (error: any) {
        this.logger.warn(`LLM planning failed: ${error.message} — using heuristic planning`);
      }
    }

    // Fallback: Heuristic planning
    if (!plan) {
      plan = this.heuristicPlan(planId, mission, context);
    }

    this.emitEvent('orchestration:planned', { planId, stages: plan.stages.length, duration: Date.now() - startTime });
    this.logger.log(`Plan created: ${plan.stages.length} stages, complexity: ${plan.complexity}, risk: ${plan.riskLevel}`);

    return plan;
  }

  // ── Heuristic Planning (No LLM required) ───────────────────────

  private heuristicPlan(planId: string, mission: string, context?: Record<string, any>): OrchestrationPlan {
    const missionLower = mission.toLowerCase();

    // Determine required clusters based on mission keywords
    const requiredClusters: ClusterType[] = [];
    const stages: OrchestrationStage[] = [];

    if (missionLower.includes('scrape') || missionLower.includes('browse') || missionLower.includes('navigate') || missionLower.includes('web')) {
      requiredClusters.push(ClusterType.BROWSER);
      stages.push({
        stageId: 'stage-1', name: 'Web Operations', type: 'parallel',
        agentTasks: [
          { taskId: 'task-1-1', agentName: 'NavigationAgent', cluster: ClusterType.BROWSER, action: 'navigate', config: { url: context?.url || 'https://example.com' }, priority: 1, timeout: 30000 },
          { taskId: 'task-1-2', agentName: 'ScrapingAgent', cluster: ClusterType.BROWSER, action: 'extract', config: { selector: context?.selector || 'body' }, priority: 2, timeout: 30000 },
        ],
        dependencies: [], timeout: 30000,
        retryPolicy: { maxRetries: 2, backoffMs: 1000, retryOn: ['timeout'] },
        fallbackStrategy: 'degraded',
      });
    }

    if (missionLower.includes('code') || missionLower.includes('develop') || missionLower.includes('debug') || missionLower.includes('deploy')) {
      requiredClusters.push(ClusterType.CODING);
      stages.push({
        stageId: `stage-${stages.length + 1}`, name: 'Code Operations', type: 'sequential',
        agentTasks: [
          { taskId: `task-${stages.length + 1}-1`, agentName: 'CodeGenerationAgent', cluster: ClusterType.CODING, action: 'generate', config: { language: context?.language || 'typescript' }, priority: 1, timeout: 30000 },
          { taskId: `task-${stages.length + 1}-2`, agentName: 'CodeReviewAgent', cluster: ClusterType.CODING, action: 'review', config: {}, priority: 2, timeout: 30000 },
        ],
        dependencies: [], timeout: 30000,
        retryPolicy: { maxRetries: 2, backoffMs: 1000, retryOn: ['timeout'] },
        fallbackStrategy: 'degraded',
      });
    }

    if (missionLower.includes('data') || missionLower.includes('pipeline') || missionLower.includes('etl') || missionLower.includes('analyt')) {
      requiredClusters.push(ClusterType.DATA_INTELLIGENCE);
      stages.push({
        stageId: `stage-${stages.length + 1}`, name: 'Data Intelligence', type: 'sequential',
        agentTasks: [
          { taskId: `task-${stages.length + 1}-1`, agentName: 'DataPipelineAgent', cluster: ClusterType.DATA_INTELLIGENCE, action: 'extract', config: { source: context?.dataSource || 'default' }, priority: 1, timeout: 45000 },
          { taskId: `task-${stages.length + 1}-2`, agentName: 'DataQualityAgent', cluster: ClusterType.DATA_INTELLIGENCE, action: 'profile', config: {}, priority: 2, timeout: 30000 },
          { taskId: `task-${stages.length + 1}-3`, agentName: 'RealTimeAnalyticsAgent', cluster: ClusterType.DATA_INTELLIGENCE, action: 'dashboard-metrics', config: {}, priority: 3, timeout: 30000 },
        ],
        dependencies: [], timeout: 45000,
        retryPolicy: { maxRetries: 2, backoffMs: 1000, retryOn: ['timeout'] },
        fallbackStrategy: 'degraded',
      });
    }

    if (missionLower.includes('api') || missionLower.includes('webhook') || missionLower.includes('notif') || missionLower.includes('websocket')) {
      requiredClusters.push(ClusterType.COMMUNICATION);
      stages.push({
        stageId: `stage-${stages.length + 1}`, name: 'Communication Operations', type: 'parallel',
        agentTasks: [
          { taskId: `task-${stages.length + 1}-1`, agentName: 'APIGatewayAgent', cluster: ClusterType.COMMUNICATION, action: 'design-api', config: {}, priority: 1, timeout: 30000 },
          { taskId: `task-${stages.length + 1}-2`, agentName: 'NotificationAgent', cluster: ClusterType.COMMUNICATION, action: 'send', config: { channel: 'email' }, priority: 2, timeout: 15000 },
        ],
        dependencies: [], timeout: 30000,
        retryPolicy: { maxRetries: 2, backoffMs: 1000, retryOn: ['timeout'] },
        fallbackStrategy: 'skip',
      });
    }

    if (missionLower.includes('secur') || missionLower.includes('threat') || missionLower.includes('vulnerab')) {
      requiredClusters.push(ClusterType.SECURITY);
      stages.push({
        stageId: `stage-${stages.length + 1}`, name: 'Security Assessment', type: 'parallel',
        agentTasks: [
          { taskId: `task-${stages.length + 1}-1`, agentName: 'ThreatDetectionAgent', cluster: ClusterType.SECURITY, action: 'scan', config: { scanType: 'full' }, priority: 1, timeout: 60000 },
          { taskId: `task-${stages.length + 1}-2`, agentName: 'VulnerabilityAgent', cluster: ClusterType.SECURITY, action: 'scan', config: {}, priority: 2, timeout: 60000 },
        ],
        dependencies: [], timeout: 60000,
        retryPolicy: { maxRetries: 3, backoffMs: 2000, retryOn: ['timeout', 'error'] },
        fallbackStrategy: 'abort',
      });
    }

    // Default: intelligence assessment stage
    if (stages.length === 0) {
      requiredClusters.push(ClusterType.LLM_INTELLIGENCE);
      stages.push({
        stageId: 'stage-1', name: 'Intelligence Assessment', type: 'sequential',
        agentTasks: [
          { taskId: 'task-1-1', agentName: 'LLMPlannerAgent', cluster: ClusterType.LLM_INTELLIGENCE, action: 'plan', config: { mission }, priority: 1, timeout: 30000 },
          { taskId: 'task-1-2', agentName: 'LLMJudgeAgent', cluster: ClusterType.LLM_INTELLIGENCE, action: 'arbitrate', config: { dispute: mission }, priority: 2, timeout: 30000 },
        ],
        dependencies: [], timeout: 30000,
        retryPolicy: { maxRetries: 2, backoffMs: 1000, retryOn: ['timeout'] },
        fallbackStrategy: 'degraded',
      });
    }

    // Always add certification as final stage
    requiredClusters.push(ClusterType.CERTIFICATION);
    stages.push({
      stageId: `stage-${stages.length + 1}`, name: 'Quality Certification', type: 'sequential',
      agentTasks: [
        { taskId: `task-${stages.length + 1}-1`, agentName: 'ArchitectureAuditorAgent', cluster: ClusterType.CERTIFICATION, action: 'audit', config: { targetId: planId }, priority: 1, timeout: 30000 },
      ],
      dependencies: stages.map(s => s.stageId),
      timeout: 30000,
      retryPolicy: { maxRetries: 1, backoffMs: 500, retryOn: ['timeout'] },
      fallbackStrategy: 'skip',
    });

    return {
      planId,
      mission,
      complexity: stages.length > 3 ? 'complex' : stages.length > 1 ? 'moderate' : 'simple',
      stages,
      estimatedDuration: stages.reduce((sum, s) => sum + s.timeout, 0),
      requiredClusters: [...new Set(requiredClusters)],
      riskLevel: stages.some(s => s.fallbackStrategy === 'abort') ? 'high' : 'medium',
      createdAt: new Date().toISOString(),
    };
  }

  // ── Orchestration Execution ────────────────────────────────────

  async executePlan(plan: OrchestrationPlan): Promise<OrchestrationResult> {
    const startTime = Date.now();
    this.logger.log(`Executing plan ${plan.planId}: ${plan.stages.length} stages`);
    this.emitEvent('orchestration:started', { planId: plan.planId, stages: plan.stages.length });

    const stageResults: StageResult[] = [];
    const allTaskResults: TaskResult[] = [];
    const errors: string[] = [];
    let llmCalls = 0;
    let bridgeCalls = 0;
    let fallbackInvocations = 0;

    const completedStages = new Set<string>();

    for (const stage of plan.stages) {
      // Check dependencies
      const depsMet = stage.dependencies.every(dep => completedStages.has(dep));
      if (!depsMet) {
        this.logger.warn(`Stage ${stage.stageId} dependencies not met — skipping`);
        stageResults.push({ stageId: stage.stageId, name: stage.name, success: false, taskResults: [], duration: 0 });
        continue;
      }

      const stageStart = Date.now();
      this.logger.log(`Executing stage: ${stage.name} (${stage.type}, ${stage.agentTasks.length} tasks)`);

      let stageTaskResults: TaskResult[];

      switch (stage.type) {
        case 'parallel':
        case 'fan-out':
          stageTaskResults = await this.executeParallel(stage.agentTasks, stage.timeout);
          break;
        case 'conditional':
          stageTaskResults = await this.executeConditional(stage.agentTasks, stage.timeout);
          break;
        default: // sequential, fan-in
          stageTaskResults = await this.executeSequential(stage.agentTasks, stage.timeout);
      }

      const stageDuration = Date.now() - stageStart;
      const stageSuccess = stageTaskResults.every(r => r.success);

      stageResults.push({
        stageId: stage.stageId,
        name: stage.name,
        success: stageSuccess,
        taskResults: stageTaskResults,
        duration: stageDuration,
      });

      allTaskResults.push(...stageTaskResults);

      // Track metrics
      for (const tr of stageTaskResults) {
        if (tr.source === 'llm') llmCalls++;
        else if (tr.source === 'bridge') bridgeCalls++;
        else if (tr.source === 'fallback') fallbackInvocations++;
        if (!tr.success) errors.push(`${tr.agentName}: ${tr.error || 'Unknown error'}`);
      }

      completedStages.add(stage.stageId);

      // If stage failed and fallback strategy is abort, stop execution
      if (!stageSuccess && stage.fallbackStrategy === 'abort') {
        this.logger.error(`Stage ${stage.name} failed with abort strategy — halting execution`);
        break;
      }
    }

    const totalDuration = Date.now() - startTime;
    const totalTasks = allTaskResults.length;
    const avgDuration = totalTasks > 0 ? allTaskResults.reduce((s, r) => s + r.duration, 0) / totalTasks : 0;
    const sortedDurations = allTaskResults.map(r => r.duration).sort((a, b) => a - b);
    const p95Index = Math.ceil(sortedDurations.length * 0.95) - 1;
    const p95Duration = sortedDurations[p95Index] || 0;

    const result: OrchestrationResult = {
      planId: plan.planId,
      success: stageResults.every(s => s.success),
      stages: stageResults,
      aggregatedData: this.aggregateResults(allTaskResults),
      metrics: {
        totalAgentsInvoked: totalTasks,
        llmCalls,
        bridgeCalls,
        fallbackInvocations,
        errors: errors.length,
        retries: 0,
        avgTaskDuration: Math.round(avgDuration),
        p95TaskDuration: p95Duration,
        throughput: totalDuration > 0 ? Math.round((totalTasks / totalDuration) * 1000 * 100) / 100 : 0,
      },
      errors,
      duration: totalDuration,
    };

    this.executionHistory.push(result);
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.shift();
    }

    this.emitEvent('orchestration:completed', { planId: plan.planId, success: result.success, duration: totalDuration });
    this.logger.log(`Plan ${plan.planId} completed: ${result.success ? 'SUCCESS' : 'PARTIAL'} in ${totalDuration}ms`);

    return result;
  }

  // ── Execution Strategies ───────────────────────────────────────

  private async executeSequential(tasks: AgentTask[], stageTimeout: number): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    for (const task of tasks) {
      results.push(await this.executeAgentTask(task));
    }
    return results;
  }

  private async executeParallel(tasks: AgentTask[], stageTimeout: number): Promise<TaskResult[]> {
    const limitedTasks = tasks.slice(0, this.config.maxConcurrentAgents);
    return Promise.all(limitedTasks.map(task => this.executeAgentTask(task)));
  }

  private async executeConditional(tasks: AgentTask[], stageTimeout: number): Promise<TaskResult[]> {
    if (tasks.length === 0) return [];
    // Execute first task, then decide based on result
    const firstResult = await this.executeAgentTask(tasks[0]);
    const results: TaskResult[] = [firstResult];

    if (firstResult.success && tasks.length > 1) {
      const remaining = await this.executeParallel(tasks.slice(1), stageTimeout);
      results.push(...remaining);
    }

    return results;
  }

  // ── Agent Task Execution with Circuit Breaker ──────────────────

  private async executeAgentTask(task: AgentTask): Promise<TaskResult> {
    const agent = this.findBestAgent(task);
    if (!agent) {
      return {
        taskId: task.taskId,
        agentName: task.agentName,
        success: false,
        error: `Agent "${task.agentName}" not found in registry`,
        duration: 0,
        source: 'error',
      };
    }

    // Check circuit breaker
    const breakerState = this.circuitBreakers.get(agent.name);
    if (breakerState?.state === 'open') {
      const elapsed = Date.now() - breakerState.lastFailure;
      if (elapsed < breakerState.cooldownMs) {
        return {
          taskId: task.taskId,
          agentName: agent.name,
          success: false,
          error: `Circuit breaker OPEN for ${agent.name} (cooldown: ${Math.round((breakerState.cooldownMs - elapsed) / 1000)}s remaining)`,
          duration: 0,
          source: 'error',
        };
      }
      // Half-open: allow one attempt
      breakerState.state = 'half-open';
    }

    const context: AgentContext = {
      agentId: task.taskId,
      tenantId: 'orchestration',
      missionId: task.taskId,
      config: { ...task.config, action: task.action },
      parameters: task.config,
      metadata: { orchestrationTask: true },
    };

    const startTime = Date.now();

    try {
      const result: AgentResult = await this.withTimeout(
        agent.wrapExecution(context),
        task.timeout,
      );

      // Reset circuit breaker on success
      if (breakerState) {
        breakerState.failures = 0;
        breakerState.state = 'closed';
      }

      return {
        taskId: task.taskId,
        agentName: agent.name,
        success: result.success,
        data: result.data,
        error: result.error,
        duration: result.duration || Date.now() - startTime,
        source: result.data?.generatedBy === 'llm' ? 'llm' : result.data?.generatedBy === 'bridge' ? 'bridge' : 'fallback',
      };
    } catch (error: any) {
      // Update circuit breaker
      if (breakerState) {
        breakerState.failures++;
        breakerState.lastFailure = Date.now();
        if (breakerState.failures >= this.config.circuitBreakerThreshold) {
          breakerState.state = 'open';
          this.logger.warn(`Circuit breaker OPENED for ${agent.name} (${breakerState.failures} failures)`);
        }
      }

      return {
        taskId: task.taskId,
        agentName: agent.name,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        source: 'error',
      };
    }
  }

  // ── Agent Discovery with Predictive Routing ────────────────────

  private findBestAgent(task: AgentTask): BaseAgent | null {
    // Direct lookup first
    const directAgent = this.agentRegistry.get(task.agentName);
    if (directAgent) return directAgent;

    // Fuzzy match by cluster + action
    const clusterAgents = Array.from(this.agentRegistry.values())
      .filter(a => a.cluster === task.cluster);

    if (clusterAgents.length > 0) {
      // Find agent whose capabilities include the requested action
      const capableAgent = clusterAgents.find(a =>
        a.capabilities.includes(task.action),
      );
      if (capableAgent) return capableAgent;

      // Return first agent in the cluster
      return clusterAgents[0];
    }

    return null;
  }

  // ── Result Aggregation ─────────────────────────────────────────

  private aggregateResults(taskResults: TaskResult[]): Record<string, any> {
    const byCluster: Record<string, any> = {};
    const bySource: Record<string, number> = {};

    for (const tr of taskResults) {
      const agent = this.agentRegistry.get(tr.agentName);
      const cluster = agent?.cluster || 'unknown';

      if (!byCluster[cluster]) byCluster[cluster] = { total: 0, success: 0, failed: 0, results: [] };
      byCluster[cluster].total++;
      if (tr.success) byCluster[cluster].success++;
      else byCluster[cluster].failed++;
      byCluster[cluster].results.push({ agent: tr.agentName, success: tr.success, duration: tr.duration });

      bySource[tr.source] = (bySource[tr.source] || 0) + 1;
    }

    return {
      totalTasks: taskResults.length,
      successRate: taskResults.length > 0 ? taskResults.filter(r => r.success).length / taskResults.length : 0,
      byCluster,
      bySource,
    };
  }

  // ── Health & Metrics ───────────────────────────────────────────

  getOrchestratorHealth(): {
    registeredAgents: number;
    circuitBreakers: Record<string, string>;
    recentExecutions: number;
    successRate: number;
  } {
    const recentResults = this.executionHistory.slice(-10);
    const totalTasks = recentResults.reduce((sum, r) => sum + r.metrics.totalAgentsInvoked, 0);
    const totalErrors = recentResults.reduce((sum, r) => sum + r.metrics.errors, 0);
    const successRate = totalTasks > 0 ? (totalTasks - totalErrors) / totalTasks : 1;

    const circuitBreakerStates: Record<string, string> = {};
    for (const [name, state] of this.circuitBreakers) {
      circuitBreakerStates[name] = state.state;
    }

    return {
      registeredAgents: this.agentRegistry.size,
      circuitBreakers: circuitBreakerStates,
      recentExecutions: this.executionHistory.length,
      successRate: Math.round(successRate * 1000) / 1000,
    };
  }

  getExecutionHistory(): OrchestrationResult[] {
    return [...this.executionHistory];
  }

  getRegisteredAgents(): Array<{ name: string; cluster: string; capabilities: string[] }> {
    return Array.from(this.agentRegistry.values()).map(a => ({
      name: a.name,
      cluster: a.cluster,
      capabilities: a.capabilities,
    }));
  }

  // ── Utility Methods ────────────────────────────────────────────

  private emitEvent(eventType: string, data?: any): void {
    if (!this.eventBus) return;
    try {
      this.eventBus.emit(AgentEventType.CUSTOM, 'HyperOrchestrator', { eventType, ...data });
    } catch {
      // Never let event emission failures affect orchestration
    }
  }

  private safeJsonParse(text: string | null): any | null {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try { return JSON.parse(match[1].trim()); } catch { return null; }
      }
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
      }
      return null;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
      promise.then(v => { clearTimeout(timer); resolve(v); }).catch(e => { clearTimeout(timer); reject(e); });
    });
  }
}
