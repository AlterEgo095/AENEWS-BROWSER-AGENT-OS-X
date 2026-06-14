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
var MissionQueueProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionQueueProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const mission_runtime_engine_1 = require("../software-factory/runtime/mission-runtime.engine");
const mission_metrics_service_1 = require("../software-factory/runtime/mission-metrics.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
const event_bus_service_1 = require("../agents/events/event-bus.service");
const agent_event_interface_1 = require("../agents/interfaces/agent-event.interface");
let MissionQueueProcessor = MissionQueueProcessor_1 = class MissionQueueProcessor {
    constructor(runtimeEngine, metricsService, realtimeGateway, eventBus) {
        this.runtimeEngine = runtimeEngine;
        this.metricsService = metricsService;
        this.realtimeGateway = realtimeGateway;
        this.eventBus = eventBus;
        this.logger = new common_1.Logger(MissionQueueProcessor_1.name);
    }
    async processMission(job) {
        const { missionId, instruction, description, quality, budgetMaxUsd, deadline } = job.data;
        this.logger.log(`Processing mission ${missionId} (job ${job.id})`);
        await job.progress(5);
        this.realtimeGateway.pushMissionEvent(missionId, realtime_gateway_1.RealtimeEventType.MISSION_RUNNING, {
            phase: 'initializing',
            progress: 5,
            instruction: instruction.substring(0, 100),
        });
        try {
            await job.progress(10);
            const result = await this.runtimeEngine.executeMission({
                instruction,
                description,
                quality: quality || 'standard',
                budgetMaxUsd,
                deadline: deadline ? new Date(deadline) : undefined,
            });
            await job.progress(80);
            this.metricsService.record({
                missionId,
                category: this.categorizeMission(instruction),
                instruction,
                success: result.success,
                certified: result.certified,
                qualityScore: result.qualityScore,
                durationMs: result.totalDurationMs,
                costUsd: result.totalCostUsd || 0,
                artifactCount: result.artifacts.length,
                totalSizeBytes: 0,
                retries: 0,
                errors: result.errors || [],
                phases: [],
            });
            await job.progress(100);
            const eventType = result.success
                ? realtime_gateway_1.RealtimeEventType.MISSION_COMPLETED
                : realtime_gateway_1.RealtimeEventType.MISSION_FAILED;
            this.realtimeGateway.pushMissionEvent(missionId, eventType, {
                qualityScore: result.qualityScore,
                certified: result.certified,
                totalDurationMs: result.totalDurationMs,
                totalCostUsd: result.totalCostUsd,
                artifactCount: result.artifacts.length,
                errors: result.errors,
            });
            await this.eventBus.publish({
                type: result.success
                    ? agent_event_interface_1.AgentEventType.ORCHESTRATION_COMPLETED
                    : agent_event_interface_1.AgentEventType.ORCHESTRATION_FAILED,
                sourceAgentId: 'mission-queue-processor',
                payload: {
                    missionId,
                    success: result.success,
                    certified: result.certified,
                    qualityScore: result.qualityScore,
                },
                priority: result.success ? 1 : 2,
                correlationId: missionId,
                metadata: { jobId: job.id?.toString() },
            });
            return {
                missionId,
                success: result.success,
                certified: result.certified,
                qualityScore: result.qualityScore,
                totalDurationMs: result.totalDurationMs,
                totalCostUsd: result.totalCostUsd,
                artifactCount: result.artifacts.length,
                errors: result.errors,
            };
        }
        catch (error) {
            this.logger.error(`Mission ${missionId} failed: ${error.message}`);
            this.metricsService.record({
                missionId,
                category: this.categorizeMission(instruction),
                instruction,
                success: false,
                certified: false,
                qualityScore: 0,
                durationMs: Date.now() - (job.timestamp || Date.now()),
                costUsd: 0,
                artifactCount: 0,
                totalSizeBytes: 0,
                retries: 0,
                errors: [error.message],
                phases: [],
            });
            this.realtimeGateway.pushMissionEvent(missionId, realtime_gateway_1.RealtimeEventType.MISSION_FAILED, {
                error: error.message,
                phase: 'execution',
            });
            throw error;
        }
    }
    onActive(job) {
        this.logger.log(`Mission job ${job.id} started for mission ${job.data.missionId}`);
        this.realtimeGateway.pushMissionEvent(job.data.missionId, realtime_gateway_1.RealtimeEventType.MISSION_RUNNING, {
            phase: 'queued',
            jobId: job.id,
        });
    }
    onCompleted(job, result) {
        this.logger.log(`Mission job ${job.id} completed: mission ${result.missionId} ` +
            `(score: ${result.qualityScore}, certified: ${result.certified})`);
    }
    onFailed(job, error) {
        this.logger.error(`Mission job ${job.id} failed for mission ${job.data.missionId}: ${error.message}`);
    }
    categorizeMission(instruction) {
        const lower = instruction.toLowerCase();
        if (lower.includes('website') || lower.includes('web app') || lower.includes('frontend'))
            return mission_metrics_service_1.MissionCategory.WEB_APP;
        if (lower.includes('scrape') || lower.includes('browse') || lower.includes('screenshot'))
            return mission_metrics_service_1.MissionCategory.AUTOMATION;
        if (lower.includes('report') || lower.includes('document') || lower.includes('pdf'))
            return mission_metrics_service_1.MissionCategory.DOCUMENT;
        if (lower.includes('market') || lower.includes('seo') || lower.includes('brand'))
            return mission_metrics_service_1.MissionCategory.SAAS;
        if (lower.includes('deploy') || lower.includes('docker') || lower.includes('ci'))
            return mission_metrics_service_1.MissionCategory.DEPLOYMENT;
        return mission_metrics_service_1.MissionCategory.WEB_APP;
    }
};
exports.MissionQueueProcessor = MissionQueueProcessor;
__decorate([
    (0, bull_1.Process)({ name: 'execute' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MissionQueueProcessor.prototype, "processMission", null);
__decorate([
    (0, bull_1.OnQueueActive)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MissionQueueProcessor.prototype, "onActive", null);
__decorate([
    (0, bull_1.OnQueueCompleted)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MissionQueueProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bull_1.OnQueueFailed)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", void 0)
], MissionQueueProcessor.prototype, "onFailed", null);
exports.MissionQueueProcessor = MissionQueueProcessor = MissionQueueProcessor_1 = __decorate([
    (0, bull_1.Processor)('mission:queue'),
    __metadata("design:paramtypes", [mission_runtime_engine_1.MissionRuntimeEngine,
        mission_metrics_service_1.MissionMetricsService,
        realtime_gateway_1.RealtimeGateway,
        event_bus_service_1.EventBusService])
], MissionQueueProcessor);
//# sourceMappingURL=mission-queue.processor.js.map