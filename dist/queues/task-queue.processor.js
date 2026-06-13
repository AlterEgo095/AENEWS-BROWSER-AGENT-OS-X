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
var TaskQueueProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskQueueProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const agent_registry_service_1 = require("../agents/registry/agent-registry.service");
const inter_agent_comm_service_1 = require("../agents/communication/inter-agent-comm.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const event_bus_service_1 = require("../agents/events/event-bus.service");
const agent_event_interface_1 = require("../agents/interfaces/agent-event.interface");
let TaskQueueProcessor = TaskQueueProcessor_1 = class TaskQueueProcessor {
    constructor(agentRegistry, interAgentComm, realtimeGateway, eventBus) {
        this.agentRegistry = agentRegistry;
        this.interAgentComm = interAgentComm;
        this.realtimeGateway = realtimeGateway;
        this.eventBus = eventBus;
        this.logger = new common_1.Logger(TaskQueueProcessor_1.name);
    }
    async processTask(job) {
        const { taskId, agentId, payload, parentMissionId } = job.data;
        const startTime = Date.now();
        this.logger.log(`Processing task ${taskId} for agent ${agentId}`);
        await job.progress(10);
        if (parentMissionId) {
            this.realtimeGateway.pushOrchestrationEvent(parentMissionId, realtime_gateway_1.RealtimeEventType.ORCH_EXECUTE, {
                taskId,
                agentId,
                phase: 'executing',
            });
        }
        this.realtimeGateway.pushAgentEvent(agentId, job.data.cluster || 'unknown', realtime_gateway_1.RealtimeEventType.AGENT_STARTED, { taskId, phase: 'executing' });
        try {
            const agent = this.agentRegistry.getAgent(agentId);
            if (!agent) {
                throw new Error(`Agent not found in registry: ${agentId}`);
            }
            await job.progress(30);
            const result = await agent.execute({
                taskId,
                payload,
                context: { timeout: job.data.timeoutMs || 120000 },
            });
            await job.progress(90);
            const executionTimeMs = Date.now() - startTime;
            if (parentMissionId) {
                this.realtimeGateway.pushOrchestrationEvent(parentMissionId, realtime_gateway_1.RealtimeEventType.ORCH_EXECUTE, { taskId, agentId, phase: 'completed', executionTimeMs });
            }
            this.realtimeGateway.pushAgentEvent(agentId, job.data.cluster || 'unknown', realtime_gateway_1.RealtimeEventType.AGENT_STOPPED, { taskId, executionTimeMs });
            await this.eventBus.publish({
                type: agent_event_interface_1.AgentEventType.TASK_COMPLETED,
                sourceAgentId: agentId,
                cluster: job.data.cluster,
                payload: { taskId, executionTimeMs, success: true },
                priority: 1,
                correlationId: job.data.correlationId || taskId,
                metadata: {},
            });
            return {
                taskId,
                agentId,
                success: true,
                result,
                executionTimeMs,
            };
        }
        catch (error) {
            const executionTimeMs = Date.now() - startTime;
            this.logger.error(`Task ${taskId} failed for agent ${agentId}: ${error.message}`);
            this.realtimeGateway.pushAgentEvent(agentId, job.data.cluster || 'unknown', realtime_gateway_1.RealtimeEventType.AGENT_ERROR, { taskId, error: error.message, executionTimeMs });
            await this.eventBus.publish({
                type: agent_event_interface_1.AgentEventType.TASK_FAILED,
                sourceAgentId: agentId,
                cluster: job.data.cluster,
                payload: { taskId, error: error.message, executionTimeMs },
                priority: 2,
                correlationId: job.data.correlationId || taskId,
                metadata: {},
            });
            throw error;
        }
    }
    onActive(job) {
        this.logger.log(`Task job ${job.id} started for task ${job.data.taskId}`);
    }
    onCompleted(job, result) {
        this.logger.log(`Task job ${job.id} completed: task ${result.taskId} (${result.executionTimeMs}ms)`);
    }
    onFailed(job, error) {
        this.logger.error(`Task job ${job.id} failed for task ${job.data.taskId}: ${error.message}`);
    }
};
exports.TaskQueueProcessor = TaskQueueProcessor;
__decorate([
    (0, bull_1.Process)({ name: 'execute' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TaskQueueProcessor.prototype, "processTask", null);
__decorate([
    (0, bull_1.OnQueueActive)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TaskQueueProcessor.prototype, "onActive", null);
__decorate([
    (0, bull_1.OnQueueCompleted)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], TaskQueueProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bull_1.OnQueueFailed)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", void 0)
], TaskQueueProcessor.prototype, "onFailed", null);
exports.TaskQueueProcessor = TaskQueueProcessor = TaskQueueProcessor_1 = __decorate([
    (0, bull_1.Processor)('task:queue'),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService,
        inter_agent_comm_service_1.InterAgentCommService,
        realtime_gateway_1.RealtimeGateway,
        event_bus_service_1.EventBusService])
], TaskQueueProcessor);
//# sourceMappingURL=task-queue.processor.js.map