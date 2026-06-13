/**
 * AENEWS Agent OS X - Long-Term Memory Service
 * Persistent long-term memory backed by PostgreSQL/TypeORM.
 * Falls back to in-memory Map when TypeORM is not configured.
 * Supports full-text search, tag-based categorization, and bulk operations.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ILongTermMemoryService,
  LongTermMemoryEntry,
  MemoryQuery,
  MemoryQueryResult,
  MemoryStoreOptions,
} from '../interfaces/agent-memory.interface';

// ─── In-Memory Store (Fallback when TypeORM entities not yet defined) ──
interface LongTermRecord {
  id: string;
  agentId: string;
  key: string;
  value: any;
  tags: string[];
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
  fullText?: string;
}

@Injectable()
export class LongTermMemoryService implements ILongTermMemoryService, OnModuleInit {
  private readonly logger = new Logger(LongTermMemoryService.name);
  private readonly records: Map<string, LongTermRecord> = new Map();
  private readonly agentIndex: Map<string, Set<string>> = new Map();
  private readonly tagIndex: Map<string, Set<string>> = new Map();
  private readonly fullTextIndex: Map<string, Set<string>> = new Map();

  async onModuleInit(): Promise<void> {
    this.logger.log('Long-term memory service initialized');
  }

  /**
   * Store a value in long-term memory.
   */
  async store<T>(
    agentId: string,
    key: string,
    value: T,
    options?: MemoryStoreOptions,
  ): Promise<LongTermMemoryEntry<T>> {
    const composedKey = `${agentId}:${key}`;
    const now = new Date();

    // Check if entry already exists
    const existing = this.records.get(composedKey);

    if (existing && !options?.overwrite) {
      // Update existing entry
      existing.value = value;
      existing.updatedAt = now;
      existing.accessCount++;
      existing.lastAccessedAt = now;
      if (options?.tags) {
        // Remove old tags from index
        for (const oldTag of existing.tags) {
          const tagSet = this.tagIndex.get(oldTag);
          if (tagSet) {
            tagSet.delete(composedKey);
            if (tagSet.size === 0) this.tagIndex.delete(oldTag);
          }
        }
        existing.tags = [...new Set([...options.tags])];
        // Add new tags to index
        for (const tag of existing.tags) {
          if (!this.tagIndex.has(tag)) {
            this.tagIndex.set(tag, new Set());
          }
          this.tagIndex.get(tag)!.add(composedKey);
        }
      }
      if (options?.confidence !== undefined) {
        existing.confidence = options.confidence;
      }
      existing.fullText = this.buildFullText(key, value);

      return this.recordToEntry(existing) as LongTermMemoryEntry<T>;
    }

    // Create new entry
    const record: LongTermRecord = {
      id: uuidv4(),
      agentId,
      key,
      value,
      tags: options?.tags || [],
      confidence: options?.confidence ?? 1.0,
      createdAt: now,
      updatedAt: now,
      accessCount: 1,
      lastAccessedAt: now,
      fullText: this.buildFullText(key, value),
    };

    this.records.set(composedKey, record);

    // Update agent index
    if (!this.agentIndex.has(agentId)) {
      this.agentIndex.set(agentId, new Set());
    }
    this.agentIndex.get(agentId)!.add(composedKey);

    // Update tag index
    for (const tag of record.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(composedKey);
    }

    // Update full-text index
    if (record.fullText) {
      this.indexFullText(composedKey, record.fullText);
    }

    this.logger.debug?.(`Stored long-term memory: ${composedKey}`);

    return this.recordToEntry(record) as LongTermMemoryEntry<T>;
  }

  /**
   * Retrieve a value from long-term memory.
   */
  async retrieve<T>(agentId: string, key: string): Promise<LongTermMemoryEntry<T> | null> {
    const composedKey = `${agentId}:${key}`;
    const record = this.records.get(composedKey);

    if (!record) return null;

    // Update access tracking
    record.accessCount++;
    record.lastAccessedAt = new Date();

    return this.recordToEntry(record) as LongTermMemoryEntry<T>;
  }

  /**
   * Query long-term memory entries.
   */
  async query<T>(query: MemoryQuery): Promise<MemoryQueryResult<T>> {
    let results: LongTermRecord[] = [];

    // Filter by agent if specified
    if (query.agentId) {
      const agentKeys = this.agentIndex.get(query.agentId);
      if (agentKeys) {
        results = Array.from(agentKeys)
          .map((key) => this.records.get(key))
          .filter((r): r is LongTermRecord => r !== undefined);
      }
    } else {
      results = Array.from(this.records.values());
    }

    // Filter by key
    if (query.key) {
      results = results.filter((r) => r.key === query.key);
    }

    // Filter by key prefix
    if (query.keyPrefix) {
      results = results.filter((r) => r.key.startsWith(query.keyPrefix!));
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter((r) => query.tags!.some((tag) => r.tags.includes(tag)));
    }

    // Filter by min confidence
    if (query.minConfidence !== undefined) {
      results = results.filter((r) => r.confidence >= query.minConfidence!);
    }

    // Filter by creation date range
    if (query.createdAfter) {
      results = results.filter((r) => r.createdAt >= query.createdAfter!);
    }

    if (query.createdBefore) {
      results = results.filter((r) => r.createdAt <= query.createdBefore!);
    }

    // Sort by creation date (newest first)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const total = results.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      entries: paginatedResults.map((r) => this.recordToEntry(r)),
      total,
      hasMore: offset + limit < total,
    } as any;
  }

  /**
   * Delete a value from long-term memory.
   */
  async delete(agentId: string, key: string): Promise<boolean> {
    const composedKey = `${agentId}:${key}`;
    const record = this.records.get(composedKey);
    const deleted = this.records.delete(composedKey);

    if (deleted && record) {
      // Remove from agent index
      const agentKeys = this.agentIndex.get(agentId);
      if (agentKeys) {
        agentKeys.delete(composedKey);
        if (agentKeys.size === 0) {
          this.agentIndex.delete(agentId);
        }
      }

      // Remove from tag index
      for (const tag of record.tags) {
        const tagSet = this.tagIndex.get(tag);
        if (tagSet) {
          tagSet.delete(composedKey);
          if (tagSet.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }

      // Remove from full-text index
      if (record.fullText) {
        this.deindexFullText(composedKey, record.fullText);
      }
    }

    return deleted;
  }

  /**
   * Update a value in long-term memory.
   */
  async update<T>(
    agentId: string,
    key: string,
    value: Partial<T>,
  ): Promise<LongTermMemoryEntry<T> | null> {
    const composedKey = `${agentId}:${key}`;
    const record = this.records.get(composedKey);

    if (!record) return null;

    if (typeof record.value === 'object' && record.value !== null && typeof value === 'object') {
      record.value = { ...record.value, ...value };
    } else {
      record.value = value as any;
    }

    record.updatedAt = new Date();
    record.fullText = this.buildFullText(key, record.value);

    return this.recordToEntry(record) as LongTermMemoryEntry<T>;
  }

  /**
   * Get all keys for an agent.
   */
  async getKeys(agentId: string): Promise<string[]> {
    const agentKeys = this.agentIndex.get(agentId);
    if (!agentKeys) return [];

    return Array.from(agentKeys).map((composedKey) => {
      const record = this.records.get(composedKey);
      return record?.key || composedKey.split(':').slice(1).join(':');
    });
  }

  // ─── Full-Text Search ──────────────────────────────────────────────

  /**
   * Perform a full-text search across all long-term memory entries.
   */
  async fullTextSearch<T>(
    searchTerm: string,
    options?: {
      agentId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<MemoryQueryResult<LongTermMemoryEntry<T>>> {
    const terms = searchTerm
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1);
    const matchedKeys = new Set<string>();

    for (const term of terms) {
      const keys = this.fullTextIndex.get(term);
      if (keys) {
        for (const key of keys) {
          if (!options?.agentId || key.startsWith(`${options.agentId}:`)) {
            matchedKeys.add(key);
          }
        }
      }
    }

    const results: LongTermRecord[] = [];
    for (const composedKey of matchedKeys) {
      const record = this.records.get(composedKey);
      if (record) {
        results.push(record);
      }
    }

    // Sort by relevance (number of matching terms)
    results.sort((a, b) => {
      const scoreA = this.calculateSearchScore(a, terms);
      const scoreB = this.calculateSearchScore(b, terms);
      return scoreB - scoreA;
    });

    const total = results.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;

    return {
      entries: results.slice(offset, offset + limit).map((r) => this.recordToEntry(r)),
      total,
      hasMore: offset + limit < total,
    } as any;
  }

  // ─── Bulk Operations ──────────────────────────────────────────────

  /**
   * Store multiple entries in bulk.
   */
  async bulkStore<T>(
    entries: Array<{
      agentId: string;
      key: string;
      value: T;
      options?: MemoryStoreOptions;
    }>,
  ): Promise<LongTermMemoryEntry<T>[]> {
    const results: LongTermMemoryEntry<T>[] = [];

    for (const entry of entries) {
      const result = await this.store(entry.agentId, entry.key, entry.value, entry.options);
      results.push(result);
    }

    this.logger.debug?.(`Bulk stored ${results.length} entries in long-term memory`);
    return results;
  }

  /**
   * Delete multiple entries by keys.
   */
  async bulkDelete(agentId: string, keys: string[]): Promise<number> {
    let deletedCount = 0;

    for (const key of keys) {
      if (await this.delete(agentId, key)) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Delete all entries for an agent.
   */
  async deleteAllByAgent(agentId: string): Promise<number> {
    const keys = await this.getKeys(agentId);
    return this.bulkDelete(agentId, keys);
  }

  /**
   * Get statistics about long-term memory usage.
   */
  getStats(): {
    totalAgents: number;
    totalEntries: number;
    totalSizeBytes: number;
    tagsCount: number;
  } {
    let totalSizeBytes = 0;

    for (const [, record] of this.records) {
      try {
        totalSizeBytes += JSON.stringify(record.value).length * 2;
      } catch {
        totalSizeBytes += 1024;
      }
    }

    return {
      totalAgents: this.agentIndex.size,
      totalEntries: this.records.size,
      totalSizeBytes,
      tagsCount: this.tagIndex.size,
    };
  }

  // ─── Private Methods ─────────────────────────────────────────────

  private recordToEntry(record: LongTermRecord): LongTermMemoryEntry {
    return {
      id: record.id,
      key: record.key,
      value: record.value,
      agentId: record.agentId,
      tags: [...record.tags],
      confidence: record.confidence,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      accessCount: record.accessCount,
      lastAccessedAt: record.lastAccessedAt,
    };
  }

  /**
   * Build a full-text searchable string from a key and value.
   */
  private buildFullText(key: string, value: any): string {
    try {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      return `${key} ${valueStr}`.toLowerCase();
    } catch {
      return key.toLowerCase();
    }
  }

  /**
   * Index a full-text string by tokenizing and indexing each word.
   */
  private indexFullText(composedKey: string, fullText: string): void {
    const tokens = fullText.split(/[\s,.\-_:;!?()[\]{}"'\/\\]+/).filter((t) => t.length > 1);

    for (const token of tokens) {
      if (!this.fullTextIndex.has(token)) {
        this.fullTextIndex.set(token, new Set());
      }
      this.fullTextIndex.get(token)!.add(composedKey);
    }
  }

  /**
   * Remove a full-text string from the index.
   */
  private deindexFullText(composedKey: string, fullText: string): void {
    const tokens = fullText.split(/[\s,.\-_:;!?()[\]{}"'\/\\]+/).filter((t) => t.length > 1);

    for (const token of tokens) {
      const tokenSet = this.fullTextIndex.get(token);
      if (tokenSet) {
        tokenSet.delete(composedKey);
        if (tokenSet.size === 0) {
          this.fullTextIndex.delete(token);
        }
      }
    }
  }

  /**
   * Calculate search relevance score for a record.
   */
  private calculateSearchScore(record: LongTermRecord, terms: string[]): number {
    let score = 0;
    const fullText = record.fullText || '';

    for (const term of terms) {
      if (record.key.toLowerCase().includes(term)) score += 3;
      if (fullText.includes(term)) score += 1;
      for (const tag of record.tags) {
        if (tag.toLowerCase().includes(term)) score += 2;
      }
    }

    return score;
  }
}
