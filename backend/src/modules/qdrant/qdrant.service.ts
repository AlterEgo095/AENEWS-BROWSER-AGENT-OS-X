import { Injectable, Inject, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService {
  private readonly logger = new Logger(QdrantService.name);

  constructor(@Inject('QDRANT_CLIENT') private readonly client: QdrantClient) {}

  async createCollection(name: string, vectorSize: number = 1536): Promise<void> {
    const exists = await this.collectionExists(name);
    if (!exists) {
      await this.client.createCollection(name, {
        vectors: { size: vectorSize, distance: 'Cosine' },
      });
      this.logger.log(`Created Qdrant collection: ${name}`);
    }
  }

  async collectionExists(name: string): Promise<boolean> {
    try {
      const collections = await this.client.getCollections();
      return collections.collections.some((c) => c.name === name);
    } catch {
      return false;
    }
  }

  async upsert(
    collectionName: string,
    points: Array<{
      id: string;
      vector: number[];
      payload?: Record<string, any>;
    }>,
  ): Promise<void> {
    await this.client.upsert(collectionName, {
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload || {},
      })),
    });
  }

  async search(
    collectionName: string,
    vector: number[],
    limit: number = 10,
    filter?: Record<string, any>,
  ): Promise<any[]> {
    const results = await this.client.search(collectionName, {
      vector,
      limit,
      filter: filter || undefined,
    });
    return results;
  }

  async deletePoints(collectionName: string, ids: string[]): Promise<void> {
    await this.client.delete(collectionName, {
      points: ids,
    });
  }

  async getCollectionInfo(collectionName: string): Promise<any> {
    return this.client.getCollection(collectionName);
  }
}
