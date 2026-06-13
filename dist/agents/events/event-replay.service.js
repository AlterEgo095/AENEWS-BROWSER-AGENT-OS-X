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
var EventReplayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventReplayService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const event_store_service_1 = require("./event-store.service");
const event_bus_service_1 = require("./event-bus.service");
const DEFAULT_RATE_LIMITER = {
    eventsPerSecond: 100,
    burstSize: 50,
};
let EventReplayService = EventReplayService_1 = class EventReplayService {
    constructor(eventStore, eventBus) {
        this.eventStore = eventStore;
        this.eventBus = eventBus;
        this.logger = new common_1.Logger(EventReplayService_1.name);
        this.activeReplays = new Map();
        this.rateLimiterConfig = { ...DEFAULT_RATE_LIMITER };
        this.lastReplayTimestamp = 0;
        this.tokenBucket = DEFAULT_RATE_LIMITER.burstSize;
    }
    async replay(request) {
        const replayId = (0, uuid_1.v4)();
        const startTime = Date.now();
        this.logger.log(`Starting event replay ${replayId} from ${request.fromTimestamp} to ${request.toTimestamp}`);
        const state = {
            id: replayId,
            request,
            status: 'running',
            result: null,
            startedAt: new Date(),
            progress: 0,
            processedCount: 0,
        };
        this.activeReplays.set(replayId, state);
        try {
            const events = await this.eventStore.query({
                eventTypes: request.eventTypes,
                sourceAgentId: request.sourceAgentId,
                fromTimestamp: request.fromTimestamp,
                toTimestamp: request.toTimestamp,
                limit: request.maxEvents || 1000,
            });
            const totalEvents = events.length;
            let replayedCount = 0;
            let failedCount = 0;
            let skippedCount = 0;
            for (let i = 0; i < events.length; i++) {
                if (state.status === 'cancelled') {
                    this.logger.log(`Replay ${replayId} was cancelled`);
                    break;
                }
                const entry = events[i];
                try {
                    if (entry.status === 'completed') {
                        skippedCount++;
                        continue;
                    }
                    await this.rateLimit();
                    await this.eventBus.publish({
                        type: entry.event.type,
                        sourceAgentId: entry.event.sourceAgentId,
                        targetAgentId: request.targetSubscriberId || entry.event.targetAgentId,
                        cluster: entry.event.cluster,
                        payload: entry.event.payload,
                        priority: entry.event.priority,
                        correlationId: entry.event.correlationId,
                        causationId: entry.event.id,
                        metadata: {
                            ...entry.event.metadata,
                            isReplay: true,
                            replayId,
                            originalEventId: entry.event.id,
                            originalTimestamp: entry.event.timestamp,
                        },
                    });
                    await this.eventStore.markProcessed(entry.id);
                    replayedCount++;
                    state.processedCount = replayedCount;
                    state.progress = Math.round(((i + 1) / totalEvents) * 100);
                }
                catch (error) {
                    failedCount++;
                    this.logger.warn(`Failed to replay event ${entry.event.id}: ${error.message}`);
                    await this.eventStore.markFailed(entry.id, error.message);
                }
            }
            const result = {
                replayedCount,
                failedCount,
                skippedCount,
                durationMs: Date.now() - startTime,
            };
            state.status = 'completed';
            state.result = result;
            state.completedAt = new Date();
            state.progress = 100;
            this.logger.log(`Event replay ${replayId} completed: ${replayedCount} replayed, ` +
                `${failedCount} failed, ${skippedCount} skipped in ${result.durationMs}ms`);
            return result;
        }
        catch (error) {
            state.status = 'failed';
            state.completedAt = new Date();
            const result = {
                replayedCount: state.processedCount,
                failedCount: 0,
                skippedCount: 0,
                durationMs: Date.now() - startTime,
            };
            state.result = result;
            this.logger.error(`Event replay ${replayId} failed: ${error.message}`);
            return result;
        }
        finally {
            setTimeout(() => {
                this.activeReplays.delete(replayId);
            }, 300000);
        }
    }
    async replayForAgent(agentId, fromTimestamp, toTimestamp, options) {
        return this.replay({
            sourceAgentId: agentId,
            fromTimestamp,
            toTimestamp,
            eventTypes: options?.eventTypes,
            maxEvents: options?.maxEvents || 500,
            targetSubscriberId: options?.targetSubscriberId || agentId,
        });
    }
    async replayWithFilter(fromTimestamp, toTimestamp, filter, options) {
        const replayId = (0, uuid_1.v4)();
        const startTime = Date.now();
        this.logger.log(`Starting filtered event replay ${replayId}`);
        const state = {
            id: replayId,
            request: {
                fromTimestamp,
                toTimestamp,
                targetSubscriberId: options?.targetSubscriberId || 'replay-subscriber',
            },
            status: 'running',
            result: null,
            startedAt: new Date(),
            progress: 0,
            processedCount: 0,
        };
        this.activeReplays.set(replayId, state);
        try {
            const events = await this.eventStore.query({
                eventTypes: filter.eventTypes,
                sourceAgentId: filter.sourceAgentId,
                fromTimestamp,
                toTimestamp,
                limit: options?.maxEvents || 1000,
            });
            let replayedCount = 0;
            let failedCount = 0;
            let skippedCount = 0;
            for (let i = 0; i < events.length; i++) {
                const entry = events[i];
                if (filter.customFilter && !filter.customFilter(entry.event)) {
                    skippedCount++;
                    continue;
                }
                if (filter.minPriority !== undefined && entry.event.priority < filter.minPriority) {
                    skippedCount++;
                    continue;
                }
                try {
                    await this.rateLimit();
                    await this.eventBus.publish({
                        type: entry.event.type,
                        sourceAgentId: entry.event.sourceAgentId,
                        targetAgentId: options?.targetSubscriberId || entry.event.targetAgentId,
                        cluster: entry.event.cluster,
                        payload: entry.event.payload,
                        priority: entry.event.priority,
                        correlationId: entry.event.correlationId,
                        causationId: entry.event.id,
                        metadata: {
                            ...entry.event.metadata,
                            isReplay: true,
                            replayId,
                            filteredReplay: true,
                            originalEventId: entry.event.id,
                            originalTimestamp: entry.event.timestamp,
                        },
                    });
                    await this.eventStore.markProcessed(entry.id);
                    replayedCount++;
                    state.processedCount = replayedCount;
                    state.progress = Math.round(((i + 1) / events.length) * 100);
                }
                catch (error) {
                    failedCount++;
                    await this.eventStore.markFailed(entry.id, error.message);
                }
            }
            const result = {
                replayedCount,
                failedCount,
                skippedCount,
                durationMs: Date.now() - startTime,
            };
            state.status = 'completed';
            state.result = result;
            state.completedAt = new Date();
            return result;
        }
        catch (error) {
            state.status = 'failed';
            const result = {
                replayedCount: state.processedCount,
                failedCount: 0,
                skippedCount: 0,
                durationMs: Date.now() - startTime,
            };
            state.result = result;
            return result;
        }
        finally {
            setTimeout(() => {
                this.activeReplays.delete(replayId);
            }, 300000);
        }
    }
    async getReplayStatus(replayId) {
        const state = this.activeReplays.get(replayId);
        return state?.result || null;
    }
    getReplayState(replayId) {
        return this.activeReplays.get(replayId) || null;
    }
    cancelReplay(replayId) {
        const state = this.activeReplays.get(replayId);
        if (!state || state.status !== 'running')
            return false;
        state.status = 'cancelled';
        state.completedAt = new Date();
        this.logger.log(`Replay ${replayId} cancelled`);
        return true;
    }
    getActiveReplays() {
        return Array.from(this.activeReplays.values()).map((state) => ({
            id: state.id,
            status: state.status,
            startedAt: state.startedAt,
            progress: state.progress,
            processedCount: state.processedCount,
        }));
    }
    setRateLimiterConfig(config) {
        if (config.eventsPerSecond !== undefined) {
            this.rateLimiterConfig.eventsPerSecond = config.eventsPerSecond;
        }
        if (config.burstSize !== undefined) {
            this.rateLimiterConfig.burstSize = config.burstSize;
            this.tokenBucket = config.burstSize;
        }
        this.logger.log(`Rate limiter configured: ${this.rateLimiterConfig.eventsPerSecond} events/sec, ` +
            `burst: ${this.rateLimiterConfig.burstSize}`);
    }
    async rateLimit() {
        const now = Date.now();
        const timeSinceLastEvent = now - this.lastReplayTimestamp;
        const intervalMs = 1000 / this.rateLimiterConfig.eventsPerSecond;
        const tokensToAdd = Math.floor(timeSinceLastEvent / intervalMs);
        if (tokensToAdd > 0) {
            this.tokenBucket = Math.min(this.tokenBucket + tokensToAdd, this.rateLimiterConfig.burstSize);
            this.lastReplayTimestamp = now;
        }
        if (this.tokenBucket > 0) {
            this.tokenBucket--;
            return;
        }
        const waitMs = intervalMs - timeSinceLastEvent;
        if (waitMs > 0) {
            await this.sleep(waitMs);
        }
        this.lastReplayTimestamp = Date.now();
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.EventReplayService = EventReplayService;
exports.EventReplayService = EventReplayService = EventReplayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_store_service_1.EventStoreService,
        event_bus_service_1.EventBusService])
], EventReplayService);
//# sourceMappingURL=event-replay.service.js.map