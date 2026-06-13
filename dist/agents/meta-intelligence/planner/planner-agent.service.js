"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlannerAgentService = exports.META_PLANNER_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.META_PLANNER_AGENT_CONFIG = {
    id: 'meta-planner',
    name: 'MetaPlanner',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '1.0.0',
    description: 'Strategic planning agent that creates execution plans, decomposes goals into subtasks, prioritizes tasks, estimates effort, identifies dependencies, and optimizes plans for the Meta Intelligence cluster.',
    capabilities: [
        {
            name: 'createPlan',
            description: 'Create a strategic execution plan for a given goal or task',
            inputSchema: {
                type: 'object',
                properties: {
                    goal: { type: 'string', description: 'High-level goal to plan for' },
                    constraints: { type: 'object', description: 'Planning constraints' },
                    timeframe: { type: 'string', description: 'Target timeframe' },
                },
                required: ['goal'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    planId: { type: 'string' },
                    steps: { type: 'array', items: { type: 'object' } },
                    estimatedDurationMs: { type: 'number' },
                    resourceRequirements: { type: 'object' },
                },
            },
        },
        {
            name: 'decomposeGoal',
            description: 'Decompose a high-level goal into actionable subtasks',
            inputSchema: {
                type: 'object',
                properties: {
                    goal: { type: 'string', description: 'Goal to decompose' },
                    maxDepth: { type: 'number', description: 'Maximum decomposition depth' },
                    strategy: {
                        type: 'string',
                        enum: ['sequential', 'parallel', 'hybrid'],
                        description: 'Decomposition strategy',
                    },
                },
                required: ['goal'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    subtasks: { type: 'array', items: { type: 'object' } },
                    dependencyGraph: { type: 'object' },
                    executionOrder: { type: 'array', items: { type: 'array' } },
                },
            },
        },
        {
            name: 'prioritizeTasks',
            description: 'Prioritize a list of tasks based on multiple criteria',
            inputSchema: {
                type: 'object',
                properties: {
                    tasks: { type: 'array', items: { type: 'object' }, description: 'Tasks to prioritize' },
                    criteria: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Prioritization criteria',
                    },
                    weights: { type: 'object', description: 'Weights for each criterion' },
                },
                required: ['tasks'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    prioritizedTasks: { type: 'array', items: { type: 'object' } },
                    ranking: { type: 'array', items: { type: 'object' } },
                    rationale: { type: 'string' },
                },
            },
        },
        {
            name: 'estimateEffort',
            description: 'Estimate effort required for a task or plan',
            inputSchema: {
                type: 'object',
                properties: {
                    taskDescription: { type: 'string', description: 'Task description' },
                    complexity: {
                        type: 'string',
                        enum: ['low', 'medium', 'high', 'critical'],
                        description: 'Task complexity',
                    },
                    resources: { type: 'object', description: 'Available resources' },
                },
                required: ['taskDescription'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    estimatedHours: { type: 'number' },
                    confidence: { type: 'number' },
                    breakdown: { type: 'object' },
                    riskFactors: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'identifyDependencies',
            description: 'Identify dependencies between tasks in a plan',
            inputSchema: {
                type: 'object',
                properties: {
                    tasks: {
                        type: 'array',
                        items: { type: 'object' },
                        description: 'Tasks to analyze for dependencies',
                    },
                    context: { type: 'object', description: 'Planning context' },
                },
                required: ['tasks'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    dependencies: { type: 'array', items: { type: 'object' } },
                    criticalPath: { type: 'array', items: { type: 'string' } },
                    parallelGroups: { type: 'array', items: { type: 'array' } },
                },
            },
        },
        {
            name: 'optimizePlan',
            description: 'Optimize an existing plan for better efficiency',
            inputSchema: {
                type: 'object',
                properties: {
                    planId: { type: 'string', description: 'Plan ID to optimize' },
                    optimizationGoal: {
                        type: 'string',
                        enum: ['speed', 'cost', 'quality', 'balanced'],
                        description: 'Optimization goal',
                    },
                    constraints: { type: 'object', description: 'Optimization constraints' },
                },
                required: ['planId', 'optimizationGoal'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    originalEstimate: { type: 'number' },
                    optimizedEstimate: { type: 'number' },
                    improvements: { type: 'array', items: { type: 'object' } },
                    tradeoffs: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:plan', 'write:plan', 'read:task', 'write:task'],
    maxConcurrentTasks: 4,
    timeout: 90000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 2500,
        exponentialBackoff: true,
    },
};
let PlannerAgentService = class PlannerAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.plans = new Map();
    }
    defineConfig() {
        return exports.META_PLANNER_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'createPlan',
            description: 'Create a strategic execution plan for a given goal or task',
            execute: async (params) => this.createPlan(params),
        });
        this.registerTool({
            name: 'decomposeGoal',
            description: 'Decompose a high-level goal into actionable subtasks',
            execute: async (params) => this.decomposeGoal(params),
        });
        this.registerTool({
            name: 'prioritizeTasks',
            description: 'Prioritize a list of tasks based on multiple criteria',
            execute: async (params) => this.prioritizeTasks(params),
        });
        this.registerTool({
            name: 'estimateEffort',
            description: 'Estimate effort required for a task or plan',
            execute: async (params) => this.estimateEffort(params),
        });
        this.registerTool({
            name: 'identifyDependencies',
            description: 'Identify dependencies between tasks in a plan',
            execute: async (params) => this.identifyDependencies(params),
        });
        this.registerTool({
            name: 'optimizePlan',
            description: 'Optimize an existing plan for better efficiency',
            execute: async (params) => this.optimizePlan(params),
        });
        await this.storeInWorkingMemory('planner:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('MetaPlanner agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'createPlan',
            'decomposeGoal',
            'prioritizeTasks',
            'estimateEffort',
            'identifyDependencies',
            'optimizePlan',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown planner action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`planner:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`MetaPlanner execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.plans.clear();
        this.logger.log('MetaPlanner agent destroyed, plans cleared');
    }
    async createPlan(params) {
        const { goal, constraints = {}, timeframe } = params;
        if (!goal || typeof goal !== 'string') {
            throw new Error('Valid goal string is required for plan creation');
        }
        const planId = this.generateId();
        const wordCount = goal.split(/\s+/).length;
        const complexityFactor = Math.min(wordCount / 20, 3);
        const steps = [
            {
                id: `${planId}-step-0`,
                description: `Analyze goal: ${goal.substring(0, 80)}`,
                order: 0,
                estimatedDurationMs: 3000 + complexityFactor * 1000,
                dependsOn: [],
                status: 'pending',
                priority: 3,
            },
            {
                id: `${planId}-step-1`,
                description: 'Decompose goal into subtasks',
                order: 1,
                estimatedDurationMs: 5000 + complexityFactor * 1500,
                dependsOn: [`${planId}-step-0`],
                status: 'pending',
                priority: 3,
            },
            {
                id: `${planId}-step-2`,
                description: 'Identify dependencies and execution order',
                order: 2,
                estimatedDurationMs: 4000 + complexityFactor * 1000,
                dependsOn: [`${planId}-step-1`],
                status: 'pending',
                priority: 2,
            },
            {
                id: `${planId}-step-3`,
                description: 'Estimate effort and resource requirements',
                order: 3,
                estimatedDurationMs: 3000 + complexityFactor * 800,
                dependsOn: [`${planId}-step-1`],
                status: 'pending',
                priority: 2,
            },
            {
                id: `${planId}-step-4`,
                description: 'Finalize and validate plan',
                order: 4,
                estimatedDurationMs: 2000 + complexityFactor * 500,
                dependsOn: [`${planId}-step-2`, `${planId}-step-3`],
                status: 'pending',
                priority: 3,
            },
        ];
        const estimatedDurationMs = steps.reduce((sum, s) => sum + s.estimatedDurationMs, 0);
        const record = {
            id: planId,
            goal,
            steps,
            status: 'draft',
            createdAt: new Date(),
            estimatedDurationMs,
        };
        this.plans.set(planId, record);
        const resourceRequirements = {
            planner: 1,
            critic: 1,
            executor: Math.max(1, Math.ceil(complexityFactor)),
        };
        if (constraints.maxAgents) {
            resourceRequirements.executor = Math.min(resourceRequirements.executor, constraints.maxAgents);
        }
        this.logger.log(`Plan created: planId=${planId}, steps=${steps.length}, duration=${estimatedDurationMs}ms`);
        return {
            planId,
            steps: steps.map((s) => ({
                id: s.id,
                description: s.description,
                order: s.order,
                estimatedDurationMs: s.estimatedDurationMs,
            })),
            estimatedDurationMs,
            resourceRequirements,
        };
    }
    async decomposeGoal(params) {
        const { goal, maxDepth = 2, strategy = 'hybrid' } = params;
        if (!goal || typeof goal !== 'string') {
            throw new Error('Valid goal string is required for decomposition');
        }
        const subtasks = [];
        const dependencyGraph = {};
        const mainComponents = this.extractMainComponents(goal);
        for (let i = 0; i < mainComponents.length; i++) {
            const id = `subtask-0-${i}`;
            subtasks.push({
                id,
                description: mainComponents[i],
                depth: 0,
            });
            dependencyGraph[id] = [];
            if (maxDepth >= 1) {
                const subComponents = this.extractSubComponents(mainComponents[i]);
                for (let j = 0; j < subComponents.length; j++) {
                    const subId = `subtask-1-${i}-${j}`;
                    subtasks.push({
                        id: subId,
                        description: subComponents[j],
                        depth: 1,
                        parentTaskId: id,
                    });
                    dependencyGraph[subId] = [id];
                }
            }
        }
        const executionOrder = [];
        if (strategy === 'sequential') {
            for (const subtask of subtasks) {
                executionOrder.push([subtask.id]);
            }
        }
        else if (strategy === 'parallel') {
            const byDepth = new Map();
            for (const subtask of subtasks) {
                const depthTasks = byDepth.get(subtask.depth) || [];
                depthTasks.push(subtask.id);
                byDepth.set(subtask.depth, depthTasks);
            }
            for (const [, ids] of byDepth) {
                executionOrder.push(ids);
            }
        }
        else {
            const depth0 = subtasks.filter((s) => s.depth === 0).map((s) => s.id);
            executionOrder.push(depth0.slice(0, 2));
            if (depth0.length > 2)
                executionOrder.push(depth0.slice(2));
            const depth1 = subtasks.filter((s) => s.depth === 1).map((s) => s.id);
            if (depth1.length > 0) {
                executionOrder.push(depth1.slice(0, 3));
                if (depth1.length > 3)
                    executionOrder.push(depth1.slice(3));
            }
        }
        this.logger.log(`Goal decomposed: goal="${goal.substring(0, 50)}", subtasks=${subtasks.length}, strategy=${strategy}`);
        return { subtasks, dependencyGraph, executionOrder };
    }
    async prioritizeTasks(params) {
        const { tasks, criteria = ['urgency', 'impact', 'effort', 'dependencies'], weights = {}, } = params;
        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
            throw new Error('Non-empty tasks array is required for prioritization');
        }
        const defaultWeights = {
            urgency: 0.3,
            impact: 0.3,
            effort: 0.2,
            dependencies: 0.2,
        };
        const effectiveWeights = { ...defaultWeights, ...weights };
        const ranked = tasks.map((task) => {
            const factors = {};
            let totalScore = 0;
            for (const criterion of criteria) {
                const weight = effectiveWeights[criterion] || 0.1;
                let score;
                switch (criterion) {
                    case 'urgency':
                        score = task.priority ?? 1;
                        break;
                    case 'impact':
                        score = this.estimateImpact(task.description);
                        break;
                    case 'effort':
                        score = 5 - this.estimateEffortScore(task.description);
                        break;
                    case 'dependencies':
                        score = Math.random() * 5;
                        break;
                    default:
                        score = 3;
                }
                factors[criterion] = Math.round(score * 100) / 100;
                totalScore += score * weight;
            }
            return {
                id: task.id,
                description: task.description,
                score: Math.round(totalScore * 100) / 100,
                factors,
            };
        });
        ranked.sort((a, b) => b.score - a.score);
        const prioritizedTasks = ranked.map((r, i) => ({
            id: r.id,
            description: r.description,
            score: r.score,
            rank: i + 1,
        }));
        const ranking = ranked.map((r) => ({
            id: r.id,
            score: r.score,
            factors: r.factors,
        }));
        const rationale = this.generatePrioritizationRationale(criteria, effectiveWeights, ranked);
        this.logger.log(`Tasks prioritized: count=${tasks.length}, criteria=${criteria.join(',')}`);
        return { prioritizedTasks, ranking, rationale };
    }
    async estimateEffort(params) {
        const { taskDescription, complexity = 'medium', resources = {} } = params;
        if (!taskDescription || typeof taskDescription !== 'string') {
            throw new Error('Valid taskDescription string is required for effort estimation');
        }
        const complexityMultiplier = {
            low: 0.6,
            medium: 1.0,
            high: 1.6,
            critical: 2.2,
        };
        const baseHours = this.estimateBaseHours(taskDescription);
        const multiplier = complexityMultiplier[complexity] || 1.0;
        const estimatedHours = Math.round(baseHours * multiplier * 10) / 10;
        const confidence = this.calculateConfidence(taskDescription, resources);
        const breakdown = {
            analysis: Math.round(estimatedHours * 0.2 * 10) / 10,
            implementation: Math.round(estimatedHours * 0.45 * 10) / 10,
            testing: Math.round(estimatedHours * 0.2 * 10) / 10,
            review: Math.round(estimatedHours * 0.1 * 10) / 10,
            buffer: Math.round(estimatedHours * 0.05 * 10) / 10,
        };
        const riskFactors = this.identifyEffortRiskFactors(taskDescription, complexity, resources);
        this.logger.log(`Effort estimated: hours=${estimatedHours}, complexity=${complexity}, confidence=${confidence}`);
        return { estimatedHours, confidence, breakdown, riskFactors };
    }
    async identifyDependencies(params) {
        const { tasks, context = {} } = params;
        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
            throw new Error('Non-empty tasks array is required for dependency identification');
        }
        const dependencies = [];
        for (const task of tasks) {
            const explicitDeps = task.requires || [];
            const implicitDeps = this.inferImplicitDependencies(task, tasks);
            const allDeps = [...new Set([...explicitDeps, ...implicitDeps])];
            const depType = allDeps.length === 0 ? 'independent' : allDeps.length <= 2 ? 'sequential' : 'complex';
            dependencies.push({
                taskId: task.id,
                dependsOn: allDeps,
                type: depType,
            });
        }
        const criticalPath = this.calculateCriticalPath(tasks, dependencies);
        const parallelGroups = this.identifyParallelGroups(tasks, dependencies);
        this.logger.log(`Dependencies identified: tasks=${tasks.length}, criticalPath=${criticalPath.length}, parallelGroups=${parallelGroups.length}`);
        return { dependencies, criticalPath, parallelGroups };
    }
    async optimizePlan(params) {
        const { planId, optimizationGoal, constraints = {} } = params;
        if (!planId || typeof planId !== 'string') {
            throw new Error('Valid planId string is required');
        }
        if (!['speed', 'cost', 'quality', 'balanced'].includes(optimizationGoal)) {
            throw new Error(`Invalid optimization goal: ${optimizationGoal}. Must be one of: speed, cost, quality, balanced`);
        }
        const plan = this.plans.get(planId);
        if (!plan) {
            throw new Error(`Plan not found: ${planId}`);
        }
        const originalEstimate = plan.estimatedDurationMs;
        const improvements = [];
        const tradeoffs = [];
        let optimizedEstimate = originalEstimate;
        switch (optimizationGoal) {
            case 'speed':
                const parallelSavings = Math.round(originalEstimate * 0.25);
                optimizedEstimate -= parallelSavings;
                improvements.push({
                    description: 'Parallelized independent execution steps',
                    savingsMs: parallelSavings,
                    tradeoff: 'Increased resource consumption due to parallel execution',
                });
                tradeoffs.push('Higher resource usage during parallel execution phases');
                break;
            case 'cost':
                const costSavings = Math.round(originalEstimate * 0.15);
                optimizedEstimate += Math.round(originalEstimate * 0.1);
                improvements.push({
                    description: 'Consolidated tasks to reduce agent count',
                    savingsMs: -Math.round(originalEstimate * 0.1),
                    tradeoff: 'Reduced cost but longer execution time',
                });
                tradeoffs.push('Sequential execution increases total duration by ~10%');
                break;
            case 'quality':
                optimizedEstimate += Math.round(originalEstimate * 0.2);
                improvements.push({
                    description: 'Added quality review gates between phases',
                    savingsMs: -Math.round(originalEstimate * 0.2),
                    tradeoff: 'Higher quality output but 20% longer execution',
                });
                tradeoffs.push('Additional review steps increase duration by ~20%');
                break;
            case 'balanced':
                const balancedSavings = Math.round(originalEstimate * 0.1);
                optimizedEstimate -= balancedSavings;
                improvements.push({
                    description: 'Optimized critical path and parallelized where safe',
                    savingsMs: balancedSavings,
                    tradeoff: 'Minor quality review reduction for time savings',
                });
                tradeoffs.push('Slightly reduced review coverage for faster execution');
                break;
        }
        optimizedEstimate = Math.max(1000, optimizedEstimate);
        this.logger.log(`Plan optimized: planId=${planId}, goal=${optimizationGoal}, original=${originalEstimate}ms, optimized=${optimizedEstimate}ms`);
        return { originalEstimate, optimizedEstimate, improvements, tradeoffs };
    }
    extractMainComponents(goal) {
        const components = [];
        const words = goal.split(/\s+/);
        const parts = goal
            .split(/[;,]/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0);
        if (parts.length > 1) {
            components.push(...parts);
        }
        else {
            components.push(`Research and analyze: ${goal}`);
            components.push(`Design approach for: ${goal}`);
            components.push(`Implement solution for: ${goal}`);
            components.push(`Validate and verify: ${goal}`);
        }
        return components;
    }
    extractSubComponents(component) {
        const subComponents = [
            `Gather requirements for ${component.substring(0, 50)}`,
            `Execute ${component.substring(0, 50)}`,
            `Verify results of ${component.substring(0, 50)}`,
        ];
        return subComponents;
    }
    estimateImpact(description) {
        const highImpactWords = ['critical', 'essential', 'key', 'primary', 'core', 'vital'];
        const lowImpactWords = ['minor', 'optional', 'nice-to-have', 'low-priority'];
        const lower = description.toLowerCase();
        if (highImpactWords.some((w) => lower.includes(w)))
            return 4 + Math.random();
        if (lowImpactWords.some((w) => lower.includes(w)))
            return 1 + Math.random();
        return 2.5 + Math.random() * 1.5;
    }
    estimateEffortScore(description) {
        const words = description.split(/\s+/).length;
        if (words > 20)
            return 4 + Math.random();
        if (words > 10)
            return 3 + Math.random();
        return 1.5 + Math.random() * 1.5;
    }
    estimateBaseHours(description) {
        const words = description.split(/\s+/).length;
        const base = 2 + words * 0.1;
        return Math.max(1, Math.min(40, base));
    }
    calculateConfidence(description, resources) {
        let confidence = 0.7;
        const words = description.split(/\s+/);
        if (words.length > 5)
            confidence -= 0.05;
        if (words.length > 15)
            confidence -= 0.1;
        if (resources.experienced)
            confidence += 0.1;
        if (resources.tooling)
            confidence += 0.05;
        return Math.round(Math.max(0.3, Math.min(0.95, confidence)) * 100) / 100;
    }
    identifyEffortRiskFactors(description, complexity, resources) {
        const risks = [];
        if (complexity === 'high' || complexity === 'critical') {
            risks.push('High complexity increases estimation uncertainty');
        }
        if (!resources.experienced) {
            risks.push('Lack of experienced resources may extend timeline');
        }
        if (description.includes('integration') || description.includes('migrate')) {
            risks.push('Integration/migration tasks carry higher risk of unexpected issues');
        }
        if (Object.keys(resources).length === 0) {
            risks.push('No resource information provided; estimation may be less accurate');
        }
        return risks;
    }
    inferImplicitDependencies(task, allTasks) {
        const implicit = [];
        const lower = task.description.toLowerCase();
        for (const other of allTasks) {
            if (other.id === task.id)
                continue;
            const otherLower = other.description.toLowerCase();
            if (lower.includes('verify') && otherLower.includes('implement')) {
                implicit.push(other.id);
            }
            if (lower.includes('test') && otherLower.includes('implement')) {
                implicit.push(other.id);
            }
            if (lower.includes('deploy') && otherLower.includes('test')) {
                implicit.push(other.id);
            }
        }
        return [...new Set(implicit)];
    }
    calculateCriticalPath(tasks, dependencies) {
        const depMap = new Map(dependencies.map((d) => [d.taskId, d.dependsOn]));
        const visited = new Set();
        const path = [];
        const visit = (id) => {
            if (visited.has(id))
                return;
            visited.add(id);
            const deps = depMap.get(id) || [];
            for (const dep of deps) {
                visit(dep);
            }
            path.push(id);
        };
        for (const task of tasks) {
            visit(task.id);
        }
        return path;
    }
    identifyParallelGroups(tasks, dependencies) {
        const groups = [];
        const independent = dependencies.filter((d) => d.type === 'independent').map((d) => d.taskId);
        if (independent.length > 0)
            groups.push(independent);
        const sequential = dependencies.filter((d) => d.type === 'sequential').map((d) => d.taskId);
        if (sequential.length > 0)
            groups.push(sequential);
        const complex = dependencies.filter((d) => d.type === 'complex').map((d) => d.taskId);
        if (complex.length > 0)
            groups.push(complex);
        return groups.length > 0 ? groups : [tasks.map((t) => t.id)];
    }
    generatePrioritizationRationale(criteria, weights, ranked) {
        const topTask = ranked[0];
        const criteriaStr = criteria.map((c) => `${c} (${(weights[c] * 100).toFixed(0)}%)`).join(', ');
        return (`Tasks were ranked using weighted criteria: ${criteriaStr}. ` +
            `Top priority goes to task "${topTask.id}" with a composite score of ${topTask.score.toFixed(2)}. ` +
            `Higher-scoring tasks should be addressed first to maximize overall outcome quality.`);
    }
};
exports.PlannerAgentService = PlannerAgentService;
exports.PlannerAgentService = PlannerAgentService = __decorate([
    (0, common_1.Injectable)()
], PlannerAgentService);
//# sourceMappingURL=planner-agent.service.js.map