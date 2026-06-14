/**
 * AENEWS Agent OS X — Observability Module
 *
 * Global module that provides Prometheus metrics and OpenTelemetry tracing
 * to all other modules in the application.
 *
 * Provides:
 *   - MetricsService — Prometheus counters, histograms, and gauges
 *   - Prometheus scrape endpoint at GET /api/v1/metrics
 *   - JSON metrics endpoint at GET /api/v1/metrics/json
 */

import { Global, Module } from '@nestjs/common';
import { MetricsService } from './services/metrics.service';
import { MetricsController } from './metrics.controller';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class ObservabilityModule {}
