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
var RAGService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const agent_memory_interface_1 = require("../interfaces/agent-memory.interface");
const working_memory_service_1 = require("./working-memory.service");
const session_memory_service_1 = require("./session-memory.service");
const long_term_memory_service_1 = require("./long-term-memory.service");
const knowledge_graph_service_1 = require("./knowledge-graph.service");
const vector_search_service_1 = require("./vector-search.service");
let RAGService = RAGService_1 = class RAGService {
    constructor(workingMemory, sessionMemory, longTermMemory, knowledgeGraph, vectorSearch) {
        this.workingMemory = workingMemory;
        this.sessionMemory = sessionMemory;
        this.longTermMemory = longTermMemory;
        this.knowledgeGraph = knowledgeGraph;
        this.vectorSearch = vectorSearch;
        this.logger = new common_1.Logger(RAGService_1.name);
    }
    async query(request) {
        const startTime = Date.now();
        this.logger.log(`RAG query for agent ${request.agentId || 'global'}: "${request.query.substring(0, 100)}"`);
        const tiers = request.tiers || [
            agent_memory_interface_1.MemoryTier.WORKING,
            agent_memory_interface_1.MemoryTier.SESSION,
            agent_memory_interface_1.MemoryTier.LONG_TERM,
            agent_memory_interface_1.MemoryTier.VECTOR,
        ];
        const sources = [];
        const contextParts = [];
        let totalTokensEstimate = 0;
        if (tiers.includes(agent_memory_interface_1.MemoryTier.WORKING) && request.agentId) {
            const workingResults = this.searchWorkingMemory(request.agentId, request.query);
            sources.push(...workingResults);
            for (const entry of workingResults) {
                contextParts.push(`[Working Memory] ${entry.key}: ${JSON.stringify(entry.value)}`);
                totalTokensEstimate += this.estimateTokens(JSON.stringify(entry.value));
            }
        }
        if (tiers.includes(agent_memory_interface_1.MemoryTier.SESSION) && request.agentId && request.sessionId) {
            const sessionResults = await this.searchSessionMemory(request.agentId, request.sessionId, request.query);
            sources.push(...sessionResults);
            for (const entry of sessionResults) {
                contextParts.push(`[Session Memory] ${entry.key}: ${JSON.stringify(entry.value)}`);
                totalTokensEstimate += this.estimateTokens(JSON.stringify(entry.value));
            }
        }
        if (tiers.includes(agent_memory_interface_1.MemoryTier.LONG_TERM)) {
            const longTermResults = await this.searchLongTermMemory(request.agentId, request.query, request.topK);
            sources.push(...longTermResults);
            for (const entry of longTermResults) {
                contextParts.push(`[Long-Term Memory] ${entry.key}: ${JSON.stringify(entry.value)}`);
                totalTokensEstimate += this.estimateTokens(JSON.stringify(entry.value));
            }
        }
        if (tiers.includes(agent_memory_interface_1.MemoryTier.VECTOR)) {
            const vectorResults = await this.searchVectorMemory(request.query, request.topK, request.scoreThreshold);
            for (const entry of vectorResults) {
                sources.push(entry);
                contextParts.push(`[Vector Search] ${JSON.stringify(entry.value)}`);
                totalTokensEstimate += this.estimateTokens(JSON.stringify(entry.value));
            }
        }
        if (tiers.includes(agent_memory_interface_1.MemoryTier.KNOWLEDGE_GRAPH)) {
            const kgResults = await this.searchKnowledgeGraph(request.query);
            for (const node of kgResults.nodes) {
                const entry = this.nodeToMemoryEntry(node);
                sources.push(entry);
                contextParts.push(`[Knowledge Graph:${node.label}] ${JSON.stringify(node.properties)}`);
                totalTokensEstimate += this.estimateTokens(JSON.stringify(node.properties));
            }
        }
        const topK = request.topK || 5;
        const topSources = this.rankAndSelectSources(sources, topK);
        const context = contextParts.join('\n\n');
        const answer = this.composeAnswer(request.query, topSources, request.includeContext ? context : undefined);
        const confidence = this.calculateConfidence(topSources);
        this.logger.log(`RAG query completed: ${sources.length} sources, ${topSources.length} selected in ${Date.now() - startTime}ms`);
        return {
            answer,
            sources: topSources,
            confidence,
            context: request.includeContext ? context : undefined,
            tokensUsed: totalTokensEstimate,
        };
    }
    async indexDocument(agentId, document, metadata) {
        const docId = (0, uuid_1.v4)();
        const chunks = this.chunkDocument(document, {
            docId,
            agentId,
            ...metadata,
        });
        this.logger.debug?.(`Indexing document ${docId}: ${chunks.length} chunks`);
        for (const chunk of chunks) {
            const vector = this.vectorSearch.generateSimpleEmbedding(chunk.content);
            await this.vectorSearch.upsert(chunk.id, vector, {
                agentId,
                docId,
                content: chunk.content,
                chunkIndex: chunk.index,
                startOffset: chunk.startOffset,
                endOffset: chunk.endOffset,
                indexedAt: new Date().toISOString(),
                ...metadata,
            });
        }
        await this.longTermMemory.store(agentId, `document:${docId}`, {
            content: document.substring(0, 1000),
            docId,
            totalChunks: chunks.length,
            chunkSize: RAGService_1.DEFAULT_CHUNK_SIZE,
            metadata,
        }, {
            tags: ['document', 'indexed', 'rag'],
        });
        this.logger.log(`Indexed document ${docId} for agent ${agentId}: ${chunks.length} chunks`);
    }
    async indexMemoryEntry(entry) {
        const text = typeof entry.value === 'string'
            ? entry.value
            : JSON.stringify(entry.value);
        const vector = this.vectorSearch.generateSimpleEmbedding(text);
        await this.vectorSearch.upsert(entry.id, vector, {
            agentId: entry.agentId,
            key: entry.key,
            tier: entry.tier,
            content: text.substring(0, 2000),
            indexedAt: new Date().toISOString(),
        });
    }
    chunkDocument(document, metadata, chunkSize = RAGService_1.DEFAULT_CHUNK_SIZE, overlap = RAGService_1.DEFAULT_CHUNK_OVERLAP) {
        const chunks = [];
        if (document.length <= chunkSize) {
            chunks.push({
                id: (0, uuid_1.v4)(),
                content: document,
                index: 0,
                startOffset: 0,
                endOffset: document.length,
                metadata,
            });
            return chunks;
        }
        let startOffset = 0;
        let chunkIndex = 0;
        while (startOffset < document.length) {
            let endOffset = Math.min(startOffset + chunkSize, document.length);
            if (endOffset < document.length) {
                const lastSentenceEnd = document.lastIndexOf('.', endOffset);
                const lastSpace = document.lastIndexOf(' ', endOffset);
                if (lastSentenceEnd > startOffset + RAGService_1.MIN_CHUNK_SIZE) {
                    endOffset = lastSentenceEnd + 1;
                }
                else if (lastSpace > startOffset + RAGService_1.MIN_CHUNK_SIZE) {
                    endOffset = lastSpace;
                }
            }
            const content = document.substring(startOffset, endOffset).trim();
            if (content.length > 0) {
                chunks.push({
                    id: (0, uuid_1.v4)(),
                    content,
                    index: chunkIndex,
                    startOffset,
                    endOffset,
                    metadata: { ...metadata, chunkIndex },
                });
                chunkIndex++;
            }
            startOffset = endOffset - overlap;
            if (startOffset <= (chunks.length > 1 ? chunks[chunks.length - 2].startOffset : -1)) {
                startOffset = endOffset;
            }
        }
        return chunks;
    }
    searchWorkingMemory(agentId, query) {
        const keys = this.workingMemory.getKeys(agentId);
        const results = [];
        const queryLower = query.toLowerCase();
        for (const key of keys) {
            const value = this.workingMemory.get(agentId, key);
            if (value !== null) {
                const valueStr = JSON.stringify(value).toLowerCase();
                const keyLower = key.toLowerCase();
                const relevance = this.calculateRelevance(queryLower, keyLower, valueStr);
                if (relevance > 0) {
                    results.push({
                        id: `working:${agentId}:${key}`,
                        key,
                        value,
                        tier: agent_memory_interface_1.MemoryTier.WORKING,
                        agentId,
                        metadata: {
                            source: 'working_memory',
                            confidence: relevance,
                            tags: [],
                            accessCount: 0,
                            lastAccessedAt: new Date(),
                            size: valueStr.length,
                            encoding: agent_memory_interface_1.MemoryEncoding.JSON,
                        },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }
            }
        }
        return results;
    }
    async searchSessionMemory(agentId, sessionId, query) {
        const keys = await this.sessionMemory.getSessionKeys(agentId, sessionId);
        const results = [];
        const queryLower = query.toLowerCase();
        for (const key of keys) {
            const value = await this.sessionMemory.get(agentId, sessionId, key);
            if (value !== null) {
                const valueStr = JSON.stringify(value).toLowerCase();
                const keyLower = key.toLowerCase();
                const relevance = this.calculateRelevance(queryLower, keyLower, valueStr);
                if (relevance > 0) {
                    results.push({
                        id: `session:${agentId}:${sessionId}:${key}`,
                        key,
                        value,
                        tier: agent_memory_interface_1.MemoryTier.SESSION,
                        agentId,
                        sessionId,
                        metadata: {
                            source: 'session_memory',
                            confidence: relevance,
                            tags: [],
                            accessCount: 0,
                            lastAccessedAt: new Date(),
                            size: valueStr.length,
                            encoding: agent_memory_interface_1.MemoryEncoding.JSON,
                        },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }
            }
        }
        return results;
    }
    async searchLongTermMemory(agentId, query, topK) {
        const ftResult = await this.longTermMemory.fullTextSearch(query, {
            agentId,
            limit: topK || 10,
        });
        if (ftResult.entries.length > 0) {
            return ftResult.entries.map((entry) => {
                const e = entry;
                return {
                    id: `longterm:${e.id}`,
                    key: e.key,
                    value: e.value,
                    tier: agent_memory_interface_1.MemoryTier.LONG_TERM,
                    agentId: e.agentId,
                    metadata: {
                        source: 'long_term_memory',
                        confidence: Math.max(0.5, e.confidence ?? 1.0),
                        tags: e.tags ?? [],
                        accessCount: e.accessCount ?? 0,
                        lastAccessedAt: e.lastAccessedAt ?? new Date(),
                        size: JSON.stringify(e.value).length,
                        encoding: agent_memory_interface_1.MemoryEncoding.JSON,
                    },
                    createdAt: e.createdAt,
                    updatedAt: e.updatedAt,
                };
            });
        }
        const result = await this.longTermMemory.query({
            agentId,
            limit: topK || 10,
        });
        const queryLower = query.toLowerCase();
        const scored = result.entries
            .map((entry) => {
            const e = entry;
            const valueStr = JSON.stringify(e.value).toLowerCase();
            const keyLower = e.key.toLowerCase();
            const relevance = this.calculateRelevance(queryLower, keyLower, valueStr);
            return { entry: e, relevance };
        })
            .filter(({ relevance }) => relevance > 0)
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, topK || 10);
        return scored.map(({ entry, relevance }) => ({
            id: `longterm:${entry.id}`,
            key: entry.key,
            value: entry.value,
            tier: agent_memory_interface_1.MemoryTier.LONG_TERM,
            agentId: entry.agentId,
            metadata: {
                source: 'long_term_memory',
                confidence: Math.max(relevance, entry.confidence ?? 1.0),
                tags: entry.tags ?? [],
                accessCount: entry.accessCount ?? 0,
                lastAccessedAt: entry.lastAccessedAt ?? new Date(),
                size: JSON.stringify(entry.value).length,
                encoding: agent_memory_interface_1.MemoryEncoding.JSON,
            },
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
        }));
    }
    async searchVectorMemory(query, topK, scoreThreshold) {
        const vector = this.vectorSearch.generateSimpleEmbedding(query);
        const result = await this.vectorSearch.search({
            vector,
            limit: topK || 5,
            scoreThreshold: scoreThreshold || 0.3,
        });
        return result.entries.map((entry) => ({
            id: `vector:${entry.id}`,
            key: entry.payload.key || entry.id,
            value: entry.payload,
            tier: agent_memory_interface_1.MemoryTier.VECTOR,
            agentId: entry.payload.agentId,
            metadata: {
                source: 'vector_search',
                confidence: entry.score || 0.5,
                tags: [],
                accessCount: 0,
                lastAccessedAt: new Date(),
                size: JSON.stringify(entry.payload).length,
                encoding: agent_memory_interface_1.MemoryEncoding.JSON,
            },
            createdAt: new Date(entry.payload.indexedAt || Date.now()),
            updatedAt: new Date(),
        }));
    }
    async searchKnowledgeGraph(query) {
        const words = query.split(/\s+/).filter((w) => w.length > 3);
        const allNodes = [];
        for (const word of words) {
            const result = await this.knowledgeGraph.query({
                properties: { name: word },
                limit: 5,
            });
            allNodes.push(...result.nodes);
        }
        const commonLabels = ['agent', 'task', 'document', 'knowledge', 'pattern'];
        for (const label of commonLabels) {
            if (query.toLowerCase().includes(label)) {
                const result = await this.knowledgeGraph.query({
                    nodeLabel: label,
                    limit: 5,
                });
                allNodes.push(...result.nodes);
            }
        }
        const uniqueNodes = Array.from(new Map(allNodes.map((n) => [n.id, n])).values());
        return { nodes: uniqueNodes, relationships: [] };
    }
    nodeToMemoryEntry(node) {
        return {
            id: `kg:${node.id}`,
            key: node.label,
            value: node.properties,
            tier: agent_memory_interface_1.MemoryTier.KNOWLEDGE_GRAPH,
            agentId: node.properties?.agentId || 'unknown',
            metadata: {
                source: 'knowledge_graph',
                confidence: 0.7,
                tags: [node.label],
                accessCount: 0,
                lastAccessedAt: new Date(),
                size: JSON.stringify(node.properties).length,
                encoding: agent_memory_interface_1.MemoryEncoding.JSON,
            },
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
        };
    }
    calculateRelevance(query, key, value) {
        let score = 0;
        const queryWords = query.split(/\s+/).filter((w) => w.length > 2);
        for (const word of queryWords) {
            if (key.includes(word))
                score += 0.3;
            if (value.includes(word))
                score += 0.2;
        }
        if (key === query || value.includes(query)) {
            score += 0.5;
        }
        return Math.min(score, 1.0);
    }
    rankAndSelectSources(sources, topK) {
        return sources
            .sort((a, b) => (b.metadata.confidence || 0) - (a.metadata.confidence || 0))
            .slice(0, topK);
    }
    composeAnswer(query, sources, context) {
        if (sources.length === 0) {
            return `No relevant information found for query: "${query}"`;
        }
        const parts = [];
        parts.push(`Based on ${sources.length} source(s) of information:`);
        for (let i = 0; i < sources.length; i++) {
            const source = sources[i];
            const valueStr = typeof source.value === 'string'
                ? source.value
                : JSON.stringify(source.value, null, 2);
            parts.push(`\n[Source ${i + 1} - ${source.tier}] ${source.key}: ${valueStr.substring(0, 500)}`);
        }
        if (context) {
            parts.push(`\n\nContext:\n${context.substring(0, 2000)}`);
        }
        return parts.join('');
    }
    calculateConfidence(sources) {
        if (sources.length === 0)
            return 0;
        const avgConfidence = sources.reduce((sum, s) => sum + (s.metadata.confidence || 0), 0) / sources.length;
        const sourceBonus = Math.min(sources.length * 0.05, 0.2);
        return Math.min(avgConfidence + sourceBonus, 1.0);
    }
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
};
exports.RAGService = RAGService;
RAGService.DEFAULT_CHUNK_SIZE = 512;
RAGService.DEFAULT_CHUNK_OVERLAP = 64;
RAGService.MIN_CHUNK_SIZE = 64;
exports.RAGService = RAGService = RAGService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [working_memory_service_1.WorkingMemoryService,
        session_memory_service_1.SessionMemoryService,
        long_term_memory_service_1.LongTermMemoryService,
        knowledge_graph_service_1.KnowledgeGraphService,
        vector_search_service_1.VectorSearchService])
], RAGService);
//# sourceMappingURL=rag.service.js.map