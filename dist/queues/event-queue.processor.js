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
var EventQueueProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventQueueProcessor = exports.EventJobType = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const event_bus_service_1 = require("../agents/events/event-bus.service");
const realtime_gateway_1 = require("../realtime/realtime.gateway");
var EventJobType;
(function (EventJobType) {
    EventJobType["REPLAY_EVENTS"] = "replay_events";
    EventJobType["BATCH_NOTIFY"] = "batch_notify";
    EventJobType["AGGREGATE_METRICS"] = "aggregate_metrics";
    EventJobType["PROCESS_DLQ"] = "process_dlq";
})(EventJobType || (exports.EventJobType = EventJobType = {}));
let EventQueueProcessor = EventQueueProcessor_1 = class EventQueueProcessor {
    constructor(eventBus, realtimeGateway) {
        this.eventBus = eventBus;
        this.realtimeGateway = realtimeGateway;
        this.logger = new common_1.Logger(EventQueueProcessor_1.name);
    }
    async processEventJob(job) {
        const { type, payload } = job.data;
        switch (type) {
            case EventJobType.REPLAY_EVENTS:
                return this.handleReplayEvents(job, payload);
            case EventJobType.BATCH_NOTIFY:
                return this.handleBatchNotify(job, payload);
            case EventJobType.AGGREGATE_METRICS:
                return this.handleAggregateMetrics(job, payload);
            case EventJobType.PROCESS_DLQ:
                return this.handleProcessDLQ(job);
            default:
                this.logger.warn(`Unknown event job type: ${type}`);
                return { success: false, error: `Unknown job type: ${type}` };
        }
    }
    async handleReplayEvents(job, payload) {
        await job.progress(10);
        const fromTimestamp = new Date(payload.fromTimestamp);
        const toTimestamp = new Date(payload.toTimestamp);
        let replayed = 0;
        for await (const event of this.eventBus.replayEvents(fromTimestamp, toTimestamp)) {
            this.realtimeGateway.pushSystemEvent(realtime_gateway_1.RealtimeEventType.SYSTEM_ALERT, {
                replay: true,
                event,
            });
            replayed++;
        }
        await job.progress(100);
        this.logger.log(`Replayed ${replayed} events from ${fromTimestamp} to ${toTimestamp}`);
        return { replayed };
    }
    async handleBatchNotify(job, payload) {
        await job.progress(50);
        this.realtimeGateway.pushSystemEvent(realtime_gateway_1.RealtimeEventType.SYSTEM_ALERT, payload.data);
        await job.progress(100);
        return { notified: true };
    }
    async handleAggregateMetrics(job, _payload) {
        await job.progress(50);
        const stats = this.eventBus.getStats();
        await job.progress(100);
        return {
            eventBusStats: stats,
            deadLetterCount: stats.deadLetterCount,
        };
    }
    async handleProcessDLQ(job) {
        await job.progress(30);
        const dlq = this.eventBus.getDeadLetterQueue();
        let retried = 0;
        for (const entry of dlq) {
            if (entry.canRetry) {
                try {
                    await this.eventBus.retryDeadLetter(entry.id);
                    retried++;
                }
                catch {
                }
            }
        }
        await job.progress(100);
        return { retried, purged: 0 };
    }
    onActive(job) {
        this.logger.debug(`Event job ${job.id} started (type: ${job.data.type})`);
    }
    onCompleted(job) {
        this.logger.debug(`Event job ${job.id} completed`);
    }
    onFailed(job, error) {
        this.logger.error(`Event job ${job.id} failed: ${error.message}`);
    }
};
exports.EventQueueProcessor = EventQueueProcessor;
__decorate([
    (0, bull_1.Process)({ name: 'process' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventQueueProcessor.prototype, "processEventJob", null);
__decorate([
    (0, bull_1.OnQueueActive)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventQueueProcessor.prototype, "onActive", null);
__decorate([
    (0, bull_1.OnQueueCompleted)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventQueueProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bull_1.OnQueueFailed)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", void 0)
], EventQueueProcessor.prototype, "onFailed", null);
exports.EventQueueProcessor = EventQueueProcessor = EventQueueProcessor_1 = __decorate([
    (0, bull_1.Processor)('event:queue'),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService,
        realtime_gateway_1.RealtimeGateway])
], EventQueueProcessor);
//# sourceMappingURL=event-queue.processor.js.map