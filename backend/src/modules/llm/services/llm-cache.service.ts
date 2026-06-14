/**
 * AENEWS Agent OS X — LLM Response Cache Service
 *
 * In-memory cache for LLM responses with:
 *   - SHA256-based cache key derived from (model, messages hash, temperature, maxTokens)
 *   - TTL-based expiration (default 5 minutes)
 *   - LRU eviction when max cache size is reached
 *   - Pattern-based cache invalidation
 *   - Cache statistics for monitoring
 *
 * Usage:
 *   const cacheKey = llmCache.buildKey(model, messages, temperature, maxTokens);
 *   const cached = llmCache.get(cacheKey);
 *   if (cached) return cached;
 *   const response = await provider.chat(messages, options);
 *   llmCache.set(cacheKey, response);
 *   return response;
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

interface CacheEntry<T = any> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  accessCount: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: string;
  evictions: number;
  totalSet: number;
}

@Injectable()
export class LLMCacheService {
  private readonly logger = new Logger(LLMCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();

  /** Maximum number of entries in the cache */
  private readonly maxCacheSize = 1000;

  /** Default TTL in milliseconds (5 minutes) */
  private readonly defaultTtlMs = 5 * 60 * 1000;

  /** Statistics counters */
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private totalSet = 0;

  /**
   * Build a deterministic cache key from LLM request parameters.
   * Uses SHA256 hash to ensure consistent key generation.
   */
  buildKey(
    model: string,
    messages: Array<{ role: string; content: string }>,
    temperature?: number,
    maxTokens?: number,
  ): string {
    const data = JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: temperature ?? null,
      maxTokens: maxTokens ?? null,
    });

    const hash = createHash('sha256').update(data).digest('hex');
    return `llm:${model}:${hash.substring(0, 32)}`;
  }

  /**
   * Get a cached response by key.
   * Returns null if not found or expired.
   * Automatically evicts expired entries on access.
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();

    // Check expiration
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access metadata for LRU
    entry.lastAccessedAt = now;
    entry.accessCount++;
    this.hits++;

    return entry.value as T;
  }

  /**
   * Store a response in the cache.
   * If the cache is full, evicts the least recently used entry.
   */
  set<T = any>(key: string, value: T, ttlMs?: number): void {
    // Evict expired entries first
    this.evictExpired();

    // If at capacity, evict LRU
    if (this.cache.size >= this.maxCacheSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      expiresAt: now + (ttlMs ?? this.defaultTtlMs),
      lastAccessedAt: now,
      accessCount: 0,
    };

    this.cache.set(key, entry);
    this.totalSet++;
  }

  /**
   * Invalidate cache entries matching a pattern.
   * Pattern can be:
   *   - 'llm:openai:*' — invalidate all OpenAI cached responses
   *   - 'llm:*' — invalidate all LLM cached responses
   *   - exact key — invalidate a specific entry
   *
   * Returns the number of entries invalidated.
   */
  invalidate(pattern: string): number {
    let count = 0;

    if (pattern.endsWith('*')) {
      // Wildcard pattern
      const prefix = pattern.slice(0, -1);
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
          count++;
        }
      }
    } else {
      // Exact key
      if (this.cache.delete(pattern)) {
        count = 1;
      }
    }

    if (count > 0) {
      this.logger.debug(`Invalidated ${count} cache entries matching "${pattern}"`);
    }

    return count;
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cache cleared — ${size} entries removed`);
  }

  /**
   * Get cache statistics for monitoring.
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(2) + '%' : '0%',
      evictions: this.evictions,
      totalSet: this.totalSet,
    };
  }

  /**
   * Get all cache keys (for debugging).
   */
  getKeys(): string[] {
    return [...this.cache.keys()];
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get the current size of the cache.
   */
  get size(): number {
    return this.cache.size;
  }

  // ─── Private Methods ──────────────────────────────────────────────

  /**
   * Evict all expired entries from the cache.
   */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.evictions++;
      }
    }
  }

  /**
   * Evict the least recently used entry from the cache.
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessedAt < oldestAccess) {
        oldestAccess = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.evictions++;
      this.logger.debug(`LRU evicted cache entry: ${oldestKey}`);
    }
  }
}
