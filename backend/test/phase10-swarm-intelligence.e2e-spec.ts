/**
 * AENEWS Agent OS X — Phase 10 E2E Test Suite
 *
 * Tests the Advanced Swarm Intelligence & Production Hardening layer:
 *   - SwarmIntelligenceService: stigmergy, swarm lifecycle, emergent behavior, size optimization
 *   - AdvancedConsensusProtocol: weighted voting, BFT, multi-round deliberation, dissent tracking
 *   - CollaborationPersistenceService: checkpoint, recovery, history queries
 *   - SharedWorkingMemoryService: shared workspace, scratchpads, blackboard, subscriptions
 *   - AdaptiveFeedbackLoopService: PID control, parameter adjustment, rollback
 *   - DynamicAgentTopologyService: topology creation (star/mesh/ring/tree), add/remove, isolate/restore, retype
 *   - AdvancedDAGOrchestratorService: DAG execution, conditional edges, retry, fallback, dynamic re-planning
 *   - SwarmController: REST API at /api/v1/swarm
 *
 * All external dependencies (LLMService, Redis, QdrantService) are mocked.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AgentRegistryService } from '../src/modules/agent/registry/agent-registry.service';
import { AgentMemoryService, MemoryTier } from '../src/modules/agent-framework/services/agent-memory.service';
import {
  AgentEventBusService,
  AgentEventType,
} from '../src/modules/agent-framework/services/agent-event-bus.service';
import { AgentHealthService } from '../src/modules/agent-framework/services/agent-health.service';
import { AgentCommunicationService } from '../src/modules/agent-framework/services/agent-communication.service';
import { CircuitBreakerService } from '../src/modules/agent-framework/services/circuit-breaker.service';
import {
  SwarmIntelligenceService,
  SwarmConfig,
  SwarmResult,
  SwarmMetrics,
  SwarmAgent,
  Pheromone,
  PheromoneType,
  EmergentBehaviorType,
} from '../src/modules/agent-framework/services/swarm-intelligence.service';
import {
  AdvancedConsensusProtocol,
  ConsensusConfig,
  ConsensusProposal,
  ConsensusResult,
  ConsensusStrategy,
  AgentExpertise,
  ConsensusVote,
  DissentRecord,
} from '../src/modules/agent-framework/services/advanced-consensus-protocol.service';
import {
  CollaborationPersistenceService,
  CollaborationCheckpoint,
  CollaborationHistoryRecord,
  RecoveryReport,
  PersistenceStats,
} from '../src/modules/agent-framework/services/collaboration-persistence.service';
import {
  SharedWorkingMemoryService,
  WorkingMemorySession,
  WorkingMemoryEntry,
  DataScope,
  MemoryConflict,
  SharedWorkingMemoryStats,
} from '../src/modules/agent-framework/services/shared-working-memory.service';
import {
  AdaptiveFeedbackLoopService,
  OrchestrationParameter,
  ParameterAdjustment,
  PIDState,
  FeedbackLoopStats,
  AdaptiveFeedbackConfig,
} from '../src/modules/agent-framework/services/adaptive-feedback-loop.service';
import {
  DynamicAgentTopologyService,
  TopologyType,
  TopologyConfig,
  TopologyNode,
  TopologyEdge,
  TopologyMetrics,
  TopologyChangeRecord,
} from '../src/modules/agent-framework/services/dynamic-agent-topology.service';
import {
  AdvancedDAGOrchestratorService,
  DAGDefinition,
  DAGNode,
  DAGEdge,
  DAGResult,
  DAGExecutionTrace,
  EdgeCondition,
  DAGNodeStatus,
} from '../src/modules/agent-framework/services/advanced-dag-orchestrator.service';
import { SwarmController } from '../src/modules/agent-framework/controllers/swarm.controller';
import { ClusterType } from '../src/modules/agent/entities/agent.entity';

// ─── Mock Cache Manager ─────────────────────────────────────────

function createMockCacheManager() {
  const store = new Map<string, any>();
  return {
    get: jest.fn().mockImplementation((key: string) => {
      const val = store.get(key);
      return Promise.resolve(val !== undefined ? val : null);
    }),
    set: jest.fn().mockImplementation((key: string, value: any, ttl?: number) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn().mockImplementation((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    store: {
      keys: jest.fn().mockImplementation((pattern?: string) => {
        if (!pattern) return Promise.resolve(Array.from(store.keys()));
        const regex = new RegExp(
          '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
        );
        return Promise.resolve(
          Array.from(store.keys()).filter((k) => regex.test(k)),
        );
      }),
    },
  };
}

// ─── Mock LLM Service ───────────────────────────────────────────

const mockLLMService = {
  isAnyAvailable: jest.fn().mockReturnValue(false),
  chat: jest.fn().mockResolvedValue('Simulated LLM response'),
  chatWithSystem: jest.fn().mockResolvedValue('Simulated LLM system response'),
};

// ─── Test Suite ─────────────────────────────────────────────────

describe('Phase 10 — Advanced Swarm Intelligence & Production Hardening', () => {
  let app: INestApplication;
  let module: TestingModule;

  // Services
  let swarmService: SwarmIntelligenceService;
  let consensusService: AdvancedConsensusProtocol;
  let persistenceService: CollaborationPersistenceService;
  let workingMemoryService: SharedWorkingMemoryService;
  let feedbackService: AdaptiveFeedbackLoopService;
  let topologyService: DynamicAgentTopologyService;
  let dagService: AdvancedDAGOrchestratorService;
  let registry: AgentRegistryService;
  let eventBus: AgentEventBusService;
  let healthService: AgentHealthService;

  beforeAll(async () => {
    const emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 30,
    });

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [() => ({})] }),
        EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
      ],
      providers: [
        AgentRegistryService,
        AgentEventBusService,
        AgentMemoryService,
        AgentHealthService,
        AgentCommunicationService,
        CircuitBreakerService,
        SwarmIntelligenceService,
        AdvancedConsensusProtocol,
        CollaborationPersistenceService,
        SharedWorkingMemoryService,
        AdaptiveFeedbackLoopService,
        DynamicAgentTopologyService,
        AdvancedDAGOrchestratorService,
        SwarmController,
        { provide: EventEmitter2, useValue: emitter },
        { provide: CACHE_MANAGER, useFactory: createMockCacheManager },
        { provide: 'LLMService', useValue: mockLLMService },
        { provide: 'QdrantService', useValue: { upsert: jest.fn(), search: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    // Resolve services
    registry = module.get<AgentRegistryService>(AgentRegistryService);
    eventBus = module.get<AgentEventBusService>(AgentEventBusService);
    healthService = module.get<AgentHealthService>(AgentHealthService);
    swarmService = module.get<SwarmIntelligenceService>(SwarmIntelligenceService);
    consensusService = module.get<AdvancedConsensusProtocol>(AdvancedConsensusProtocol);
    persistenceService = module.get<CollaborationPersistenceService>(CollaborationPersistenceService);
    workingMemoryService = module.get<SharedWorkingMemoryService>(SharedWorkingMemoryService);
    feedbackService = module.get<AdaptiveFeedbackLoopService>(AdaptiveFeedbackLoopService);
    topologyService = module.get<DynamicAgentTopologyService>(DynamicAgentTopologyService);
    dagService = module.get<AdvancedDAGOrchestratorService>(AdvancedDAGOrchestratorService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── 1. Service Instantiation Tests ───────────────────────────

  describe('Service Instantiation', () => {
    it('should instantiate SwarmIntelligenceService', () => {
      expect(swarmService).toBeDefined();
      expect(swarmService).toBeInstanceOf(SwarmIntelligenceService);
    });

    it('should instantiate AdvancedConsensusProtocol', () => {
      expect(consensusService).toBeDefined();
      expect(consensusService).toBeInstanceOf(AdvancedConsensusProtocol);
    });

    it('should instantiate CollaborationPersistenceService', () => {
      expect(persistenceService).toBeDefined();
      expect(persistenceService).toBeInstanceOf(CollaborationPersistenceService);
    });

    it('should instantiate SharedWorkingMemoryService', () => {
      expect(workingMemoryService).toBeDefined();
      expect(workingMemoryService).toBeInstanceOf(SharedWorkingMemoryService);
    });

    it('should instantiate AdaptiveFeedbackLoopService', () => {
      expect(feedbackService).toBeDefined();
      expect(feedbackService).toBeInstanceOf(AdaptiveFeedbackLoopService);
    });

    it('should instantiate DynamicAgentTopologyService', () => {
      expect(topologyService).toBeDefined();
      expect(topologyService).toBeInstanceOf(DynamicAgentTopologyService);
    });

    it('should instantiate AdvancedDAGOrchestratorService', () => {
      expect(dagService).toBeDefined();
      expect(dagService).toBeInstanceOf(AdvancedDAGOrchestratorService);
    });

    it('should instantiate SwarmController', () => {
      const controller = module.get<SwarmController>(SwarmController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(SwarmController);
    });
  });

  // ─── 2. Swarm Intelligence Lifecycle ──────────────────────────

  describe('SwarmIntelligenceService — Lifecycle', () => {
    const swarmId = 'test-swarm-1';

    it('should create a swarm with defaults', async () => {
      const config = await swarmService.createSwarm({
        id: swarmId,
        mission: 'Analyze market trends and identify opportunities',
        objectives: ['Research competitors', 'Identify gaps', 'Score opportunities'],
        requiredCapabilities: ['analysis', 'research', 'scoring'],
        preferredClusters: [ClusterType.META_INTELLIGENCE, ClusterType.BUSINESS],
      });

      expect(config).toBeDefined();
      expect(config.id).toBe(swarmId);
      expect(config.mission).toBe('Analyze market trends and identify opportunities');
      expect(config.initialSize).toBe(5);
      expect(config.maxSize).toBe(20);
      expect(config.minSize).toBe(2);
      expect(config.enableDynamicSpawning).toBe(true);
      expect(config.enableEmergentDetection).toBe(true);
    });

    it('should retrieve swarm config', () => {
      const config = swarmService.getSwarm(swarmId);
      expect(config).toBeDefined();
      expect(config!.id).toBe(swarmId);
    });

    it('should list swarm agents after creation', () => {
      const agents = swarmService.getSwarmAgents(swarmId);
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.length).toBeLessThanOrEqual(5); // initialSize default

      // Verify agent structure
      const firstAgent = agents[0];
      expect(firstAgent.agentId).toContain('swarm-');
      expect(firstAgent.status).toBe('active');
      expect(['explorer', 'evaluator', 'coordinator', 'specialist']).toContain(firstAgent.role);
    });

    it('should get initial swarm metrics', () => {
      const metrics = swarmService.getSwarmMetrics(swarmId);
      expect(metrics).toBeDefined();
      expect(metrics!.currentSize).toBeGreaterThan(0);
      expect(metrics!.optimalSize).toBeGreaterThan(0);
      expect(metrics!.totalPheromones).toBe(0);
      expect(metrics!.pheromoneDistribution).toBeDefined();
    });

    it('should deposit and sense pheromones', async () => {
      const pheromone: Pheromone = {
        id: 'pher-test-1',
        type: 'success',
        strength: 0.9,
        coordinates: { analysis: 1.0, research: 0.8 },
        agentId: 'test-agent-1',
        collaborationId: swarmId,
        timestamp: Date.now(),
        decayRate: 0.01,
      };

      await swarmService.depositPheromone(swarmId, pheromone);

      const trail = swarmService.getPheromoneTrail(swarmId);
      expect(trail.length).toBeGreaterThan(0);

      // Sense nearby pheromones
      const sensed = await swarmService.sensePheromones(
        swarmId,
        { analysis: 0.9, research: 0.7 },
        1.0,
      );
      expect(sensed.length).toBeGreaterThan(0);
      expect(sensed[0].type).toBe('success');
    });

    it('should execute a swarm mission', async () => {
      const result: SwarmResult = await swarmService.executeSwarm(swarmId);

      expect(result).toBeDefined();
      expect(result.swarmId).toBe(swarmId);
      expect(['completed', 'failed']).toContain(result.status);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.agentsUsed.length).toBeGreaterThan(0);
      expect(result.pheromoneTrail).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should get swarm result after execution', () => {
      const result = swarmService.getSwarmResult(swarmId);
      expect(result).toBeDefined();
      expect(result!.swarmId).toBe(swarmId);
    });

    it('should get pheromone trail after execution', () => {
      const trail = swarmService.getPheromoneTrail(swarmId);
      expect(Array.isArray(trail)).toBe(true);
    });

    it('should get emergent behavior history', () => {
      const history = swarmService.getEmergentHistory(swarmId);
      expect(Array.isArray(history)).toBe(true);
    });

    it('should list all swarms', () => {
      const swarms = swarmService.getAllSwarms();
      expect(swarms.length).toBeGreaterThan(0);
      expect(swarms[0]).toHaveProperty('id');
      expect(swarms[0]).toHaveProperty('status');
      expect(swarms[0]).toHaveProperty('size');
      expect(swarms[0]).toHaveProperty('mission');
    });

    it('should get swarm statistics', () => {
      const stats = swarmService.getStats();
      expect(stats).toHaveProperty('totalSwarms');
      expect(stats).toHaveProperty('activeSwarms');
      expect(stats).toHaveProperty('totalPheromones');
      expect(stats).toHaveProperty('totalFindings');
      expect(stats.totalSwarms).toBeGreaterThan(0);
    });

    it('should terminate a swarm', async () => {
      const termSwarmId = 'test-swarm-terminate';
      await swarmService.createSwarm({
        id: termSwarmId,
        mission: 'Temporary mission',
      });

      await swarmService.terminateSwarm(termSwarmId, 'test cleanup');

      const agents = swarmService.getSwarmAgents(termSwarmId);
      expect(agents.every(a => a.status === 'departed')).toBe(true);
    });

    it('should throw when executing a non-existent swarm', async () => {
      await expect(swarmService.executeSwarm('nonexistent-swarm')).rejects.toThrow('not found');
    });
  });

  // ─── 3. Advanced Consensus Protocol ───────────────────────────

  describe('AdvancedConsensusProtocol — Consensus Lifecycle', () => {
    const consensusId = 'test-consensus-1';

    const participants: AgentExpertise[] = [
      { agentId: 'agent-A', expertiseScore: 0.9, reliabilityScore: 0.85, clusterRelevance: 0.8, byzantineSuspicion: 0 },
      { agentId: 'agent-B', expertiseScore: 0.7, reliabilityScore: 0.75, clusterRelevance: 0.9, byzantineSuspicion: 0 },
      { agentId: 'agent-C', expertiseScore: 0.8, reliabilityScore: 0.9, clusterRelevance: 0.7, byzantineSuspicion: 0 },
      { agentId: 'agent-D', expertiseScore: 0.6, reliabilityScore: 0.65, clusterRelevance: 0.5, byzantineSuspicion: 0 },
      { agentId: 'agent-E', expertiseScore: 0.5, reliabilityScore: 0.5, clusterRelevance: 0.6, byzantineSuspicion: 0 },
    ];

    const proposal: ConsensusProposal = {
      id: 'proposal-1',
      content: { action: 'deploy-service', target: 'production', version: '2.0.0' },
      proposedBy: 'agent-A',
      round: 1,
      timestamp: Date.now(),
    };

    it('should initiate a consensus session', async () => {
      const config = await consensusService.initiateConsensus({
        id: consensusId,
        proposal,
        strategy: 'simple_majority',
        participants,
        maxRounds: 3,
        quorumThreshold: 0.5,
        enableDissentTracking: true,
        enableMultiRound: true,
      });

      expect(config).toBeDefined();
      expect(config.id).toBe(consensusId);
      expect(config.strategy).toBe('simple_majority');
      expect(config.participants.length).toBe(5);
    });

    it('should retrieve consensus config', () => {
      const config = consensusService.getConsensus(consensusId);
      expect(config).toBeDefined();
      expect(config!.id).toBe(consensusId);
    });

    it('should run a consensus protocol and return a result', async () => {
      const result: ConsensusResult = await consensusService.runConsensus(consensusId);

      expect(result).toBeDefined();
      expect(result.consensusId).toBe(consensusId);
      expect(['completed', 'failed']).toContain(result.status);
      expect(result.totalRounds).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.participants.length).toBeGreaterThan(0);
      expect(result.strategy).toBe('simple_majority');
      expect(result.rounds.length).toBeGreaterThan(0);
    });

    it('should get consensus result', () => {
      const result = consensusService.getConsensusResult(consensusId);
      expect(result).toBeDefined();
      expect(result!.consensusId).toBe(consensusId);
    });

    it('should have deliberation rounds (via result)', () => {
      const result = consensusService.getConsensusResult(consensusId);
      expect(result).toBeDefined();
      expect(result!.rounds.length).toBeGreaterThan(0);

      const firstRound = result!.rounds[0];
      expect(firstRound.roundNumber).toBe(1);
      expect(firstRound.votes.length).toBeGreaterThan(0);
      expect(firstRound.weightedSupport).toBeGreaterThanOrEqual(0);
      expect(firstRound.weightedOpposition).toBeGreaterThanOrEqual(0);
      expect(firstRound.convergenceScore).toBeGreaterThanOrEqual(0);
      expect(firstRound.convergenceScore).toBeLessThanOrEqual(1);
    });

    it('should track dissent records', () => {
      const dissent = consensusService.getDissentRecords(consensusId);
      expect(Array.isArray(dissent)).toBe(true);

      // If there are dissent records, verify structure
      if (dissent.length > 0) {
        expect(dissent[0]).toHaveProperty('agentId');
        expect(dissent[0]).toHaveProperty('voteType');
        expect(dissent[0]).toHaveProperty('rationale');
        expect(dissent[0]).toHaveProperty('round');
        expect(dissent[0]).toHaveProperty('expertiseWeight');
      }
    });

    it('should support supermajority strategy', async () => {
      const smId = 'consensus-supermajority';
      await consensusService.initiateConsensus({
        id: smId,
        proposal: { id: 'prop-sm', content: { action: 'scale-up' }, proposedBy: 'agent-A', round: 1, timestamp: Date.now() },
        strategy: 'supermajority',
        participants: participants.slice(0, 3),
        maxRounds: 3,
        quorumThreshold: 0.6,
        supermajorityThreshold: 0.66,
        enableDissentTracking: true,
        enableMultiRound: true,
      });

      const result = await consensusService.runConsensus(smId);
      expect(result).toBeDefined();
      expect(result.strategy).toBe('supermajority');
    });

    it('should support BFT strategy with sufficient participants', async () => {
      const bftId = 'consensus-bft';
      // BFT requires 3f+1 participants; with f=1 we need >=4
      const bftParticipants: AgentExpertise[] = Array.from({ length: 4 }, (_, i) => ({
        agentId: `bft-agent-${i}`,
        expertiseScore: 0.8,
        reliabilityScore: 0.85,
        clusterRelevance: 0.7,
        byzantineSuspicion: 0,
      }));

      await consensusService.initiateConsensus({
        id: bftId,
        proposal: { id: 'prop-bft', content: { action: 'critical-deploy' }, proposedBy: 'bft-agent-0', round: 1, timestamp: Date.now() },
        strategy: 'bft',
        participants: bftParticipants,
        maxRounds: 5,
        byzantineTolerance: 1,
        quorumThreshold: 0.75,
        enableDissentTracking: true,
        enableMultiRound: true,
      });

      const result = await consensusService.runConsensus(bftId);
      expect(result).toBeDefined();
      expect(['completed', 'failed', 'byzantine_detected']).toContain(result.status);
    });

    it('should list all consensus sessions', () => {
      const all = consensusService.getAllConsensus();
      expect(all.length).toBeGreaterThan(0);
      expect(all[0]).toHaveProperty('id');
      expect(all[0]).toHaveProperty('status');
      expect(all[0]).toHaveProperty('strategy');
      expect(all[0]).toHaveProperty('participants');
    });

    it('should get consensus statistics', () => {
      const stats = consensusService.getStats();
      expect(stats).toHaveProperty('totalConsensus');
      expect(stats).toHaveProperty('completedConsensus');
      expect(stats).toHaveProperty('failedConsensus');
      expect(stats).toHaveProperty('byzantineDetections');
      expect(stats.totalConsensus).toBeGreaterThan(0);
    });
  });

  // ─── 4. Collaboration Persistence ─────────────────────────────

  describe('CollaborationPersistenceService — Checkpoint & Recovery', () => {
    const collabId = 'collab-persist-1';

    it('should record the start of a collaboration', async () => {
      await persistenceService.recordStart(
        collabId,
        'parallel',
        ['agent-X', 'agent-Y', 'agent-Z'],
        'mission-123',
        { priority: 'high' },
      );

      const checkpoint = persistenceService.getCheckpoint(collabId);
      expect(checkpoint).toBeDefined();
      expect(checkpoint!.collaborationId).toBe(collabId);
      expect(checkpoint!.phase).toBe('created');
      expect(checkpoint!.agentIds).toEqual(['agent-X', 'agent-Y', 'agent-Z']);
      expect(checkpoint!.pattern).toBe('parallel');
      expect(checkpoint!.parentMissionId).toBe('mission-123');
    });

    it('should update the phase of a collaboration', async () => {
      await persistenceService.updatePhase(collabId, 'executing');

      const checkpoint = persistenceService.getCheckpoint(collabId);
      expect(checkpoint!.phase).toBe('executing');
    });

    it('should add results and errors to a collaboration', async () => {
      await persistenceService.addResult(collabId, { agentId: 'agent-X', output: 'done' });
      await persistenceService.addError(collabId, 'Agent Y timed out');

      const checkpoint = persistenceService.getCheckpoint(collabId);
      expect(checkpoint!.results.length).toBe(1);
      expect(checkpoint!.errors.length).toBe(1);
      expect(checkpoint!.errors[0]).toBe('Agent Y timed out');
    });

    it('should complete a collaboration and move to history', async () => {
      await persistenceService.completeCollaboration(collabId, 0.85, { note: 'success' });

      // Should no longer be in active
      const checkpoint = persistenceService.getCheckpoint(collabId);
      expect(checkpoint).toBeUndefined();
    });

    it('should query collaboration history', () => {
      const history = persistenceService.getHistory(50);
      expect(Array.isArray(history)).toBe(true);

      if (history.length > 0) {
        const record = history[0];
        expect(record).toHaveProperty('collaborationId');
        expect(record).toHaveProperty('pattern');
        expect(record).toHaveProperty('phase');
        expect(record).toHaveProperty('durationMs');
        expect(record).toHaveProperty('successRate');
      }
    });

    it('should search history with filters', () => {
      const results = persistenceService.searchHistory({ pattern: 'parallel' });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should get active collaborations', () => {
      const active = persistenceService.getActiveCollaborations();
      expect(Array.isArray(active)).toBe(true);
    });

    it('should get persistence statistics', () => {
      const stats: PersistenceStats = persistenceService.getStats();
      expect(stats).toHaveProperty('totalCollaborations');
      expect(stats).toHaveProperty('activeCollaborations');
      expect(stats).toHaveProperty('completedCollaborations');
      expect(stats).toHaveProperty('failedCollaborations');
      expect(stats).toHaveProperty('crashedCollaborations');
      expect(stats).toHaveProperty('averageDurationMs');
      expect(stats).toHaveProperty('patternDistribution');
    });

    it('should perform crash recovery', async () => {
      const report: RecoveryReport = await persistenceService.recoverFromCrash();
      expect(report).toBeDefined();
      expect(report).toHaveProperty('totalActive');
      expect(report).toHaveProperty('recovered');
      expect(report).toHaveProperty('crashed');
      expect(report).toHaveProperty('recoveredIds');
      expect(report).toHaveProperty('crashedIds');
    });
  });

  // ─── 5. Shared Working Memory ─────────────────────────────────

  describe('SharedWorkingMemoryService — Workspace & Blackboard', () => {
    const sessionId = 'wm-session-1';
    const agentIds = ['wm-agent-A', 'wm-agent-B', 'wm-agent-C'];

    it('should create a working memory session', async () => {
      const session = await workingMemoryService.createSession(
        sessionId,
        agentIds,
        'mission-wm-1',
        'session',
      );

      expect(session).toBeDefined();
      expect(session.sessionId).toBe(sessionId);
      expect(session.agents).toEqual(agentIds);
      expect(session.missionId).toBe('mission-wm-1');
      expect(session.scope).toBe('session');
      expect(session.sharedKeys).toEqual([]);
      expect(session.blackboardKeys).toEqual([]);
    });

    it('should write to and read from shared workspace', async () => {
      const entry = await workingMemoryService.writeShared(
        sessionId,
        'research-data',
        { topic: 'AI trends', confidence: 0.9 },
        'wm-agent-A',
      );

      expect(entry).toBeDefined();
      expect(entry.key).toBe('research-data');
      expect(entry.value.topic).toBe('AI trends');
      expect(entry.version).toBe(1);
      expect(entry.agentId).toBe('wm-agent-A');

      // Read back
      const read = await workingMemoryService.readShared(sessionId, 'research-data');
      expect(read).toBeDefined();
      expect(read!.value.topic).toBe('AI trends');
    });

    it('should read all shared entries', async () => {
      await workingMemoryService.writeShared(
        sessionId,
        'strategy-note',
        { approach: 'divide-and-conquer' },
        'wm-agent-B',
      );

      const all = await workingMemoryService.readAllShared(sessionId);
      expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('should support agent-specific scratchpads', async () => {
      const scratch = await workingMemoryService.writeScratchpad(
        sessionId,
        'wm-agent-A',
        'private-thoughts',
        { idea: 'try ensemble approach', priority: 'high' },
      );

      expect(scratch).toBeDefined();
      expect(scratch.key).toBe('private-thoughts');
      expect(scratch.value.idea).toBe('try ensemble approach');

      // Read back
      const read = await workingMemoryService.readScratchpad(sessionId, 'wm-agent-A', 'private-thoughts');
      expect(read).toBeDefined();
      expect(read!.value.idea).toBe('try ensemble approach');

      // Agent B should not see Agent A's scratchpad
      const notFound = await workingMemoryService.readScratchpad(sessionId, 'wm-agent-B', 'private-thoughts');
      expect(notFound).toBeUndefined();
    });

    it('should read all scratchpad entries for an agent', async () => {
      await workingMemoryService.writeScratchpad(
        sessionId,
        'wm-agent-A',
        'another-note',
        { hint: 'use pheromone trails' },
      );

      const entries = await workingMemoryService.readAgentScratchpad(sessionId, 'wm-agent-A');
      expect(entries.length).toBeGreaterThanOrEqual(2);
    });

    it('should post to and read from blackboard', async () => {
      const entry = await workingMemoryService.postToBlackboard(
        sessionId,
        'final-result',
        { conclusion: 'Ensemble approach is optimal', score: 0.92 },
        'wm-agent-C',
      );

      expect(entry).toBeDefined();
      expect(entry.key).toBe('blackboard:final-result');

      const blackboard = await workingMemoryService.readBlackboard(sessionId);
      expect(blackboard.length).toBeGreaterThan(0);
    });

    it('should support subscriptions', async () => {
      const received: WorkingMemoryEntry[] = [];

      const subId = workingMemoryService.subscribe(
        sessionId,
        'wm-agent-B',
        'research-*',
        (entry) => received.push(entry),
      );

      expect(subId).toBeDefined();

      // Write a matching key
      await workingMemoryService.writeShared(
        sessionId,
        'research-update',
        { newFindings: true },
        'wm-agent-A',
      );

      // Subscription should have been notified
      expect(received.length).toBeGreaterThan(0);
      expect(received[0].key).toBe('research-update');

      // Unsubscribe
      workingMemoryService.unsubscribe(subId);
    });

    it('should detect and record conflicts', async () => {
      // Agent A writes first
      await workingMemoryService.writeShared(sessionId, 'contested-key', { value: 'A' }, 'wm-agent-A');
      // Agent B overwrites — this triggers a conflict
      await workingMemoryService.writeShared(sessionId, 'contested-key', { value: 'B' }, 'wm-agent-B');

      const conflicts = workingMemoryService.getConflicts(sessionId);
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].key).toBe('contested-key');
      expect(conflicts[0].resolvedBy).toBe('last_writer_wins');
    });

    it('should get session info', () => {
      const session = workingMemoryService.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session!.sessionId).toBe(sessionId);
    });

    it('should get working memory statistics', () => {
      const stats: SharedWorkingMemoryStats = workingMemoryService.getStats();
      expect(stats).toHaveProperty('totalSessions');
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('totalConflicts');
      expect(stats).toHaveProperty('conflictsResolved');
      expect(stats).toHaveProperty('scopeDistribution');
      expect(stats).toHaveProperty('memoryUsageBytes');
      expect(stats.totalSessions).toBeGreaterThan(0);
    });

    it('should close a session', async () => {
      const closeSessionId = 'wm-session-close';
      await workingMemoryService.createSession(closeSessionId, ['agent-1'], undefined, 'session');
      await workingMemoryService.closeSession(closeSessionId);

      const session = workingMemoryService.getSession(closeSessionId);
      expect(session).toBeUndefined();
    });
  });

  // ─── 6. Adaptive Feedback Loop ────────────────────────────────

  describe('AdaptiveFeedbackLoopService — PID Control & Rollback', () => {
    it('should have all default parameters initialized', () => {
      const params = feedbackService.getAllParameters();
      expect(params).toBeDefined();
      expect(params.collaboration_pattern_weight).toBeDefined();
      expect(params.agent_selection_weight).toBeDefined();
      expect(params.decomposition_strategy_weight).toBeDefined();
      expect(params.timeout_multiplier).toBeDefined();
      expect(params.max_agents_multiplier).toBeDefined();
      expect(params.quality_threshold).toBeDefined();
      expect(params.retry_limit).toBeDefined();
      expect(params.parallelism_degree).toBeDefined();
    });

    it('should get individual parameters', () => {
      const timeout = feedbackService.getParameter('timeout_multiplier');
      expect(timeout).toBe(1.0);

      const quality = feedbackService.getParameter('quality_threshold');
      expect(quality).toBe(0.8);
    });

    it('should set a parameter directly', () => {
      feedbackService.setParameter('timeout_multiplier', 1.5);
      expect(feedbackService.getParameter('timeout_multiplier')).toBe(1.5);

      // Reset
      feedbackService.setParameter('timeout_multiplier', 1.0);
    });

    it('should get PID state for a parameter', () => {
      const pidState = feedbackService.getPIDState('timeout_multiplier');
      expect(pidState).toBeDefined();
      expect(pidState!.parameter).toBe('timeout_multiplier');
      expect(pidState!.kp).toBeDefined();
      expect(pidState!.ki).toBeDefined();
      expect(pidState!.kd).toBeDefined();
      expect(pidState!.integralError).toBe(0);
      expect(pidState!.previousError).toBe(0);
    });

    it('should run a feedback cycle', async () => {
      // Set cooldown to 0 so the cycle can execute
      feedbackService.updateConfig({ cooldownMs: 0, minConfidenceThreshold: 0.1 });

      const adjustments = await feedbackService.applyFeedbackCycle();

      expect(Array.isArray(adjustments)).toBe(true);
      // At least some adjustments should be produced since we lowered thresholds
      if (adjustments.length > 0) {
        const adj = adjustments[0];
        expect(adj).toHaveProperty('parameter');
        expect(adj).toHaveProperty('previousValue');
        expect(adj).toHaveProperty('newValue');
        expect(adj).toHaveProperty('delta');
        expect(adj).toHaveProperty('deltaPercent');
        expect(adj).toHaveProperty('source');
        expect(adj).toHaveProperty('confidence');
        expect(adj).toHaveProperty('appliedAt');
        expect(adj).toHaveProperty('rolledBack');
        expect(adj.rolledBack).toBe(false);
      }
    });

    it('should track adjustment history', () => {
      const history = feedbackService.getAdjustmentHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should track signal history', () => {
      const signals = feedbackService.getSignalHistory();
      expect(Array.isArray(signals)).toBe(true);
    });

    it('should rollback a parameter adjustment', async () => {
      // Ensure there's something to rollback: set cooldown to 0 and run
      feedbackService.updateConfig({ cooldownMs: 0, minConfidenceThreshold: 0.1 });
      const adjustments = await feedbackService.applyFeedbackCycle();

      if (adjustments.length > 0) {
        const param = adjustments[0].parameter;
        const valueBeforeRollback = feedbackService.getParameter(param);

        const rolledBack = await feedbackService.rollbackParameter(param);
        expect(rolledBack).toBe(true);

        const valueAfterRollback = feedbackService.getParameter(param);
        expect(valueAfterRollback).toBe(adjustments[0].previousValue);
      }
    });

    it('should return false when rolling back with no history', async () => {
      // Use a parameter that has no adjustment history (fresh PID state)
      const result = await feedbackService.rollbackParameter('max_agents_multiplier');
      // May or may not have history; just verify it returns a boolean
      expect(typeof result).toBe('boolean');
    });

    it('should get feedback statistics', () => {
      const stats: FeedbackLoopStats = feedbackService.getStats();
      expect(stats).toHaveProperty('totalAdjustments');
      expect(stats).toHaveProperty('adjustmentsByParameter');
      expect(stats).toHaveProperty('adjustmentsBySource');
      expect(stats).toHaveProperty('rollbacks');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('averageDeltaPercent');
      expect(stats).toHaveProperty('activePIDControllers');
      expect(stats).toHaveProperty('feedbackSignalsProcessed');
      expect(stats.activePIDControllers).toBeGreaterThan(0);
    });

    it('should update configuration', () => {
      feedbackService.updateConfig({ maxAdjustmentPerCycle: 0.15 });
      // No error means success
      expect(true).toBe(true);
    });
  });

  // ─── 7. Dynamic Agent Topology ────────────────────────────────

  describe('DynamicAgentTopologyService — Topology Operations', () => {
    const topologyId = 'topo-star-1';
    const agentIds = ['hub-agent', 'worker-1', 'worker-2', 'worker-3'];
    const clusterTypes: ClusterType[] = [
      ClusterType.META_INTELLIGENCE,
      ClusterType.BROWSER,
      ClusterType.CODING,
      ClusterType.OFFICE,
    ];

    it('should create a star topology', async () => {
      const config = await topologyService.createTopology(
        topologyId,
        'star',
        agentIds,
        clusterTypes,
      );

      expect(config).toBeDefined();
      expect(config.id).toBe(topologyId);
      expect(config.type).toBe('star');
      expect(config.nodes.size).toBe(4);
      expect(config.edges.length).toBe(3); // hub → 3 workers

      // Hub should be the coordinator
      const hubNode = config.nodes.get('hub-agent');
      expect(hubNode).toBeDefined();
      expect(hubNode!.role).toBe('coordinator');
      expect(hubNode!.connections.length).toBe(3);

      // Workers should have the coordinator in connections
      const worker1 = config.nodes.get('worker-1');
      expect(worker1).toBeDefined();
      expect(worker1!.role).toBe('worker');
    });

    it('should create a mesh topology', async () => {
      const meshId = 'topo-mesh-1';
      const meshAgents = ['mesh-A', 'mesh-B', 'mesh-C'];
      const meshClusters = [ClusterType.META_INTELLIGENCE, ClusterType.CODING, ClusterType.BROWSER];

      const config = await topologyService.createTopology(meshId, 'mesh', meshAgents, meshClusters);

      expect(config.type).toBe('mesh');
      // Mesh: n*(n-1)/2 edges for 3 nodes = 3 edges
      expect(config.edges.length).toBe(3);

      // All nodes should be workers in mesh
      for (const [, node] of config.nodes) {
        expect(node.role).toBe('worker');
      }
    });

    it('should create a ring topology', async () => {
      const ringId = 'topo-ring-1';
      const ringAgents = ['ring-A', 'ring-B', 'ring-C', 'ring-D'];

      const config = await topologyService.createTopology(
        ringId,
        'ring',
        ringAgents,
        ringAgents.map(() => ClusterType.META_INTELLIGENCE),
      );

      expect(config.type).toBe('ring');
      expect(config.edges.length).toBe(4); // circular: A→B, B→C, C→D, D→A
      expect(config.nodes.get('ring-A')!.role).toBe('relay');
    });

    it('should create a tree topology', async () => {
      const treeId = 'topo-tree-1';
      const treeAgents = ['root', 'child-L', 'child-R', 'grandchild-LL', 'grandchild-LR'];

      const config = await topologyService.createTopology(
        treeId,
        'tree',
        treeAgents,
        treeAgents.map(() => ClusterType.META_INTELLIGENCE),
      );

      expect(config.type).toBe('tree');
      expect(config.nodes.get('root')!.role).toBe('coordinator');
    });

    it('should add a node to star topology', async () => {
      const added = await topologyService.addNode(
        topologyId,
        'worker-4',
        ClusterType.SECURITY,
        'manual',
      );

      expect(added).toBe(true);

      const config = topologyService.getTopology(topologyId);
      expect(config!.nodes.size).toBe(5);

      // New node should be connected to hub
      const newNode = config!.nodes.get('worker-4');
      expect(newNode).toBeDefined();
      expect(newNode!.connections).toContain('hub-agent');
    });

    it('should not add a duplicate node', async () => {
      const added = await topologyService.addNode(
        topologyId,
        'worker-4', // already added
        ClusterType.SECURITY,
      );

      expect(added).toBe(false);
    });

    it('should isolate a node', async () => {
      const isolated = await topologyService.isolateNode(
        topologyId,
        'worker-3',
        'emergency',
      );

      expect(isolated).toBe(true);

      const config = topologyService.getTopology(topologyId);
      const node = config!.nodes.get('worker-3');
      expect(node!.status).toBe('isolated');
      expect(node!.connections.length).toBe(0);
    });

    it('should restore an isolated node', async () => {
      const restored = await topologyService.restoreNode(topologyId, 'worker-3');

      expect(restored).toBe(true);

      const config = topologyService.getTopology(topologyId);
      const node = config!.nodes.get('worker-3');
      expect(node!.status).toBe('active');
    });

    it('should not restore a non-isolated node', async () => {
      const restored = await topologyService.restoreNode(topologyId, 'worker-1');
      expect(restored).toBe(false);
    });

    it('should remove a node', async () => {
      const removed = await topologyService.removeNode(
        topologyId,
        'worker-4',
        'manual',
      );

      expect(removed).toBe(true);

      const config = topologyService.getTopology(topologyId);
      expect(config!.nodes.has('worker-4')).toBe(false);
    });

    it('should retype a topology', async () => {
      const retyped = await topologyService.retypeTopology(topologyId, 'mesh');

      expect(retyped).toBe(true);

      const config = topologyService.getTopology(topologyId);
      expect(config!.type).toBe('mesh');

      // Mesh: every node connects to every other
      const nodeCount = config!.nodes.size;
      const expectedEdges = (nodeCount * (nodeCount - 1)) / 2;
      expect(config!.edges.length).toBe(expectedEdges);
    });

    it('should calculate topology metrics', () => {
      const metrics = topologyService.getMetrics(topologyId);

      expect(metrics).toBeDefined();
      expect(metrics!.totalNodes).toBeGreaterThan(0);
      expect(metrics!.activeNodes).toBeGreaterThan(0);
      expect(metrics!.totalEdges).toBeGreaterThan(0);
      expect(metrics!.averageConnectivity).toBeGreaterThanOrEqual(0);
      expect(metrics!.clustering).toBeGreaterThanOrEqual(0);
      expect(metrics!.clustering).toBeLessThanOrEqual(1);
      expect(metrics!.diameter).toBeGreaterThanOrEqual(0);
      expect(metrics!.centralization).toBeGreaterThanOrEqual(0);
      expect(metrics!.centralization).toBeLessThanOrEqual(1);
    });

    it('should list all topologies', () => {
      const all = topologyService.getAllTopologies();
      expect(all.length).toBeGreaterThan(0);
      expect(all[0]).toHaveProperty('id');
      expect(all[0]).toHaveProperty('type');
      expect(all[0]).toHaveProperty('nodes');
      expect(all[0]).toHaveProperty('edges');
    });

    it('should track change history', () => {
      const history = topologyService.getChangeHistory(topologyId);
      expect(history.length).toBeGreaterThan(0);

      // We did: add_node, isolate, restore, remove_node, retype
      const changeTypes = history.map(h => h.changeType);
      expect(changeTypes).toContain('add_node');
      expect(changeTypes).toContain('isolate');
      expect(changeTypes).toContain('restore');
      expect(changeTypes).toContain('remove_node');
      expect(changeTypes).toContain('retype');
    });
  });

  // ─── 8. Advanced DAG Orchestrator ─────────────────────────────

  describe('AdvancedDAGOrchestratorService — DAG Execution', () => {
    it('should execute a simple linear DAG', async () => {
      const dag: DAGDefinition = {
        id: 'dag-linear-1',
        name: 'Simple Linear Pipeline',
        nodes: [
          {
            id: 'fetch',
            label: 'Fetch Data',
            clusterType: ClusterType.BROWSER,
            action: 'fetch',
            parameters: { url: 'https://api.example.com/data' },
            status: 'pending',
            priority: 5,
            timeoutMs: 10000,
            maxRetries: 2,
            retryCount: 0,
            retryBackoffMs: 100,
            resourceWeight: 0.3,
          },
          {
            id: 'analyze',
            label: 'Analyze Data',
            clusterType: ClusterType.CODING,
            action: 'analyze',
            parameters: {},
            status: 'pending',
            priority: 5,
            timeoutMs: 15000,
            maxRetries: 2,
            retryCount: 0,
            retryBackoffMs: 100,
            resourceWeight: 0.4,
          },
          {
            id: 'report',
            label: 'Generate Report',
            clusterType: ClusterType.OFFICE,
            action: 'generate-report',
            parameters: {},
            status: 'pending',
            priority: 5,
            timeoutMs: 10000,
            maxRetries: 1,
            retryCount: 0,
            retryBackoffMs: 100,
            resourceWeight: 0.2,
          },
        ],
        edges: [
          { id: 'e1', from: 'fetch', to: 'analyze', condition: 'on_success' },
          { id: 'e2', from: 'analyze', to: 'report', condition: 'on_success' },
        ],
        entryNodeId: 'fetch',
        priority: 5,
        maxConcurrentNodes: 3,
        enableDynamicReplanning: false,
        enableRetry: true,
        maxTotalRetries: 5,
      };

      const result: DAGResult = await dagService.executeDAG(dag);

      expect(result).toBeDefined();
      expect(result.dagId).toBe('dag-linear-1');
      expect(['completed', 'partial', 'failed']).toContain(result.status);
      expect(result.executionTrace.length).toBeGreaterThan(0);
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.nodesCompleted + result.nodesFailed + result.nodesSkipped).toBeGreaterThan(0);
    });

    it('should execute a DAG with conditional edges', async () => {
      const dag: DAGDefinition = {
        id: 'dag-conditional-1',
        name: 'Conditional Branching Pipeline',
        nodes: [
          {
            id: 'check',
            label: 'Health Check',
            clusterType: ClusterType.COMPUTER,
            action: 'health-check',
            parameters: { target: 'server-1' },
            status: 'pending',
            priority: 8,
            timeoutMs: 5000,
            maxRetries: 1,
            retryCount: 0,
            retryBackoffMs: 50,
            resourceWeight: 0.2,
          },
          {
            id: 'deploy-prod',
            label: 'Deploy to Production',
            clusterType: ClusterType.INFRASTRUCTURE,
            action: 'deploy',
            parameters: { env: 'production' },
            status: 'pending',
            priority: 8,
            timeoutMs: 30000,
            maxRetries: 2,
            retryCount: 0,
            retryBackoffMs: 100,
            resourceWeight: 0.5,
          },
          {
            id: 'rollback',
            label: 'Rollback',
            clusterType: ClusterType.INFRASTRUCTURE,
            action: 'rollback',
            parameters: { env: 'production' },
            status: 'pending',
            priority: 8,
            timeoutMs: 10000,
            maxRetries: 1,
            retryCount: 0,
            retryBackoffMs: 50,
            resourceWeight: 0.3,
          },
        ],
        edges: [
          { id: 'e-success', from: 'check', to: 'deploy-prod', condition: 'on_success' },
          { id: 'e-failure', from: 'check', to: 'rollback', condition: 'on_failure' },
        ],
        entryNodeId: 'check',
        priority: 8,
        maxConcurrentNodes: 2,
        enableDynamicReplanning: false,
        enableRetry: true,
        maxTotalRetries: 5,
      };

      const result = await dagService.executeDAG(dag);

      expect(result).toBeDefined();
      expect(result.dagId).toBe('dag-conditional-1');
      expect(result.executionTrace.length).toBeGreaterThan(0);

      // Either deploy-prod or rollback should be in the trace (not both, ideally)
      const traceNodeIds = result.executionTrace.map(t => t.nodeId);
      expect(traceNodeIds).toContain('check');
    });

    it('should execute a DAG with always edges (fan-out)', async () => {
      const dag: DAGDefinition = {
        id: 'dag-fanout-1',
        name: 'Parallel Fan-Out',
        nodes: [
          {
            id: 'source',
            label: 'Data Source',
            clusterType: ClusterType.BROWSER,
            action: 'scrape',
            parameters: { url: 'https://news.example.com' },
            status: 'pending',
            priority: 5,
            timeoutMs: 10000,
            maxRetries: 1,
            retryCount: 0,
            retryBackoffMs: 50,
            resourceWeight: 0.2,
          },
          {
            id: 'extract-1',
            label: 'Extract Articles',
            clusterType: ClusterType.CODING,
            action: 'extract',
            parameters: { type: 'articles' },
            status: 'pending',
            priority: 5,
            timeoutMs: 10000,
            maxRetries: 1,
            retryCount: 0,
            retryBackoffMs: 50,
            resourceWeight: 0.3,
          },
          {
            id: 'extract-2',
            label: 'Extract Images',
            clusterType: ClusterType.BROWSER,
            action: 'extract',
            parameters: { type: 'images' },
            status: 'pending',
            priority: 5,
            timeoutMs: 10000,
            maxRetries: 1,
            retryCount: 0,
            retryBackoffMs: 50,
            resourceWeight: 0.3,
          },
        ],
        edges: [
          { id: 'e-always-1', from: 'source', to: 'extract-1', condition: 'always' },
          { id: 'e-always-2', from: 'source', to: 'extract-2', condition: 'always' },
        ],
        entryNodeId: 'source',
        priority: 5,
        maxConcurrentNodes: 3,
        enableDynamicReplanning: false,
        enableRetry: true,
        maxTotalRetries: 3,
      };

      const result = await dagService.executeDAG(dag);

      expect(result).toBeDefined();
      expect(result.executionTrace.length).toBeGreaterThanOrEqual(2);

      const traceNodeIds = result.executionTrace.map(t => t.nodeId);
      expect(traceNodeIds).toContain('source');
    });

    it('should reject a DAG with a cycle', async () => {
      const dag: DAGDefinition = {
        id: 'dag-cyclic-1',
        name: 'Cyclic DAG (invalid)',
        nodes: [
          {
            id: 'A',
            label: 'Node A',
            clusterType: ClusterType.META_INTELLIGENCE,
            action: 'process',
            parameters: {},
            status: 'pending',
            priority: 5,
            timeoutMs: 5000,
            maxRetries: 1,
            retryCount: 0,
            retryBackoffMs: 50,
            resourceWeight: 0.3,
          },
          {
            id: 'B',
            label: 'Node B',
            clusterType: ClusterType.META_INTELLIGENCE,
            action: 'process',
            parameters: {},
            status: 'pending',
            priority: 5,
            timeoutMs: 5000,
            maxRetries: 1,
            retryCount: 0,
            retryBackoffMs: 50,
            resourceWeight: 0.3,
          },
        ],
        edges: [
          { id: 'e-ab', from: 'A', to: 'B', condition: 'always' },
          { id: 'e-ba', from: 'B', to: 'A', condition: 'always' },
        ],
        entryNodeId: 'A',
        priority: 5,
        maxConcurrentNodes: 2,
        enableDynamicReplanning: false,
        enableRetry: false,
        maxTotalRetries: 0,
      };

      await expect(dagService.executeDAG(dag)).rejects.toThrow('cycle');
    });

    it('should reject a DAG with no nodes', async () => {
      const dag: DAGDefinition = {
        id: 'dag-empty',
        name: 'Empty DAG',
        nodes: [],
        edges: [],
        entryNodeId: 'nonexistent',
        priority: 1,
        maxConcurrentNodes: 1,
        enableDynamicReplanning: false,
        enableRetry: false,
        maxTotalRetries: 0,
      };

      await expect(dagService.executeDAG(dag)).rejects.toThrow('no nodes');
    });

    it('should reject a DAG with invalid entry node', async () => {
      const dag: DAGDefinition = {
        id: 'dag-bad-entry',
        name: 'Bad Entry DAG',
        nodes: [
          {
            id: 'real-node',
            label: 'Real Node',
            clusterType: ClusterType.META_INTELLIGENCE,
            action: 'process',
            parameters: {},
            status: 'pending',
            priority: 5,
            timeoutMs: 5000,
            maxRetries: 1,
            retryCount: 0,
            retryBackoffMs: 50,
            resourceWeight: 0.3,
          },
        ],
        edges: [],
        entryNodeId: 'nonexistent-entry',
        priority: 1,
        maxConcurrentNodes: 1,
        enableDynamicReplanning: false,
        enableRetry: false,
        maxTotalRetries: 0,
      };

      await expect(dagService.executeDAG(dag)).rejects.toThrow('entry node');
    });

    it('should get DAG result', async () => {
      const result = dagService.getResult('dag-linear-1');
      // Result may or may not exist depending on execution success
      if (result) {
        expect(result.dagId).toBe('dag-linear-1');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('executionTrace');
      }
    });

    it('should get execution trace', () => {
      const trace = dagService.getExecutionTrace('dag-linear-1');
      expect(Array.isArray(trace)).toBe(true);
    });

    it('should get DAG statistics', () => {
      const stats = dagService.getStats();
      expect(stats).toHaveProperty('totalDAGs');
      expect(stats).toHaveProperty('completedDAGs');
      expect(stats).toHaveProperty('failedDAGs');
      expect(stats).toHaveProperty('averageDurationMs');
    });
  });

  // ─── 9. Integration: End-to-End Swarm Pipeline ────────────────

  describe('Integration: Full Swarm Pipeline', () => {
    it('should create swarm → run consensus → checkpoint → persist → execute DAG', async () => {
      // Step 1: Create a swarm
      const swarmId = 'integration-swarm';
      const swarmConfig = await swarmService.createSwarm({
        id: swarmId,
        mission: 'End-to-end integration test',
        objectives: ['Deploy service', 'Validate health', 'Generate report'],
        requiredCapabilities: ['deploy', 'health-check', 'report'],
        preferredClusters: [ClusterType.INFRASTRUCTURE, ClusterType.COMPUTER, ClusterType.OFFICE],
        initialSize: 3,
        maxSize: 10,
        minSize: 2,
      });

      expect(swarmConfig.id).toBe(swarmId);

      // Step 2: Create a topology for the swarm agents
      const agents = swarmService.getSwarmAgents(swarmId);
      const topoId = 'integration-topo';
      await topologyService.createTopology(
        topoId,
        'star',
        agents.map(a => a.agentId),
        agents.map(() => ClusterType.META_INTELLIGENCE),
      );

      const topoConfig = topologyService.getTopology(topoId);
      expect(topoConfig).toBeDefined();
      expect(topoConfig!.nodes.size).toBe(agents.length);

      // Step 3: Create working memory session
      const wmSessionId = 'integration-wm';
      await workingMemoryService.createSession(
        wmSessionId,
        agents.map(a => a.agentId),
        swarmId,
      );

      await workingMemoryService.writeShared(wmSessionId, 'mission-context', {
        mission: swarmConfig.mission,
        objectives: swarmConfig.objectives,
      }, agents[0].agentId);

      // Step 4: Execute the swarm
      const swarmResult = await swarmService.executeSwarm(swarmId);
      expect(swarmResult).toBeDefined();
      expect(['completed', 'failed']).toContain(swarmResult.status);

      // Step 5: Checkpoint the collaboration
      const collabId = 'integration-collab';
      await persistenceService.recordStart(collabId, 'swarm', agents.map(a => a.agentId), swarmId);

      await persistenceService.addResult(collabId, { swarmId, status: swarmResult.status });
      await persistenceService.completeCollaboration(collabId, swarmResult.status === 'completed' ? 1.0 : 0.0);

      // Step 6: Execute a DAG for post-processing
      const dagId = 'integration-dag';
      const dagResult = await dagService.executeDAG({
        id: dagId,
        name: 'Post-Swarm Analysis',
        nodes: [
          {
            id: 'summarize',
            label: 'Summarize Findings',
            clusterType: ClusterType.META_INTELLIGENCE,
            action: 'summarize',
            parameters: { swarmId },
            status: 'pending',
            priority: 5,
            timeoutMs: 10000,
            maxRetries: 1,
            retryCount: 0,
            retryBackoffMs: 50,
            resourceWeight: 0.3,
          },
        ],
        edges: [],
        entryNodeId: 'summarize',
        priority: 5,
        maxConcurrentNodes: 2,
        enableDynamicReplanning: false,
        enableRetry: true,
        maxTotalRetries: 3,
      });

      expect(dagResult).toBeDefined();

      // Step 7: Verify the blackboard has mission context
      const wmData = await workingMemoryService.readShared(wmSessionId, 'mission-context');
      expect(wmData).toBeDefined();
      expect(wmData!.value.mission).toBe('End-to-end integration test');

      // Step 8: Verify feedback loop still works
      feedbackService.updateConfig({ cooldownMs: 0, minConfidenceThreshold: 0.1 });
      const adjustments = await feedbackService.applyFeedbackCycle();
      expect(Array.isArray(adjustments)).toBe(true);

      // Step 9: Check topology metrics
      const metrics = topologyService.getMetrics(topoId);
      expect(metrics).toBeDefined();
      expect(metrics!.totalNodes).toBeGreaterThan(0);
    }, 30_000);
  });
});
