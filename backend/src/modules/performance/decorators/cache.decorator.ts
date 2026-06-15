/**
 * AENEWS Agent OS X — Phase 13: @Cacheable Decorator
 *
 * Method-level caching with Redis backend. Supports:
 *   - TTL per method
 *   - Custom key generation
 *   - Cache invalidation via @CacheEvict
 *   - Conditional caching (skip cache based on args)
 *   - Cache stats tracking
 */

import { SetMetadata } from '@nestjs/common';

export const CACHEABLE_KEY = 'cacheable:config';
export const CACHE_EVICT_KEY = 'cacheable:evict';

export interface CacheableConfig {
  /**
   * Cache key prefix. Default: ClassName.methodName
   */
  key?: string;

  /**
   * TTL in seconds. Default: 300 (5 minutes)
   */
  ttl?: number;

  /**
   * Custom key generator function.
   * Receives method arguments, returns string key suffix.
   */
  keyGenerator?: (...args: any[]) => string;

  /**
   * Condition — cache only when this returns true.
   * Receives method arguments.
   */
  condition?: (...args: any[]) => boolean;

  /**
   * Whether to cache null/undefined results. Default: false
   */
  cacheNull?: boolean;
}

export interface CacheEvictConfig {
  /**
   * Key prefix(es) to invalidate.
   * Supports wildcards: 'agents:*' will delete all keys starting with 'agents:'
   */
  keys?: string | string[];

  /**
   * Invalidate all entries (flush prefix). Default: false
   */
  allEntries?: boolean;
}

/**
 * Decorator: @Cacheable({ ttl: 60, key: 'users' })
 *
 * Caches method results in Redis with configurable TTL.
 * Automatically generates cache keys from class name + method name + args.
 */
export function Cacheable(config: CacheableConfig = {}) {
  return SetMetadata(CACHEABLE_KEY, {
    ttl: config.ttl ?? 300,
    key: config.key,
    keyGenerator: config.keyGenerator,
    condition: config.condition,
    cacheNull: config.cacheNull ?? false,
  } as CacheableConfig);
}

/**
 * Decorator: @CacheEvict({ keys: 'users:*', allEntries: false })
 *
 * Evicts cache entries when the decorated method is called.
 * Runs AFTER the method completes successfully.
 */
export function CacheEvict(config: CacheEvictConfig = {}) {
  return SetMetadata(CACHE_EVICT_KEY, {
    keys: config.keys,
    allEntries: config.allEntries ?? false,
  } as CacheEvictConfig);
}
