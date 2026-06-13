/**
 * AENEWS Agent OS X - Unified Memory Service
 * Facade that provides a single interface to all 5 memory tiers.
 * Automatically routes operations to the appropriate backend.
 * Implements IMemoryService with additional IAgentMemory-compatible methods.
 * Smart tier selection based on data characteristics.
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IMemoryService,
  MemoryEntry,
  MemoryQuery,
  MemoryQueryResult,
  MemoryStoreOptions,
  MemoryStats,
  MemoryTier,
  MemoryMetadata,
  MemoryEncoding,
  KnowledgeNode,
  KnowledgeRelation,
  SimpleVectorSearchResult,
} from '../interfaces/agent-memory.interface';
import { WorkingMemoryService } from './working-memory.service';
import { SessionMemoryService } from './session-memory.service';
import { LongTermMemoryService } from './long-term-memory.service';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { VectorSearchService } from './vector-search.service';

@Injectable()
export class MemoryService implements IMemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly workingMemory: WorkingMemoryService,
    private readonly sessionMemory: SessionMemoryService,
    private readonly longTermMemory: LongTermMemoryService,
    private readonly knowledgeGraph: KnowledgeGraphService,
    private readonly vectorSearch: VectorSearchService,
  ) {}

  // ─── IMemoryService Implementation ─────────────────────────────────

  /**
   * Store a value in the specified memory tier.
   */
  async store<T>(
    agentId: string,
    key: string,
    value: T,
    tier: MemoryTier,
    options?: MemoryStoreOptions,
  ): Promise<MemoryEntry<T>> {
    const now = new Date();
    const id = uuidv4();

    const metadata: MemoryMetadata = {
      source: `memory_service:${tier}`,
      confidence: options?.confidence ?? 1.0,
      tags: options?.tags || [],
      accessCount: 0,
      lastAccessedAt: now,
      size: this.estimateSize(value),
      encoding: options?.encoding || MemoryEncoding.JSON,
    };

    const entry: MemoryEntry<T> = {
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
      case MemoryTier.WORKING:
        this.workingMemory.set(agentId, key, value, options?.ttlMs);
        break;

      case MemoryTier.SESSION:
        await this.sessionMemory.set(
          agentId,
          options?.sessionId || 'default',
          key,
          value,
          options?.ttlMs,
        );
        break;

      case MemoryTier.LONG_TERM:
        await this.longTermMemory.store(agentId, key, value, options);
        break;

      case MemoryTier.KNOWLEDGE_GRAPH:
        await this.knowledgeGraph.addNode(key, {
          agentId,
          value,
          ...options?.tags?.reduce((acc, tag, i) => ({ ...acc, [`tag${i}`]: tag }), {}),
        });
        break;

      case MemoryTier.VECTOR:
        const vector = this.vectorSearch.generateSimpleEmbedding(
          typeof value === 'string' ? value : JSON.stringify(value),
        );
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

  /**
   * Retrieve a value from memory.
   */
  async retrieve<T>(
    agentId: string,
    key: string,
    tier?: MemoryTier,
  ): Promise<MemoryEntry<T> | null> {
    // If tier specified, search only that tier
    if (tier) {
      return this.retrieveFromTier<T>(agentId, key, tier);
    }

    // Otherwise, search tiers in order of speed (fastest first)
    const tierOrder = [MemoryTier.WORKING, MemoryTier.SESSION, MemoryTier.LONG_TERM];

    for (const searchTier of tierOrder) {
      const entry = await this.retrieveFromTier<T>(agentId, key, searchTier);
      if (entry) return entry;
    }

    return null;
  }

  /**
   * Query memory entries across tiers.
   */
  async query<T>(query: MemoryQuery): Promise<MemoryQueryResult<T>> {
    const results: MemoryEntry<T>[] = [];

    // Query long-term memory (primary queryable tier)
    const ltResult = await this.longTermMemory.query<T>(query);
    results.push(
      ...ltResult.entries.map((entry) => {
        const ltEntry = entry as any;
        return {
          id: ltEntry.id,
          key: ltEntry.key,
          value: ltEntry.value as T,
          tier: MemoryTier.LONG_TERM,
          agentId: ltEntry.agentId,
          metadata: {
            source: 'long_term_memory',
            confidence: ltEntry.confidence ?? 1.0,
            tags: ltEntry.tags ?? [],
            accessCount: ltEntry.accessCount ?? 0,
            lastAccessedAt: ltEntry.lastAccessedAt ?? new Date(),
            size: this.estimateSize(ltEntry.value),
            encoding: MemoryEncoding.JSON,
          },
          createdAt: ltEntry.createdAt,
          updatedAt: ltEntry.updatedAt,
        };
      }),
    );

    // Also check working memory if agent specified
    if (query.agentId) {
      const workingKeys = this.workingMemory.getKeys(query.agentId);
      for (const key of workingKeys) {
        const value = this.workingMemory.get<T>(query.agentId, key);
        if (value !== null) {
          results.push({
            id: `working:${query.agentId}:${key}`,
            key,
            value,
            tier: MemoryTier.WORKING,
            agentId: query.agentId,
            metadata: {
              source: 'working_memory',
              confidence: 0.5,
              tags: [],
              accessCount: 0,
              lastAccessedAt: new Date(),
              size: this.estimateSize(value),
              encoding: MemoryEncoding.JSON,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    // Apply pagination
    const total = results.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;

    return {
      entries: results.slice(offset, offset + limit),
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Delete a memory entry.
   */
  async delete(agentId: string, key: string, tier?: MemoryTier): Promise<boolean> {
    const tiers = tier ? [tier] : [MemoryTier.WORKING, MemoryTier.SESSION, MemoryTier.LONG_TERM];

    let deleted = false;

    for (const deleteTier of tiers) {
      switch (deleteTier) {
        case MemoryTier.WORKING:
          if (this.workingMemory.delete(agentId, key)) deleted = true;
          break;

        case MemoryTier.SESSION:
          if (await this.sessionMemory.delete(agentId, 'default', key)) deleted = true;
          break;

        case MemoryTier.LONG_TERM:
          if (await this.longTermMemory.delete(agentId, key)) deleted = true;
          break;

        case MemoryTier.VECTOR:
          this.logger.debug?.(`Vector delete by key not directly supported: ${key}`);
          break;

        case MemoryTier.KNOWLEDGE_GRAPH:
          this.logger.debug?.(`Knowledge graph delete by key not directly supported: ${key}`);
          break;
      }
    }

    return deleted;
  }

  /**
   * Clear all memory for an agent.
   */
  async clear(agentId: string, tier?: MemoryTier): Promise<number> {
    let totalCleared = 0;

    const tiers = tier ? [tier] : [MemoryTier.WORKING, MemoryTier.SESSION, MemoryTier.LONG_TERM];

    for (const clearTier of tiers) {
      switch (clearTier) {
        case MemoryTier.WORKING:
          totalCleared += this.workingMemory.clear(agentId);
          break;

        case MemoryTier.SESSION:
          const sessions = await this.sessionMemory.getAgentSessions(agentId);
          for (const sessionId of sessions) {
            totalCleared += await this.sessionMemory.clearSession(agentId, sessionId);
          }
          break;

        case MemoryTier.LONG_TERM:
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

  /**
   * Get memory statistics for an agent.
   */
  async getStats(agentId: string): Promise<MemoryStats> {
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
        [MemoryTier.WORKING]: workingStats,
        [MemoryTier.SESSION]: sessionStats,
        [MemoryTier.LONG_TERM]: longTermStats,
        [MemoryTier.KNOWLEDGE_GRAPH]: kgStats,
        [MemoryTier.VECTOR]: vectorStats,
      },
      totalEntries: workingStats.entryCount + longTermStats.entryCount,
      totalSizeBytes: workingStats.totalSizeBytes + longTermStats.totalSizeBytes,
    };
  }

  // ─── IAgentMemory-Compatible Methods ───────────────────────────────
  // These methods provide the IAgentMemory interface functionality
  // using agentId = 'system' as default.

  /**
   * Store a value with auto tier selection (IAgentMemory-compatible).
   */
  async storeMemory(key: string, value: any, tier: MemoryTier, ttl?: number): Promise<void> {
    const selectedTier = tier || this.selectTier(value, ttl);
    await this.store('system', key, value, selectedTier, { ttlMs: ttl });
  }

  /**
   * Retrieve a value (IAgentMemory-compatible).
   */
  async retrieveMemory(key: string, tier?: MemoryTier): Promise<MemoryEntry | null> {
    return this.retrieve('system', key, tier);
  }

  /**
   * Delete a value (IAgentMemory-compatible).
   */
  async deleteMemory(key: string, tier?: MemoryTier): Promise<boolean> {
    return this.delete('system', key, tier);
  }

  /**
   * Search for similar entries using vector search.
   */
  async search(query: string, limit?: number): Promise<SimpleVectorSearchResult[]> {
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

  /**
   * Add a knowledge node to the graph.
   */
  async addKnowledgeNode(node: KnowledgeNode): Promise<string> {
    const created = await this.knowledgeGraph.addNode(node.label, {
      ...node.properties,
      originalId: node.id,
    });
    return created.id;
  }

  /**
   * Add a knowledge relation to the graph.
   */
  async addKnowledgeRelation(relation: KnowledgeRelation): Promise<string> {
    const created = await this.knowledgeGraph.addRelationship(
      relation.type,
      relation.fromNodeId,
      relation.toNodeId,
      relation.properties,
    );
    return created.id;
  }

  /**
   * Execute a Cypher query on the knowledge graph.
   */
  async queryKnowledge(cypherQuery: string): Promise<any> {
    return this.knowledgeGraph.executeCypher(cypherQuery);
  }

  /**
   * Get conversation context from session memory.
   */
  async getConversationContext(sessionId: string): Promise<MemoryEntry[]> {
    const context = await this.sessionMemory.getSessionContext<any>('system', sessionId);
    const entries: MemoryEntry[] = [];

    for (const [key, value] of context) {
      entries.push({
        id: `session:system:${sessionId}:${key}`,
        key,
        value,
        tier: MemoryTier.SESSION,
        agentId: 'system',
        sessionId,
        metadata: {
          source: 'session_memory',
          confidence: 0.9,
          tags: [],
          accessCount: 0,
          lastAccessedAt: new Date(),
          size: this.estimateSize(value),
          encoding: MemoryEncoding.JSON,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return entries;
  }

  /**
   * Clear all entries in a specific memory tier.
   */
  async clearTier(tier: MemoryTier): Promise<void> {
    switch (tier) {
      case MemoryTier.WORKING:
        this.workingMemory.cleanup();
        break;

      case MemoryTier.SESSION:
        this.sessionMemory.cleanup();
        break;

      case MemoryTier.LONG_TERM:
        this.logger.warn('Clearing all long-term memory is not supported through clearTier');
        break;

      case MemoryTier.KNOWLEDGE_GRAPH:
        this.logger.warn('Clearing all knowledge graph nodes is not supported through clearTier');
        break;

      case MemoryTier.VECTOR:
        this.logger.warn('Clearing all vector entries is not supported through clearTier');
        break;
    }
  }

  // ─── Smart Tier Selection ──────────────────────────────────────────

  /**
   * Automatically select the best memory tier based on data characteristics.
   * - Small, temporary data → Working memory
   * - Session-scoped data → Session memory
   * - Large, important data → Long-term memory
   * - Relationship data → Knowledge graph
   * - Searchable text → Vector store
   */
  private selectTier(value: any, ttl?: number): MemoryTier {
    const size = this.estimateSize(value);

    // Short TTL data goes to working memory
    if (ttl && ttl <= 5 * 60 * 1000) {
      return MemoryTier.WORKING;
    }

    // Small data without TTL goes to working memory
    if (size < 1024 && !ttl) {
      return MemoryTier.WORKING;
    }

    // Session-scoped data
    if (ttl && ttl <= 30 * 60 * 1000) {
      return MemoryTier.SESSION;
    }

    // Large text content benefits from vector search
    if (typeof value === 'string' && value.length > 200) {
      return MemoryTier.VECTOR;
    }

    // Default to long-term memory
    return MemoryTier.LONG_TERM;
  }

  // ─── Private Methods ─────────────────────────────────────────────

  private async retrieveFromTier<T>(
    agentId: string,
    key: string,
    tier: MemoryTier,
  ): Promise<MemoryEntry<T> | null> {
    switch (tier) {
      case MemoryTier.WORKING: {
        const value = this.workingMemory.get<T>(agentId, key);
        if (value === null) return null;
        return {
          id: `working:${agentId}:${key}`,
          key,
          value,
          tier: MemoryTier.WORKING,
          agentId,
          metadata: {
            source: 'working_memory',
            confidence: 1.0,
            tags: [],
            accessCount: 0,
            lastAccessedAt: new Date(),
            size: this.estimateSize(value),
            encoding: MemoryEncoding.JSON,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      case MemoryTier.SESSION: {
        const value = await this.sessionMemory.get<T>(agentId, 'default', key);
        if (value === null) return null;
        return {
          id: `session:${agentId}:${key}`,
          key,
          value,
          tier: MemoryTier.SESSION,
          agentId,
          metadata: {
            source: 'session_memory',
            confidence: 0.9,
            tags: [],
            accessCount: 0,
            lastAccessedAt: new Date(),
            size: this.estimateSize(value),
            encoding: MemoryEncoding.JSON,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      case MemoryTier.LONG_TERM: {
        const entry = await this.longTermMemory.retrieve<T>(agentId, key);
        if (!entry) return null;
        return {
          id: entry.id,
          key: entry.key,
          value: entry.value,
          tier: MemoryTier.LONG_TERM,
          agentId: entry.agentId,
          metadata: {
            source: 'long_term_memory',
            confidence: entry.confidence,
            tags: entry.tags,
            accessCount: entry.accessCount,
            lastAccessedAt: entry.lastAccessedAt,
            size: this.estimateSize(entry.value),
            encoding: MemoryEncoding.JSON,
          },
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        };
      }

      default:
        return null;
    }
  }

  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024;
    }
  }
}
