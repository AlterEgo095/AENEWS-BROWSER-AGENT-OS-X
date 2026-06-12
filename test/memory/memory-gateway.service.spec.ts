/**
 * AENEWS Agent OS X - Memory Gateway Service Unit Tests
 * Tests the unified memory gateway: store, retrieve, search, summarize,
 * promote, archive, crossTierRetrieve, delete, clear, query, and getStats.
 */

import { MemoryGatewayService, ExtendedMemoryTier, MemoryGatewayStoreOptions } from '../../src/gateway/memory/memory-gateway.service';
import { MemoryTier, MemoryEncoding } from '../../src/agents/interfaces/agent-memory.interface';

// ─── Test Suite ─────────────────────────────────────────────────────

describe('MemoryGatewayService', () => {
  let service: MemoryGatewayService;

  beforeEach(() => {
    service = new MemoryGatewayService();
  });

  // ─── store() ──────────────────────────────────────────────────────

  describe('store', () => {
    it('should store data in working tier', async () => {
      const entry = await service.store('agent-1', 'key-1', { foo: 'bar' }, ExtendedMemoryTier.WORKING);
      expect(entry).toBeDefined();
      expect(entry.key).toBe('key-1');
      expect(entry.value).toEqual({ foo: 'bar' });
      expect(entry.agentId).toBe('agent-1');
    });

    it('should store data in long_term tier', async () => {
      const entry = await service.store('agent-1', 'lt-key', 'long term data', ExtendedMemoryTier.LONG_TERM);
      expect(entry).toBeDefined();
      expect(entry.key).toBe('lt-key');
      expect(entry.value).toBe('long term data');
    });

    it('should store data in session tier with sessionId', async () => {
      const entry = await service.store('agent-1', 'session-key', 'session data', ExtendedMemoryTier.SESSION, {
        sessionId: 'sess-1',
      });
      expect(entry).toBeDefined();
      expect(entry.key).toBe('session-key');
    });

    it('should store data in archive tier', async () => {
      const entry = await service.store('agent-1', 'archive-key', 'archived', ExtendedMemoryTier.ARCHIVE);
      expect(entry).toBeDefined();
      expect(entry.key).toBe('archive-key');
    });

    it('should store data with auto tier selection when no tier specified', async () => {
      const entry = await service.store('agent-1', 'auto-key', 'auto data');
      expect(entry).toBeDefined();
      expect(entry.key).toBe('auto-key');
    });

    it('should select working tier for short TTL', async () => {
      const entry = await service.store('agent-1', 'short-ttl', 'temp', undefined, {
        autoTier: true,
        ttlMs: 60000, // 1 minute
      });
      expect(entry).toBeDefined();
    });

    it('should store data in knowledge graph tier for relation keys', async () => {
      const entry = await service.store('agent-1', 'relation:test', 'node data', ExtendedMemoryTier.KNOWLEDGE_GRAPH);
      expect(entry).toBeDefined();
    });

    it('should store data in vector tier', async () => {
      const entry = await service.store('agent-1', 'vec-key', 'vector data', ExtendedMemoryTier.VECTOR);
      expect(entry).toBeDefined();
    });

    it('should create entry with proper metadata', async () => {
      const entry = await service.store('agent-1', 'meta-key', 'data', ExtendedMemoryTier.WORKING, {
        tags: ['tag1', 'tag2'],
        confidence: 0.95,
      });
      expect(entry.metadata.tags).toEqual(['tag1', 'tag2']);
      expect(entry.metadata.confidence).toBe(0.95);
      expect(entry.metadata.accessCount).toBe(0);
      expect(entry.id).toBeDefined();
      expect(entry.createdAt).toBeDefined();
    });
  });

  // ─── retrieve() ───────────────────────────────────────────────────

  describe('retrieve', () => {
    it('should retrieve data from working tier', async () => {
      await service.store('agent-1', 'r-key', { val: 42 }, ExtendedMemoryTier.WORKING);
      const entry = await service.retrieve('agent-1', 'r-key', ExtendedMemoryTier.WORKING);
      expect(entry).not.toBeNull();
      expect(entry!.value).toEqual({ val: 42 });
    });

    it('should return null for non-existent key', async () => {
      const entry = await service.retrieve('agent-1', 'non-existent', ExtendedMemoryTier.WORKING);
      expect(entry).toBeNull();
    });

    it('should perform cross-tier fallback when no tier specified', async () => {
      await service.store('agent-1', 'fallback-key', 'in-long-term', ExtendedMemoryTier.LONG_TERM);
      const entry = await service.retrieve('agent-1', 'fallback-key');
      expect(entry).not.toBeNull();
      expect(entry!.value).toBe('in-long-term');
    });

    it('should return null for non-existent key across all tiers', async () => {
      const entry = await service.retrieve('agent-1', 'nowhere-key');
      expect(entry).toBeNull();
    });

    it('should retrieve from long_term tier', async () => {
      await service.store('agent-1', 'lt-r-key', 'lt-data', ExtendedMemoryTier.LONG_TERM);
      const entry = await service.retrieve('agent-1', 'lt-r-key', ExtendedMemoryTier.LONG_TERM);
      expect(entry).not.toBeNull();
      expect(entry!.value).toBe('lt-data');
    });

    it('should not find data in wrong tier', async () => {
      await service.store('agent-1', 'tier-key', 'working-data', ExtendedMemoryTier.WORKING);
      const entry = await service.retrieve('agent-1', 'tier-key', ExtendedMemoryTier.LONG_TERM);
      expect(entry).toBeNull();
    });
  });

  // ─── search() ─────────────────────────────────────────────────────

  describe('search', () => {
    it('should return empty results for no data', async () => {
      const result = await service.search('query');
      expect(result.entries).toEqual([]);
      expect(result.fusedScore).toBe(0);
    });

    it('should find data by keyword in long-term store', async () => {
      await service.store('agent-1', 'search-key', 'This is searchable content about cats', ExtendedMemoryTier.LONG_TERM);
      const result = await service.search('cats', 'agent-1');
      expect(result.entries.length).toBeGreaterThan(0);
    });

    it('should search vector index', async () => {
      await service.store('agent-1', 'vec-search', 'vector searchable content', ExtendedMemoryTier.VECTOR);
      const result = await service.search('vector');
      expect(result.totalSearched).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await service.store('agent-1', `key-${i}`, `value ${i}`, ExtendedMemoryTier.LONG_TERM);
      }
      const result = await service.search('value', 'agent-1', 2);
      expect(result.entries.length).toBeLessThanOrEqual(2);
    });

    it('should return source tiers in results', async () => {
      await service.store('agent-1', 's-key', 'data', ExtendedMemoryTier.LONG_TERM);
      const result = await service.search('data', 'agent-1');
      expect(result.sourceTiers).toBeDefined();
    });
  });

  // ─── summarize() ──────────────────────────────────────────────────

  describe('summarize', () => {
    it('should summarize single entry', async () => {
      await service.store('agent-1', 'sum-key', 'This is the content to summarize', ExtendedMemoryTier.WORKING);
      const result = await service.summarize('agent-1', 'sum-key');

      expect(result).toBeDefined();
      expect(result.originalCount).toBe(1);
      expect(result.summary).toBeDefined();
      expect(result.keyPoints.length).toBeGreaterThan(0);
      expect(result.compressedEntry).toBeDefined();
    });

    it('should return empty summary for no data', async () => {
      const result = await service.summarize('agent-1', 'non-existent');
      expect(result.originalCount).toBe(0);
      expect(result.summary).toBe('No data found');
    });

    it('should summarize multiple keys', async () => {
      await service.store('agent-1', 'multi-1', 'Content one', ExtendedMemoryTier.WORKING);
      await service.store('agent-1', 'multi-2', 'Content two', ExtendedMemoryTier.WORKING);
      const result = await service.summarize('agent-1', ['multi-1', 'multi-2']);
      expect(result.originalCount).toBe(2);
    });
  });

  // ─── promote() ────────────────────────────────────────────────────

  describe('promote', () => {
    it('should promote data between tiers', async () => {
      await service.store('agent-1', 'promote-key', 'promote me', ExtendedMemoryTier.WORKING);
      const result = await service.promote('agent-1', 'promote-key', ExtendedMemoryTier.WORKING, ExtendedMemoryTier.LONG_TERM);

      expect(result.success).toBe(true);
      expect(result.from).toBe(ExtendedMemoryTier.WORKING);
      expect(result.to).toBe(ExtendedMemoryTier.LONG_TERM);
      expect(result.key).toBe('promote-key');
    });

    it('should return failure for non-existent key', async () => {
      const result = await service.promote('agent-1', 'non-existent', ExtendedMemoryTier.WORKING, ExtendedMemoryTier.LONG_TERM);
      expect(result.success).toBe(false);
    });

    it('should remove data from source tier after promotion', async () => {
      await service.store('agent-1', 'promote-rm', 'data', ExtendedMemoryTier.WORKING);
      await service.promote('agent-1', 'promote-rm', ExtendedMemoryTier.WORKING, ExtendedMemoryTier.LONG_TERM);
      const sourceEntry = await service.retrieve('agent-1', 'promote-rm', ExtendedMemoryTier.WORKING);
      expect(sourceEntry).toBeNull();
    });

    it('should be retrievable from destination tier after promotion', async () => {
      await service.store('agent-1', 'promote-dest', 'data', ExtendedMemoryTier.WORKING);
      await service.promote('agent-1', 'promote-dest', ExtendedMemoryTier.WORKING, ExtendedMemoryTier.LONG_TERM);
      const destEntry = await service.retrieve('agent-1', 'promote-dest', ExtendedMemoryTier.LONG_TERM);
      expect(destEntry).not.toBeNull();
      expect(destEntry!.value).toBe('data');
    });
  });

  // ─── archive() ────────────────────────────────────────────────────

  describe('archive', () => {
    it('should archive data from long_term to archive', async () => {
      await service.store('agent-1', 'arch-key', 'archive me', ExtendedMemoryTier.LONG_TERM);
      const result = await service.archive('agent-1', 'arch-key', ExtendedMemoryTier.LONG_TERM);
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const result = await service.archive('agent-1', 'non-existent');
      expect(result).toBe(false);
    });

    it('should be retrievable from archive after archiving', async () => {
      await service.store('agent-1', 'arch-ret', 'data', ExtendedMemoryTier.LONG_TERM);
      await service.archive('agent-1', 'arch-ret', ExtendedMemoryTier.LONG_TERM);
      const entry = await service.retrieve('agent-1', 'archived:arch-ret', ExtendedMemoryTier.ARCHIVE);
      expect(entry).not.toBeNull();
    });
  });

  // ─── crossTierRetrieve() ──────────────────────────────────────────

  describe('crossTierRetrieve', () => {
    it('should search across multiple tiers', async () => {
      await service.store('agent-1', 'ct-work', 'working data', ExtendedMemoryTier.WORKING);
      await service.store('agent-1', 'ct-long', 'long-term data', ExtendedMemoryTier.LONG_TERM);

      const result = await service.crossTierRetrieve('agent-1', 'data');
      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.sourceTiers.length).toBeGreaterThan(0);
    });

    it('should respect maxTiers option', async () => {
      await service.store('agent-1', 'mt-key', 'data', ExtendedMemoryTier.WORKING);
      const result = await service.crossTierRetrieve('agent-1', 'data', { maxTiers: 1 });
      expect(result.sourceTiers.length).toBeLessThanOrEqual(1);
    });

    it('should return empty results for non-matching query', async () => {
      await service.store('agent-1', 'no-match', 'xyz', ExtendedMemoryTier.WORKING);
      const result = await service.crossTierRetrieve('agent-1', 'abcde');
      expect(result.entries).toEqual([]);
    });
  });

  // ─── delete() ─────────────────────────────────────────────────────

  describe('delete', () => {
    it('should delete an entry from working tier', async () => {
      await service.store('agent-1', 'del-key', 'delete me', ExtendedMemoryTier.WORKING);
      const result = await service.delete('agent-1', 'del-key', ExtendedMemoryTier.WORKING as unknown as MemoryTier);
      expect(result).toBe(true);
      const entry = await service.retrieve('agent-1', 'del-key', ExtendedMemoryTier.WORKING);
      expect(entry).toBeNull();
    });

    it('should return false for non-existent entry', async () => {
      const result = await service.delete('agent-1', 'non-existent', ExtendedMemoryTier.WORKING as unknown as MemoryTier);
      expect(result).toBe(false);
    });

    it('should delete from all tiers when no tier specified', async () => {
      await service.store('agent-1', 'multi-del', 'data', ExtendedMemoryTier.WORKING);
      const result = await service.delete('agent-1', 'multi-del');
      expect(result).toBe(true);
    });
  });

  // ─── clear() ──────────────────────────────────────────────────────

  describe('clear', () => {
    it('should clear all data for an agent', async () => {
      await service.store('agent-1', 'c1', 'data1', ExtendedMemoryTier.WORKING);
      await service.store('agent-1', 'c2', 'data2', ExtendedMemoryTier.WORKING);
      const count = await service.clear('agent-1');
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should clear specific tier only', async () => {
      await service.store('agent-1', 'ct1', 'working', ExtendedMemoryTier.WORKING);
      await service.store('agent-1', 'ct2', 'long-term', ExtendedMemoryTier.LONG_TERM);
      const count = await service.clear('agent-1', ExtendedMemoryTier.WORKING as unknown as MemoryTier);
      expect(count).toBeGreaterThanOrEqual(1);
      const ltEntry = await service.retrieve('agent-1', 'ct2', ExtendedMemoryTier.LONG_TERM);
      expect(ltEntry).not.toBeNull();
    });

    it('should return 0 for agent with no data', async () => {
      const count = await service.clear('unknown-agent');
      expect(count).toBe(0);
    });
  });

  // ─── query() ──────────────────────────────────────────────────────

  describe('query', () => {
    it('should query by keyPrefix', async () => {
      await service.store('agent-1', 'task:1:result', 'data1', ExtendedMemoryTier.WORKING);
      await service.store('agent-1', 'task:2:result', 'data2', ExtendedMemoryTier.WORKING);
      await service.store('agent-1', 'other:key', 'data3', ExtendedMemoryTier.WORKING);

      const result = await service.query({ agentId: 'agent-1', keyPrefix: 'task:' });
      expect(result.entries.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should return empty for no matches', async () => {
      const result = await service.query({ agentId: 'agent-1', keyPrefix: 'nonexistent:' });
      expect(result.entries).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ─── getStats() ───────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return stats for an agent', async () => {
      await service.store('agent-1', 's1', 'data', ExtendedMemoryTier.WORKING);
      await service.store('agent-1', 's2', 'data', ExtendedMemoryTier.LONG_TERM);
      const stats = await service.getStats('agent-1');
      expect(stats.agentId).toBe('agent-1');
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
      expect(stats.tierStats).toBeDefined();
    });

    it('should return zero stats for unknown agent', async () => {
      const stats = await service.getStats('unknown');
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSizeBytes).toBe(0);
    });
  });
});
