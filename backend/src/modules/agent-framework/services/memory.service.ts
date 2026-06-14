/**
 * AENEWS Agent OS X — Memory Service
 *
 * High-level memory service that provides agent-scoped memory operations
 * with automatic embedding generation via LLM, vector storage via Qdrant,
 * and structured metadata management.
 *
 * Features:
 *   - Agent-scoped memory storage and retrieval
 *   - Automatic embedding generation using LLM (text-embedding-3-small via OpenAI)
 *   - Semantic search over stored memories using Qdrant vector similarity
 *   - Metadata-aware storage with agent ID and timestamp tracking
 *   - Graceful degradation when Qdrant or LLM is unavailable
 *   - Automatic collection management
 *
 * Usage:
 *   // Store a memory
 *   await memoryService.store('agent-1', 'Mission completed successfully', {
 *     missionId: 'm-123',
 *     category: 'mission_result'
 *   });
 *
 *   // Recall related memories
 *   const memories = await memoryService.recall('agent-1', 'mission results', 5);
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { LLMService } from '../../llm/llm.service';
import { QdrantService } from '../../qdrant/qdrant.service';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import { createHash } from 'crypto';

// ─── Types ─────────────────────────────────────────────────────────

export interface MemoryEntry {
  /** Unique ID for this memory entry */
  id: string;
  /** Agent ID that owns this memory */
  agentId: string;
  /** The content stored in this memory */
  content: string;
  /** Metadata associated with this memory */
  metadata: MemoryMetadata;
  /** When this memory was stored */
  storedAt: string;
  /** Relevance score (only populated in search results) */
  relevanceScore?: number;
}

export interface MemoryMetadata {
  /** Agent ID */
  agentId: string;
  /** Optional category for grouping memories */
  category?: string;
  /** Optional mission ID this memory relates to */
  missionId?: string;
  /** Optional tags for keyword search */
  tags?: string[];
  /** Custom metadata fields */
  [key: string]: any;
}

export interface MemorySearchResult {
  /** The matching memory entry */
  entry: MemoryEntry;
  /** Similarity score (0-1) */
  score: number;
}

export interface MemoryStats {
  /** Total memories stored */
  totalMemories: number;
  /** Number of agents with memories */
  agentCount: number;
  /** Collection name */
  collectionName: string;
  /** Whether vector search is available */
  vectorSearchAvailable: boolean;
}

// ─── Service ───────────────────────────────────────────────────────

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  /** Qdrant collection for agent memory vectors */
  private readonly MEMORY_COLLECTION = 'agent_memory_vectors';

  /** Default embedding dimension (OpenAI text-embedding-3-small) */
  private readonly EMBEDDING_DIMENSION = 1536;

  constructor(
    private readonly llmService: LLMService,
    @Optional() private readonly qdrantService?: QdrantService,
    @Optional() private readonly agentMemoryService?: AgentMemoryService,
  ) {
    this.ensureCollection().catch(() => {
      this.logger.warn(
        'Qdrant collection not available — vector memory will use fallback storage',
      );
    });
  }

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Store a memory entry for an agent.
   *
   * The content is:
   * 1. Stored in the agent memory service (cache-based, tiered)
   * 2. Embedded using LLM and stored in Qdrant for semantic search
   *
   * @param agentId - The agent ID that owns this memory
   * @param content - The content to store
   * @param metadata - Optional metadata (category, missionId, tags, etc.)
   * @returns The stored memory entry
   */
  async store(
    agentId: string,
    content: string,
    metadata?: MemoryMetadata,
  ): Promise<MemoryEntry> {
    const id = this.generateId(agentId, content);
    const now = new Date().toISOString();

    const entry: MemoryEntry = {
      id,
      agentId,
      content,
      metadata: {
        agentId,
        ...metadata,
        storedAt: now,
      },
      storedAt: now,
    };

    // Store in agent memory service (fast key-value access)
    if (this.agentMemoryService) {
      try {
        await this.agentMemoryService.store(
          agentId,
          MemoryTier.LONG_TERM,
          `memory:${id}`,
          entry,
        );
      } catch (error: any) {
        this.logger.warn(
          `Failed to store memory in agent memory service: ${error.message}`,
        );
      }
    }

    // Generate embedding and store in Qdrant for semantic search
    if (this.qdrantService) {
      try {
        const embedding = await this.generateEmbedding(content);
        if (embedding) {
          await this.qdrantService.upsert(this.MEMORY_COLLECTION, [
            {
              id,
              vector: embedding,
              payload: {
                agentId,
                content: content.slice(0, 4000), // Limit payload size
                category: metadata?.category,
                missionId: metadata?.missionId,
                tags: metadata?.tags || [],
                storedAt: now,
                contentHash: createHash('sha256').update(content).digest('hex').substring(0, 16),
              },
            },
          ]);
          this.logger.debug(`Stored vector memory for agent ${agentId}: ${id}`);
        }
      } catch (error: any) {
        this.logger.warn(
          `Failed to store vector memory: ${error.message}`,
        );
      }
    }

    return entry;
  }

  /**
   * Recall memories for an agent using semantic search.
   *
   * Generates an embedding for the query and searches Qdrant for
   * similar vectors. Falls back to keyword-based search if
   * vector search is unavailable.
   *
   * @param agentId - The agent ID to recall memories for
   * @param query - The search query
   * @param limit - Maximum number of results (default 10)
   * @returns Array of memory search results with relevance scores
   */
  async recall(
    agentId: string,
    query: string,
    limit: number = 10,
  ): Promise<MemorySearchResult[]> {
    // Try vector search first
    if (this.qdrantService) {
      try {
        const queryEmbedding = await this.generateEmbedding(query);
        if (queryEmbedding) {
          const results = await this.qdrantService.search(
            this.MEMORY_COLLECTION,
            queryEmbedding,
            limit,
            {
              must: [
                {
                  key: 'agentId',
                  match: { value: agentId },
                },
              ],
            },
          );

          if (results.length > 0) {
            return results.map((r) => ({
              entry: {
                id: r.id as string,
                agentId,
                content: r.payload?.content || '',
                metadata: {
                  agentId,
                  ...r.payload,
                } as MemoryMetadata,
                storedAt: r.payload?.storedAt || new Date().toISOString(),
              },
              score: r.score,
            }));
          }
        }
      } catch (error: any) {
        this.logger.warn(
          `Vector recall failed for agent ${agentId}: ${error.message}`,
        );
      }
    }

    // Fallback: use agent memory service for keyword-based search
    if (this.agentMemoryService) {
      try {
        // Try to retrieve recent memories from long-term storage
        const recentData = await this.agentMemoryService.retrieve(
          agentId,
          MemoryTier.LONG_TERM,
          'memory',
        );

        if (recentData && typeof recentData === 'object') {
          const memories = Array.isArray(recentData) ? recentData : [recentData];
          const queryLower = query.toLowerCase();
          const queryKeywords = queryLower.split(/\s+/).filter((w) => w.length > 3);

          return memories
            .filter((m: any) => {
              if (!m || typeof m !== 'object') return false;
              const content = (m.content || '').toLowerCase();
              return queryKeywords.some((kw) => content.includes(kw));
            })
            .slice(0, limit)
            .map((m: any) => ({
              entry: {
                id: m.id || 'unknown',
                agentId,
                content: m.content || '',
                metadata: m.metadata || {},
                storedAt: m.storedAt || new Date().toISOString(),
              },
              score: 0.5, // Default score for keyword match
            }));
        }
      } catch (error: any) {
        this.logger.debug(
          `Keyword recall fallback failed: ${error.message}`,
        );
      }
    }

    return [];
  }

  /**
   * Delete a specific memory entry.
   */
  async forget(agentId: string, memoryId: string): Promise<boolean> {
    let deleted = false;

    // Delete from Qdrant
    if (this.qdrantService) {
      try {
        await this.qdrantService.deletePoints(this.MEMORY_COLLECTION, [memoryId]);
        deleted = true;
      } catch (error: any) {
        this.logger.warn(`Failed to delete vector memory: ${error.message}`);
      }
    }

    // Delete from agent memory service
    if (this.agentMemoryService) {
      try {
        await this.agentMemoryService.store(
          agentId,
          MemoryTier.LONG_TERM,
          `memory:${memoryId}`,
          null,
        );
        deleted = true;
      } catch (error: any) {
        this.logger.warn(`Failed to delete cached memory: ${error.message}`);
      }
    }

    return deleted;
  }

  /**
   * Clear all memories for a specific agent.
   */
  async clearAgentMemories(agentId: string): Promise<number> {
    let deletedCount = 0;

    // Clear from Qdrant (need to find and delete agent's points)
    if (this.qdrantService) {
      try {
        // Scroll through points to find agent's memories
        let offset: string | null = null;
        const idsToDelete: string[] = [];

        do {
          const result = await this.qdrantService.scrollPoints(
            this.MEMORY_COLLECTION,
            100,
            {
              must: [
                {
                  key: 'agentId',
                  match: { value: agentId },
                },
              ],
            },
          );

          idsToDelete.push(...result.points.map((p) => p.id));

          if (idsToDelete.length > 0) {
            await this.qdrantService.deletePoints(
              this.MEMORY_COLLECTION,
              idsToDelete,
            );
            deletedCount += idsToDelete.length;
          }

          offset = result.nextOffset;
        } while (offset);
      } catch (error: any) {
        this.logger.warn(
          `Failed to clear vector memories for agent ${agentId}: ${error.message}`,
        );
      }
    }

    // Clear from agent memory service
    if (this.agentMemoryService) {
      try {
        await this.agentMemoryService.clear(agentId, MemoryTier.LONG_TERM);
      } catch (error: any) {
        this.logger.warn(
          `Failed to clear cached memories for agent ${agentId}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Cleared ${deletedCount} memories for agent ${agentId}`,
    );
    return deletedCount;
  }

  /**
   * Get memory statistics.
   */
  async getStats(agentId?: string): Promise<MemoryStats> {
    let totalMemories = 0;
    let agentCount = 0;
    let vectorSearchAvailable = false;

    if (this.qdrantService) {
      try {
        if (agentId) {
          totalMemories = await this.qdrantService.countPoints(
            this.MEMORY_COLLECTION,
            {
              must: [{ key: 'agentId', match: { value: agentId } }],
            },
          );
        } else {
          totalMemories = await this.qdrantService.countPoints(
            this.MEMORY_COLLECTION,
          );
        }
        vectorSearchAvailable = true;
      } catch {
        vectorSearchAvailable = false;
      }
    }

    return {
      totalMemories,
      agentCount,
      collectionName: this.MEMORY_COLLECTION,
      vectorSearchAvailable,
    };
  }

  /**
   * Check if the memory service is available.
   */
  isAvailable(): boolean {
    return this.llmService.isAnyAvailable();
  }

  // ─── Private Methods ───────────────────────────────────────────

  /**
   * Generate an embedding vector for the given text using LLM.
   *
   * Uses OpenAI's embedding model if available. Falls back to a
   * simple hash-based pseudo-embedding for basic functionality
   * when the embedding API is not accessible.
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      // Try using OpenAI embeddings API via the provider
      const openaiProvider = this.llmService.getProvider('openai');

      if (openaiProvider?.isAvailable()) {
        // Access the underlying OpenAI client for embeddings
        const client = (openaiProvider as any).client;
        if (client?.embeddings) {
          const response = await client.embeddings.create({
            model: 'text-embedding-3-small',
            input: text.slice(0, 8000), // Limit input size
          });

          if (response.data?.[0]?.embedding) {
            return response.data[0].embedding;
          }
        }
      }

      // Fallback: Generate a deterministic pseudo-embedding
      // This provides basic vector storage capability but not true semantic search
      return this.generatePseudoEmbedding(text);
    } catch (error: any) {
      this.logger.debug(
        `Embedding generation failed, using pseudo-embedding: ${error.message}`,
      );
      return this.generatePseudoEmbedding(text);
    }
  }

  /**
   * Generate a deterministic pseudo-embedding for text.
   *
   * This is a fallback when the OpenAI embedding API is unavailable.
   * It uses a hash-based approach to create a fixed-dimension vector
   * that provides basic content-based similarity (same text = same vector).
   * It does NOT provide true semantic similarity.
   */
  private generatePseudoEmbedding(text: string): number[] {
    const vector = new Array(this.EMBEDDING_DIMENSION).fill(0);

    // Use multiple hash rounds for better distribution
    const normalizedText = text.toLowerCase().trim();
    const words = normalizedText.split(/\s+/);

    for (let i = 0; i < this.EMBEDDING_DIMENSION; i++) {
      // Mix word content into vector positions
      const hashInput = `${normalizedText}:dim:${i}`;
      const hash = createHash('sha256')
        .update(hashInput)
        .digest()
        .readUInt32BE(i % 28); // Read 4 bytes at different positions

      // Normalize to [-1, 1] range with small values
      vector[i] = (hash % 10000) / 10000 * 0.01;
    }

    // Add word-based signal for basic similarity
    for (const word of words) {
      if (word.length < 3) continue;
      const wordHash = createHash('md5').update(word).digest();
      for (let j = 0; j < 4; j++) {
        const idx = wordHash.readUInt32BE(j * 4) % this.EMBEDDING_DIMENSION;
        vector[idx] += 0.1; // Boost positions associated with words
      }
    }

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }

  /**
   * Generate a unique ID for a memory entry.
   */
  private generateId(agentId: string, content: string): string {
    const hash = createHash('sha256')
      .update(`${agentId}:${content}:${Date.now()}`)
      .digest('hex')
      .substring(0, 24);
    return `mem-${hash}`;
  }

  /**
   * Ensure the Qdrant collection exists.
   */
  private async ensureCollection(): Promise<void> {
    if (!this.qdrantService) return;
    try {
      const exists = await this.qdrantService.collectionExists(
        this.MEMORY_COLLECTION,
      );
      if (!exists) {
        await this.qdrantService.createCollection(
          this.MEMORY_COLLECTION,
          this.EMBEDDING_DIMENSION,
        );
        this.logger.log(
          `Created Qdrant collection: ${this.MEMORY_COLLECTION}`,
        );
      }
    } catch {
      this.logger.warn(
        'Could not create Qdrant collection for memory vectors',
      );
    }
  }
}
