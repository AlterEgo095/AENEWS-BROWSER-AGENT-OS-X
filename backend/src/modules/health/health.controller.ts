import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckResult } from '@nestjs/terminus';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HealthCheck()
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({
    summary: 'Full health check',
    description:
      'Returns the comprehensive health status of all system components including database, Redis, memory, disk, and agent system. ' +
      'This endpoint performs deep health checks and may take a few seconds to complete. ' +
      'Use this for monitoring dashboards and alerting systems.',
  })
  @ApiResponse({
    status: 200,
    description: 'All health checks passed — system is fully operational',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
                host: { type: 'string', example: 'localhost' },
                port: { type: 'number', example: 6379 },
                ping: { type: 'string', example: 'PONG' },
                version: { type: 'string', example: '7.2.4' },
                usedMemoryHuman: { type: 'string', example: '1.23M' },
                connectedClients: { type: 'number', example: 5 },
                keyCount: { type: 'number', example: 128 },
              },
            },
            memory_heap: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            memory_rss: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            disk: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
            agent_system: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
                agentRegistry: {
                  type: 'object',
                  properties: {
                    initialized: { type: 'boolean', example: true },
                    registeredAgents: { type: 'number', example: 12 },
                    lastSyncAt: { type: 'string', example: '2025-01-15T10:30:00.000Z' },
                  },
                },
                queueSystem: {
                  type: 'object',
                  properties: {
                    connected: { type: 'boolean', example: true },
                    pendingJobs: { type: 'number', example: 3 },
                    activeWorkers: { type: 'number', example: 5 },
                  },
                },
              },
            },
          },
        },
        error: { type: 'object', nullable: true },
        details: {
          type: 'object',
          properties: {
            database: { type: 'object' },
            redis: { type: 'object' },
            memory_heap: { type: 'object' },
            memory_rss: { type: 'object' },
            disk: { type: 'object' },
            agent_system: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description:
      'One or more health checks failed — system is degraded or unavailable',
  })
  async check(): Promise<HealthCheckResult> {
    return this.healthService.checkFull();
  }

  @Get('ready')
  @HealthCheck()
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Lightweight readiness check for Kubernetes/container orchestration. ' +
      'Verifies that critical services (database, Redis, agent system) are connected and ready to accept traffic. ' +
      'Memory and disk checks are excluded for faster response.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to accept traffic',
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready — critical dependencies unavailable',
  })
  async readiness(): Promise<HealthCheckResult> {
    return this.healthService.checkReadiness();
  }

  @Get('live')
  @HealthCheck()
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Ultra-lightweight liveness check for Kubernetes/container orchestration. ' +
      'Only checks process memory to verify the application is responsive and not leaking memory. ' +
      'Does not check external dependencies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Process is alive and responsive',
  })
  @ApiResponse({
    status: 503,
    description: 'Process is unresponsive or memory is critically low',
  })
  async liveness(): Promise<HealthCheckResult> {
    return this.healthService.checkLiveness();
  }
}
