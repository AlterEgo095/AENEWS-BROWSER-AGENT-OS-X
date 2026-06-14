import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { QdrantService } from '../../qdrant/qdrant.service';

/**
 * Memory tier — determines storage backend and retention policy.
 */
export enum MemoryTier {
  WORKING = 'working',
  SESSION = 'session',
  LONG_TERM = 'long-term',
}

/**
 * Default TTL per tier (in seconds).
 * Working memory is very short-lived; session lives for the session;
 * long-term persists indefinitely.
 */
const DEFAULT_TTL: Record<MemoryTier, number | null> = {
  [MemoryTier.WORKING]: 60 * 5, // 5 minutes
  [MemoryTier.SESSION]: 60 * 60, // 1 hour
  [MemoryTier.LONG_TERM]: null, // no expiry
};

const QDRANT_COLLECTION = 'agent_memory';

@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: any,
    @Optional() private readonly qdrantService?: QdrantService,
  ) {
    this.ensureCollection().catch(() => {
      this.logger.warn(
        'Qdrant collection not available — vector search will be disabled',
      );
    });
  }

  // ─── Public API ──────────────────────────────────────────────

  /**
   * Store a value in the specified memory tier for a given agent.
   * For vector-searchable content, pass `embedding` alongside the value.
   */
  async store(
    agentId: string,
    tier: MemoryTier,
    key: string,
    value: any,
    ttl?: number,
    embedding?: number[],
  ): Promise<void> {
    const cacheKey = this.buildKey(agentId, tier, key);
    const effectiveTtl = ttl ?? DEFAULT_TTL[tier] ?? undefined;
    const serialized = JSON.stringify(value);

    if (effectiveTtl) {
      await this.cacheManager.set(cacheKey, serialized, effectiveTtl * 1000);
    } else {
      await this.cacheManager.set(cacheKey, serialized, 0);
    }

    // If an embedding is provided, upsert into Qdrant for semantic search
    if (embedding && this.qdrantService) {
      try {
        await this.qdrantService.upsert(QDRANT_COLLECTION, [
          {
            id: cacheKey,
            vector: embedding,
            payload: { agentId, tier, key, value, storedAt: Date.now() },
          },
        ]);
      } catch (err) {
        this.logger.warn(
          `Failed to upsert vector for ${cacheKey}: ${(err as Error).message}`,
        );
      }
    }
  }

  /**
   * Retrieve a value from the specified memory tier for a given agent.
   */
  async retrieve(agentId: string, tier: MemoryTier, key: string): Promise<any> {
    const cacheKey = this.buildKey(agentId, tier, key);
    const raw = await this.cacheManager.get(cacheKey);
    if (raw === null || raw === undefined) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  /**
   * Semantic search over stored memories using vector similarity.
   * Requires Qdrant and an embedding vector for the query.
   */
  async search(
    agentId: string,
    queryEmbedding: number[],
    limit: number = 10,
  ): Promise<any[]> {
    if (!this.qdrantService) {
      this.logger.warn('Qdrant not available — vector search is disabled');
      return [];
    }

    try {
      const results = await this.qdrantService.search(
        QDRANT_COLLECTION,
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
      return results;
    } catch (err) {
      this.logger.warn(
        `Vector search failed for agent ${agentId}: ${(err as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Clear memories. If tier is omitted, clears ALL tiers for the agent.
   */
  async clear(agentId: string, tier?: MemoryTier): Promise<void> {
    const tiers = tier ? [tier] : Object.values(MemoryTier);

    for (const t of tiers) {
      const pattern = `agent:${agentId}:${t}:*`;
      // cache-manager doesn't have a keys() method, so we use the underlying
      // store if available (Redis). Fallback: best-effort.
      try {
        const store = (this.cacheManager as any).store;
        if (store && typeof store.keys === 'function') {
          const keys = await store.keys(pattern);
          for (const k of keys) {
            await this.cacheManager.del(k);
          }
        }
      } catch {
        this.logger.debug(
          `Could not enumerate keys for pattern ${pattern} — store may not support it`,
        );
      }
    }
  }

  // ─── Convenience aliases ─────────────────────────────────────

  /** Short-term key-value store (TTL ≈ 5 min) */
  get workingMemory() {
    return {
      set: (agentId: string, key: string, value: any, ttl?: number) =>
        this.store(agentId, MemoryTier.WORKING, key, value, ttl),
      get: (agentId: string, key: string) =>
        this.retrieve(agentId, MemoryTier.WORKING, key),
    };
  }

  /** Session-scoped storage (TTL ≈ 1 hour) */
  get sessionMemory() {
    return {
      set: (agentId: string, key: string, value: any, ttl?: number) =>
        this.store(agentId, MemoryTier.SESSION, key, value, ttl),
      get: (agentId: string, key: string) =>
        this.retrieve(agentId, MemoryTier.SESSION, key),
    };
  }

  /** Persistent storage (no TTL) */
  get longTermMemory() {
    return {
      set: (agentId: string, key: string, value: any, ttl?: number) =>
        this.store(agentId, MemoryTier.LONG_TERM, key, value, ttl),
      get: (agentId: string, key: string) =>
        this.retrieve(agentId, MemoryTier.LONG_TERM, key),
    };
  }

  /** Semantic search via Qdrant */
  get vectorSearch() {
    return {
      search: (agentId: string, queryEmbedding: number[], limit?: number) =>
        this.search(agentId, queryEmbedding, limit),
    };
  }

  // ─── Private helpers ─────────────────────────────────────────

  private buildKey(agentId: string, tier: MemoryTier, key: string): string {
    return `agent:${agentId}:${tier}:${key}`;
  }

  private async ensureCollection(): Promise<void> {
    if (!this.qdrantService) return;
    const exists = await this.qdrantService.collectionExists(QDRANT_COLLECTION);
    if (!exists) {
      await this.qdrantService.createCollection(QDRANT_COLLECTION, 1536);
      this.logger.log(`Created Qdrant collection: ${QDRANT_COLLECTION}`);
    }
  }
}
