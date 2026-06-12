/**
 * AENEWS Agent OS X - Working Memory Service
 * In-process short-term memory with TTL-based expiration, LRU eviction,
 * and size limits. Used for temporary data that agents need during task execution.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { IWorkingMemoryService } from '../interfaces/agent-memory.interface';

// ─── Internal Entry ───────────────────────────────────────────────
interface WorkingMemoryEntry {
  value: any;
  expiresAt: number;
  createdAt: number;
  accessCount: number;
  lastAccessedAt: number;
}

@Injectable()
export class WorkingMemoryService implements IWorkingMemoryService, OnModuleDestroy {
  private readonly logger = new Logger(WorkingMemoryService.name);
  private readonly store: Map<string, Map<string, WorkingMemoryEntry>> = new Map();
  private cleanupInterval: NodeJS.Timer | null = null;
  private static readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly DEFAULT_MAX_ENTRIES_PER_AGENT = 1000;
  private static readonly CLEANUP_INTERVAL_MS = 60000;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Store a value in working memory for a specific agent.
   * If the agent's store exceeds the max size, LRU eviction is performed.
   */
  set<T>(agentId: string, key: string, value: T, ttlMs?: number): void {
    if (!this.store.has(agentId)) {
      this.store.set(agentId, new Map());
    }

    const agentStore = this.store.get(agentId)!;

    // LRU eviction if at capacity
    if (
      agentStore.size >= WorkingMemoryService.DEFAULT_MAX_ENTRIES_PER_AGENT &&
      !agentStore.has(key)
    ) {
      this.evictLRU(agentStore);
    }

    agentStore.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs || WorkingMemoryService.DEFAULT_TTL_MS),
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessedAt: Date.now(),
    });

    this.logger.debug?.(`Set working memory: ${agentId}:${key}`);
  }

  /**
   * Retrieve a value from working memory. O(1) access.
   */
  get<T>(agentId: string, key: string): T | null {
    const agentStore = this.store.get(agentId);
    if (!agentStore) return null;

    const entry = agentStore.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      agentStore.delete(key);
      return null;
    }

    entry.accessCount++;
    entry.lastAccessedAt = Date.now();
    return entry.value as T;
  }

  /**
   * Delete a value from working memory.
   */
  delete(agentId: string, key: string): boolean {
    const agentStore = this.store.get(agentId);
    if (!agentStore) return false;

    return agentStore.delete(key);
  }

  /**
   * Check if a key exists in working memory.
   */
  has(agentId: string, key: string): boolean {
    const agentStore = this.store.get(agentId);
    if (!agentStore) return false;

    const entry = agentStore.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      agentStore.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all working memory for an agent.
   */
  clear(agentId: string): number {
    const agentStore = this.store.get(agentId);
    if (!agentStore) return 0;

    const size = agentStore.size;
    agentStore.clear();
    this.store.delete(agentId);

    return size;
  }

  /**
   * Get the number of entries for an agent.
   */
  getSize(agentId: string): number {
    const agentStore = this.store.get(agentId);
    return agentStore ? agentStore.size : 0;
  }

  /**
   * Run cleanup of expired entries across all agents.
   * Returns the number of entries cleaned up.
   */
  cleanup(): number {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [agentId, agentStore] of this.store) {
      for (const [key, entry] of agentStore) {
        if (now > entry.expiresAt) {
          agentStore.delete(key);
          cleanedCount++;
        }
      }

      // Remove empty agent stores
      if (agentStore.size === 0) {
        this.store.delete(agentId);
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug?.(`Cleaned up ${cleanedCount} expired working memory entries`);
    }

    return cleanedCount;
  }

  /**
   * Get all keys for an agent (non-expired only).
   */
  getKeys(agentId: string): string[] {
    const agentStore = this.store.get(agentId);
    if (!agentStore) return [];

    const now = Date.now();
    const keys: string[] = [];

    for (const [key, entry] of agentStore) {
      if (now <= entry.expiresAt) {
        keys.push(key);
      }
    }

    return keys;
  }

  /**
   * Get all entries for an agent (non-expired only).
   */
  getAllEntries<T>(
    agentId: string,
  ): Array<{ key: string; value: T; accessCount: number; createdAt: number }> {
    const agentStore = this.store.get(agentId);
    if (!agentStore) return [];

    const now = Date.now();
    const entries: Array<{ key: string; value: T; accessCount: number; createdAt: number }> = [];

    for (const [key, entry] of agentStore) {
      if (now <= entry.expiresAt) {
        entries.push({
          key,
          value: entry.value as T,
          accessCount: entry.accessCount,
          createdAt: entry.createdAt,
        });
      }
    }

    return entries;
  }

  /**
   * Get statistics about working memory usage.
   */
  getStats(): {
    totalAgents: number;
    totalEntries: number;
    totalSizeBytes: number;
  } {
    let totalEntries = 0;
    let totalSizeBytes = 0;
    const now = Date.now();

    for (const [, agentStore] of this.store) {
      for (const [, entry] of agentStore) {
        if (now <= entry.expiresAt) {
          totalEntries++;
          totalSizeBytes += this.estimateSize(entry.value);
        }
      }
    }

    return {
      totalAgents: this.store.size,
      totalEntries,
      totalSizeBytes,
    };
  }

  /**
   * Destroy the service and clean up timers.
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval as any);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }

  // ─── Private Methods ─────────────────────────────────────────────

  /**
   * Evict the least recently used entry from an agent's store.
   */
  private evictLRU(agentStore: Map<string, WorkingMemoryEntry>): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of agentStore) {
      if (entry.lastAccessedAt < oldestAccess) {
        oldestAccess = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      agentStore.delete(oldestKey);
      this.logger.debug?.(`LRU evicted working memory entry: ${oldestKey}`);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, WorkingMemoryService.CLEANUP_INTERVAL_MS);
  }

  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate: 2 bytes per char
    } catch {
      return 1024; // Default estimate
    }
  }
}
