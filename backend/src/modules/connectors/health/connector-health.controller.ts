/**
 * AENEWS Agent OS X — Connector Health Controller
 *
 * REST API endpoints for connector health monitoring.
 *
 * Endpoints:
 *   GET /api/v1/connectors/health      — All connectors health
 *   GET /api/v1/connectors/health/:name — Specific connector health
 *   GET /api/v1/connectors/status       — Summary (which are real vs simulation)
 */

import { Controller, Get, Param, Post } from '@nestjs/common';
import { ConnectorHealthService } from './connector-health.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Connectors')
@Controller('api/v1/connectors')
export class ConnectorHealthController {
  constructor(private readonly healthService: ConnectorHealthService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get health status of all connectors' })
  @ApiResponse({ status: 200, description: 'Health status of all connectors' })
  getAllHealth() {
    return {
      connectors: this.healthService.getAllHealth(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/:name')
  @ApiOperation({ summary: 'Get health status of a specific connector' })
  @ApiResponse({ status: 200, description: 'Health status of the specified connector' })
  getConnectorHealth(@Param('name') name: string) {
    const health = this.healthService.getConnectorHealth(name);

    if (!health) {
      return {
        error: `Connector "${name}" not found`,
        availableConnectors: this.healthService.getAllHealth().map((h) => h.name),
      };
    }

    return {
      connector: health,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get connector status summary (real vs simulation)' })
  @ApiResponse({ status: 200, description: 'Connector status summary' })
  getConnectorStatuses() {
    const statuses = this.healthService.getConnectorStatuses();

    return {
      connectors: statuses,
      summary: {
        total: statuses.length,
        real: statuses.filter((s) => s.mode === 'real').length,
        simulation: statuses.filter((s) => s.mode === 'simulation').length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('health/check')
  @ApiOperation({ summary: 'Trigger an immediate health check for all connectors' })
  @ApiResponse({ status: 200, description: 'Health check results' })
  async checkNow() {
    const results = await this.healthService.checkNow();
    return {
      connectors: results,
      timestamp: new Date().toISOString(),
    };
  }
}
