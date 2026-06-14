import { MemoryEntry, MemoryTier, MemoryStoreOptions, MemoryQuery, MemoryQueryResult, MemoryStats, IMemoryService } from '../../agents/interfaces/agent-memory.interface';
export declare const MEMORY_TIERS: readonly ["working", "session", "conversation", "long_term", "semantic", "knowledge_graph", "vector", "archive"];
export type MemoryGatewayTier = (typeof MEMORY_TIERS)[number];
export interface MemoryGatewayStoreOptions extends MemoryStoreOptions {
    autoTier?: boolean;
    importance?: number;
}
export interface CrossTierSearchResult {
    entries: MemoryEntry[];
    fusedScore: number;
    sourceTiers: string[];
    totalSearched: number;
}
export interface MemoryPromotionResult {
    from: string;
    to: string;
    key: string;
    success: boolean;
}
export interface MemorySummarizationResult {
    originalCount: number;
    summary: string;
    keyPoints: string[];
    compressedEntry: MemoryEntry;
}
export declare class MemoryGatewayService implements IMemoryService {
    private readonly logger;
    private readonly workingStore;
    private readonly sessionStore;
    private readonly conversationStore;
    private readonly longTermStore;
    private readonly semanticStore;
    private readonly archiveStore;
    private readonly vectorIndex;
    private readonly kgNodes;
    constructor();
    store<T>(agentId: string, key: string, value: T, tier?: MemoryTier | MemoryGatewayTier, options?: MemoryGatewayStoreOptions): Promise<MemoryEntry<T>>;
    retrieve<T>(agentId: string, key: string, tier?: MemoryTier | MemoryGatewayTier): Promise<MemoryEntry<T> | null>;
    search(query: string, agentId?: string, limit?: number): Promise<CrossTierSearchResult>;
    summarize(agentId: string, key: string | string[]): Promise<MemorySummarizationResult>;
    promote(agentId: string, key: string, from: string, to: string): Promise<MemoryPromotionResult>;
    archive(agentId: string, key: string, sourceTier?: string): Promise<boolean>;
    crossTierRetrieve(agentId: string, query: string, options?: {
        maxTiers?: number;
        minConfidence?: number;
        includeVectorSearch?: boolean;
    }): Promise<CrossTierSearchResult>;
    query<T>(query: MemoryQuery): Promise<MemoryQueryResult<T>>;
    delete(agentId: string, key: string, tier?: MemoryTier | MemoryGatewayTier): Promise<boolean>;
    clear(agentId: string, tier?: MemoryTier | MemoryGatewayTier): Promise<number>;
    getStats(agentId: string): Promise<MemoryStats>;
    private toMemoryTier;
    private selectTier;
    private createEntry;
    private storeInMap;
    private storeInSessionMap;
    private storeInConversation;
    private retrieveFromTier;
    private deleteFromTier;
    private getStoreForTier;
    private generateEmbedding;
    private searchVectorIndex;
    private cosineSimilarity;
    private keywordSearch;
    private matchesQuery;
    private nodeMatchesQuery;
    private deduplicateResults;
    private estimateSize;
}
