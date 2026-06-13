"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var LongTermMemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LongTermMemoryService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
let LongTermMemoryService = LongTermMemoryService_1 = class LongTermMemoryService {
    constructor() {
        this.logger = new common_1.Logger(LongTermMemoryService_1.name);
        this.records = new Map();
        this.agentIndex = new Map();
        this.tagIndex = new Map();
        this.fullTextIndex = new Map();
    }
    async onModuleInit() {
        this.logger.log('Long-term memory service initialized');
    }
    async store(agentId, key, value, options) {
        const composedKey = `${agentId}:${key}`;
        const now = new Date();
        const existing = this.records.get(composedKey);
        if (existing && !options?.overwrite) {
            existing.value = value;
            existing.updatedAt = now;
            existing.accessCount++;
            existing.lastAccessedAt = now;
            if (options?.tags) {
                for (const oldTag of existing.tags) {
                    const tagSet = this.tagIndex.get(oldTag);
                    if (tagSet) {
                        tagSet.delete(composedKey);
                        if (tagSet.size === 0)
                            this.tagIndex.delete(oldTag);
                    }
                }
                existing.tags = [...new Set([...options.tags])];
                for (const tag of existing.tags) {
                    if (!this.tagIndex.has(tag)) {
                        this.tagIndex.set(tag, new Set());
                    }
                    this.tagIndex.get(tag).add(composedKey);
                }
            }
            if (options?.confidence !== undefined) {
                existing.confidence = options.confidence;
            }
            existing.fullText = this.buildFullText(key, value);
            return this.recordToEntry(existing);
        }
        const record = {
            id: (0, uuid_1.v4)(),
            agentId,
            key,
            value,
            tags: options?.tags || [],
            confidence: options?.confidence ?? 1.0,
            createdAt: now,
            updatedAt: now,
            accessCount: 1,
            lastAccessedAt: now,
            fullText: this.buildFullText(key, value),
        };
        this.records.set(composedKey, record);
        if (!this.agentIndex.has(agentId)) {
            this.agentIndex.set(agentId, new Set());
        }
        this.agentIndex.get(agentId).add(composedKey);
        for (const tag of record.tags) {
            if (!this.tagIndex.has(tag)) {
                this.tagIndex.set(tag, new Set());
            }
            this.tagIndex.get(tag).add(composedKey);
        }
        if (record.fullText) {
            this.indexFullText(composedKey, record.fullText);
        }
        this.logger.debug?.(`Stored long-term memory: ${composedKey}`);
        return this.recordToEntry(record);
    }
    async retrieve(agentId, key) {
        const composedKey = `${agentId}:${key}`;
        const record = this.records.get(composedKey);
        if (!record)
            return null;
        record.accessCount++;
        record.lastAccessedAt = new Date();
        return this.recordToEntry(record);
    }
    async query(query) {
        let results = [];
        if (query.agentId) {
            const agentKeys = this.agentIndex.get(query.agentId);
            if (agentKeys) {
                results = Array.from(agentKeys)
                    .map((key) => this.records.get(key))
                    .filter((r) => r !== undefined);
            }
        }
        else {
            results = Array.from(this.records.values());
        }
        if (query.key) {
            results = results.filter((r) => r.key === query.key);
        }
        if (query.keyPrefix) {
            results = results.filter((r) => r.key.startsWith(query.keyPrefix));
        }
        if (query.tags && query.tags.length > 0) {
            results = results.filter((r) => query.tags.some((tag) => r.tags.includes(tag)));
        }
        if (query.minConfidence !== undefined) {
            results = results.filter((r) => r.confidence >= query.minConfidence);
        }
        if (query.createdAfter) {
            results = results.filter((r) => r.createdAt >= query.createdAfter);
        }
        if (query.createdBefore) {
            results = results.filter((r) => r.createdAt <= query.createdBefore);
        }
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const total = results.length;
        const offset = query.offset || 0;
        const limit = query.limit || 50;
        const paginatedResults = results.slice(offset, offset + limit);
        return {
            entries: paginatedResults.map((r) => this.recordToEntry(r)),
            total,
            hasMore: offset + limit < total,
        };
    }
    async delete(agentId, key) {
        const composedKey = `${agentId}:${key}`;
        const record = this.records.get(composedKey);
        const deleted = this.records.delete(composedKey);
        if (deleted && record) {
            const agentKeys = this.agentIndex.get(agentId);
            if (agentKeys) {
                agentKeys.delete(composedKey);
                if (agentKeys.size === 0) {
                    this.agentIndex.delete(agentId);
                }
            }
            for (const tag of record.tags) {
                const tagSet = this.tagIndex.get(tag);
                if (tagSet) {
                    tagSet.delete(composedKey);
                    if (tagSet.size === 0) {
                        this.tagIndex.delete(tag);
                    }
                }
            }
            if (record.fullText) {
                this.deindexFullText(composedKey, record.fullText);
            }
        }
        return deleted;
    }
    async update(agentId, key, value) {
        const composedKey = `${agentId}:${key}`;
        const record = this.records.get(composedKey);
        if (!record)
            return null;
        if (typeof record.value === 'object' && record.value !== null && typeof value === 'object') {
            record.value = { ...record.value, ...value };
        }
        else {
            record.value = value;
        }
        record.updatedAt = new Date();
        record.fullText = this.buildFullText(key, record.value);
        return this.recordToEntry(record);
    }
    async getKeys(agentId) {
        const agentKeys = this.agentIndex.get(agentId);
        if (!agentKeys)
            return [];
        return Array.from(agentKeys).map((composedKey) => {
            const record = this.records.get(composedKey);
            return record?.key || composedKey.split(':').slice(1).join(':');
        });
    }
    async fullTextSearch(searchTerm, options) {
        const terms = searchTerm.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
        const matchedKeys = new Set();
        for (const term of terms) {
            const keys = this.fullTextIndex.get(term);
            if (keys) {
                for (const key of keys) {
                    if (!options?.agentId || key.startsWith(`${options.agentId}:`)) {
                        matchedKeys.add(key);
                    }
                }
            }
        }
        const results = [];
        for (const composedKey of matchedKeys) {
            const record = this.records.get(composedKey);
            if (record) {
                results.push(record);
            }
        }
        results.sort((a, b) => {
            const scoreA = this.calculateSearchScore(a, terms);
            const scoreB = this.calculateSearchScore(b, terms);
            return scoreB - scoreA;
        });
        const total = results.length;
        const offset = options?.offset || 0;
        const limit = options?.limit || 50;
        return {
            entries: results.slice(offset, offset + limit).map((r) => this.recordToEntry(r)),
            total,
            hasMore: offset + limit < total,
        };
    }
    async bulkStore(entries) {
        const results = [];
        for (const entry of entries) {
            const result = await this.store(entry.agentId, entry.key, entry.value, entry.options);
            results.push(result);
        }
        this.logger.debug?.(`Bulk stored ${results.length} entries in long-term memory`);
        return results;
    }
    async bulkDelete(agentId, keys) {
        let deletedCount = 0;
        for (const key of keys) {
            if (await this.delete(agentId, key)) {
                deletedCount++;
            }
        }
        return deletedCount;
    }
    async deleteAllByAgent(agentId) {
        const keys = await this.getKeys(agentId);
        return this.bulkDelete(agentId, keys);
    }
    getStats() {
        let totalSizeBytes = 0;
        for (const [, record] of this.records) {
            try {
                totalSizeBytes += JSON.stringify(record.value).length * 2;
            }
            catch {
                totalSizeBytes += 1024;
            }
        }
        return {
            totalAgents: this.agentIndex.size,
            totalEntries: this.records.size,
            totalSizeBytes,
            tagsCount: this.tagIndex.size,
        };
    }
    recordToEntry(record) {
        return {
            id: record.id,
            key: record.key,
            value: record.value,
            agentId: record.agentId,
            tags: [...record.tags],
            confidence: record.confidence,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            accessCount: record.accessCount,
            lastAccessedAt: record.lastAccessedAt,
        };
    }
    buildFullText(key, value) {
        try {
            const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
            return `${key} ${valueStr}`.toLowerCase();
        }
        catch {
            return key.toLowerCase();
        }
    }
    indexFullText(composedKey, fullText) {
        const tokens = fullText.split(/[\s,.\-_:;!?()[\]{}"'\/\\]+/).filter((t) => t.length > 1);
        for (const token of tokens) {
            if (!this.fullTextIndex.has(token)) {
                this.fullTextIndex.set(token, new Set());
            }
            this.fullTextIndex.get(token).add(composedKey);
        }
    }
    deindexFullText(composedKey, fullText) {
        const tokens = fullText.split(/[\s,.\-_:;!?()[\]{}"'\/\\]+/).filter((t) => t.length > 1);
        for (const token of tokens) {
            const tokenSet = this.fullTextIndex.get(token);
            if (tokenSet) {
                tokenSet.delete(composedKey);
                if (tokenSet.size === 0) {
                    this.fullTextIndex.delete(token);
                }
            }
        }
    }
    calculateSearchScore(record, terms) {
        let score = 0;
        const fullText = record.fullText || '';
        for (const term of terms) {
            if (record.key.toLowerCase().includes(term))
                score += 3;
            if (fullText.includes(term))
                score += 1;
            for (const tag of record.tags) {
                if (tag.toLowerCase().includes(term))
                    score += 2;
            }
        }
        return score;
    }
};
exports.LongTermMemoryService = LongTermMemoryService;
exports.LongTermMemoryService = LongTermMemoryService = LongTermMemoryService_1 = __decorate([
    (0, common_1.Injectable)()
], LongTermMemoryService);
//# sourceMappingURL=long-term-memory.service.js.map