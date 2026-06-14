/**
 * AENEWS Agent OS X — Intelligent Orchestration Controller
 *
 * Phase 8 — REST API endpoints for multi-agent collaboration,
 * mission decomposition, cross-cluster coordination, and
 * unified connector management.
 *
 * SECURITY: All @Body() params use proper DTOs with class-validator decorators.
 * NestJS ValidationPipe only validates class instances, not inline types.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { TenantScoped } from '../../tenant/decorators/tenant-scoped.decorator';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { RateLimit, RateLimitDomain } from '../decorators/rate-limit.decorator';
import { AgentCollaborationService } from '../services/agent-collaboration.service';
import { MissionDecompositionService } from '../services/mission-decomposition.service';
import { CrossClusterCoordinatorService, ClusterTask } from '../services/cross-cluster-coordinator.service';
import { UnifiedConnectorRegistryService } from '../services/unified-connector-registry.service';
import { ConnectorAwareExecutionService } from '../services/connector-aware-execution.service';
import { ClusterType } from '../../agent/entities/agent.entity';
import {
  CollaborateDto,
  DecomposeDto,
  CoordinateDto,
  ExecuteConnectorDto,
} from '../dto/orchestration.dto';

// ─── Controller ──────────────────────────────────────────────────

@Controller('orchestration')
@ApiTags('Orchestration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR)
@TenantScoped()
export class OrchestrationController {
  constructor(
    private readonly collaborationService: AgentCollaborationService,
    private readonly decompositionService: MissionDecompositionService,
    private readonly coordinatorService: CrossClusterCoordinatorService,
    private readonly connectorRegistry: UnifiedConnectorRegistryService,
    private readonly connectorExecution: ConnectorAwareExecutionService,
  ) {}

  // ─── Collaboration ────────────────────────────────────────────

  @Post('collaborate')
  @HttpCode(HttpStatus.OK)
  @RateLimitDomain('cluster')
  @RateLimit({ points: 10, duration: 60, blockDuration: 120 })
  async collaborate(@Body() dto: CollaborateDto) {
    const result = await this.collaborationService.collaborate({
      id: `collab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      pattern: dto.pattern,
      description: dto.description,
      objectives: dto.objectives,
      requiredCapabilities: dto.requiredCapabilities,
      preferredClusters: dto.preferredClusters,
      constraints: {
        maxAgents: dto.maxAgents,
        maxDurationMs: dto.maxDurationMs,
        allowPartialResults: dto.allowPartialResults,
      },
    });

    return {
      success: result.status === 'completed',
      data: {
        collaborationId: result.collaborationId,
        pattern: result.pattern,
        status: result.status,
        agentCount: result.agentCount,
        successCount: result.successCount,
        failureCount: result.failureCount,
        durationMs: result.durationMs,
        mergedResult: result.mergedResult,
        consensusScore: result.consensusScore,
      },
    };
  }

  @Get('collaborate/:id')
  getCollaborationStatus(@Param('id') id: string) {
    const status = this.collaborationService.getCollaborationStatus(id);
    return { collaborationId: id, status: status ?? 'not_found' };
  }

  @Delete('collaborate/:id')
  async cancelCollaboration(@Param('id') id: string) {
    const cancelled = await this.collaborationService.cancelCollaboration(id);
    return { collaborationId: id, cancelled };
  }

  // ─── Decomposition ────────────────────────────────────────────

  @Post('decompose')
  @HttpCode(HttpStatus.OK)
  @RateLimitDomain('cluster')
  @RateLimit({ points: 10, duration: 60, blockDuration: 120 })
  async decompose(@Body() dto: DecomposeDto) {
    const result = await this.decompositionService.decompose({
      missionId: dto.missionId,
      description: dto.description,
      objectives: dto.objectives,
      priority: dto.priority,
      maxSubtasks: dto.maxSubtasks,
      requiredCapabilities: dto.requiredCapabilities,
    });

    return {
      success: true,
      data: {
        missionId: result.missionId,
        strategy: result.strategy,
        subtaskCount: result.subtasks.length,
        subtasks: result.subtasks.map((s) => ({
          id: s.id,
          description: s.description,
          requiredCapabilities: s.requiredCapabilities,
          preferredCluster: s.preferredCluster,
          dependencies: s.dependencies,
          priority: s.priority,
          complexity: s.complexity,
          canParallelize: s.canParallelize,
          estimatedDurationMs: s.estimatedDurationMs,
        })),
        executionOrder: result.executionOrder,
        qualityScore: result.qualityScore,
        crossClusterDependencies: result.crossClusterDependencies,
        totalEstimatedDurationMs: result.totalEstimatedDurationMs,
      },
    };
  }

  // ─── Cross-Cluster Coordination ───────────────────────────────

  @Post('coordinate')
  @HttpCode(HttpStatus.OK)
  async coordinate(@Body() dto: CoordinateDto) {
    const tasks: ClusterTask[] = dto.tasks.map((t, i) => ({
      id: `task_${i + 1}`,
      cluster: t.cluster,
      description: t.description,
      requiredCapabilities: t.requiredCapabilities,
      priority: t.priority,
      timeoutMs: t.timeoutMs ?? 30_000,
    }));

    const result = await this.coordinatorService.coordinate(tasks);

    return {
      success: result.successCount > 0,
      data: {
        planId: result.planId,
        pattern: result.pattern,
        totalDurationMs: result.totalDurationMs,
        successCount: result.successCount,
        failureCount: result.failureCount,
        results: result.results.map((r) => ({
          taskId: r.taskId,
          cluster: r.cluster,
          agentKey: r.agentKey,
          success: r.success,
          error: r.error,
          durationMs: r.durationMs,
        })),
        clusterMetrics: result.clusterMetrics,
      },
    };
  }

  // ─── Cluster Health ───────────────────────────────────────────

  @Get('cluster-health')
  getClusterHealth() {
    return {
      success: true,
      data: this.coordinatorService.getClusterHealth(),
    };
  }

  // ─── Unified Connectors ───────────────────────────────────────

  @Get('connectors')
  getConnectors() {
    return {
      success: true,
      data: {
        connectors: this.connectorRegistry.listAllConnectors(),
        statistics: this.connectorRegistry.getStatistics(),
      },
    };
  }

  @Get('connectors/health')
  async getConnectorHealth() {
    const health = await this.connectorRegistry.checkAllHealth();
    return { success: true, data: health };
  }

  @Post('connectors/execute')
  @HttpCode(HttpStatus.OK)
  async executeConnector(@Body() dto: ExecuteConnectorDto) {
    const result = await this.connectorExecution.execute({
      connectorName: dto.connectorName,
      connectorAction: dto.action,
      connectorParams: dto.params,
      tryLLMOnConnectorFailure: false,
    });

    return {
      success: result.success,
      data: result.data,
      error: result.error,
      source: result.source,
      durationMs: result.durationMs,
    };
  }

  // ─── Statistics ───────────────────────────────────────────────

  @Get('statistics')
  getStatistics() {
    return {
      success: true,
      data: {
        connectors: this.connectorRegistry.getStatistics(),
        connectorExecution: this.connectorExecution.getStatistics(),
        collaborationHistory: this.collaborationService.getHistory(10).length,
        coordinationHistory: this.coordinatorService.getHistory(10).length,
        decompositionHistory: this.decompositionService.getHistory(10).length,
      },
    };
  }

  // ─── History ──────────────────────────────────────────────────

  @Get('history')
  getHistory(@Query('type') type?: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;

    switch (type) {
      case 'collaboration':
        return { success: true, data: this.collaborationService.getHistory(parsedLimit) };
      case 'coordination':
        return { success: true, data: this.coordinatorService.getHistory(parsedLimit) };
      case 'decomposition':
        return { success: true, data: this.decompositionService.getHistory(parsedLimit) };
      default:
        return {
          success: true,
          data: {
            collaboration: this.collaborationService.getHistory(parsedLimit),
            coordination: this.coordinatorService.getHistory(parsedLimit),
            decomposition: this.decompositionService.getHistory(parsedLimit),
          },
        };
    }
  }
}
