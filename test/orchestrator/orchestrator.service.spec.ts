/**
 * AENEWS Agent OS X - Orchestrator Service Unit Tests
 * Tests the full orchestration pipeline with mocked dependencies.
 * Covers: instantiation, orchestrate, cancel, stats, active orchestrations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AgentCluster,
  TaskPriority,
  AgentOutput,
  OrchestrationPlan,
  OrchestrationStep,
  TaskStatus,
} from '../../src/agents/interfaces/agent.interface';
import { AgentEventType } from '../../src/agents/interfaces/agent-event.interface';
import { OrchestratorService, OrchestrationRequest, OrchestrationPhase } from '../../src/agents/orchestrator/orchestrator.service';
import { TaskDecomposerService } from '../../src/agents/orchestrator/task-decomposer.service';
import { TaskPlannerService } from '../../src/agents/orchestrator/task-planner.service';
import { TaskExecutorService } from '../../src/agents/orchestrator/task-executor.service';
import { TaskCriticService } from '../../src/agents/orchestrator/task-critic.service';
import { TaskRepairService } from '../../src/agents/orchestrator/task-repair.service';
import { TaskValidatorService } from '../../src/agents/orchestrator/task-validator.service';
import { TaskDeliveryService } from '../../src/agents/orchestrator/task-delivery.service';
import { EventBusService } from '../../src/agents/events/event-bus.service';
import { AgentRegistryService } from '../../src/agents/registry/agent-registry.service';
import { MemoryService } from '../../src/agents/memory/memory.service';

// ─── Mock Factories ─────────────────────────────────────────────────

const createMockDecomposer = () => ({
  decompose: jest.fn().mockResolvedValue([
    { id: 'sub-1', payload: { step: 1 }, agentId: 'test-agent', status: TaskStatus.PENDING, priority: TaskPriority.NORMAL, input: { taskId: 'sub-1', payload: { step: 1 } }, subtasks: [], retryCount: 0, maxRetries: 3, createdAt: new Date(), updatedAt: new Date(), correlationId: 'corr-1', metadata: {} },
  ]),
});

const createMockPlan = (): OrchestrationPlan => ({
  id: 'plan-1',
  taskId: 'task-1',
  steps: [
    {
      id: 'step-1',
      order: 1,
      agentId: 'test-agent',
      cluster: AgentCluster.BROWSER,
      capability: 'execute',
      input: { taskId: 'sub-1', payload: { step: 1 } },
      status: TaskStatus.PENDING,
      retryCount: 0,
    },
  ],
  dependencies: [{ stepId: 'step-1', dependsOnStepIds: [] }],
  createdAt: new Date(),
  estimatedDurationMs: 5000,
});

const createMockPlanner = () => ({
  createPlan: jest.fn().mockResolvedValue(createMockPlan()),
});

const createMockExecutor = () => ({
  executePlan: jest.fn().mockResolvedValue([
    {
      taskId: 'sub-1',
      success: true,
      result: { data: 'executed' },
      metrics: { executionTimeMs: 100, memoryUsedMb: 1, cpuUsagePercent: 5 },
      timestamp: new Date(),
    } as AgentOutput,
  ]),
});

const createMockCritic = () => ({
  critique: jest.fn().mockResolvedValue({
    passed: true,
    score: 95,
    issues: [],
    summary: 'All good',
    recommendations: [],
  }),
});

const createMockRepairService = () => ({
  repair: jest.fn().mockResolvedValue({
    repairedPlan: null,
    error: 'No repair needed',
  }),
});

const createMockValidator = () => ({
  validate: jest.fn().mockResolvedValue({
    isValid: true,
    score: 98,
    errors: [],
    warnings: [],
    details: {
      totalSteps: 1,
      successfulSteps: 1,
      failedSteps: 0,
      completenessScore: 100,
      qualityScore: 100,
      performanceScore: 100,
      complianceScore: 100,
      integrityScore: 100,
      schemaValidationScore: 100,
    },
  }),
});

const createMockDeliveryService = () => ({
  deliver: jest.fn().mockResolvedValue({
    deliveredOutput: { final: 'result' },
    deliveryFormat: 'json',
    deliveryTimestamp: new Date(),
  }),
});

const createMockEventBus = () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockResolvedValue('sub-id'),
  unsubscribe: jest.fn().mockResolvedValue(true),
  getSubscriptions: jest.fn().mockResolvedValue([]),
  publishEvent: jest.fn().mockResolvedValue(undefined),
  subscribeTo: jest.fn().mockReturnValue('sub-id'),
  unsubscribeFrom: jest.fn(),
  getEventHistory: jest.fn().mockResolvedValue([]),
});

const createMockRegistry = () => ({
  register: jest.fn(),
  unregister: jest.fn(),
  get: jest.fn().mockReturnValue(null),
  getAll: jest.fn().mockReturnValue([]),
  getByCluster: jest.fn().mockReturnValue([]),
});

const createMockMemory = () => ({
  store: jest.fn().mockResolvedValue({ id: 'mem-1' }),
  retrieve: jest.fn().mockResolvedValue(null),
  query: jest.fn().mockResolvedValue({ entries: [], total: 0, hasMore: false }),
  delete: jest.fn().mockResolvedValue(true),
  clear: jest.fn().mockResolvedValue(0),
  getStats: jest.fn().mockResolvedValue({}),
});

// ─── Test Suite ─────────────────────────────────────────────────────

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let decomposer: ReturnType<typeof createMockDecomposer>;
  let planner: ReturnType<typeof createMockPlanner>;
  let executor: ReturnType<typeof createMockExecutor>;
  let critic: ReturnType<typeof createMockCritic>;
  let repairService: ReturnType<typeof createMockRepairService>;
  let validator: ReturnType<typeof createMockValidator>;
  let deliveryService: ReturnType<typeof createMockDeliveryService>;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let registry: ReturnType<typeof createMockRegistry>;
  let memory: ReturnType<typeof createMockMemory>;

  beforeEach(async () => {
    decomposer = createMockDecomposer();
    planner = createMockPlanner();
    executor = createMockExecutor();
    critic = createMockCritic();
    repairService = createMockRepairService();
    validator = createMockValidator();
    deliveryService = createMockDeliveryService();
    eventBus = createMockEventBus();
    registry = createMockRegistry();
    memory = createMockMemory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        { provide: TaskDecomposerService, useValue: decomposer },
        { provide: TaskPlannerService, useValue: planner },
        { provide: TaskExecutorService, useValue: executor },
        { provide: TaskCriticService, useValue: critic },
        { provide: TaskRepairService, useValue: repairService },
        { provide: TaskValidatorService, useValue: validator },
        { provide: TaskDeliveryService, useValue: deliveryService },
        { provide: EventBusService, useValue: eventBus },
        { provide: AgentRegistryService, useValue: registry },
        { provide: MemoryService, useValue: memory },
        { provide: EventEmitter2, useValue: new EventEmitter2() },
      ],
    }).compile();

    service = module.get<OrchestratorService>(OrchestratorService);
  });

  // ─── Instantiation ────────────────────────────────────────────────

  describe('instantiation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have orchestrate method', () => {
      expect(typeof service.orchestrate).toBe('function');
    });

    it('should have getOrchestrationStatus method', () => {
      expect(typeof service.getOrchestrationStatus).toBe('function');
    });

    it('should have cancelOrchestration method', () => {
      expect(typeof service.cancelOrchestration).toBe('function');
    });

    it('should have getActiveOrchestrations method', () => {
      expect(typeof service.getActiveOrchestrations).toBe('function');
    });

    it('should have getStats method', () => {
      expect(typeof service.getStats).toBe('function');
    });
  });

  // ─── orchestrate ──────────────────────────────────────────────────

  describe('orchestrate', () => {
    it('should complete the full pipeline successfully', async () => {
      const request: OrchestrationRequest = {
        payload: { action: 'test' },
        cluster: AgentCluster.BROWSER,
      };

      const result = await service.orchestrate(request);

      expect(result.success).toBe(true);
      expect(result.taskId).toBeDefined();
      expect(result.result).toEqual({ final: 'result' });
      expect(result.totalSteps).toBeGreaterThan(0);
    });

    it('should call decomposer, planner, executor, critic, validator, delivery', async () => {
      const request: OrchestrationRequest = {
        payload: { action: 'test' },
      };

      await service.orchestrate(request);

      expect(decomposer.decompose).toHaveBeenCalled();
      expect(planner.createPlan).toHaveBeenCalled();
      expect(executor.executePlan).toHaveBeenCalled();
      expect(critic.critique).toHaveBeenCalled();
      expect(validator.validate).toHaveBeenCalled();
      expect(deliveryService.deliver).toHaveBeenCalled();
    });

    it('should record phase timings', async () => {
      const request: OrchestrationRequest = {
        payload: { action: 'test' },
      };

      const result = await service.orchestrate(request);

      expect(result.phaseTimings.length).toBeGreaterThan(0);
      const phases = result.phaseTimings.map((pt) => pt.phase);
      expect(phases).toContain(OrchestrationPhase.DECOMPOSE);
      expect(phases).toContain(OrchestrationPhase.PLAN);
      expect(phases).toContain(OrchestrationPhase.EXECUTE);
      expect(phases).toContain(OrchestrationPhase.CRITIQUE);
      expect(phases).toContain(OrchestrationPhase.VALIDATE);
      expect(phases).toContain(OrchestrationPhase.DELIVER);
    });

    it('should emit orchestration events', async () => {
      const request: OrchestrationRequest = {
        payload: { action: 'test' },
        cluster: AgentCluster.BROWSER,
      };

      await service.orchestrate(request);

      const publishedTypes = eventBus.publish.mock.calls.map(
        (call: any[]) => call[0]?.type,
      );
      expect(publishedTypes).toContain(AgentEventType.ORCHESTRATION_STARTED);
      expect(publishedTypes).toContain(AgentEventType.ORCHESTRATION_COMPLETED);
    });

    it('should handle orchestration failure gracefully', async () => {
      decomposer.decompose.mockRejectedValueOnce(new Error('Decomposition error'));

      const request: OrchestrationRequest = {
        payload: { action: 'fail' },
      };

      const result = await service.orchestrate(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Decomposition error');
    });

    it('should skip critique when skipCritique is true', async () => {
      const request: OrchestrationRequest = {
        payload: { action: 'test' },
        skipCritique: true,
      };

      const result = await service.orchestrate(request);

      expect(critic.critique).not.toHaveBeenCalled();
      expect(result.critiqueScore).toBe(100);
    });

    it('should skip validation when skipValidation is true', async () => {
      const request: OrchestrationRequest = {
        payload: { action: 'test' },
        skipValidation: true,
      };

      const result = await service.orchestrate(request);

      expect(validator.validate).not.toHaveBeenCalled();
      expect(result.validationScore).toBe(100);
    });

    it('should use provided taskId', async () => {
      const request: OrchestrationRequest = {
        taskId: 'custom-task-id',
        payload: { action: 'test' },
      };

      const result = await service.orchestrate(request);

      expect(result.taskId).toBe('custom-task-id');
    });
  });

  // ─── cancelOrchestration ──────────────────────────────────────────

  describe('cancelOrchestration', () => {
    it('should return false for non-existent orchestration', async () => {
      const result = await service.cancelOrchestration('non-existent');
      expect(result).toBe(false);
    });
  });

  // ─── getStats ─────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return stats object', () => {
      const stats = service.getStats();
      expect(stats).toHaveProperty('activeOrchestrations');
      expect(stats).toHaveProperty('cancelledTasks');
      expect(typeof stats.activeOrchestrations).toBe('number');
      expect(typeof stats.cancelledTasks).toBe('number');
    });

    it('should show zero active orchestrations initially', () => {
      const stats = service.getStats();
      expect(stats.activeOrchestrations).toBe(0);
    });
  });

  // ─── getActiveOrchestrations ──────────────────────────────────────

  describe('getActiveOrchestrations', () => {
    it('should return empty array initially', () => {
      const active = service.getActiveOrchestrations();
      expect(active).toEqual([]);
    });
  });

  // ─── validation failure ──────────────────────────────────────────

  describe('validation failure', () => {
    it('should fail orchestration when validation fails', async () => {
      validator.validate.mockResolvedValueOnce({
        isValid: false,
        score: 40,
        errors: ['Missing required output', 'Schema mismatch'],
        warnings: [],
      });

      const request: OrchestrationRequest = {
        payload: { action: 'test' },
      };

      const result = await service.orchestrate(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });
});
