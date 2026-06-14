/**
 * AENEWS Agent OS X — Metrics Controller
 *
 * Exposes Prometheus scrape and JSON metrics endpoints.
 * These endpoints are intentionally public (no auth) so that
 * Prometheus scrapers can access them without authentication.
 */

import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './services/metrics.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('metrics')
@Public()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * GET /api/v1/metrics — Prometheus scrape endpoint
   *
   * Returns metrics in Prometheus exposition text format.
   * This is the standard endpoint that Prometheus scrapers poll.
   */
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  /**
   * GET /api/v1/metrics/json — JSON format for dashboards
   *
   * Returns all metrics in a structured JSON format suitable for
   * custom dashboards, debugging, and monitoring UIs.
   */
  @Get('json')
  async getMetricsJson(): Promise<Record<string, any>> {
    return this.metricsService.getMetricsJson();
  }
}
