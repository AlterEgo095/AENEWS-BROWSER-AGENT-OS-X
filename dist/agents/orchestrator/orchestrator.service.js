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
var OrchestratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorService = exports.OrchestrationPhase = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const agent_interface_1 = require("../interfaces/agent.interface");
const agent_event_interface_1 = require("../interfaces/agent-event.interface");
const task_decomposer_service_1 = require("./task-decomposer.service");
const task_planner_service_1 = require("./task-planner.service");
const task_executor_service_1 = require("./task-executor.service");
const task_critic_service_1 = require("./task-critic.service");
const task_repair_service_1 = require("./task-repair.service");
const task_validator_service_1 = require("./task-validator.service");
const task_delivery_service_1 = require("./task-delivery.service");
const event_bus_service_1 = require("../events/event-bus.service");
const agent_registry_service_1 = require("../registry/agent-registry.service");
const memory_service_1 = require("../memory/memory.service");
var OrchestrationPhase;
(function (OrchestrationPhase) {
    OrchestrationPhase["DECOMPOSE"] = "decompose";
    OrchestrationPhase["PLAN"] = "plan";
    OrchestrationPhase["EXECUTE"] = "execute";
    OrchestrationPhase["CRITIQUE"] = "critique";
    OrchestrationPhase["REPAIR"] = "repair";
    OrchestrationPhase["VALIDATE"] = "validate";
    OrchestrationPhase["DELIVER"] = "deliver";
})(OrchestrationPhase || (exports.OrchestrationPhase = OrchestrationPhase = {}));
let OrchestratorService = OrchestratorService_1 = class OrchestratorService {
    constructor(decomposer, planner, executor, critic, repairService, validator, deliveryService, eventBusService, agentRegistry, memoryService) {
        this.decomposer = decomposer;
        this.planner = planner;
        this.executor = executor;
        this.critic = critic;
        this.repairService = repairService;
        this.validator = validator;
        this.deliveryService = deliveryService;
        this.eventBusService = eventBusService;
        this.agentRegistry = agentRegistry;
        this.memoryService = memoryService;
        this.logger = new common_1.Logger(OrchestratorService_1.name);
        this.activeOrchestrations = new Map();
        this.cancelledTasks = new Set();
    }
    async orchestrate(request) {
        const taskId = request.taskId || (0, uuid_1.v4)();
        const correlationId = request.context?.correlationId || (0, uuid_1.v4)();
        const startTime = Date.now();
        const result = {
            taskId,
            success: false,
            result: null,
            plan: null,
            totalSteps: 0,
            successfulSteps: 0,
            failedSteps: 0,
            repairAttempts: 0,
            totalExecutionTimeMs: 0,
            phaseTimings: [],
        };
        this.activeOrchestrations.set(taskId, result);
        try {
            this.logger.log(`Starting orchestration for task ${taskId}`);
            await this.emitOrchestrationEvent(taskId, correlationId, request);
            if (this.isCancelled(taskId)) {
                return this.cancelResult(result, taskId, startTime);
            }
            this.logger.log(`Decomposing task ${taskId}`);
            const decomposeStart = Date.now();
            const subtasks = await this.decomposer.decompose({
                taskId,
                payload: request.payload,
                context: { ...request.context, correlationId },
                parentTaskId: request.parentTaskId,
                priority: request.priority || agent_interface_1.TaskPriority.NORMAL,
            });
            result.phaseTimings.push({
                phase: OrchestrationPhase.DECOMPOSE,
                durationMs: Date.now() - decomposeStart,
                success: true,
            });
            result.totalSteps = subtasks.length;
            if (this.isCancelled(taskId)) {
                return this.cancelResult(result, taskId, startTime);
            }
            this.logger.log(`Planning execution for task ${taskId}`);
            const planStart = Date.now();
            const plan = await this.planner.createPlan(subtasks, request);
            result.plan = plan;
            result.phaseTimings.push({
                phase: OrchestrationPhase.PLAN,
                durationMs: Date.now() - planStart,
                success: true,
            });
            this.eventBusService
                .publish({
                type: agent_event_interface_1.AgentEventType.ORCHESTRATION_PLANNED,
                sourceAgentId: 'orchestrator',
                cluster: request.cluster,
                payload: {
                    taskId,
                    totalSteps: plan.steps.length,
                    estimatedDurationMs: plan.estimatedDurationMs,
                },
                priority: 1,
                correlationId,
                metadata: {},
            })
                .catch(() => { });
            if (this.isCancelled(taskId)) {
                return this.cancelResult(result, taskId, startTime);
            }
            this.logger.log(`Executing plan for task ${taskId}`);
            const executeStart = Date.now();
            let executionResults = await this.executor.executePlan(plan, correlationId);
            result.phaseTimings.push({
                phase: OrchestrationPhase.EXECUTE,
                durationMs: Date.now() - executeStart,
                success: executionResults.some((r) => r.success),
            });
            if (this.isCancelled(taskId)) {
                return this.cancelResult(result, taskId, startTime);
            }
            let critiqueResult;
            if (!request.skipCritique) {
                this.logger.log(`Critiquing results for task ${taskId}`);
                const critiqueStart = Date.now();
                critiqueResult = await this.critic.critique(executionResults, request);
                result.critiqueScore = critiqueResult.score;
                result.phaseTimings.push({
                    phase: OrchestrationPhase.CRITIQUE,
                    durationMs: Date.now() - critiqueStart,
                    success: critiqueResult.passed,
                });
            }
            else {
                critiqueResult = {
                    passed: true,
                    score: 100,
                    issues: [],
                    summary: 'Skipped',
                    recommendations: [],
                };
                result.critiqueScore = 100;
            }
            let repairAttempts = 0;
            const maxRepairAttempts = request.maxRepairAttempts ?? 3;
            if (!request.skipCritique) {
                const repairStart = Date.now();
                while (!critiqueResult.passed && repairAttempts < maxRepairAttempts) {
                    repairAttempts++;
                    this.logger.warn(`Critique failed for task ${taskId}, repair attempt ${repairAttempts}/${maxRepairAttempts}`);
                    const repairResult = await this.repairService.repair(executionResults, critiqueResult, request);
                    if (repairResult.repairedPlan) {
                        executionResults = await this.executor.executePlan(repairResult.repairedPlan, correlationId);
                        const reCritique = await this.critic.critique(executionResults, request);
                        critiqueResult.passed = reCritique.passed;
                        critiqueResult.score = reCritique.score;
                        critiqueResult.issues = reCritique.issues;
                    }
                    else {
                        this.logger.error(`Repair failed for task ${taskId}: ${repairResult.error}`);
                        break;
                    }
                }
                result.phaseTimings.push({
                    phase: OrchestrationPhase.REPAIR,
                    durationMs: Date.now() - repairStart,
                    success: critiqueResult.passed,
                });
            }
            result.repairAttempts = repairAttempts;
            let validationResult;
            if (!request.skipValidation) {
                this.logger.log(`Validating output for task ${taskId}`);
                const validateStart = Date.now();
                validationResult = await this.validator.validate(executionResults, request);
                result.validationScore = validationResult.score;
                result.phaseTimings.push({
                    phase: OrchestrationPhase.VALIDATE,
                    durationMs: Date.now() - validateStart,
                    success: validationResult.isValid,
                });
                if (!validationResult.isValid) {
                    result.success = false;
                    result.error = `Validation failed: ${validationResult.errors.join('; ')}`;
                    result.failedSteps = executionResults.filter((r) => !r.success).length;
                    result.successfulSteps = executionResults.filter((r) => r.success).length;
                    this.eventBusService
                        .publish({
                        type: agent_event_interface_1.AgentEventType.ORCHESTRATION_FAILED,
                        sourceAgentId: 'orchestrator',
                        payload: { taskId, error: result.error },
                        priority: 2,
                        correlationId,
                        metadata: {},
                    })
                        .catch(() => { });
                    return this.finalize(result, startTime, taskId);
                }
            }
            else {
                validationResult = {
                    isValid: true,
                    score: 100,
                    errors: [],
                    warnings: [],
                    details: {
                        totalSteps: executionResults.length,
                        successfulSteps: executionResults.filter((r) => r.success).length,
                        failedSteps: executionResults.filter((r) => !r.success).length,
                        completenessScore: 100,
                        qualityScore: 100,
                        performanceScore: 100,
                        complianceScore: 100,
                        integrityScore: 100,
                        schemaValidationScore: 100,
                    },
                };
                result.validationScore = 100;
            }
            this.logger.log(`Delivering result for task ${taskId}`);
            const deliverStart = Date.now();
            const deliveryResult = await this.deliveryService.deliver(taskId, executionResults, validationResult);
            result.phaseTimings.push({
                phase: OrchestrationPhase.DELIVER,
                durationMs: Date.now() - deliverStart,
                success: true,
            });
            result.success = true;
            result.result = deliveryResult.deliveredOutput;
            result.successfulSteps = executionResults.filter((r) => r.success).length;
            result.failedSteps = executionResults.filter((r) => !r.success).length;
            await this.storeOrchestrationResult(taskId, result);
            this.eventBusService
                .publish({
                type: agent_event_interface_1.AgentEventType.ORCHESTRATION_COMPLETED,
                sourceAgentId: 'orchestrator',
                cluster: request.cluster,
                payload: {
                    taskId,
                    correlationId,
                    totalSteps: result.totalSteps,
                    successfulSteps: result.successfulSteps,
                    failedSteps: result.failedSteps,
                    totalExecutionTimeMs: result.totalExecutionTimeMs,
                },
                priority: 1,
                correlationId,
                metadata: {},
            })
                .catch(() => { });
            this.logger.log(`Orchestration completed for task ${taskId}: ` +
                `${result.successfulSteps}/${result.totalSteps} steps succeeded`);
            return this.finalize(result, startTime, taskId);
        }
        catch (error) {
            result.success = false;
            result.error = error.message;
            this.logger.error(`Orchestration failed for task ${taskId}: ${error.message}`, error.stack);
            this.eventBusService
                .publish({
                type: agent_event_interface_1.AgentEventType.ORCHESTRATION_FAILED,
                sourceAgentId: 'orchestrator',
                payload: { taskId, error: result.error },
                priority: 2,
                correlationId,
                metadata: {},
            })
                .catch(() => { });
            return this.finalize(result, startTime, taskId);
        }
    }
    getOrchestrationStatus(taskId) {
        return this.activeOrchestrations.get(taskId) || null;
    }
    async cancelOrchestration(taskId) {
        const result = this.activeOrchestrations.get(taskId);
        if (!result)
            return false;
        this.cancelledTasks.add(taskId);
        this.eventBusService
            .publish({
            type: agent_event_interface_1.AgentEventType.TASK_CANCELLED,
            sourceAgentId: 'orchestrator',
            payload: { taskId, reason: 'Manual cancellation' },
            priority: 2,
            correlationId: (0, uuid_1.v4)(),
            metadata: {},
        })
            .catch(() => { });
        return true;
    }
    getActiveOrchestrations() {
        return Array.from(this.activeOrchestrations.keys());
    }
    getStats() {
        return {
            activeOrchestrations: this.activeOrchestrations.size,
            cancelledTasks: this.cancelledTasks.size,
        };
    }
    isCancelled(taskId) {
        return this.cancelledTasks.has(taskId);
    }
    cancelResult(result, taskId, startTime) {
        result.success = false;
        result.error = 'Orchestration cancelled';
        this.cancelledTasks.delete(taskId);
        return this.finalize(result, startTime, taskId);
    }
    async emitOrchestrationEvent(taskId, correlationId, request) {
        const payloadSummary = typeof request.payload === 'string'
            ? request.payload.substring(0, 200)
            : JSON.stringify(request.payload).substring(0, 200);
        this.eventBusService
            .publish({
            type: agent_event_interface_1.AgentEventType.ORCHESTRATION_STARTED,
            sourceAgentId: 'orchestrator',
            cluster: request.cluster,
            payload: {
                taskId,
                correlationId,
                inputSummary: payloadSummary,
            },
            priority: 1,
            correlationId,
            metadata: {},
        })
            .catch(() => { });
    }
    finalize(result, startTime, taskId) {
        result.totalExecutionTimeMs = Date.now() - startTime;
        this.activeOrchestrations.delete(taskId);
        this.cancelledTasks.delete(taskId);
        return result;
    }
    async storeOrchestrationResult(taskId, result) {
        try {
            await this.memoryService.store('orchestrator', `orchestration:${taskId}`, result, 'long_term', { tags: ['orchestration', 'result'] });
        }
        catch (error) {
            this.logger.warn(`Failed to store orchestration result: ${error.message}`);
        }
    }
};
exports.OrchestratorService = OrchestratorService;
exports.OrchestratorService = OrchestratorService = OrchestratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [task_decomposer_service_1.TaskDecomposerService,
        task_planner_service_1.TaskPlannerService,
        task_executor_service_1.TaskExecutorService,
        task_critic_service_1.TaskCriticService,
        task_repair_service_1.TaskRepairService,
        task_validator_service_1.TaskValidatorService,
        task_delivery_service_1.TaskDeliveryService,
        event_bus_service_1.EventBusService,
        agent_registry_service_1.AgentRegistryService,
        memory_service_1.MemoryService])
], OrchestratorService);
//# sourceMappingURL=orchestrator.service.js.map