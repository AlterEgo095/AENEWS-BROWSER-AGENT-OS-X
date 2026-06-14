/**
 * AENEWS Agent OS X — Swarm Controller
 *
 * Phase 10 — REST API endpoints for Advanced Swarm Intelligence & Production Hardening.
 *
 * Base path: /api/v1/swarm
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
import { SwarmIntelligenceService } from '../services/swarm-intelligence.service';
import { AdvancedConsensusProtocol } from '../services/advanced-consensus-protocol.service';
import { CollaborationPersistenceService } from '../services/collaboration-persistence.service';
import { SharedWorkingMemoryService } from '../services/shared-working-memory.service';
import { AdaptiveFeedbackLoopService, OrchestrationParameter } from '../services/adaptive-feedback-loop.service';
import { DynamicAgentTopologyService, TopologyType } from '../services/dynamic-agent-topology.service';
import { AdvancedDAGOrchestratorService, DAGDefinition } from '../services/advanced-dag-orchestrator.service';
import { ClusterType } from '../../agent/entities/agent.entity';
import {
  CreateSwarmDto,
  TerminateSwarmDto,
  InitiateConsensusDto,
  CreateCheckpointDto,
  CreateWorkingMemorySessionDto,
  WriteWorkingMemoryDto,
  PostToBlackboardDto,
  CreateTopologyDto,
  AddTopologyNodeDto,
  RemoveTopologyNodeDto,
  IsolateNodeDto,
  RetypeTopologyDto,
} from '../dto/swarm.dto';

@Controller('swarm')
@ApiTags('Swarm Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.OPERATOR)
@TenantScoped()
export class SwarmController {

  constructor(
    private readonly swarmService: SwarmIntelligenceService,
    private readonly consensusService: AdvancedConsensusProtocol,
    private readonly persistenceService: CollaborationPersistenceService,
    private readonly workingMemoryService: SharedWorkingMemoryService,
    private readonly feedbackService: AdaptiveFeedbackLoopService,
    private readonly topologyService: DynamicAgentTopologyService,
    private readonly dagService: AdvancedDAGOrchestratorService,
  ) {}

  // ─── Swarm Endpoints ──────────────────────────────────────────

  @Post('create')
  @ApiOperation({ summary: 'Create a new swarm', description: 'Creates a new agent swarm with the specified configuration' })
  @ApiResponse({ status: 201, description: 'Swarm created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  @RateLimitDomain('cluster')
  @RateLimit({ points: 5, duration: 60, blockDuration: 120 })
  async createSwarm(@Body() body: CreateSwarmDto) {
    return this.swarmService.createSwarm(body);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute a swarm', description: 'Starts execution of an existing swarm' })
  @ApiResponse({ status: 200, description: 'Swarm execution started' })
  @RateLimitDomain('cluster')
  @RateLimit({ points: 5, duration: 60, blockDuration: 120 })
  async executeSwarm(@Param('id') id: string) {
    return this.swarmService.executeSwarm(id);
  }

  @Post(':id/terminate')
  @ApiOperation({ summary: 'Terminate a swarm', description: 'Gracefully terminates a running swarm' })
  @ApiResponse({ status: 200, description: 'Swarm terminated' })
  async terminateSwarm(@Param('id') id: string, @Body() body: TerminateSwarmDto) {
    await this.swarmService.terminateSwarm(id, body.reason);
    return { success: true, swarmId: id };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get swarm details', description: 'Returns swarm configuration and agent list' })
  @ApiResponse({ status: 200, description: 'Swarm details retrieved' })
  async getSwarm(@Param('id') id: string) {
    const config = this.swarmService.getSwarm(id);
    const agents = this.swarmService.getSwarmAgents(id);
    return { config, agents };
  }

  @Get(':id/metrics')
  @ApiOperation({ summary: 'Get swarm metrics' })
  async getSwarmMetrics(@Param('id') id: string) {
    return this.swarmService.getSwarmMetrics(id);
  }

  @Get(':id/result')
  @ApiOperation({ summary: 'Get swarm result' })
  async getSwarmResult(@Param('id') id: string) {
    return this.swarmService.getSwarmResult(id);
  }

  @Get(':id/pheromones')
  @ApiOperation({ summary: 'Get pheromone trail' })
  async getPheromones(@Param('id') id: string) {
    return this.swarmService.getPheromoneTrail(id);
  }

  @Get(':id/emergent')
  @ApiOperation({ summary: 'Get emergent behaviors' })
  async getEmergentBehaviors(@Param('id') id: string) {
    return this.swarmService.getEmergentHistory(id);
  }

  @Get('list')
  @ApiOperation({ summary: 'List all swarms' })
  async listSwarms() {
    return this.swarmService.getAllSwarms();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get swarm statistics' })
  async getSwarmStats() {
    return this.swarmService.getStats();
  }

  // ─── Consensus Endpoints ──────────────────────────────────────

  @Post('consensus/initiate')
  @ApiOperation({ summary: 'Initiate consensus', description: 'Starts a consensus protocol among swarm agents' })
  @ApiResponse({ status: 200, description: 'Consensus initiated' })
  async initiateConsensus(@Body() body: InitiateConsensusDto) {
    return this.consensusService.initiateConsensus(body as any);
  }

  @Post('consensus/:id/run')
  @ApiOperation({ summary: 'Run consensus round' })
  async runConsensus(@Param('id') id: string) {
    return this.consensusService.runConsensus(id);
  }

  @Get('consensus/:id/result')
  @ApiOperation({ summary: 'Get consensus result' })
  async getConsensusResult(@Param('id') id: string) {
    return this.consensusService.getConsensusResult(id);
  }

  @Get('consensus/:id/dissent')
  @ApiOperation({ summary: 'Get dissent records' })
  async getDissentRecords(@Param('id') id: string) {
    return this.consensusService.getDissentRecords(id);
  }

  @Get('consensus/list')
  @ApiOperation({ summary: 'List all consensus sessions' })
  async listConsensus() {
    return this.consensusService.getAllConsensus();
  }

  @Get('consensus/stats')
  @ApiOperation({ summary: 'Get consensus statistics' })
  async getConsensusStats() {
    return this.consensusService.getStats();
  }

  // ─── Persistence Endpoints ────────────────────────────────────

  @Post('persistence/checkpoint')
  @ApiOperation({ summary: 'Create collaboration checkpoint' })
  @ApiResponse({ status: 200, description: 'Checkpoint created' })
  async createCheckpoint(@Body() body: CreateCheckpointDto) {
    await this.persistenceService.checkpoint(body as any);
    return { success: true };
  }

  @Get('persistence/active')
  @ApiOperation({ summary: 'Get active collaborations' })
  async getActiveCollaborations() {
    return this.persistenceService.getActiveCollaborations();
  }

  @Get('persistence/history')
  @ApiOperation({ summary: 'Get collaboration history' })
  async getHistory(@Query('limit') limit?: string, @Query('pattern') pattern?: string) {
    return this.persistenceService.getHistory(
      limit ? parseInt(limit, 10) : 50,
      pattern,
    );
  }

  @Get('persistence/stats')
  @ApiOperation({ summary: 'Get persistence statistics' })
  async getPersistenceStats() {
    return this.persistenceService.getStats();
  }

  @Post('persistence/recover')
  @ApiOperation({ summary: 'Trigger crash recovery' })
  async triggerRecovery() {
    return this.persistenceService.recoverFromCrash();
  }

  // ─── Working Memory Endpoints ─────────────────────────────────

  @Post('working-memory/session')
  @ApiOperation({ summary: 'Create working memory session' })
  @ApiResponse({ status: 200, description: 'Session created' })
  async createWorkingMemorySession(@Body() body: CreateWorkingMemorySessionDto) {
    return this.workingMemoryService.createSession(
      body.sessionId,
      body.agentIds,
      body.missionId,
      body.scope,
    );
  }

  @Post('working-memory/:id/write')
  @ApiOperation({ summary: 'Write to working memory' })
  async writeWorkingMemory(
    @Param('id') sessionId: string,
    @Body() body: WriteWorkingMemoryDto,
  ) {
    return this.workingMemoryService.writeShared(
      sessionId,
      body.key,
      body.value,
      body.agentId,
      body.metadata,
    );
  }

  @Get('working-memory/:id/read')
  @ApiOperation({ summary: 'Read from working memory' })
  async readWorkingMemory(
    @Param('id') sessionId: string,
    @Query('key') key?: string,
  ) {
    if (key) {
      return this.workingMemoryService.readShared(sessionId, key);
    }
    return this.workingMemoryService.readAllShared(sessionId);
  }

  @Post('working-memory/:id/blackboard')
  @ApiOperation({ summary: 'Post to blackboard' })
  async postToBlackboard(
    @Param('id') sessionId: string,
    @Body() body: PostToBlackboardDto,
  ) {
    return this.workingMemoryService.postToBlackboard(
      sessionId,
      body.key,
      body.value,
      body.agentId,
    );
  }

  @Get('working-memory/:id/blackboard')
  @ApiOperation({ summary: 'Read blackboard' })
  async readBlackboard(@Param('id') sessionId: string) {
    return this.workingMemoryService.readBlackboard(sessionId);
  }

  @Delete('working-memory/:id')
  @ApiOperation({ summary: 'Close working memory session' })
  async closeWorkingMemorySession(@Param('id') sessionId: string) {
    await this.workingMemoryService.closeSession(sessionId);
    return { success: true, sessionId };
  }

  @Get('working-memory/stats')
  @ApiOperation({ summary: 'Get working memory statistics' })
  async getWorkingMemoryStats() {
    return this.workingMemoryService.getStats();
  }

  // ─── Feedback Loop Endpoints ──────────────────────────────────

  @Post('feedback/cycle')
  @ApiOperation({ summary: 'Run feedback cycle' })
  async runFeedbackCycle() {
    return this.feedbackService.applyFeedbackCycle();
  }

  @Get('feedback/parameters')
  @ApiOperation({ summary: 'Get feedback parameters' })
  async getFeedbackParameters() {
    return this.feedbackService.getAllParameters();
  }

  @Get('feedback/history')
  @ApiOperation({ summary: 'Get feedback history' })
  async getFeedbackHistory(@Query('limit') limit?: string) {
    return this.feedbackService.getAdjustmentHistory(
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('feedback/rollback/:param')
  @ApiOperation({ summary: 'Rollback feedback parameter' })
  async rollbackParameter(@Param('param') param: OrchestrationParameter) {
    const success = await this.feedbackService.rollbackParameter(param);
    return { success, parameter: param };
  }

  @Get('feedback/stats')
  @ApiOperation({ summary: 'Get feedback statistics' })
  async getFeedbackStats() {
    return this.feedbackService.getStats();
  }

  // ─── Topology Endpoints ───────────────────────────────────────

  @Post('topology/create')
  @ApiOperation({ summary: 'Create agent topology' })
  @ApiResponse({ status: 200, description: 'Topology created' })
  async createTopology(@Body() body: CreateTopologyDto) {
    return this.topologyService.createTopology(
      body.id,
      body.type,
      body.agentIds,
      body.clusterTypes,
      body.metadata,
    );
  }

  @Post('topology/:id/add-node')
  @ApiOperation({ summary: 'Add node to topology' })
  async addTopologyNode(
    @Param('id') topologyId: string,
    @Body() body: AddTopologyNodeDto,
  ) {
    const success = await this.topologyService.addNode(
      topologyId,
      body.agentId,
      body.clusterType,
      (body.reason as any) || 'manual',
    );
    return { success };
  }

  @Post('topology/:id/remove-node')
  @ApiOperation({ summary: 'Remove node from topology' })
  async removeTopologyNode(
    @Param('id') topologyId: string,
    @Body() body: RemoveTopologyNodeDto,
  ) {
    const success = await this.topologyService.removeNode(
      topologyId,
      body.agentId,
      (body.reason as any) || 'manual',
    );
    return { success };
  }

  @Post('topology/:id/isolate/:agentId')
  @ApiOperation({ summary: 'Isolate a node in the topology' })
  async isolateNode(
    @Param('id') topologyId: string,
    @Param('agentId') agentId: string,
    @Body() body: IsolateNodeDto,
  ) {
    const success = await this.topologyService.isolateNode(
      topologyId,
      agentId,
      (body.reason as any) || 'emergency',
    );
    return { success };
  }

  @Post('topology/:id/restore/:agentId')
  @ApiOperation({ summary: 'Restore an isolated node' })
  async restoreNode(
    @Param('id') topologyId: string,
    @Param('agentId') agentId: string,
  ) {
    const success = await this.topologyService.restoreNode(topologyId, agentId);
    return { success };
  }

  @Post('topology/:id/retype')
  @ApiOperation({ summary: 'Change topology type' })
  async retypeTopology(
    @Param('id') topologyId: string,
    @Body() body: RetypeTopologyDto,
  ) {
    const success = await this.topologyService.retypeTopology(topologyId, body.type);
    return { success };
  }

  @Get('topology/:id/metrics')
  @ApiOperation({ summary: 'Get topology metrics' })
  async getTopologyMetrics(@Param('id') topologyId: string) {
    return this.topologyService.getMetrics(topologyId);
  }

  @Get('topology/list')
  @ApiOperation({ summary: 'List all topologies' })
  async listTopologies() {
    return this.topologyService.getAllTopologies();
  }

  // ─── DAG Endpoints ────────────────────────────────────────────

  @Post('dag/execute')
  @ApiOperation({ summary: 'Execute a DAG', description: 'Executes a directed acyclic graph of agent tasks' })
  @ApiResponse({ status: 200, description: 'DAG executed' })
  async executeDAG(@Body() dag: DAGDefinition) {
    return this.dagService.executeDAG(dag);
  }

  @Get('dag/:id/result')
  @ApiOperation({ summary: 'Get DAG result' })
  async getDAGResult(@Param('id') id: string) {
    const result = this.dagService.getResult(id);
    if (result) {
      return {
        ...result,
        nodeResults: Object.fromEntries(result.nodeResults),
      };
    }
    return result;
  }

  @Get('dag/:id/trace')
  @ApiOperation({ summary: 'Get DAG execution trace' })
  async getDAGTrace(@Param('id') id: string) {
    return this.dagService.getExecutionTrace(id);
  }

  @Get('dag/stats')
  @ApiOperation({ summary: 'Get DAG statistics' })
  async getDAGStats() {
    return this.dagService.getStats();
  }
}
