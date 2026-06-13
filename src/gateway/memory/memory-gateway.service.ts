/**
 * AENEWS Agent OS X - Unified Memory Gateway
 *
 * Single entry point for ALL memory operations. Agents never access
 * individual memory services directly. They call:
 *
 *   memory.store()       → automatically selects tier
 *   memory.retrieve()    → cross-tier retrieval with fallback
 *   memory.search()      → vector + keyword hybrid search
 *   memory.summarize()   → condense entries for a key/topic
 *   memory.promote()     → move data up from working → session → long-term
 *   memory.archive()     → move data to cold storage / archive tier
 *
 * The agent does not know WHERE data is stored. The Gateway decides.
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  MemoryEntry,
  MemoryTier,
  MemoryStoreOptions,
  MemoryQuery,
  MemoryQueryResult,
  MemoryStats,
  MemoryEncoding,
  KnowledgeNode,
  IMemoryService,
} from '../../agents/interfaces/agent-memory.interface';

// ─── Gateway-Specific Types ────────────────────────────────────────

export const MEMORY_TIERS = [
  'working',
  'session',
  'conversation',
  'long_term',
  'semantic',
  'knowledge_graph',
  'vector',
  'archive',
] as const;

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

@Injectable()
export class MemoryGatewayService implements IMemoryService {
  private readonly logger = new Logger(MemoryGatewayService.name);

  private readonly workingStore = new Map<string, Map<string, any>>();
  private readonly sessionStore = new Map<string, Map<string, Map<string, any>>>();
  private readonly conversationStore = new Map<string, Array<any>>();
  private readonly longTermStore = new Map<string, Map<string, any>>();
  private readonly semanticStore = new Map<string, Map<string, any>>();
  private readonly archiveStore = new Map<string, Map<string, any>>();
  private readonly vectorIndex = new Map<string, { vector: number[]; payload: any }>();
  private readonly kgNodes = new Map<string, KnowledgeNode>();

  constructor() {}

  // ═══════════════════════════════════════════════════════════════════
  //  UNIFIED API — The 6 methods every agent uses
  // ═══════════════════════════════════════════════════════════════════

  async store<T>(
    agentId: string,
    key: string,
    value: T,
    tier?: MemoryTier | MemoryGatewayTier,
    options?: MemoryGatewayStoreOptions,
  ): Promise<MemoryEntry<T>> {
    const tierStr = (tier as string) || this.selectTier(agentId, key, value, options);
    const memoryTier = this.toMemoryTier(tierStr);
    const entry = this.createEntry(agentId, key, value, memoryTier, options);

    switch (tierStr) {
      case 'working':
        this.storeInMap(this.workingStore, agentId, key, entry);
        break;
      case 'session':
        this.storeInSessionMap(options?.sessionId || 'default', agentId, key, entry);
        break;
      case 'conversation':
        this.storeInConversation(options?.sessionId || 'default', entry);
        break;
      case 'long_term':
        this.storeInMap(this.longTermStore, agentId, key, entry);
        break;
      case 'semantic':
        this.storeInMap(this.semanticStore, agentId, key, entry);
        break;
      case 'knowledge_graph':
        this.kgNodes.set(entry.id, {
          id: entry.id,
          label: key,
          properties: { agentId, value },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        break;
      case 'vector':
        const vector = this.generateEmbedding(
          typeof value === 'string' ? value : JSON.stringify(value),
        );
        this.vectorIndex.set(entry.id, { vector, payload: { agentId, key, value, tier: tierStr } });
        break;
      case 'archive':
        this.storeInMap(this.archiveStore, agentId, key, entry);
        break;
      default:
        this.storeInMap(this.workingStore, agentId, key, entry);
    }

    this.logger.debug?.(`Stored ${key} in ${tierStr} for agent ${agentId}`);
    return entry;
  }

  async retrieve<T>(
    agentId: string,
    key: string,
    tier?: MemoryTier | MemoryGatewayTier,
  ): Promise<MemoryEntry<T> | null> {
    if (tier) {
      return this.retrieveFromTier<T>(agentId, key, tier as string);
    }

    const searchOrder: string[] = ['working', 'session', 'conversation', 'long_term', 'semantic'];

    for (const searchTier of searchOrder) {
      const entry = await this.retrieveFromTier<T>(agentId, key, searchTier);
      if (entry) {
        entry.metadata.accessCount++;
        entry.metadata.lastAccessedAt = new Date();
        return entry;
      }
    }

    return null;
  }

  async search(
    query: string,
    agentId?: string,
    limit: number = 10,
  ): Promise<CrossTierSearchResult> {
    const queryVector = this.generateEmbedding(query);
    const results: MemoryEntry[] = [];
    let totalSearched = 0;

    const vectorResults = this.searchVectorIndex(queryVector, limit * 2);
    totalSearched += this.vectorIndex.size;

    for (const vr of vectorResults) {
      if (agentId && vr.payload?.agentId !== agentId) continue;
      results.push({
        id: vr.id,
        key: vr.payload?.key || 'unknown',
        value: vr.payload?.value,
        tier: this.toMemoryTier(vr.payload?.tier || 'vector'),
        agentId: vr.payload?.agentId || agentId || 'unknown',
        metadata: {
          source: 'vector_search',
          confidence: vr.score || 0,
          tags: [],
          accessCount: 0,
          lastAccessedAt: new Date(),
          size: 0,
          encoding: MemoryEncoding.JSON,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const keywordResults = this.keywordSearch(query, agentId, limit);
    totalSearched += keywordResults.length;
    results.push(...keywordResults);

    const deduped = this.deduplicateResults(results).slice(0, limit);
    const fusedScore =
      deduped.length > 0
        ? deduped.reduce((sum, r) => sum + r.metadata.confidence, 0) / deduped.length
        : 0;

    return {
      entries: deduped,
      fusedScore,
      sourceTiers: [...new Set(deduped.map((r) => r.tier as string))],
      totalSearched,
    };
  }

  async summarize(agentId: string, key: string | string[]): Promise<MemorySummarizationResult> {
    const keys = Array.isArray(key) ? key : [key];
    const allEntries: MemoryEntry[] = [];

    for (const k of keys) {
      const entry = await this.retrieve(agentId, k);
      if (entry) allEntries.push(entry);
    }

    if (allEntries.length === 0) {
      const emptyEntry = this.createEntry(
        agentId,
        'summary:empty',
        { summary: 'No data found', keyPoints: [] },
        MemoryTier.WORKING,
      );
      return {
        originalCount: 0,
        summary: 'No data found',
        keyPoints: [],
        compressedEntry: emptyEntry,
      };
    }

    const values = allEntries.map((e) => {
      try {
        return typeof e.value === 'string' ? e.value : JSON.stringify(e.value);
      } catch {
        return '[non-serializable]';
      }
    });

    const summaryText = `Summary of ${allEntries.length} entries for [${keys.join(', ')}]: ${values.slice(0, 10).join('; ')}`;
    const keyPoints = values.slice(0, 5).map((v, i) => `Point ${i + 1}: ${v.substring(0, 200)}`);

    const compressedEntry = this.createEntry(
      agentId,
      `summary:${keys.join(':')}`,
      { summary: summaryText, keyPoints, entryCount: allEntries.length },
      MemoryTier.LONG_TERM,
    );
    this.storeInMap(this.longTermStore, agentId, `summary:${keys.join(':')}`, compressedEntry);

    return { originalCount: allEntries.length, summary: summaryText, keyPoints, compressedEntry };
  }

  async promote(
    agentId: string,
    key: string,
    from: string,
    to: string,
  ): Promise<MemoryPromotionResult> {
    const entry = await this.retrieveFromTier(agentId, key, from);
    if (!entry) return { from, to, key, success: false };

    await this.store(agentId, key, entry.value, to as MemoryGatewayTier, {
      tags: entry.metadata.tags,
      confidence: entry.metadata.confidence,
    });
    await this.deleteFromTier(agentId, key, from);

    this.logger.log(`Promoted ${key} from ${from} to ${to} for agent ${agentId}`);
    return { from, to, key, success: true };
  }

  async archive(agentId: string, key: string, sourceTier?: string): Promise<boolean> {
    const tier = sourceTier || 'long_term';
    const entry = await this.retrieveFromTier(agentId, key, tier);
    if (!entry) return false;

    await this.store(agentId, `archived:${key}`, entry.value, 'archive' as MemoryGatewayTier, {
      tags: [...(entry.metadata.tags || []), 'archived'],
      confidence: entry.metadata.confidence,
    });
    await this.deleteFromTier(agentId, key, tier);

    this.logger.log(`Archived ${key} from ${tier} for agent ${agentId}`);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CROSS-TIER RETRIEVAL ENGINE
  // ═══════════════════════════════════════════════════════════════════

  async crossTierRetrieve(
    agentId: string,
    query: string,
    options?: { maxTiers?: number; minConfidence?: number; includeVectorSearch?: boolean },
  ): Promise<CrossTierSearchResult> {
    const maxTiers = options?.maxTiers || 6;
    const minConfidence = options?.minConfidence || 0.1;
    const includeVector = options?.includeVectorSearch !== false;

    const results: MemoryEntry[] = [];
    const searchedTiers: string[] = [];
    let totalSearched = 0;

    // Tier 1: Working
    const workingData = this.workingStore.get(agentId);
    if (workingData && searchedTiers.length < maxTiers) {
      for (const [, entry] of workingData) {
        if (this.matchesQuery(entry, query)) results.push(entry);
      }
      searchedTiers.push('working');
      totalSearched += workingData.size;
    }

    // Tier 2: Session
    if (searchedTiers.length < maxTiers) {
      for (const [, agentMap] of this.sessionStore) {
        const sessionData = agentMap.get(agentId);
        if (sessionData) {
          for (const [, entry] of sessionData) {
            if (this.matchesQuery(entry, query)) results.push(entry);
          }
          totalSearched += sessionData.size;
        }
      }
      searchedTiers.push('session');
    }

    // Tier 3: Long-term
    const ltData = this.longTermStore.get(agentId);
    if (ltData && searchedTiers.length < maxTiers) {
      for (const [, entry] of ltData) {
        if (this.matchesQuery(entry, query)) results.push(entry);
      }
      searchedTiers.push('long_term');
      totalSearched += ltData.size;
    }

    // Tier 4: Knowledge Graph
    if (searchedTiers.length < maxTiers) {
      for (const [, node] of this.kgNodes) {
        if (node.properties?.agentId === agentId && this.nodeMatchesQuery(node, query)) {
          results.push({
            id: node.id,
            key: node.label,
            value: node.properties?.value,
            tier: MemoryTier.KNOWLEDGE_GRAPH,
            agentId,
            metadata: {
              source: 'knowledge_graph',
              confidence: 0.8,
              tags: [],
              accessCount: 0,
              lastAccessedAt: new Date(),
              size: 0,
              encoding: MemoryEncoding.JSON,
            },
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
          });
        }
      }
      searchedTiers.push('knowledge_graph');
      totalSearched += this.kgNodes.size;
    }

    // Tier 5: Vector search
    if (includeVector && searchedTiers.length < maxTiers) {
      const vectorQuery = this.generateEmbedding(query);
      const vectorResults = this.searchVectorIndex(vectorQuery, 10);
      for (const vr of vectorResults) {
        if (vr.score && vr.score >= minConfidence) {
          results.push({
            id: vr.id,
            key: vr.payload?.key || 'vector',
            value: vr.payload?.value,
            tier: MemoryTier.VECTOR,
            agentId: vr.payload?.agentId || agentId,
            metadata: {
              source: 'vector_search',
              confidence: vr.score,
              tags: [],
              accessCount: 0,
              lastAccessedAt: new Date(),
              size: 0,
              encoding: MemoryEncoding.EMBEDDING,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
      searchedTiers.push('vector');
      totalSearched += this.vectorIndex.size;
    }

    const fused = this.deduplicateResults(results).sort(
      (a, b) => b.metadata.confidence - a.metadata.confidence,
    );
    const fusedScore =
      fused.length > 0
        ? fused.reduce((sum, r) => sum + r.metadata.confidence, 0) / fused.length
        : 0;

    return { entries: fused, fusedScore, sourceTiers: searchedTiers, totalSearched };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  IMemoryService Compatibility
  // ═══════════════════════════════════════════════════════════════════

  async query<T>(query: MemoryQuery): Promise<MemoryQueryResult<T>> {
    const results: MemoryEntry<T>[] = [];
    const agentId = query.agentId || 'system';

    const workingData = this.workingStore.get(agentId);
    if (workingData) {
      for (const [key, entry] of workingData) {
        if (query.keyPrefix && !key.startsWith(query.keyPrefix)) continue;
        results.push(entry as MemoryEntry<T>);
      }
    }

    const ltData = this.longTermStore.get(agentId);
    if (ltData) {
      for (const [key, entry] of ltData) {
        if (query.keyPrefix && !key.startsWith(query.keyPrefix)) continue;
        results.push(entry as MemoryEntry<T>);
      }
    }

    const total = results.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    return {
      entries: results.slice(offset, offset + limit),
      total,
      hasMore: offset + limit < total,
    };
  }

  async delete(
    agentId: string,
    key: string,
    tier?: MemoryTier | MemoryGatewayTier,
  ): Promise<boolean> {
    const tiers = tier ? [tier as string] : ['working', 'session', 'long_term'];
    let deleted = false;
    for (const t of tiers) {
      if (this.deleteFromTier(agentId, key, t)) deleted = true;
    }
    return deleted;
  }

  async clear(agentId: string, tier?: MemoryTier | MemoryGatewayTier): Promise<number> {
    let count = 0;
    const stores = !tier
      ? [this.workingStore, this.longTermStore, this.semanticStore, this.archiveStore]
      : [this.getStoreForTier(tier as string)].filter(Boolean);

    for (const store of stores) {
      const data = store?.get(agentId);
      if (data) {
        count += data.size;
        data.clear();
      }
    }
    return count;
  }

  async getStats(agentId: string): Promise<MemoryStats> {
    const working = this.workingStore.get(agentId);
    const longTerm = this.longTermStore.get(agentId);

    return {
      agentId,
      tierStats: {
        [MemoryTier.WORKING]: {
          entryCount: working?.size || 0,
          totalSizeBytes: (working?.size || 0) * 1024,
        },
        [MemoryTier.SESSION]: { entryCount: 0, totalSizeBytes: 0 },
        [MemoryTier.LONG_TERM]: {
          entryCount: longTerm?.size || 0,
          totalSizeBytes: (longTerm?.size || 0) * 2048,
        },
        [MemoryTier.KNOWLEDGE_GRAPH]: {
          entryCount: this.kgNodes.size,
          totalSizeBytes: this.kgNodes.size * 4096,
        },
        [MemoryTier.VECTOR]: {
          entryCount: this.vectorIndex.size,
          totalSizeBytes: this.vectorIndex.size * 4096,
        },
      },
      totalEntries: (working?.size || 0) + (longTerm?.size || 0),
      totalSizeBytes: (working?.size || 0) * 1024 + (longTerm?.size || 0) * 2048,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════

  private toMemoryTier(tierStr: string): MemoryTier {
    const mapping: Record<string, MemoryTier> = {
      working: MemoryTier.WORKING,
      session: MemoryTier.SESSION,
      long_term: MemoryTier.LONG_TERM,
      knowledge_graph: MemoryTier.KNOWLEDGE_GRAPH,
      vector: MemoryTier.VECTOR,
    };
    return mapping[tierStr] || MemoryTier.WORKING;
  }

  private selectTier<T>(
    agentId: string,
    key: string,
    value: T,
    options?: MemoryGatewayStoreOptions,
  ): string {
    if (options?.ttlMs && options.ttlMs <= 5 * 60 * 1000) return 'working';
    if (options?.sessionId) return 'session';
    if (options?.importance && options.importance >= 0.8) return 'semantic';
    if (key.startsWith('relation:') || key.startsWith('edge:')) return 'knowledge_graph';
    if (typeof value === 'string' && value.length > 200) return 'vector';
    const size = this.estimateSize(value);
    if (size < 1024) return 'working';
    return 'long_term';
  }

  private createEntry<T>(
    agentId: string,
    key: string,
    value: T,
    tier: MemoryTier,
    options?: MemoryGatewayStoreOptions,
  ): MemoryEntry<T> {
    const now = new Date();
    return {
      id: uuidv4(),
      key,
      value,
      tier,
      agentId,
      sessionId: options?.sessionId,
      correlationId: options?.correlationId,
      metadata: {
        source: `memory_gateway:${tier}`,
        confidence: options?.confidence ?? 1.0,
        tags: options?.tags || [],
        accessCount: 0,
        lastAccessedAt: now,
        size: this.estimateSize(value),
        encoding: options?.encoding || MemoryEncoding.JSON,
      },
      createdAt: now,
      updatedAt: now,
      expiresAt: options?.ttlMs ? new Date(now.getTime() + options.ttlMs) : undefined,
    };
  }

  private storeInMap(
    store: Map<string, Map<string, any>>,
    agentId: string,
    key: string,
    entry: any,
  ): void {
    if (!store.has(agentId)) store.set(agentId, new Map());
    store.get(agentId)!.set(key, entry);
  }

  private storeInSessionMap(sessionId: string, agentId: string, key: string, entry: any): void {
    if (!this.sessionStore.has(sessionId)) this.sessionStore.set(sessionId, new Map());
    if (!this.sessionStore.get(sessionId)!.has(agentId))
      this.sessionStore.get(sessionId)!.set(agentId, new Map());
    this.sessionStore.get(sessionId)!.get(agentId)!.set(key, entry);
  }

  private storeInConversation(conversationId: string, entry: any): void {
    if (!this.conversationStore.has(conversationId)) this.conversationStore.set(conversationId, []);
    this.conversationStore.get(conversationId)!.push(entry);
  }

  private async retrieveFromTier<T>(
    agentId: string,
    key: string,
    tier: string,
  ): Promise<MemoryEntry<T> | null> {
    switch (tier) {
      case 'working':
        return this.workingStore.get(agentId)?.get(key) || null;
      case 'long_term':
        return this.longTermStore.get(agentId)?.get(key) || null;
      case 'semantic':
        return this.semanticStore.get(agentId)?.get(key) || null;
      case 'archive':
        return this.archiveStore.get(agentId)?.get(key) || null;
      case 'session':
        for (const [, agentMap] of this.sessionStore) {
          const data = agentMap.get(agentId);
          if (data?.has(key)) return data.get(key);
        }
        return null;
      default:
        return null;
    }
  }

  private deleteFromTier(agentId: string, key: string, tier: string): boolean {
    switch (tier) {
      case 'working':
        return this.workingStore.get(agentId)?.delete(key) || false;
      case 'long_term':
        return this.longTermStore.get(agentId)?.delete(key) || false;
      case 'semantic':
        return this.semanticStore.get(agentId)?.delete(key) || false;
      case 'archive':
        return this.archiveStore.get(agentId)?.delete(key) || false;
      case 'session':
        for (const [, agentMap] of this.sessionStore) {
          if (agentMap.get(agentId)?.delete(key)) return true;
        }
        return false;
      default:
        return false;
    }
  }

  private getStoreForTier(tier: string): Map<string, Map<string, any>> | null {
    switch (tier) {
      case 'working':
        return this.workingStore;
      case 'long_term':
        return this.longTermStore;
      case 'semantic':
        return this.semanticStore;
      case 'archive':
        return this.archiveStore;
      default:
        return null;
    }
  }

  private generateEmbedding(text: string): number[] {
    const vector: number[] = [];
    const dim = 128;
    for (let i = 0; i < dim; i++) {
      let hash = 0;
      for (let j = 0; j < text.length; j++) {
        hash = ((hash << 5) - hash + text.charCodeAt(j) + i) | 0;
      }
      vector.push((Math.abs(hash) % 1000) / 1000);
    }
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map((v) => v / magnitude);
  }

  private searchVectorIndex(
    queryVector: number[],
    limit: number,
  ): Array<{ id: string; score: number; payload: any }> {
    const results: Array<{ id: string; score: number; payload: any }> = [];
    for (const [id, { vector, payload }] of this.vectorIndex) {
      results.push({ id, score: this.cosineSimilarity(queryVector, vector), payload });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0,
      normA = 0,
      normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }

  private keywordSearch(query: string, agentId?: string, limit?: number): MemoryEntry[] {
    const results: MemoryEntry[] = [];
    const queryLower = query.toLowerCase();
    const maxResults = limit || 10;

    const ltData = agentId ? this.longTermStore.get(agentId) : undefined;
    if (ltData) {
      for (const [, entry] of ltData) {
        const valueStr =
          typeof entry.value === 'string'
            ? entry.value.toLowerCase()
            : JSON.stringify(entry.value).toLowerCase();
        if (entry.key?.toLowerCase().includes(queryLower) || valueStr.includes(queryLower)) {
          results.push(entry);
          if (results.length >= maxResults) return results;
        }
      }
    }
    return results;
  }

  private matchesQuery(entry: any, query: string): boolean {
    const queryLower = query.toLowerCase();
    try {
      const valueStr = typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value);
      return (
        entry.key?.toLowerCase().includes(queryLower) || valueStr.toLowerCase().includes(queryLower)
      );
    } catch {
      return false;
    }
  }

  private nodeMatchesQuery(node: KnowledgeNode, query: string): boolean {
    const queryLower = query.toLowerCase();
    return (
      node.label.toLowerCase().includes(queryLower) ||
      JSON.stringify(node.properties).toLowerCase().includes(queryLower)
    );
  }

  private deduplicateResults(results: MemoryEntry[]): MemoryEntry[] {
    const seen = new Set<string>();
    return results.filter((r) => {
      const key = `${r.agentId}:${r.key}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024;
    }
  }
}
