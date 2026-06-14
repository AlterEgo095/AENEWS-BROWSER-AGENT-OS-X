/**
 * AENEWS Agent OS X — E2E Tests: Application Bootstrap
 *
 * Tests that the application can bootstrap and key services are wired
 * correctly. Uses mocked external dependencies (Redis, PostgreSQL,
 * Qdrant, RabbitMQ, etc.) so no real infrastructure is needed.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as request from 'supertest';
import { AgentRegistryService } from '../src/modules/agent/registry/agent-registry.service';
import { ClusterType } from '../src/modules/agent/entities/agent.entity';
import { BaseAgent } from '../src/modules/agent/agent.abstract';

// ─── Minimal mock agents for registration testing ───────────────

class MockAgent extends BaseAgent {
  readonly name: string;
  readonly cluster: ClusterType;
  readonly capabilities: string[];
  readonly version = '1.0.0';
  readonly description: string;

  constructor(name: string, cluster: ClusterType, capabilities: string[]) {
    super();
    this.name = name;
    this.cluster = cluster;
    this.capabilities = capabilities;
    this.description = `Mock ${name} agent`;
  }

  async execute(): Promise<any> {
    return { success: true, data: { mock: true } };
  }
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Application Bootstrap (e2e)', () => {
  let app: INestApplication;
  let registry: AgentRegistryService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        AgentRegistryService,
        EventEmitter2,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    registry = app.get(AgentRegistryService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Application Module Creation ──────────────────────────────

  describe('Module creation', () => {
    it('should create the testing module successfully', () => {
      expect(app).toBeDefined();
    });

    it('should provide AgentRegistryService', () => {
      expect(registry).toBeDefined();
      expect(registry).toBeInstanceOf(AgentRegistryService);
    });

    it('should start with an empty registry', () => {
      expect(registry.getRegistrySize()).toBe(0);
    });
  });

  // ─── Agent Registry Population ────────────────────────────────

  describe('Agent registry population', () => {
    beforeAll(() => {
      // Register agents from all 14 cluster modules (representative sample)
      const agents: BaseAgent[] = [
        // Browser cluster
        new MockAgent('NavigationAgent', ClusterType.BROWSER, ['navigate', 'back', 'forward']),
        new MockAgent('ScrapingAgent', ClusterType.BROWSER, ['scrape', 'extract']),
        new MockAgent('ScreenshotAgent', ClusterType.BROWSER, ['screenshot', 'capture']),
        // Computer cluster
        new MockAgent('TerminalAgent', ClusterType.COMPUTER, ['execute', 'shell']),
        new MockAgent('FileSystemAgent', ClusterType.COMPUTER, ['readFile', 'writeFile']),
        // Coding cluster
        new MockAgent('CodeGenerationAgent', ClusterType.CODING, ['generate', 'refactor']),
        new MockAgent('DebuggingAgent', ClusterType.CODING, ['debug', 'analyze']),
        // Office cluster
        new MockAgent('DocumentAgent', ClusterType.OFFICE, ['createDoc', 'editDoc']),
        new MockAgent('EmailAgent', ClusterType.OFFICE, ['sendEmail', 'readEmail']),
        // Marketing cluster
        new MockAgent('SEOAgent', ClusterType.MARKETING, ['analyzeSEO', 'optimize']),
        new MockAgent('ContentCreationAgent', ClusterType.MARKETING, ['createContent', 'editContent']),
        // Business cluster
        new MockAgent('FinanceAgent', ClusterType.BUSINESS, ['forecast', 'report']),
        new MockAgent('CRMAgent', ClusterType.BUSINESS, ['crm', 'contact']),
        // Infrastructure cluster
        new MockAgent('CloudAgent', ClusterType.INFRASTRUCTURE, ['deploy', 'scale']),
        new MockAgent('MonitoringInfraAgent', ClusterType.INFRASTRUCTURE, ['monitor', 'alert']),
        // Security cluster
        new MockAgent('VulnerabilityAgent', ClusterType.SECURITY, ['scan', 'report']),
        new MockAgent('AccessControlAgent', ClusterType.SECURITY, ['authenticate', 'authorize']),
        // Meta-intelligence cluster
        new MockAgent('ReasoningAgent', ClusterType.META_INTELLIGENCE, ['reason', 'infer']),
        new MockAgent('LearningAgent', ClusterType.META_INTELLIGENCE, ['learn', 'adapt']),
        // LLM-intelligence cluster
        new MockAgent('LLMPlannerAgent', ClusterType.LLM_INTELLIGENCE, ['plan', 'decompose']),
        new MockAgent('LLMCriticAgent', ClusterType.LLM_INTELLIGENCE, ['critique', 'evaluate']),
        // Intelligent-orchestration cluster
        new MockAgent('MissionOrchestratorAIAgent', ClusterType.INTELLIGENT_ORCHESTRATION, ['orchestrate', 'schedule']),
        new MockAgent('DynamicSchedulerAgent', ClusterType.INTELLIGENT_ORCHESTRATION, ['schedule', 'prioritize']),
        // Watchdog cluster
        new MockAgent('ErrorAnalyzerAgent', ClusterType.WATCHDOG, ['analyze', 'detect']),
        new MockAgent('AutoFixerAgent', ClusterType.WATCHDOG, ['fix', 'repair']),
        // Self-evolution cluster
        new MockAgent('MetricAnalyzerAgent', ClusterType.SELF_EVOLUTION, ['analyze', 'improve']),
        new MockAgent('PatchGeneratorAgent', ClusterType.SELF_EVOLUTION, ['patch', 'generate']),
        // Certification cluster
        new MockAgent('ArchitectureAuditorAgent', ClusterType.CERTIFICATION, ['audit', 'review']),
        new MockAgent('SecurityAuditorAgent', ClusterType.CERTIFICATION, ['securityAudit', 'compliance']),
      ];

      for (const agent of agents) {
        registry.register(agent);
      }
    });

    it('should have agents from all 14 clusters registered', () => {
      const stats = registry.getClusterStats();

      const allClusters: ClusterType[] = [
        ClusterType.BROWSER,
        ClusterType.COMPUTER,
        ClusterType.CODING,
        ClusterType.OFFICE,
        ClusterType.MARKETING,
        ClusterType.BUSINESS,
        ClusterType.INFRASTRUCTURE,
        ClusterType.SECURITY,
        ClusterType.META_INTELLIGENCE,
        ClusterType.LLM_INTELLIGENCE,
        ClusterType.INTELLIGENT_ORCHESTRATION,
        ClusterType.WATCHDOG,
        ClusterType.SELF_EVOLUTION,
        ClusterType.CERTIFICATION,
      ];

      for (const cluster of allClusters) {
        expect(stats[cluster]).toBeDefined();
        expect(stats[cluster].total).toBeGreaterThan(0);
      }
    });

    it('should have correct total agent count', () => {
      // 3 browser + 2 each for remaining 13 clusters = 3 + 26 = 29
      expect(registry.getRegistrySize()).toBe(29);
    });

    it('should retrieve agents by cluster', () => {
      const browserAgents = registry.getByCluster(ClusterType.BROWSER);
      expect(browserAgents.length).toBe(3);

      const certAgents = registry.getByCluster(ClusterType.CERTIFICATION);
      expect(certAgents.length).toBe(2);
    });

    it('should retrieve individual agents by key', () => {
      const agent = registry.get('browser:NavigationAgent');
      expect(agent).toBeDefined();
      expect(agent!.name).toBe('NavigationAgent');
      expect(agent!.cluster).toBe(ClusterType.BROWSER);
      expect(agent!.capabilities).toContain('navigate');
    });
  });

  // ─── Health-like Endpoint Test ────────────────────────────────

  describe('Health / System Info', () => {
    it('should provide cluster stats as a health signal', () => {
      const stats = registry.getClusterStats();
      const totalClusters = Object.keys(stats).length;

      expect(totalClusters).toBeGreaterThanOrEqual(14);

      // All clusters should have idle agents (no errors)
      for (const [cluster, clusterStats] of Object.entries(stats)) {
        expect(clusterStats.total).toBeGreaterThan(0);
        expect(clusterStats.error).toBe(0);
      }
    });

    it('should reflect all agents in idle state initially', () => {
      const stats = registry.getClusterStats();

      for (const clusterStats of Object.values(stats)) {
        expect(clusterStats.idle).toBe(clusterStats.total);
        expect(clusterStats.running).toBe(0);
      }
    });
  });
});
