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
var MemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const agent_memory_interface_1 = require("../interfaces/agent-memory.interface");
const working_memory_service_1 = require("./working-memory.service");
const session_memory_service_1 = require("./session-memory.service");
const long_term_memory_service_1 = require("./long-term-memory.service");
const knowledge_graph_service_1 = require("./knowledge-graph.service");
const vector_search_service_1 = require("./vector-search.service");
let MemoryService = MemoryService_1 = class MemoryService {
    constructor(workingMemory, sessionMemory, longTermMemory, knowledgeGraph, vectorSearch) {
        this.workingMemory = workingMemory;
        this.sessionMemory = sessionMemory;
        this.longTermMemory = longTermMemory;
        this.knowledgeGraph = knowledgeGraph;
        this.vectorSearch = vectorSearch;
        this.logger = new common_1.Logger(MemoryService_1.name);
    }
    async store(agentId, key, value, tier, options) {
        const now = new Date();
        const id = (0, uuid_1.v4)();
        const metadata = {
            source: `memory_service:${tier}`,
            confidence: options?.confidence ?? 1.0,
            tags: options?.tags || [],
            accessCount: 0,
            lastAccessedAt: now,
            size: this.estimateSize(value),
            encoding: options?.encoding || agent_memory_interface_1.MemoryEncoding.JSON,
        };
        const entry = {
            id,
            key,
            value,
            tier,
            agentId,
            sessionId: options?.sessionId,
            correlationId: options?.correlationId,
            metadata,
            createdAt: now,
            updatedAt: now,
            expiresAt: options?.ttlMs ? new Date(now.getTime() + options.ttlMs) : undefined,
        };
        switch (tier) {
            case agent_memory_interface_1.MemoryTier.WORKING:
                this.workingMemory.set(agentId, key, value, options?.ttlMs);
                break;
            case agent_memory_interface_1.MemoryTier.SESSION:
                await this.sessionMemory.set(agentId, options?.sessionId || 'default', key, value, options?.ttlMs);
                break;
            case agent_memory_interface_1.MemoryTier.LONG_TERM:
                await this.longTermMemory.store(agentId, key, value, options);
                break;
            case agent_memory_interface_1.MemoryTier.KNOWLEDGE_GRAPH:
                await this.knowledgeGraph.addNode(key, {
                    agentId,
                    value,
                    ...options?.tags?.reduce((acc, tag, i) => ({ ...acc, [`tag${i}`]: tag }), {}),
                });
                break;
            case agent_memory_interface_1.MemoryTier.VECTOR:
                const vector = this.vectorSearch.generateSimpleEmbedding(typeof value === 'string' ? value : JSON.stringify(value));
                await this.vectorSearch.upsert(id, vector, {
                    agentId,
                    key,
                    tier,
                    value: typeof value === 'string' ? value.substring(0, 1000) : value,
                });
                break;
            default:
                this.logger.warn(`Unknown memory tier: ${tier}`);
        }
        this.logger.debug?.(`Stored ${key} in ${tier} memory for agent ${agentId}`);
        return entry;
    }
    async retrieve(agentId, key, tier) {
        if (tier) {
            return this.retrieveFromTier(agentId, key, tier);
        }
        const tierOrder = [agent_memory_interface_1.MemoryTier.WORKING, agent_memory_interface_1.MemoryTier.SESSION, agent_memory_interface_1.MemoryTier.LONG_TERM];
        for (const searchTier of tierOrder) {
            const entry = await this.retrieveFromTier(agentId, key, searchTier);
            if (entry)
                return entry;
        }
        return null;
    }
    async query(query) {
        const results = [];
        const ltResult = await this.longTermMemory.query(query);
        results.push(...ltResult.entries.map((entry) => {
            const ltEntry = entry;
            return {
                id: ltEntry.id,
                key: ltEntry.key,
                value: ltEntry.value,
                tier: agent_memory_interface_1.MemoryTier.LONG_TERM,
                agentId: ltEntry.agentId,
                metadata: {
                    source: 'long_term_memory',
                    confidence: ltEntry.confidence ?? 1.0,
                    tags: ltEntry.tags ?? [],
                    accessCount: ltEntry.accessCount ?? 0,
                    lastAccessedAt: ltEntry.lastAccessedAt ?? new Date(),
                    size: this.estimateSize(ltEntry.value),
                    encoding: agent_memory_interface_1.MemoryEncoding.JSON,
                },
                createdAt: ltEntry.createdAt,
                updatedAt: ltEntry.updatedAt,
            };
        }));
        if (query.agentId) {
            const workingKeys = this.workingMemory.getKeys(query.agentId);
            for (const key of workingKeys) {
                const value = this.workingMemory.get(query.agentId, key);
                if (value !== null) {
                    results.push({
                        id: `working:${query.agentId}:${key}`,
                        key,
                        value,
                        tier: agent_memory_interface_1.MemoryTier.WORKING,
                        agentId: query.agentId,
                        metadata: {
                            source: 'working_memory',
                            confidence: 0.5,
                            tags: [],
                            accessCount: 0,
                            lastAccessedAt: new Date(),
                            size: this.estimateSize(value),
                            encoding: agent_memory_interface_1.MemoryEncoding.JSON,
                        },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }
            }
        }
        const total = results.length;
        const offset = query.offset || 0;
        const limit = query.limit || 50;
        return {
            entries: results.slice(offset, offset + limit),
            total,
            hasMore: offset + limit < total,
        };
    }
    async delete(agentId, key, tier) {
        const tiers = tier ? [tier] : [agent_memory_interface_1.MemoryTier.WORKING, agent_memory_interface_1.MemoryTier.SESSION, agent_memory_interface_1.MemoryTier.LONG_TERM];
        let deleted = false;
        for (const deleteTier of tiers) {
            switch (deleteTier) {
                case agent_memory_interface_1.MemoryTier.WORKING:
                    if (this.workingMemory.delete(agentId, key))
                        deleted = true;
                    break;
                case agent_memory_interface_1.MemoryTier.SESSION:
                    if (await this.sessionMemory.delete(agentId, 'default', key))
                        deleted = true;
                    break;
                case agent_memory_interface_1.MemoryTier.LONG_TERM:
                    if (await this.longTermMemory.delete(agentId, key))
                        deleted = true;
                    break;
                case agent_memory_interface_1.MemoryTier.VECTOR:
                    this.logger.debug?.(`Vector delete by key not directly supported: ${key}`);
                    break;
                case agent_memory_interface_1.MemoryTier.KNOWLEDGE_GRAPH:
                    this.logger.debug?.(`Knowledge graph delete by key not directly supported: ${key}`);
                    break;
            }
        }
        return deleted;
    }
    async clear(agentId, tier) {
        let totalCleared = 0;
        const tiers = tier ? [tier] : [agent_memory_interface_1.MemoryTier.WORKING, agent_memory_interface_1.MemoryTier.SESSION, agent_memory_interface_1.MemoryTier.LONG_TERM];
        for (const clearTier of tiers) {
            switch (clearTier) {
                case agent_memory_interface_1.MemoryTier.WORKING:
                    totalCleared += this.workingMemory.clear(agentId);
                    break;
                case agent_memory_interface_1.MemoryTier.SESSION:
                    const sessions = await this.sessionMemory.getAgentSessions(agentId);
                    for (const sessionId of sessions) {
                        totalCleared += await this.sessionMemory.clearSession(agentId, sessionId);
                    }
                    break;
                case agent_memory_interface_1.MemoryTier.LONG_TERM:
                    const ltKeys = await this.longTermMemory.getKeys(agentId);
                    for (const key of ltKeys) {
                        if (await this.longTermMemory.delete(agentId, key)) {
                            totalCleared++;
                        }
                    }
                    break;
            }
        }
        this.logger.log(`Cleared ${totalCleared} entries for agent ${agentId}`);
        return totalCleared;
    }
    async getStats(agentId) {
        const workingSize = this.workingMemory.getSize(agentId);
        const longTermKeys = await this.longTermMemory.getKeys(agentId);
        const workingStats = {
            entryCount: workingSize,
            totalSizeBytes: workingSize * 1024,
        };
        const sessionStats = {
            entryCount: 0,
            totalSizeBytes: 0,
        };
        const longTermStats = {
            entryCount: longTermKeys.length,
            totalSizeBytes: longTermKeys.length * 2048,
        };
        const kgStats = {
            entryCount: 0,
            totalSizeBytes: 0,
        };
        const vectorStats = {
            entryCount: 0,
            totalSizeBytes: 0,
        };
        return {
            agentId,
            tierStats: {
                [agent_memory_interface_1.MemoryTier.WORKING]: workingStats,
                [agent_memory_interface_1.MemoryTier.SESSION]: sessionStats,
                [agent_memory_interface_1.MemoryTier.LONG_TERM]: longTermStats,
                [agent_memory_interface_1.MemoryTier.KNOWLEDGE_GRAPH]: kgStats,
                [agent_memory_interface_1.MemoryTier.VECTOR]: vectorStats,
            },
            totalEntries: workingStats.entryCount + longTermStats.entryCount,
            totalSizeBytes: workingStats.totalSizeBytes + longTermStats.totalSizeBytes,
        };
    }
    async storeMemory(key, value, tier, ttl) {
        const selectedTier = tier || this.selectTier(value, ttl);
        await this.store('system', key, value, selectedTier, { ttlMs: ttl });
    }
    async retrieveMemory(key, tier) {
        return this.retrieve('system', key, tier);
    }
    async deleteMemory(key, tier) {
        return this.delete('system', key, tier);
    }
    async search(query, limit) {
        const vector = this.vectorSearch.generateSimpleEmbedding(query);
        const result = await this.vectorSearch.search({
            vector,
            limit: limit || 10,
            scoreThreshold: 0.3,
        });
        return result.entries.map((entry) => ({
            id: entry.id,
            score: entry.score || 0,
            payload: entry.payload,
        }));
    }
    async addKnowledgeNode(node) {
        const created = await this.knowledgeGraph.addNode(node.label, {
            ...node.properties,
            originalId: node.id,
        });
        return created.id;
    }
    async addKnowledgeRelation(relation) {
        const created = await this.knowledgeGraph.addRelationship(relation.type, relation.fromNodeId, relation.toNodeId, relation.properties);
        return created.id;
    }
    async queryKnowledge(cypherQuery) {
        return this.knowledgeGraph.executeCypher(cypherQuery);
    }
    async getConversationContext(sessionId) {
        const context = await this.sessionMemory.getSessionContext('system', sessionId);
        const entries = [];
        for (const [key, value] of context) {
            entries.push({
                id: `session:system:${sessionId}:${key}`,
                key,
                value,
                tier: agent_memory_interface_1.MemoryTier.SESSION,
                agentId: 'system',
                sessionId,
                metadata: {
                    source: 'session_memory',
                    confidence: 0.9,
                    tags: [],
                    accessCount: 0,
                    lastAccessedAt: new Date(),
                    size: this.estimateSize(value),
                    encoding: agent_memory_interface_1.MemoryEncoding.JSON,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        return entries;
    }
    async clearTier(tier) {
        switch (tier) {
            case agent_memory_interface_1.MemoryTier.WORKING:
                this.workingMemory.cleanup();
                break;
            case agent_memory_interface_1.MemoryTier.SESSION:
                this.sessionMemory.cleanup();
                break;
            case agent_memory_interface_1.MemoryTier.LONG_TERM:
                this.logger.warn('Clearing all long-term memory is not supported through clearTier');
                break;
            case agent_memory_interface_1.MemoryTier.KNOWLEDGE_GRAPH:
                this.logger.warn('Clearing all knowledge graph nodes is not supported through clearTier');
                break;
            case agent_memory_interface_1.MemoryTier.VECTOR:
                this.logger.warn('Clearing all vector entries is not supported through clearTier');
                break;
        }
    }
    selectTier(value, ttl) {
        const size = this.estimateSize(value);
        if (ttl && ttl <= 5 * 60 * 1000) {
            return agent_memory_interface_1.MemoryTier.WORKING;
        }
        if (size < 1024 && !ttl) {
            return agent_memory_interface_1.MemoryTier.WORKING;
        }
        if (ttl && ttl <= 30 * 60 * 1000) {
            return agent_memory_interface_1.MemoryTier.SESSION;
        }
        if (typeof value === 'string' && value.length > 200) {
            return agent_memory_interface_1.MemoryTier.VECTOR;
        }
        return agent_memory_interface_1.MemoryTier.LONG_TERM;
    }
    async retrieveFromTier(agentId, key, tier) {
        switch (tier) {
            case agent_memory_interface_1.MemoryTier.WORKING: {
                const value = this.workingMemory.get(agentId, key);
                if (value === null)
                    return null;
                return {
                    id: `working:${agentId}:${key}`,
                    key,
                    value,
                    tier: agent_memory_interface_1.MemoryTier.WORKING,
                    agentId,
                    metadata: {
                        source: 'working_memory',
                        confidence: 1.0,
                        tags: [],
                        accessCount: 0,
                        lastAccessedAt: new Date(),
                        size: this.estimateSize(value),
                        encoding: agent_memory_interface_1.MemoryEncoding.JSON,
                    },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
            }
            case agent_memory_interface_1.MemoryTier.SESSION: {
                const value = await this.sessionMemory.get(agentId, 'default', key);
                if (value === null)
                    return null;
                return {
                    id: `session:${agentId}:${key}`,
                    key,
                    value,
                    tier: agent_memory_interface_1.MemoryTier.SESSION,
                    agentId,
                    metadata: {
                        source: 'session_memory',
                        confidence: 0.9,
                        tags: [],
                        accessCount: 0,
                        lastAccessedAt: new Date(),
                        size: this.estimateSize(value),
                        encoding: agent_memory_interface_1.MemoryEncoding.JSON,
                    },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
            }
            case agent_memory_interface_1.MemoryTier.LONG_TERM: {
                const entry = await this.longTermMemory.retrieve(agentId, key);
                if (!entry)
                    return null;
                return {
                    id: entry.id,
                    key: entry.key,
                    value: entry.value,
                    tier: agent_memory_interface_1.MemoryTier.LONG_TERM,
                    agentId: entry.agentId,
                    metadata: {
                        source: 'long_term_memory',
                        confidence: entry.confidence,
                        tags: entry.tags,
                        accessCount: entry.accessCount,
                        lastAccessedAt: entry.lastAccessedAt,
                        size: this.estimateSize(entry.value),
                        encoding: agent_memory_interface_1.MemoryEncoding.JSON,
                    },
                    createdAt: entry.createdAt,
                    updatedAt: entry.updatedAt,
                };
            }
            default:
                return null;
        }
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
exports.MemoryService = MemoryService;
exports.MemoryService = MemoryService = MemoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [working_memory_service_1.WorkingMemoryService,
        session_memory_service_1.SessionMemoryService,
        long_term_memory_service_1.LongTermMemoryService,
        knowledge_graph_service_1.KnowledgeGraphService,
        vector_search_service_1.VectorSearchService])
], MemoryService);
//# sourceMappingURL=memory.service.js.map