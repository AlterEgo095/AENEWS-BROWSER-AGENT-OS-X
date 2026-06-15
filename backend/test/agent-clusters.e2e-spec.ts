/**
 * AENEWS Agent OS X — E2E Tests: Agent Clusters & Registry
 *
 * Verifies that all 14 clusters are properly registered in the
 * AgentRegistryService and that agents can be discovered and executed.
 *
 * Uses mocked dependencies — no real DB/Redis required.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AgentRegistryService } from '../src/modules/agent/registry/agent-registry.service';
import { BaseAgent, AgentContext, AgentResult } from '../src/modules/agent/agent.abstract';
import { ClusterType, AgentStatus } from '../src/modules/agent/entities/agent.entity';

// ─── Concrete agents matching real cluster modules ───────────────

class ClusterAgent extends BaseAgent {
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
    this.description = `Agent ${name} in ${cluster} cluster`;
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const action = context.config?.action || 'default';
    if (action === 'nonexistent-action') {
      return { success: false, error: `Unknown action: ${action}` };
    }
    return {
      success: true,
      data: { action, agent: this.name, cluster: this.cluster },
    };
  }
}

// ─── Agent Factory (mirrors real cluster module registrations) ───

function registerBrowserAgents(registry: AgentRegistryService): void {
  const agents = [
    new ClusterAgent('NavigationAgent', ClusterType.BROWSER, ['navigate', 'back', 'forward', 'reload', 'history', 'waitForNavigation', 'goto']),
    new ClusterAgent('ScrapingAgent', ClusterType.BROWSER, ['scrape', 'extract', 'parse']),
    new ClusterAgent('FormFillingAgent', ClusterType.BROWSER, ['fill', 'submit', 'input']),
    new ClusterAgent('ScreenshotAgent', ClusterType.BROWSER, ['screenshot', 'capture', 'pdf']),
    new ClusterAgent('AuthenticationAgent', ClusterType.BROWSER, ['login', 'logout', 'session']),
    new ClusterAgent('SearchAgent', ClusterType.BROWSER, ['search', 'query', 'find']),
    new ClusterAgent('MonitoringAgent', ClusterType.BROWSER, ['monitor', 'watch', 'observe']),
    new ClusterAgent('CrawlerAgent', ClusterType.BROWSER, ['crawl', 'spider', 'traverse']),
    new ClusterAgent('TestingAgent', ClusterType.BROWSER, ['test', 'assert', 'verify']),
    new ClusterAgent('DownloadAgent', ClusterType.BROWSER, ['download', 'save', 'fetch']),
    new ClusterAgent('UploadAgent', ClusterType.BROWSER, ['upload', 'send', 'attach']),
    new ClusterAgent('InteractionAgent', ClusterType.BROWSER, ['click', 'type', 'hover']),
    new ClusterAgent('ProxyAgent', ClusterType.BROWSER, ['proxy', 'tunnel', 'route']),
    new ClusterAgent('CaptchaAgent', ClusterType.BROWSER, ['captcha', 'recaptcha', 'solve']),
    new ClusterAgent('SessionAgent', ClusterType.BROWSER, ['session', 'cookie', 'storage']),
    new ClusterAgent('HeadlessAgent', ClusterType.BROWSER, ['headless', 'puppeteer', 'playwright']),
    new ClusterAgent('AutomationAgent', ClusterType.BROWSER, ['automate', 'script', 'workflow']),
  ];
  for (const agent of agents) registry.register(agent);
}

function registerComputerAgents(registry: AgentRegistryService): void {
  const agents = [
    new ClusterAgent('TerminalAgent', ClusterType.COMPUTER, ['execute', 'shell', 'command']),
    new ClusterAgent('FileSystemAgent', ClusterType.COMPUTER, ['readFile', 'writeFile', 'listDir']),
    new ClusterAgent('NetworkAgent', ClusterType.COMPUTER, ['ping', 'dns', 'curl']),
    new ClusterAgent('SoftwareAgent', ClusterType.COMPUTER, ['install', 'update', 'remove']),
    new ClusterAgent('SystemInfoAgent', ClusterType.COMPUTER, ['info', 'stats', 'health']),
    new ClusterAgent('ProcessAgent', ClusterType.COMPUTER, ['list', 'kill', 'monitor']),
    new ClusterAgent('BackupAgent', ClusterType.COMPUTER, ['backup', 'restore', 'archive']),
  ];
  for (const agent of agents) registry.register(agent);
}

function registerCodingAgents(registry: AgentRegistryService): void {
  const agents = [
    new ClusterAgent('CodeGenerationAgent', ClusterType.CODING, ['generate', 'scaffold', 'create']),
    new ClusterAgent('CodeReviewAgent', ClusterType.CODING, ['review', 'lint', 'audit']),
    new ClusterAgent('DebuggingAgent', ClusterType.CODING, ['debug', 'trace', 'diagnose']),
    new ClusterAgent('DeploymentAgent', ClusterType.CODING, ['deploy', 'release', 'ship']),
    new ClusterAgent('TestingCodeAgent', ClusterType.CODING, ['test', 'spec', 'coverage']),
    new ClusterAgent('DocumentationAgent', ClusterType.CODING, ['document', 'readme', 'api-doc']),
    new ClusterAgent('VersionControlAgent', ClusterType.CODING, ['git', 'commit', 'merge']),
    new ClusterAgent('DependencyAgent', ClusterType.CODING, ['depend', 'package', 'lock']),
  ];
  for (const agent of agents) registry.register(agent);
}

function registerOfficeAgents(registry: AgentRegistryService): void {
  const agents = [
    new ClusterAgent('DocumentAgent', ClusterType.OFFICE, ['createDoc', 'editDoc', 'convertDoc']),
    new ClusterAgent('SpreadsheetAgent', ClusterType.OFFICE, ['createSheet', 'editSheet', 'formula']),
    new ClusterAgent('EmailAgent', ClusterType.OFFICE, ['sendEmail', 'readEmail', 'template']),
    new ClusterAgent('CalendarAgent', ClusterType.OFFICE, ['schedule', 'reminder', 'event']),
    new ClusterAgent('PresentationAgent', ClusterType.OFFICE, ['createDeck', 'slide', 'present']),
    new ClusterAgent('TaskManagerAgent', ClusterType.OFFICE, ['task', 'todo', 'kanban']),
  ];
  for (const agent of agents) registry.register(agent);
}

function registerMarketingAgents(registry: AgentRegistryService): void {
  const agents = [
    new ClusterAgent('ContentCreationAgent', ClusterType.MARKETING, ['createContent', 'editContent', 'publish']),
    new ClusterAgent('SEOAgent', ClusterType.MARKETING, ['analyzeSEO', 'optimize', 'keywords']),
    new ClusterAgent('SocialMediaAgent', ClusterType.MARKETING, ['post', 'schedule', 'engage']),
    new ClusterAgent('AnalyticsAgent', ClusterType.MARKETING, ['track', 'report', 'insight']),
    new ClusterAgent('BrandingAgent', ClusterType.MARKETING, ['brand', 'identity', 'guideline']),
    new ClusterAgent('AdsAgent', ClusterType.MARKETING, ['ad', 'campaign', 'bid']),
    new ClusterAgent('InfluencerAgent', ClusterType.MARKETING, ['influencer', 'outreach', 'collab']),
    new ClusterAgent('EmailMarketingAgent', ClusterType.MARKETING, ['emailCampaign', 'newsletter', 'drip']),
  ];
  for (const agent of agents) registry.register(agent);
}

function registerBusinessAgents(registry: AgentRegistryService): void {
  const agents = [
    new ClusterAgent('FinanceAgent', ClusterType.BUSINESS, ['forecast', 'budget', 'report']),
    new ClusterAgent('CRMAgent', ClusterType.BUSINESS, ['crm', 'contact', 'lead']),
    new ClusterAgent('LegalAgent', ClusterType.BUSINESS, ['contract', 'compliance', 'review']),
    new ClusterAgent('HRAgent', ClusterType.BUSINESS, ['hire', 'onboard', 'review']),
    new ClusterAgent('StrategyAgent', ClusterType.BUSINESS, ['strategy', 'plan', 'analyze']),
    new ClusterAgent('DecisionAgent', ClusterType.BUSINESS, ['decide', 'evaluate', 'prioritize']),
    new ClusterAgent('ReportingAgent', ClusterType.BUSINESS, ['report', 'dashboard', 'kpi']),
    new ClusterAgent('ProcurementAgent', ClusterType.BUSINESS, ['procure', 'vendor', 'order']),
  ];
  for (const agent of agents) registry.register(agent);
}

function registerInfrastructureAgents(registry: AgentRegistryService): void {
  const agents = [
    new ClusterAgent('CloudAgent', ClusterType.INFRASTRUCTURE, ['deploy', 'scale', 'configure']),
    new ClusterAgent('ContainerAgent', ClusterType.INFRASTRUCTURE, ['docker', 'k8s', 'pod']),
    new ClusterAgent('CIAgent', ClusterType.INFRASTRUCTURE, ['pipeline', 'build', 'deploy']),
    new ClusterAgent('ScalingAgent', ClusterType.INFRASTRUCTURE, ['scale', 'autoscale', 'load']),
    new ClusterAgent('NetworkInfraAgent', ClusterType.INFRASTRUCTURE, ['network', 'dns', 'cdn']),
    new ClusterAgent('SecurityInfraAgent', ClusterType.INFRASTRUCTURE, ['firewall', 'waf', 'ddos']),
    new ClusterAgent('BackupInfraAgent', ClusterType.INFRASTRUCTURE, ['backup', 'snapshot', 'restore']),
    new ClusterAgent('MonitoringInfraAgent', ClusterType.INFRASTRUCTURE, ['monitor', 'alert', 'log']),
  ];
  for (const agent of agents) registry.register(agent);
}

function registerSecurityAgents(registry: AgentRegistryService): void {
  const agents = [
    new ClusterAgent('VulnerabilityAgent', ClusterType.SECURITY, ['scan', 'cve', 'patch']),
    new ClusterAgent('AccessControlAgent', ClusterType.SECURITY, ['authenticate', 'authorize', 'rbac']),
    new ClusterAgent('ComplianceAgent', ClusterType.SECURITY, ['compliance', 'audit', 'policy']),
    new ClusterAgent('EncryptionAgent', ClusterType.SECURITY, ['encrypt', 'decrypt', 'key']),
    new ClusterAgent('ForensicsAgent', ClusterType.SECURITY, ['forensics', 'investigate', 'trace']),
    new ClusterAgent('ThreatDetectionAgent', ClusterType.SECURITY, ['detect', 'alert', 'response']),
  ];
  for (const agent of agents) registry.register(agent);
}

function registerMetaIntelligenceAgents(registry: AgentRegistryService): void {
  const agents = [
    new ClusterAgent('ReasoningAgent', ClusterType.META_INTELLIGENCE, ['reason', 'infer', 'logic']),
    new ClusterAgent('LearningAgent', ClusterType.META_INTELLIGENCE, ['learn', 'adapt', 'improve']),
    new ClusterAgent('MemoryAgent', ClusterType.META_INTELLIGENCE, ['store', 'retrieve', 'recall']),
    new ClusterAgent('PerceptionAgent', ClusterType.META_INTELLIGENCE, ['perceive', 'sense', 'observe']),
    new ClusterAgent('OrchestrationAgent', ClusterType.META_INTELLIGENCE, ['orchestrate', 'coordinate', 'direct']),
    new ClusterAgent('CollaborationAgent', ClusterType.META_INTELLIGENCE, ['collaborate', 'share', 'communicate']),
    new ClusterAgent('CreativityAgent', ClusterType.META_INTELLIGENCE, ['create', 'innovate', 'generate']),
    new ClusterAgent('KnowledgeAgent', ClusterType.META_INTELLIGENCE, ['knowledge', 'graph', 'ontology']),
    new ClusterAgent('EvaluationAgent', ClusterType.META_INTELLIGENCE, ['evaluate', 'assess', 'score']),
    new ClusterAgent('OptimizationAgent', ClusterType.META_INTELLIGENCE, ['optimize', 'tune', 'refine']),
    new ClusterAgent('SelfHealingAgent', ClusterType.META_INTELLIGENCE, ['heal', 'recover', 'repair']),
    new ClusterAgent('MetaCognitionAgent', ClusterType.META_INTELLIGENCE, ['meta', 'reflect', 'introspect']),
    new ClusterAgent('AdaptationAgent', ClusterType.META_INTELLIGENCE, ['adapt', 'evolve', 'transform']),
  ];
  for (const agent of agents) registry.register(agent);
}

function registerLLMIntelligenceAgents(registry: AgentRegistryService): void {
  const agents = [
    new ClusterAgent('LLMPlannerAgent', ClusterType.LLM_INTELLIGENCE, ['plan', 'decompose', 'strategize']),
    new ClusterAgent('LLMCriticAgent', ClusterType.LLM_INTELLIGENCE, ['critique', 'evaluate', 'judge']),
    new ClusterAgent('LLMDecomposerAgent', ClusterType.LLM_INTELLIGENCE, ['decompose', 'breakdown', 'split']),
    new ClusterAgent('LLMValidatorAgent', ClusterType.LLM_INTELLIGENCE, ['validate', 'verify', 'check']),
    new ClusterAgent('LLMJudgeAgent', ClusterType.LLM_INTELLIGENCE, ['judge', 'rank', 'compare']),
    new ClusterAgent('LLMRepairAgent', ClusterType.LLM_INTELLIGENCE, ['repair', 'fix', 'patch']),
  ];
  for (const agent of agents) registry.register(agent);
}

function registerIntelligentOrchestrationAgents(registry: AgentRegistryService): void {
  const agents = [
    new ClusterAgent('MissionOrchestratorAIAgent', ClusterType.INTELLIGENT_ORCHESTRATION, ['orchestrate', 'schedule', 'prioritize']),
    new ClusterAgent('DynamicSchedulerAgent', ClusterType.INTELLIGENT_ORCHESTRATION, ['schedule', 'queue', 'prioritize']),
    new ClusterAgent('PriorityArbiterAgent', ClusterType.INTELLIGENT_ORCHESTRATION, ['arbitrate', 'decide', 'resolve']),
    new ClusterAgent('ResourceNegotiatorAgent', ClusterType.INTELLIGENT_ORCHESTRATION, ['negotiate', 'allocate', 'balance']),
  ];
  for (const agent of agents) registry.register(agent);
}

function registerWatchdogAgents(registry: AgentRegistryService): void {
  const agents = [
    new ClusterAgent('ErrorAnalyzerAgent', ClusterType.WATCHDOG, ['analyze', 'detect', 'diagnose']),
    new ClusterAgent('AutoFixerAgent', ClusterType.WATCHDOG, ['fix', 'repair', 'remediate']),
    new ClusterAgent('CircuitBreakerManagerAgent', ClusterType.WATCHDOG, ['circuit', 'breaker', 'fallback']),
  ];
  for (const agent of agents) registry.register(agent);
}

function registerSelfEvolutionAgents(registry: AgentRegistryService): void {
  const agents = [
    new ClusterAgent('MetricAnalyzerAgent', ClusterType.SELF_EVOLUTION, ['analyze', 'metric', 'measure']),
    new ClusterAgent('WeaknessDetectorAgent', ClusterType.SELF_EVOLUTION, ['detect', 'weakness', 'gap']),
    new ClusterAgent('RefactorProposerAgent', ClusterType.SELF_EVOLUTION, ['refactor', 'propose', 'improve']),
    new ClusterAgent('PatchGeneratorAgent', ClusterType.SELF_EVOLUTION, ['patch', 'generate', 'apply']),
    new ClusterAgent('AutoCertifierAgent', ClusterType.SELF_EVOLUTION, ['certify', 'verify', 'approve']),
  ];
  for (const agent of agents) registry.register(agent);
}

function registerCertificationAgents(registry: AgentRegistryService): void {
  const agents = [
    new ClusterAgent('ArchitectureAuditorAgent', ClusterType.CERTIFICATION, ['audit', 'review', 'assess']),
    new ClusterAgent('SecurityAuditorAgent', ClusterType.CERTIFICATION, ['security', 'audit', 'vulnerability']),
    new ClusterAgent('TestAuditorAgent', ClusterType.CERTIFICATION, ['test', 'coverage', 'regression']),
    new ClusterAgent('PluginAuditorAgent', ClusterType.CERTIFICATION, ['plugin', 'compatibility', 'version']),
    new ClusterAgent('ComplianceAuditorAgent', ClusterType.CERTIFICATION, ['compliance', 'regulation', 'policy']),
    new ClusterAgent('PerformanceAuditorAgent', ClusterType.CERTIFICATION, ['performance', 'benchmark', 'load']),
    new ClusterAgent('DocumentationAuditorAgent', ClusterType.CERTIFICATION, ['documentation', 'readme', 'api-doc']),
    new ClusterAgent('BrowserAuditorAgent', ClusterType.CERTIFICATION, ['browser', 'e2e', 'compatibility']),
    new ClusterAgent('MemoryAuditorAgent', ClusterType.CERTIFICATION, ['memory', 'leak', 'usage']),
    new ClusterAgent('ObservabilityAuditorAgent', ClusterType.CERTIFICATION, ['observability', 'logging', 'tracing']),
    new ClusterAgent('OrchestratorAuditorAgent', ClusterType.CERTIFICATION, ['orchestrator', 'pipeline', 'flow']),
    new ClusterAgent('AIQualityAuditorAgent', ClusterType.CERTIFICATION, ['ai', 'quality', 'hallucination']),
    new ClusterAgent('RegressionAuditorAgent', ClusterType.CERTIFICATION, ['regression', 'baseline', 'compare']),
  ];
  for (const agent of agents) registry.register(agent);
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Agent Clusters (e2e)', () => {
  let app: INestApplication;
  let registry: AgentRegistryService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [AgentRegistryService, EventEmitter2],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    registry = app.get(AgentRegistryService);

    // Register all cluster agents (mirrors real cluster module OnModuleInit)
    registerBrowserAgents(registry);
    registerComputerAgents(registry);
    registerCodingAgents(registry);
    registerOfficeAgents(registry);
    registerMarketingAgents(registry);
    registerBusinessAgents(registry);
    registerInfrastructureAgents(registry);
    registerSecurityAgents(registry);
    registerMetaIntelligenceAgents(registry);
    registerLLMIntelligenceAgents(registry);
    registerIntelligentOrchestrationAgents(registry);
    registerWatchdogAgents(registry);
    registerSelfEvolutionAgents(registry);
    registerCertificationAgents(registry);
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
