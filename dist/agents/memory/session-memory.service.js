"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SessionMemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionMemoryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let SessionMemoryService = SessionMemoryService_1 = class SessionMemoryService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SessionMemoryService_1.name);
        this.redisClient = null;
        this.store = new Map();
        this.cleanupInterval = null;
    }
    async onModuleInit() {
        await this.initializeRedis();
        this.startCleanupTimer();
        this.logger.log('Session Memory service initialized');
    }
    onModuleDestroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.store.clear();
        if (this.redisClient) {
            try {
                this.redisClient.disconnect();
            }
            catch {
            }
        }
    }
    async initializeRedis() {
        try {
            const redis = await Promise.resolve().then(() => __importStar(require('ioredis')));
            const url = this.configService.get('REDIS_URL', 'redis://localhost:6379');
            this.redisClient = new redis.default(url, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > 5)
                        return null;
                    return Math.min(times * 200, 5000);
                },
            });
            this.redisClient.on('connect', () => {
                this.logger.log('Connected to Redis for session memory');
            });
            this.redisClient.on('error', (err) => {
                this.logger.warn(`Redis session memory error: ${err.message}`);
            });
            await this.redisClient.ping();
        }
        catch (error) {
            this.logger.warn(`Redis not available, using in-memory session store: ${error.message}`);
            this.redisClient = null;
        }
    }
    async set(agentId, sessionId, key, value, ttlMs) {
        const composedKey = this.composeKey(agentId, sessionId, key);
        const now = new Date();
        const effectiveTtl = ttlMs || SessionMemoryService_1.DEFAULT_TTL_MS;
        const entry = {
            key,
            value,
            sessionId,
            agentId,
            createdAt: now,
            expiresAt: new Date(now.getTime() + effectiveTtl),
            metadata: {},
        };
        if (this.redisClient) {
            try {
                const serialized = JSON.stringify(entry);
                await this.redisClient.setex(`${SessionMemoryService_1.KEY_PREFIX}${composedKey}`, Math.ceil(effectiveTtl / 1000), serialized);
            }
            catch (error) {
                this.logger.warn(`Redis session set failed, using in-memory: ${error.message}`);
            }
        }
        this.store.set(composedKey, entry);
        this.logger.debug?.(`Set session memory: ${composedKey}`);
    }
    async get(agentId, sessionId, key) {
        const composedKey = this.composeKey(agentId, sessionId, key);
        const entry = this.store.get(composedKey);
        if (entry) {
            if (entry.expiresAt && new Date() > entry.expiresAt) {
                this.store.delete(composedKey);
                return null;
            }
            return entry.value;
        }
        if (this.redisClient) {
            try {
                const serialized = await this.redisClient.get(`${SessionMemoryService_1.KEY_PREFIX}${composedKey}`);
                if (serialized) {
                    const redisEntry = JSON.parse(serialized);
                    this.store.set(composedKey, redisEntry);
                    return redisEntry.value;
                }
            }
            catch (error) {
                this.logger.warn(`Redis session get failed: ${error.message}`);
            }
        }
        return null;
    }
    async delete(agentId, sessionId, key) {
        const composedKey = this.composeKey(agentId, sessionId, key);
        if (this.redisClient) {
            try {
                await this.redisClient.del(`${SessionMemoryService_1.KEY_PREFIX}${composedKey}`);
            }
            catch (error) {
                this.logger.warn(`Redis session delete failed: ${error.message}`);
            }
        }
        return this.store.delete(composedKey);
    }
    async getSessionKeys(agentId, sessionId) {
        const prefix = `${agentId}:${sessionId}:`;
        const keys = [];
        const now = new Date();
        for (const [composedKey, entry] of this.store) {
            if (composedKey.startsWith(prefix)) {
                if (!entry.expiresAt || now <= entry.expiresAt) {
                    keys.push(entry.key);
                }
            }
        }
        return keys;
    }
    async clearSession(agentId, sessionId) {
        const prefix = `${agentId}:${sessionId}:`;
        let count = 0;
        for (const key of Array.from(this.store.keys())) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
                count++;
                if (this.redisClient) {
                    try {
                        await this.redisClient.del(`${SessionMemoryService_1.KEY_PREFIX}${key}`);
                    }
                    catch {
                    }
                }
            }
        }
        return count;
    }
    async getAgentSessions(agentId) {
        const sessions = new Set();
        for (const [, entry] of this.store) {
            if (entry.agentId === agentId) {
                sessions.add(entry.sessionId);
            }
        }
        return Array.from(sessions);
    }
    async setBatch(agentId, sessionId, entries) {
        for (const entry of entries) {
            await this.set(agentId, sessionId, entry.key, entry.value, entry.ttlMs);
        }
    }
    async getBatch(agentId, sessionId, keys) {
        const results = new Map();
        for (const key of keys) {
            results.set(key, await this.get(agentId, sessionId, key));
        }
        return results;
    }
    async getSessionContext(agentId, sessionId) {
        const keys = await this.getSessionKeys(agentId, sessionId);
        const context = new Map();
        for (const key of keys) {
            const value = await this.get(agentId, sessionId, key);
            if (value !== null) {
                context.set(key, value);
            }
        }
        return context;
    }
    async extendTtl(agentId, sessionId, key, additionalMs) {
        const composedKey = this.composeKey(agentId, sessionId, key);
        const entry = this.store.get(composedKey);
        if (!entry)
            return false;
        if (entry.expiresAt) {
            entry.expiresAt = new Date(entry.expiresAt.getTime() + additionalMs);
        }
        else {
            entry.expiresAt = new Date(Date.now() + additionalMs);
        }
        if (this.redisClient) {
            try {
                const remainingTtl = await this.redisClient.ttl(`${SessionMemoryService_1.KEY_PREFIX}${composedKey}`);
                if (remainingTtl > 0) {
                    await this.redisClient.expire(`${SessionMemoryService_1.KEY_PREFIX}${composedKey}`, remainingTtl + Math.ceil(additionalMs / 1000));
                }
            }
            catch {
            }
        }
        return true;
    }
    async extendSessionTtl(agentId, sessionId, additionalMs) {
        const keys = await this.getSessionKeys(agentId, sessionId);
        let extended = 0;
        for (const key of keys) {
            const success = await this.extendTtl(agentId, sessionId, key, additionalMs);
            if (success)
                extended++;
        }
        return extended;
    }
    cleanup() {
        let cleanedCount = 0;
        const now = new Date();
        for (const [key, entry] of this.store) {
            if (entry.expiresAt && now > entry.expiresAt) {
                this.store.delete(key);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            this.logger.debug?.(`Cleaned up ${cleanedCount} expired session memory entries`);
        }
        return cleanedCount;
    }
    getStats() {
        const sessions = new Set();
        let totalSizeBytes = 0;
        for (const [, entry] of this.store) {
            sessions.add(entry.sessionId);
            try {
                totalSizeBytes += JSON.stringify(entry.value).length * 2;
            }
            catch {
                totalSizeBytes += 1024;
            }
        }
        return {
            totalSessions: sessions.size,
            totalEntries: this.store.size,
            totalSizeBytes,
            connectedToRedis: this.redisClient !== null,
        };
    }
    composeKey(agentId, sessionId, key) {
        return `${agentId}:${sessionId}:${key}`;
    }
    startCleanupTimer() {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, SessionMemoryService_1.CLEANUP_INTERVAL_MS);
    }
};
exports.SessionMemoryService = SessionMemoryService;
SessionMemoryService.DEFAULT_TTL_MS = 30 * 60 * 1000;
SessionMemoryService.CLEANUP_INTERVAL_MS = 120000;
SessionMemoryService.KEY_PREFIX = 'aenews:session:';
exports.SessionMemoryService = SessionMemoryService = SessionMemoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SessionMemoryService);
//# sourceMappingURL=session-memory.service.js.map