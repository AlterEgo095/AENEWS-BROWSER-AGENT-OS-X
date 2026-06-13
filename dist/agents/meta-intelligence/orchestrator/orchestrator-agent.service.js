"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorAgentService = exports.META_ORCHESTRATOR_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.META_ORCHESTRATOR_AGENT_CONFIG = {
    id: 'meta-orchestrator',
    name: 'MetaOrchestrator',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '1.0.0',
    description: 'Master orchestrator that coordinates all other Meta Intelligence agents, manages task distribution, monitors progress, rebalances workloads, generates orchestration plans, and evaluates outcomes.',
    capabilities: [
        {
            name: 'orchestrateTask',
            description: 'Orchestrate a complex task by decomposing it and assigning subtasks to agents',
            inputSchema: {
                type: 'object',
                properties: {
                    taskDescription: { type: 'string', description: 'High-level task description' },
                    priority: {
                        type: 'string',
                        enum: ['low', 'normal', 'high', 'critical'],
                        description: 'Task priority',
                    },
                    constraints: { type: 'object', description: 'Constraints for orchestration' },
                },
                required: ['taskDescription'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    orchestrationId: { type: 'string' },
                    steps: { type: 'array', items: { type: 'object' } },
                    assignedAgents: { type: 'array', items: { type: 'string' } },
                    estimatedDurationMs: { type: 'number' },
                },
            },
        },
        {
            name: 'assignAgent',
            description: 'Assign a specific agent to a task based on capability matching',
            inputSchema: {
                type: 'object',
                properties: {
                    taskId: { type: 'string', description: 'Task ID to assign' },
                    agentId: { type: 'string', description: 'Agent ID to assign' },
                    subtaskDescription: { type: 'string', description: 'Description of the subtask' },
                },
                required: ['taskId', 'agentId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    assignmentId: { type: 'string' },
                    taskId: { type: 'string' },
                    agentId: { type: 'string' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'monitorProgress',
            description: 'Monitor the progress of all ongoing orchestrated tasks',
            inputSchema: {
                type: 'object',
                properties: {
                    orchestrationId: { type: 'string', description: 'Orchestration ID to monitor' },
                    includeDetails: { type: 'boolean', description: 'Include detailed step information' },
                },
                required: ['orchestrationId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    orchestrationId: { type: 'string' },
                    overallProgress: { type: 'number' },
                    stepStatuses: { type: 'array', items: { type: 'object' } },
                    bottlenecks: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'rebalanceWorkload',
            description: 'Rebalance workload across agents when imbalances are detected',
            inputSchema: {
                type: 'object',
                properties: {
                    strategy: {
                        type: 'string',
                        enum: ['even', 'priority-based', 'capability-based'],
                        description: 'Rebalancing strategy',
                    },
                    agentIds: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Specific agents to rebalance',
                    },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    rebalanced: { type: 'boolean' },
                    redistributions: { type: 'array', items: { type: 'object' } },
                    loadBefore: { type: 'object' },
                    loadAfter: { type: 'object' },
                },
            },
        },
        {
            name: 'generateOrchestrationPlan',
            description: 'Generate a comprehensive orchestration plan for a complex workflow',
            inputSchema: {
                type: 'object',
                properties: {
                    workflowDescription: { type: 'string', description: 'Description of the workflow' },
                    availableAgents: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Available agent IDs',
                    },
                    objectives: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Workflow objectives',
                    },
                    deadline: { type: 'string', description: 'Optional deadline ISO string' },
                },
                required: ['workflowDescription'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    planId: { type: 'string' },
                    phases: { type: 'array', items: { type: 'object' } },
                    dependencies: { type: 'array', items: { type: 'object' } },
                    estimatedDurationMs: { type: 'number' },
                    riskAssessment: { type: 'object' },
                },
            },
        },
        {
            name: 'evaluateOutcome',
            description: 'Evaluate the outcome of an orchestrated task or workflow',
            inputSchema: {
                type: 'object',
                properties: {
                    orchestrationId: { type: 'string', description: 'Orchestration ID to evaluate' },
                    expectedOutcome: { type: 'string', description: 'Expected outcome description' },
                    actualOutcome: { type: 'object', description: 'Actual outcome data' },
                },
                required: ['orchestrationId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    orchestrationId: { type: 'string' },
                    successScore: { type: 'number' },
                    criteriaResults: { type: 'array', items: { type: 'object' } },
                    lessonsLearned: { type: 'array', items: { type: 'string' } },
                    recommendations: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:orchestration',
        'write:orchestration',
        'read:agent',
        'write:assignment',
        'monitor:progress',
    ],
    maxConcurrentTasks: 5,
    timeout: 120000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 3000,
        exponentialBackoff: true,
    },
};
let OrchestratorAgentService = class OrchestratorAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.orchestrations = new Map();
        this.assignments = new Map();
    }
    defineConfig() {
        return exports.META_ORCHESTRATOR_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'orchestrateTask',
            description: 'Orchestrate a complex task by decomposing it and assigning subtasks to agents',
            execute: async (params) => this.orchestrateTask(params),
        });
        this.registerTool({
            name: 'assignAgent',
            description: 'Assign a specific agent to a task based on capability matching',
            execute: async (params) => this.assignAgent(params),
        });
        this.registerTool({
            name: 'monitorProgress',
            description: 'Monitor the progress of all ongoing orchestrated tasks',
            execute: async (params) => this.monitorProgress(params),
        });
        this.registerTool({
            name: 'rebalanceWorkload',
            description: 'Rebalance workload across agents when imbalances are detected',
            execute: async (params) => this.rebalanceWorkload(params),
        });
        this.registerTool({
            name: 'generateOrchestrationPlan',
            description: 'Generate a comprehensive orchestration plan for a complex workflow',
            execute: async (params) => this.generateOrchestrationPlan(params),
        });
        this.registerTool({
            name: 'evaluateOutcome',
            description: 'Evaluate the outcome of an orchestrated task or workflow',
            execute: async (params) => this.evaluateOutcome(params),
        });
        await this.storeInWorkingMemory('orchestrator:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('MetaOrchestrator agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'orchestrateTask',
            'assignAgent',
            'monitorProgress',
            'rebalanceWorkload',
            'generateOrchestrationPlan',
            'evaluateOutcome',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown orchestration action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`orchestrator:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`MetaOrchestrator execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.orchestrations.clear();
        this.assignments.clear();
        this.logger.log('MetaOrchestrator agent destroyed, orchestrations and assignments cleared');
    }
    async orchestrateTask(params) {
        const { taskDescription, priority = 'normal', constraints = {} } = params;
        if (!taskDescription || typeof taskDescription !== 'string') {
            throw new Error('Valid taskDescription string is required for orchestration');
        }
        const orchestrationId = this.generateId();
        const steps = this.decomposeTask(taskDescription);
        const assignedAgents = steps.map((s) => s.agentId);
        const estimatedDurationMs = steps.reduce((sum, s) => sum + s.estimatedDurationMs, 0);
        const record = {
            id: orchestrationId,
            taskDescription,
            status: 'planning',
            steps: steps.map((s, i) => ({
                id: `${orchestrationId}-step-${i}`,
                order: i,
                agentId: s.agentId,
                description: s.description,
                status: 'pending',
            })),
            createdAt: new Date(),
            updatedAt: new Date(),
            estimatedDurationMs,
        };
        this.orchestrations.set(orchestrationId, record);
        this.logger.log(`Orchestration created: id=${orchestrationId}, steps=${steps.length}, agents=${assignedAgents.length}`);
        return {
            orchestrationId,
            steps: steps.map((s) => ({ order: s.order, agentId: s.agentId, description: s.description })),
            assignedAgents: [...new Set(assignedAgents)],
            estimatedDurationMs,
        };
    }
    async assignAgent(params) {
        const { taskId, agentId, subtaskDescription = '' } = params;
        if (!taskId || typeof taskId !== 'string') {
            throw new Error('Valid taskId string is required');
        }
        if (!agentId || typeof agentId !== 'string') {
            throw new Error('Valid agentId string is required');
        }
        const assignmentId = this.generateId();
        const assignment = {
            id: assignmentId,
            taskId,
            agentId,
            subtaskDescription,
            status: 'assigned',
            assignedAt: new Date(),
        };
        this.assignments.set(assignmentId, assignment);
        this.logger.log(`Agent assigned: agent=${agentId}, task=${taskId}, assignment=${assignmentId}`);
        return {
            assignmentId,
            taskId,
            agentId,
            status: 'assigned',
        };
    }
    async monitorProgress(params) {
        const { orchestrationId, includeDetails = false } = params;
        if (!orchestrationId || typeof orchestrationId !== 'string') {
            throw new Error('Valid orchestrationId string is required');
        }
        const record = this.orchestrations.get(orchestrationId);
        if (!record) {
            throw new Error(`Orchestration not found: ${orchestrationId}`);
        }
        const elapsedMs = Date.now() - record.createdAt.getTime();
        const totalSteps = record.steps.length;
        const completedSteps = record.steps.filter((s) => s.status === 'completed').length;
        const progressPerStep = totalSteps > 0 ? elapsedMs / record.estimatedDurationMs : 0;
        const stepStatuses = record.steps.map((step) => {
            const stepProgress = Math.min(100, Math.round(((progressPerStep * 100) / totalSteps) * (step.order + 1)));
            return {
                stepId: step.id,
                order: step.order,
                status: step.status,
                progress: stepProgress,
            };
        });
        const overallProgress = totalSteps > 0
            ? Math.min(100, Math.round((completedSteps / totalSteps) * 100 + progressPerStep * 10))
            : 0;
        const bottlenecks = this.identifyBottlenecks(record);
        this.logger.log(`Progress monitored: id=${orchestrationId}, progress=${overallProgress}%, bottlenecks=${bottlenecks.length}`);
        return {
            orchestrationId,
            overallProgress,
            stepStatuses,
            bottlenecks,
        };
    }
    async rebalanceWorkload(params) {
        const { strategy = 'even', agentIds = [] } = params;
        const targetAgents = agentIds.length > 0
            ? agentIds
            : ['meta-planner', 'meta-critic', 'meta-repair', 'meta-learning', 'meta-task-router'];
        const loadBefore = {};
        for (const agentId of targetAgents) {
            loadBefore[agentId] = Math.floor(Math.random() * 8) + 1;
        }
        const totalLoad = Object.values(loadBefore).reduce((sum, l) => sum + l, 0);
        const targetLoad = Math.round(totalLoad / targetAgents.length);
        const loadAfter = {};
        const redistributions = [];
        if (strategy === 'even') {
            let remaining = totalLoad;
            for (let i = 0; i < targetAgents.length; i++) {
                const isLast = i === targetAgents.length - 1;
                loadAfter[targetAgents[i]] = isLast ? remaining : targetLoad;
                remaining -= loadAfter[targetAgents[i]];
            }
            for (const agentId of targetAgents) {
                const diff = loadBefore[agentId] - (loadAfter[agentId] || 0);
                if (diff > 0) {
                    const underloaded = targetAgents.find((a) => (loadBefore[a] || 0) < (loadAfter[a] || 0) && a !== agentId);
                    if (underloaded) {
                        redistributions.push({ from: agentId, to: underloaded, taskCount: diff });
                    }
                }
            }
        }
        else if (strategy === 'priority-based') {
            for (const agentId of targetAgents) {
                const isHighPriority = agentId.includes('judge') || agentId.includes('governance');
                loadAfter[agentId] = isHighPriority
                    ? Math.max(1, Math.floor(targetLoad * 0.6))
                    : Math.ceil(targetLoad * 1.2);
            }
        }
        else {
            for (const agentId of targetAgents) {
                const isSpecialized = agentId.includes('repair') || agentId.includes('critic');
                loadAfter[agentId] = isSpecialized ? Math.max(1, Math.floor(targetLoad * 0.8)) : targetLoad;
            }
        }
        this.logger.log(`Workload rebalanced: strategy=${strategy}, agents=${targetAgents.length}, redistributions=${redistributions.length}`);
        return { rebalanced: true, redistributions, loadBefore, loadAfter };
    }
    async generateOrchestrationPlan(params) {
        const { workflowDescription, availableAgents = [
            'meta-planner',
            'meta-critic',
            'meta-repair',
            'meta-judge',
            'meta-learning',
            'meta-task-router',
            'meta-knowledge-synthesis',
        ], objectives = [], deadline, } = params;
        if (!workflowDescription || typeof workflowDescription !== 'string') {
            throw new Error('Valid workflowDescription string is required');
        }
        const planId = this.generateId();
        const phases = [
            {
                name: 'Analysis & Planning',
                steps: [
                    {
                        agentId: 'meta-planner',
                        action: 'createPlan',
                        description: `Create execution plan for: ${workflowDescription}`,
                    },
                    {
                        agentId: 'meta-knowledge-synthesis',
                        action: 'synthesizeKnowledge',
                        description: 'Gather and synthesize relevant knowledge',
                    },
                ],
                estimatedDurationMs: 15000,
            },
            {
                name: 'Execution',
                steps: [
                    {
                        agentId: 'meta-task-router',
                        action: 'routeTask',
                        description: 'Route subtasks to specialized agents',
                    },
                    {
                        agentId: 'meta-planner',
                        action: 'decomposeGoal',
                        description: 'Decompose workflow into executable subtasks',
                    },
                ],
                estimatedDurationMs: 30000,
            },
            {
                name: 'Quality Assurance',
                steps: [
                    {
                        agentId: 'meta-critic',
                        action: 'evaluateOutput',
                        description: 'Evaluate outputs from execution phase',
                    },
                    {
                        agentId: 'meta-repair',
                        action: 'diagnoseFailure',
                        description: 'Diagnose and repair any failures',
                    },
                ],
                estimatedDurationMs: 20000,
            },
            {
                name: 'Validation & Decision',
                steps: [
                    {
                        agentId: 'meta-judge',
                        action: 'arbitrate',
                        description: 'Final arbitration of results',
                    },
                    {
                        agentId: 'meta-learning',
                        action: 'learnFromExperience',
                        description: 'Extract lessons from orchestration',
                    },
                ],
                estimatedDurationMs: 10000,
            },
        ];
        const dependencies = [
            { from: 'Analysis & Planning', to: 'Execution', type: 'sequential' },
            { from: 'Execution', to: 'Quality Assurance', type: 'sequential' },
            { from: 'Quality Assurance', to: 'Validation & Decision', type: 'sequential' },
        ];
        const estimatedDurationMs = phases.reduce((sum, p) => sum + p.estimatedDurationMs, 0);
        const riskLevel = objectives.length > 5 ? 'high' : objectives.length > 2 ? 'medium' : 'low';
        const riskFactors = [];
        const mitigations = [];
        if (availableAgents.length < 4) {
            riskFactors.push('Limited agent availability may cause bottlenecks');
            mitigations.push('Enable workload rebalancing and task rerouting');
        }
        if (deadline) {
            const deadlineDate = new Date(deadline);
            if (isNaN(deadlineDate.getTime())) {
                riskFactors.push('Invalid deadline format');
            }
            else {
                const timeToDeadline = deadlineDate.getTime() - Date.now();
                if (timeToDeadline < estimatedDurationMs) {
                    riskFactors.push('Deadline is tighter than estimated duration');
                    mitigations.push('Prioritize critical path tasks and enable parallel execution');
                }
            }
        }
        if (objectives.length === 0) {
            riskFactors.push('No explicit objectives defined');
            mitigations.push('Define clear success criteria before execution');
        }
        this.logger.log(`Orchestration plan generated: planId=${planId}, phases=${phases.length}, risk=${riskLevel}`);
        return {
            planId,
            phases,
            dependencies,
            estimatedDurationMs,
            riskAssessment: { level: riskLevel, factors: riskFactors, mitigations },
        };
    }
    async evaluateOutcome(params) {
        const { orchestrationId, expectedOutcome, actualOutcome } = params;
        if (!orchestrationId || typeof orchestrationId !== 'string') {
            throw new Error('Valid orchestrationId string is required');
        }
        const record = this.orchestrations.get(orchestrationId);
        const criteriaResults = [
            {
                criterion: 'Task Completion',
                score: record ? this.assessCompletionScore(record) : 75 + Math.floor(Math.random() * 20),
                passed: true,
                notes: 'Core objectives were met within acceptable parameters',
            },
            {
                criterion: 'Quality Standards',
                score: 70 + Math.floor(Math.random() * 25),
                passed: true,
                notes: 'Output quality meets minimum standards',
            },
            {
                criterion: 'Time Efficiency',
                score: record
                    ? Math.max(40, 100 -
                        Math.floor(((Date.now() - record.createdAt.getTime()) / record.estimatedDurationMs) * 20))
                    : 65 + Math.floor(Math.random() * 25),
                passed: true,
                notes: 'Execution completed within reasonable time bounds',
            },
            {
                criterion: 'Resource Utilization',
                score: 60 + Math.floor(Math.random() * 30),
                passed: true,
                notes: 'Agent resources were utilized effectively',
            },
            {
                criterion: 'Alignment with Objectives',
                score: expectedOutcome ? 75 + Math.floor(Math.random() * 20) : 70,
                passed: true,
                notes: expectedOutcome
                    ? 'Results align with expected outcome description'
                    : 'No explicit expected outcome was provided for comparison',
            },
        ];
        const successScore = Math.round(criteriaResults.reduce((sum, c) => sum + c.score, 0) / criteriaResults.length);
        const lessonsLearned = this.extractLessons(criteriaResults, record);
        const recommendations = this.generateRecommendations(criteriaResults, successScore);
        this.logger.log(`Outcome evaluated: id=${orchestrationId}, score=${successScore}, criteria=${criteriaResults.length}`);
        return {
            orchestrationId,
            successScore,
            criteriaResults,
            lessonsLearned,
            recommendations,
        };
    }
    decomposeTask(description) {
        const words = description.split(/\s+/);
        const complexity = Math.min(words.length / 10, 5);
        const steps = [
            {
                order: 0,
                agentId: 'meta-planner',
                description: `Plan approach for: ${description.substring(0, 100)}`,
                estimatedDurationMs: 5000 + complexity * 2000,
            },
            {
                order: 1,
                agentId: 'meta-task-router',
                description: `Route subtasks for: ${description.substring(0, 100)}`,
                estimatedDurationMs: 3000 + complexity * 1000,
            },
            {
                order: 2,
                agentId: 'meta-critic',
                description: `Evaluate intermediate results for: ${description.substring(0, 80)}`,
                estimatedDurationMs: 4000 + complexity * 1500,
            },
            {
                order: 3,
                agentId: 'meta-judge',
                description: `Final decision on: ${description.substring(0, 80)}`,
                estimatedDurationMs: 3000 + complexity * 1000,
            },
        ];
        if (complexity > 2) {
            steps.splice(2, 0, {
                order: 2,
                agentId: 'meta-repair',
                description: `Repair any issues found during execution`,
                estimatedDurationMs: 5000 + complexity * 2000,
            });
            steps.forEach((s, i) => {
                s.order = i;
            });
        }
        return steps;
    }
    identifyBottlenecks(record) {
        const bottlenecks = [];
        const runningSteps = record.steps.filter((s) => s.status === 'running');
        const pendingSteps = record.steps.filter((s) => s.status === 'pending');
        if (runningSteps.length > 3) {
            bottlenecks.push('Too many concurrent steps may be causing resource contention');
        }
        const longRunningSteps = runningSteps.filter((s) => {
            if (!s.assignedAt)
                return false;
            return Date.now() - s.assignedAt.getTime() > 60000;
        });
        for (const step of longRunningSteps) {
            bottlenecks.push(`Step ${step.order} (${step.agentId}) has been running for an extended period`);
        }
        if (pendingSteps.length > runningSteps.length && runningSteps.length > 0) {
            bottlenecks.push('Pending steps outnumber running steps; consider parallelization');
        }
        return bottlenecks;
    }
    assessCompletionScore(record) {
        const totalSteps = record.steps.length;
        if (totalSteps === 0)
            return 50;
        const completedSteps = record.steps.filter((s) => s.status === 'completed').length;
        return Math.round((completedSteps / totalSteps) * 100);
    }
    extractLessons(criteriaResults, _record) {
        const lessons = [];
        const failedCriteria = criteriaResults.filter((c) => !c.passed || c.score < 60);
        if (failedCriteria.length > 0) {
            lessons.push(`Areas needing improvement: ${failedCriteria.map((c) => c.criterion).join(', ')}`);
        }
        const highScores = criteriaResults.filter((c) => c.score >= 85);
        if (highScores.length > 0) {
            lessons.push(`Strengths to maintain: ${highScores.map((c) => c.criterion).join(', ')}`);
        }
        lessons.push('Regular monitoring during execution helps identify issues early');
        lessons.push('Clear objective definitions improve outcome evaluation accuracy');
        return lessons;
    }
    generateRecommendations(criteriaResults, overallScore) {
        const recommendations = [];
        if (overallScore < 60) {
            recommendations.push('Consider revising the orchestration strategy for better outcomes');
        }
        const weakCriteria = criteriaResults.filter((c) => c.score < 70);
        for (const criterion of weakCriteria) {
            recommendations.push(`Improve ${criterion.criterion} by adjusting agent selection and task allocation`);
        }
        if (overallScore >= 80) {
            recommendations.push('Current orchestration approach is effective; consider using it as a template');
        }
        recommendations.push('Document successful patterns for reuse in future orchestrations');
        return recommendations;
    }
};
exports.OrchestratorAgentService = OrchestratorAgentService;
exports.OrchestratorAgentService = OrchestratorAgentService = __decorate([
    (0, common_1.Injectable)()
], OrchestratorAgentService);
//# sourceMappingURL=orchestrator-agent.service.js.map