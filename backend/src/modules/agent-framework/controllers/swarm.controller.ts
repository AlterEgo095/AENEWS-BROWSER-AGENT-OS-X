/**
 * AENEWS Agent OS X — Swarm Controller
 *
 * Phase 10 — REST API endpoints for Advanced Swarm Intelligence & Production Hardening.
 *
 * Base path: /api/v1/swarm
 *
 * Endpoints:
 *   POST   /swarm/create              — Create a new swarm
 *   POST   /swarm/:id/execute         — Execute a swarm mission
 *   POST   /swarm/:id/terminate       — Terminate a running swarm
 *   GET    /swarm/:id                 — Get swarm details
 *   GET    /swarm/:id/metrics         — Get swarm metrics
 *   GET    /swarm/:id/result          — Get swarm result
 *   GET    /swarm/:id/pheromones      — Get pheromone trail
 *   GET    /swarm/:id/emergent        — Get emergent behavior history
 *   GET    /swarm/list                — List all swarms
 *   GET    /swarm/stats               — Get swarm statistics
 *
 *   POST   /consensus/initiate        — Initiate a consensus session
 *   POST   /consensus/:id/run         — Run consensus protocol
 *   GET    /consensus/:id/result      — Get consensus result
 *   GET    /consensus/:id/dissent     — Get dissent records
 *   GET    /consensus/list            — List all consensus sessions
 *   GET    /consensus/stats           — Get consensus statistics
 *
 *   POST   /persistence/checkpoint    — Create a checkpoint
 *   GET    /persistence/active        — Get active collaborations
 *   GET    /persistence/history       — Get collaboration history
 *   GET    /persistence/stats         — Get persistence statistics
 *   POST   /persistence/recover       — Trigger crash recovery
 *
 *   POST   /working-memory/session    — Create working memory session
 *   POST   /working-memory/:id/write  — Write to shared workspace
 *   GET    /working-memory/:id/read   — Read from shared workspace
 *   POST   /working-memory/:id/blackboard — Post to blackboard
 *   GET    /working-memory/:id/blackboard — Read blackboard
 *   DELETE /working-memory/:id        — Close session
 *   GET    /working-memory/stats      — Get memory statistics
 *
 *   POST   /feedback/cycle            — Run a feedback cycle
 *   GET    /feedback/parameters       — Get all parameters
 *   GET    /feedback/history          — Get adjustment history
 *   POST   /feedback/rollback/:param  — Rollback a parameter
 *   GET    /feedback/stats            — Get feedback statistics
 *
 *   POST   /topology/create           — Create a topology
 *   POST   /topology/:id/add-node     — Add a node
 *   POST   /topology/:id/remove-node  — Remove a node
 *   POST   /topology/:id/isolate/:agentId — Isolate a node
 *   POST   /topology/:id/restore/:agentId — Restore a node
 *   POST   /topology/:id/retype       — Change topology type
 *   GET    /topology/:id/metrics      — Get topology metrics
 *   GET    /topology/list             — List all topologies
 *
 *   POST   /dag/execute               — Execute a DAG
 *   GET    /dag/:id/result            — Get DAG result
 *   GET    /dag/:id/trace             — Get execution trace
 *   GET    /dag/stats                 — Get DAG statistics
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { SwarmIntelligenceService, SwarmConfig } from '../services/swarm-intelligence.service';
import {
  AdvancedConsensusProtocol,
  ConsensusConfig,
  ConsensusProposal,
  AgentExpertise,
  ConsensusStrategy,
} from '../services/advanced-consensus-protocol.service';
import {
  CollaborationPersistenceService,
  CollaborationCheckpoint,
} from '../services/collaboration-persistence.service';
import {
  SharedWorkingMemoryService,
  DataScope,
} from '../services/shared-working-memory.service';
import {
  AdaptiveFeedbackLoopService,
  OrchestrationParameter,
} from '../services/adaptive-feedback-loop.service';
import {
  DynamicAgentTopologyService,
  TopologyType,
} from '../services/dynamic-agent-topology.service';
import {
  AdvancedDAGOrchestratorService,
  DAGDefinition,
} from '../services/advanced-dag-orchestrator.service';
import { ClusterType } from '../../agent/entities/agent.entity';

@Controller('api/v1/swarm')
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
  async createSwarm(@Body() body: {
    id: string;
    mission: string;
    objectives?: string[];
    requiredCapabilities?: string[];
    preferredClusters?: ClusterType[];
    initialSize?: number;
    maxSize?: number;
    minSize?: number;
    maxDurationMs?: number;
    enableDynamicSpawning?: boolean;
    enableEmergentDetection?: boolean;
  }) {
    return this.swarmService.createSwarm(body);
  }

  @Post(':id/execute')
  async executeSwarm(@Param('id') id: string) {
    return this.swarmService.executeSwarm(id);
  }

  @Post(':id/terminate')
  async terminateSwarm(@Param('id') id: string, @Body() body: { reason?: string }) {
    await this.swarmService.terminateSwarm(id, body.reason);
    return { success: true, swarmId: id };
  }

  @Get(':id')
  async getSwarm(@Param('id') id: string) {
    const config = this.swarmService.getSwarm(id);
    const agents = this.swarmService.getSwarmAgents(id);
    return { config, agents };
  }

  @Get(':id/metrics')
  async getSwarmMetrics(@Param('id') id: string) {
    return this.swarmService.getSwarmMetrics(id);
  }

  @Get(':id/result')
  async getSwarmResult(@Param('id') id: string) {
    return this.swarmService.getSwarmResult(id);
  }

  @Get(':id/pheromones')
  async getPheromones(@Param('id') id: string) {
    return this.swarmService.getPheromoneTrail(id);
  }

  @Get(':id/emergent')
  async getEmergentBehaviors(@Param('id') id: string) {
    return this.swarmService.getEmergentHistory(id);
  }

  @Get('list')
  async listSwarms() {
    return this.swarmService.getAllSwarms();
  }

  @Get('stats')
  async getSwarmStats() {
    return this.swarmService.getStats();
  }

  // ─── Consensus Endpoints ──────────────────────────────────────

  @Post('consensus/initiate')
  async initiateConsensus(@Body() body: {
    id: string;
    proposal: ConsensusProposal;
    strategy?: ConsensusStrategy;
    participants?: AgentExpertise[];
    maxRounds?: number;
    quorumThreshold?: number;
    supermajorityThreshold?: number;
    byzantineTolerance?: number;
    enableDissentTracking?: boolean;
    enableMultiRound?: boolean;
  }) {
    return this.consensusService.initiateConsensus(body);
  }

  @Post('consensus/:id/run')
  async runConsensus(@Param('id') id: string) {
    return this.consensusService.runConsensus(id);
  }

  @Get('consensus/:id/result')
  async getConsensusResult(@Param('id') id: string) {
    return this.consensusService.getConsensusResult(id);
  }

  @Get('consensus/:id/dissent')
  async getDissentRecords(@Param('id') id: string) {
    return this.consensusService.getDissentRecords(id);
  }

  @Get('consensus/list')
  async listConsensus() {
    return this.consensusService.getAllConsensus();
  }

  @Get('consensus/stats')
  async getConsensusStats() {
    return this.consensusService.getStats();
  }

  // ─── Persistence Endpoints ────────────────────────────────────

  @Post('persistence/checkpoint')
  async createCheckpoint(@Body() body: CollaborationCheckpoint) {
    await this.persistenceService.checkpoint(body);
    return { success: true };
  }

  @Get('persistence/active')
  async getActiveCollaborations() {
    return this.persistenceService.getActiveCollaborations();
  }

  @Get('persistence/history')
  async getHistory(@Query('limit') limit?: string, @Query('pattern') pattern?: string) {
    return this.persistenceService.getHistory(
      limit ? parseInt(limit, 10) : 50,
      pattern,
    );
  }

  @Get('persistence/stats')
  async getPersistenceStats() {
    return this.persistenceService.getStats();
  }

  @Post('persistence/recover')
  async triggerRecovery() {
    return this.persistenceService.recoverFromCrash();
  }

  // ─── Working Memory Endpoints ─────────────────────────────────

  @Post('working-memory/session')
  async createWorkingMemorySession(@Body() body: {
    sessionId: string;
    agentIds: string[];
    missionId?: string;
    scope?: DataScope;
  }) {
    return this.workingMemoryService.createSession(
      body.sessionId,
      body.agentIds,
      body.missionId,
      body.scope,
    );
  }

  @Post('working-memory/:id/write')
  async writeWorkingMemory(
    @Param('id') sessionId: string,
    @Body() body: { key: string; value: any; agentId: string; metadata?: Record<string, any> },
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
  async postToBlackboard(
    @Param('id') sessionId: string,
    @Body() body: { key: string; value: any; agentId: string },
  ) {
    return this.workingMemoryService.postToBlackboard(
      sessionId,
      body.key,
      body.value,
      body.agentId,
    );
  }

  @Get('working-memory/:id/blackboard')
  async readBlackboard(@Param('id') sessionId: string) {
    return this.workingMemoryService.readBlackboard(sessionId);
  }

  @Delete('working-memory/:id')
  async closeWorkingMemorySession(@Param('id') sessionId: string) {
    await this.workingMemoryService.closeSession(sessionId);
    return { success: true, sessionId };
  }

  @Get('working-memory/stats')
  async getWorkingMemoryStats() {
    return this.workingMemoryService.getStats();
  }

  // ─── Feedback Loop Endpoints ──────────────────────────────────

  @Post('feedback/cycle')
  async runFeedbackCycle() {
    return this.feedbackService.applyFeedbackCycle();
  }

  @Get('feedback/parameters')
  async getFeedbackParameters() {
    return this.feedbackService.getAllParameters();
  }

  @Get('feedback/history')
  async getFeedbackHistory(@Query('limit') limit?: string) {
    return this.feedbackService.getAdjustmentHistory(
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('feedback/rollback/:param')
  async rollbackParameter(@Param('param') param: OrchestrationParameter) {
    const success = await this.feedbackService.rollbackParameter(param);
    return { success, parameter: param };
  }

  @Get('feedback/stats')
  async getFeedbackStats() {
    return this.feedbackService.getStats();
  }

  // ─── Topology Endpoints ───────────────────────────────────────

  @Post('topology/create')
  async createTopology(@Body() body: {
    id: string;
    type: TopologyType;
    agentIds: string[];
    clusterTypes: ClusterType[];
    metadata?: Record<string, any>;
  }) {
    return this.topologyService.createTopology(
      body.id,
      body.type,
      body.agentIds,
      body.clusterTypes,
      body.metadata,
    );
  }

  @Post('topology/:id/add-node')
  async addTopologyNode(
    @Param('id') topologyId: string,
    @Body() body: { agentId: string; clusterType: ClusterType; reason?: string },
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
  async removeTopologyNode(
    @Param('id') topologyId: string,
    @Body() body: { agentId: string; reason?: string },
  ) {
    const success = await this.topologyService.removeNode(
      topologyId,
      body.agentId,
      (body.reason as any) || 'manual',
    );
    return { success };
  }

  @Post('topology/:id/isolate/:agentId')
  async isolateNode(
    @Param('id') topologyId: string,
    @Param('agentId') agentId: string,
    @Body() body: { reason?: string },
  ) {
    const success = await this.topologyService.isolateNode(
      topologyId,
      agentId,
      (body.reason as any) || 'emergency',
    );
    return { success };
  }

  @Post('topology/:id/restore/:agentId')
  async restoreNode(
    @Param('id') topologyId: string,
    @Param('agentId') agentId: string,
  ) {
    const success = await this.topologyService.restoreNode(topologyId, agentId);
    return { success };
  }

  @Post('topology/:id/retype')
  async retypeTopology(
    @Param('id') topologyId: string,
    @Body() body: { type: TopologyType },
  ) {
    const success = await this.topologyService.retypeTopology(topologyId, body.type);
    return { success };
  }

  @Get('topology/:id/metrics')
  async getTopologyMetrics(@Param('id') topologyId: string) {
    return this.topologyService.getMetrics(topologyId);
  }

  @Get('topology/list')
  async listTopologies() {
    return this.topologyService.getAllTopologies();
  }

  // ─── DAG Endpoints ────────────────────────────────────────────

  @Post('dag/execute')
  async executeDAG(@Body() dag: DAGDefinition) {
    return this.dagService.executeDAG(dag);
  }

  @Get('dag/:id/result')
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
  async getDAGTrace(@Param('id') id: string) {
    return this.dagService.getExecutionTrace(id);
  }

  @Get('dag/stats')
  async getDAGStats() {
    return this.dagService.getStats();
  }
}
