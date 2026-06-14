/**
 * AENEWS Agent OS X — Phase 13 E2E Tests
 *
 * Performance Optimization & Load Testing
 *
 * Tests cover:
 *   1. Slow Query Logger Service
 *   2. Response Cache Interceptor
 *   3. Compression Interceptor
 *   4. Performance Profiling Service
 *   5. Connection Pool Service
 *   6. Cursor Pagination Utility
 *   7. Cache Decorators
 *   8. Performance Controller Endpoints
 *   9. Database Indexes Verification
 *   10. Configuration Integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import {
  SlowQueryLoggerService,
  PerformanceProfilingService,
  ConnectionPoolService,
  ResponseCacheInterceptor,
  CompressionInterceptor,
  encodeCursor,
  decodeCursor,
  createCursorPage,
  createOffsetPage,
} from '../src/modules/performance';

describe('Phase 13: Performance Optimization & Load Testing', () => {
  // ═══════════════════════════════════════════════════════════
  //  1. Slow Query Logger Service
  // ═══════════════════════════════════════════════════════════
  describe('SlowQueryLoggerService', () => {
    let service: SlowQueryLoggerService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SlowQueryLoggerService,
          {
            provide: ConfigService,
            useValue: {
              get: (key: string) => {
                const config: Record<string, any> = {
                  'performance.slowQueryEnabled': true,
                  'performance.slowQueryThresholdMs': 100,
                  'performance.slowQueryMaxEntries': 100,
                };
                return config[key];
              },
            },
          },
        ],
      }).compile();

      service = module.get<SlowQueryLoggerService>(SlowQueryLoggerService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should record slow queries above threshold', () => {
      service.recordQuery('SELECT * FROM agents', [], 150, 'agent');
      const queries = service.getRecentQueries();
      expect(queries.length).toBe(1);
      expect(queries[0].durationMs).toBe(150);
      expect(queries[0].query).toContain('SELECT * FROM agents');
    });

    it('should ignore queries below threshold', () => {
      service.recordQuery('SELECT * FROM agents', [], 50, 'agent');
      const queries = service.getRecentQueries();
      expect(queries.length).toBe(0);
    });

    it('should calculate stats correctly', () => {
      service.recordQuery('SELECT 1', [], 100, 'agent');
      service.recordQuery('SELECT 2', [], 200, 'software_factory');
      service.recordQuery('SELECT 3', [], 300, 'agent');

      const stats = service.getStats();
      expect(stats.totalSlowQueries).toBe(3);
      expect(stats.maxDurationMs).toBe(300);
      expect(stats.bySchema['agent']).toBeDefined();
      expect(stats.bySchema['software_factory']).toBeDefined();
    });

    it('should filter recent queries by minDuration', () => {
      service.recordQuery('SELECT 1', [], 100, 'agent');
      service.recordQuery('SELECT 2', [], 300, 'agent');

      const filtered = service.getRecentQueries({ minDurationMs: 200 });
      expect(filtered.length).toBe(1);
      expect(filtered[0].durationMs).toBe(300);
    });

    it('should filter recent queries by schema', () => {
      service.recordQuery('SELECT 1', [], 100, 'agent');
      service.recordQuery('SELECT 2', [], 200, 'audit');

      const filtered = service.getRecentQueries({ schema: 'audit' });
      expect(filtered.length).toBe(1);
    });

    it('should limit the number of entries', async () => {
      // Create service with very small max
      const smallModule = await Test.createTestingModule({
        providers: [
          SlowQueryLoggerService,
          {
            provide: ConfigService,
            useValue: {
              get: (key: string) => {
                const config: Record<string, any> = {
                  'performance.slowQueryEnabled': true,
                  'performance.slowQueryThresholdMs': 1,
                  'performance.slowQueryMaxEntries': 5,
                };
                return config[key];
              },
            },
          },
        ],
      }).compile();

      const smallService = smallModule.get<SlowQueryLoggerService>(SlowQueryLoggerService);
      for (let i = 0; i < 10; i++) {
        smallService.recordQuery(`SELECT ${i}`, [], 10, 'agent');
      }

      const queries = smallService.getRecentQueries({ limit: 100 });
      expect(queries.length).toBeLessThanOrEqual(5);
    });

    it('should clear log', () => {
      service.recordQuery('SELECT 1', [], 150, 'agent');
      service.clearLog();
      expect(service.getRecentQueries().length).toBe(0);
    });

    it('should truncate long queries', () => {
      const longQuery = 'SELECT * FROM agents WHERE ' + 'x=1 AND '.repeat(200);
      service.recordQuery(longQuery, [], 150, 'agent');
      const queries = service.getRecentQueries();
      expect(queries[0].query.length).toBeLessThanOrEqual(510);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  2. Cursor Pagination Utility
  // ═══════════════════════════════════════════════════════════
  describe('Cursor Pagination', () => {
    it('should encode and decode cursor correctly', () => {
      const cursor = {
        value: '2024-01-01T00:00:00.000Z',
        column: 'created_at',
        order: 'DESC' as const,
        id: 'abc-123',
      };

      const encoded = encodeCursor(cursor);
      const decoded = decodeCursor(encoded);

      expect(decoded).toEqual(cursor);
    });

    it('should return null for invalid cursor', () => {
      expect(decodeCursor('invalid-base64!!!')).toBeNull();
      expect(decodeCursor('')).toBeNull();
    });

    it('should create cursor page with correct pagination', () => {
      const items = Array.from({ length: 11 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        created_at: new Date(Date.now() - i * 1000),
      }));

      const page = createCursorPage(items, 10, 'created_at', 'DESC');

      expect(page.data.length).toBe(10);
      expect(page.pagination.hasNextPage).toBe(true);
      expect(page.pagination.cursor).not.toBeNull();
    });

    it('should handle exact page size', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        created_at: new Date(),
      }));

      const page = createCursorPage(items, 10, 'created_at', 'DESC');

      expect(page.data.length).toBe(10);
      expect(page.pagination.hasNextPage).toBe(false);
      expect(page.pagination.cursor).toBeNull();
    });

    it('should create offset page correctly', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: i }));
      const page = createOffsetPage(items, 95, 1, 10);

      expect(page.data.length).toBe(10);
      expect(page.pagination.totalItems).toBe(95);
      expect(page.pagination.totalPages).toBe(10);
      expect(page.pagination.hasNextPage).toBe(true);
      expect(page.pagination.hasPreviousPage).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  3. Performance Profiling Service
  // ═══════════════════════════════════════════════════════════
  describe('PerformanceProfilingService', () => {
    let service: PerformanceProfilingService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PerformanceProfilingService,
          {
            provide: ConfigService,
            useValue: {
              get: (key: string) => {
                const config: Record<string, any> = {
                  'performance.profilingEnabled': true,
                  'performance.profilingIntervalMs': 60000, // Slow sampling for tests
                };
                return config[key];
              },
            },
          },
        ],
      }).compile();

      service = module.get<PerformanceProfilingService>(PerformanceProfilingService);
      service.onModuleInit();
    });

    afterEach(() => {
      service.onModuleDestroy();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should start and end spans', () => {
      const spanId = service.startSpan('test-operation', { test: true });
      expect(spanId).toBeDefined();

      const activeSpans = service.getActiveSpans();
      expect(activeSpans.length).toBe(1);
      expect(activeSpans[0].name).toBe('test-operation');

      service.endSpan(spanId, 'completed');
      expect(service.getActiveSpans().length).toBe(0);
    });

    it('should measure async function execution', async () => {
      const result = await service.measure('db-query', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { rows: 42 };
      });

      expect(result.rows).toBe(42);
      expect(service.getActiveSpans().length).toBe(0);
    });

    it('should track failed spans', async () => {
      try {
        await service.measure('failing-operation', async () => {
          throw new Error('Test failure');
        });
      } catch (e) {
        expect(e.message).toBe('Test failure');
      }

      expect(service.getActiveSpans().length).toBe(0);
    });

    it('should generate performance report', () => {
      const report = service.getReport();

      expect(report).toBeDefined();
      expect(report.uptime).toBeGreaterThan(0);
      expect(report.memory).toBeDefined();
      expect(report.memory.heapUsed).toBeDefined();
      expect(report.cpu).toBeDefined();
      expect(report.eventLoop).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should provide memory stats', () => {
      const stats = service.getMemoryStats();

      expect(stats.current).toBeDefined();
      expect(stats.current.heapUsed).toBeGreaterThan(0);
      expect(stats.heapStatistics).toBeDefined();
      expect(['increasing', 'stable', 'decreasing']).toContain(stats.trend);
    });

    it('should detect span leaks', () => {
      // Start many spans without ending
      for (let i = 0; i < 150; i++) {
        service.startSpan(`leaky-span-${i}`);
      }

      const report = service.getReport();
      const leakRecommendation = report.recommendations.find((r) =>
        r.includes('span leak'),
      );
      expect(leakRecommendation).toBeDefined();

      // Cleanup
      const activeSpans = service.getActiveSpans();
      for (const span of activeSpans) {
        // We can't directly end them by name, but the service tracks them
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  4. Connection Pool Service
  // ═══════════════════════════════════════════════════════════
  describe('ConnectionPoolService', () => {
    let service: ConnectionPoolService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ConnectionPoolService,
          {
            provide: ConfigService,
            useValue: {
              get: (key: string) => {
                const config: Record<string, any> = {
                  'performance.poolMonitoringEnabled': true,
                  'database.poolMax': 20,
                  'redis.poolMax': 10,
                  'neo4j.poolMax': 10,
                  'performance.httpPoolMax': 50,
                };
                return config[key];
              },
            },
          },
        ],
      }).compile();

      service = module.get<ConnectionPoolService>(ConnectionPoolService);
      service.onModuleInit();
    });

    afterEach(() => {
      service.onModuleDestroy();
    });

    it('should register pools', () => {
      const pools = service.getPoolStats();
      expect(pools.length).toBeGreaterThan(0);
      expect(pools.some((p) => p.name === 'postgresql')).toBe(true);
    });

    it('should track acquire and release', () => {
      service.acquire('postgresql');
      const stats = service.getPoolStats();
      const pgPool = stats.find((p) => p.name === 'postgresql');
      expect(pgPool.active).toBe(1);
      expect(pgPool.totalAcquired).toBe(1);

      service.release('postgresql');
      const updatedStats = service.getPoolStats();
      const updatedPg = updatedStats.find((p) => p.name === 'postgresql');
      expect(updatedPg.active).toBe(0);
      expect(updatedPg.totalReleased).toBe(1);
    });

    it('should track timeouts', () => {
      service.timeout('postgresql');
      const stats = service.getPoolStats();
      const pgPool = stats.find((p) => p.name === 'postgresql');
      expect(pgPool.totalTimeouts).toBe(1);
    });

    it('should generate pool recommendations', () => {
      // Saturate a pool
      for (let i = 0; i < 19; i++) {
        service.acquire('postgresql');
      }

      const recommendations = service.getRecommendations();
      const highUtil = recommendations.find((r) =>
        r.recommendation.includes('utilization'),
      );
      expect(highUtil).toBeDefined();
    });

    it('should detect connection leaks', () => {
      // Acquire many without release
      for (let i = 0; i < 60; i++) {
        service.acquire('postgresql');
      }

      const recommendations = service.getRecommendations();
      const leakRec = recommendations.find((r) =>
        r.recommendation.includes('leak'),
      );
      expect(leakRec).toBeDefined();
      expect(leakRec.severity).toBe('critical');
    });

    it('should calculate optimal pool size', () => {
      const optimal = service.calculateOptimalPoolSize(100, 50, 0.2);
      // Little's Law: (0.1s * 50 qps) / 0.8 = 6.25 → 7
      expect(optimal).toBe(7);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  5. Compression Interceptor
  // ═══════════════════════════════════════════════════════════
  describe('CompressionInterceptor', () => {
    let interceptor: CompressionInterceptor;

    beforeEach(() => {
      interceptor = new CompressionInterceptor({
        get: (key: string) => {
          const config: Record<string, any> = {
            'performance.compressionEnabled': true,
            'performance.compressionThreshold': 100,
            'performance.compressionLevel': 6,
          };
          return config[key];
        },
      } as ConfigService);
    });

    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should report stats', () => {
      const stats = interceptor.getStats();
      expect(stats.enabled).toBe(true);
      expect(stats.threshold).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  6. Response Cache Interceptor
  // ═══════════════════════════════════════════════════════════
  describe('ResponseCacheInterceptor', () => {
    let interceptor: ResponseCacheInterceptor;

    beforeEach(() => {
      interceptor = new ResponseCacheInterceptor({
        get: (key: string) => {
          const config: Record<string, any> = {
            'performance.responseCacheEnabled': true,
            'performance.responseCacheTtl': 30,
            'performance.responseCacheMaxSize': 100,
          };
          return config[key];
        },
      } as ConfigService);
    });

    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should report stats', () => {
      const stats = interceptor.getStats();
      expect(stats.memorySize).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.hitRate).toBe('0%');
    });

    it('should flush cache', async () => {
      await interceptor.flushAll();
      const stats = interceptor.getStats();
      expect(stats.memorySize).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  7. Database Indexes Verification
  // ═══════════════════════════════════════════════════════════
  describe('Database Indexes', () => {
    it('should define the migration class', () => {
      // Import the migration
      const migration = require('../src/migrations/1700000000001-PerformanceIndexes');
      const instance = new migration.PerformanceIndexes1700000000001();
      expect(instance).toBeDefined();
      expect(instance.up).toBeDefined();
      expect(instance.down).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  8. Performance Configuration
  // ═══════════════════════════════════════════════════════════
  describe('Performance Configuration', () => {
    it('should include performance config keys', () => {
      const configuration = require('../src/config/configuration').default;
      const config = configuration();

      expect(config.performance).toBeDefined();
      expect(config.performance.slowQueryEnabled).toBeDefined();
      expect(config.performance.responseCacheEnabled).toBeDefined();
      expect(config.performance.compressionEnabled).toBeDefined();
      expect(config.performance.profilingEnabled).toBeDefined();
      expect(config.performance.poolMonitoringEnabled).toBeDefined();
    });

    it('should include database pool config keys', () => {
      const configuration = require('../src/config/configuration').default;
      const config = configuration();

      expect(config.database.poolSize).toBeDefined();
      expect(config.database.poolMax).toBeDefined();
      expect(config.database.poolMin).toBeDefined();
      expect(config.database.poolIdleTimeout).toBeDefined();
      expect(config.database.poolConnectionTimeout).toBeDefined();
      expect(config.database.statementTimeout).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  9. Integration: Full Performance Module
  // ═══════════════════════════════════════════════════════════
  describe('Performance Module Integration', () => {
    it('should export all services from barrel', () => {
      const barrel = require('../src/modules/performance');
      expect(barrel.SlowQueryLoggerService).toBeDefined();
      expect(barrel.PerformanceProfilingService).toBeDefined();
      expect(barrel.ConnectionPoolService).toBeDefined();
      expect(barrel.ResponseCacheInterceptor).toBeDefined();
      expect(barrel.CompressionInterceptor).toBeDefined();
      expect(barrel.PerformanceModule).toBeDefined();
      expect(barrel.encodeCursor).toBeDefined();
      expect(barrel.decodeCursor).toBeDefined();
      expect(barrel.createCursorPage).toBeDefined();
      expect(barrel.createOffsetPage).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  10. Load Test Script Verification
  // ═══════════════════════════════════════════════════════════
  describe('Load Test Scripts', () => {
    it('should have baseline load test script', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../load-tests/performance-baseline.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    it('should have database stress test script', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptPath = path.join(__dirname, '../load-tests/database-stress.js');
      expect(fs.existsSync(scriptPath)).toBe(true);
    });
  });
});
