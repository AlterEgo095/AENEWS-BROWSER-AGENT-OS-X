/**
 * AENEWS Agent OS X - Certification Runner Service
 * Orchestrates the execution of all certification domain tests,
 * collects results, calculates EQI, and generates the final certification report.
 * Now includes 10 domains with Observability and Dependency Analyzer integration.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  CertificationDomain,
  CertificationLevel,
  CertificationReport,
  DomainResult,
  TestResult,
  EqiMilestone,
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
import { DependencyAnalyzerService } from './architect/dependency-analyzer.service';

@Injectable()
export class CertificationRunnerService {
  private readonly logger = new Logger(CertificationRunnerService.name);

  private lastReport: CertificationReport | null = null;
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
    private readonly dependencyAnalyzer: DependencyAnalyzerService,
  ) {}

  /**
   * Run the full certification suite across all 10 domains.
   */
  async runFullCertification(): Promise<CertificationReport> {
    if (this.isRunning) {
      throw new Error('Certification run is already in progress');
    }

    this.isRunning = true;
    const overallStart = Date.now();

    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.log('  Starting Full Certification Run (v2 - 10 Domains)');
    this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      const domains: DomainResult[] = [];
      const previousEqi = this.lastReport?.eqi;

      // ─── Domain 1: Architecture (8%) ───────────────────────────
      this.logger.log('▶ [1/10] Running Architecture certification...');
      const archResult = await this.runArchitectureDomain();
      domains.push(archResult);
      this.logger.log(`  Architecture: score=${archResult.score}, passed=${archResult.passed}`);

      // ─── Domain 2: Agents (12%) ────────────────────────────────
      this.logger.log('▶ [2/10] Running Agents certification...');
      const agentsResult = await this.agentIntegrityCertification.runAll();
      domains.push(agentsResult);
      this.logger.log(`  Agents: score=${agentsResult.score}, passed=${agentsResult.passed}`);

      // ─── Domain 3: Orchestration (15%) ─────────────────────────
      this.logger.log('▶ [3/10] Running Orchestration certification...');
      const orchResult = await this.orchestrationCertification.runAll();
      domains.push(orchResult);
      this.logger.log(`  Orchestration: score=${orchResult.score}, passed=${orchResult.passed}`);

      // ─── Domain 4: Browser (10%) ───────────────────────────────
      this.logger.log('▶ [4/10] Running Browser certification...');
      const browserResult = await this.browserCertification.runAll();
      domains.push(browserResult);
      this.logger.log(`  Browser: score=${browserResult.score}, passed=${browserResult.passed}`);

      // ─── Domain 5: Memory (12%) ────────────────────────────────
      this.logger.log('▶ [5/10] Running Memory certification...');
      const memoryResult = await this.runMemoryDomain();
      domains.push(memoryResult);
      this.logger.log(`  Memory: score=${memoryResult.score}, passed=${memoryResult.passed}`);

      // ─── Domain 6: Security (15%) ──────────────────────────────
      this.logger.log('▶ [6/10] Running Security certification...');
      const securityResult = await this.runSecurityDomain();
      domains.push(securityResult);
      this.logger.log(`  Security: score=${securityResult.score}, passed=${securityResult.passed}`);

      // ─── Domain 7: Performance (8%) ────────────────────────────
      this.logger.log('▶ [7/10] Running Performance certification...');
      const perfResult = await this.performanceCertification.runAll();
      domains.push(perfResult);
      this.logger.log(`  Performance: score=${perfResult.score}, passed=${perfResult.passed}`);

      // ─── Domain 8: Tests (10%) ─────────────────────────────────
      this.logger.log('▶ [8/10] Running Tests certification...');
      const testResult = await this.runTestsDomain();
      domains.push(testResult);
      this.logger.log(`  Tests: score=${testResult.score}, passed=${testResult.passed}`);

      // ─── Domain 9: Documentation (5%) ──────────────────────────
      this.logger.log('▶ [9/10] Running Documentation certification...');
      const docResult = await this.runDocumentationDomain();
      domains.push(docResult);
      this.logger.log(`  Documentation: score=${docResult.score}, passed=${docResult.passed}`);

      // ─── Domain 10: Observability (5%) ─────────────────────────
      this.logger.log('▶ [10/10] Running Observability certification...');
      const obsResult = await this.runObservabilityDomain();
      domains.push(obsResult);
      this.logger.log(`  Observability: score=${obsResult.score}, passed=${obsResult.passed}`);

      // ─── Calculate EQI ──────────────────────────────────────────
      const eqi = this.eqiCalculator.calculateEqi(domains);
      const level = this.eqiCalculator.determineLevel(eqi);
      const milestone = this.eqiCalculator.determineMilestone(eqi);
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
        milestone,
        domains,
        summary,
        criticalIssues,
        recommendations,
        approved: level !== CertificationLevel.REJECTED,
        governanceCompliant: level !== CertificationLevel.REJECTED,
        previousEqi,
        eqiDelta: previousEqi !== undefined ? eqi - previousEqi : undefined,
      };

      this.lastReport = report;

      const totalDuration = Date.now() - overallStart;
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.log(`  Certification Complete (v2)`);
      this.logger.log(`  EQI: ${eqi} | Level: ${level} | Milestone: ${milestone || 'none'}`);
      this.logger.log(`  Tests: ${summary.passed}/${summary.totalTests} passed`);
      this.logger.log(`  Critical Issues: ${criticalIssues.length}`);
      this.logger.log(
        `  Governance: ${report.governanceCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`,
      );
      if (previousEqi !== undefined) {
        this.logger.log(`  EQI Delta: ${report.eqiDelta! >= 0 ? '+' : ''}${report.eqiDelta}`);
      }
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
    switch (domain) {
      case CertificationDomain.ARCHITECTURE:
        return this.runArchitectureDomain();
      case CertificationDomain.ORCHESTRATION:
        return this.orchestrationCertification.runAll();
      case CertificationDomain.AGENTS:
        return this.agentIntegrityCertification.runAll();
      case CertificationDomain.BROWSER:
        return this.browserCertification.runAll();
      case CertificationDomain.PERFORMANCE:
        return this.performanceCertification.runAll();
      case CertificationDomain.MEMORY:
        return this.runMemoryDomain();
      case CertificationDomain.SECURITY:
        return this.runSecurityDomain();
      case CertificationDomain.TESTS:
        return this.runTestsDomain();
      case CertificationDomain.DOCUMENTATION:
        return this.runDocumentationDomain();
      case CertificationDomain.OBSERVABILITY:
        return this.runObservabilityDomain();
      default:
        throw new Error(`Unknown certification domain: ${domain}`);
    }
  }

  getLastReport(): CertificationReport | null {
    return this.lastReport;
  }

  getStatus(): {
    hasReport: boolean;
    isRunning: boolean;
    eqi?: number;
    level?: CertificationLevel;
    approved?: boolean;
    governanceCompliant?: boolean;
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
      governanceCompliant: this.lastReport.governanceCompliant,
      timestamp: this.lastReport.timestamp,
    };
  }

  // ─── Domain-Specific Runners ────────────────────────────────────

  private async runArchitectureDomain(): Promise<DomainResult> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const criticalFailures: string[] = [];

    // Run existing architect certification
    const archResult = await this.architectCertification.runAll();
    tests.push(...archResult.tests);

    // Run dependency analysis
    try {
      const analysis = await this.dependencyAnalyzer.analyze();

      tests.push({
        name: 'Circular dependency detection',
        passed: analysis.cycles.length === 0,
        score: analysis.cycles.length === 0 ? 100 : Math.max(0, 100 - analysis.cycles.length * 20),
        durationMs: Date.now() - startTime,
        details: {
          cycleCount: analysis.cycles.length,
          cycles: analysis.cycles.map((c) => c.description),
        },
      });

      tests.push({
        name: 'Coupling score',
        passed: analysis.couplingScore >= 80,
        score: analysis.couplingScore,
        durationMs: Date.now() - startTime,
        details: { couplingScore: analysis.couplingScore },
      });

      tests.push({
        name: 'Cross-cluster import validation',
        passed: analysis.crossClusterImports.length === 0,
        score:
          analysis.crossClusterImports.length === 0
            ? 100
            : Math.max(0, 100 - analysis.crossClusterImports.length * 15),
        durationMs: Date.now() - startTime,
        details: { crossClusterImports: analysis.crossClusterImports.length },
      });

      if (analysis.cycles.some((c) => c.severity === 'critical')) {
        criticalFailures.push(
          `Circular dependencies detected: ${analysis.cycles.filter((c) => c.severity === 'critical').length} critical cycles`,
        );
      }
    } catch (error) {
      tests.push({
        name: 'Dependency analysis',
        passed: false,
        score: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      });
    }

    const allTests = [
      ...archResult.tests,
      ...tests.filter((t) => !archResult.tests.some((at) => at.name === t.name)),
    ];
    const totalScore = allTests.reduce((sum, t) => sum + t.score, 0);
    const score = allTests.length > 0 ? Math.round(totalScore / allTests.length) : 0;
    const allCriticals = [...archResult.criticalFailures, ...criticalFailures];
    const passed = score >= 90 && allCriticals.length === 0;

    return {
      domain: CertificationDomain.ARCHITECTURE,
      weight: this.eqiCalculator.getWeight(CertificationDomain.ARCHITECTURE),
      score,
      tests: allTests,
      passed,
      criticalFailures: allCriticals,
    };
  }

  private async runMemoryDomain(): Promise<DomainResult> {
    const baseResult = await this.memoryCertification.runAll();
    const tests = [...baseResult.tests];
    const criticalFailures = [...baseResult.criticalFailures];

    // Add Memory Gateway checks
    const fs = await import('fs');
    const path = await import('path');
    const gatewayPath = path.resolve(
      __dirname,
      '..',
      'gateway',
      'memory',
      'memory-gateway.service.ts',
    );

    tests.push({
      name: 'Unified Memory Gateway existence',
      passed: fs.existsSync(gatewayPath),
      score: fs.existsSync(gatewayPath) ? 100 : 0,
      durationMs: 0,
      details: { path: gatewayPath },
    });

    // Check for unified API methods
    if (fs.existsSync(gatewayPath)) {
      const content = fs.readFileSync(gatewayPath, 'utf-8');
      const requiredMethods = [
        'store(',
        'retrieve(',
        'search(',
        'summarize(',
        'promote(',
        'archive(',
        'crossTierRetrieve(',
      ];
      const foundMethods = requiredMethods.filter((m) => content.includes(m));
      tests.push({
        name: 'Memory Gateway unified API',
        passed: foundMethods.length === requiredMethods.length,
        score: Math.round((foundMethods.length / requiredMethods.length) * 100),
        durationMs: 0,
        details: {
          foundMethods,
          missingMethods: requiredMethods.filter((m) => !foundMethods.includes(m)),
        },
      });

      const hasCrossTier = content.includes('crossTierRetrieve');
      tests.push({
        name: 'Cross-tier retrieval engine',
        passed: hasCrossTier,
        score: hasCrossTier ? 100 : 0,
        durationMs: 0,
      });
    }

    const totalScore = tests.reduce((sum, t) => sum + t.score, 0);
    const score = tests.length > 0 ? Math.round(totalScore / tests.length) : 0;
    const passed = score >= 90 && criticalFailures.length === 0;

    return {
      domain: CertificationDomain.MEMORY,
      weight: this.eqiCalculator.getWeight(CertificationDomain.MEMORY),
      score,
      tests,
      passed,
      criticalFailures,
    };
  }

  private async runSecurityDomain(): Promise<DomainResult> {
    const baseResult = await this.securityCertification.runAll();
    const tests = [...baseResult.tests];
    const criticalFailures = [...baseResult.criticalFailures];

    // Add Security Gateway checks
    const fs = await import('fs');
    const path = await import('path');
    const gatewayPath = path.resolve(
      __dirname,
      '..',
      'gateway',
      'security',
      'security-gateway.service.ts',
    );

    tests.push({
      name: 'Security Gateway existence',
      passed: fs.existsSync(gatewayPath),
      score: fs.existsSync(gatewayPath) ? 100 : 0,
      durationMs: 0,
    });

    if (fs.existsSync(gatewayPath)) {
      const content = fs.readFileSync(gatewayPath, 'utf-8');

      // Check injection prevention
      const hasInjectionDetection =
        content.includes('PROMPT_INJECTION') &&
        content.includes('COMMAND_INJECTION') &&
        content.includes('SQL_INJECTION');
      tests.push({
        name: 'Injection prevention patterns',
        passed: hasInjectionDetection,
        score: hasInjectionDetection ? 100 : 30,
        durationMs: 0,
      });

      // Check policy engine
      const hasPolicyEngine =
        content.includes('evaluatePolicies') && content.includes('SecurityPolicy');
      tests.push({
        name: 'Policy engine',
        passed: hasPolicyEngine,
        score: hasPolicyEngine ? 100 : 0,
        durationMs: 0,
      });

      // Check audit logging
      const hasAudit = content.includes('auditLog') && content.includes('AuditLogEntry');
      tests.push({
        name: 'Audit logging',
        passed: hasAudit,
        score: hasAudit ? 100 : 0,
        durationMs: 0,
      });

      // Check sanitization
      const hasSanitization = content.includes('sanitize') && content.includes('REMOVED');
      tests.push({
        name: 'Input sanitization',
        passed: hasSanitization,
        score: hasSanitization ? 100 : 0,
        durationMs: 0,
      });
    }

    const totalScore = tests.reduce((sum, t) => sum + t.score, 0);
    const score = tests.length > 0 ? Math.round(totalScore / tests.length) : 0;
    const passed = score >= 90 && criticalFailures.length === 0;

    return {
      domain: CertificationDomain.SECURITY,
      weight: this.eqiCalculator.getWeight(CertificationDomain.SECURITY),
      score,
      tests,
      passed,
      criticalFailures,
    };
  }

  private async runTestsDomain(): Promise<DomainResult> {
    const fs = await import('fs');
    const path = await import('path');
    const tests: TestResult[] = [];
    const criticalFailures: string[] = [];

    // Check test infrastructure
    const testDir = path.resolve(__dirname, '..', '..', 'test');
    const srcDir = path.resolve(__dirname, '..', '..');

    // Count spec files
    const specFiles = await this.findFilesAsync(srcDir, '.spec.ts');
    const e2eFiles = await this.findFilesAsync(testDir, '.e2e-spec.ts');

    tests.push({
      name: 'Unit test file count',
      passed: specFiles.length > 0,
      score: Math.min(100, specFiles.length * 10),
      durationMs: 0,
      details: { count: specFiles.length },
    });

    tests.push({
      name: 'E2E test readiness',
      passed: e2eFiles.length > 0,
      score: e2eFiles.length > 0 ? 100 : 0,
      durationMs: 0,
      details: { count: e2eFiles.length },
    });

    // Check jest configuration
    const jestConfigPath = path.resolve(srcDir, '..', 'jest.config.js');
    const hasJestConfig = fs.existsSync(jestConfigPath);
    tests.push({
      name: 'Jest configuration',
      passed: hasJestConfig,
      score: hasJestConfig ? 100 : 0,
      durationMs: 0,
    });

    // Check test directories for each cluster
    const clusters = [
      'browser',
      'computer',
      'coding',
      'office',
      'marketing',
      'business',
      'infrastructure',
      'security',
      'meta-intelligence',
      'certification',
      'self-evolution',
    ];
    const clustersWithTests: string[] = [];
    for (const c of clusters) {
      const clusterDir = path.join(srcDir, 'agents', c);
      if (!fs.existsSync(clusterDir)) continue;
      const files = await this.findFilesAsync(clusterDir, '.spec.ts');
      if (files.length > 0) clustersWithTests.push(c);
    }

    tests.push({
      name: 'Cluster test coverage',
      passed: clustersWithTests.length >= clusters.length * 0.5,
      score: Math.round((clustersWithTests.length / clusters.length) * 100),
      durationMs: 0,
      details: { clustersWithTests, totalClusters: clusters.length },
    });

    if (specFiles.length === 0) {
      criticalFailures.push('No unit test files found');
    }

    const totalScore = tests.reduce((sum, t) => sum + t.score, 0);
    const score = tests.length > 0 ? Math.round(totalScore / tests.length) : 0;
    const passed = score >= 90 && criticalFailures.length === 0;

    return {
      domain: CertificationDomain.TESTS,
      weight: this.eqiCalculator.getWeight(CertificationDomain.TESTS),
      score,
      tests,
      passed,
      criticalFailures,
    };
  }

  private async runDocumentationDomain(): Promise<DomainResult> {
    const fs = await import('fs');
    const path = await import('path');
    const tests: TestResult[] = [];
    const criticalFailures: string[] = [];

    // Check documentation generator
    const docGenPath = path.resolve(
      __dirname,
      '..',
      'gateway',
      'documentation',
      'documentation-generator.service.ts',
    );
    tests.push({
      name: 'Documentation generator existence',
      passed: fs.existsSync(docGenPath),
      score: fs.existsSync(docGenPath) ? 100 : 0,
      durationMs: 0,
    });

    // Check JSDoc coverage
    const srcDir = path.resolve(__dirname, '..', '..');
    let totalFiles = 0;
    let filesWithJSDoc = 0;

    const tsFiles = await this.findFilesAsync(srcDir, '.ts');
    for (const file of tsFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        totalFiles++;
        if ((content.match(/\/\*\*[\s\S]*?\*\//g) || []).length > 2) {
          filesWithJSDoc++;
        }
      } catch {
        /* skip */
      }
    }

    const jsdocCoverage = totalFiles > 0 ? Math.round((filesWithJSDoc / totalFiles) * 100) : 0;
    tests.push({
      name: 'JSDoc comment coverage',
      passed: jsdocCoverage >= 70,
      score: jsdocCoverage,
      durationMs: 0,
      details: { filesWithJSDoc, totalFiles },
    });

    // Check README
    const readmePath = path.resolve(srcDir, '..', 'README.md');
    tests.push({
      name: 'README presence',
      passed: fs.existsSync(readmePath),
      score: fs.existsSync(readmePath) ? 100 : 0,
      durationMs: 0,
    });

    // Check for architecture diagrams
    const hasDocGen = fs.existsSync(docGenPath);
    if (hasDocGen) {
      const content = fs.readFileSync(docGenPath, 'utf-8');
      const hasMermaid = content.includes('mermaid') || content.includes('Mermaid');
      tests.push({
        name: 'Mermaid diagram generation',
        passed: hasMermaid,
        score: hasMermaid ? 100 : 0,
        durationMs: 0,
      });
    }

    if (jsdocCoverage < 30) {
      criticalFailures.push(`JSDoc coverage critically low: ${jsdocCoverage}%`);
    }

    const totalScore = tests.reduce((sum, t) => sum + t.score, 0);
    const score = tests.length > 0 ? Math.round(totalScore / tests.length) : 0;
    const passed = score >= 90 && criticalFailures.length === 0;

    return {
      domain: CertificationDomain.DOCUMENTATION,
      weight: this.eqiCalculator.getWeight(CertificationDomain.DOCUMENTATION),
      score,
      tests,
      passed,
      criticalFailures,
    };
  }

  private async runObservabilityDomain(): Promise<DomainResult> {
    const fs = await import('fs');
    const path = await import('path');
    const tests: TestResult[] = [];
    const criticalFailures: string[] = [];
    const srcDir = path.resolve(__dirname, '..', '..');

    // Check health module
    const healthModule = path.join(srcDir, 'agents', 'health', 'health.module.ts');
    const hasHealthModule = fs.existsSync(healthModule);
    tests.push({
      name: 'Health monitoring module',
      passed: hasHealthModule,
      score: hasHealthModule ? 100 : 0,
      durationMs: 0,
    });

    // Check metrics service
    const metricsService = path.join(srcDir, 'agents', 'health', 'agent-metrics.service.ts');
    const hasMetrics = fs.existsSync(metricsService);
    tests.push({
      name: 'Metrics collection service',
      passed: hasMetrics,
      score: hasMetrics ? 100 : 0,
      durationMs: 0,
    });

    // Check event bus for observability
    const eventBus = path.join(srcDir, 'agents', 'events', 'event-bus.service.ts');
    const hasEventBus = fs.existsSync(eventBus);
    tests.push({
      name: 'Event bus for tracing',
      passed: hasEventBus,
      score: hasEventBus ? 100 : 0,
      durationMs: 0,
    });

    // Check circuit breaker in base agent
    const baseAgent = path.join(srcDir, 'agents', 'base', 'base-agent.service.ts');
    if (fs.existsSync(baseAgent)) {
      const content = fs.readFileSync(baseAgent, 'utf-8');
      const hasCircuitBreaker = content.includes('circuitBreaker');
      const hasHealthCheck =
        content.includes('healthCheck') || content.includes('performHealthCheck');
      const hasMetricsCollection =
        content.includes('collectMetrics') || content.includes('emitMetrics');

      tests.push({
        name: 'Circuit breaker observability',
        passed: hasCircuitBreaker,
        score: hasCircuitBreaker ? 100 : 0,
        durationMs: 0,
      });

      tests.push({
        name: 'Agent health monitoring',
        passed: hasHealthCheck,
        score: hasHealthCheck ? 100 : 0,
        durationMs: 0,
      });

      tests.push({
        name: 'Agent metrics emission',
        passed: hasMetricsCollection,
        score: hasMetricsCollection ? 100 : 0,
        durationMs: 0,
      });
    }

    // Check OpenTelemetry in dependencies
    const packageJsonPath = path.join(srcDir, '..', 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const hasOtel =
        pkg.dependencies?.['@opentelemetry/api'] || pkg.dependencies?.['@opentelemetry/sdk-node'];
      tests.push({
        name: 'OpenTelemetry integration',
        passed: !!hasOtel,
        score: hasOtel ? 100 : 0,
        durationMs: 0,
      });
    }

    const totalScore = tests.reduce((sum, t) => sum + t.score, 0);
    const score = tests.length > 0 ? Math.round(totalScore / tests.length) : 0;
    const passed = score >= 90 && criticalFailures.length === 0;

    return {
      domain: CertificationDomain.OBSERVABILITY,
      weight: this.eqiCalculator.getWeight(CertificationDomain.OBSERVABILITY),
      score,
      tests,
      passed,
      criticalFailures,
    };
  }

  // ─── Utility ─────────────────────────────────────────────────────

  private async findFilesAsync(dir: string, extension: string): Promise<string[]> {
    const fsMod = await import('fs');
    const pathMod = await import('path');
    const files: string[] = [];
    const excludeDirs = ['node_modules', 'dist', '.git', 'coverage', 'backend', 'frontend'];

    try {
      const entries = fsMod.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (excludeDirs.includes(entry.name)) continue;
        const fullPath = pathMod.join(dir, entry.name);
        if (entry.isDirectory()) {
          const subFiles = await this.findFilesAsync(fullPath, extension);
          files.push(...subFiles);
        } else if (entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch {
      /* skip */
    }

    return files;
  }
}
