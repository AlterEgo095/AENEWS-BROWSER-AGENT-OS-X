/**
 * AENEWS Agent OS X — Connector Health Module
 *
 * NestJS module that provides connector health monitoring.
 *
 * Provides:
 *   - ConnectorHealthService: Periodic health checks for all connectors
 *   - ConnectorHealthController: REST API for health/status endpoints
 *
 * Endpoints:
 *   GET /api/v1/connectors/health       — All connectors health
 *   GET /api/v1/connectors/health/:name  — Specific connector health
 *   GET /api/v1/connectors/status        — Summary (real vs simulation)
 *   POST /api/v1/connectors/health/check — Trigger immediate health check
 */

import { Module } from '@nestjs/common';
import { ConnectorHealthService } from './connector-health.service';
import { ConnectorHealthController } from './connector-health.controller';
import { AgentFrameworkModule } from '../../agent-framework/agent-framework.module';

@Module({
  imports: [AgentFrameworkModule],
  providers: [ConnectorHealthService],
  controllers: [ConnectorHealthController],
  exports: [ConnectorHealthService],
})
export class ConnectorHealthModule {}
