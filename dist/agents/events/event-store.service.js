"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EventStoreService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStoreService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const agent_event_interface_1 = require("../interfaces/agent-event.interface");
let EventStoreService = EventStoreService_1 = class EventStoreService {
    constructor() {
        this.logger = new common_1.Logger(EventStoreService_1.name);
        this.records = new Map();
        this.typeIndex = new Map();
        this.sourceIndex = new Map();
        this.targetIndex = new Map();
        this.correlationIndex = new Map();
        this.timeIndex = [];
        this.maxStoreSize = 100000;
        this.initializedAt = new Date();
        this.totalProcessingTimeMs = 0;
        this.processedCount = 0;
    }
    async onModuleInit() {
        this.initializedAt = new Date();
        this.logger.log('Event Store initialized');
    }
    async store(event) {
        const entry = {
            id: (0, uuid_1.v4)(),
            event,
            storedAt: new Date(),
            processingAttempts: 0,
            status: agent_event_interface_1.EventProcessingStatus.PENDING,
        };
        const record = { entry, event };
        this.records.set(entry.id, record);
        if (!this.typeIndex.has(event.type)) {
            this.typeIndex.set(event.type, new Set());
        }
        this.typeIndex.get(event.type).add(entry.id);
        if (!this.sourceIndex.has(event.sourceAgentId)) {
            this.sourceIndex.set(event.sourceAgentId, new Set());
        }
        this.sourceIndex.get(event.sourceAgentId).add(entry.id);
        if (event.targetAgentId) {
            if (!this.targetIndex.has(event.targetAgentId)) {
                this.targetIndex.set(event.targetAgentId, new Set());
            }
            this.targetIndex.get(event.targetAgentId).add(entry.id);
        }
        if (event.correlationId) {
            if (!this.correlationIndex.has(event.correlationId)) {
                this.correlationIndex.set(event.correlationId, new Set());
            }
            this.correlationIndex.get(event.correlationId).add(entry.id);
        }
        const timeEntry = {
            timestamp: event.timestamp.getTime(),
            id: entry.id,
        };
        this.insertIntoTimeIndex(timeEntry);
        if (this.records.size > this.maxStoreSize) {
            this.evictOldest();
        }
        return entry;
    }
    async getEvent(id) {
        const record = this.records.get(id);
        return record ? { ...record.entry } : null;
    }
    getRawEvent(entryId) {
        const record = this.records.get(entryId);
        return record ? { ...record.event } : null;
    }
    async query(filter) {
        let candidateIds = new Set();
        if (filter.eventTypes && filter.eventTypes.length > 0) {
            for (const type of filter.eventTypes) {
                const typeIds = this.typeIndex.get(type);
                if (typeIds) {
                    for (const id of typeIds) {
                        candidateIds.add(id);
                    }
                }
            }
        }
        else {
            candidateIds = new Set(this.records.keys());
        }
        if (filter.sourceAgentId) {
            const sourceIds = this.sourceIndex.get(filter.sourceAgentId);
            if (sourceIds) {
                candidateIds = new Set(Array.from(candidateIds).filter((id) => sourceIds.has(id)));
            }
            else {
                return [];
            }
        }
        if (filter.targetAgentId) {
            const targetIds = this.targetIndex.get(filter.targetAgentId);
            if (targetIds) {
                candidateIds = new Set(Array.from(candidateIds).filter((id) => targetIds.has(id)));
            }
            else {
                return [];
            }
        }
        if (filter.correlationId) {
            const correlationIds = this.correlationIndex.get(filter.correlationId);
            if (correlationIds) {
                candidateIds = new Set(Array.from(candidateIds).filter((id) => correlationIds.has(id)));
            }
            else {
                return [];
            }
        }
        const results = [];
        for (const id of candidateIds) {
            const record = this.records.get(id);
            if (!record)
                continue;
            const event = record.event;
            if (filter.fromTimestamp && event.timestamp < filter.fromTimestamp) {
                continue;
            }
            if (filter.toTimestamp && event.timestamp > filter.toTimestamp) {
                continue;
            }
            results.push({ ...record.entry });
        }
        results.sort((a, b) => b.event.timestamp.getTime() - a.event.timestamp.getTime());
        const offset = filter.offset || 0;
        const limit = filter.limit || 50;
        return results.slice(offset, offset + limit);
    }
    async queryByAgent(agentId, options) {
        return this.query({
            sourceAgentId: agentId,
            eventTypes: options?.eventTypes,
            fromTimestamp: options?.fromTimestamp,
            toTimestamp: options?.toTimestamp,
            limit: options?.limit || 100,
        });
    }
    async queryByType(eventType, options) {
        return this.query({
            eventTypes: [eventType],
            sourceAgentId: options?.sourceAgentId,
            fromTimestamp: options?.fromTimestamp,
            toTimestamp: options?.toTimestamp,
            limit: options?.limit || 100,
        });
    }
    async queryByTimeRange(from, to, limit) {
        return this.query({
            fromTimestamp: from,
            toTimestamp: to,
            limit: limit || 1000,
        });
    }
    async markProcessed(id) {
        const record = this.records.get(id);
        if (!record)
            return;
        const processingTime = Date.now() - record.entry.storedAt.getTime();
        record.entry.status = agent_event_interface_1.EventProcessingStatus.COMPLETED;
        record.entry.processedAt = new Date();
        record.entry.processingAttempts++;
        this.totalProcessingTimeMs += processingTime;
        this.processedCount++;
    }
    async markFailed(id, error) {
        const record = this.records.get(id);
        if (!record)
            return;
        record.entry.status = agent_event_interface_1.EventProcessingStatus.FAILED;
        record.entry.processingAttempts++;
    }
    getCount() {
        return this.records.size;
    }
    getCountByType(eventType) {
        const ids = this.typeIndex.get(eventType);
        return ids ? ids.size : 0;
    }
    getCountByAgent(agentId) {
        const ids = this.sourceIndex.get(agentId);
        return ids ? ids.size : 0;
    }
    getCountByTimeRange(from, to) {
        let count = 0;
        for (const record of this.records.values()) {
            const ts = record.event.timestamp;
            if (ts >= from && ts <= to) {
                count++;
            }
        }
        return count;
    }
    getStatistics() {
        const byStatus = {};
        const byType = {};
        const byAgentId = {};
        for (const status of Object.values(agent_event_interface_1.EventProcessingStatus)) {
            byStatus[status] = 0;
        }
        let oldestTimestamp = Infinity;
        let newestTimestamp = -Infinity;
        let totalPayloadSize = 0;
        for (const record of this.records.values()) {
            byStatus[record.entry.status] = (byStatus[record.entry.status] || 0) + 1;
            byType[record.event.type] = (byType[record.event.type] || 0) + 1;
            byAgentId[record.event.sourceAgentId] = (byAgentId[record.event.sourceAgentId] || 0) + 1;
            const ts = record.event.timestamp.getTime();
            if (ts < oldestTimestamp)
                oldestTimestamp = ts;
            if (ts > newestTimestamp)
                newestTimestamp = ts;
            totalPayloadSize += JSON.stringify(record.event.payload).length;
        }
        const uptimeMs = Date.now() - this.initializedAt.getTime();
        const eventsPerMinute = uptimeMs > 0 ? Math.round((this.records.size / uptimeMs) * 60000 * 100) / 100 : 0;
        const avgProcessingTimeMs = this.processedCount > 0 ? Math.round(this.totalProcessingTimeMs / this.processedCount) : 0;
        return {
            totalEvents: this.records.size,
            byStatus: byStatus,
            byType,
            byAgentId,
            oldestEvent: oldestTimestamp < Infinity ? new Date(oldestTimestamp) : undefined,
            newestEvent: newestTimestamp > -Infinity ? new Date(newestTimestamp) : undefined,
            totalPayloadSizeBytes: totalPayloadSize,
            eventsPerMinute,
            avgProcessingTimeMs,
        };
    }
    getStats() {
        const stats = this.getStatistics();
        return {
            totalEvents: stats.totalEvents,
            byStatus: stats.byStatus,
            byType: stats.byType,
            oldestEvent: stats.oldestEvent,
            newestEvent: stats.newestEvent,
        };
    }
    clear() {
        const count = this.records.size;
        this.records.clear();
        this.typeIndex.clear();
        this.sourceIndex.clear();
        this.targetIndex.clear();
        this.correlationIndex.clear();
        this.timeIndex.length = 0;
        this.totalProcessingTimeMs = 0;
        this.processedCount = 0;
        this.logger.log(`Cleared ${count} events from store`);
        return count;
    }
    insertIntoTimeIndex(entry) {
        let low = 0;
        let high = this.timeIndex.length;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (this.timeIndex[mid].timestamp < entry.timestamp) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        this.timeIndex.splice(low, 0, entry);
    }
    evictOldest() {
        const toRemove = Math.floor(this.maxStoreSize * 0.1);
        for (let i = 0; i < toRemove && this.timeIndex.length > 0; i++) {
            const oldest = this.timeIndex[0];
            this.removeEntry(oldest.id);
        }
        this.logger.debug?.(`Evicted ${toRemove} oldest events`);
    }
    removeEntry(id) {
        const record = this.records.get(id);
        if (!record)
            return;
        const typeSet = this.typeIndex.get(record.event.type);
        if (typeSet) {
            typeSet.delete(id);
            if (typeSet.size === 0)
                this.typeIndex.delete(record.event.type);
        }
        const sourceSet = this.sourceIndex.get(record.event.sourceAgentId);
        if (sourceSet) {
            sourceSet.delete(id);
            if (sourceSet.size === 0)
                this.sourceIndex.delete(record.event.sourceAgentId);
        }
        if (record.event.targetAgentId) {
            const targetSet = this.targetIndex.get(record.event.targetAgentId);
            if (targetSet) {
                targetSet.delete(id);
                if (targetSet.size === 0)
                    this.targetIndex.delete(record.event.targetAgentId);
            }
        }
        if (record.event.correlationId) {
            const corrSet = this.correlationIndex.get(record.event.correlationId);
            if (corrSet) {
                corrSet.delete(id);
                if (corrSet.size === 0)
                    this.correlationIndex.delete(record.event.correlationId);
            }
        }
        this.records.delete(id);
        const timeIdx = this.timeIndex.findIndex((t) => t.id === id);
        if (timeIdx >= 0) {
            this.timeIndex.splice(timeIdx, 1);
        }
    }
};
exports.EventStoreService = EventStoreService;
exports.EventStoreService = EventStoreService = EventStoreService_1 = __decorate([
    (0, common_1.Injectable)()
], EventStoreService);
//# sourceMappingURL=event-store.service.js.map