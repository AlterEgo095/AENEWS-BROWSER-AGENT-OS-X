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
var TaskExecutorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskExecutorService = void 0;
const common_1 = require("@nestjs/common");
const agent_interface_1 = require("../interfaces/agent.interface");
const agent_event_interface_1 = require("../interfaces/agent-event.interface");
const agent_registry_service_1 = require("../registry/agent-registry.service");
const event_bus_service_1 = require("../events/event-bus.service");
const DEFAULT_EXECUTION_CONFIG = {
    defaultStepTimeoutMs: 60000,
    maxStepRetries: 3,
    retryBackoffBaseMs: 1000,
    maxParallelSteps: 10,
    continueOnFailure: true,
};
let TaskExecutorService = TaskExecutorService_1 = class TaskExecutorService {
    constructor(agentRegistry, eventBusService) {
        this.agentRegistry = agentRegistry;
        this.eventBusService = eventBusService;
        this.logger = new common_1.Logger(TaskExecutorService_1.name);
        this.config = { ...DEFAULT_EXECUTION_CONFIG };
    }
    async executePlan(plan, correlationId) {
        const startTime = Date.now();
        this.logger.log(`Executing plan ${plan.id} with ${plan.steps.length} steps`);
        const results = [];
        const completedSteps = new Set();
        const failedSteps = new Set();
        const depMap = this.buildDependencyMap(plan.dependencies);
        const pendingSteps = [...plan.steps].sort((a, b) => a.order - b.order);
        while (pendingSteps.length > 0) {
            const readySteps = pendingSteps.filter((step) => {
                const deps = depMap.get(step.id);
                if (!deps || deps.length === 0)
                    return true;
                return deps.every((depId) => completedSteps.has(depId));
            });
            if (readySteps.length === 0) {
                const blockedByFailure = pendingSteps.every((step) => {
                    const deps = depMap.get(step.id);
                    return deps && deps.some((depId) => failedSteps.has(depId));
                });
                if (blockedByFailure) {
                    this.logger.error('All remaining steps are blocked by failed dependencies');
                    for (const step of pendingSteps) {
                        results.push({
                            stepId: step.id,
                            stepOrder: step.order,
                            agentId: step.agentId || 'none',
                            success: false,
                            output: {
                                taskId: step.input.taskId,
                                success: false,
                                result: null,
                                error: 'Blocked by failed dependency',
                                metrics: { executionTimeMs: 0, memoryUsedMb: 0, cpuUsagePercent: 0 },
                                timestamp: new Date(),
                            },
                            executionTimeMs: 0,
                            retryCount: 0,
                            timedOut: false,
                        });
                    }
                    break;
                }
                await this.sleep(100);
                continue;
            }
            const batchSize = Math.min(readySteps.length, this.config.maxParallelSteps);
            const batch = readySteps.slice(0, batchSize);
            const batchResults = await Promise.allSettled(batch.map((step) => this.executeStep(step, correlationId)));
            for (let i = 0; i < batchResults.length; i++) {
                const settledResult = batchResults[i];
                const step = batch[i];
                if (settledResult.status === 'fulfilled') {
                    const result = settledResult.value;
                    results.push(result);
                    if (result.success) {
                        completedSteps.add(step.id);
                    }
                    else {
                        failedSteps.add(step.id);
                    }
                }
                else {
                    const error = settledResult.reason;
                    results.push({
                        stepId: step.id,
                        stepOrder: step.order,
                        agentId: step.agentId || 'none',
                        success: false,
                        output: {
                            taskId: step.input.taskId,
                            success: false,
                            result: null,
                            error: error.message,
                            metrics: { executionTimeMs: 0, memoryUsedMb: 0, cpuUsagePercent: 0 },
                            timestamp: new Date(),
                        },
                        executionTimeMs: 0,
                        retryCount: 0,
                        timedOut: false,
                    });
                    failedSteps.add(step.id);
                }
                const pendingIdx = pendingSteps.indexOf(step);
                if (pendingIdx >= 0) {
                    pendingSteps.splice(pendingIdx, 1);
                }
            }
            if (!this.config.continueOnFailure && failedSteps.size > 0) {
                this.logger.warn('Stopping execution due to step failures (continueOnFailure=false)');
                break;
            }
        }
        this.logger.log(`Plan ${plan.id} execution completed in ${Date.now() - startTime}ms: ` +
            `${completedSteps.size} succeeded, ${failedSteps.size} failed`);
        return results;
    }
    async executeStep(step, correlationId) {
        const startTime = Date.now();
        step.status = agent_interface_1.TaskStatus.EXECUTING;
        const stepTimeoutMs = step.input.context?.timeout || this.config.defaultStepTimeoutMs;
        this.logger.log(`Executing step ${step.id} (order: ${step.order}) on agent ${step.agentId || 'auto'} ` +
            `(timeout: ${stepTimeoutMs}ms)`);
        this.eventBusService
            .publish({
            type: agent_event_interface_1.AgentEventType.TASK_PROGRESS,
            sourceAgentId: 'task-executor',
            payload: {
                taskId: step.input.taskId,
                agentId: step.agentId || 'pending',
                progress: 0,
                message: `Starting step ${step.order}`,
                currentStep: step.id,
            },
            priority: 1,
            correlationId,
            metadata: { stepId: step.id },
        })
            .catch(() => { });
        try {
            const agent = this.findAgentForStep(step);
            if (!agent) {
                throw new agent_interface_1.AgentError(`No available agent for step ${step.id}`, agent_interface_1.AgentErrorCode.NOT_FOUND, 'task-executor', step.input.taskId);
            }
            if (typeof agent.setCorrelationId === 'function') {
                agent.setCorrelationId(correlationId);
            }
            let output = null;
            let retryCount = 0;
            const maxRetries = this.config.maxStepRetries;
            let timedOut = false;
            while (retryCount <= maxRetries) {
                try {
                    output = await this.executeWithTimeout(agent, step.input, stepTimeoutMs);
                    if (output.success)
                        break;
                    retryCount++;
                    if (retryCount <= maxRetries) {
                        const backoff = this.config.retryBackoffBaseMs * Math.pow(2, retryCount - 1);
                        this.logger.warn(`Step ${step.id} failed (attempt ${retryCount}/${maxRetries}), retrying in ${backoff}ms`);
                        await this.sleep(backoff);
                    }
                }
                catch (error) {
                    if (error.code === agent_interface_1.AgentErrorCode.TIMEOUT) {
                        timedOut = true;
                        retryCount++;
                        if (retryCount <= maxRetries) {
                            const backoff = this.config.retryBackoffBaseMs * Math.pow(2, retryCount - 1);
                            this.logger.warn(`Step ${step.id} timed out (attempt ${retryCount}/${maxRetries}), retrying in ${backoff}ms`);
                            await this.sleep(backoff);
                        }
                        else {
                            throw error;
                        }
                    }
                    else {
                        retryCount++;
                        if (retryCount > maxRetries) {
                            throw error;
                        }
                        const backoff = this.config.retryBackoffBaseMs * Math.pow(2, retryCount - 1);
                        await this.sleep(backoff);
                    }
                }
            }
            step.output = output;
            step.status = output?.success ? agent_interface_1.TaskStatus.COMPLETED : agent_interface_1.TaskStatus.FAILED;
            step.retryCount = retryCount;
            const executionTimeMs = Date.now() - startTime;
            this.eventBusService
                .publish({
                type: output?.success
                    ? agent_event_interface_1.AgentEventType.ORCHESTRATION_STEP_COMPLETED
                    : agent_event_interface_1.AgentEventType.TASK_FAILED,
                sourceAgentId: step.agentId || 'task-executor',
                payload: {
                    taskId: step.input.taskId,
                    agentId: step.agentId || 'unknown',
                    success: output?.success ?? false,
                    executionTimeMs,
                },
                priority: 1,
                correlationId,
                metadata: { stepId: step.id },
            })
                .catch(() => { });
            return {
                stepId: step.id,
                stepOrder: step.order,
                agentId: step.agentId || agent.getConfig().id,
                success: output?.success ?? false,
                output: output,
                executionTimeMs,
                retryCount,
                timedOut,
            };
        }
        catch (error) {
            step.status = agent_interface_1.TaskStatus.FAILED;
            const executionTimeMs = Date.now() - startTime;
            const isTimeout = error.code === agent_interface_1.AgentErrorCode.TIMEOUT;
            this.logger.error(`Step ${step.id} execution failed: ${error.message}`);
            return {
                stepId: step.id,
                stepOrder: step.order,
                agentId: step.agentId || 'unknown',
                success: false,
                output: {
                    taskId: step.input.taskId,
                    success: false,
                    result: null,
                    error: error.message,
                    metrics: { executionTimeMs, memoryUsedMb: 0, cpuUsagePercent: 0 },
                    timestamp: new Date(),
                },
                executionTimeMs,
                retryCount: step.retryCount,
                timedOut: isTimeout,
            };
        }
    }
    executeWithTimeout(agent, input, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new agent_interface_1.AgentError(`Step timed out after ${timeoutMs}ms`, agent_interface_1.AgentErrorCode.TIMEOUT, 'task-executor', input.taskId));
            }, timeoutMs);
            agent
                .execute(input)
                .then((output) => {
                clearTimeout(timeoutId);
                resolve(output);
            })
                .catch((error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }
    findAgentForStep(step) {
        if (step.agentId) {
            const agent = this.agentRegistry.getAgent(step.agentId);
            if (agent && agent.canAcceptTask()) {
                return agent;
            }
        }
        if (step.capability) {
            const agent = this.agentRegistry.findBestAgent(step.capability);
            if (agent) {
                return agent;
            }
        }
        if (step.cluster) {
            const agents = this.agentRegistry.getAvailableAgents(step.cluster);
            if (agents.length > 0) {
                return agents.reduce((best, agent) => {
                    return agent.getCurrentTaskCount() < best.getCurrentTaskCount() ? agent : best;
                });
            }
        }
        const allAvailable = this.agentRegistry.getAvailableAgents();
        if (allAvailable.length > 0) {
            return allAvailable.reduce((best, agent) => {
                return agent.getCurrentTaskCount() < best.getCurrentTaskCount() ? agent : best;
            });
        }
        return null;
    }
    setConfig(config) {
        Object.assign(this.config, config);
        this.logger.log(`Execution config updated: ${JSON.stringify(this.config)}`);
    }
    buildDependencyMap(dependencies) {
        const map = new Map();
        for (const dep of dependencies) {
            map.set(dep.stepId, dep.dependsOnStepIds);
        }
        return map;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.TaskExecutorService = TaskExecutorService;
exports.TaskExecutorService = TaskExecutorService = TaskExecutorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService,
        event_bus_service_1.EventBusService])
], TaskExecutorService);
//# sourceMappingURL=task-executor.service.js.map