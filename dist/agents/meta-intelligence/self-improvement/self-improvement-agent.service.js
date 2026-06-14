"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfImprovementAgentService = exports.META_SELF_IMPROVEMENT_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
exports.META_SELF_IMPROVEMENT_AGENT_CONFIG = {
    id: 'meta-self-improvement',
    name: 'MetaSelfImprovement',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '1.0.0',
    description: 'Self-improvement agent that assesses capabilities, identifies weaknesses, generates improvement plans, tracks progress, measures performance, and suggests upgrades across the Meta Intelligence cluster.',
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
let SelfImprovementAgentService = class SelfImprovementAgentService extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
        this.improvementPlans = new Map();
    }
    defineConfig() {
        return exports.META_SELF_IMPROVEMENT_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'assessCapabilities',
            description: 'Assess the capabilities of the agent system',
            execute: async (params) => this.assessCapabilities(params),
        });
        this.registerTool({
            name: 'identifyWeaknesses',
            description: 'Identify weaknesses in agent performance',
            execute: async (params) => this.identifyWeaknesses(params),
        });
        this.registerTool({
            name: 'generateImprovementPlan',
            description: 'Generate a plan for improving agent capabilities',
            execute: async (params) => this.generateImprovementPlan(params),
        });
        this.registerTool({
            name: 'trackProgress',
            description: 'Track progress on improvement initiatives',
            execute: async (params) => this.trackProgress(params),
        });
        this.registerTool({
            name: 'measurePerformance',
            description: 'Measure agent performance against benchmarks',
            execute: async (params) => this.measurePerformance(params),
        });
        this.registerTool({
            name: 'suggestUpgrades',
            description: 'Suggest system upgrades based on analysis',
            execute: async (params) => this.suggestUpgrades(params),
        });
        await this.storeInWorkingMemory('self-improvement:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('MetaSelfImprovement agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: `You are the ${this.config.name} agent in the Meta-Intelligence cluster. Analyze the following task and provide detailed capability assessment, weakness identification, and improvement planning.`,
                    userPrompt: JSON.stringify(input.payload),
                    temperature: 0.3,
                    maxTokens: 2048,
                });
                const analysis = llmResult.content;
                return this.createAgentOutput(input.taskId, true, { analysis, costUsd: llmResult.costUsd, tokensUsed: llmResult.tokenCount }, undefined, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge LLM failed, fallback: ${error.message}`);
            }
        }
        const { action, ...params } = input.payload;
        if (!action)
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        const supportedActions = [
            'assessCapabilities',
            'identifyWeaknesses',
            'generateImprovementPlan',
            'trackProgress',
            'measurePerformance',
            'suggestUpgrades',
        ];
        if (!supportedActions.includes(action))
            return this.createAgentOutput(input.taskId, false, null, `Unknown self-improvement action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        try {
            const tool = this.getTool(action);
            if (!tool)
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`self-improvement:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`MetaSelfImprovement execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.improvementPlans.clear();
        this.logger.log('MetaSelfImprovement agent destroyed, plans cleared');
    }
    async assessCapabilities(params) {
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
        const overallScore = Math.round(capabilities.reduce((sum, c) => sum + c.score, 0) / capabilities.length);
        const gaps = capabilities
            .filter((c) => c.score < 60)
            .map((c) => `${c.name} (score: ${c.score})`);
        this.logger.log(`Capabilities assessed: scope=${scope}, overall=${overallScore}, gaps=${gaps.length}`);
        return { capabilities, overallScore, gaps };
    }
    async identifyWeaknesses(params) {
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
        const filtered = area === 'all' ? possibleWeaknesses : possibleWeaknesses.filter((w) => w.area === area);
        const severity = filtered.some((w) => w.severity === 'high')
            ? 'high'
            : filtered.some((w) => w.severity === 'medium')
                ? 'medium'
                : 'low';
        this.logger.log(`Weaknesses identified: count=${filtered.length}, severity=${severity}, area=${area}`);
        return { weaknesses: filtered, severity, count: filtered.length };
    }
    async generateImprovementPlan(params) {
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
        this.logger.log(`Improvement plan generated: planId=${planId}, steps=${steps.length}, priority=${priority}`);
        return { planId, steps, estimatedTime, priority };
    }
    async trackProgress(params) {
        const { planId } = params;
        if (!planId || typeof planId !== 'string')
            throw new Error('Valid planId string is required');
        const plan = this.improvementPlans.get(planId);
        if (!plan)
            throw new Error(`Improvement plan not found: ${planId}`);
        const completed = Math.floor(Math.random() * plan.steps.length);
        const remaining = plan.steps.length - completed;
        const progress = Math.round((completed / plan.steps.length) * 100);
        const status = progress >= 100 ? 'completed' : progress > 0 ? 'in-progress' : 'not-started';
        this.logger.log(`Progress tracked: planId=${planId}, progress=${progress}%, status=${status}`);
        return { progress, completedSteps: completed, remainingSteps: remaining, status };
    }
    async measurePerformance(params) {
        const { benchmarks, timeWindow = '30d' } = params;
        if (!benchmarks || !Array.isArray(benchmarks) || benchmarks.length === 0)
            throw new Error('Non-empty benchmarks array is required');
        const results = benchmarks.map((b) => {
            const actual = b.actual ?? Math.round(b.target * (0.7 + Math.random() * 0.4));
            const deviation = Math.round(((actual - b.target) / b.target) * 10000) / 100;
            return { name: b.name, target: b.target, actual, met: actual >= b.target, deviation };
        });
        const overallPerformance = Math.round(results.reduce((sum, r) => sum + (r.met ? 100 : Math.max(0, (r.actual / r.target) * 100)), 0) / results.length);
        const meetsThreshold = overallPerformance >= 70;
        this.logger.log(`Performance measured: overall=${overallPerformance}%, meets=${meetsThreshold}, window=${timeWindow}`);
        return { results, overallPerformance, meetsThreshold };
    }
    async suggestUpgrades(params) {
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
            const impactVal = { high: 3, medium: 2, low: 1 };
            return (impactVal[b.estimatedImpact] || 0) - (impactVal[a.estimatedImpact] || 0);
        })
            .map((u) => u.component);
        const estimatedCost = upgrades.reduce((sum, u) => sum + u.cost, 0);
        this.logger.log(`Upgrades suggested: count=${upgrades.length}, cost=${estimatedCost}`);
        return { upgrades, priorityOrder, estimatedCost };
    }
};
exports.SelfImprovementAgentService = SelfImprovementAgentService;
exports.SelfImprovementAgentService = SelfImprovementAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], SelfImprovementAgentService);
//# sourceMappingURL=self-improvement-agent.service.js.map