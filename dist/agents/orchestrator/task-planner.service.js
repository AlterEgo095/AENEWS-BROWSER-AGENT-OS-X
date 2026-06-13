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
var TaskPlannerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskPlannerService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const agent_interface_1 = require("../interfaces/agent.interface");
const agent_registry_service_1 = require("../registry/agent-registry.service");
let TaskPlannerService = TaskPlannerService_1 = class TaskPlannerService {
    constructor(agentRegistry) {
        this.agentRegistry = agentRegistry;
        this.logger = new common_1.Logger(TaskPlannerService_1.name);
    }
    async createPlan(subtasks, request) {
        const startTime = Date.now();
        this.logger.log(`Creating execution plan for ${subtasks.length} subtasks`);
        const constraints = {
            maxParallelSteps: request.context?.maxParallelSteps ?? 10,
            maxTotalDurationMs: request.context?.maxDurationMs ?? 600000,
            requiredCluster: request.cluster,
            respectDependencies: true,
            optimizeForSpeed: request.context?.optimizeForSpeed ?? true,
            maxMemoryPerStepMb: request.context?.maxMemoryPerStepMb ?? 512,
            maxCpuPerStepPercent: request.context?.maxCpuPerStepPercent ?? 80,
            maxAgentLoadPercent: request.context?.maxAgentLoadPercent ?? 90,
        };
        const steps = this.buildSteps(subtasks, request);
        const estimations = this.estimateStepResources(steps);
        const dependencies = this.resolveDependencies(subtasks, steps);
        const optimizedSteps = this.optimizeExecutionOrder(steps, dependencies, constraints);
        const warnings = [];
        for (const step of optimizedSteps) {
            if (!step.agentId) {
                const routing = this.agentRegistry.routeTask(step.input, agent_registry_service_1.RoutingStrategy.LEAST_LOADED, step.cluster || request.cluster);
                if (routing) {
                    step.agentId = routing.agentId;
                }
                else {
                    warnings.push(`No available agent for step ${step.id} (cluster: ${step.cluster || 'any'})`);
                }
            }
        }
        const resourceWarnings = this.validateResourceConstraints(optimizedSteps, estimations, constraints);
        warnings.push(...resourceWarnings);
        const estimatedDurationMs = this.estimateDuration(optimizedSteps, dependencies);
        const plan = {
            id: (0, uuid_1.v4)(),
            taskId: subtasks[0]?.parentId || (0, uuid_1.v4)(),
            steps: optimizedSteps,
            dependencies,
            createdAt: new Date(),
            estimatedDurationMs,
        };
        this.logger.log(`Plan created: ${plan.steps.length} steps, ` +
            `estimated ${estimatedDurationMs}ms, ` +
            `took ${Date.now() - startTime}ms to plan`);
        return plan;
    }
    buildSteps(subtasks, request) {
        return subtasks.map((subtask, index) => ({
            id: subtask.id,
            order: index,
            agentId: subtask.agentId,
            cluster: subtask.cluster || request.cluster,
            capability: subtask.metadata?.capability,
            input: subtask.input,
            status: agent_interface_1.TaskStatus.PENDING,
            output: undefined,
            retryCount: 0,
        }));
    }
    estimateStepResources(steps) {
        const estimations = new Map();
        for (const step of steps) {
            const payload = step.input.payload;
            const payloadSize = JSON.stringify(payload).length;
            let estimatedDurationMs = 5000;
            let estimatedMemoryMb = 64;
            let estimatedCpuPercent = 30;
            if (payloadSize > 100000) {
                estimatedDurationMs = 30000;
                estimatedMemoryMb = 256;
                estimatedCpuPercent = 60;
            }
            else if (payloadSize > 10000) {
                estimatedDurationMs = 15000;
                estimatedMemoryMb = 128;
                estimatedCpuPercent = 40;
            }
            if (step.cluster === 'browser') {
                estimatedMemoryMb += 128;
            }
            else if (step.cluster === 'coding') {
                estimatedDurationMs += 10000;
            }
            const contextEstimate = step.input.context?.estimatedDurationMs;
            if (contextEstimate) {
                estimatedDurationMs = contextEstimate;
            }
            const contextMemory = step.input.context?.estimatedMemoryMb;
            if (contextMemory) {
                estimatedMemoryMb = contextMemory;
            }
            const hasDeps = step.input.context?.dependencies;
            const parallelizable = !hasDeps || hasDeps.length === 0;
            estimations.set(step.id, {
                stepId: step.id,
                estimatedDurationMs,
                estimatedMemoryMb,
                estimatedCpuPercent,
                parallelizable,
            });
        }
        return estimations;
    }
    resolveDependencies(subtasks, steps) {
        const dependencies = [];
        const stepMap = new Map(steps.map((s) => [s.id, s]));
        for (const subtask of subtasks) {
            const stepDeps = [];
            const explicitDeps = subtask.metadata?.dependencies;
            if (explicitDeps && Array.isArray(explicitDeps)) {
                for (const dep of explicitDeps) {
                    const depStep = this.findStepByNameOrId(steps, dep);
                    if (depStep) {
                        stepDeps.push(depStep.id);
                    }
                }
            }
            if (subtask.parentId) {
                const parentStep = steps.find((s) => s.id === subtask.parentId);
                if (parentStep) {
                    stepDeps.push(parentStep.id);
                }
            }
            dependencies.push({
                stepId: subtask.id,
                dependsOnStepIds: stepDeps,
            });
        }
        return dependencies;
    }
    findStepByNameOrId(steps, reference) {
        const byId = steps.find((s) => s.id === reference);
        if (byId)
            return byId;
        return steps.find((s) => {
            const name = s.input.context?.stepDescription || s.input.context?.componentName;
            return name === reference;
        });
    }
    optimizeExecutionOrder(steps, dependencies, constraints) {
        const depMap = new Map();
        for (const dep of dependencies) {
            depMap.set(dep.stepId, new Set(dep.dependsOnStepIds));
        }
        const sorted = this.topologicalSort(steps, depMap);
        for (let i = 0; i < sorted.length; i++) {
            sorted[i].order = i;
        }
        const groups = this.groupParallelSteps(sorted, depMap, constraints.maxParallelSteps);
        let order = 0;
        for (const group of groups) {
            for (const step of group) {
                step.order = order++;
            }
        }
        return sorted;
    }
    topologicalSort(steps, depMap) {
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();
        const stepMap = new Map(steps.map((s) => [s.id, s]));
        const visit = (stepId) => {
            if (visited.has(stepId))
                return;
            if (visiting.has(stepId)) {
                this.logger.warn(`Circular dependency detected involving step ${stepId}`);
                visited.add(stepId);
                const step = stepMap.get(stepId);
                if (step)
                    sorted.push(step);
                return;
            }
            visiting.add(stepId);
            const deps = depMap.get(stepId);
            if (deps) {
                for (const depId of deps) {
                    visit(depId);
                }
            }
            visiting.delete(stepId);
            visited.add(stepId);
            const step = stepMap.get(stepId);
            if (step)
                sorted.push(step);
        };
        for (const step of steps) {
            visit(step.id);
        }
        return sorted;
    }
    groupParallelSteps(sortedSteps, depMap, maxParallel) {
        const groups = [];
        const completed = new Set();
        const remaining = [...sortedSteps];
        while (remaining.length > 0) {
            const ready = remaining.filter((step) => {
                const deps = depMap.get(step.id);
                if (!deps || deps.size === 0)
                    return true;
                return Array.from(deps).every((depId) => completed.has(depId));
            });
            if (ready.length === 0) {
                groups.push([remaining.shift()]);
                continue;
            }
            const batch = ready.slice(0, maxParallel);
            groups.push(batch);
            for (const step of batch) {
                completed.add(step.id);
                const idx = remaining.indexOf(step);
                if (idx >= 0)
                    remaining.splice(idx, 1);
            }
        }
        return groups;
    }
    validateResourceConstraints(steps, estimations, constraints) {
        const warnings = [];
        for (const step of steps) {
            const est = estimations.get(step.id);
            if (!est)
                continue;
            if (est.estimatedMemoryMb > constraints.maxMemoryPerStepMb) {
                warnings.push(`Step ${step.id} estimated memory (${est.estimatedMemoryMb}MB) exceeds ` +
                    `limit (${constraints.maxMemoryPerStepMb}MB)`);
            }
            if (est.estimatedCpuPercent > constraints.maxCpuPerStepPercent) {
                warnings.push(`Step ${step.id} estimated CPU (${est.estimatedCpuPercent}%) exceeds ` +
                    `limit (${constraints.maxCpuPerStepPercent}%)`);
            }
        }
        const totalEstimatedDuration = Array.from(estimations.values())
            .reduce((sum, est) => sum + est.estimatedDurationMs, 0);
        if (totalEstimatedDuration > constraints.maxTotalDurationMs) {
            warnings.push(`Total estimated duration (${totalEstimatedDuration}ms) exceeds ` +
                `limit (${constraints.maxTotalDurationMs}ms)`);
        }
        return warnings;
    }
    estimateDuration(steps, dependencies) {
        const depMap = new Map();
        for (const dep of dependencies) {
            depMap.set(dep.stepId, new Set(dep.dependsOnStepIds));
        }
        const stepDurations = new Map();
        for (const step of steps) {
            stepDurations.set(step.id, step.input.context?.estimatedDurationMs || 5000);
        }
        const earliestCompletion = new Map();
        const calculateECT = (stepId) => {
            if (earliestCompletion.has(stepId)) {
                return earliestCompletion.get(stepId);
            }
            const deps = depMap.get(stepId);
            let maxDepCompletion = 0;
            if (deps && deps.size > 0) {
                for (const depId of deps) {
                    maxDepCompletion = Math.max(maxDepCompletion, calculateECT(depId));
                }
            }
            const duration = stepDurations.get(stepId) || 5000;
            const ect = maxDepCompletion + duration;
            earliestCompletion.set(stepId, ect);
            return ect;
        };
        let maxCompletion = 0;
        for (const step of steps) {
            maxCompletion = Math.max(maxCompletion, calculateECT(step.id));
        }
        return maxCompletion;
    }
};
exports.TaskPlannerService = TaskPlannerService;
exports.TaskPlannerService = TaskPlannerService = TaskPlannerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], TaskPlannerService);
//# sourceMappingURL=task-planner.service.js.map