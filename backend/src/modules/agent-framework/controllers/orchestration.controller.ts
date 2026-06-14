/**
 * AENEWS Agent OS X — Intelligent Orchestration Controller
 *
 * Phase 8 — REST API endpoints for multi-agent collaboration,
 * mission decomposition, cross-cluster coordination, and
 * unified connector management.
 *
 * Endpoints:
 *   POST   /api/v1/orchestration/collaborate         — Start a multi-agent collaboration
 *   GET    /api/v1/orchestration/collaborate/:id      — Get collaboration status
 *   DELETE /api/v1/orchestration/collaborate/:id      — Cancel collaboration
 *   POST   /api/v1/orchestration/decompose            — Decompose a mission
 *   POST   /api/v1/orchestration/coordinate           — Cross-cluster coordination
 *   GET    /api/v1/orchestration/cluster-health        — Cluster health overview
 *   GET    /api/v1/orchestration/connectors            — Unified connector list
 *   GET    /api/v1/orchestration/connectors/health     — Connector health check
 *   POST   /api/v1/orchestration/connectors/execute    — Execute via unified connector
 *   GET    /api/v1/orchestration/statistics            — Orchestration statistics
 *   GET    /api/v1/orchestration/history               — Execution history
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
} from '@nestjs/common';
import { AgentCollaborationService, CollaborationPattern } from '../services/agent-collaboration.service';
import { MissionDecompositionService } from '../services/mission-decomposition.service';
import { CrossClusterCoordinatorService, ClusterTask } from '../services/cross-cluster-coordinator.service';
import { UnifiedConnectorRegistryService } from '../services/unified-connector-registry.service';
import { ConnectorAwareExecutionService } from '../services/connector-aware-execution.service';
import { ClusterType } from '../../agent/entities/agent.entity';

// ─── DTOs ───────────────────────────────────────────────────────

export class CollaborateDto {
  pattern: CollaborationPattern;
  description: string;
  objectives: string[];
  requiredCapabilities?: string[];
  preferredClusters?: ClusterType[];
  maxAgents?: number;
  maxDurationMs?: number;
  allowPartialResults?: boolean;
}

export class DecomposeDto {
  missionId: string;
  description: string;
  objectives?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  maxSubtasks?: number;
  requiredCapabilities?: string[];
}

export class CoordinateDto {
  tasks: Array<{
    cluster: ClusterType;
    description: string;
    requiredCapabilities: string[];
    priority: number;
    timeoutMs?: number;
  }>;
}

export class ExecuteConnectorDto {
  connectorName: string;
  action: string;
  params?: Record<string, any>;
}

// ─── Controller ──────────────────────────────────────────────────

@Controller('api/v1/orchestration')
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
