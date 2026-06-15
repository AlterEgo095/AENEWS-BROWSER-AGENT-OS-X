/**
 * AENEWS Agent OS X — Phase 13: Performance Controller
 *
 * REST API for performance monitoring, profiling, and optimization.
 * All endpoints require admin role and are IP-whitelist protected.
 */

import {
  Controller,
  Get,
  Delete,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { SlowQueryLoggerService } from '../services/slow-query-logger.service';
import { PerformanceProfilingService } from '../services/performance-profiling.service';
import { ConnectionPoolService } from '../services/connection-pool.service';
import { ResponseCacheInterceptor } from '../interceptors/response-cache.interceptor';
import { CompressionInterceptor } from '../interceptors/compression.interceptor';

@Controller('performance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class PerformanceController {
  constructor(
    private readonly slowQueryLogger: SlowQueryLoggerService,
    private readonly profiling: PerformanceProfilingService,
    private readonly poolService: ConnectionPoolService,
    private readonly responseCache: ResponseCacheInterceptor,
    private readonly compression: CompressionInterceptor,
  ) {}

  // ═══════════════════════════════════════════════════════════
  //  Performance Overview
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /api/v1/performance/overview
   * Comprehensive performance overview with all subsystems.
   */
  @Get('overview')
  getOverview() {
    return {
      profiling: this.profiling.getReport(),
      slowQueries: this.slowQueryLogger.getStats(),
      pools: this.poolService.getPoolStats(),
      cache: this.responseCache.getStats(),
      compression: this.compression.getStats(),
      poolRecommendations: this.poolService.getRecommendations(),
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  Profiling Endpoints
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /api/v1/performance/profiling/report
   * Detailed performance profiling report.
   */
  @Get('profiling/report')
  getProfilingReport() {
    return this.profiling.getReport();
  }

  /**
   * GET /api/v1/performance/profiling/memory
   * Memory statistics with heap details.
   */
  @Get('profiling/memory')
  getMemoryStats() {
    return this.profiling.getMemoryStats();
  }

  /**
   * GET /api/v1/performance/profiling/spans
   * Active profiling spans.
   */
  @Get('profiling/spans')
  getActiveSpans() {
    return {
      spans: this.profiling.getActiveSpans(),
      count: this.profiling.getActiveSpans().length,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  Slow Query Endpoints
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /api/v1/performance/slow-queries
   * Recent slow queries with optional filters.
   */
  @Get('slow-queries')
  getSlowQueries(
    @Query('limit') limit?: string,
    @Query('minDurationMs') minDurationMs?: string,
    @Query('schema') schema?: string,
  ) {
    return {
      queries: this.slowQueryLogger.getRecentQueries({
        limit: limit ? parseInt(limit, 10) : 50,
        minDurationMs: minDurationMs ? parseInt(minDurationMs, 10) : undefined,
        schema,
      }),
      stats: this.slowQueryLogger.getStats(),
    };
  }

  /**
   * DELETE /api/v1/performance/slow-queries
   * Clear slow query log.
   */
  @Delete('slow-queries')
  clearSlowQueries() {
    this.slowQueryLogger.clearLog();
    return { message: 'Slow query log cleared' };
  }

  // ═══════════════════════════════════════════════════════════
  //  Connection Pool Endpoints
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /api/v1/performance/pools
   * Connection pool statistics and health.
   */
  @Get('pools')
  getPoolStats() {
    return {
      pools: this.poolService.getPoolStats(),
      recommendations: this.poolService.getRecommendations(),
    };
  }

  /**
   * GET /api/v1/performance/pools/recommendations
   * Pool sizing recommendations.
   */
  @Get('pools/recommendations')
  getPoolRecommendations() {
    return {
      recommendations: this.poolService.getRecommendations(),
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  Cache Endpoints
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /api/v1/performance/cache/stats
   * Response cache statistics.
   */
  @Get('cache/stats')
  getCacheStats() {
    return this.responseCache.getStats();
  }

  /**
   * DELETE /api/v1/performance/cache/:pattern
   * Invalidate cache entries matching pattern.
   */
  @Post('cache/invalidate')
  async invalidateCache(@Query('pattern') pattern: string) {
    const count = await this.responseCache.invalidate(pattern || '*');
    return { invalidated: count, pattern: pattern || '*' };
  }

  /**
   * DELETE /api/v1/performance/cache
   * Flush all cached entries.
   */
  @Delete('cache')
  async flushCache() {
    await this.responseCache.flushAll();
    return { message: 'All cache entries flushed' };
  }

  // ═══════════════════════════════════════════════════════════
  //  Compression Endpoints
  // ═══════════════════════════════════════════════════════════

  /**
   * GET /api/v1/performance/compression/stats
   * Compression statistics.
   */
  @Get('compression/stats')
  getCompressionStats() {
    return this.compression.getStats();
  }
}
