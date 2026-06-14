/**
 * AENEWS Agent OS X — E2E Tests: Agent Clusters & Registry
 *
 * Verifies that all 14 clusters are properly registered in the
 * AgentRegistryService and that agents can be discovered and executed.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AgentRegistryService } from '../src/modules/agent/registry/agent-registry.service';
import { AgentModule } from '../src/modules/agent/agent.module';
import { ClusterType } from '../src/modules/agent/entities/agent.entity';

describe('Agent Clusters (e2e)', () => {
  let app: INestApplication;
  let registry: AgentRegistryService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AgentModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    registry = app.get(AgentRegistryService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Cluster Registration Tests ─────────────────────────────────

  describe('Cluster Registration', () => {
    it('should have agents registered in all 9 original clusters', () => {
      const stats = registry.getClusterStats();

      const requiredClusters: ClusterType[] = [
        ClusterType.BROWSER,
        ClusterType.COMPUTER,
        ClusterType.CODING,
        ClusterType.OFFICE,
        ClusterType.MARKETING,
        ClusterType.BUSINESS,
        ClusterType.INFRASTRUCTURE,
        ClusterType.SECURITY,
        ClusterType.META_INTELLIGENCE,
      ];

      for (const cluster of requiredClusters) {
        expect(stats[cluster]).toBeDefined();
        expect(stats[cluster].total).toBeGreaterThan(0);
      }
    });

    it('should have agents registered in Phase 2 intelligence clusters', () => {
      const stats = registry.getClusterStats();

      const phase2Clusters: ClusterType[] = [
        ClusterType.LLM_INTELLIGENCE,
        ClusterType.INTELLIGENT_ORCHESTRATION,
        ClusterType.WATCHDOG,
        ClusterType.SELF_EVOLUTION,
        ClusterType.CERTIFICATION,
      ];

      for (const cluster of phase2Clusters) {
        expect(stats[cluster]).toBeDefined();
        expect(stats[cluster].total).toBeGreaterThan(0);
      }
    });

    it('should have correct agent counts per cluster', () => {
      const stats = registry.getClusterStats();

      expect(stats[ClusterType.BROWSER]?.total).toBe(17);
      expect(stats[ClusterType.COMPUTER]?.total).toBe(7);
      expect(stats[ClusterType.CODING]?.total).toBe(8);
      expect(stats[ClusterType.OFFICE]?.total).toBe(6);
      expect(stats[ClusterType.MARKETING]?.total).toBe(8);
      expect(stats[ClusterType.BUSINESS]?.total).toBe(8);
      expect(stats[ClusterType.INFRASTRUCTURE]?.total).toBe(8);
      expect(stats[ClusterType.SECURITY]?.total).toBe(6);
      expect(stats[ClusterType.META_INTELLIGENCE]?.total).toBe(13);
      expect(stats[ClusterType.LLM_INTELLIGENCE]?.total).toBe(6);
      expect(stats[ClusterType.INTELLIGENT_ORCHESTRATION]?.total).toBe(4);
      expect(stats[ClusterType.WATCHDOG]?.total).toBe(3);
      expect(stats[ClusterType.SELF_EVOLUTION]?.total).toBe(5);
      expect(stats[ClusterType.CERTIFICATION]?.total).toBe(13);
    });

    it('should have at least 90 total agents registered', () => {
      const size = registry.getRegistrySize();
      expect(size).toBeGreaterThanOrEqual(90);
    });
  });

  // ─── Agent Discovery Tests ──────────────────────────────────────

  describe('Agent Discovery', () => {
    it('should retrieve agents by cluster', () => {
      const browserAgents = registry.getByCluster(ClusterType.BROWSER);
      expect(browserAgents.length).toBe(17);

      const computerAgents = registry.getByCluster(ClusterType.COMPUTER);
      expect(computerAgents.length).toBe(7);
    });

    it('should retrieve individual agents by key', () => {
      const agent = registry.get('computer:TerminalAgent');
      expect(agent).toBeDefined();
      expect(agent?.name).toBe('TerminalAgent');
      expect(agent?.cluster).toBe(ClusterType.COMPUTER);
      expect(agent?.capabilities).toContain('execute');
    });

    it('should provide agent info with correct structure', () => {
      const agent = registry.get('browser:NavigationAgent');
      if (agent) {
        const info = agent.getInfo();
        expect(info).toHaveProperty('name');
        expect(info).toHaveProperty('cluster');
        expect(info).toHaveProperty('capabilities');
        expect(info).toHaveProperty('version');
        expect(info).toHaveProperty('description');
        expect(info).toHaveProperty('status');
      }
    });
  });

  // ─── Agent Execution Tests (Simulation) ─────────────────────────

  describe('Agent Execution (Simulation)', () => {
    it('should execute a computer agent successfully', async () => {
      const agent = registry.get('computer:TerminalAgent');
      if (!agent) return;

      const result = await agent.wrapExecution({
        agentId: 'test-agent',
        tenantId: 'test-tenant',
        config: { action: 'execute', command: 'echo hello' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should execute an LLM intelligence agent', async () => {
      const agent = registry.get('llm-intelligence:LLMPlannerAgent');
      if (!agent) return;

      const result = await agent.wrapExecution({
        agentId: 'test-agent',
        tenantId: 'test-tenant',
        config: {
          action: 'plan-mission',
          missionDescription: 'Build a simple web page',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should execute a watchdog agent', async () => {
      const agent = registry.get('watchdog:ErrorAnalyzerAgent');
      if (!agent) return;

      const result = await agent.wrapExecution({
        agentId: 'test-agent',
        tenantId: 'test-tenant',
        config: {
          action: 'analyze-error',
          errorMessage: 'Connection timeout',
          stackTrace: 'Error: Connection timeout\n    at NetworkClient.connect',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should execute a certification auditor agent', async () => {
      const agent = registry.get('certification:ArchitectureAuditorAgent');
      if (!agent) return;

      const result = await agent.wrapExecution({
        agentId: 'test-agent',
        tenantId: 'test-tenant',
        config: { action: 'audit-architecture' },
      });

      expect(result.success).toBe(true);
    });

    it('should execute a self-evolution agent', async () => {
      const agent = registry.get('self-evolution:MetricAnalyzerAgent');
      if (!agent) return;

      const result = await agent.wrapExecution({
        agentId: 'test-agent',
        tenantId: 'test-tenant',
        config: { action: 'analyze-metrics' },
      });

      expect(result.success).toBe(true);
    });

    it('should return error for unknown action', async () => {
      const agent = registry.get('computer:TerminalAgent');
      if (!agent) return;

      const result = await agent.wrapExecution({
        agentId: 'test-agent',
        tenantId: 'test-tenant',
        config: { action: 'nonexistent-action' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  // ─── Cluster Stats Tests ────────────────────────────────────────

  describe('Cluster Stats', () => {
    it('should return stats for all clusters', () => {
      const stats = registry.getClusterStats();

      const totalClusters = Object.keys(stats).length;
      expect(totalClusters).toBeGreaterThanOrEqual(14);
    });

    it('should have all agents in idle state initially', () => {
      const stats = registry.getClusterStats();

      for (const clusterStats of Object.values(stats)) {
        expect(clusterStats.idle).toBe(clusterStats.total);
        expect(clusterStats.running).toBe(0);
        expect(clusterStats.error).toBe(0);
      }
    });
  });
});
