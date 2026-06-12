/**
 * AENEWS Agent OS X - Agent Memory Interface
 * Defines the memory system interfaces for agents to store and retrieve information.
 */

// ─── Memory Tier ─────────────────────────────────────────────────
export enum MemoryTier {
  WORKING = 'working',
  SESSION = 'session',
  LONG_TERM = 'long_term',
  KNOWLEDGE_GRAPH = 'knowledge_graph',
  VECTOR = 'vector',
}

// ─── Memory Entry ────────────────────────────────────────────────
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

// ─── Memory Metadata ─────────────────────────────────────────────
export interface MemoryMetadata {
  source: string;
  confidence: number;
  tags: string[];
  accessCount: number;
  lastAccessedAt: Date;
  size: number;
  encoding: MemoryEncoding;
}

export enum MemoryEncoding {
  JSON = 'json',
  TEXT = 'text',
  BINARY = 'binary',
  EMBEDDING = 'embedding',
  STRUCTURED = 'structured',
}

// ─── Memory Query ────────────────────────────────────────────────
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

// ─── Memory Query Result ─────────────────────────────────────────
export interface MemoryQueryResult<T = any> {
  entries: MemoryEntry<T>[];
  total: number;
  hasMore: boolean;
}

// ─── Memory Store Options ────────────────────────────────────────
export interface MemoryStoreOptions {
  ttlMs?: number;
  tags?: string[];
  confidence?: number;
  sessionId?: string;
  correlationId?: string;
  encoding?: MemoryEncoding;
  overwrite?: boolean;
}

// ─── Working Memory Entry ────────────────────────────────────────
export interface WorkingMemoryEntry<T = any> {
  key: string;
  value: T;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
}

// ─── Session Memory Entry ────────────────────────────────────────
export interface SessionMemoryEntry<T = any> {
  key: string;
  value: T;
  sessionId: string;
  agentId: string;
  createdAt: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
}

// ─── Long-Term Memory Entry ──────────────────────────────────────
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

// ─── Knowledge Graph Node ────────────────────────────────────────
export interface KnowledgeNode {
  id: string;
  label: string;
  properties: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Knowledge Graph Relationship ────────────────────────────────
export interface KnowledgeRelationship {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties: Record<string, any>;
  createdAt: Date;
}

// ─── Knowledge Graph Query ───────────────────────────────────────
export interface KnowledgeGraphQuery {
  nodeLabel?: string;
  relationshipType?: string;
  properties?: Record<string, any>;
  depth?: number;
  limit?: number;
}

// ─── Knowledge Graph Result ──────────────────────────────────────
export interface KnowledgeGraphResult {
  nodes: KnowledgeNode[];
  relationships: KnowledgeRelationship[];
}

// ─── Vector Search Entry ─────────────────────────────────────────
export interface VectorSearchEntry {
  id: string;
  vector: number[];
  payload: Record<string, any>;
  score?: number;
}

// ─── Vector Search Query ─────────────────────────────────────────
export interface VectorSearchQuery {
  vector: number[];
  limit?: number;
  scoreThreshold?: number;
  filter?: Record<string, any>;
}

// ─── Vector Search Result ────────────────────────────────────────
export interface VectorSearchResult {
  entries: VectorSearchEntry[];
  total: number;
}

// ─── RAG Query ───────────────────────────────────────────────────
export interface RAGQuery {
  query: string;
  agentId?: string;
  sessionId?: string;
  tiers?: MemoryTier[];
  topK?: number;
  scoreThreshold?: number;
  includeContext?: boolean;
}

// ─── RAG Result ──────────────────────────────────────────────────
export interface RAGResult {
  answer: string;
  sources: MemoryEntry[];
  confidence: number;
  context?: string;
  tokensUsed?: number;
}

// ─── Memory Service Interface ────────────────────────────────────
export interface IMemoryService {
  /**
   * Store a value in the specified memory tier.
   */
  store<T>(
    agentId: string,
    key: string,
    value: T,
    tier: MemoryTier,
    options?: MemoryStoreOptions,
  ): Promise<MemoryEntry<T>>;

  /**
   * Retrieve a value from memory.
   */
  retrieve<T>(agentId: string, key: string, tier?: MemoryTier): Promise<MemoryEntry<T> | null>;

  /**
   * Query memory entries.
   */
  query<T>(query: MemoryQuery): Promise<MemoryQueryResult<T>>;

  /**
   * Delete a memory entry.
   */
  delete(agentId: string, key: string, tier?: MemoryTier): Promise<boolean>;

  /**
   * Clear all memory for an agent.
   */
  clear(agentId: string, tier?: MemoryTier): Promise<number>;

  /**
   * Get memory statistics for an agent.
   */
  getStats(agentId: string): Promise<MemoryStats>;
}

// ─── Memory Statistics ───────────────────────────────────────────
export interface MemoryStats {
  agentId: string;
  tierStats: Record<
    MemoryTier,
    {
      entryCount: number;
      totalSizeBytes: number;
      oldestEntry?: Date;
      newestEntry?: Date;
    }
  >;
  totalEntries: number;
  totalSizeBytes: number;
}

// ─── IWorkingMemoryService ───────────────────────────────────────
export interface IWorkingMemoryService {
  set<T>(agentId: string, key: string, value: T, ttlMs?: number): void;
  get<T>(agentId: string, key: string): T | null;
  delete(agentId: string, key: string): boolean;
  has(agentId: string, key: string): boolean;
  clear(agentId: string): number;
  getSize(agentId: string): number;
  cleanup(): number;
}

// ─── ISessionMemoryService ───────────────────────────────────────
export interface ISessionMemoryService {
  set<T>(agentId: string, sessionId: string, key: string, value: T, ttlMs?: number): Promise<void>;
  get<T>(agentId: string, sessionId: string, key: string): Promise<T | null>;
  delete(agentId: string, sessionId: string, key: string): Promise<boolean>;
  getSessionKeys(agentId: string, sessionId: string): Promise<string[]>;
  clearSession(agentId: string, sessionId: string): Promise<number>;
}

// ─── ILongTermMemoryService ──────────────────────────────────────
export interface ILongTermMemoryService {
  store<T>(
    agentId: string,
    key: string,
    value: T,
    options?: MemoryStoreOptions,
  ): Promise<LongTermMemoryEntry<T>>;
  retrieve<T>(agentId: string, key: string): Promise<LongTermMemoryEntry<T> | null>;
  query<T>(query: MemoryQuery): Promise<MemoryQueryResult<LongTermMemoryEntry<T>>>;
  delete(agentId: string, key: string): Promise<boolean>;
  update<T>(
    agentId: string,
    key: string,
    value: Partial<T>,
  ): Promise<LongTermMemoryEntry<T> | null>;
}

// ─── IKnowledgeGraphService ──────────────────────────────────────
export interface IKnowledgeGraphService {
  addNode(label: string, properties: Record<string, any>): Promise<KnowledgeNode>;
  getNode(id: string): Promise<KnowledgeNode | null>;
  updateNode(id: string, properties: Record<string, any>): Promise<KnowledgeNode | null>;
  deleteNode(id: string): Promise<boolean>;
  addRelationship(
    type: string,
    sourceId: string,
    targetId: string,
    properties?: Record<string, any>,
  ): Promise<KnowledgeRelationship>;
  getRelationship(id: string): Promise<KnowledgeRelationship | null>;
  deleteRelationship(id: string): Promise<boolean>;
  query(query: KnowledgeGraphQuery): Promise<KnowledgeGraphResult>;
  traverse(
    startNodeId: string,
    depth: number,
    relationshipType?: string,
  ): Promise<KnowledgeGraphResult>;
}

// ─── IVectorSearchService ────────────────────────────────────────
export interface IVectorSearchService {
  upsert(id: string, vector: number[], payload: Record<string, any>): Promise<void>;
  search(query: VectorSearchQuery): Promise<VectorSearchResult>;
  delete(id: string): Promise<boolean>;
  get(id: string): Promise<VectorSearchEntry | null>;
}

// ─── IRAGService ─────────────────────────────────────────────────
export interface IRAGService {
  query(request: RAGQuery): Promise<RAGResult>;
  indexDocument(agentId: string, document: string, metadata?: Record<string, any>): Promise<void>;
  indexMemoryEntry(entry: MemoryEntry): Promise<void>;
}

// ─── Knowledge Relation (simple shape) ───────────────────────────
// Simpler alternative to KnowledgeRelationship for lightweight use cases.
export interface KnowledgeRelation {
  id: string;
  type: string;
  fromNodeId: string;
  toNodeId: string;
  properties: Record<string, any>;
}

// ─── Simple Vector Search Result ─────────────────────────────────
// Lightweight result for vector similarity searches.
export interface SimpleVectorSearchResult {
  id: string;
  score: number;
  payload: any;
}

// ─── Agent Memory Interface ──────────────────────────────────────
// Unified memory interface combining all tier operations.
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
