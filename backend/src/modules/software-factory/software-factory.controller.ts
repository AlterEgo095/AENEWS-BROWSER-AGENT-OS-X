/**
 * AENEWS Software Factory — REST Controllers
 *
 * Two controllers bridging HTTP requests to the Software Factory services:
 *
 * 1. SoftwareFactoryController (missions)
 *    - Mission CRUD, lifecycle (start/pause/resume), progress
 *    - Mission contract management
 *
 * 2. ConnectorController (connectors)
 *    - List available connectors
 *    - Execute actions via connectors
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Mission, MissionState, MissionPriority } from './entities/mission.entity';
import { MissionContract, ContractStatus } from './entities/mission-contract.entity';
import { MissionOrchestratorService } from './services/mission-orchestrator.service';
import { MissionContractService } from './services/mission-contract.service';
import { ConnectorRegistryService } from './services/connector-registry.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { StartMissionDto } from './dto/start-mission.dto';
import { CreateContractDto } from './dto/create-contract.dto';
import { ExecuteConnectorDto } from './dto/execute-connector.dto';

// ─── Missions Controller ──────────────────────────────────────

@ApiTags('Software Factory — Missions')
@ApiBearerAuth()
@Controller('missions')
export class SoftwareFactoryController {
  private readonly logger = new Logger(SoftwareFactoryController.name);

  constructor(
    @InjectRepository(Mission)
    private readonly missionRepository: Repository<Mission>,
    @InjectRepository(MissionContract)
    private readonly contractRepository: Repository<MissionContract>,
    private readonly orchestrator: MissionOrchestratorService,
    private readonly contractService: MissionContractService,
    private readonly connectorRegistry: ConnectorRegistryService,
  ) {}

  // ─── Mission CRUD ──────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all missions with pagination and optional state filter' })
  @ApiResponse({ status: 200, description: 'Paginated list of missions' })
  async findAllMissions(
    @Query() pagination: PaginationDto,
    @Query('state') state?: MissionState,
    @Query('priority') priority?: MissionPriority,
  ) {
    const query = this.missionRepository.createQueryBuilder('mission');

    if (state) {
      query.andWhere('mission.state = :state', { state });
    }
    if (priority) {
      query.andWhere('mission.priority = :priority', { priority });
    }

    query
      .orderBy('mission.created_at', 'DESC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new mission' })
  @ApiResponse({ status: 201, description: 'Mission created successfully' })
  async createMission(@Body() dto: CreateMissionDto) {
    const mission = this.missionRepository.create({
      name: dto.name,
      description: dto.description,
      priority: dto.priority || MissionPriority.MEDIUM,
      state: MissionState.DRAFT,
      objectives: dto.objectives || [],
      constraints: dto.constraints || [],
      requiredCapabilities: dto.requiredCapabilities || [],
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      assignedTeamIds: [],
      progress: 0,
    });

    const saved = await this.missionRepository.save(mission);
    this.logger.log(`Mission created: ${saved.id} — "${saved.name}"`);
    return saved;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get mission details by ID' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'Mission details' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async findOneMission(@Param('id') id: string) {
    const mission = await this.missionRepository.findOne({ where: { id } });
    if (!mission) {
      throw new NotFoundException(`Mission ${id} not found`);
    }
    return mission;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update mission' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'Mission updated' })
  async updateMission(@Param('id') id: string, @Body() dto: UpdateMissionDto) {
    const mission = await this.missionRepository.findOne({ where: { id } });
    if (!mission) {
      throw new NotFoundException(`Mission ${id} not found`);
    }

    const { deadline, ...rest } = dto;
    const updateData: Partial<Mission> = { ...rest };
    if (deadline) {
      updateData.deadline = new Date(deadline);
    }

    await this.missionRepository.update(id, updateData);
    return this.missionRepository.findOne({ where: { id } });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel/Delete mission' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 204, description: 'Mission cancelled/deleted' })
  async deleteMission(@Param('id') id: string) {
    const mission = await this.missionRepository.findOne({ where: { id } });
    if (!mission) {
      throw new NotFoundException(`Mission ${id} not found`);
    }

    // Mark as cancelled rather than hard-delete
    await this.missionRepository.update(id, {
      state: MissionState.CANCELLED,
      error: 'Mission cancelled by user',
    });

    // Also attempt to cancel via orchestrator (in-memory)
    try {
      await this.orchestrator.cancelMission(id);
    } catch {
      // Orchestrator may not have this mission in memory; that's fine
    }
  }

  // ─── Mission Lifecycle ─────────────────────────────────────

  @Post(':id/start')
  @ApiOperation({ summary: 'Start mission execution' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'Mission execution started' })
  async startMission(@Param('id') id: string, @Body() dto: StartMissionDto) {
    const mission = await this.missionRepository.findOne({ where: { id } });
    if (!mission) {
      throw new NotFoundException(`Mission ${id} not found`);
    }

    if (mission.state !== MissionState.DRAFT && mission.state !== MissionState.PLANNED) {
      throw new BadRequestException(
        `Cannot start mission in state ${mission.state}. Must be DRAFT or PLANNED.`,
      );
    }

    // Delegate to orchestrator — bridges to the in-memory execution pipeline
    const execution = await this.orchestrator.startMission({
      instruction: mission.name,
      description: mission.description,
      deadline: mission.deadline || undefined,
      createdBy: dto.requesterId || mission.requesterId,
    });

    // Persist updated state
    await this.missionRepository.update(id, {
      state: MissionState.PLANNED,
      startedAt: new Date(),
      progress: execution.progress,
    });

    return { missionId: id, execution };
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause mission execution' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'Mission paused' })
  async pauseMission(@Param('id') id: string) {
    const mission = await this.missionRepository.findOne({ where: { id } });
    if (!mission) {
      throw new NotFoundException(`Mission ${id} not found`);
    }

    const paused = await this.orchestrator.pauseMission(id);
    if (!paused) {
      throw new BadRequestException(`Could not pause mission ${id}`);
    }

    await this.missionRepository.update(id, { state: MissionState.DRAFT });
    return { missionId: id, status: 'paused' };
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume paused mission' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'Mission resumed' })
  async resumeMission(@Param('id') id: string) {
    const mission = await this.missionRepository.findOne({ where: { id } });
    if (!mission) {
      throw new NotFoundException(`Mission ${id} not found`);
    }

    const resumed = await this.orchestrator.resumeMission(id);
    if (!resumed) {
      throw new BadRequestException(`Could not resume mission ${id}`);
    }

    await this.missionRepository.update(id, { state: MissionState.BUILDING });
    return { missionId: id, status: 'resumed' };
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Get mission progress' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'Mission progress details' })
  async getMissionProgress(@Param('id') id: string) {
    const mission = await this.missionRepository.findOne({ where: { id } });
    if (!mission) {
      throw new NotFoundException(`Mission ${id} not found`);
    }

    // Try to get live status from orchestrator
    const execution = this.orchestrator.getMissionStatus(id);

    return {
      missionId: id,
      state: execution?.status || mission.state,
      progress: execution?.progress || mission.progress,
      currentPhase: execution?.currentPhase || null,
      errors: execution?.errors || [],
      warnings: execution?.warnings || [],
      totalCost: execution?.totalCost || 0,
    };
  }

  // ─── Mission Contracts ─────────────────────────────────────

  @Post(':id/contracts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create contract for mission' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 201, description: 'Contract created' })
  async createContract(@Param('id') id: string, @Body() dto: CreateContractDto) {
    const mission = await this.missionRepository.findOne({ where: { id } });
    if (!mission) {
      throw new NotFoundException(`Mission ${id} not found`);
    }

    const contract = this.contractRepository.create({
      missionId: id,
      type: dto.type,
      terms: dto.terms || {},
      budget: dto.budget || null,
      deliverables: dto.deliverables || [],
      status: ContractStatus.NEGOTIATING,
    });

    const saved = await this.contractRepository.save(contract);
    this.logger.log(`Contract created: ${saved.id} for mission ${id}`);

    // Also register with the in-memory contract service
    try {
      this.contractService.createContract({
        mission: mission.name,
        description: mission.description,
        budgetMaxUsd: dto.budget || undefined,
      });
    } catch {
      // In-memory service is best-effort
    }

    return saved;
  }

  @Get(':id/contracts')
  @ApiOperation({ summary: 'List contracts for mission' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiResponse({ status: 200, description: 'List of mission contracts' })
  async listContracts(@Param('id') id: string) {
    const mission = await this.missionRepository.findOne({ where: { id } });
    if (!mission) {
      throw new NotFoundException(`Mission ${id} not found`);
    }

    const contracts = await this.contractRepository.find({
      where: { missionId: id },
      order: { createdAt: 'DESC' },
    });

    return { data: contracts, total: contracts.length };
  }

  @Put(':id/contracts/:contractId')
  @ApiOperation({ summary: 'Update contract' })
  @ApiParam({ name: 'id', description: 'Mission UUID' })
  @ApiParam({ name: 'contractId', description: 'Contract UUID' })
  @ApiResponse({ status: 200, description: 'Contract updated' })
  async updateContract(
    @Param('id') id: string,
    @Param('contractId') contractId: string,
    @Body() dto: CreateContractDto,
  ) {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, missionId: id },
    });
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found for mission ${id}`);
    }

    await this.contractRepository.update(contractId, {
      type: dto.type,
      terms: dto.terms,
      budget: dto.budget,
      deliverables: dto.deliverables,
    });

    return this.contractRepository.findOne({ where: { id: contractId } });
  }
}

// ─── Connectors Controller ────────────────────────────────────

@ApiTags('Software Factory — Connectors')
@ApiBearerAuth()
@Controller('connectors')
export class ConnectorController {
  constructor(private readonly connectorRegistry: ConnectorRegistryService) {}

  @Get()
  @ApiOperation({ summary: 'List available connectors' })
  @ApiResponse({ status: 200, description: 'List of registered connectors' })
  async listConnectors() {
    const connectors = this.connectorRegistry.listConnectors();
    const stats = this.connectorRegistry.getStatistics();
    return { data: connectors, statistics: stats };
  }

  @Post(':name/execute')
  @ApiOperation({ summary: 'Execute action via connector' })
  @ApiParam({ name: 'name', description: 'Connector name' })
  @ApiResponse({ status: 200, description: 'Connector execution result' })
  async executeConnector(
    @Param('name') name: string,
    @Body() dto: ExecuteConnectorDto,
  ) {
    const result = await this.connectorRegistry.executeAction(name, dto.action, dto.params || {});
    return result;
  }
}
