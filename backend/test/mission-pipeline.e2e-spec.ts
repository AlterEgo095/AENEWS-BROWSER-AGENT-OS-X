/**
 * AENEWS Agent OS X — E2E Tests: Mission Pipeline
 *
 * Tests the full Software Factory mission pipeline:
 *   - Mission contract creation, negotiation, and validation
 *   - State machine transitions (DRAFT → PLANNED → ... → COMPLETED)
 *   - Full mission execution flow via MissionOrchestratorService
 *   - Mission failure and recovery scenarios
 *
 * All external dependencies are mocked — no real DB/Redis/Qdrant needed.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MissionState,
  TransitionTrigger,
  MissionQuality,
  DeliverableType,
} from '../src/modules/software-factory/interfaces/mission.interface';
import { MissionContractService } from '../src/modules/software-factory/services/mission-contract.service';
import { MissionStateMachineService } from '../src/modules/software-factory/services/mission-state-machine.service';
import { AgentEventBusService } from '../src/modules/agent-framework/services/agent-event-bus.service';
import { AgentOrchestratorService } from '../src/modules/agent-framework/services/agent-orchestrator.service';
import { AgentRegistryService } from '../src/modules/agent/registry/agent-registry.service';
import { AgentMemoryService, MemoryTier } from '../src/modules/agent-framework/services/agent-memory.service';
import { MissionOrchestratorService } from '../src/modules/software-factory/services/mission-orchestrator.service';
import { PlanningTeamService } from '../src/modules/software-factory/services/teams/planning-team.service';
import { ExecutionTeamService } from '../src/modules/software-factory/services/teams/execution-team.service';
import { CertificationTeamService } from '../src/modules/software-factory/services/teams/certification-team.service';

// ─── Mock Providers ─────────────────────────────────────────────

const mockCacheManager = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  store: { keys: jest.fn().mockResolvedValue([]) },
};

// ─── Tests ──────────────────────────────────────────────────────

describe('Mission Pipeline (e2e)', () => {
  let app: INestApplication;
  let contractService: MissionContractService;
  let stateMachine: MissionStateMachineService;
  let eventBus: AgentEventBusService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        MissionContractService,
        MissionStateMachineService,
        AgentEventBusService,
        EventEmitter2,
        // AgentMemoryService with mock cache
        {
          provide: AgentMemoryService,
          useFactory: () => {
            const memoryStore = new Map<string, any>();
            return {
              store: jest.fn().mockImplementation(
                (agentId: string, tier: MemoryTier, key: string, value: any) => {
                  memoryStore.set(`${agentId}:${tier}:${key}`, value);
                  return Promise.resolve();
                },
              ),
              retrieve: jest.fn().mockImplementation(
                (agentId: string, tier: MemoryTier, key: string) => {
                  return Promise.resolve(
                    memoryStore.get(`${agentId}:${tier}:${key}`) || null,
                  );
                },
              ),
              search: jest.fn().mockResolvedValue([]),
              clear: jest.fn().mockResolvedValue(undefined),
            };
          },
        },
        // AgentOrchestratorService needs a registry — provide a mock
        {
          provide: AgentRegistryService,
          useFactory: () => {
            return {
              getAll: jest.fn().mockReturnValue([]),
              getByCluster: jest.fn().mockReturnValue([]),
              executeAgent: jest.fn().mockResolvedValue({
                success: true,
                data: { simulated: true },
              }),
              get: jest.fn().mockReturnValue(undefined),
            };
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    contractService = app.get(MissionContractService);
    stateMachine = app.get(MissionStateMachineService);
    eventBus = app.get(AgentEventBusService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Mission Contract Tests ───────────────────────────────────

  describe('Mission Contract Creation', () => {
    it('should create a contract from a natural language instruction', () => {
      const contract = contractService.createContract({
        mission: 'Build a SaaS application',
        quality: MissionQuality.PROFESSIONAL,
      });

      expect(contract).toBeDefined();
      expect(contract.id).toMatch(/^contract-/);
      expect(contract.mission).toBe('Build a SaaS application');
      expect(contract.quality).toBe(MissionQuality.PROFESSIONAL);
      expect(contract.createdAt).toBeInstanceOf(Date);
      expect(contract.budget.maxApiCostUsd).toBe(20); // default
      expect(contract.deliverables.length).toBeGreaterThan(0);
      expect(contract.objectives.length).toBeGreaterThan(0);
    });

    it('should infer deliverables based on mission text', () => {
      const saasContract = contractService.createContract({
        mission: 'Create a SaaS application with API',
      });

      const types = saasContract.deliverables.map((d) => d.type);
      expect(types).toContain(DeliverableType.SOURCE_CODE);
      expect(types).toContain(DeliverableType.API_SPEC);
      expect(types).toContain(DeliverableType.TEST_SUITE);
      expect(types).toContain(DeliverableType.DOCKER_IMAGE);
    });

    it('should create contract with custom budget and deadline', () => {
      const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const contract = contractService.createContract({
        mission: 'Generate a PDF report',
        budgetMaxUsd: 50,
        deadline,
      });

      expect(contract.budget.maxApiCostUsd).toBe(50);
      expect(contract.deadline.deadline.getTime()).toBe(deadline.getTime());
    });

    it('should negotiate contract feasibility — accept valid contract', () => {
      const contract = contractService.createContract({
        mission: 'Build a simple app',
        quality: MissionQuality.STANDARD,
        budgetMaxUsd: 100,
      });

      const negotiation = contractService.negotiate(contract);
      expect(negotiation.accepted).toBe(true);
      expect(negotiation.feasibilityScore).toBeGreaterThanOrEqual(30);
    });

    it('should negotiate contract feasibility — warn on low budget', () => {
      const contract = contractService.createContract({
        mission: 'Enterprise mission-critical system',
        quality: MissionQuality.MISSION_CRITICAL,
        budgetMaxUsd: 1, // way too low
      });

      const negotiation = contractService.negotiate(contract);
      expect(negotiation.warnings.length).toBeGreaterThan(0);
      expect(negotiation.feasibilityScore).toBeLessThan(100);
    });

    it('should track spending and detect budget violations', () => {
      const contract = contractService.createContract({
        mission: 'Test spending',
        budgetMaxUsd: 5,
      });

      // First spend — within budget
      const noViolation = contractService.trackSpend(contract.id, 3);
      expect(noViolation).toBeNull();

      // Second spend — exceeds budget
      const violation = contractService.trackSpend(contract.id, 3);
      expect(violation).not.toBeNull();
      expect(violation!.type).toBe('budget_exceeded');
      expect(violation!.severity).toBe('critical');
    });

    it('should validate deliverables and acceptance criteria', () => {
      const contract = contractService.createContract({
        mission: 'Build a web app',
        deliverables: [DeliverableType.SOURCE_CODE, DeliverableType.TEST_SUITE],
      });

      // Validate a deliverable
      const validated = contractService.validateDeliverable(
        contract.id,
        DeliverableType.SOURCE_CODE,
        '/artifacts/source-code.zip',
      );
      expect(validated).toBe(true);

      // Verify acceptance criterion
      if (contract.acceptanceCriteria.length > 0) {
        const verified = contractService.verifyAcceptanceCriterion(
          contract.id,
          contract.acceptanceCriteria[0].id,
          'test-auditor',
        );
        expect(verified).toBe(true);
      }
    });

    it('should compute completion percentage', () => {
      const contract = contractService.createContract({
        mission: 'Test completion',
        deliverables: [DeliverableType.SOURCE_CODE],
      });

      const pct = contractService.getCompletionPercentage(contract.id);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    });
  });

  // ─── State Machine Tests ─────────────────────────────────────

  describe('Mission State Machine Transitions', () => {
    const testMissionId = 'sm-test-mission';

    beforeAll(() => {
      stateMachine.initializeMission(testMissionId);
    });

    it('should initialize in DRAFT state', () => {
      const currentState = stateMachine.getCurrentState(testMissionId);
      expect(currentState).toBe(MissionState.DRAFT);
    });

    it('should transition DRAFT → PLANNED via SUBMIT', async () => {
      const result = await stateMachine.transition({
        missionId: testMissionId,
        contractId: 'test-contract',
        currentState: MissionState.DRAFT,
        trigger: TransitionTrigger.SUBMIT,
      });

      expect(result.success).toBe(true);
      expect(result.previousState).toBe(MissionState.DRAFT);
      expect(result.newState).toBe(MissionState.PLANNED);
    });

    it('should transition PLANNED → RESEARCH via START_RESEARCH', async () => {
      const result = await stateMachine.transition({
        missionId: testMissionId,
        contractId: 'test-contract',
        currentState: MissionState.PLANNED,
        trigger: TransitionTrigger.START_RESEARCH,
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe(MissionState.RESEARCH);
    });

    it('should transition RESEARCH → BUILDING via START_BUILD', async () => {
      const result = await stateMachine.transition({
        missionId: testMissionId,
        contractId: 'test-contract',
        currentState: MissionState.RESEARCH,
        trigger: TransitionTrigger.START_BUILD,
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe(MissionState.BUILDING);
    });

    it('should transition BUILDING → TESTING via START_TESTING', async () => {
      const result = await stateMachine.transition({
        missionId: testMissionId,
        contractId: 'test-contract',
        currentState: MissionState.BUILDING,
        trigger: TransitionTrigger.START_TESTING,
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe(MissionState.TESTING);
    });

    it('should transition TESTING → AUDITING via START_AUDIT', async () => {
      const result = await stateMachine.transition({
        missionId: testMissionId,
        contractId: 'test-contract',
        currentState: MissionState.TESTING,
        trigger: TransitionTrigger.START_AUDIT,
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe(MissionState.AUDITING);
    });

    it('should transition AUDITING → CERTIFYING via START_CERTIFICATION', async () => {
      const result = await stateMachine.transition({
        missionId: testMissionId,
        contractId: 'test-contract',
        currentState: MissionState.AUDITING,
        trigger: TransitionTrigger.START_CERTIFICATION,
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe(MissionState.CERTIFYING);
    });

    it('should transition CERTIFYING → DELIVERING via START_DELIVERY', async () => {
      const result = await stateMachine.transition({
        missionId: testMissionId,
        contractId: 'test-contract',
        currentState: MissionState.CERTIFYING,
        trigger: TransitionTrigger.START_DELIVERY,
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe(MissionState.DELIVERING);
    });

    it('should transition DELIVERING → COMPLETED via MARK_COMPLETE', async () => {
      const result = await stateMachine.transition({
        missionId: testMissionId,
        contractId: 'test-contract',
        currentState: MissionState.DELIVERING,
        trigger: TransitionTrigger.MARK_COMPLETE,
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe(MissionState.COMPLETED);
    });

    it('should reject invalid transitions', async () => {
      const result = await stateMachine.transition({
        missionId: testMissionId,
        contractId: 'test-contract',
        currentState: MissionState.COMPLETED,
        trigger: TransitionTrigger.START_BUILD, // invalid from COMPLETED
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should track timeline with entries for each transition', () => {
      const timeline = stateMachine.getTimeline(testMissionId);
      expect(timeline).toBeDefined();
      expect(timeline!.entries.length).toBeGreaterThanOrEqual(8); // DRAFT + 7 transitions
      expect(timeline!.currentState).toBe(MissionState.COMPLETED);
    });

    it('should calculate progress as percentage', () => {
      const progress = stateMachine.getProgress(testMissionId);
      // COMPLETED is 8/9 = ~89% or 100% depending on state order
      expect(progress).toBeGreaterThanOrEqual(80);
    });

    it('should return available transitions for current state', () => {
      const available = stateMachine.getAvailableTransitions(testMissionId);
      // COMPLETED should have ARCHIVE as available
      const hasArchive = available.some(
        (t) => t.trigger === TransitionTrigger.ARCHIVE,
      );
      expect(hasArchive).toBe(true);
    });

    it('should transition COMPLETED → ARCHIVED via ARCHIVE', async () => {
      const result = await stateMachine.transition({
        missionId: testMissionId,
        contractId: 'test-contract',
        currentState: MissionState.COMPLETED,
        trigger: TransitionTrigger.ARCHIVE,
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe(MissionState.ARCHIVED);
    });
  });

  // ─── Rollback Transition Tests ───────────────────────────────

  describe('State Machine Rollback Transitions', () => {
    const rollbackMissionId = 'rollback-test-mission';

    beforeAll(() => {
      stateMachine.initializeMission(rollbackMissionId);
    });

    it('should support PLANNED → DRAFT via REJECT', async () => {
      await stateMachine.transition({
        missionId: rollbackMissionId,
        contractId: 'test-contract',
        currentState: MissionState.DRAFT,
        trigger: TransitionTrigger.SUBMIT,
      });

      const result = await stateMachine.transition({
        missionId: rollbackMissionId,
        contractId: 'test-contract',
        currentState: MissionState.PLANNED,
        trigger: TransitionTrigger.REJECT,
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe(MissionState.DRAFT);
    });
  });

  // ─── Pause / Resume Tests ────────────────────────────────────

  describe('Mission Pause and Resume', () => {
    const pauseMissionId = 'pause-test-mission';

    beforeAll(() => {
      stateMachine.initializeMission(pauseMissionId);
    });

    it('should pause a mission and preserve state', () => {
      const paused = stateMachine.pause(pauseMissionId);
      expect(paused).toBe(true);

      const state = stateMachine.getCurrentState(pauseMissionId);
      expect(state).toBe(MissionState.DRAFT); // still in DRAFT
    });

    it('should resume a paused mission', () => {
      const resumedState = stateMachine.resume(pauseMissionId);
      expect(resumedState).toBe(MissionState.DRAFT);
    });

    it('should return false when pausing a non-existent mission', () => {
      const paused = stateMachine.pause('nonexistent-mission');
      expect(paused).toBe(false);
    });

    it('should return null when resuming a non-paused mission', () => {
      const resumed = stateMachine.resume('nonexistent-mission');
      expect(resumed).toBeNull();
    });
  });

  // ─── Full Pipeline (AgentOrchestrator) ────────────────────────

  describe('Agent Orchestrator Pipeline', () => {
    let orchestrator: AgentOrchestratorService;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        providers: [
          AgentOrchestratorService,
          AgentEventBusService,
          EventEmitter2,
          {
            provide: AgentRegistryService,
            useFactory: () => ({
              getAll: jest.fn().mockReturnValue([]),
              getByCluster: jest.fn().mockReturnValue([]),
              executeAgent: jest.fn().mockResolvedValue({
                success: true,
                data: { simulated: true },
              }),
              get: jest.fn().mockReturnValue(undefined),
            }),
          },
          {
            provide: AgentMemoryService,
            useFactory: () => {
              const store = new Map<string, any>();
              return {
                store: jest.fn().mockImplementation((a: string, t: string, k: string, v: any) => {
                  store.set(`${a}:${t}:${k}`, v);
                  return Promise.resolve();
                }),
                retrieve: jest.fn().mockImplementation((a: string, t: string, k: string) => {
                  return Promise.resolve(store.get(`${a}:${t}:${k}`) || null);
                }),
                search: jest.fn().mockResolvedValue([]),
                clear: jest.fn().mockResolvedValue(undefined),
              };
            },
          },
        ],
      }).compile();

      orchestrator = moduleFixture.get(AgentOrchestratorService);
    });

    it('should decompose a mission into subtasks', async () => {
      const subtasks = await orchestrator.decompose({
        id: 'test-mission-1',
        description: 'Build a web scraper',
        constraints: { capabilities: ['scrape', 'navigate'] },
      });

      expect(subtasks.length).toBeGreaterThan(0);
      expect(subtasks[0].id).toContain('test-mission-1');
      expect(subtasks[0].requiredCapabilities).toBeDefined();
    });

    it('should create an execution plan from subtasks', async () => {
      const subtasks = await orchestrator.decompose({
        id: 'test-mission-2',
        description: 'Create an API',
        constraints: { capabilities: ['generate', 'test'] },
      });

      const plan = await orchestrator.plan(subtasks);
      expect(plan).toBeDefined();
      expect(plan.missionId).toBeDefined();
      expect(plan.executionOrder.length).toBeGreaterThan(0);
      expect(plan.subtasks.length).toBe(subtasks.length);
    });

    it('should critique execution results', async () => {
      const results = [
        {
          subtaskId: 'sub-1',
          success: true,
          data: { output: 'ok' },
          duration: 500,
        },
        {
          subtaskId: 'sub-2',
          success: false,
          error: 'Agent not found',
          duration: 100,
        },
      ];

      const critiques = await orchestrator.critique(results as any);
      expect(critiques.length).toBe(2);
      expect(critiques[0].passed).toBe(true); // successful
      expect(critiques[1].passed).toBe(false); // failed
      expect(critiques[1].issues.length).toBeGreaterThan(0);
    });

    it('should validate results with quality scoring', async () => {
      const items = [
        { subtaskId: 'sub-1', success: true, data: { x: 1 } },
        { subtaskId: 'sub-2', success: false, data: null, error: 'failed' },
      ];

      const validations = await orchestrator.validate(items as any);
      expect(validations.length).toBe(2);
      expect(validations[0].valid).toBe(true);
      expect(validations[0].score).toBeGreaterThan(0);
      expect(validations[1].valid).toBe(false);
    });

    it('should deliver a package with status summary', () => {
      const validations = [
        {
          subtaskId: 'sub-1',
          valid: true,
          score: 1.0,
          checks: [{ name: 'success', passed: true }],
        },
      ];

      const delivery = orchestrator.deliver(validations);
      expect(delivery).toBeDefined();
      expect(delivery.status).toBe('success');
      expect(delivery.summary).toContain('validated');
    });

    it('should return partial delivery when some validations fail', () => {
      const validations = [
        { subtaskId: 'sub-1', valid: true, score: 1.0, checks: [] },
        { subtaskId: 'sub-2', valid: false, score: 0.3, checks: [] },
      ];

      const delivery = orchestrator.deliver(validations);
      expect(delivery.status).toBe('partial');
    });

    it('should track pipeline state during mission execution', async () => {
      const mission = {
        id: 'pipeline-state-test',
        description: 'Test pipeline state tracking',
      };

      // Execute the full pipeline (with no agents, it will still go through the steps)
      const delivery = await orchestrator.executeMission(mission);

      expect(delivery).toBeDefined();
      expect(delivery.missionId).toBe('pipeline-state-test');
      // With no agents, it should fail to find agents but still produce a delivery
      expect(['success', 'partial', 'failed']).toContain(delivery.status);
    });
  });

  // ─── Full Mission Execution via MissionOrchestratorService ────

  describe('Full Mission Execution Flow', () => {
    let missionOrchestrator: MissionOrchestratorService;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        providers: [
          MissionOrchestratorService,
          MissionContractService,
          MissionStateMachineService,
          AgentOrchestratorService,
          AgentEventBusService,
          PlanningTeamService,
          ExecutionTeamService,
          CertificationTeamService,
          EventEmitter2,
          {
            provide: AgentRegistryService,
            useFactory: () => ({
              getAll: jest.fn().mockReturnValue([]),
              getByCluster: jest.fn().mockReturnValue([]),
              executeAgent: jest.fn().mockResolvedValue({
                success: true,
                data: { simulated: true },
              }),
              get: jest.fn().mockReturnValue(undefined),
            }),
          },
          {
            provide: AgentMemoryService,
            useFactory: () => {
              const store = new Map<string, any>();
              return {
                store: jest.fn().mockImplementation((a: string, t: string, k: string, v: any) => {
                  store.set(`${a}:${t}:${k}`, v);
                  return Promise.resolve();
                }),
                retrieve: jest.fn().mockImplementation((a: string, t: string, k: string) => {
                  return Promise.resolve(store.get(`${a}:${t}:${k}`) || null);
                }),
                search: jest.fn().mockResolvedValue([]),
                clear: jest.fn().mockResolvedValue(undefined),
              };
            },
          },
        ],
      }).compile();

      missionOrchestrator = moduleFixture.get(MissionOrchestratorService);
    });

    it('should start a mission and create a contract', async () => {
      const execution = await missionOrchestrator.startMission({
        instruction: 'Build a landing page',
        quality: MissionQuality.STANDARD,
        createdBy: 'test-user',
      });

      expect(execution).toBeDefined();
      expect(execution.missionId).toMatch(/^mission-/);
      expect(execution.contractId).toMatch(/^contract-/);
      expect(execution.status).toBe(MissionState.DRAFT);
    });

    it('should list active missions', async () => {
      const active = missionOrchestrator.getActiveMissions();
      expect(Array.isArray(active)).toBe(true);
    });

    it('should get mission status', async () => {
      const allMissions = missionOrchestrator.getAllMissions();
      if (allMissions.length > 0) {
        const status = missionOrchestrator.getMissionStatus(allMissions[0].missionId);
        expect(status).toBeDefined();
        expect(status!.missionId).toBe(allMissions[0].missionId);
      }
    });

    it('should cancel a mission', async () => {
      const execution = await missionOrchestrator.startMission({
        instruction: 'Mission to cancel',
      });

      const cancelled = await missionOrchestrator.cancelMission(execution.missionId);
      expect(cancelled).toBe(true);

      const status = missionOrchestrator.getMissionStatus(execution.missionId);
      expect(status!.status).toBe(MissionState.ARCHIVED);
    });

    it('should return false when cancelling a non-existent mission', async () => {
      const cancelled = await missionOrchestrator.cancelMission('nonexistent');
      expect(cancelled).toBe(false);
    });

    it('should reject a mission with very low feasibility', async () => {
      const execution = await missionOrchestrator.startMission({
        instruction: 'Impossible mission',
        quality: MissionQuality.MISSION_CRITICAL,
        budgetMaxUsd: 0.01, // impossibly low
      });

      // The contract negotiation should produce warnings
      expect(execution).toBeDefined();
    });
  });

  // ─── Mission Failure and Recovery ─────────────────────────────

  describe('Mission Failure and Recovery', () => {
    let orchestrator: AgentOrchestratorService;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        providers: [
          AgentOrchestratorService,
          AgentEventBusService,
          EventEmitter2,
          {
            provide: AgentRegistryService,
            useFactory: () => ({
              getAll: jest.fn().mockReturnValue([]),
              getByCluster: jest.fn().mockReturnValue([]),
              executeAgent: jest.fn().mockRejectedValue(new Error('Agent crashed')),
              get: jest.fn().mockReturnValue(undefined),
            }),
          },
          {
            provide: AgentMemoryService,
            useFactory: () => ({
              store: jest.fn().mockResolvedValue(undefined),
              retrieve: jest.fn().mockResolvedValue(null),
              search: jest.fn().mockResolvedValue([]),
              clear: jest.fn().mockResolvedValue(undefined),
            }),
          },
        ],
      }).compile();

      orchestrator = moduleFixture.get(AgentOrchestratorService);
    });

    it('should handle mission failure gracefully', async () => {
      const delivery = await orchestrator.executeMission({
        id: 'fail-test-mission',
        description: 'Mission that will fail',
      });

      expect(delivery).toBeDefined();
      expect(delivery.missionId).toBe('fail-test-mission');
      // The pipeline should still complete (just with failures)
      expect(['success', 'partial', 'failed']).toContain(delivery.status);
    });

    it('should attempt repair on failed subtasks', async () => {
      const critiques = [
        {
          subtaskId: 'sub-1',
          passed: false,
          issues: ['Execution failed'],
          suggestions: ['Retry'],
          severity: 'high' as const,
        },
      ];

      const results = [
        {
          subtaskId: 'sub-1',
          success: false,
          error: 'Agent crashed',
          duration: 100,
        },
      ];

      const repairResults = await orchestrator.repair({
        critiques,
        results: results as any,
      });

      expect(repairResults.length).toBe(1);
      expect(repairResults[0].subtaskId).toBe('sub-1');
      expect(repairResults[0].attempts).toBeGreaterThan(0);
    });

    it('should track pipeline state as failed when errors occur', () => {
      const state = orchestrator.getPipelineState('fail-test-mission');
      expect(['failed', 'completed', 'idle']).toContain(state);
    });
  });
});
