/**
 * AENEWS Agent OS X - Vector Search Service
 * Qdrant-backed vector search for semantic similarity queries.
 * Enables agents to find relevant information by meaning, not just keywords.
 * Graceful fallback to in-memory cosine similarity when Qdrant is not available.
 * Supports collection management, upsert with payloads, filtering, and scoring.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  IVectorSearchService,
  VectorSearchEntry,
  VectorSearchQuery,
  VectorSearchResult,
} from '../interfaces/agent-memory.interface';

// ─── In-Memory Vector Store ───────────────────────────────────────
interface VectorRecord {
  id: string;
  vector: number[];
  payload: Record<string, any>;
  createdAt: Date;
}

@Injectable()
export class VectorSearchService implements IVectorSearchService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VectorSearchService.name);
  private qdrantClient: any = null;
  private readonly defaultCollection = 'agent_memory';
  private readonly collections: Set<string> = new Set();
  private readonly store: Map<string, VectorRecord> = new Map();
  private static readonly VECTOR_DIMENSION = 1536;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeQdrant();
    this.collections.add(this.defaultCollection);
    this.logger.log('Vector Search service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    // Qdrant client doesn't need explicit close
    this.qdrantClient = null;
  }

  /**
   * Initialize Qdrant client (graceful fallback to in-memory if unavailable).
   */
  private async initializeQdrant(): Promise<void> {
    try {
      const { QdrantClient } = await import('@qdrant/js-client-rest');
      const url = this.configService.get<string>('QDRANT_URL', 'http://localhost:6333');
      const apiKey = this.configService.get<string>('QDRANT_API_KEY');

      this.qdrantClient = new QdrantClient({
        url,
        apiKey: apiKey || undefined,
      });

      // Verify connectivity and create default collection if needed
      try {
        const collections = await this.qdrantClient.getCollections();
        const existingNames = new Set(
          (collections.collections || []).map((c: any) => c.name as string),
        );

        if (!existingNames.has(this.defaultCollection)) {
          await this.createCollection(this.defaultCollection);
        }

        // Register existing collections
        for (const c of collections.collections || []) {
          this.collections.add(c.name as string);
        }

        this.logger.log('Connected to Qdrant');
      } catch (error) {
        this.logger.warn(`Qdrant collection init failed: ${(error as Error).message}`);
        this.qdrantClient = null;
      }
    } catch (error) {
      this.logger.warn(
        `Qdrant not available, using in-memory vector search: ${(error as Error).message}`,
      );
      this.qdrantClient = null;
    }
  }

  // ─── Collection Management ─────────────────────────────────────────

  /**
   * Create a new vector collection.
   */
  async createCollection(
    name: string,
    dimension: number = VectorSearchService.VECTOR_DIMENSION,
  ): Promise<boolean> {
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
      } catch (error) {
        this.logger.warn(`Failed to create Qdrant collection ${name}: ${(error as Error).message}`);
        return false;
      }
    }

    this.logger.log(`Created in-memory vector collection: ${name}`);
    return true;
  }

  /**
   * Delete a vector collection.
   */
  async deleteCollection(name: string): Promise<boolean> {
    this.collections.delete(name);

    if (this.qdrantClient) {
      try {
        await this.qdrantClient.deleteCollection(name);
        this.logger.log(`Deleted Qdrant collection: ${name}`);
        return true;
      } catch (error) {
        this.logger.warn(`Failed to delete Qdrant collection ${name}: ${(error as Error).message}`);
        return false;
      }
    }

    // Remove in-memory entries belonging to this collection
    // (we track collection in payload)
    for (const [id, record] of this.store) {
      if (record.payload._collection === name) {
        this.store.delete(id);
      }
    }

    return true;
  }

  /**
   * List all collections.
   */
  listCollections(): string[] {
    return Array.from(this.collections);
  }

  // ─── Core Vector Operations ────────────────────────────────────────

  /**
   * Upsert a vector with payload.
   */
  async upsert(id: string, vector: number[], payload: Record<string, any>): Promise<void> {
    const record: VectorRecord = {
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
      } catch (error) {
        this.logger.warn(`Qdrant upsert failed: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Batch upsert multiple vectors.
   */
  async upsertBatch(entries: Array<{ id: string; vector: number[]; payload: Record<string, any> }>): Promise<void> {
    for (const entry of entries) {
      this.store.set(entry.id, {
        id: entry.id,
        vector: entry.vector,
        payload: { ...entry.payload, _collection: entry.payload._collection || this.defaultCollection },
        createdAt: new Date(),
      });
    }

    if (this.qdrantClient) {
      try {
        // Group by collection
        const byCollection = new Map<string, Array<{ id: string; vector: number[]; payload: Record<string, any> }>>();

        for (const entry of entries) {
          const collection = entry.payload._collection || this.defaultCollection;
          if (!byCollection.has(collection)) {
            byCollection.set(collection, []);
          }
          byCollection.get(collection)!.push(entry);
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
      } catch (error) {
        this.logger.warn(`Qdrant batch upsert failed: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Search for similar vectors.
   */
  async search(query: VectorSearchQuery): Promise<VectorSearchResult> {
    const limit = query.limit || 10;
    const scoreThreshold = query.scoreThreshold || 0.5;

    if (this.qdrantClient) {
      try {
        const collection = (query.filter as any)?._collection || this.defaultCollection;
        const results = await this.qdrantClient.search(collection, {
          vector: query.vector,
          limit,
          score_threshold: scoreThreshold,
          filter: query.filter || undefined,
        });

        const entries: VectorSearchEntry[] = results.map((r: any) => ({
          id: r.id as string,
          vector: query.vector, // Don't return the full stored vector
          payload: r.payload || {},
          score: r.score,
        }));

        return {
          entries,
          total: entries.length,
        };
      } catch (error) {
        this.logger.warn(`Qdrant search failed, using in-memory: ${(error as Error).message}`);
      }
    }

    // Fallback to in-memory cosine similarity search
    return this.inMemorySearch(query.vector, limit, scoreThreshold, query.filter);
  }

  /**
   * Delete a vector by ID.
   */
  async delete(id: string): Promise<boolean> {
    const record = this.store.get(id);
    const existed = this.store.delete(id);

    if (this.qdrantClient && record) {
      try {
        const collection = record.payload._collection || this.defaultCollection;
        await this.qdrantClient.delete(collection, {
          points: [id],
        });
      } catch (error) {
        this.logger.warn(`Qdrant delete failed: ${(error as Error).message}`);
      }
    }

    return existed;
  }

  /**
   * Get a vector entry by ID.
   */
  async get(id: string): Promise<VectorSearchEntry | null> {
    const record = this.store.get(id);
    if (!record) return null;

    return {
      id: record.id,
      vector: record.vector,
      payload: record.payload,
    };
  }

  // ─── Embedding Generation ──────────────────────────────────────────

  /**
   * Generate a simple hash-based embedding vector from text.
   * This is a basic implementation; in production, use an LLM API.
   */
  generateSimpleEmbedding(text: string): number[] {
    const vector = new Array(VectorSearchService.VECTOR_DIMENSION).fill(0);

    // Simple hash-based embedding for basic similarity
    const normalized = text.toLowerCase().trim();
    for (let i = 0; i < normalized.length && i < VectorSearchService.VECTOR_DIMENSION; i++) {
      const charCode = normalized.charCodeAt(i);
      vector[i % VectorSearchService.VECTOR_DIMENSION] += charCode / 65535;
    }

    // Add bigram features for better similarity
    for (let i = 0; i < normalized.length - 1; i++) {
      const bigram = normalized.charCodeAt(i) * 31 + normalized.charCodeAt(i + 1);
      vector[bigram % VectorSearchService.VECTOR_DIMENSION] += 0.5;
    }

    // Normalize the vector
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  // ─── Statistics ────────────────────────────────────────────────────

  getStats(): {
    totalVectors: number;
    vectorDimension: number;
    collections: number;
    connectedToQdrant: boolean;
  } {
    return {
      totalVectors: this.store.size,
      vectorDimension: VectorSearchService.VECTOR_DIMENSION,
      collections: this.collections.size,
      connectedToQdrant: this.qdrantClient !== null,
    };
  }

  // ─── Private Methods ─────────────────────────────────────────────

  /**
   * In-memory cosine similarity search.
   */
  private inMemorySearch(
    queryVector: number[],
    limit: number,
    scoreThreshold: number,
    filter?: Record<string, any>,
  ): VectorSearchResult {
    const results: Array<VectorSearchEntry & { score: number }> = [];

    for (const [, record] of this.store) {
      // Apply filter if specified
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

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return {
      entries: results.slice(0, limit),
      total: results.length,
    };
  }

  /**
   * Calculate cosine similarity between two vectors.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

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

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  /**
   * Check if a payload matches a filter.
   */
  private matchesFilter(payload: Record<string, any>, filter: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (key === '_collection') continue; // Skip internal fields
      if (payload[key] !== value) {
        return false;
      }
    }
    return true;
  }
}
