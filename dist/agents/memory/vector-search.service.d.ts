import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IVectorSearchService, VectorSearchEntry, VectorSearchQuery, VectorSearchResult } from '../interfaces/agent-memory.interface';
export declare class VectorSearchService implements IVectorSearchService, OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private qdrantClient;
    private readonly defaultCollection;
    private readonly collections;
    private readonly store;
    private static readonly VECTOR_DIMENSION;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private initializeQdrant;
    createCollection(name: string, dimension?: number): Promise<boolean>;
    deleteCollection(name: string): Promise<boolean>;
    listCollections(): string[];
    upsert(id: string, vector: number[], payload: Record<string, any>): Promise<void>;
    upsertBatch(entries: Array<{
        id: string;
        vector: number[];
        payload: Record<string, any>;
    }>): Promise<void>;
    search(query: VectorSearchQuery): Promise<VectorSearchResult>;
    delete(id: string): Promise<boolean>;
    get(id: string): Promise<VectorSearchEntry | null>;
    generateSimpleEmbedding(text: string): number[];
    getStats(): {
        totalVectors: number;
        vectorDimension: number;
        collections: number;
        connectedToQdrant: boolean;
    };
    private inMemorySearch;
    private cosineSimilarity;
    private matchesFilter;
}
