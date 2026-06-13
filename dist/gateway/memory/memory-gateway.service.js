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
var MemoryGatewayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryGatewayService = exports.MEMORY_TIERS = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const agent_memory_interface_1 = require("../../agents/interfaces/agent-memory.interface");
exports.MEMORY_TIERS = [
    'working', 'session', 'conversation', 'long_term',
    'semantic', 'knowledge_graph', 'vector', 'archive',
];
let MemoryGatewayService = MemoryGatewayService_1 = class MemoryGatewayService {
    constructor() {
        this.logger = new common_1.Logger(MemoryGatewayService_1.name);
        this.workingStore = new Map();
        this.sessionStore = new Map();
        this.conversationStore = new Map();
        this.longTermStore = new Map();
        this.semanticStore = new Map();
        this.archiveStore = new Map();
        this.vectorIndex = new Map();
        this.kgNodes = new Map();
    }
    async store(agentId, key, value, tier, options) {
        const tierStr = tier || this.selectTier(agentId, key, value, options);
        const memoryTier = this.toMemoryTier(tierStr);
        const entry = this.createEntry(agentId, key, value, memoryTier, options);
        switch (tierStr) {
            case 'working':
                this.storeInMap(this.workingStore, agentId, key, entry);
                break;
            case 'session':
                this.storeInSessionMap(options?.sessionId || 'default', agentId, key, entry);
                break;
            case 'conversation':
                this.storeInConversation(options?.sessionId || 'default', entry);
                break;
            case 'long_term':
                this.storeInMap(this.longTermStore, agentId, key, entry);
                break;
            case 'semantic':
                this.storeInMap(this.semanticStore, agentId, key, entry);
                break;
            case 'knowledge_graph':
                this.kgNodes.set(entry.id, {
                    id: entry.id, label: key, properties: { agentId, value },
                    createdAt: new Date(), updatedAt: new Date(),
                });
                break;
            case 'vector':
                const vector = this.generateEmbedding(typeof value === 'string' ? value : JSON.stringify(value));
                this.vectorIndex.set(entry.id, { vector, payload: { agentId, key, value, tier: tierStr } });
                break;
            case 'archive':
                this.storeInMap(this.archiveStore, agentId, key, entry);
                break;
            default:
                this.storeInMap(this.workingStore, agentId, key, entry);
        }
        this.logger.debug?.(`Stored ${key} in ${tierStr} for agent ${agentId}`);
        return entry;
    }
    async retrieve(agentId, key, tier) {
        if (tier) {
            return this.retrieveFromTier(agentId, key, tier);
        }
        const searchOrder = ['working', 'session', 'conversation', 'long_term', 'semantic'];
        for (const searchTier of searchOrder) {
            const entry = await this.retrieveFromTier(agentId, key, searchTier);
            if (entry) {
                entry.metadata.accessCount++;
                entry.metadata.lastAccessedAt = new Date();
                return entry;
            }
        }
        return null;
    }
    async search(query, agentId, limit = 10) {
        const queryVector = this.generateEmbedding(query);
        const results = [];
        let totalSearched = 0;
        const vectorResults = this.searchVectorIndex(queryVector, limit * 2);
        totalSearched += this.vectorIndex.size;
        for (const vr of vectorResults) {
            if (agentId && vr.payload?.agentId !== agentId)
                continue;
            results.push({
                id: vr.id,
                key: vr.payload?.key || 'unknown',
                value: vr.payload?.value,
                tier: this.toMemoryTier(vr.payload?.tier || 'vector'),
                agentId: vr.payload?.agentId || agentId || 'unknown',
                metadata: {
                    source: 'vector_search', confidence: vr.score || 0, tags: [],
                    accessCount: 0, lastAccessedAt: new Date(), size: 0, encoding: agent_memory_interface_1.MemoryEncoding.JSON,
                },
                createdAt: new Date(), updatedAt: new Date(),
            });
        }
        const keywordResults = this.keywordSearch(query, agentId, limit);
        totalSearched += keywordResults.length;
        results.push(...keywordResults);
        const deduped = this.deduplicateResults(results).slice(0, limit);
        const fusedScore = deduped.length > 0
            ? deduped.reduce((sum, r) => sum + r.metadata.confidence, 0) / deduped.length
            : 0;
        return {
            entries: deduped,
            fusedScore,
            sourceTiers: [...new Set(deduped.map((r) => r.tier))],
            totalSearched,
        };
    }
    async summarize(agentId, key) {
        const keys = Array.isArray(key) ? key : [key];
        const allEntries = [];
        for (const k of keys) {
            const entry = await this.retrieve(agentId, k);
            if (entry)
                allEntries.push(entry);
        }
        if (allEntries.length === 0) {
            const emptyEntry = this.createEntry(agentId, 'summary:empty', { summary: 'No data found', keyPoints: [] }, agent_memory_interface_1.MemoryTier.WORKING);
            return { originalCount: 0, summary: 'No data found', keyPoints: [], compressedEntry: emptyEntry };
        }
        const values = allEntries.map((e) => {
            try {
                return typeof e.value === 'string' ? e.value : JSON.stringify(e.value);
            }
            catch {
                return '[non-serializable]';
            }
        });
        const summaryText = `Summary of ${allEntries.length} entries for [${keys.join(', ')}]: ${values.slice(0, 10).join('; ')}`;
        const keyPoints = values.slice(0, 5).map((v, i) => `Point ${i + 1}: ${v.substring(0, 200)}`);
        const compressedEntry = this.createEntry(agentId, `summary:${keys.join(':')}`, { summary: summaryText, keyPoints, entryCount: allEntries.length }, agent_memory_interface_1.MemoryTier.LONG_TERM);
        this.storeInMap(this.longTermStore, agentId, `summary:${keys.join(':')}`, compressedEntry);
        return { originalCount: allEntries.length, summary: summaryText, keyPoints, compressedEntry };
    }
    async promote(agentId, key, from, to) {
        const entry = await this.retrieveFromTier(agentId, key, from);
        if (!entry)
            return { from, to, key, success: false };
        await this.store(agentId, key, entry.value, to, { tags: entry.metadata.tags, confidence: entry.metadata.confidence });
        await this.deleteFromTier(agentId, key, from);
        this.logger.log(`Promoted ${key} from ${from} to ${to} for agent ${agentId}`);
        return { from, to, key, success: true };
    }
    async archive(agentId, key, sourceTier) {
        const tier = sourceTier || 'long_term';
        const entry = await this.retrieveFromTier(agentId, key, tier);
        if (!entry)
            return false;
        await this.store(agentId, `archived:${key}`, entry.value, 'archive', { tags: [...(entry.metadata.tags || []), 'archived'], confidence: entry.metadata.confidence });
        await this.deleteFromTier(agentId, key, tier);
        this.logger.log(`Archived ${key} from ${tier} for agent ${agentId}`);
        return true;
    }
    async crossTierRetrieve(agentId, query, options) {
        const maxTiers = options?.maxTiers || 6;
        const minConfidence = options?.minConfidence || 0.1;
        const includeVector = options?.includeVectorSearch !== false;
        const results = [];
        const searchedTiers = [];
        let totalSearched = 0;
        const workingData = this.workingStore.get(agentId);
        if (workingData && searchedTiers.length < maxTiers) {
            for (const [, entry] of workingData) {
                if (this.matchesQuery(entry, query))
                    results.push(entry);
            }
            searchedTiers.push('working');
            totalSearched += workingData.size;
        }
        if (searchedTiers.length < maxTiers) {
            for (const [, agentMap] of this.sessionStore) {
                const sessionData = agentMap.get(agentId);
                if (sessionData) {
                    for (const [, entry] of sessionData) {
                        if (this.matchesQuery(entry, query))
                            results.push(entry);
                    }
                    totalSearched += sessionData.size;
                }
            }
            searchedTiers.push('session');
        }
        const ltData = this.longTermStore.get(agentId);
        if (ltData && searchedTiers.length < maxTiers) {
            for (const [, entry] of ltData) {
                if (this.matchesQuery(entry, query))
                    results.push(entry);
            }
            searchedTiers.push('long_term');
            totalSearched += ltData.size;
        }
        if (searchedTiers.length < maxTiers) {
            for (const [, node] of this.kgNodes) {
                if (node.properties?.agentId === agentId && this.nodeMatchesQuery(node, query)) {
                    results.push({
                        id: node.id, key: node.label, value: node.properties?.value,
                        tier: agent_memory_interface_1.MemoryTier.KNOWLEDGE_GRAPH, agentId,
                        metadata: { source: 'knowledge_graph', confidence: 0.8, tags: [], accessCount: 0, lastAccessedAt: new Date(), size: 0, encoding: agent_memory_interface_1.MemoryEncoding.JSON },
                        createdAt: node.createdAt, updatedAt: node.updatedAt,
                    });
                }
            }
            searchedTiers.push('knowledge_graph');
            totalSearched += this.kgNodes.size;
        }
        if (includeVector && searchedTiers.length < maxTiers) {
            const vectorQuery = this.generateEmbedding(query);
            const vectorResults = this.searchVectorIndex(vectorQuery, 10);
            for (const vr of vectorResults) {
                if (vr.score && vr.score >= minConfidence) {
                    results.push({
                        id: vr.id, key: vr.payload?.key || 'vector', value: vr.payload?.value,
                        tier: agent_memory_interface_1.MemoryTier.VECTOR, agentId: vr.payload?.agentId || agentId,
                        metadata: { source: 'vector_search', confidence: vr.score, tags: [], accessCount: 0, lastAccessedAt: new Date(), size: 0, encoding: agent_memory_interface_1.MemoryEncoding.EMBEDDING },
                        createdAt: new Date(), updatedAt: new Date(),
                    });
                }
            }
            searchedTiers.push('vector');
            totalSearched += this.vectorIndex.size;
        }
        const fused = this.deduplicateResults(results).sort((a, b) => b.metadata.confidence - a.metadata.confidence);
        const fusedScore = fused.length > 0 ? fused.reduce((sum, r) => sum + r.metadata.confidence, 0) / fused.length : 0;
        return { entries: fused, fusedScore, sourceTiers: searchedTiers, totalSearched };
    }
    async query(query) {
        const results = [];
        const agentId = query.agentId || 'system';
        const workingData = this.workingStore.get(agentId);
        if (workingData) {
            for (const [key, entry] of workingData) {
                if (query.keyPrefix && !key.startsWith(query.keyPrefix))
                    continue;
                results.push(entry);
            }
        }
        const ltData = this.longTermStore.get(agentId);
        if (ltData) {
            for (const [key, entry] of ltData) {
                if (query.keyPrefix && !key.startsWith(query.keyPrefix))
                    continue;
                results.push(entry);
            }
        }
        const total = results.length;
        const offset = query.offset || 0;
        const limit = query.limit || 50;
        return { entries: results.slice(offset, offset + limit), total, hasMore: offset + limit < total };
    }
    async delete(agentId, key, tier) {
        const tiers = tier ? [tier] : ['working', 'session', 'long_term'];
        let deleted = false;
        for (const t of tiers) {
            if (this.deleteFromTier(agentId, key, t))
                deleted = true;
        }
        return deleted;
    }
    async clear(agentId, tier) {
        let count = 0;
        const stores = !tier
            ? [this.workingStore, this.longTermStore, this.semanticStore, this.archiveStore]
            : [this.getStoreForTier(tier)].filter(Boolean);
        for (const store of stores) {
            const data = store?.get(agentId);
            if (data) {
                count += data.size;
                data.clear();
            }
        }
        return count;
    }
    async getStats(agentId) {
        const working = this.workingStore.get(agentId);
        const longTerm = this.longTermStore.get(agentId);
        return {
            agentId,
            tierStats: {
                [agent_memory_interface_1.MemoryTier.WORKING]: { entryCount: working?.size || 0, totalSizeBytes: (working?.size || 0) * 1024 },
                [agent_memory_interface_1.MemoryTier.SESSION]: { entryCount: 0, totalSizeBytes: 0 },
                [agent_memory_interface_1.MemoryTier.LONG_TERM]: { entryCount: longTerm?.size || 0, totalSizeBytes: (longTerm?.size || 0) * 2048 },
                [agent_memory_interface_1.MemoryTier.KNOWLEDGE_GRAPH]: { entryCount: this.kgNodes.size, totalSizeBytes: this.kgNodes.size * 4096 },
                [agent_memory_interface_1.MemoryTier.VECTOR]: { entryCount: this.vectorIndex.size, totalSizeBytes: this.vectorIndex.size * 4096 },
            },
            totalEntries: (working?.size || 0) + (longTerm?.size || 0),
            totalSizeBytes: ((working?.size || 0) * 1024) + ((longTerm?.size || 0) * 2048),
        };
    }
    toMemoryTier(tierStr) {
        const mapping = {
            working: agent_memory_interface_1.MemoryTier.WORKING,
            session: agent_memory_interface_1.MemoryTier.SESSION,
            long_term: agent_memory_interface_1.MemoryTier.LONG_TERM,
            knowledge_graph: agent_memory_interface_1.MemoryTier.KNOWLEDGE_GRAPH,
            vector: agent_memory_interface_1.MemoryTier.VECTOR,
        };
        return mapping[tierStr] || agent_memory_interface_1.MemoryTier.WORKING;
    }
    selectTier(agentId, key, value, options) {
        if (options?.ttlMs && options.ttlMs <= 5 * 60 * 1000)
            return 'working';
        if (options?.sessionId)
            return 'session';
        if (options?.importance && options.importance >= 0.8)
            return 'semantic';
        if (key.startsWith('relation:') || key.startsWith('edge:'))
            return 'knowledge_graph';
        if (typeof value === 'string' && value.length > 200)
            return 'vector';
        const size = this.estimateSize(value);
        if (size < 1024)
            return 'working';
        return 'long_term';
    }
    createEntry(agentId, key, value, tier, options) {
        const now = new Date();
        return {
            id: (0, uuid_1.v4)(), key, value, tier, agentId,
            sessionId: options?.sessionId, correlationId: options?.correlationId,
            metadata: { source: `memory_gateway:${tier}`, confidence: options?.confidence ?? 1.0, tags: options?.tags || [], accessCount: 0, lastAccessedAt: now, size: this.estimateSize(value), encoding: options?.encoding || agent_memory_interface_1.MemoryEncoding.JSON },
            createdAt: now, updatedAt: now, expiresAt: options?.ttlMs ? new Date(now.getTime() + options.ttlMs) : undefined,
        };
    }
    storeInMap(store, agentId, key, entry) {
        if (!store.has(agentId))
            store.set(agentId, new Map());
        store.get(agentId).set(key, entry);
    }
    storeInSessionMap(sessionId, agentId, key, entry) {
        if (!this.sessionStore.has(sessionId))
            this.sessionStore.set(sessionId, new Map());
        if (!this.sessionStore.get(sessionId).has(agentId))
            this.sessionStore.get(sessionId).set(agentId, new Map());
        this.sessionStore.get(sessionId).get(agentId).set(key, entry);
    }
    storeInConversation(conversationId, entry) {
        if (!this.conversationStore.has(conversationId))
            this.conversationStore.set(conversationId, []);
        this.conversationStore.get(conversationId).push(entry);
    }
    async retrieveFromTier(agentId, key, tier) {
        switch (tier) {
            case 'working': return this.workingStore.get(agentId)?.get(key) || null;
            case 'long_term': return this.longTermStore.get(agentId)?.get(key) || null;
            case 'semantic': return this.semanticStore.get(agentId)?.get(key) || null;
            case 'archive': return this.archiveStore.get(agentId)?.get(key) || null;
            case 'session':
                for (const [, agentMap] of this.sessionStore) {
                    const data = agentMap.get(agentId);
                    if (data?.has(key))
                        return data.get(key);
                }
                return null;
            default: return null;
        }
    }
    deleteFromTier(agentId, key, tier) {
        switch (tier) {
            case 'working': return this.workingStore.get(agentId)?.delete(key) || false;
            case 'long_term': return this.longTermStore.get(agentId)?.delete(key) || false;
            case 'semantic': return this.semanticStore.get(agentId)?.delete(key) || false;
            case 'archive': return this.archiveStore.get(agentId)?.delete(key) || false;
            case 'session':
                for (const [, agentMap] of this.sessionStore) {
                    if (agentMap.get(agentId)?.delete(key))
                        return true;
                }
                return false;
            default: return false;
        }
    }
    getStoreForTier(tier) {
        switch (tier) {
            case 'working': return this.workingStore;
            case 'long_term': return this.longTermStore;
            case 'semantic': return this.semanticStore;
            case 'archive': return this.archiveStore;
            default: return null;
        }
    }
    generateEmbedding(text) {
        const vector = [];
        const dim = 128;
        for (let i = 0; i < dim; i++) {
            let hash = 0;
            for (let j = 0; j < text.length; j++) {
                hash = ((hash << 5) - hash + text.charCodeAt(j) + i) | 0;
            }
            vector.push((Math.abs(hash) % 1000) / 1000);
        }
        const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
        return vector.map((v) => v / magnitude);
    }
    searchVectorIndex(queryVector, limit) {
        const results = [];
        for (const [id, { vector, payload }] of this.vectorIndex) {
            results.push({ id, score: this.cosineSimilarity(queryVector, vector), payload });
        }
        return results.sort((a, b) => b.score - a.score).slice(0, limit);
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length)
            return 0;
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
    }
    keywordSearch(query, agentId, limit) {
        const results = [];
        const queryLower = query.toLowerCase();
        const maxResults = limit || 10;
        const ltData = agentId ? this.longTermStore.get(agentId) : undefined;
        if (ltData) {
            for (const [, entry] of ltData) {
                const valueStr = typeof entry.value === 'string' ? entry.value.toLowerCase() : JSON.stringify(entry.value).toLowerCase();
                if (entry.key?.toLowerCase().includes(queryLower) || valueStr.includes(queryLower)) {
                    results.push(entry);
                    if (results.length >= maxResults)
                        return results;
                }
            }
        }
        return results;
    }
    matchesQuery(entry, query) {
        const queryLower = query.toLowerCase();
        try {
            const valueStr = typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value);
            return entry.key?.toLowerCase().includes(queryLower) || valueStr.toLowerCase().includes(queryLower);
        }
        catch {
            return false;
        }
    }
    nodeMatchesQuery(node, query) {
        const queryLower = query.toLowerCase();
        return node.label.toLowerCase().includes(queryLower) || JSON.stringify(node.properties).toLowerCase().includes(queryLower);
    }
    deduplicateResults(results) {
        const seen = new Set();
        return results.filter((r) => { const key = `${r.agentId}:${r.key}`; if (seen.has(key))
            return false; seen.add(key); return true; });
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
exports.MemoryGatewayService = MemoryGatewayService;
exports.MemoryGatewayService = MemoryGatewayService = MemoryGatewayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MemoryGatewayService);
//# sourceMappingURL=memory-gateway.service.js.map