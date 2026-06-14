/**
 * AENEWS Agent OS X — Phase 13: Performance Module
 *
 * Comprehensive performance optimization, profiling, and monitoring.
 * Provides:
 *   - Database query optimization (slow query logger, indexes)
 *   - Response caching with Redis + memory LRU
 *   - Response compression (gzip)
 *   - Connection pool monitoring (PG, Redis, Neo4j, HTTP)
 *   - Performance profiling (CPU, memory, event loop, spans)
 *   - Cursor-based pagination utilities
 *   - REST API for performance observability
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SlowQueryLoggerService } from './services/slow-query-logger.service';
import { PerformanceProfilingService } from './services/performance-profiling.service';
import { ConnectionPoolService } from './services/connection-pool.service';
import { ResponseCacheInterceptor } from './interceptors/response-cache.interceptor';
import { CompressionInterceptor } from './interceptors/compression.interceptor';
import { PerformanceController } from './controllers/performance.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [PerformanceController],
  providers: [
    // Services
    SlowQueryLoggerService,
    PerformanceProfilingService,
    ConnectionPoolService,

    // Interceptors (also available as providers for manual use)
    ResponseCacheInterceptor,
    CompressionInterceptor,
  ],
  exports: [
    // Export all services for use in other modules
    SlowQueryLoggerService,
    PerformanceProfilingService,
    ConnectionPoolService,
    ResponseCacheInterceptor,
    CompressionInterceptor,
  ],
})
export class PerformanceModule {}
