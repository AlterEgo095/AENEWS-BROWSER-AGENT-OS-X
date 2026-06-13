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
var TaskDecomposerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDecomposerService = exports.TaskComplexity = exports.DecompositionStrategy = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const agent_interface_1 = require("../interfaces/agent.interface");
const memory_service_1 = require("../memory/memory.service");
var DecompositionStrategy;
(function (DecompositionStrategy) {
    DecompositionStrategy["SEQUENTIAL"] = "sequential";
    DecompositionStrategy["PARALLEL"] = "parallel";
    DecompositionStrategy["HYBRID"] = "hybrid";
    DecompositionStrategy["CONDITIONAL"] = "conditional";
})(DecompositionStrategy || (exports.DecompositionStrategy = DecompositionStrategy = {}));
var TaskComplexity;
(function (TaskComplexity) {
    TaskComplexity["TRIVIAL"] = "trivial";
    TaskComplexity["SIMPLE"] = "simple";
    TaskComplexity["MODERATE"] = "moderate";
    TaskComplexity["COMPLEX"] = "complex";
    TaskComplexity["HIGHLY_COMPLEX"] = "highly_complex";
})(TaskComplexity || (exports.TaskComplexity = TaskComplexity = {}));
const DEFAULT_DECOMPOSITION_CONFIG = {
    maxRecursionDepth: 3,
    maxSubtasksPerLevel: 20,
    minSubtaskComplexity: TaskComplexity.MODERATE,
    enableRecursiveDecomposition: true,
    enableHistoricalLookup: true,
};
let TaskDecomposerService = TaskDecomposerService_1 = class TaskDecomposerService {
    constructor(memoryService) {
        this.memoryService = memoryService;
        this.logger = new common_1.Logger(TaskDecomposerService_1.name);
        this.config = { ...DEFAULT_DECOMPOSITION_CONFIG };
    }
    async decompose(input) {
        const startTime = Date.now();
        this.logger.log(`Decomposing task ${input.taskId}`);
        try {
            let subtasks;
            if (this.config.enableHistoricalLookup) {
                const historicalDecomposition = await this.findHistoricalDecomposition(input);
                if (historicalDecomposition) {
                    this.logger.log(`Found historical decomposition for task similar to ${input.taskId}`);
                    subtasks = this.adaptHistoricalDecomposition(input, historicalDecomposition);
                }
                else {
                    const complexity = this.assessComplexity(input);
                    const strategy = this.selectStrategy(complexity, input);
                    subtasks = this.performDecomposition(input, strategy, complexity);
                }
            }
            else {
                const complexity = this.assessComplexity(input);
                const strategy = this.selectStrategy(complexity, input);
                subtasks = this.performDecomposition(input, strategy, complexity);
            }
            if (this.config.enableRecursiveDecomposition) {
                subtasks = await this.recursiveDecompose(subtasks, 1);
            }
            const enrichedSubtasks = subtasks.map((subtask) => ({
                ...subtask,
                parentId: input.taskId,
                createdAt: new Date(),
                updatedAt: new Date(),
            }));
            const limitedSubtasks = enrichedSubtasks.slice(0, this.config.maxSubtasksPerLevel);
            await this.storeDecomposition(input, limitedSubtasks);
            this.logger.log(`Decomposed task ${input.taskId} into ${limitedSubtasks.length} subtasks ` +
                `in ${Date.now() - startTime}ms`);
            return limitedSubtasks;
        }
        catch (error) {
            this.logger.error(`Failed to decompose task ${input.taskId}: ${error.message}`);
            return [this.createSingleSubtask(input)];
        }
    }
    async decomposeSubtask(subtask, depth = 1) {
        if (depth > this.config.maxRecursionDepth) {
            return [subtask];
        }
        const input = {
            taskId: subtask.id,
            payload: subtask.input.payload,
            context: subtask.input.context,
            parentTaskId: subtask.parentId,
            priority: subtask.priority,
        };
        const complexity = this.assessComplexity(input);
        if (this.getComplexityScore(complexity) < this.getComplexityScore(this.config.minSubtaskComplexity)) {
            return [subtask];
        }
        const strategy = this.selectStrategy(complexity, input);
        const childSubtasks = this.performDecomposition(input, strategy, complexity);
        const enriched = childSubtasks.map((child, index) => ({
            ...child,
            parentId: subtask.id,
            metadata: {
                ...child.metadata,
                recursionDepth: depth,
                siblingIndex: index,
            },
        }));
        return enriched;
    }
    assessComplexity(input) {
        const payloadStr = JSON.stringify(input.payload);
        const payloadSize = payloadStr.length;
        const hasMultipleSteps = input.context?.steps && Array.isArray(input.context.steps);
        const stepCount = hasMultipleSteps ? input.context?.steps?.length || 0 : 0;
        const hasDependencies = input.context?.dependencies?.length > 0;
        const requiresMultipleClusters = input.context?.clusters?.length > 1;
        let score = 0;
        if (payloadSize > 10000)
            score += 2;
        else if (payloadSize > 1000)
            score += 1;
        if (stepCount > 5)
            score += 3;
        else if (stepCount > 2)
            score += 2;
        else if (stepCount > 0)
            score += 1;
        if (hasDependencies)
            score += 2;
        if (requiresMultipleClusters)
            score += 2;
        if (input.context?.requiresValidation)
            score += 1;
        if (input.context?.requiresRepair)
            score += 1;
        if (score >= 8)
            return TaskComplexity.HIGHLY_COMPLEX;
        if (score >= 6)
            return TaskComplexity.COMPLEX;
        if (score >= 4)
            return TaskComplexity.MODERATE;
        if (score >= 2)
            return TaskComplexity.SIMPLE;
        return TaskComplexity.TRIVIAL;
    }
    selectStrategy(complexity, input) {
        const hasDependencies = input.context?.dependencies?.length > 0;
        const hasConditionalLogic = input.context?.conditions?.length > 0;
        if (hasConditionalLogic) {
            return DecompositionStrategy.CONDITIONAL;
        }
        if (hasDependencies) {
            return DecompositionStrategy.HYBRID;
        }
        switch (complexity) {
            case TaskComplexity.TRIVIAL:
            case TaskComplexity.SIMPLE:
                return DecompositionStrategy.SEQUENTIAL;
            case TaskComplexity.MODERATE:
                return DecompositionStrategy.PARALLEL;
            case TaskComplexity.COMPLEX:
            case TaskComplexity.HIGHLY_COMPLEX:
                return DecompositionStrategy.HYBRID;
            default:
                return DecompositionStrategy.SEQUENTIAL;
        }
    }
    identifyDependencies(subtasks) {
        const dependencies = new Map();
        for (const subtask of subtasks) {
            const deps = [];
            const explicitDeps = subtask.metadata?.dependencies;
            if (explicitDeps && Array.isArray(explicitDeps)) {
                deps.push(...explicitDeps);
            }
            for (const other of subtasks) {
                if (other.id === subtask.id)
                    continue;
                if (this.hasDataDependency(subtask, other)) {
                    deps.push(other.id);
                }
            }
            dependencies.set(subtask.id, deps);
        }
        return dependencies;
    }
    determineExecutionOrder(subtasks, dependencies) {
        const order = [];
        const completed = new Set();
        const remaining = new Set(subtasks.map((s) => s.id));
        while (remaining.size > 0) {
            const ready = [];
            for (const taskId of remaining) {
                const deps = dependencies.get(taskId) || [];
                if (deps.every((dep) => completed.has(dep))) {
                    ready.push(taskId);
                }
            }
            if (ready.length === 0) {
                this.logger.warn('Circular dependency detected, force-resolving');
                order.push(Array.from(remaining));
                break;
            }
            order.push(ready);
            for (const taskId of ready) {
                completed.add(taskId);
                remaining.delete(taskId);
            }
        }
        return order;
    }
    async recursiveDecompose(subtasks, depth) {
        if (depth > this.config.maxRecursionDepth) {
            return subtasks;
        }
        const result = [];
        for (const subtask of subtasks) {
            const complexity = this.assessComplexity(subtask.input);
            if (this.getComplexityScore(complexity) >= this.getComplexityScore(this.config.minSubtaskComplexity)) {
                const childSubtasks = await this.decomposeSubtask(subtask, depth);
                result.push(...childSubtasks);
            }
            else {
                result.push(subtask);
            }
        }
        return result;
    }
    getComplexityScore(complexity) {
        switch (complexity) {
            case TaskComplexity.TRIVIAL: return 0;
            case TaskComplexity.SIMPLE: return 1;
            case TaskComplexity.MODERATE: return 2;
            case TaskComplexity.COMPLEX: return 3;
            case TaskComplexity.HIGHLY_COMPLEX: return 4;
            default: return 0;
        }
    }
    performDecomposition(input, strategy, complexity) {
        const subtasks = [];
        const payload = input.payload;
        if (payload.steps && Array.isArray(payload.steps)) {
            for (let i = 0; i < payload.steps.length; i++) {
                const step = payload.steps[i];
                subtasks.push(this.createSubtaskFromStep(input, step, i));
            }
        }
        else if (payload.operations && Array.isArray(payload.operations)) {
            for (let i = 0; i < payload.operations.length; i++) {
                const op = payload.operations[i];
                subtasks.push(this.createSubtaskFromOperation(input, op, i));
            }
        }
        else if (payload.tasks && Array.isArray(payload.tasks)) {
            for (let i = 0; i < payload.tasks.length; i++) {
                const task = payload.tasks[i];
                subtasks.push(this.createSubtaskFromStep(input, task, i));
            }
        }
        else if (complexity === TaskComplexity.TRIVIAL || complexity === TaskComplexity.SIMPLE) {
            subtasks.push(this.createSingleSubtask(input));
        }
        else {
            subtasks.push(...this.analyzeAndDecompose(input, strategy));
        }
        if (subtasks.length === 0) {
            subtasks.push(this.createSingleSubtask(input));
        }
        return subtasks;
    }
    createSubtaskFromStep(parentInput, step, index) {
        return {
            id: (0, uuid_1.v4)(),
            parentId: parentInput.taskId,
            agentId: step.agentId,
            cluster: step.cluster,
            status: agent_interface_1.TaskStatus.PENDING,
            priority: step.priority || parentInput.priority || agent_interface_1.TaskPriority.NORMAL,
            input: {
                taskId: (0, uuid_1.v4)(),
                payload: step.payload || step,
                context: {
                    ...parentInput.context,
                    stepIndex: index,
                    stepDescription: step.description || `Step ${index + 1}`,
                },
                parentTaskId: parentInput.taskId,
                priority: step.priority || parentInput.priority || agent_interface_1.TaskPriority.NORMAL,
            },
            subtasks: [],
            retryCount: 0,
            maxRetries: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
            correlationId: parentInput.context?.correlationId || (0, uuid_1.v4)(),
            metadata: {
                stepIndex: index,
                stepDescription: step.description || `Step ${index + 1}`,
                dependencies: step.dependencies || [],
            },
        };
    }
    createSubtaskFromOperation(parentInput, operation, index) {
        return {
            id: (0, uuid_1.v4)(),
            parentId: parentInput.taskId,
            agentId: operation.agentId,
            cluster: operation.cluster,
            status: agent_interface_1.TaskStatus.PENDING,
            priority: operation.priority || parentInput.priority || agent_interface_1.TaskPriority.NORMAL,
            input: {
                taskId: (0, uuid_1.v4)(),
                payload: operation,
                context: {
                    ...parentInput.context,
                    operationIndex: index,
                    operationType: operation.type || 'unknown',
                },
                parentTaskId: parentInput.taskId,
                priority: operation.priority || parentInput.priority || agent_interface_1.TaskPriority.NORMAL,
            },
            subtasks: [],
            retryCount: 0,
            maxRetries: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
            correlationId: parentInput.context?.correlationId || (0, uuid_1.v4)(),
            metadata: {
                operationIndex: index,
                operationType: operation.type || 'unknown',
            },
        };
    }
    createSingleSubtask(input) {
        return {
            id: (0, uuid_1.v4)(),
            parentId: input.parentTaskId,
            status: agent_interface_1.TaskStatus.PENDING,
            priority: input.priority || agent_interface_1.TaskPriority.NORMAL,
            input: {
                ...input,
                taskId: input.taskId,
            },
            subtasks: [],
            retryCount: 0,
            maxRetries: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
            correlationId: input.context?.correlationId || (0, uuid_1.v4)(),
            metadata: {
                isSingleSubtask: true,
            },
        };
    }
    analyzeAndDecompose(input, strategy) {
        const subtasks = [];
        const payload = input.payload;
        const components = this.identifyComponents(payload);
        for (let i = 0; i < components.length; i++) {
            const component = components[i];
            subtasks.push({
                id: (0, uuid_1.v4)(),
                parentId: input.taskId,
                cluster: component.cluster,
                status: agent_interface_1.TaskStatus.PENDING,
                priority: component.priority || input.priority || agent_interface_1.TaskPriority.NORMAL,
                input: {
                    taskId: (0, uuid_1.v4)(),
                    payload: component.payload,
                    context: {
                        ...input.context,
                        componentIndex: i,
                        componentName: component.name,
                    },
                    parentTaskId: input.taskId,
                    priority: component.priority || input.priority || agent_interface_1.TaskPriority.NORMAL,
                },
                subtasks: [],
                retryCount: 0,
                maxRetries: 3,
                createdAt: new Date(),
                updatedAt: new Date(),
                correlationId: input.context?.correlationId || (0, uuid_1.v4)(),
                metadata: {
                    componentName: component.name,
                    dependencies: component.dependencies || [],
                    strategy,
                },
            });
        }
        return subtasks;
    }
    identifyComponents(payload) {
        const components = [];
        if (typeof payload !== 'object' || payload === null) {
            components.push({ name: 'main', payload });
            return components;
        }
        const keys = Object.keys(payload);
        if (keys.length <= 1) {
            components.push({ name: 'main', payload });
            return components;
        }
        const groups = this.groupRelatedKeys(keys, payload);
        for (const group of groups) {
            const groupPayload = {};
            for (const key of group.keys) {
                groupPayload[key] = payload[key];
            }
            components.push({
                name: group.name,
                payload: groupPayload,
                cluster: this.inferCluster(group.keys),
                dependencies: group.dependencies,
            });
        }
        return components;
    }
    groupRelatedKeys(keys, payload) {
        const browserKeys = keys.filter((k) => /url|page|browser|navigate|click|type|screenshot/i.test(k));
        const dataKeys = keys.filter((k) => /data|result|output|content|text|value/i.test(k));
        const configKeys = keys.filter((k) => /config|option|setting|param|option/i.test(k));
        const otherKeys = keys.filter((k) => !browserKeys.includes(k) && !dataKeys.includes(k) && !configKeys.includes(k));
        const groups = [];
        if (browserKeys.length > 0) {
            groups.push({
                name: 'browser_operations',
                keys: browserKeys,
                dependencies: [],
            });
        }
        if (dataKeys.length > 0) {
            groups.push({
                name: 'data_processing',
                keys: dataKeys,
                dependencies: browserKeys.length > 0 ? ['browser_operations'] : [],
            });
        }
        if (configKeys.length > 0) {
            groups.push({
                name: 'configuration',
                keys: configKeys,
                dependencies: [],
            });
        }
        if (otherKeys.length > 0) {
            groups.push({
                name: 'other_operations',
                keys: otherKeys,
                dependencies: dataKeys.length > 0 ? ['data_processing'] : [],
            });
        }
        return groups;
    }
    inferCluster(keys) {
        const keyStr = keys.join(' ').toLowerCase();
        if (/url|page|browser|navigate|click|type|screenshot/.test(keyStr)) {
            return agent_interface_1.AgentCluster.BROWSER;
        }
        if (/file|directory|read|write|path/.test(keyStr)) {
            return agent_interface_1.AgentCluster.COMPUTER;
        }
        if (/code|compile|test|deploy/.test(keyStr)) {
            return agent_interface_1.AgentCluster.CODING;
        }
        if (/email|document|spreadsheet|presentation/.test(keyStr)) {
            return agent_interface_1.AgentCluster.OFFICE;
        }
        if (/campaign|social|content|seo/.test(keyStr)) {
            return agent_interface_1.AgentCluster.MARKETING;
        }
        return undefined;
    }
    hasDataDependency(subtaskA, subtaskB) {
        const payloadA = JSON.stringify(subtaskA.input.payload);
        const taskIdB = subtaskB.id;
        if (payloadA.includes(taskIdB)) {
            return true;
        }
        const requiresOutput = subtaskA.input.context?.requiresOutputFrom;
        if (requiresOutput && requiresOutput.includes(subtaskB.id)) {
            return true;
        }
        return false;
    }
    async findHistoricalDecomposition(input) {
        try {
            const payloadHash = this.hashPayload(input.payload);
            const result = await this.memoryService.retrieve('task-decomposer', `decomposition:${payloadHash}`, 'long_term');
            return result?.value?.subtasks ?? null;
        }
        catch {
            return null;
        }
    }
    adaptHistoricalDecomposition(input, historical) {
        return historical.map((subtask) => ({
            ...subtask,
            id: (0, uuid_1.v4)(),
            parentId: input.taskId,
            status: agent_interface_1.TaskStatus.PENDING,
            input: {
                ...subtask.input,
                taskId: (0, uuid_1.v4)(),
                parentTaskId: input.taskId,
                context: { ...input.context, ...subtask.input.context },
            },
            retryCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            correlationId: input.context?.correlationId || (0, uuid_1.v4)(),
        }));
    }
    async storeDecomposition(input, subtasks) {
        try {
            const payloadHash = this.hashPayload(input.payload);
            await this.memoryService.store('task-decomposer', `decomposition:${payloadHash}`, { subtasks, inputPayload: input.payload }, 'long_term', { tags: ['decomposition', 'historical'] });
        }
        catch {
        }
    }
    hashPayload(payload) {
        const str = JSON.stringify(payload);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
};
exports.TaskDecomposerService = TaskDecomposerService;
exports.TaskDecomposerService = TaskDecomposerService = TaskDecomposerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [memory_service_1.MemoryService])
], TaskDecomposerService);
//# sourceMappingURL=task-decomposer.service.js.map