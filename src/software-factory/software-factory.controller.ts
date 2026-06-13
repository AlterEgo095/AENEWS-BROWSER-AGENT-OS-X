/**
 * AENEWS Software Factory — API Controller
 *
 * REST API for the Capability-driven Software Factory.
 * The Runtime Engine is the main entry point — it executes real missions.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  MissionOrchestratorPipeline,
  MissionRequest,
} from './mission-orchestrator/mission-orchestrator.service';
import { MissionContractService } from './mission-contract/mission-contract.service';
import {
  MissionStateMachineService,
  MissionState,
} from './mission-state-machine/mission-state-machine.service';
import { CapabilityRegistryService } from './capability-registry/capability-registry.service';
import { CapabilityResolverService } from './capability-resolver/capability-resolver.service';
import { WorkerFactoryService } from './worker-factory/worker-factory.service';
import { DeliveryManagerService } from './kernel/kernel-services';
import { MonitoringManagerService } from './kernel/kernel-services';
import { MissionArchiveService } from './archive/mission-archive.service';
import { MissionRuntimeEngine, RuntimeResult } from './runtime/mission-runtime.engine';
import {
  MissionMetricsService,
  MissionCategory,
  MSR_TARGETS,
} from './runtime/mission-metrics.service';
import { ConnectorRegistry } from './connectors/connector-registry';
import { ReferenceMissions } from './runtime/reference-missions';
import { CapabilityPack, MissionQuality } from './interfaces';
import * as fs from 'fs';
import * as path from 'path';

@Controller('api/factory')
export class SoftwareFactoryController {
  constructor(
    private readonly runtime: MissionRuntimeEngine,
    private readonly metrics: MissionMetricsService,
    private readonly pipeline: MissionOrchestratorPipeline,
    private readonly contractService: MissionContractService,
    private readonly stateMachine: MissionStateMachineService,
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly capabilityResolver: CapabilityResolverService,
    private readonly workerFactory: WorkerFactoryService,
    private readonly deliveryManager: DeliveryManagerService,
    private readonly archiveService: MissionArchiveService,
    private readonly monitoring: MonitoringManagerService,
    private readonly connectorRegistry: ConnectorRegistry,
  ) {}

  // ═══════════════════════════════════════════════════════════
  //  RUNTIME ENGINE — Real mission execution
  // ═══════════════════════════════════════════════════════════

  /**
   * Execute a mission (REAL execution via Runtime Engine)
   * POST /api/factory/run
   */
  @Post('run')
  @HttpCode(HttpStatus.ACCEPTED)
  async runMission(
    @Body()
    body: {
      instruction: string;
      description?: string;
      quality?: string;
      budgetMaxUsd?: number;
      deadline?: string;
    },
  ) {
    const result = await this.runtime.executeMission({
      instruction: body.instruction,
      description: body.description,
      quality: (body.quality as MissionQuality) || MissionQuality.STANDARD,
      budgetMaxUsd: body.budgetMaxUsd,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
    });

    return {
      success: result.success,
      data: {
        missionId: result.missionId,
        certified: result.certified,
        qualityScore: result.qualityScore,
        totalDurationMs: result.totalDurationMs,
        totalCostUsd: result.totalCostUsd,
        artifacts: result.artifacts.map((a) => ({
          name: a.name,
          type: a.type,
          size: a.size,
          path: a.path,
        })),
        workspaceDir: result.workspaceDir,
        errors: result.errors,
      },
    };
  }

  /**
   * Get runtime mission result
   * GET /api/factory/run/:id
   */
  @Get('run/:id')
  getRuntimeMission(@Param('id') id: string) {
    const mission = this.runtime.getMission(id);
    if (!mission) return { success: false, error: 'Mission not found' };
    return { success: true, data: mission };
  }

  /**
   * Download an artifact file
   * GET /api/factory/run/:id/download/:filename
   */
  @Get('run/:id/download/:filename')
  downloadArtifact(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const workspaceDir = this.runtime.getWorkspaceDir(id);
    if (!workspaceDir) {
      res.status(404).json({ error: 'Mission not found' });
      return;
    }

    // Look for the file in the workspace
    const filePath = path.join(workspaceDir, filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath, filename);
      return;
    }

    // Check for ZIP in download directory
    const zipPath = path.join('/home/z/my-project/download/missions', `${id}.zip`);
    if (filename === `${id}.zip` && fs.existsSync(zipPath)) {
      res.download(zipPath, filename);
      return;
    }

    res.status(404).json({ error: `File not found: ${filename}` });
  }

  /**
   * Download the full mission as ZIP
   * GET /api/factory/run/:id/zip
   */
  @Get('run/:id/zip')
  downloadZip(@Param('id') id: string, @Res() res: Response) {
    const zipPath = path.join('/home/z/my-project/download/missions', `${id}.zip`);
    if (fs.existsSync(zipPath)) {
      res.download(zipPath, `${id}.zip`);
      return;
    }

    const workspaceDir = this.runtime.getWorkspaceDir(id);
    if (!workspaceDir) {
      res.status(404).json({ error: 'Mission not found' });
      return;
    }

    res.status(404).json({ error: 'ZIP not yet generated' });
  }

  // ═══════════════════════════════════════════════════════════
  //  MISSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  /**
   * Submit a mission via the pipeline orchestrator (async)
   * POST /api/factory/missions
   */
  @Post('missions')
  @HttpCode(HttpStatus.ACCEPTED)
  async submitMission(
    @Body()
    body: {
      instruction: string;
      description?: string;
      quality?: string;
      deadline?: string;
      budgetMaxUsd?: number;
      deliverables?: string[];
      tags?: string[];
    },
  ) {
    const request: MissionRequest = {
      instruction: body.instruction,
      description: body.description,
      quality: (body.quality as MissionQuality) || MissionQuality.STANDARD,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
      budgetMaxUsd: body.budgetMaxUsd,
      deliverables: body.deliverables,
      tags: body.tags,
    };
    const execution = await this.pipeline.submitMission(request);
    return { success: true, data: execution };
  }

  @Get('missions')
  getActiveMissions() {
    return {
      success: true,
      data: {
        runtime: this.runtime.getActiveMissions(),
        pipeline: this.pipeline.getActiveMissions(),
      },
    };
  }

  @Get('missions/:id')
  getMissionStatus(@Param('id') id: string) {
    const runtime = this.runtime.getMission(id);
    const pipeline = this.pipeline.getExecution(id);
    return { success: true, data: { runtime, pipeline } };
  }

  @Post('missions/:id/cancel')
  async cancelMission(@Param('id') id: string) {
    const cancelled = await this.pipeline.cancelMission(id);
    return { success: cancelled };
  }

  // ═══════════════════════════════════════════════════════════
  //  CONTRACTS & STATE
  // ═══════════════════════════════════════════════════════════

  @Get('contracts/:id')
  getContract(@Param('id') id: string) {
    const contract = this.contractService.getContract(id);
    if (!contract) return { success: false, error: 'Contract not found' };
    return { success: true, data: contract };
  }

  @Get('missions/:id/timeline')
  getTimeline(@Param('id') id: string) {
    const timeline = this.stateMachine.getTimeline(id);
    if (!timeline) return { success: false, error: 'Timeline not found' };
    return { success: true, data: timeline };
  }

  @Get('missions/:id/transitions')
  getAvailableTransitions(@Param('id') id: string) {
    return { success: true, data: this.stateMachine.getAvailableTransitions(id) };
  }

  // ═══════════════════════════════════════════════════════════
  //  CAPABILITIES
  // ═══════════════════════════════════════════════════════════

  @Get('capabilities')
  getAllCapabilities() {
    return {
      success: true,
      data: {
        total: this.capabilityRegistry.getTotalCount(),
        overview: this.capabilityRegistry.getPackOverview(),
        capabilities: this.capabilityRegistry.getAllCapabilities(),
      },
    };
  }

  @Get('capabilities/pack/:pack')
  getCapabilitiesByPack(@Param('pack') pack: string) {
    const packEnum = Object.values(CapabilityPack).find(
      (p) => p.toLowerCase() === pack.toLowerCase(),
    );
    if (!packEnum) return { success: false, error: `Invalid pack: ${pack}` };
    return { success: true, data: this.capabilityRegistry.getPack(packEnum as CapabilityPack) };
  }

  @Get('capabilities/search')
  searchCapabilities(@Query('q') query: string) {
    return { success: true, data: this.capabilityRegistry.searchByKeyword(query) };
  }

  @Post('capabilities/resolve')
  resolveCapabilities(@Body() body: { mission: string }) {
    const resolution = this.capabilityResolver.resolve({
      missionId: `preview-${Date.now()}`,
      instruction: body.mission,
    });
    return { success: true, data: resolution };
  }

  // ═══════════════════════════════════════════════════════════
  //  WORKERS
  // ═══════════════════════════════════════════════════════════

  @Get('workers/stats')
  getWorkerStats() {
    return { success: true, data: this.workerFactory.getStatistics() };
  }

  // ═══════════════════════════════════════════════════════════
  //  ARCHIVES & STATS
  // ═══════════════════════════════════════════════════════════

  @Get('archives/:id')
  getArchive(@Param('id') id: string) {
    const archive = this.archiveService.getArchive(id);
    if (!archive) return { success: false, error: 'Archive not found' };
    return { success: true, data: archive };
  }

  @Get('archives')
  searchArchives(
    @Query('result') result?: 'success' | 'partial' | 'failed',
    @Query('minQuality') minQuality?: number,
    @Query('maxCost') maxCost?: number,
  ) {
    return {
      success: true,
      data: this.archiveService.searchArchives({
        result,
        minQuality: minQuality ? Number(minQuality) : undefined,
        maxCost: maxCost ? Number(maxCost) : undefined,
      }),
    };
  }

  @Get('stats')
  getFactoryStats() {
    const missionsByState: Record<string, number> = {};
    for (const state of Object.values(MissionState)) {
      missionsByState[state] = this.stateMachine.getMissionsInState(state as MissionState).length;
    }

    return {
      success: true,
      data: {
        architecture: {
          concepts: 3,
          concepts_list: ['Mission', 'Capability', 'Worker'],
          kernel_services: 10,
          capability_packs: 6,
          total_capabilities: this.capabilityRegistry.getTotalCount(),
          runtime_engine: 'ACTIVE',
          connectors: this.connectorRegistry.getStatistics(),
        },
        activeMissions: this.runtime.getActiveMissions().length,
        completedMissions: this.runtime.getCompletedMissions().length,
        workerPool: this.workerFactory.getStatistics(),
        archiveStats: this.archiveService.getStatistics(),
        systemHealth: this.monitoring.getSystemHealth(),
        missionsByState,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  METRICS & MSR — KPI #1 = Mission Success Rate
  // ═══════════════════════════════════════════════════════════

  /**
   * Get Mission Success Rate (MSR) — THE KPI
   * GET /api/factory/metrics/msr
   */
  @Get('metrics/msr')
  getMSR() {
    const aggregate = this.metrics.getAggregate();
    return {
      success: true,
      data: {
        msr: aggregate.msr,
        msrPercent: `${(aggregate.msr * 100).toFixed(1)}%`,
        totalMissions: aggregate.totalMissions,
        successes: aggregate.successes,
        certified: aggregate.certified,
        certificationRate: aggregate.certificationRate,
        currentTarget: this.metrics.getCurrentMsrTarget(),
        msrTargets: MSR_TARGETS,
        msrGap: aggregate.msrGap,
        trend: aggregate.recentTrend,
      },
    };
  }

  /**
   * Get full aggregate metrics dashboard
   * GET /api/factory/metrics
   */
  @Get('metrics')
  getMetrics(@Query('category') category?: string) {
    if (category) {
      const catMetrics = this.metrics.getByCategory(category as MissionCategory);
      return { success: true, data: { category, missions: catMetrics } };
    }
    return { success: true, data: this.metrics.getAggregate() };
  }

  /**
   * Get recent mission metrics
   * GET /api/factory/metrics/recent
   */
  @Get('metrics/recent')
  getRecentMetrics(@Query('count') count?: string) {
    const n = count ? parseInt(count) : 20;
    return { success: true, data: this.metrics.getRecent(n) };
  }

  /**
   * Get failed missions for analysis
   * GET /api/factory/metrics/failures
   */
  @Get('metrics/failures')
  getFailures() {
    return { success: true, data: this.metrics.getFailures() };
  }

  /**
   * Get slowest missions
   * GET /api/factory/metrics/slowest
   */
  @Get('metrics/slowest')
  getSlowest(@Query('count') count?: string) {
    const n = count ? parseInt(count) : 10;
    return { success: true, data: this.metrics.getSlowest(n) };
  }

  /**
   * Get lowest quality missions
   * GET /api/factory/metrics/lowest-quality
   */
  @Get('metrics/lowest-quality')
  getLowestQuality(@Query('count') count?: string) {
    const n = count ? parseInt(count) : 10;
    return { success: true, data: this.metrics.getLowestQuality(n) };
  }

  // ═══════════════════════════════════════════════════════════
  //  CONNECTORS — Sprint 2: Real Connectors
  // ═══════════════════════════════════════════════════════════

  /**
   * Get connector registry statistics
   * GET /api/factory/connectors
   */
  @Get('connectors')
  getConnectorStats() {
    return {
      success: true,
      data: {
        ...this.connectorRegistry.getStatistics(),
        workerFactoryConnectors: this.workerFactory.getConnectorStats(),
      },
    };
  }

  /**
   * Test a specific connector with a sample input
   * POST /api/factory/connectors/test
   */
  @Post('connectors/test')
  async testConnector(
    @Body() body: { capabilityId: string; instruction: string; parameters?: Record<string, any> },
  ) {
    const capId = body.capabilityId as any;
    const connector = this.connectorRegistry.getConnector(capId);

    if (!connector) {
      return { success: false, error: `No connector for capability: ${body.capabilityId}` };
    }

    const missionId = `test-${Date.now()}`;
    const workspaceDir = `/home/z/my-project/download/missions/${missionId}`;
    this.workerFactory.setMissionWorkspace(missionId, workspaceDir);

    try {
      const result = await connector.execute(capId, {
        missionId,
        instruction: body.instruction,
        workspaceDir,
        parameters: body.parameters || {},
        previousResults: new Map(),
        tools: [],
      });

      return {
        success: result.success,
        data: {
          connector: connector.constructor.name,
          durationMs: result.durationMs,
          costUsd: result.costUsd,
          artifactCount: result.artifacts.length,
          artifacts: result.artifacts.map((a) => ({ name: a.name, type: a.type, size: a.size })),
          output:
            typeof result.output === 'object'
              ? JSON.stringify(result.output).substring(0, 1000)
              : result.output,
          error: result.error,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  REFERENCE MISSIONS — The 100 validation missions
  // ═══════════════════════════════════════════════════════════

  /**
   * Get all reference missions
   * GET /api/factory/reference-missions
   */
  @Get('reference-missions')
  getReferenceMissions(
    @Query('pack') pack?: string,
    @Query('difficulty') difficulty?: string,
    @Query('category') category?: string,
  ) {
    let missions = ReferenceMissions.ALL;
    if (pack) missions = ReferenceMissions.getByPack(pack as any);
    if (difficulty) missions = ReferenceMissions.getByDifficulty(difficulty as any);
    if (category) missions = ReferenceMissions.getByCategory(category as MissionCategory);

    return {
      success: true,
      data: {
        total: missions.length,
        stats: ReferenceMissions.getStats(),
        missions,
      },
    };
  }

  /**
   * Get reference mission stats
   * GET /api/factory/reference-missions/stats
   */
  @Get('reference-missions/stats')
  getReferenceMissionStats() {
    return { success: true, data: ReferenceMissions.getStats() };
  }
}
