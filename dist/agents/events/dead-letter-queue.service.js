"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DeadLetterQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeadLetterQueueService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const DEFAULT_RETRY_CONFIG = {
    maxRetryAttempts: 5,
    baseRetryIntervalMs: 60000,
    maxRetryIntervalMs: 3600000,
    exponentialBackoff: true,
    jitterMs: 5000,
};
let DeadLetterQueueService = DeadLetterQueueService_1 = class DeadLetterQueueService {
    constructor() {
        this.logger = new common_1.Logger(DeadLetterQueueService_1.name);
        this.queue = new Map();
        this.retryConfig = { ...DEFAULT_RETRY_CONFIG };
        this.repairHistory = new Map();
        this.retryInterval = null;
        this.eventBusRef = null;
    }
    async onModuleInit() {
        this.startRetryTimer();
        this.logger.log('Dead Letter Queue initialized');
    }
    async onModuleDestroy() {
        if (this.retryInterval) {
            clearInterval(this.retryInterval);
            this.retryInterval = null;
        }
        this.logger.log('Dead Letter Queue destroyed');
    }
    async add(entry) {
        const id = (0, uuid_1.v4)();
        const deadLetterEntry = {
            ...entry,
            id,
        };
        deadLetterEntry.canRetry = entry.failureCount < this.retryConfig.maxRetryAttempts;
        if (deadLetterEntry.canRetry) {
            const backoffMs = this.calculateRetryBackoff(entry.failureCount);
            deadLetterEntry.nextRetryAt = new Date(Date.now() + backoffMs);
        }
        this.queue.set(id, deadLetterEntry);
        this.repairHistory.set(id, []);
        if (this.queue.size > DeadLetterQueueService_1.MAX_QUEUE_SIZE) {
            this.evictOldest();
        }
        this.logger.warn(`Added event to dead letter queue: ${entry.originalEvent.type} ` +
            `(failure: ${entry.failureCount}, canRetry: ${deadLetterEntry.canRetry})`);
        return deadLetterEntry;
    }
    async get(id) {
        return this.queue.get(id) || null;
    }
    getAll() {
        return Array.from(this.queue.values());
    }
    getCount() {
        return this.queue.size;
    }
    async getPending(limit) {
        const now = new Date();
        const pending = [];
        for (const entry of this.queue.values()) {
            if (entry.canRetry &&
                entry.nextRetryAt &&
                now >= entry.nextRetryAt) {
                pending.push(entry);
            }
        }
        pending.sort((a, b) => {
            const aTime = a.nextRetryAt?.getTime() ?? Infinity;
            const bTime = b.nextRetryAt?.getTime() ?? Infinity;
            return aTime - bTime;
        });
        return pending.slice(0, limit || 50);
    }
    async retry(id) {
        const entry = this.queue.get(id);
        if (!entry)
            return false;
        if (!entry.canRetry) {
            this.logger.warn(`Dead letter entry ${id} cannot be retried (max attempts reached)`);
            return false;
        }
        try {
            await this.republishEvent(entry.originalEvent);
            this.recordRepairAttempt(id, true);
            this.queue.delete(id);
            this.repairHistory.delete(id);
            this.logger.log(`Successfully retried dead letter entry ${id} for event ${entry.originalEvent.type}`);
            return true;
        }
        catch (error) {
            entry.failureCount++;
            entry.lastFailedAt = new Date();
            entry.canRetry = entry.failureCount < this.retryConfig.maxRetryAttempts;
            if (entry.canRetry) {
                const backoffMs = this.calculateRetryBackoff(entry.failureCount);
                entry.nextRetryAt = new Date(Date.now() + backoffMs);
            }
            else {
                entry.nextRetryAt = undefined;
                this.logger.error(`Dead letter entry ${id} has exceeded max retry attempts (${this.retryConfig.maxRetryAttempts})`);
            }
            this.recordRepairAttempt(id, false, error.message);
            this.logger.error(`Retry failed for dead letter entry ${id} (attempt ${entry.failureCount}): ${error.message}`);
            return false;
        }
    }
    async discard(id) {
        const deleted = this.queue.delete(id);
        this.repairHistory.delete(id);
        if (deleted) {
            this.logger.warn(`Discarded dead letter entry ${id}`);
        }
        return deleted;
    }
    async getStats() {
        let pendingRetry = 0;
        let permanentlyFailed = 0;
        let oldestEntry;
        for (const entry of this.queue.values()) {
            if (entry.canRetry) {
                pendingRetry++;
            }
            else {
                permanentlyFailed++;
            }
            if (!oldestEntry || entry.lastFailedAt < oldestEntry) {
                oldestEntry = entry.lastFailedAt;
            }
        }
        return {
            totalEntries: this.queue.size,
            pendingRetry,
            permanentlyFailed,
            oldestEntry,
        };
    }
    getRepairHistory(entryId) {
        return this.repairHistory.get(entryId) || [];
    }
    getPermanentlyFailed() {
        return Array.from(this.queue.values()).filter((entry) => !entry.canRetry);
    }
    getByEventType(eventType) {
        return Array.from(this.queue.values()).filter((entry) => entry.originalEvent.type === eventType);
    }
    purge() {
        const count = this.queue.size;
        this.queue.clear();
        this.repairHistory.clear();
        this.logger.log(`Purged ${count} entries from dead letter queue`);
    }
    purgeOlderThan(date) {
        let purgedCount = 0;
        for (const [id, entry] of this.queue) {
            if (entry.lastFailedAt < date) {
                this.queue.delete(id);
                this.repairHistory.delete(id);
                purgedCount++;
            }
        }
        this.logger.log(`Purged ${purgedCount} entries older than ${date.toISOString()}`);
        return purgedCount;
    }
    purgePermanentlyFailed() {
        let purgedCount = 0;
        for (const [id, entry] of this.queue) {
            if (!entry.canRetry) {
                this.queue.delete(id);
                this.repairHistory.delete(id);
                purgedCount++;
            }
        }
        this.logger.log(`Purged ${purgedCount} permanently failed entries`);
        return purgedCount;
    }
    setEventBus(eventBus) {
        this.eventBusRef = eventBus;
    }
    async republishEvent(event) {
        if (this.eventBusRef) {
            await this.eventBusRef.publishEvent(event);
        }
        else {
            this.logger.warn('EventBus reference not set, cannot republish event directly. ' +
                'Ensure DeadLetterQueueService.setEventBus() is called during initialization.');
            throw new Error('EventBus reference not available for republishing');
        }
    }
    calculateRetryBackoff(failureCount) {
        let backoffMs;
        if (this.retryConfig.exponentialBackoff) {
            backoffMs = this.retryConfig.baseRetryIntervalMs * Math.pow(2, failureCount - 1);
            backoffMs = Math.min(backoffMs, this.retryConfig.maxRetryIntervalMs);
        }
        else {
            backoffMs = this.retryConfig.baseRetryIntervalMs;
        }
        if (this.retryConfig.jitterMs > 0) {
            const jitter = Math.random() * this.retryConfig.jitterMs;
            backoffMs += jitter;
        }
        return backoffMs;
    }
    recordRepairAttempt(entryId, success, error) {
        let history = this.repairHistory.get(entryId);
        if (!history) {
            history = [];
            this.repairHistory.set(entryId, history);
        }
        history.push({
            timestamp: new Date(),
            success,
            error,
        });
        if (history.length > 50) {
            history.shift();
        }
    }
    startRetryTimer() {
        this.retryInterval = setInterval(async () => {
            await this.processRetries();
        }, this.retryConfig.baseRetryIntervalMs);
    }
    async processRetries() {
        const pending = await this.getPending(DeadLetterQueueService_1.PURGE_BATCH_SIZE);
        for (const entry of pending) {
            try {
                await this.retry(entry.id);
            }
            catch (error) {
                this.logger.error(`Auto-retry failed for ${entry.id}: ${error.message}`);
            }
        }
        const twentyFourHoursAgo = new Date(Date.now() - 86400000);
        this.purgeOlderThan(twentyFourHoursAgo);
    }
    evictOldest() {
        let oldestId = null;
        let oldestTime = Infinity;
        for (const [id, entry] of this.queue) {
            if (entry.lastFailedAt.getTime() < oldestTime) {
                oldestTime = entry.lastFailedAt.getTime();
                oldestId = id;
            }
        }
        if (oldestId) {
            this.queue.delete(oldestId);
            this.repairHistory.delete(oldestId);
            this.logger.warn(`Evicted oldest dead letter entry ${oldestId}`);
        }
    }
};
exports.DeadLetterQueueService = DeadLetterQueueService;
DeadLetterQueueService.MAX_QUEUE_SIZE = 10000;
DeadLetterQueueService.PURGE_BATCH_SIZE = 100;
exports.DeadLetterQueueService = DeadLetterQueueService = DeadLetterQueueService_1 = __decorate([
    (0, common_1.Injectable)()
], DeadLetterQueueService);
//# sourceMappingURL=dead-letter-queue.service.js.map