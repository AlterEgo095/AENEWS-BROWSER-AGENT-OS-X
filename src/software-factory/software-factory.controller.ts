/**
 * AENEWS Software Factory — API Controller
 * 
 * REST API for the Capability-driven Software Factory.
 * 
 * 3 concepts: Mission, Capabilities, Workers
 * 64 capabilities in 6 packs, 10 kernel services, ephemeral workers
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
} from '@nestjs/common';
import { MissionOrchestratorPipeline, MissionRequest } from './mission-orchestrator/mission-orchestrator.service';
import { MissionContractService } from './mission-contract/mission-contract.service';
import { MissionStateMachineService, MissionState } from './mission-state-machine/mission-state-machine.service';
import { CapabilityRegistryService } from './capability-registry/capability-registry.service';
import { CapabilityResolverService } from './capability-resolver/capability-resolver.service';
import { WorkerFactoryService } from './worker-factory/worker-factory.service';
import { DeliveryManagerService } from './kernel/kernel-services';
import { MissionArchiveService } from './archive/mission-archive.service';
import { MonitoringManagerService } from './kernel/kernel-services';
import { CapabilityPack, MissionQuality } from './interfaces';

@Controller('api/factory')
export class SoftwareFactoryController {
  constructor(
    private readonly pipeline: MissionOrchestratorPipeline,
    private readonly contractService: MissionContractService,
    private readonly stateMachine: MissionStateMachineService,
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly capabilityResolver: CapabilityResolverService,
    private readonly workerFactory: WorkerFactoryService,
    private readonly deliveryManager: DeliveryManagerService,
    private readonly archiveService: MissionArchiveService,
    private readonly monitoring: MonitoringManagerService,
  ) {}

  /**
   * Submit a new mission
   * POST /api/factory/missions
   */
  @Post('missions')
  @HttpCode(HttpStatus.ACCEPTED)
  async submitMission(@Body() body: {
    instruction: string;
    description?: string;
    quality?: string;
    deadline?: string;
    budgetMaxUsd?: number;
    deliverables?: string[];
    tags?: string[];
  }) {
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

  /**
   * Get active missions
   * GET /api/factory/missions
   */
  @Get('missions')
  getActiveMissions() {
    return { success: true, data: this.pipeline.getActiveMissions() };
  }

  /**
   * Get mission execution status
   * GET /api/factory/missions/:id
   */
  @Get('missions/:id')
  getMissionStatus(@Param('id') id: string) {
    const execution = this.pipeline.getExecution(id);
    if (!execution) return { success: false, error: 'Mission not found' };
    return { success: true, data: execution };
  }

  /**
   * Cancel a mission
   * POST /api/factory/missions/:id/cancel
   */
  @Post('missions/:id/cancel')
  async cancelMission(@Param('id') id: string) {
    const cancelled = await this.pipeline.cancelMission(id);
    return { success: cancelled };
  }

  /**
   * Get mission contract
   * GET /api/factory/contracts/:id
   */
  @Get('contracts/:id')
  getContract(@Param('id') id: string) {
    const contract = this.contractService.getContract(id);
    if (!contract) return { success: false, error: 'Contract not found' };
    return { success: true, data: contract };
  }

  /**
   * Get mission timeline
   * GET /api/factory/missions/:id/timeline
   */
  @Get('missions/:id/timeline')
  getTimeline(@Param('id') id: string) {
    const timeline = this.stateMachine.getTimeline(id);
    if (!timeline) return { success: false, error: 'Timeline not found' };
    return { success: true, data: timeline };
  }

  /**
   * Get available transitions for a mission
   * GET /api/factory/missions/:id/transitions
   */
  @Get('missions/:id/transitions')
  getAvailableTransitions(@Param('id') id: string) {
    return { success: true, data: this.stateMachine.getAvailableTransitions(id) };
  }

  /**
   * Get delivery package
   * GET /api/factory/missions/:id/delivery
   */
  @Get('missions/:id/delivery')
  getDelivery(@Param('id') id: string) {
    const delivery = this.deliveryManager.getDelivery(id);
    if (!delivery) return { success: false, error: 'Delivery not found' };
    return { success: true, data: delivery };
  }

  /**
   * Get archived mission
   * GET /api/factory/archives/:id
   */
  @Get('archives/:id')
  getArchive(@Param('id') id: string) {
    const archive = this.archiveService.getArchive(id);
    if (!archive) return { success: false, error: 'Archive not found' };
    return { success: true, data: archive };
  }

  /**
   * Search archives
   * GET /api/factory/archives
   */
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

  // ─── Capability Registry Endpoints ─────────────────────────

  /**
   * Get all capabilities in the catalog
   * GET /api/factory/capabilities
   */
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

  /**
   * Get capabilities by pack
   * GET /api/factory/capabilities/pack/:pack
   */
  @Get('capabilities/pack/:pack')
  getCapabilitiesByPack(@Param('pack') pack: string) {
    const packEnum = Object.values(CapabilityPack).find(p => p.toLowerCase() === pack.toLowerCase());
    if (!packEnum) return { success: false, error: `Invalid pack: ${pack}` };
    return {
      success: true,
      data: this.capabilityRegistry.getPack(packEnum as CapabilityPack),
    };
  }

  /**
   * Search capabilities by keyword
   * GET /api/factory/capabilities/search?q=...
   */
  @Get('capabilities/search')
  searchCapabilities(@Query('q') query: string) {
    return {
      success: true,
      data: this.capabilityRegistry.searchByKeyword(query),
    };
  }

  /**
   * Resolve capabilities needed for a mission
   * POST /api/factory/capabilities/resolve
   */
  @Post('capabilities/resolve')
  resolveCapabilities(@Body() body: { mission: string }) {
    const resolution = this.capabilityResolver.resolve({
      missionId: `preview-${Date.now()}`,
      instruction: body.mission,
    });
    return { success: true, data: resolution };
  }

  // ─── Worker Factory Endpoints ──────────────────────────────

  /**
   * Get worker pool statistics
   * GET /api/factory/workers/stats
   */
  @Get('workers/stats')
  getWorkerStats() {
    return { success: true, data: this.workerFactory.getStatistics() };
  }

  // ─── System Health ─────────────────────────────────────────

  /**
   * Get factory-wide statistics
   * GET /api/factory/stats
   */
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
        },
        activeMissions: this.pipeline.getActiveMissions().length,
        workerPool: this.workerFactory.getStatistics(),
        archiveStats: this.archiveService.getStatistics(),
        systemHealth: this.monitoring.getSystemHealth(),
        missionsByState,
      },
    };
  }
}
