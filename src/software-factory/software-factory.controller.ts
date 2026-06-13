/**
 * AENEWS Software Factory — API Controller
 * 
 * REST API for submitting missions, tracking progress, and retrieving results.
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
import { MissionControlService, MissionRequest } from './mission-control/mission-control.service';
import { MissionContractService } from './mission-contract/mission-contract.service';
import { MissionStateMachineService, MissionState } from './mission-state-machine/mission-state-machine.service';
import { AgentPoolService } from './agent-pool/agent-pool.service';
import { DeliveryService } from './delivery/delivery.service';
import { MissionArchiveService } from './archive/mission-archive.service';
import { AgentRegistryService } from './registry/agent-registry.service';
import { MissionQuality, AgentLevel } from './interfaces';

@Controller('api/factory')
export class SoftwareFactoryController {
  constructor(
    private readonly missionControl: MissionControlService,
    private readonly contractService: MissionContractService,
    private readonly stateMachine: MissionStateMachineService,
    private readonly agentPool: AgentPoolService,
    private readonly deliveryService: DeliveryService,
    private readonly archiveService: MissionArchiveService,
    private readonly agentRegistry: AgentRegistryService,
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

    const execution = await this.missionControl.submitMission(request);
    return {
      success: true,
      data: execution,
    };
  }

  /**
   * Get active missions
   * GET /api/factory/missions
   */
  @Get('missions')
  getActiveMissions() {
    return {
      success: true,
      data: this.missionControl.getActiveMissions(),
    };
  }

  /**
   * Get mission execution status
   * GET /api/factory/missions/:id
   */
  @Get('missions/:id')
  getMissionStatus(@Param('id') id: string) {
    const execution = this.missionControl.getExecution(id);
    if (!execution) {
      return { success: false, error: 'Mission not found' };
    }
    return { success: true, data: execution };
  }

  /**
   * Cancel a mission
   * POST /api/factory/missions/:id/cancel
   */
  @Post('missions/:id/cancel')
  async cancelMission(@Param('id') id: string) {
    const cancelled = await this.missionControl.cancelMission(id);
    return { success: cancelled };
  }

  /**
   * Get mission contract
   * GET /api/factory/contracts/:id
   */
  @Get('contracts/:id')
  getContract(@Param('id') id: string) {
    const contract = this.contractService.getContract(id);
    if (!contract) {
      return { success: false, error: 'Contract not found' };
    }
    return { success: true, data: contract };
  }

  /**
   * Get mission timeline
   * GET /api/factory/missions/:id/timeline
   */
  @Get('missions/:id/timeline')
  getTimeline(@Param('id') id: string) {
    const timeline = this.stateMachine.getTimeline(id);
    if (!timeline) {
      return { success: false, error: 'Timeline not found' };
    }
    return { success: true, data: timeline };
  }

  /**
   * Get available transitions for a mission
   * GET /api/factory/missions/:id/transitions
   */
  @Get('missions/:id/transitions')
  getAvailableTransitions(@Param('id') id: string) {
    return {
      success: true,
      data: this.stateMachine.getAvailableTransitions(id),
    };
  }

  /**
   * Get agent pool statistics
   * GET /api/factory/agents/stats
   */
  @Get('agents/stats')
  getAgentStats() {
    return {
      success: true,
      data: this.agentPool.getStatistics(),
    };
  }

  /**
   * Get delivery package
   * GET /api/factory/missions/:id/delivery
   */
  @Get('missions/:id/delivery')
  getDelivery(@Param('id') id: string) {
    const delivery = this.deliveryService.getDelivery(id);
    if (!delivery) {
      return { success: false, error: 'Delivery not found' };
    }
    return { success: true, data: delivery };
  }

  /**
   * Get archived mission
   * GET /api/factory/archives/:id
   */
  @Get('archives/:id')
  getArchive(@Param('id') id: string) {
    const archive = this.archiveService.getArchive(id);
    if (!archive) {
      return { success: false, error: 'Archive not found' };
    }
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

  /**
   * Get factory statistics
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
        activeMissions: this.missionControl.getActiveMissions().length,
        agentPool: this.agentPool.getStatistics(),
        archiveStats: this.archiveService.getStatistics(),
        missionsByState,
      },
    };
  }

  /**
   * Get all 64 agent definitions
   * GET /api/factory/agents
   */
  @Get('agents')
  getAllAgents() {
    return {
      success: true,
      data: {
        total: this.agentRegistry.getTotalCount(),
        agents: this.agentRegistry.getAllDefinitions(),
      },
    };
  }

  /**
   * Get agents by level
   * GET /api/factory/agents/level/:level
   */
  @Get('agents/level/:level')
  getAgentsByLevel(@Param('level') level: string) {
    const agentLevel = Object.values(AgentLevel).find(l => l.toLowerCase() === level.toLowerCase());
    if (!agentLevel) {
      return { success: false, error: `Invalid level: ${level}` };
    }
    return {
      success: true,
      data: this.agentRegistry.getByLevel(agentLevel as AgentLevel),
    };
  }

  /**
   * Get team compositions
   * GET /api/factory/agents/teams
   */
  @Get('agents/teams')
  getTeamCompositions() {
    return {
      success: true,
      data: this.agentRegistry.getTeamCompositions(),
    };
  }

  /**
   * Find agents needed for a mission
   * POST /api/factory/agents/recommend
   */
  @Post('agents/recommend')
  recommendAgents(@Body() body: { mission: string }) {
    return {
      success: true,
      data: {
        mission: body.mission,
        recommendedAgents: this.agentRegistry.findAgentsForMission(body.mission),
        totalRecommended: this.agentRegistry.findAgentsForMission(body.mission).length,
      },
    };
  }

  /**
   * Get single agent definition
   * GET /api/factory/agents/:id
   */
  @Get('agents/:id')
  getAgentDefinition(@Param('id') id: string) {
    const definition = this.agentRegistry.getDefinition(id as any);
    if (!definition) {
      return { success: false, error: `Agent not found: ${id}` };
    }
    return { success: true, data: definition };
  }
}
