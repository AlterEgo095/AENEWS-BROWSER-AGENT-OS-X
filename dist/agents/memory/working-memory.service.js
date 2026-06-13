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
var WorkingMemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkingMemoryService = void 0;
const common_1 = require("@nestjs/common");
let WorkingMemoryService = WorkingMemoryService_1 = class WorkingMemoryService {
    constructor() {
        this.logger = new common_1.Logger(WorkingMemoryService_1.name);
        this.store = new Map();
        this.cleanupInterval = null;
        this.startCleanupTimer();
    }
    set(agentId, key, value, ttlMs) {
        if (!this.store.has(agentId)) {
            this.store.set(agentId, new Map());
        }
        const agentStore = this.store.get(agentId);
        if (agentStore.size >= WorkingMemoryService_1.DEFAULT_MAX_ENTRIES_PER_AGENT && !agentStore.has(key)) {
            this.evictLRU(agentStore);
        }
        agentStore.set(key, {
            value,
            expiresAt: Date.now() + (ttlMs || WorkingMemoryService_1.DEFAULT_TTL_MS),
            createdAt: Date.now(),
            accessCount: 0,
            lastAccessedAt: Date.now(),
        });
        this.logger.debug?.(`Set working memory: ${agentId}:${key}`);
    }
    get(agentId, key) {
        const agentStore = this.store.get(agentId);
        if (!agentStore)
            return null;
        const entry = agentStore.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            agentStore.delete(key);
            return null;
        }
        entry.accessCount++;
        entry.lastAccessedAt = Date.now();
        return entry.value;
    }
    delete(agentId, key) {
        const agentStore = this.store.get(agentId);
        if (!agentStore)
            return false;
        return agentStore.delete(key);
    }
    has(agentId, key) {
        const agentStore = this.store.get(agentId);
        if (!agentStore)
            return false;
        const entry = agentStore.get(key);
        if (!entry)
            return false;
        if (Date.now() > entry.expiresAt) {
            agentStore.delete(key);
            return false;
        }
        return true;
    }
    clear(agentId) {
        const agentStore = this.store.get(agentId);
        if (!agentStore)
            return 0;
        const size = agentStore.size;
        agentStore.clear();
        this.store.delete(agentId);
        return size;
    }
    getSize(agentId) {
        const agentStore = this.store.get(agentId);
        return agentStore ? agentStore.size : 0;
    }
    cleanup() {
        let cleanedCount = 0;
        const now = Date.now();
        for (const [agentId, agentStore] of this.store) {
            for (const [key, entry] of agentStore) {
                if (now > entry.expiresAt) {
                    agentStore.delete(key);
                    cleanedCount++;
                }
            }
            if (agentStore.size === 0) {
                this.store.delete(agentId);
            }
        }
        if (cleanedCount > 0) {
            this.logger.debug?.(`Cleaned up ${cleanedCount} expired working memory entries`);
        }
        return cleanedCount;
    }
    getKeys(agentId) {
        const agentStore = this.store.get(agentId);
        if (!agentStore)
            return [];
        const now = Date.now();
        const keys = [];
        for (const [key, entry] of agentStore) {
            if (now <= entry.expiresAt) {
                keys.push(key);
            }
        }
        return keys;
    }
    getAllEntries(agentId) {
        const agentStore = this.store.get(agentId);
        if (!agentStore)
            return [];
        const now = Date.now();
        const entries = [];
        for (const [key, entry] of agentStore) {
            if (now <= entry.expiresAt) {
                entries.push({
                    key,
                    value: entry.value,
                    accessCount: entry.accessCount,
                    createdAt: entry.createdAt,
                });
            }
        }
        return entries;
    }
    getStats() {
        let totalEntries = 0;
        let totalSizeBytes = 0;
        const now = Date.now();
        for (const [, agentStore] of this.store) {
            for (const [, entry] of agentStore) {
                if (now <= entry.expiresAt) {
                    totalEntries++;
                    totalSizeBytes += this.estimateSize(entry.value);
                }
            }
        }
        return {
            totalAgents: this.store.size,
            totalEntries,
            totalSizeBytes,
        };
    }
    onModuleDestroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.store.clear();
    }
    evictLRU(agentStore) {
        let oldestKey = null;
        let oldestAccess = Infinity;
        for (const [key, entry] of agentStore) {
            if (entry.lastAccessedAt < oldestAccess) {
                oldestAccess = entry.lastAccessedAt;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            agentStore.delete(oldestKey);
            this.logger.debug?.(`LRU evicted working memory entry: ${oldestKey}`);
        }
    }
    startCleanupTimer() {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, WorkingMemoryService_1.CLEANUP_INTERVAL_MS);
    }
    estimateSize(value) {
        try {
            return JSON.stringify(value).length * 2;
        }
        catch {
            return 1024;
        }
    }
};
exports.WorkingMemoryService = WorkingMemoryService;
WorkingMemoryService.DEFAULT_TTL_MS = 5 * 60 * 1000;
WorkingMemoryService.DEFAULT_MAX_ENTRIES_PER_AGENT = 1000;
WorkingMemoryService.CLEANUP_INTERVAL_MS = 60000;
exports.WorkingMemoryService = WorkingMemoryService = WorkingMemoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], WorkingMemoryService);
//# sourceMappingURL=working-memory.service.js.map