import { Injectable, Inject, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface VectorPoint {
  id: string;
  vector: number[];
  payload?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, any>;
}

@Injectable()
export class QdrantService {
  private readonly logger = new Logger(QdrantService.name);

  constructor(@Inject('QDRANT_CLIENT') private readonly client: QdrantClient) {}

  /**
   * Create a new collection with the specified vector configuration.
   * If the collection already exists, this is a no-op.
   */
  async createCollection(name: string, vectorSize: number = 1536): Promise<void> {
    const exists = await this.collectionExists(name);
    if (!exists) {
      await this.client.createCollection(name, {
        vectors: { size: vectorSize, distance: 'Cosine' },
      });
      this.logger.log(`Created Qdrant collection: ${name}`);
    }
  }

  /**
   * Check if a collection exists.
   */
  async collectionExists(name: string): Promise<boolean> {
    try {
      const collections = await this.client.getCollections();
      return collections.collections.some((c) => c.name === name);
    } catch {
      return false;
    }
  }

  /**
   * Delete a collection and all its data.
   */
  async deleteCollection(name: string): Promise<void> {
    const exists = await this.collectionExists(name);
    if (exists) {
      await this.client.deleteCollection(name);
      this.logger.log(`Deleted Qdrant collection: ${name}`);
    }
  }

  /**
   * Upsert vector points into a collection.
   * Creates the collection if it doesn't exist.
   */
  async upsert(
    collectionName: string,
    points: VectorPoint[],
  ): Promise<void> {
    // Ensure collection exists before upserting
    const exists = await this.collectionExists(collectionName);
    if (!exists) {
      // Infer vector size from the first point
      const vectorSize = points[0]?.vector?.length || 1536;
      await this.createCollection(collectionName, vectorSize);
    }

    await this.client.upsert(collectionName, {
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload || {},
      })),
    });
  }

  /**
   * Search for similar vectors in a collection.
   */
  async search(
    collectionName: string,
    vector: number[],
    limit: number = 10,
    filter?: Record<string, any>,
  ): Promise<SearchResult[]> {
    try {
      const results = await this.client.search(collectionName, {
        vector,
        limit,
        filter: filter || undefined,
      });
      return results.map((r: any) => ({
        id: r.id,
        score: r.score,
        payload: r.payload || {},
      }));
    } catch (error: any) {
      this.logger.warn(`Search failed in collection "${collectionName}": ${error.message}`);
      return [];
    }
  }

  /**
   * Delete specific points from a collection by their IDs.
   */
  async deletePoints(collectionName: string, ids: string[]): Promise<void> {
    await this.client.delete(collectionName, {
      points: ids,
    });
  }

  /**
   * Get information about a collection (vector count, status, etc.).
   */
  async getCollectionInfo(collectionName: string): Promise<any> {
    return this.client.getCollection(collectionName);
  }

  /**
   * List all collections.
   */
  async listCollections(): Promise<string[]> {
    const collections = await this.client.getCollections();
    return collections.collections.map((c) => c.name);
  }

  /**
   * Scroll through all points in a collection with optional filtering.
   * Useful for batch operations and debugging.
   */
  async scrollPoints(
    collectionName: string,
    limit: number = 100,
    filter?: Record<string, any>,
  ): Promise<{ points: VectorPoint[]; nextOffset: string | null }> {
    try {
      const result = await this.client.scroll(collectionName, {
        limit,
        filter: filter || undefined,
        with_payload: true,
        with_vector: false,
      });

      return {
        points: (result.points || []).map((p: any) => ({
          id: p.id,
          vector: p.vector || [],
          payload: p.payload || {},
        })),
        nextOffset: result.next_page_offset as string | null || null,
      };
    } catch (error: any) {
      this.logger.warn(`Scroll failed in collection "${collectionName}": ${error.message}`);
      return { points: [], nextOffset: null };
    }
  }

  /**
   * Count points in a collection, optionally with a filter.
   */
  async countPoints(
    collectionName: string,
    filter?: Record<string, any>,
  ): Promise<number> {
    try {
      const result = await this.client.count(collectionName, {
        filter: filter || undefined,
        exact: false,
      });
      return result.count;
    } catch {
      return 0;
    }
  }
}
