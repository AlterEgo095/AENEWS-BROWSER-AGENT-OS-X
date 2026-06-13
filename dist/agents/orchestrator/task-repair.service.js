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
var TaskRepairService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRepairService = exports.RepairStrategy = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const agent_interface_1 = require("../interfaces/agent.interface");
const task_critic_service_1 = require("./task-critic.service");
const task_planner_service_1 = require("./task-planner.service");
const bridge_1 = require("../bridge");
var RepairStrategy;
(function (RepairStrategy) {
    RepairStrategy["RETRY"] = "retry";
    RepairStrategy["REASSIGN"] = "reassign";
    RepairStrategy["SIMPLIFY"] = "simplify";
    RepairStrategy["DECOMPOSE_FURTHER"] = "decompose_further";
    RepairStrategy["FALLBACK"] = "fallback";
    RepairStrategy["SKIP"] = "skip";
})(RepairStrategy || (exports.RepairStrategy = RepairStrategy = {}));
const DEFAULT_REPAIR_CONFIG = {
    maxRepairIterations: 3,
    maxRetryPerStep: 3,
    enableReassignment: true,
    enableSimplification: true,
    enableDecomposition: true,
    enableFallback: true,
    trackHistory: true,
};
let TaskRepairService = TaskRepairService_1 = class TaskRepairService {
    constructor(plannerService, bridge) {
        this.plannerService = plannerService;
        this.bridge = bridge;
        this.logger = new common_1.Logger(TaskRepairService_1.name);
        this.config = { ...DEFAULT_REPAIR_CONFIG };
        this.repairHistory = new Map();
    }
    async repair(results, critique, request) {
        const startTime = Date.now();
        this.logger.log(`Repairing ${critique.issues.length} issues from ${results.length} results`);
        if (this.bridge) {
            try {
                const llmResult = await this.llmRepair(results, critique, request);
                if (llmResult) {
                    this.logger.log(`LLM repair completed: ${llmResult.repairedSteps.length} repaired, ` +
                        `${llmResult.failedRepairs.length} failed in ${Date.now() - startTime}ms`);
                    return llmResult;
                }
            }
            catch (error) {
                this.logger.warn(`LLM repair failed, falling back to rule-based: ${error.message}`);
            }
        }
        const repairedSteps = [];
        const failedRepairs = [];
        const repairedPlanSteps = [];
        const historyEntries = [];
        const taskId = request.taskId || 'unknown';
        const existingHistory = this.repairHistory.get(taskId) || [];
        const currentIteration = existingHistory.length + 1;
        if (currentIteration > this.config.maxRepairIterations) {
            this.logger.warn(`Max repair iterations (${this.config.maxRepairIterations}) reached for task ${taskId}`);
            return {
                repairedPlan: null,
                repairedSteps: [],
                failedRepairs: critique.issues.map((i) => i.stepId),
                error: 'Max repair iterations reached',
                history: existingHistory,
            };
        }
        const issuesByStrategy = this.categorizeIssues(critique.issues);
        for (const [strategy, issues] of issuesByStrategy) {
            for (const issue of issues) {
                const relatedResult = results.find((r) => r.stepId === issue.stepId);
                const stepRetryCount = existingHistory.filter((h) => h.stepId === issue.stepId && h.strategy === RepairStrategy.RETRY).length;
                if (strategy === RepairStrategy.RETRY && stepRetryCount >= this.config.maxRetryPerStep) {
                    failedRepairs.push(issue.stepId);
                    this.logger.warn(`Step ${issue.stepId} has exceeded max retry count (${this.config.maxRetryPerStep})`);
                    continue;
                }
                try {
                    const repairedStep = await this.applyRepairStrategy(strategy, issue, relatedResult, request, currentIteration);
                    if (repairedStep) {
                        repairedPlanSteps.push(repairedStep);
                        repairedSteps.push(issue.stepId);
                        this.logger.log(`Repaired step ${issue.stepId} using ${strategy} strategy`);
                        const historyEntry = {
                            stepId: issue.stepId,
                            strategy,
                            timestamp: new Date(),
                            attemptNumber: currentIteration,
                            success: true,
                            previousError: issue.message,
                        };
                        historyEntries.push(historyEntry);
                    }
                    else {
                        failedRepairs.push(issue.stepId);
                        this.logger.warn(`Failed to repair step ${issue.stepId} using ${strategy} strategy`);
                        const historyEntry = {
                            stepId: issue.stepId,
                            strategy,
                            timestamp: new Date(),
                            attemptNumber: currentIteration,
                            success: false,
                            error: `Repair strategy ${strategy} returned null`,
                            previousError: issue.message,
                        };
                        historyEntries.push(historyEntry);
                    }
                }
                catch (error) {
                    failedRepairs.push(issue.stepId);
                    this.logger.error(`Error repairing step ${issue.stepId}: ${error.message}`);
                    const historyEntry = {
                        stepId: issue.stepId,
                        strategy,
                        timestamp: new Date(),
                        attemptNumber: currentIteration,
                        success: false,
                        error: error.message,
                        previousError: issue.message,
                    };
                    historyEntries.push(historyEntry);
                }
            }
        }
        if (this.config.trackHistory) {
            const updatedHistory = [...existingHistory, ...historyEntries];
            this.repairHistory.set(taskId, updatedHistory);
        }
        let repairedPlan = null;
        if (repairedPlanSteps.length > 0) {
            const allSteps = this.mergeRepairedSteps(results, repairedPlanSteps);
            repairedPlan = {
                id: (0, uuid_1.v4)(),
                taskId: taskId,
                steps: allSteps,
                dependencies: this.rebuildDependencies(allSteps),
                createdAt: new Date(),
                estimatedDurationMs: this.estimateRepairedDuration(allSteps),
            };
        }
        this.logger.log(`Repair completed: ${repairedSteps.length} repaired, ` +
            `${failedRepairs.length} failed in ${Date.now() - startTime}ms`);
        return {
            repairedPlan,
            repairedSteps,
            failedRepairs,
            error: failedRepairs.length > 0
                ? `${failedRepairs.length} step(s) could not be repaired`
                : undefined,
            history: historyEntries,
        };
    }
    async llmRepair(results, critique, request) {
        if (!this.bridge) {
            return null;
        }
        const userPrompt = JSON.stringify({
            failedResults: results
                .filter((r) => !r.success)
                .map((r) => ({
                stepId: r.stepId,
                error: r.output.error,
                retryCount: r.retryCount,
                executionTimeMs: r.executionTimeMs,
            })),
            critique: {
                passed: critique.passed,
                score: critique.score,
                issues: critique.issues.map((i) => ({
                    stepId: i.stepId,
                    severity: i.severity,
                    category: i.category,
                    message: i.message,
                    autoRepairable: i.autoRepairable,
                })),
            },
            requestPayload: request.payload,
            requestContext: request.context,
        });
        const result = await this.bridge.callLLM({
            systemPrompt: 'You are an expert repair strategist. Given failed execution results and critique, determine the best repair approach. ' +
                'Output JSON: {repairedSteps: [{stepId, strategy, modifiedParameters}], failedRepairs: [], overallStrategy: string}',
            userPrompt,
            temperature: 0.3,
            maxTokens: 4096,
        });
        const parsed = JSON.parse(result.content);
        const repairedSteps = (parsed.repairedSteps || []).map((s) => s.stepId);
        const failedRepairs = parsed.failedRepairs || [];
        const repairedPlanSteps = (parsed.repairedSteps || []).map((step, index) => ({
            id: (0, uuid_1.v4)(),
            order: index,
            status: agent_interface_1.TaskStatus.PENDING,
            retryCount: 0,
            input: {
                taskId: step.stepId || (0, uuid_1.v4)(),
                payload: step.modifiedParameters || request.payload,
                context: {
                    isRetry: true,
                    repairStrategy: step.strategy,
                    llmRepair: true,
                },
            },
        }));
        let repairedPlan = null;
        if (repairedPlanSteps.length > 0) {
            repairedPlan = {
                id: (0, uuid_1.v4)(),
                taskId: request.taskId || 'unknown',
                steps: repairedPlanSteps,
                dependencies: [],
                createdAt: new Date(),
                estimatedDurationMs: repairedPlanSteps.length * 5000,
            };
        }
        return {
            repairedPlan,
            repairedSteps,
            failedRepairs,
            error: failedRepairs.length > 0
                ? `${failedRepairs.length} step(s) could not be repaired`
                : undefined,
            history: [],
        };
    }
    getRepairHistory(taskId) {
        return this.repairHistory.get(taskId) || [];
    }
    clearRepairHistory(taskId) {
        this.repairHistory.delete(taskId);
    }
    getRepairIterationCount(taskId) {
        return (this.repairHistory.get(taskId) || []).length;
    }
    categorizeIssues(issues) {
        const categorized = new Map();
        for (const issue of issues) {
            const strategy = this.selectRepairStrategy(issue);
            const existing = categorized.get(strategy) || [];
            existing.push(issue);
            categorized.set(strategy, existing);
        }
        return categorized;
    }
    selectRepairStrategy(issue) {
        if (!issue.autoRepairable) {
            if (issue.severity === 'critical') {
                return RepairStrategy.SKIP;
            }
            return this.config.enableFallback ? RepairStrategy.FALLBACK : RepairStrategy.SKIP;
        }
        switch (issue.category) {
            case task_critic_service_1.CritiqueCategory.ERROR_HANDLING:
                if (issue.severity === 'error') {
                    return RepairStrategy.RETRY;
                }
                return this.config.enableReassignment ? RepairStrategy.REASSIGN : RepairStrategy.RETRY;
            case task_critic_service_1.CritiqueCategory.PERFORMANCE:
                return this.config.enableSimplification ? RepairStrategy.SIMPLIFY : RepairStrategy.RETRY;
            case task_critic_service_1.CritiqueCategory.COMPLETENESS:
                return this.config.enableDecomposition
                    ? RepairStrategy.DECOMPOSE_FURTHER
                    : RepairStrategy.RETRY;
            case task_critic_service_1.CritiqueCategory.CONSISTENCY:
                return RepairStrategy.RETRY;
            case task_critic_service_1.CritiqueCategory.ACCURACY:
                return RepairStrategy.RETRY;
            case task_critic_service_1.CritiqueCategory.DATA_QUALITY:
                return RepairStrategy.RETRY;
            case task_critic_service_1.CritiqueCategory.COMPLIANCE:
                return this.config.enableFallback ? RepairStrategy.FALLBACK : RepairStrategy.SKIP;
            default:
                return RepairStrategy.RETRY;
        }
    }
    async applyRepairStrategy(strategy, issue, relatedResult, request, iteration) {
        switch (strategy) {
            case RepairStrategy.RETRY:
                return this.retryStep(issue, relatedResult, request, iteration);
            case RepairStrategy.REASSIGN:
                return this.reassignStep(issue, relatedResult, request);
            case RepairStrategy.SIMPLIFY:
                return this.simplifyStep(issue, relatedResult, request);
            case RepairStrategy.DECOMPOSE_FURTHER:
                return this.decomposeStep(issue, relatedResult, request);
            case RepairStrategy.FALLBACK:
                return this.fallbackStep(issue, relatedResult, request);
            case RepairStrategy.SKIP:
                return null;
            default:
                return null;
        }
    }
    retryStep(issue, relatedResult, request, iteration) {
        const baseStep = relatedResult
            ? this.resultToStep(relatedResult)
            : this.createDefaultStep(issue, request);
        return {
            ...baseStep,
            id: (0, uuid_1.v4)(),
            status: agent_interface_1.TaskStatus.PENDING,
            retryCount: (relatedResult?.retryCount || 0) + 1,
            input: {
                ...baseStep.input,
                context: {
                    ...baseStep.input.context,
                    isRetry: true,
                    retryReason: issue.message,
                    previousError: relatedResult?.output.error,
                    repairStrategy: RepairStrategy.RETRY,
                    repairIteration: iteration,
                },
            },
        };
    }
    reassignStep(issue, relatedResult, request) {
        const baseStep = relatedResult
            ? this.resultToStep(relatedResult)
            : this.createDefaultStep(issue, request);
        return {
            ...baseStep,
            id: (0, uuid_1.v4)(),
            agentId: undefined,
            status: agent_interface_1.TaskStatus.PENDING,
            retryCount: 0,
            input: {
                ...baseStep.input,
                context: {
                    ...baseStep.input.context,
                    isReassignment: true,
                    previousAgentId: relatedResult?.agentId,
                    reassignmentReason: issue.message,
                    repairStrategy: RepairStrategy.REASSIGN,
                },
            },
        };
    }
    simplifyStep(issue, relatedResult, request) {
        const baseStep = relatedResult
            ? this.resultToStep(relatedResult)
            : this.createDefaultStep(issue, request);
        const simplifiedPayload = this.simplifyPayload(baseStep.input.payload);
        return {
            ...baseStep,
            id: (0, uuid_1.v4)(),
            status: agent_interface_1.TaskStatus.PENDING,
            retryCount: 0,
            input: {
                ...baseStep.input,
                payload: simplifiedPayload,
                context: {
                    ...baseStep.input.context,
                    isSimplified: true,
                    simplificationReason: issue.message,
                    originalPayload: baseStep.input.payload,
                    repairStrategy: RepairStrategy.SIMPLIFY,
                },
            },
        };
    }
    decomposeStep(issue, relatedResult, request) {
        const baseStep = relatedResult
            ? this.resultToStep(relatedResult)
            : this.createDefaultStep(issue, request);
        return {
            ...baseStep,
            id: (0, uuid_1.v4)(),
            status: agent_interface_1.TaskStatus.PENDING,
            retryCount: 0,
            input: {
                ...baseStep.input,
                context: {
                    ...baseStep.input.context,
                    requiresFurtherDecomposition: true,
                    decomposeReason: issue.message,
                    repairStrategy: RepairStrategy.DECOMPOSE_FURTHER,
                },
            },
        };
    }
    fallbackStep(issue, relatedResult, request) {
        const baseStep = relatedResult
            ? this.resultToStep(relatedResult)
            : this.createDefaultStep(issue, request);
        return {
            ...baseStep,
            id: (0, uuid_1.v4)(),
            status: agent_interface_1.TaskStatus.PENDING,
            retryCount: 0,
            input: {
                ...baseStep.input,
                payload: request.payload,
                context: {
                    ...baseStep.input.context,
                    isFallback: true,
                    fallbackReason: issue.message,
                    repairStrategy: RepairStrategy.FALLBACK,
                },
            },
        };
    }
    resultToStep(result) {
        return {
            id: result.stepId,
            order: result.stepOrder,
            agentId: result.agentId,
            input: {
                taskId: result.output.taskId,
                payload: result.output.result,
                context: {},
            },
            status: agent_interface_1.TaskStatus.PENDING,
            retryCount: result.retryCount,
        };
    }
    createDefaultStep(issue, request) {
        return {
            id: issue.stepId,
            order: 0,
            cluster: request.cluster,
            input: {
                taskId: (0, uuid_1.v4)(),
                payload: request.payload,
                context: { ...request.context },
            },
            status: agent_interface_1.TaskStatus.PENDING,
            retryCount: 0,
        };
    }
    simplifyPayload(payload) {
        if (typeof payload !== 'object' || payload === null) {
            return payload;
        }
        if (Array.isArray(payload)) {
            return payload.length > 3 ? payload.slice(0, 3) : payload;
        }
        const simplified = {};
        const keys = Object.keys(payload);
        const importantKeys = keys.filter((k) => !/optional|extra|metadata|debug/i.test(k));
        for (const key of importantKeys.slice(0, 10)) {
            simplified[key] = payload[key];
        }
        return simplified;
    }
    mergeRepairedSteps(results, repairedSteps) {
        const repairedMap = new Map(repairedSteps.map((s) => [s.id, s]));
        const allSteps = [];
        for (const step of repairedSteps) {
            allSteps.push(step);
        }
        for (const result of results) {
            if (result.success && !repairedMap.has(result.stepId)) {
                allSteps.push({
                    id: result.stepId,
                    order: result.stepOrder,
                    agentId: result.agentId,
                    input: {
                        taskId: result.output.taskId,
                        payload: result.output.result,
                    },
                    status: agent_interface_1.TaskStatus.COMPLETED,
                    output: result.output,
                    retryCount: result.retryCount,
                });
            }
        }
        allSteps.sort((a, b) => a.order - b.order);
        for (let i = 0; i < allSteps.length; i++) {
            allSteps[i].order = i;
        }
        return allSteps;
    }
    rebuildDependencies(steps) {
        const dependencies = [];
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const deps = [];
            if (step.status === agent_interface_1.TaskStatus.PENDING && i > 0) {
                const prevCompleted = steps
                    .slice(0, i)
                    .filter((s) => s.status === agent_interface_1.TaskStatus.COMPLETED)
                    .map((s) => s.id);
                if (prevCompleted.length > 0) {
                    deps.push(prevCompleted[prevCompleted.length - 1]);
                }
            }
            dependencies.push({
                stepId: step.id,
                dependsOnStepIds: deps,
            });
        }
        return dependencies;
    }
    estimateRepairedDuration(steps) {
        let total = 0;
        for (const step of steps) {
            if (step.status === agent_interface_1.TaskStatus.COMPLETED) {
                total += 0;
            }
            else {
                total += step.input.context?.estimatedDurationMs || 5000;
            }
        }
        return total;
    }
};
exports.TaskRepairService = TaskRepairService;
exports.TaskRepairService = TaskRepairService = TaskRepairService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [task_planner_service_1.TaskPlannerService,
        bridge_1.AgentConnectorBridge])
], TaskRepairService);
//# sourceMappingURL=task-repair.service.js.map