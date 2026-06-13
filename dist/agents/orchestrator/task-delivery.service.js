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
var TaskDeliveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDeliveryService = exports.DeliveryFormat = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const agent_event_interface_1 = require("../interfaces/agent-event.interface");
const event_bus_service_1 = require("../events/event-bus.service");
const memory_service_1 = require("../memory/memory.service");
var DeliveryFormat;
(function (DeliveryFormat) {
    DeliveryFormat["RAW"] = "raw";
    DeliveryFormat["SUMMARY"] = "summary";
    DeliveryFormat["DETAILED"] = "detailed";
    DeliveryFormat["STRUCTURED"] = "structured";
    DeliveryFormat["COMPACT"] = "compact";
})(DeliveryFormat || (exports.DeliveryFormat = DeliveryFormat = {}));
let TaskDeliveryService = TaskDeliveryService_1 = class TaskDeliveryService {
    constructor(eventBusService, memoryService) {
        this.eventBusService = eventBusService;
        this.memoryService = memoryService;
        this.logger = new common_1.Logger(TaskDeliveryService_1.name);
    }
    async deliver(taskId, results, validation, options) {
        const startTime = Date.now();
        const format = options?.format || DeliveryFormat.STRUCTURED;
        const shouldPersist = options?.persist !== false;
        const shouldNotify = options?.notify !== false;
        const shouldCleanup = options?.cleanup !== false;
        this.logger.log(`Delivering task ${taskId} in ${format} format`);
        const deliveredOutput = this.formatOutput(results, validation, format, options);
        if (shouldPersist) {
            await this.persistResult(taskId, deliveredOutput, results, validation);
        }
        if (shouldNotify) {
            await this.notifyDelivery(taskId, deliveredOutput, validation, options);
        }
        if (shouldCleanup) {
            await this.cleanupTemporaryResources(taskId, results);
        }
        const deliveryResult = {
            taskId,
            deliveredOutput,
            format,
            deliveredAt: new Date(),
            deliveryMethod: 'standard',
            recipient: options?.recipient,
            metadata: {
                validationScore: validation.score,
                totalSteps: validation.details.totalSteps,
                successfulSteps: validation.details.successfulSteps,
                failedSteps: validation.details.failedSteps,
                deliveryTimeMs: Date.now() - startTime,
                ...options?.metadata,
            },
        };
        try {
            await this.memoryService.store('task-delivery', `delivery-record:${taskId}`, deliveryResult, 'long_term', { tags: ['delivery', 'record'] });
        }
        catch (error) {
            this.logger.warn(`Failed to store delivery record for task ${taskId}: ${error.message}`);
        }
        this.logger.log(`Task ${taskId} delivered successfully in ${Date.now() - startTime}ms`);
        return deliveryResult;
    }
    formatOutput(results, validation, format, options) {
        switch (format) {
            case DeliveryFormat.RAW:
                return this.formatRaw(results);
            case DeliveryFormat.SUMMARY:
                return this.formatSummary(results, validation);
            case DeliveryFormat.DETAILED:
                return this.formatDetailed(results, validation, options);
            case DeliveryFormat.STRUCTURED:
                return this.formatStructured(results, validation, options);
            case DeliveryFormat.COMPACT:
                return this.formatCompact(results, validation);
            default:
                return this.formatStructured(results, validation, options);
        }
    }
    formatRaw(results) {
        return results.map((r) => ({
            stepId: r.stepId,
            success: r.success,
            result: r.output.result,
            error: r.output.error,
        }));
    }
    formatSummary(results, validation) {
        const successfulResults = results.filter((r) => r.success);
        const mainResult = this.extractMainResult(successfulResults);
        return {
            success: validation.isValid,
            score: validation.score,
            result: mainResult,
            summary: {
                totalSteps: validation.details.totalSteps,
                successfulSteps: validation.details.successfulSteps,
                failedSteps: validation.details.failedSteps,
            },
        };
    }
    formatDetailed(results, validation, options) {
        return {
            success: validation.isValid,
            score: validation.score,
            result: this.extractMainResult(results.filter((r) => r.success)),
            validation: {
                isValid: validation.isValid,
                score: validation.score,
                errors: validation.errors,
                warnings: validation.warnings,
                details: validation.details,
            },
            steps: options?.includeSteps !== false
                ? results.map((r) => ({
                    stepId: r.stepId,
                    stepOrder: r.stepOrder,
                    agentId: r.agentId,
                    success: r.success,
                    result: r.output.result,
                    error: r.output.error,
                    executionTimeMs: r.executionTimeMs,
                    retryCount: r.retryCount,
                    timedOut: r.timedOut,
                    ...(options?.includeMetrics ? { metrics: r.output.metrics } : {}),
                }))
                : undefined,
            metadata: options?.metadata,
        };
    }
    formatStructured(results, validation, options) {
        const successfulResults = results.filter((r) => r.success);
        const failedResults = results.filter((r) => !r.success);
        const aggregatedResult = this.aggregateResults(successfulResults);
        return {
            success: validation.isValid,
            data: aggregatedResult,
            quality: {
                score: validation.score,
                completeness: validation.details.completenessScore,
                quality: validation.details.qualityScore,
                performance: validation.details.performanceScore,
                compliance: validation.details.complianceScore,
                integrity: validation.details.integrityScore,
                schemaValidation: validation.details.schemaValidationScore,
            },
            execution: {
                totalSteps: validation.details.totalSteps,
                successfulSteps: validation.details.successfulSteps,
                failedSteps: validation.details.failedSteps,
                totalExecutionTimeMs: results.reduce((sum, r) => sum + r.executionTimeMs, 0),
            },
            issues: {
                errors: validation.errors.length > 0 ? validation.errors : undefined,
                warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
            },
            steps: options?.includeSteps
                ? {
                    successful: successfulResults.map((r) => ({
                        stepId: r.stepId,
                        order: r.stepOrder,
                        result: r.output.result,
                        timeMs: r.executionTimeMs,
                    })),
                    failed: failedResults.length > 0
                        ? failedResults.map((r) => ({
                            stepId: r.stepId,
                            order: r.stepOrder,
                            error: r.output.error,
                            timeMs: r.executionTimeMs,
                            timedOut: r.timedOut,
                        }))
                        : undefined,
                }
                : undefined,
            metadata: options?.metadata,
        };
    }
    formatCompact(results, validation) {
        const mainResult = this.extractMainResult(results.filter((r) => r.success));
        return {
            ok: validation.isValid,
            data: mainResult,
            score: validation.score,
        };
    }
    extractMainResult(successfulResults) {
        if (successfulResults.length === 0) {
            return null;
        }
        if (successfulResults.length === 1) {
            return successfulResults[0].output.result;
        }
        const primaryResult = successfulResults.find((r) => r.output.result && typeof r.output.result === 'object');
        if (primaryResult) {
            return primaryResult.output.result;
        }
        return successfulResults[0].output.result;
    }
    aggregateResults(successfulResults) {
        if (successfulResults.length === 0)
            return null;
        if (successfulResults.length === 1)
            return successfulResults[0].output.result;
        const aggregated = {};
        for (const result of successfulResults) {
            const stepResult = result.output.result;
            if (typeof stepResult === 'object' && stepResult !== null) {
                Object.assign(aggregated, stepResult);
            }
            else if (stepResult !== null && stepResult !== undefined) {
                aggregated[result.stepId] = stepResult;
            }
        }
        return Object.keys(aggregated).length > 0 ? aggregated : null;
    }
    async persistResult(taskId, deliveredOutput, results, validation) {
        try {
            await this.memoryService.store('task-delivery', `delivery:${taskId}`, {
                taskId,
                deliveredOutput,
                resultCount: results.length,
                successCount: results.filter((r) => r.success).length,
                validationScore: validation.score,
                deliveredAt: new Date(),
            }, 'long_term', { tags: ['delivery', 'result'] });
        }
        catch (error) {
            this.logger.warn(`Failed to persist delivery result for task ${taskId}: ${error.message}`);
        }
    }
    async notifyDelivery(taskId, deliveredOutput, validation, options) {
        try {
            await this.eventBusService.publish({
                type: agent_event_interface_1.AgentEventType.TASK_COMPLETED,
                sourceAgentId: 'task-delivery',
                payload: {
                    taskId,
                    success: validation.isValid,
                    score: validation.score,
                    totalSteps: validation.details.totalSteps,
                    successfulSteps: validation.details.successfulSteps,
                    recipient: options?.recipient,
                },
                priority: validation.isValid ? 1 : 2,
                correlationId: (0, uuid_1.v4)(),
                metadata: { deliveryFormat: options?.format || DeliveryFormat.STRUCTURED },
            });
        }
        catch (error) {
            this.logger.warn(`Failed to send delivery notification for task ${taskId}: ${error.message}`);
        }
    }
    async cleanupTemporaryResources(taskId, results) {
        try {
            await this.memoryService.store('task-delivery', `cleanup:${taskId}`, {
                taskId,
                cleanedUpAt: new Date(),
                cleanedStepCount: results.length,
            }, 'working', { tags: ['cleanup'] });
            for (const result of results) {
                try {
                    await this.memoryService.store('task-delivery', `step-cleanup:${result.stepId}`, { cleanedUp: true, taskId }, 'working', { tags: ['cleanup', 'step'] });
                }
                catch {
                }
            }
            this.logger.debug?.(`Cleaned up temporary resources for task ${taskId}`);
        }
        catch (error) {
            this.logger.warn(`Failed to clean up temporary resources for task ${taskId}: ${error.message}`);
        }
    }
};
exports.TaskDeliveryService = TaskDeliveryService;
exports.TaskDeliveryService = TaskDeliveryService = TaskDeliveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService,
        memory_service_1.MemoryService])
], TaskDeliveryService);
//# sourceMappingURL=task-delivery.service.js.map