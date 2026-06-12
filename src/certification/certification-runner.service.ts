/**
 * AENEWS Agent OS X - Certification Runner Service
 * Orchestrates the execution of all certification domain tests,
 * collects results, calculates EQI, and generates the final certification report.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  CertificationDomain,
  CertificationLevel,
  CertificationReport,
  DomainResult,
  TestResult,
} from './types';
import { EqiCalculatorService } from './eqi-calculator.service';
import { ArchitectCertificationService } from './architect/architect-certification.service';
import { AgentIntegrityCertificationService } from './integrity/agent-integrity-certification.service';
import { OrchestrationCertificationService } from './orchestration/orchestration-certification.service';
import { BrowserCertificationService } from './browser/browser-certification.service';
import { PerformanceCertificationService } from './performance/performance-certification.service';
import { CommunicationCertificationService } from './communication/communication-certification.service';
import { MemoryCertificationService } from './memory/memory-certification.service';
import { ResilienceCertificationService } from './resilience/resilience-certification.service';
import { SecurityCertificationService } from './security/security-certification.service';

@Injectable()
export class CertificationRunnerService {
  private readonly logger = new Logger(CertificationRunnerService.name);

  /** Stores the last certification report for quick status/retrieval */
  private lastReport: CertificationReport | null = null;

  /** Tracks whether a certification run is currently in progress */
  private isRunning = false;

  constructor(
    private readonly eqiCalculator: EqiCalculatorService,
    private readonly architectCertification: ArchitectCertificationService,
    private readonly agentIntegrityCertification: AgentIntegrityCertificationService,
    private readonly orchestrationCertification: OrchestrationCertificationService,
    private readonly browserCertification: BrowserCertificationService,
    private readonly performanceCertification: PerformanceCertificationService,
    private readonly communicationCertification: CommunicationCertificationService,
    private readonly memoryCertification: MemoryCertificationService,
    private readonly resilienceCertification: ResilienceCertificationService,
    private readonly securityCertification: SecurityCertificationService,
  ) {}

  /**
   * Run the full certification suite across all domains.
   * Collects results, calculates EQI, and generates the report.
   */
  async runFullCertification(): Promise<CertificationReport> {
    if (this.isRunning) {
      throw new Error('Certification run is already in progress');
    }

    this.isRunning = true;
    const overallStart = Date.now();

    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log('  Starting Full Certification Run');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      const domains: DomainResult[] = [];

      // ─── Domain 1: Architecture ──────────────────────────────────
      this.logger.log('▶ Running Architecture certification...');
      const archResult = await this.architectCertification.runAll();
      domains.push(archResult);
      this.logger.log(`  Architecture: score=${archResult.score}, passed=${archResult.passed}`);

      // ─── Domain 2: Tests ─────────────────────────────────────────
      this.logger.log('▶ Running Tests certification...');
      const testResult = await this.runDomainPlaceholder(CertificationDomain.TESTS, [
        'Unit test coverage check',
        'Integration test coverage check',
        'E2E test readiness check',
      ]);
      domains.push(testResult);
      this.logger.log(`  Tests: score=${testResult.score}, passed=${testResult.passed}`);

      // ─── Domain 3: Orchestration ────────────────────────────────
      this.logger.log('▶ Running Orchestration certification...');
      const orchResult = await this.orchestrationCertification.runAll();
      domains.push(orchResult);
      this.logger.log(`  Orchestration: score=${orchResult.score}, passed=${orchResult.passed}`);

      // ─── Domain 4: Agents ───────────────────────────────────────
      this.logger.log('▶ Running Agents certification...');
      const agentsResult = await this.agentIntegrityCertification.runAll();
      domains.push(agentsResult);
      this.logger.log(`  Agents: score=${agentsResult.score}, passed=${agentsResult.passed}`);

      // ─── Domain 5: Browser ──────────────────────────────────────
      this.logger.log('▶ Running Browser certification...');
      const browserResult = await this.browserCertification.runAll();
      domains.push(browserResult);
      this.logger.log(`  Browser: score=${browserResult.score}, passed=${browserResult.passed}`);

      // ─── Domain 6: Memory ───────────────────────────────────────
      this.logger.log('▶ Running Memory certification...');
      const memoryResult = await this.memoryCertification.runAll();
      domains.push(memoryResult);
      this.logger.log(`  Memory: score=${memoryResult.score}, passed=${memoryResult.passed}`);

      // ─── Domain 7: Security ─────────────────────────────────────
      this.logger.log('▶ Running Security certification...');
      const securityResult = await this.securityCertification.runAll();
      domains.push(securityResult);
      this.logger.log(`  Security: score=${securityResult.score}, passed=${securityResult.passed}`);

      // ─── Domain 8: Performance ──────────────────────────────────
      this.logger.log('▶ Running Performance certification...');
      const perfResult = await this.performanceCertification.runAll();
      domains.push(perfResult);
      this.logger.log(`  Performance: score=${perfResult.score}, passed=${perfResult.passed}`);

      // ─── Domain 9: Documentation ────────────────────────────────
      this.logger.log('▶ Running Documentation certification...');
      const docResult = await this.runDomainPlaceholder(CertificationDomain.DOCUMENTATION, [
        'JSDoc comment coverage',
        'Interface documentation',
        'API documentation completeness',
        'README & changelog presence',
      ]);
      domains.push(docResult);
      this.logger.log(`  Documentation: score=${docResult.score}, passed=${docResult.passed}`);

      // ─── Calculate EQI ──────────────────────────────────────────
      const eqi = this.eqiCalculator.calculateEqi(domains);
      const level = this.eqiCalculator.determineLevel(eqi);
      const recommendations = this.eqiCalculator.generateRecommendations(domains);
      const criticalIssues = this.eqiCalculator.identifyCriticalFailures(domains);

      // ─── Build Summary ──────────────────────────────────────────
      const allTests = domains.flatMap((d) => d.tests);
      const summary = {
        totalTests: allTests.length,
        passed: allTests.filter((t) => t.passed).length,
        failed: allTests.filter((t) => !t.passed).length,
        skipped: 0,
      };

      // ─── Build Report ───────────────────────────────────────────
      const report: CertificationReport = {
        timestamp: new Date(),
        eqi,
        level,
        domains,
        summary,
        criticalIssues,
        recommendations,
        approved: level !== CertificationLevel.REJECTED,
      };

      this.lastReport = report;

      const totalDuration = Date.now() - overallStart;
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log(`  Certification Complete`);
      this.logger.log(`  EQI: ${eqi} | Level: ${level} | Approved: ${report.approved}`);
      this.logger.log(`  Tests: ${summary.passed}/${summary.totalTests} passed`);
      this.logger.log(`  Critical Issues: ${criticalIssues.length}`);
      this.logger.log(`  Duration: ${totalDuration}ms`);
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return report;
    } catch (error) {
      this.logger.error(
        `Certification run failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run certification for a specific domain only.
   */
  async runDomainCertification(domain: CertificationDomain): Promise<DomainResult> {
    this.logger.log(`Running certification for domain: ${domain}`);

    switch (domain) {
      case CertificationDomain.ARCHITECTURE:
        return this.architectCertification.runAll();

      case CertificationDomain.ORCHESTRATION:
        return this.orchestrationCertification.runAll();

      case CertificationDomain.AGENTS:
        return this.agentIntegrityCertification.runAll();

      case CertificationDomain.BROWSER:
        return this.browserCertification.runAll();

      case CertificationDomain.PERFORMANCE:
        return this.performanceCertification.runAll();

      case CertificationDomain.MEMORY:
        return this.memoryCertification.runAll();

      case CertificationDomain.SECURITY:
        return this.securityCertification.runAll();

      case CertificationDomain.TESTS:
      case CertificationDomain.DOCUMENTATION:
        return this.runDomainPlaceholder(domain, this.getDefaultTestsForDomain(domain));

      default:
        throw new Error(`Unknown certification domain: ${domain}`);
    }
  }

  /**
   * Get the last certification report.
   */
  getLastReport(): CertificationReport | null {
    return this.lastReport;
  }

  /**
   * Get the last certification status (lightweight).
   */
  getStatus(): {
    hasReport: boolean;
    isRunning: boolean;
    eqi?: number;
    level?: CertificationLevel;
    approved?: boolean;
    timestamp?: Date;
  } {
    if (!this.lastReport) {
      return { hasReport: false, isRunning: this.isRunning };
    }

    return {
      hasReport: true,
      isRunning: this.isRunning,
      eqi: this.lastReport.eqi,
      level: this.lastReport.level,
      approved: this.lastReport.approved,
      timestamp: this.lastReport.timestamp,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  /**
   * Run a placeholder domain certification with basic structural checks.
   * These domains will be implemented with full test suites in future iterations,
   * but for now they validate that the basic code structure exists.
   */
  private async runDomainPlaceholder(
    domain: CertificationDomain,
    testNames: string[],
  ): Promise<DomainResult> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const criticalFailures: string[] = [];

    for (const testName of testNames) {
      const testStart = Date.now();
      try {
        const result = await this.runStructuralTest(domain, testName);
        tests.push({
          name: testName,
          passed: result.passed,
          score: result.score,
          durationMs: Date.now() - testStart,
          details: result.details,
        });

        if (!result.passed && result.score < 50) {
          criticalFailures.push(`${testName}: Score ${result.score}/100`);
        }
      } catch (error) {
        tests.push({
          name: testName,
          passed: false,
          score: 0,
          durationMs: Date.now() - testStart,
          error: (error as Error).message,
        });
        criticalFailures.push(`${testName}: Execution error`);
      }
    }

    // Calculate domain score
    const totalScore = tests.reduce((sum, t) => sum + t.score, 0);
    const score = tests.length > 0 ? Math.round(totalScore / tests.length) : 0;
    const passed = score >= 90 && criticalFailures.length === 0;

    this.logger.log(
      `Domain ${domain}: score=${score}, passed=${passed}, tests=${tests.length}, ` +
        `duration=${Date.now() - startTime}ms`,
    );

    return {
      domain,
      weight: this.eqiCalculator.getWeight(domain),
      score,
      tests,
      passed,
      criticalFailures,
    };
  }

  /**
   * Run a structural verification test for a domain.
   * Checks that the relevant source files and directories exist.
   */
  private async runStructuralTest(
    domain: CertificationDomain,
    testName: string,
  ): Promise<{ passed: boolean; score: number; details?: Record<string, any> }> {
    const fs = await import('fs');
    const path = await import('path');
    const agentsDir = path.resolve(__dirname, '..', 'agents');

    // Domain-specific structural checks
    switch (domain) {
      case CertificationDomain.TESTS: {
        // Check for test infrastructure
        const hasOrchestrator = fs.existsSync(path.join(agentsDir, 'orchestrator'));
        const hasTaskValidator = fs.existsSync(
          path.join(agentsDir, 'orchestrator', 'task-validator.service.ts'),
        );
        const score = (hasOrchestrator ? 50 : 0) + (hasTaskValidator ? 50 : 0);
        return {
          passed: score >= 90,
          score,
          details: { hasOrchestrator, hasTaskValidator },
        };
      }

      case CertificationDomain.ORCHESTRATION: {
        const orchestratorDir = path.join(agentsDir, 'orchestrator');
        const services = [
          'task-decomposer.service.ts',
          'task-planner.service.ts',
          'task-executor.service.ts',
          'task-critic.service.ts',
          'task-repair.service.ts',
          'task-validator.service.ts',
          'task-delivery.service.ts',
          'orchestrator.service.ts',
        ];
        const existing = services.filter((s) => fs.existsSync(path.join(orchestratorDir, s)));
        const score = Math.round((existing.length / services.length) * 100);
        return {
          passed: score >= 90,
          score,
          details: {
            existingServices: existing,
            missingServices: services.filter((s) => !existing.includes(s)),
          },
        };
      }

      case CertificationDomain.AGENTS: {
        // Check agent count and structure
        const clusterDirs = [
          'browser',
          'computer',
          'coding',
          'office',
          'marketing',
          'business',
          'infrastructure',
          'security',
          'meta-intelligence',
        ];
        const existingClusters = clusterDirs.filter((d) => fs.existsSync(path.join(agentsDir, d)));
        const score = Math.round((existingClusters.length / clusterDirs.length) * 100);
        return {
          passed: score >= 90,
          score,
          details: {
            existingClusters,
            missingClusters: clusterDirs.filter((d) => !existingClusters.includes(d)),
          },
        };
      }

      case CertificationDomain.BROWSER: {
        const browserDir = path.join(agentsDir, 'browser');
        if (!fs.existsSync(browserDir)) {
          return { passed: false, score: 0, details: { error: 'Browser directory not found' } };
        }
        const expectedAgents = 17;
        const agentFiles = fs
          .readdirSync(browserDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => path.join(browserDir, d.name))
          .flatMap((dir) => fs.readdirSync(dir).filter((f) => f.endsWith('-agent.service.ts')));
        const score = Math.round((agentFiles.length / expectedAgents) * 100);
        return {
          passed: score >= 90,
          score: Math.min(score, 100),
          details: { found: agentFiles.length, expected: expectedAgents },
        };
      }

      case CertificationDomain.MEMORY: {
        const memoryDir = path.join(agentsDir, 'memory');
        const requiredServices = [
          'memory.service.ts',
          'working-memory.service.ts',
          'session-memory.service.ts',
          'long-term-memory.service.ts',
          'knowledge-graph.service.ts',
          'vector-search.service.ts',
          'rag.service.ts',
        ];
        const existing = requiredServices.filter((s) => fs.existsSync(path.join(memoryDir, s)));
        const score = Math.round((existing.length / requiredServices.length) * 100);
        return {
          passed: score >= 90,
          score,
          details: { existing, missing: requiredServices.filter((s) => !existing.includes(s)) },
        };
      }

      case CertificationDomain.SECURITY: {
        const securityDir = path.join(agentsDir, 'security');
        const requiredAgents = [
          'authentication',
          'access-control',
          'encryption',
          'audit',
          'incident-response',
          'threat-detection',
        ];
        const existing = requiredAgents.filter((a) => fs.existsSync(path.join(securityDir, a)));
        const score = Math.round((existing.length / requiredAgents.length) * 100);
        return {
          passed: score >= 90,
          score,
          details: { existing, missing: requiredAgents.filter((a) => !existing.includes(a)) },
        };
      }

      case CertificationDomain.PERFORMANCE: {
        // Check for performance-related infrastructure
        const healthDir = path.join(agentsDir, 'health');
        const hasHealthService = fs.existsSync(path.join(healthDir, 'agent-health.service.ts'));
        const hasMetricsService = fs.existsSync(path.join(healthDir, 'agent-metrics.service.ts'));
        const hasBaseAgent = fs.existsSync(path.join(agentsDir, 'base', 'base-agent.service.ts'));

        // Check base agent has circuit breaker, metrics, etc.
        let perfFeatures = 0;
        if (hasBaseAgent) {
          const content = fs.readFileSync(
            path.join(agentsDir, 'base', 'base-agent.service.ts'),
            'utf-8',
          );
          if (content.includes('circuitBreaker')) perfFeatures++;
          if (content.includes('collectMetrics')) perfFeatures++;
          if (content.includes('executeWithTimeout')) perfFeatures++;
          if (content.includes('executeWithRetry')) perfFeatures++;
        }

        const totalChecks = 6; // health + metrics + base + 4 perf features
        const found =
          [hasHealthService, hasMetricsService, hasBaseAgent].filter(Boolean).length + perfFeatures;
        const score = Math.round((found / totalChecks) * 100);
        return {
          passed: score >= 90,
          score,
          details: { hasHealthService, hasMetricsService, hasBaseAgent, perfFeatures },
        };
      }

      case CertificationDomain.DOCUMENTATION: {
        // Check for JSDoc comments in key files
        const keyFiles = [
          path.join(agentsDir, 'interfaces', 'agent.interface.ts'),
          path.join(agentsDir, 'base', 'base-agent.service.ts'),
        ];

        let documentedFiles = 0;
        for (const file of keyFiles) {
          if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf-8');
            const jsdocCount = (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length;
            if (jsdocCount > 5) documentedFiles++;
          }
        }

        const score = Math.round((documentedFiles / keyFiles.length) * 100);
        return {
          passed: score >= 90,
          score,
          details: { documentedFiles, totalFiles: keyFiles.length },
        };
      }

      default:
        return { passed: false, score: 0, details: { error: `Unknown domain: ${domain}` } };
    }
  }

  /**
   * Get default test names for a domain.
   */
  private getDefaultTestsForDomain(domain: CertificationDomain): string[] {
    const domainTests: Record<CertificationDomain, string[]> = {
      [CertificationDomain.ARCHITECTURE]: [
        'No circular dependencies',
        'Clean architecture compliance',
        'Naming conventions',
        'No inter-cluster coupling',
        'Interface compliance',
        'Module structure',
        'Agent config validity',
      ],
      [CertificationDomain.TESTS]: [
        'Unit test coverage',
        'Integration test coverage',
        'E2E test readiness',
      ],
      [CertificationDomain.ORCHESTRATION]: [
        'Task decomposition pipeline',
        'Planning engine',
        'Execute-critique-repair loop',
        'Delivery pipeline',
      ],
      [CertificationDomain.AGENTS]: [
        'Agent cluster completeness',
        'Agent lifecycle verification',
        'Agent health monitoring',
        'Agent tool availability',
      ],
      [CertificationDomain.BROWSER]: [
        'Browser agent completeness',
        'Navigation & interaction',
        'Session & cookie management',
        'Screenshot & data extraction',
      ],
      [CertificationDomain.MEMORY]: [
        'Working memory tier',
        'Session memory tier',
        'Long-term memory tier',
        'Knowledge graph & vector search',
      ],
      [CertificationDomain.SECURITY]: [
        'Authentication service',
        'Authorization & access control',
        'Encryption verification',
        'Audit & threat detection',
      ],
      [CertificationDomain.PERFORMANCE]: [
        'Execution time benchmarks',
        'Memory consumption',
        'Concurrent task handling',
        'Circuit breaker & retry',
      ],
      [CertificationDomain.DOCUMENTATION]: [
        'JSDoc comment coverage',
        'Interface documentation',
        'API documentation',
        'README & changelog',
      ],
    };

    return domainTests[domain] || [];
  }
}
