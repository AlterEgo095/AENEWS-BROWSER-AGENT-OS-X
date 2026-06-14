/**
 * AENEWS Agent OS X — Phase 8 E2E Test Suite
 *
 * Tests the intelligent orchestration layer:
 *   - UnifiedConnectorRegistry: unified connector routing
 *   - AgentCollaborationService: multi-agent collaboration patterns
 *   - MissionDecompositionService: AI-powered mission decomposition
 *   - CrossClusterCoordinatorService: cross-cluster coordination
 *   - ConnectorAwareExecutionService: connector-first execution
 *   - OrchestrationController: REST API endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { AgentMemoryService } from '../../modules/agent-framework/services/agent-memory.service';
import { AgentHealthService } from '../../modules/agent-framework/services/agent-health.service';
import { AgentCommunicationService } from '../../modules/agent-framework/services/agent-communication.service';
import { CircuitBreakerService } from '../../modules/agent-framework/services/circuit-breaker.service';
import { UnifiedConnectorRegistryService } from '../../modules/agent-framework/services/unified-connector-registry.service';
import { AgentCollaborationService } from '../../modules/agent-framework/services/agent-collaboration.service';
import { MissionDecompositionService } from '../../modules/agent-framework/services/mission-decomposition.service';
import { CrossClusterCoordinatorService } from '../../modules/agent-framework/services/cross-cluster-coordinator.service';
import { ConnectorAwareExecutionService } from '../../modules/agent-framework/services/connector-aware-execution.service';
import { BaseAgent, AgentContext, AgentResult } from '../../modules/agent/agent.abstract';
import { ClusterType, AgentStatus } from '../../modules/agent/entities/agent.entity';

// ─── Test Agents ─────────────────────────────────────────────────

class TestBrowserAgent extends BaseAgent {
  readonly name = 'TestBrowserAgent';
  readonly cluster = ClusterType.BROWSER;
  readonly capabilities = ['navigation', 'scraping', 'screenshot'];
  readonly version = '1.0.0';
  readonly description = 'Test browser agent';

  async execute(context: AgentContext): Promise<AgentResult> {
    return {
      success: true,
      data: { action: context.config.action, agent: this.name },
      duration: 10,
    };
  }
}

class TestCodingAgent extends BaseAgent {
  readonly name = 'TestCodingAgent';
  readonly cluster = ClusterType.CODING;
  readonly capabilities = ['code-generation', 'testing', 'debugging'];
  readonly version = '1.0.0';
  readonly description = 'Test coding agent';

  async execute(context: AgentContext): Promise<AgentResult> {
    return {
      success: true,
      data: { action: context.config.action, agent: this.name },
      duration: 15,
    };
  }
}

class TestOfficeAgent extends BaseAgent {
  readonly name = 'TestOfficeAgent';
  readonly cluster = ClusterType.OFFICE;
  readonly capabilities = ['documents', 'spreadsheets', 'email'];
  readonly version = '1.0.0';
  readonly description = 'Test office agent';

  async execute(context: AgentContext): Promise<AgentResult> {
    return {
      success: true,
      data: { action: context.config.action, agent: this.name },
      duration: 12,
    };
  }
}

// ─── Mock Services ───────────────────────────────────────────────

const mockMemoryService = {
  store: jest.fn().mockResolvedValue(undefined),
  retrieve: jest.fn().mockResolvedValue(null),
  search: jest.fn().mockResolvedValue([]),
};

const mockQdrantService = {
  upsert: jest.fn().mockResolvedValue(undefined),
  search: jest.fn().mockResolvedValue([]),
};

// ─── Test Suite ──────────────────────────────────────────────────

describe('Phase 8 — Intelligent Orchestration', () => {
  let module: TestingModule;
  let registry: AgentRegistryService;
  let bridgeService: AgentBridgeService;
  let eventBus: AgentEventBusService;
  let unifiedRegistry: UnifiedConnectorRegistryService;
  let collaborationService: AgentCollaborationService;
  let decompositionService: MissionDecompositionService;
  let coordinatorService: CrossClusterCoordinatorService;
  let connectorExecution: ConnectorAwareExecutionService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [() => ({})] }),
        EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
      ],
      providers: [
        AgentRegistryService,
        AgentBridgeService,
        AgentEventBusService,
        AgentMemoryService,
        AgentHealthService,
        AgentCommunicationService,
        CircuitBreakerService,
        UnifiedConnectorRegistryService,
        AgentCollaborationService,
        MissionDecompositionService,
        CrossClusterCoordinatorService,
        ConnectorAwareExecutionService,
        { provide: 'QdrantService', useValue: mockQdrantService },
        { provide: 'LLMService', useValue: { isAnyAvailable: () => false, chatWithSystem: jest.fn() } },
      ],
    }).compile();

    registry = module.get<AgentRegistryService>(AgentRegistryService);
    bridgeService = module.get<AgentBridgeService>(AgentBridgeService);
    eventBus = module.get<AgentEventBusService>(AgentEventBusService);
    unifiedRegistry = module.get<UnifiedConnectorRegistryService>(UnifiedConnectorRegistryService);
    collaborationService = module.get<AgentCollaborationService>(AgentCollaborationService);
    decompositionService = module.get<MissionDecompositionService>(MissionDecompositionService);
    coordinatorService = module.get<CrossClusterCoordinatorService>(CrossClusterCoordinatorService);
    connectorExecution = module.get<ConnectorAwareExecutionService>(ConnectorAwareExecutionService);
  });

  afterAll(async () => {
    await module.close();
  });

  // ─── Unified Connector Registry Tests ─────────────────────────

  describe('UnifiedConnectorRegistryService', () => {
    it('should be defined', () => {
      expect(unifiedRegistry).toBeDefined();
    });

    it('should list all connectors', () => {
      const connectors = unifiedRegistry.listAllConnectors();
      expect(connectors.length).toBeGreaterThan(0);
    });

    it('should have bridge connectors from AgentBridgeService', () => {
      const stats = unifiedRegistry.getStatistics();
      expect(stats.bridgeConnectors).toBeGreaterThan(0);
    });

    it('should execute an action via bridge', async () => {
      const result = await unifiedRegistry.executeAction('browser', 'navigate', {
        url: 'https://example.com',
      });

      expect(result).toBeDefined();
      expect(result.source).toBe('bridge');
      expect(result).toHaveProperty('success');
    });

    it('should track connector health', async () => {
      const health = await unifiedRegistry.checkAllHealth();
      expect(health).toBeDefined();
      expect(Object.keys(health).length).toBeGreaterThan(0);
    });

    it('should return statistics', () => {
      const stats = unifiedRegistry.getStatistics();
      expect(stats).toHaveProperty('totalConnectors');
      expect(stats).toHaveProperty('bridgeConnectors');
      expect(stats).toHaveProperty('capabilityConnectors');
      expect(stats).toHaveProperty('adapters');
      expect(stats).toHaveProperty('packs');
    });
  });

  // ─── Mission Decomposition Tests ──────────────────────────────

  describe('MissionDecompositionService', () => {
    it('should be defined', () => {
      expect(decompositionService).toBeDefined();
    });

    it('should decompose a mission with heuristics', async () => {
      const result = await decompositionService.decompose({
        missionId: 'test-mission-1',
        description: 'Build a web application with frontend and backend',
        objectives: ['Design frontend', 'Build backend API', 'Write tests'],
      });

      expect(result).toBeDefined();
      expect(result.missionId).toBe('test-mission-1');
      expect(result.subtasks.length).toBeGreaterThan(0);
      expect(result.executionOrder.length).toBeGreaterThan(0);
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(1);
    });

    it('should match templates for known patterns', () => {
      const template = decompositionService.findMatchingTemplate(
        'Build a web application',
      );
      expect(template).toBeDefined();
      expect(template?.name).toBe('web_application');
    });

    it('should find security audit template', () => {
      const template = decompositionService.findMatchingTemplate(
        'Perform a security audit on the codebase',
      );
      expect(template).toBeDefined();
      expect(template?.name).toBe('security_audit');
    });

    it('should compute execution order with dependencies', async () => {
      const result = await decompositionService.decompose({
        missionId: 'test-mission-2',
        description: 'Analyze data and create a report',
        objectives: ['Collect data', 'Analyze data', 'Generate report'],
      });

      // Execution order should have at least one wave
      expect(result.executionOrder.length).toBeGreaterThan(0);

      // First wave should contain tasks with no dependencies
      const firstWave = result.executionOrder[0];
      expect(firstWave.length).toBeGreaterThan(0);
    });

    it('should build a dependency graph', async () => {
      const result = await decompositionService.decompose({
        missionId: 'test-mission-3',
        description: 'Create a marketing campaign',
        objectives: ['Research audience', 'Create content', 'Distribute'],
      });

      expect(Object.keys(result.dependencyGraph).length).toBeGreaterThan(0);
    });

    it('should support custom templates', () => {
      decompositionService.registerTemplate({
        name: 'custom_test',
        description: 'Custom test template',
        pattern: 'test',
        subtaskTemplates: [
          { description: 'Step 1', requiredCapabilities: ['test'], priority: 1 },
          { description: 'Step 2', requiredCapabilities: ['test'], priority: 2 },
        ],
      });

      const template = decompositionService.findMatchingTemplate('custom test workflow');
      expect(template).toBeDefined();
      expect(template?.name).toBe('custom_test');
    });
  });

  // ─── Cross-Cluster Coordinator Tests ──────────────────────────

  describe('CrossClusterCoordinatorService', () => {
    let testAgents: BaseAgent[];

    beforeAll(() => {
      testAgents = [
        new TestBrowserAgent(),
        new TestCodingAgent(),
        new TestOfficeAgent(),
      ];

      for (const agent of testAgents) {
        registry.register(agent);
      }
    });

    it('should be defined', () => {
      expect(coordinatorService).toBeDefined();
    });

    it('should get cluster health', () => {
      const health = coordinatorService.getClusterHealth();
      expect(health.length).toBeGreaterThan(0);

      const browserCluster = health.find((h) => h.cluster === ClusterType.BROWSER);
      expect(browserCluster).toBeDefined();
      expect(browserCluster!.agentCount).toBeGreaterThan(0);
    });

    it('should find best cluster for capabilities', () => {
      const cluster = coordinatorService.findBestCluster(['navigation', 'scraping']);
      expect(cluster).toBe(ClusterType.BROWSER);
    });

    it('should create a coordination plan', () => {
      const plan = coordinatorService.createCoordinationPlan([
        {
          id: 'task_1',
          cluster: ClusterType.BROWSER,
          description: 'Navigate to website',
          requiredCapabilities: ['navigation'],
          priority: 1,
          timeoutMs: 30_000,
        },
        {
          id: 'task_2',
          cluster: ClusterType.CODING,
          description: 'Generate code',
          requiredCapabilities: ['code-generation'],
          priority: 2,
          timeoutMs: 45_000,
        },
      ]);

      expect(plan).toBeDefined();
      expect(plan.tasks.length).toBe(2);
      expect(plan.executionWaves.length).toBeGreaterThan(0);
    });

    it('should execute a coordination plan', async () => {
      const result = await coordinatorService.coordinate([
        {
          id: 'task_1',
          cluster: ClusterType.BROWSER,
          description: 'Navigate to website',
          requiredCapabilities: ['navigation'],
          priority: 1,
          timeoutMs: 10_000,
        },
      ]);

      expect(result).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.totalDurationMs).toBeGreaterThan(0);
    }, 15_000);
  });

  // ─── Connector-Aware Execution Tests ──────────────────────────

  describe('ConnectorAwareExecutionService', () => {
    it('should be defined', () => {
      expect(connectorExecution).toBeDefined();
    });

    it('should execute with connector fallback', async () => {
      const result = await connectorExecution.execute({
        connectorName: 'browser',
        connectorAction: 'navigate',
        connectorParams: { url: 'https://example.com' },
        tryLLMOnConnectorFailure: false,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('source');
      expect(['connector', 'llm', 'fallback']).toContain(result.source);
    });

    it('should check connector availability', () => {
      const available = connectorExecution.isConnectorAvailable('browser');
      expect(typeof available).toBe('boolean');
    });

    it('should track execution statistics', async () => {
      await connectorExecution.execute({
        connectorName: 'coding',
        connectorAction: 'generate',
        connectorParams: { language: 'typescript' },
        tryLLMOnConnectorFailure: false,
      });

      const stats = connectorExecution.getStatistics();
      expect(stats.totalExecutions).toBeGreaterThan(0);
    });
  });

  // ─── Integration Tests ────────────────────────────────────────

  describe('Integration: Full Orchestration Pipeline', () => {
    it('should decompose and coordinate a multi-cluster mission', async () => {
      // Step 1: Decompose
      const decomposition = await decompositionService.decompose({
        missionId: 'integration-test-1',
        description: 'Build a web application and run security audit',
        objectives: [
          'Design and build frontend',
          'Build backend API',
          'Run security scan',
          'Generate report',
        ],
      });

      expect(decomposition.subtasks.length).toBeGreaterThan(0);

      // Step 2: Create coordination plan from decomposition
      const clusterTasks = decomposition.subtasks
        .filter((s) => s.preferredCluster)
        .slice(0, 4)
        .map((s, i) => ({
          id: s.id,
          cluster: s.preferredCluster!,
          description: s.description,
          requiredCapabilities: s.requiredCapabilities,
          priority: s.priority,
          timeoutMs: 10_000,
        }));

      if (clusterTasks.length > 0) {
        const plan = coordinatorService.createCoordinationPlan(clusterTasks);
        expect(plan.tasks.length).toBeGreaterThan(0);
        expect(plan.executionWaves.length).toBeGreaterThan(0);
      }
    }, 15_000);
  });
});
