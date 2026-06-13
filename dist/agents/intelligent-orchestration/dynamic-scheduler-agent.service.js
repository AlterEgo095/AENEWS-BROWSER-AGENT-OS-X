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
exports.DynamicSchedulerAgentService = exports.DYNAMIC_SCHEDULER_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
const agent_interface_1 = require("../interfaces/agent.interface");
const bridge_1 = require("../bridge");
exports.DYNAMIC_SCHEDULER_AGENT_CONFIG = {
    id: 'intelligent-dynamic-scheduler',
    name: 'DynamicScheduler',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '2.0.0',
    description: 'LLM-driven dynamic task scheduler that creates optimal execution schedules considering task priority, dependency chains, resource availability, estimated duration, and failure risk',
    capabilities: [
        {
            name: 'createSchedule',
            description: 'Create an optimal execution schedule for a set of tasks with dependencies',
            inputSchema: {
                type: 'object',
                properties: {
                    tasks: {
                        type: 'array',
                        items: { type: 'object' },
                        description: 'Tasks with dependencies and resource requirements',
                    },
                    resourceConstraints: { type: 'object', description: 'Available resources and limits' },
                    optimizationGoal: {
                        type: 'string',
                        enum: ['speed', 'cost', 'reliability', 'balanced'],
                        description: 'Optimization objective',
                    },
                },
                required: ['tasks'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    schedule: { type: 'array', items: { type: 'object' } },
                    parallelGroups: { type: 'array', items: { type: 'array' } },
                    criticalPath: { type: 'array', items: { type: 'string' } },
                    estimatedTotalDurationMs: { type: 'number' },
                },
            },
        },
        {
            name: 'reschedule',
            description: 'Dynamically reschedule based on execution feedback and changing conditions',
            inputSchema: {
                type: 'object',
                properties: {
                    originalSchedule: { type: 'object' },
                    completedTasks: { type: 'array', items: { type: 'string' } },
                    failedTasks: { type: 'array', items: { type: 'string' } },
                    newTasks: { type: 'array', items: { type: 'object' } },
                    resourceChanges: { type: 'object' },
                },
                required: ['originalSchedule'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    updatedSchedule: { type: 'object' },
                    rescheduleReason: { type: 'string' },
                    impactAssessment: { type: 'object' },
                },
            },
        },
        {
            name: 'optimizeParallelism',
            description: 'Analyze task dependencies and maximize parallel execution opportunities',
            inputSchema: {
                type: 'object',
                properties: {
                    tasks: { type: 'array', items: { type: 'object' } },
                    maxConcurrency: { type: 'number' },
                },
                required: ['tasks'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    parallelBatches: { type: 'array', items: { type: 'object' } },
                    estimatedSpeedup: { type: 'number' },
                    bottlenecks: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:schedule',
        'write:schedule',
        'manage:resources',
        'read:agents',
    ],
    maxConcurrentTasks: 5,
    timeout: 90000,
    retryPolicy: { maxRetries: 2, backoffMs: 2500, exponentialBackoff: true },
};
let DynamicSchedulerAgentService = class DynamicSchedulerAgentService extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
        this.scheduleHistory = new Map();
    }
    defineConfig() {
        return exports.DYNAMIC_SCHEDULER_AGENT_CONFIG;
    }
    async onInitialize() {
        this.logger.log('Dynamic Scheduler agent initialized');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { tasks, resourceConstraints, optimizationGoal, action } = input.payload;
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: `You are a dynamic task scheduler for an AI agent platform. Given a set of tasks with dependencies and resource requirements, create an optimal execution schedule. Consider: task priority, dependency chains, resource availability, estimated duration, and failure risk. Output JSON with: schedule (array of {batch: number, tasks: [{taskId, capability, parameters}]}), parallelGroups, criticalPath, estimatedTotalDurationMs, resourceUtilization.`,
                    userPrompt: `Schedule these tasks:\nTasks: ${JSON.stringify(tasks || [])}\nResource constraints: ${JSON.stringify(resourceConstraints || {})}\nOptimization goal: ${optimizationGoal || 'balanced'}\nAction: ${action || 'createSchedule'}`,
                    temperature: 0.2,
                    maxTokens: 4096,
                });
                const schedule = this.parseSchedule(llmResult.content);
                this.scheduleHistory.set(input.taskId, schedule);
                await this.storeInWorkingMemory('dynamic-scheduler:last-schedule', { tasks, schedule, timestamp: new Date() }, 300000);
                return this.createAgentOutput(input.taskId, true, {
                    schedule,
                    rawAnalysis: llmResult.content,
                    costUsd: llmResult.costUsd,
                }, undefined, startTime);
            }
            catch (error) {
                this.logger.warn(`LLM scheduling failed: ${error.message}`);
            }
        }
        const fallbackSchedule = this.buildFallbackSchedule(tasks || [], optimizationGoal || 'balanced');
        this.scheduleHistory.set(input.taskId, fallbackSchedule);
        return this.createAgentOutput(input.taskId, true, { schedule: fallbackSchedule }, undefined, startTime);
    }
    parseSchedule(content) {
        try {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return {
                    schedule: parsed.schedule || [],
                    parallelGroups: parsed.parallelGroups || [],
                    criticalPath: parsed.criticalPath || [],
                    estimatedTotalDurationMs: parsed.estimatedTotalDurationMs || 0,
                    resourceUtilization: parsed.resourceUtilization,
                };
            }
            return {
                schedule: [],
                parallelGroups: [],
                criticalPath: [],
                estimatedTotalDurationMs: 0,
                raw: content,
            };
        }
        catch {
            return {
                schedule: [],
                parallelGroups: [],
                criticalPath: [],
                estimatedTotalDurationMs: 0,
                raw: content,
            };
        }
    }
    buildFallbackSchedule(tasks, optimizationGoal) {
        if (tasks.length === 0) {
            return {
                schedule: [],
                parallelGroups: [],
                criticalPath: [],
                estimatedTotalDurationMs: 0,
            };
        }
        const taskMap = new Map();
        const inDegree = new Map();
        const dependents = new Map();
        for (const task of tasks) {
            taskMap.set(task.taskId, task);
            inDegree.set(task.taskId, 0);
            dependents.set(task.taskId, []);
        }
        for (const task of tasks) {
            const deps = task.dependsOn || [];
            inDegree.set(task.taskId, deps.length);
            for (const dep of deps) {
                if (dependents.has(dep)) {
                    dependents.get(dep).push(task.taskId);
                }
            }
        }
        const schedule = [];
        const parallelGroups = [];
        const completed = new Set();
        let batch = 0;
        while (completed.size < tasks.length) {
            const readyTasks = [];
            for (const [taskId, degree] of inDegree.entries()) {
                if (degree === 0 && !completed.has(taskId)) {
                    readyTasks.push(taskId);
                }
            }
            if (readyTasks.length === 0) {
                for (const [taskId] of inDegree.entries()) {
                    if (!completed.has(taskId)) {
                        const task = taskMap.get(taskId);
                        if (task) {
                            schedule.push({
                                batch: batch++,
                                tasks: [
                                    { taskId: task.taskId, capability: task.capability, parameters: task.parameters },
                                ],
                            });
                            completed.add(taskId);
                        }
                    }
                }
                break;
            }
            const sorted = readyTasks.sort((a, b) => {
                const taskA = taskMap.get(a);
                const taskB = taskMap.get(b);
                const priDiff = (taskB.priority || 1) - (taskA.priority || 1);
                if (priDiff !== 0)
                    return priDiff;
                if (optimizationGoal === 'speed') {
                    return (taskA.estimatedDurationMs || 5000) - (taskB.estimatedDurationMs || 5000);
                }
                return 0;
            });
            const batchTasks = sorted.map((id) => {
                const task = taskMap.get(id);
                return { taskId: task.taskId, capability: task.capability, parameters: task.parameters };
            });
            schedule.push({ batch, tasks: batchTasks });
            parallelGroups.push(sorted);
            for (const taskId of sorted) {
                completed.add(taskId);
                for (const dep of dependents.get(taskId) || []) {
                    inDegree.set(dep, (inDegree.get(dep) || 1) - 1);
                }
            }
            batch++;
        }
        const criticalPath = this.computeCriticalPath(tasks, taskMap);
        let totalDuration = 0;
        for (const s of schedule) {
            const maxBatchDuration = Math.max(...s.tasks.map((t) => taskMap.get(t.taskId)?.estimatedDurationMs || 5000));
            totalDuration += maxBatchDuration;
        }
        return {
            schedule,
            parallelGroups,
            criticalPath,
            estimatedTotalDurationMs: totalDuration,
            resourceUtilization: this.computeResourceUtilization(schedule, taskMap),
        };
    }
    computeCriticalPath(tasks, taskMap) {
        const cache = new Map();
        const dfs = (taskId) => {
            if (cache.has(taskId))
                return cache.get(taskId);
            const task = taskMap.get(taskId);
            if (!task || !task.dependsOn || task.dependsOn.length === 0) {
                cache.set(taskId, [taskId]);
                return [taskId];
            }
            let longest = [];
            for (const dep of task.dependsOn) {
                const path = dfs(dep);
                if (path.length > longest.length) {
                    longest = path;
                }
            }
            const result = [...longest, taskId];
            cache.set(taskId, result);
            return result;
        };
        let overallLongest = [];
        for (const task of tasks) {
            const path = dfs(task.taskId);
            if (path.length > overallLongest.length) {
                overallLongest = path;
            }
        }
        return overallLongest;
    }
    computeResourceUtilization(schedule, taskMap) {
        const utilization = {};
        for (const batch of schedule) {
            const batchResources = {};
            for (const t of batch.tasks) {
                const task = taskMap.get(t.taskId);
                if (task?.resourceRequirements) {
                    for (const [resource, amount] of Object.entries(task.resourceRequirements)) {
                        batchResources[resource] = (batchResources[resource] || 0) + amount;
                    }
                }
            }
            for (const [resource, amount] of Object.entries(batchResources)) {
                utilization[resource] = Math.max(utilization[resource] || 0, amount);
            }
        }
        return utilization;
    }
    async onDestroy() {
        this.scheduleHistory.clear();
        this.logger.log('Dynamic Scheduler agent destroyed, schedule history cleared');
    }
};
exports.DynamicSchedulerAgentService = DynamicSchedulerAgentService;
exports.DynamicSchedulerAgentService = DynamicSchedulerAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], DynamicSchedulerAgentService);
//# sourceMappingURL=dynamic-scheduler-agent.service.js.map