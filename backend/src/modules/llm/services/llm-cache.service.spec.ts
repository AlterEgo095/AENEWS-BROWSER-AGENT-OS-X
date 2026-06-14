/**
 * AENEWS Agent OS X — LLM Cache Service Unit Tests
 *
 * Tests for cache set/get, TTL expiration, LRU eviction,
 * pattern invalidation, and cache statistics.
 */

import { LLMCacheService } from './llm-cache.service';

describe('LLMCacheService', () => {
  let service: LLMCacheService;

  beforeEach(() => {
    service = new LLMCacheService();
  });

  // ─── Cache Set/Get ─────────────────────────────────────────────

  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      service.set('key1', { response: 'hello' });
      const result = service.get('key1');
      expect(result).toEqual({ response: 'hello' });
    });

    it('should return null for non-existent key', () => {
      expect(service.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing key', () => {
      service.set('key1', 'value1');
      service.set('key1', 'value2');
      expect(service.get('key1')).toBe('value2');
    });

    it('should store complex objects', () => {
      const complex = {
        choices: [
          { message: { role: 'assistant', content: 'Hello!' }, finish_reason: 'stop' },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };
      service.set('complex-key', complex);
      expect(service.get('complex-key')).toEqual(complex);
    });

    it('should store string values', () => {
      service.set('str-key', 'simple string');
      expect(service.get('str-key')).toBe('simple string');
    });

    it('should store null values', () => {
      service.set('null-key', null);
      // get returns null for both "not found" and "stored null"
      // has() can distinguish
      expect(service.has('null-key')).toBe(true);
    });

    it('should handle multiple keys', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.set('key3', 'value3');
      expect(service.get('key1')).toBe('value1');
      expect(service.get('key2')).toBe('value2');
      expect(service.get('key3')).toBe('value3');
    });
  });

  // ─── TTL Expiration ────────────────────────────────────────────

  describe('TTL expiration', () => {
    it('should expire entries after TTL', () => {
      // Set with very short TTL (1ms)
      service.set('short-lived', 'data', 1);

      // Wait a bit for expiration
      const start = Date.now();
      while (Date.now() - start < 10) {
        // busy wait for 10ms
      }

      expect(service.get('short-lived')).toBeNull();
    });

    it('should not expire entries before TTL', () => {
      // Set with longer TTL
      service.set('long-lived', 'data', 60000);
      expect(service.get('long-lived')).toBe('data');
    });

    it('should use default TTL of 5 minutes when not specified', () => {
      service.set('default-ttl', 'data');
      // Should still be available immediately
      expect(service.get('default-ttl')).toBe('data');
    });

    it('should clean up expired entries on get', () => {
      service.set('expiring', 'data', 1);

      const start = Date.now();
      while (Date.now() - start < 10) {
        // busy wait
      }

      // Access should trigger cleanup
      service.get('expiring');
      expect(service.has('expiring')).toBe(false);
    });

    it('should clean up expired entries on set', () => {
      service.set('expiring', 'data', 1);

      const start = Date.now();
      while (Date.now() - start < 10) {
        // busy wait
      }

      // Setting another key should trigger expired entry cleanup
      service.set('new-key', 'new-data');
      expect(service.has('expiring')).toBe(false);
    });
  });

  // ─── LRU Eviction ──────────────────────────────────────────────

  describe('LRU eviction', () => {
    it('should evict least recently used entry when at max capacity', () => {
      // The default maxCacheSize is 1000 — we need to fill it
      // For testing, we'll set many keys
      for (let i = 0; i < 1000; i++) {
        service.set(`key-${i}`, `value-${i}`);
      }

      // Access key-0 to make it recently used
      service.get('key-0');

      // Add one more to trigger LRU eviction
      service.set('key-1000', 'overflow');

      // key-1 should be evicted (least recently used among the original 1000)
      // key-0 should still be there because we accessed it
      expect(service.get('key-0')).toBe('value-0');
      expect(service.get('key-1000')).toBe('overflow');

      // At least one old entry should have been evicted
      const keys = service.getKeys();
      expect(keys.length).toBeLessThanOrEqual(1000);
    });

    it('should track eviction count in stats', () => {
      for (let i = 0; i < 1001; i++) {
        service.set(`key-${i}`, `value-${i}`);
      }

      const stats = service.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  // ─── Pattern Invalidation ──────────────────────────────────────

  describe('invalidate', () => {
    it('should invalidate exact key', () => {
      service.set('llm:openai:abc123', 'data1');
      service.set('llm:anthropic:def456', 'data2');

      const count = service.invalidate('llm:openai:abc123');
      expect(count).toBe(1);
      expect(service.get('llm:openai:abc123')).toBeNull();
      expect(service.get('llm:anthropic:def456')).toBe('data2');
    });

    it('should invalidate all keys matching wildcard pattern', () => {
      service.set('llm:openai:abc', 'data1');
      service.set('llm:openai:def', 'data2');
      service.set('llm:anthropic:ghi', 'data3');

      const count = service.invalidate('llm:openai:*');
      expect(count).toBe(2);
      expect(service.get('llm:openai:abc')).toBeNull();
      expect(service.get('llm:openai:def')).toBeNull();
      expect(service.get('llm:anthropic:ghi')).toBe('data3');
    });

    it('should invalidate all LLM keys with llm:* pattern', () => {
      service.set('llm:openai:abc', 'data1');
      service.set('llm:anthropic:def', 'data2');

      const count = service.invalidate('llm:*');
      expect(count).toBe(2);
      expect(service.get('llm:openai:abc')).toBeNull();
      expect(service.get('llm:anthropic:def')).toBeNull();
    });

    it('should return 0 for non-matching pattern', () => {
      service.set('llm:openai:abc', 'data1');
      const count = service.invalidate('llm:nonexistent:*');
      expect(count).toBe(0);
    });

    it('should return 0 for non-existent exact key', () => {
      const count = service.invalidate('nonexistent');
      expect(count).toBe(0);
    });
  });

  // ─── Cache Statistics ──────────────────────────────────────────

  describe('getStats', () => {
    it('should return initial stats', () => {
      const stats = service.getStats();
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(1000);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe('0%');
      expect(stats.evictions).toBe(0);
      expect(stats.totalSet).toBe(0);
    });

    it('should track hits and misses', () => {
      service.set('key1', 'value1');
      service.get('key1'); // hit
      service.get('key1'); // hit
      service.get('nonexistent'); // miss

      const stats = service.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should calculate hit rate', () => {
      service.set('key1', 'value1');
      service.get('key1'); // hit
      service.get('nonexistent'); // miss

      const stats = service.getStats();
      expect(stats.hitRate).toBe('50.00%');
    });

    it('should track totalSet count', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.set('key1', 'updated'); // overwrite counts as set

      const stats = service.getStats();
      expect(stats.totalSet).toBe(3);
    });

    it('should track cache size', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');

      const stats = service.getStats();
      expect(stats.size).toBe(2);
    });
  });

  // ─── Utility Methods ───────────────────────────────────────────

  describe('has', () => {
    it('should return true for existing non-expired key', () => {
      service.set('key1', 'value1');
      expect(service.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(service.has('nonexistent')).toBe(false);
    });

    it('should return false for expired key', () => {
      service.set('key1', 'value1', 1);

      const start = Date.now();
      while (Date.now() - start < 10) {
        // busy wait
      }

      expect(service.has('key1')).toBe(false);
    });
  });

  describe('getKeys', () => {
    it('should return all cache keys', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.set('key3', 'value3');

      const keys = service.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return empty array for empty cache', () => {
      expect(service.getKeys()).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return current cache size', () => {
      expect(service.size).toBe(0);
      service.set('key1', 'value1');
      expect(service.size).toBe(1);
      service.set('key2', 'value2');
      expect(service.size).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      service.set('key1', 'value1');
      service.set('key2', 'value2');
      service.clear();
      expect(service.size).toBe(0);
      expect(service.get('key1')).toBeNull();
    });
  });

  // ─── buildKey ──────────────────────────────────────────────────

  describe('buildKey', () => {
    it('should produce deterministic keys for same input', () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const key1 = service.buildKey('gpt-4', messages, 0.7, 100);
      const key2 = service.buildKey('gpt-4', messages, 0.7, 100);
      expect(key1).toBe(key2);
    });

    it('should produce different keys for different models', () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const key1 = service.buildKey('gpt-4', messages, 0.7, 100);
      const key2 = service.buildKey('claude-3', messages, 0.7, 100);
      expect(key1).not.toBe(key2);
    });

    it('should produce different keys for different messages', () => {
      const msg1 = [{ role: 'user', content: 'Hello' }];
      const msg2 = [{ role: 'user', content: 'Goodbye' }];
      const key1 = service.buildKey('gpt-4', msg1, 0.7, 100);
      const key2 = service.buildKey('gpt-4', msg2, 0.7, 100);
      expect(key1).not.toBe(key2);
    });

    it('should start with llm: prefix', () => {
      const key = service.buildKey('gpt-4', [{ role: 'user', content: 'test' }]);
      expect(key).toMatch(/^llm:/);
    });

    it('should include model name in key', () => {
      const key = service.buildKey('gpt-4', [{ role: 'user', content: 'test' }]);
      expect(key).toContain('gpt-4');
    });
  });
});
