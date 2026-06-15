/**
 * AENEWS Agent OS X — Agent Registry Cache
 *
 * Simple in-memory cache layer for the AgentRegistryService.
 * Caches frequently accessed, rarely changing data such as:
 *   - Agent listings by cluster
 *   - Cluster statistics
 *   - Full agent catalog
 *
 * Features:
 *   - TTL-based expiration (default: 30 seconds)
 *   - Pattern-based invalidation
 *   - Automatic cache population on read
 *   - Stats tracking for monitoring
 *
 * The agent registry data changes infrequently (only on agent
 * registration/unregistration), so caching dramatically reduces
 * repeated Map iterations for listing queries.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  createdAt: number;
}

@Injectable()
export class AgentRegistryCache {
  private readonly logger = new Logger(AgentRegistryCache.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  // Stats
  private hits = 0;
  private misses = 0;

  constructor(private readonly configService: ConfigService) {
    this.ttlMs = this.configService.get<number>('performance.responseCacheTtl', 30) * 1000;
    this.maxSize = 500; // Small cache for registry data

    this.logger.log(
      `Agent registry cache initialized: TTL=${this.ttlMs}ms, maxSize=${this.maxSize}`,
    );
  }

  /**
   * Get a cached value by key.
   * Returns null if not found or expired.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  /**
   * Store a value in the cache.
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    // Evict expired entries
    this.evictExpired();

    // If at capacity, evict oldest
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      key,
      value,
      expiresAt: Date.now() + (ttlMs ?? this.ttlMs),
      createdAt: Date.now(),
    });
  }

  /**
   * Get or compute a value. If the key exists and is not expired,
   * returns the cached value. Otherwise, calls the factory function,
   * caches the result, and returns it.
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Invalidate cache entries matching a prefix pattern.
   * Example: invalidate('cluster:') removes all cluster-related caches.
   */
  invalidate(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate all cache entries related to a specific cluster.
   */
  invalidateCluster(cluster: string): void {
    this.invalidate(`cluster:${cluster}`);
    this.invalidate('stats:');
    this.invalidate('all:');
  }

  /**
   * Invalidate all entries (called on registration/unregistration).
   */
  invalidateAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.debug(`Cache fully invalidated: ${size} entries removed`);
  }

  /**
   * Get cache statistics.
   */
  getStats(): { size: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(2) + '%' : '0%',
    };
  }

  // ─── Private Methods ─────────────────────────────────────────

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
