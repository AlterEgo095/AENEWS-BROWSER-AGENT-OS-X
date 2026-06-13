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
var VectorSearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorSearchService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let VectorSearchService = VectorSearchService_1 = class VectorSearchService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(VectorSearchService_1.name);
        this.qdrantClient = null;
        this.defaultCollection = 'agent_memory';
        this.collections = new Set();
        this.store = new Map();
    }
    async onModuleInit() {
        await this.initializeQdrant();
        this.collections.add(this.defaultCollection);
        this.logger.log('Vector Search service initialized');
    }
    async onModuleDestroy() {
        this.qdrantClient = null;
    }
    async initializeQdrant() {
        try {
            const { QdrantClient } = await Promise.resolve().then(() => __importStar(require('@qdrant/js-client-rest')));
            const url = this.configService.get('QDRANT_URL', 'http://localhost:6333');
            const apiKey = this.configService.get('QDRANT_API_KEY');
            this.qdrantClient = new QdrantClient({
                url,
                apiKey: apiKey || undefined,
            });
            try {
                const collections = await this.qdrantClient.getCollections();
                const existingNames = new Set((collections.collections || []).map((c) => c.name));
                if (!existingNames.has(this.defaultCollection)) {
                    await this.createCollection(this.defaultCollection);
                }
                for (const c of collections.collections || []) {
                    this.collections.add(c.name);
                }
                this.logger.log('Connected to Qdrant');
            }
            catch (error) {
                this.logger.warn(`Qdrant collection init failed: ${error.message}`);
                this.qdrantClient = null;
            }
        }
        catch (error) {
            this.logger.warn(`Qdrant not available, using in-memory vector search: ${error.message}`);
            this.qdrantClient = null;
        }
    }
    async createCollection(name, dimension = VectorSearchService_1.VECTOR_DIMENSION) {
        this.collections.add(name);
        if (this.qdrantClient) {
            try {
                await this.qdrantClient.createCollection(name, {
                    vectors: {
                        size: dimension,
                        distance: 'Cosine',
                    },
                });
                this.logger.log(`Created Qdrant collection: ${name}`);
                return true;
            }
            catch (error) {
                this.logger.warn(`Failed to create Qdrant collection ${name}: ${error.message}`);
                return false;
            }
        }
        this.logger.log(`Created in-memory vector collection: ${name}`);
        return true;
    }
    async deleteCollection(name) {
        this.collections.delete(name);
        if (this.qdrantClient) {
            try {
                await this.qdrantClient.deleteCollection(name);
                this.logger.log(`Deleted Qdrant collection: ${name}`);
                return true;
            }
            catch (error) {
                this.logger.warn(`Failed to delete Qdrant collection ${name}: ${error.message}`);
                return false;
            }
        }
        for (const [id, record] of this.store) {
            if (record.payload._collection === name) {
                this.store.delete(id);
            }
        }
        return true;
    }
    listCollections() {
        return Array.from(this.collections);
    }
    async upsert(id, vector, payload) {
        const record = {
            id,
            vector,
            payload: { ...payload, _collection: payload._collection || this.defaultCollection },
            createdAt: new Date(),
        };
        this.store.set(id, record);
        if (this.qdrantClient) {
            try {
                const collection = payload._collection || this.defaultCollection;
                await this.qdrantClient.upsert(collection, {
                    points: [
                        {
                            id,
                            vector,
                            payload: record.payload,
                        },
                    ],
                });
            }
            catch (error) {
                this.logger.warn(`Qdrant upsert failed: ${error.message}`);
            }
        }
    }
    async upsertBatch(entries) {
        for (const entry of entries) {
            this.store.set(entry.id, {
                id: entry.id,
                vector: entry.vector,
                payload: {
                    ...entry.payload,
                    _collection: entry.payload._collection || this.defaultCollection,
                },
                createdAt: new Date(),
            });
        }
        if (this.qdrantClient) {
            try {
                const byCollection = new Map();
                for (const entry of entries) {
                    const collection = entry.payload._collection || this.defaultCollection;
                    if (!byCollection.has(collection)) {
                        byCollection.set(collection, []);
                    }
                    byCollection.get(collection).push(entry);
                }
                for (const [collection, items] of byCollection) {
                    await this.qdrantClient.upsert(collection, {
                        points: items.map((item) => ({
                            id: item.id,
                            vector: item.vector,
                            payload: item.payload,
                        })),
                    });
                }
            }
            catch (error) {
                this.logger.warn(`Qdrant batch upsert failed: ${error.message}`);
            }
        }
    }
    async search(query) {
        const limit = query.limit || 10;
        const scoreThreshold = query.scoreThreshold || 0.5;
        if (this.qdrantClient) {
            try {
                const collection = query.filter?._collection || this.defaultCollection;
                const results = await this.qdrantClient.search(collection, {
                    vector: query.vector,
                    limit,
                    score_threshold: scoreThreshold,
                    filter: query.filter || undefined,
                });
                const entries = results.map((r) => ({
                    id: r.id,
                    vector: query.vector,
                    payload: r.payload || {},
                    score: r.score,
                }));
                return {
                    entries,
                    total: entries.length,
                };
            }
            catch (error) {
                this.logger.warn(`Qdrant search failed, using in-memory: ${error.message}`);
            }
        }
        return this.inMemorySearch(query.vector, limit, scoreThreshold, query.filter);
    }
    async delete(id) {
        const record = this.store.get(id);
        const existed = this.store.delete(id);
        if (this.qdrantClient && record) {
            try {
                const collection = record.payload._collection || this.defaultCollection;
                await this.qdrantClient.delete(collection, {
                    points: [id],
                });
            }
            catch (error) {
                this.logger.warn(`Qdrant delete failed: ${error.message}`);
            }
        }
        return existed;
    }
    async get(id) {
        const record = this.store.get(id);
        if (!record)
            return null;
        return {
            id: record.id,
            vector: record.vector,
            payload: record.payload,
        };
    }
    generateSimpleEmbedding(text) {
        const vector = new Array(VectorSearchService_1.VECTOR_DIMENSION).fill(0);
        const normalized = text.toLowerCase().trim();
        for (let i = 0; i < normalized.length && i < VectorSearchService_1.VECTOR_DIMENSION; i++) {
            const charCode = normalized.charCodeAt(i);
            vector[i % VectorSearchService_1.VECTOR_DIMENSION] += charCode / 65535;
        }
        for (let i = 0; i < normalized.length - 1; i++) {
            const bigram = normalized.charCodeAt(i) * 31 + normalized.charCodeAt(i + 1);
            vector[bigram % VectorSearchService_1.VECTOR_DIMENSION] += 0.5;
        }
        const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
        if (norm > 0) {
            for (let i = 0; i < vector.length; i++) {
                vector[i] /= norm;
            }
        }
        return vector;
    }
    getStats() {
        return {
            totalVectors: this.store.size,
            vectorDimension: VectorSearchService_1.VECTOR_DIMENSION,
            collections: this.collections.size,
            connectedToQdrant: this.qdrantClient !== null,
        };
    }
    inMemorySearch(queryVector, limit, scoreThreshold, filter) {
        const results = [];
        for (const [, record] of this.store) {
            if (filter && !this.matchesFilter(record.payload, filter)) {
                continue;
            }
            const score = this.cosineSimilarity(queryVector, record.vector);
            if (score >= scoreThreshold) {
                results.push({
                    id: record.id,
                    vector: queryVector,
                    payload: record.payload,
                    score,
                });
            }
        }
        results.sort((a, b) => b.score - a.score);
        return {
            entries: results.slice(0, limit),
            total: results.length,
        };
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length)
            return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        if (normA === 0 || normB === 0)
            return 0;
        return dotProduct / (normA * normB);
    }
    matchesFilter(payload, filter) {
        for (const [key, value] of Object.entries(filter)) {
            if (key === '_collection')
                continue;
            if (payload[key] !== value) {
                return false;
            }
        }
        return true;
    }
};
exports.VectorSearchService = VectorSearchService;
VectorSearchService.VECTOR_DIMENSION = 1536;
exports.VectorSearchService = VectorSearchService = VectorSearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], VectorSearchService);
//# sourceMappingURL=vector-search.service.js.map