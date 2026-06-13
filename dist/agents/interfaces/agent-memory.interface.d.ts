export declare enum MemoryTier {
    WORKING = "working",
    SESSION = "session",
    LONG_TERM = "long_term",
    KNOWLEDGE_GRAPH = "knowledge_graph",
    VECTOR = "vector"
}
export interface MemoryEntry<T = any> {
    id: string;
    key: string;
    value: T;
    tier: MemoryTier;
    agentId: string;
    sessionId?: string;
    correlationId?: string;
    metadata: MemoryMetadata;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
}
export interface MemoryMetadata {
    source: string;
    confidence: number;
    tags: string[];
    accessCount: number;
    lastAccessedAt: Date;
    size: number;
    encoding: MemoryEncoding;
}
export declare enum MemoryEncoding {
    JSON = "json",
    TEXT = "text",
    BINARY = "binary",
    EMBEDDING = "embedding",
    STRUCTURED = "structured"
}
export interface MemoryQuery {
    key?: string;
    keyPrefix?: string;
    agentId?: string;
    sessionId?: string;
    correlationId?: string;
    tier?: MemoryTier;
    tags?: string[];
    minConfidence?: number;
    createdAfter?: Date;
    createdBefore?: Date;
    limit?: number;
    offset?: number;
}
export interface MemoryQueryResult<T = any> {
    entries: MemoryEntry<T>[];
    total: number;
    hasMore: boolean;
}
export interface MemoryStoreOptions {
    ttlMs?: number;
    tags?: string[];
    confidence?: number;
    sessionId?: string;
    correlationId?: string;
    encoding?: MemoryEncoding;
    overwrite?: boolean;
}
export interface WorkingMemoryEntry<T = any> {
    key: string;
    value: T;
    expiresAt: number;
    createdAt: number;
    accessCount: number;
}
export interface SessionMemoryEntry<T = any> {
    key: string;
    value: T;
    sessionId: string;
    agentId: string;
    createdAt: Date;
    expiresAt?: Date;
    metadata: Record<string, any>;
}
export interface LongTermMemoryEntry<T = any> {
    id: string;
    key: string;
    value: T;
    agentId: string;
    tags: string[];
    confidence: number;
    createdAt: Date;
    updatedAt: Date;
    accessCount: number;
    lastAccessedAt: Date;
}
export interface KnowledgeNode {
    id: string;
    label: string;
    properties: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export interface KnowledgeRelationship {
    id: string;
    type: string;
    sourceId: string;
    targetId: string;
    properties: Record<string, any>;
    createdAt: Date;
}
export interface KnowledgeGraphQuery {
    nodeLabel?: string;
    relationshipType?: string;
    properties?: Record<string, any>;
    depth?: number;
    limit?: number;
}
export interface KnowledgeGraphResult {
    nodes: KnowledgeNode[];
    relationships: KnowledgeRelationship[];
}
export interface VectorSearchEntry {
    id: string;
    vector: number[];
    payload: Record<string, any>;
    score?: number;
}
export interface VectorSearchQuery {
    vector: number[];
    limit?: number;
    scoreThreshold?: number;
    filter?: Record<string, any>;
}
export interface VectorSearchResult {
    entries: VectorSearchEntry[];
    total: number;
}
export interface RAGQuery {
    query: string;
    agentId?: string;
    sessionId?: string;
    tiers?: MemoryTier[];
    topK?: number;
    scoreThreshold?: number;
    includeContext?: boolean;
}
export interface RAGResult {
    answer: string;
    sources: MemoryEntry[];
    confidence: number;
    context?: string;
    tokensUsed?: number;
}
export interface IMemoryService {
    store<T>(agentId: string, key: string, value: T, tier: MemoryTier, options?: MemoryStoreOptions): Promise<MemoryEntry<T>>;
    retrieve<T>(agentId: string, key: string, tier?: MemoryTier): Promise<MemoryEntry<T> | null>;
    query<T>(query: MemoryQuery): Promise<MemoryQueryResult<T>>;
    delete(agentId: string, key: string, tier?: MemoryTier): Promise<boolean>;
    clear(agentId: string, tier?: MemoryTier): Promise<number>;
    getStats(agentId: string): Promise<MemoryStats>;
}
export interface MemoryStats {
    agentId: string;
    tierStats: Record<MemoryTier, {
        entryCount: number;
        totalSizeBytes: number;
        oldestEntry?: Date;
        newestEntry?: Date;
    }>;
    totalEntries: number;
    totalSizeBytes: number;
}
export interface IWorkingMemoryService {
    set<T>(agentId: string, key: string, value: T, ttlMs?: number): void;
    get<T>(agentId: string, key: string): T | null;
    delete(agentId: string, key: string): boolean;
    has(agentId: string, key: string): boolean;
    clear(agentId: string): number;
    getSize(agentId: string): number;
    cleanup(): number;
}
export interface ISessionMemoryService {
    set<T>(agentId: string, sessionId: string, key: string, value: T, ttlMs?: number): Promise<void>;
    get<T>(agentId: string, sessionId: string, key: string): Promise<T | null>;
    delete(agentId: string, sessionId: string, key: string): Promise<boolean>;
    getSessionKeys(agentId: string, sessionId: string): Promise<string[]>;
    clearSession(agentId: string, sessionId: string): Promise<number>;
}
export interface ILongTermMemoryService {
    store<T>(agentId: string, key: string, value: T, options?: MemoryStoreOptions): Promise<LongTermMemoryEntry<T>>;
    retrieve<T>(agentId: string, key: string): Promise<LongTermMemoryEntry<T> | null>;
    query<T>(query: MemoryQuery): Promise<MemoryQueryResult<LongTermMemoryEntry<T>>>;
    delete(agentId: string, key: string): Promise<boolean>;
    update<T>(agentId: string, key: string, value: Partial<T>): Promise<LongTermMemoryEntry<T> | null>;
}
export interface IKnowledgeGraphService {
    addNode(label: string, properties: Record<string, any>): Promise<KnowledgeNode>;
    getNode(id: string): Promise<KnowledgeNode | null>;
    updateNode(id: string, properties: Record<string, any>): Promise<KnowledgeNode | null>;
    deleteNode(id: string): Promise<boolean>;
    addRelationship(type: string, sourceId: string, targetId: string, properties?: Record<string, any>): Promise<KnowledgeRelationship>;
    getRelationship(id: string): Promise<KnowledgeRelationship | null>;
    deleteRelationship(id: string): Promise<boolean>;
    query(query: KnowledgeGraphQuery): Promise<KnowledgeGraphResult>;
    traverse(startNodeId: string, depth: number, relationshipType?: string): Promise<KnowledgeGraphResult>;
}
export interface IVectorSearchService {
    upsert(id: string, vector: number[], payload: Record<string, any>): Promise<void>;
    search(query: VectorSearchQuery): Promise<VectorSearchResult>;
    delete(id: string): Promise<boolean>;
    get(id: string): Promise<VectorSearchEntry | null>;
}
export interface IRAGService {
    query(request: RAGQuery): Promise<RAGResult>;
    indexDocument(agentId: string, document: string, metadata?: Record<string, any>): Promise<void>;
    indexMemoryEntry(entry: MemoryEntry): Promise<void>;
}
export interface KnowledgeRelation {
    id: string;
    type: string;
    fromNodeId: string;
    toNodeId: string;
    properties: Record<string, any>;
}
export interface SimpleVectorSearchResult {
    id: string;
    score: number;
    payload: any;
}
export interface IAgentMemory {
    store(key: string, value: any, tier: MemoryTier, ttl?: number): Promise<void>;
    retrieve(key: string, tier?: MemoryTier): Promise<MemoryEntry | null>;
    delete(key: string, tier?: MemoryTier): Promise<boolean>;
    search(query: string, limit?: number): Promise<SimpleVectorSearchResult[]>;
    addKnowledgeNode(node: KnowledgeNode): Promise<string>;
    addKnowledgeRelation(relation: KnowledgeRelation): Promise<string>;
    queryKnowledge(cypherQuery: string): Promise<any>;
    getConversationContext(sessionId: string): Promise<MemoryEntry[]>;
    clearTier(tier: MemoryTier): Promise<void>;
}
