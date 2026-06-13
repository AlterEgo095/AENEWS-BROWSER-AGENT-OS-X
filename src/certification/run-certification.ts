/**
 * AENEWS Agent OS X - Standalone Certification Runner
 * Runs all certification tests and produces the EQI report.
 * This script can be executed directly without starting the full NestJS server.
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/certification/run-certification.ts
 */

import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

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
import { CertificationDomain, CertificationLevel } from './types';

const logger = new Logger('CertificationRunner');

async function runCertification(): Promise<void> {
  const startTime = Date.now();

  logger.log('═══════════════════════════════════════════════════════════════');
  logger.log('  AENEWS Agent OS X - Phase T∞ Terminal Certification');
  logger.log('═══════════════════════════════════════════════════════════════');
  logger.log('');

  const eqiCalculator = new EqiCalculatorService();
  const domains = [];

  // Domain 1: Architecture (10%)
  logger.log('▶ [1/9] Running Architecture certification...');
  const archService = new ArchitectCertificationService();
  const archResult = await archService.runAll();
  domains.push(archResult);
  logger.log(`  ✓ Architecture: ${archResult.score}/100 (${archResult.passed ? 'PASS' : 'FAIL'})`);

  // Domain 2: Tests (10%) - placeholder
  logger.log('▶ [2/9] Running Tests certification...');
  const testScore = await runSimpleCheck('tests', [
    {
      name: 'Jest config exists',
      check: () => fs.existsSync(path.resolve(__dirname, '..', '..', 'jest.config.js')),
    },
    {
      name: 'Test directory exists',
      check: () => fs.existsSync(path.resolve(__dirname, '..', '..', '..', 'test')),
    },
    {
      name: 'E2E test config exists',
      check: () =>
        fs.existsSync(path.resolve(__dirname, '..', '..', '..', 'test', 'jest-e2e.json')),
    },
  ]);
  domains.push({
    domain: CertificationDomain.TESTS,
    weight: 0.1,
    score: testScore,
    tests: [],
    passed: testScore >= 90,
    criticalFailures: testScore < 50 ? ['Test infrastructure incomplete'] : [],
  });
  logger.log(`  ✓ Tests: ${testScore}/100 (${testScore >= 90 ? 'PASS' : 'FAIL'})`);

  // Domain 3: Orchestration (15%)
  logger.log('▶ [3/9] Running Orchestration certification...');
  const orchService = new OrchestrationCertificationService();
  const orchResult = await orchService.runAll();
  domains.push(orchResult);
  logger.log(`  ✓ Orchestration: ${orchResult.score}/100 (${orchResult.passed ? 'PASS' : 'FAIL'})`);

  // Domain 4: Agents (15%)
  logger.log('▶ [4/9] Running Agents certification...');
  const agentService = new AgentIntegrityCertificationService();
  const agentResult = await agentService.runAll();
  domains.push(agentResult);
  logger.log(`  ✓ Agents: ${agentResult.score}/100 (${agentResult.passed ? 'PASS' : 'FAIL'})`);

  // Domain 5: Browser (10%)
  logger.log('▶ [5/9] Running Browser certification...');
  const browserService = new BrowserCertificationService();
  const browserResult = await browserService.runAll();
  domains.push(browserResult);
  logger.log(`  ✓ Browser: ${browserResult.score}/100 (${browserResult.passed ? 'PASS' : 'FAIL'})`);

  // Domain 6: Memory (10%)
  logger.log('▶ [6/9] Running Memory certification...');
  const memoryService = new MemoryCertificationService();
  const memoryResult = await memoryService.runAll();
  domains.push(memoryResult);
  logger.log(`  ✓ Memory: ${memoryResult.score}/100 (${memoryResult.passed ? 'PASS' : 'FAIL'})`);

  // Domain 7: Security (15%)
  logger.log('▶ [7/9] Running Security certification...');
  const securityService = new SecurityCertificationService();
  const securityResult = await securityService.runAll();
  domains.push(securityResult);
  logger.log(
    `  ✓ Security: ${securityResult.score}/100 (${securityResult.passed ? 'PASS' : 'FAIL'})`,
  );

  // Domain 8: Performance (10%)
  logger.log('▶ [8/9] Running Performance certification...');
  const perfService = new PerformanceCertificationService();
  const perfResult = await perfService.runAll();
  domains.push(perfResult);
  logger.log(`  ✓ Performance: ${perfResult.score}/100 (${perfResult.passed ? 'PASS' : 'FAIL'})`);

  // Domain 9: Documentation (5%) - placeholder
  logger.log('▶ [9/9] Running Documentation certification...');
  const docScore = await runDocCheck();
  domains.push({
    domain: CertificationDomain.DOCUMENTATION,
    weight: 0.05,
    score: docScore,
    tests: [],
    passed: docScore >= 90,
    criticalFailures: docScore < 50 ? ['Documentation insufficient'] : [],
  });
  logger.log(`  ✓ Documentation: ${docScore}/100 (${docScore >= 90 ? 'PASS' : 'FAIL'})`);

  // Calculate EQI
  const eqi = eqiCalculator.calculateEqi(domains);
  const level = eqiCalculator.determineLevel(eqi);
  const recommendations = eqiCalculator.generateRecommendations(domains);
  const criticalIssues = eqiCalculator.identifyCriticalFailures(domains);

  const totalDuration = Date.now() - startTime;

  // Print report
  logger.log('');
  logger.log('═══════════════════════════════════════════════════════════════');
  logger.log('  CERTIFICATION REPORT');
  logger.log('═══════════════════════════════════════════════════════════════');
  logger.log('');

  // Domain breakdown table
  logger.log('  ┌──────────────────────┬──────────┬──────────┬─────────┐');
  logger.log('  │ Domain               │ Weight   │ Score    │ Status  │');
  logger.log('  ├──────────────────────┼──────────┼──────────┼─────────┤');
  for (const domain of domains) {
    const name = domain.domain.padEnd(20);
    const weight = `${(domain.weight * 100).toFixed(0)}%`.padEnd(8);
    const score = `${domain.score}`.padEnd(8);
    const status = domain.passed ? '✅ PASS' : '❌ FAIL';
    logger.log(`  │ ${name} │ ${weight} │ ${score} │ ${status} │`);
  }
  logger.log('  └──────────────────────┴──────────┴──────────┴─────────┘');
  logger.log('');

  // EQI Score
  const levelIcon =
    level === CertificationLevel.PLATINUM
      ? '🏆'
      : level === CertificationLevel.GOLD
        ? '🥇'
        : level === CertificationLevel.SILVER
          ? '🥈'
          : '❌';
  logger.log(`  Enterprise Quality Index (EQI): ${eqi.toFixed(1)}%`);
  logger.log(`  Certification Level: ${level} ${levelIcon}`);
  logger.log(`  Approved: ${level !== CertificationLevel.REJECTED ? 'YES ✅' : 'NO ❌'}`);
  logger.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  logger.log('');

  // Critical issues
  if (criticalIssues.length > 0) {
    logger.log('  ⚠️  Critical Issues:');
    for (const issue of criticalIssues) {
      logger.log(`    - ${issue}`);
    }
    logger.log('');
  }

  // Recommendations
  if (recommendations.length > 0) {
    logger.log('  📋 Recommendations:');
    for (const rec of recommendations) {
      logger.log(`    - ${rec}`);
    }
    logger.log('');
  }

  // EQI thresholds
  logger.log('  ┌──────────────────────────────────────┐');
  logger.log('  │ EQI Thresholds                        │');
  logger.log('  ├──────────────────────────────────────┤');
  logger.log('  │ ≥ 98% → PLATINUM 🏆                  │');
  logger.log('  │ ≥ 95% → GOLD 🥇                      │');
  logger.log('  │ ≥ 90% → SILVER 🥈                    │');
  logger.log('  │ < 90% → REJECTED ❌                  │');
  logger.log('  └──────────────────────────────────────┘');
  logger.log('');
  logger.log('═══════════════════════════════════════════════════════════════');

  // Save report as JSON
  const report = {
    timestamp: new Date().toISOString(),
    eqi: Math.round(eqi * 10) / 10,
    level,
    approved: level !== CertificationLevel.REJECTED,
    domains: domains.map((d) => ({
      domain: d.domain,
      weight: d.weight,
      score: d.score,
      passed: d.passed,
      testCount: d.tests.length,
      passedTests: d.tests.filter((t) => t.passed).length,
      failedTests: d.tests.filter((t) => !t.passed).length,
      criticalFailures: d.criticalFailures,
    })),
    criticalIssues,
    recommendations,
    durationMs: totalDuration,
  };

  const reportDir = path.resolve(__dirname, '..', '..', 'download');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(reportDir, 'certification-report.json'),
    JSON.stringify(report, null, 2),
  );
  logger.log(`  Report saved to: download/certification-report.json`);

  // Exit with appropriate code
  process.exit(level === CertificationLevel.REJECTED ? 1 : 0);
}

async function runSimpleCheck(
  domainName: string,
  checks: Array<{ name: string; check: () => boolean }>,
): Promise<number> {
  let passed = 0;
  for (const check of checks) {
    if (check.check()) passed++;
  }
  return Math.round((passed / checks.length) * 100);
}

async function runDocCheck(): Promise<number> {
  const srcDir = path.resolve(__dirname, '..', '..');
  let score = 0;

  // Check JSDoc coverage in key files
  const keyFiles = [
    path.join(srcDir, 'agents', 'interfaces', 'agent.interface.ts'),
    path.join(srcDir, 'agents', 'base', 'base-agent.service.ts'),
    path.join(srcDir, 'agents', 'orchestrator', 'orchestrator.service.ts'),
  ];

  let documentedFiles = 0;
  for (const file of keyFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      const jsdocCount = (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length;
      if (jsdocCount > 3) documentedFiles++;
    }
  }
  score += Math.round((documentedFiles / keyFiles.length) * 50);

  // Check for README
  const readmePath = path.resolve(srcDir, '..', 'README.md');
  score += fs.existsSync(readmePath) ? 25 : 5;

  // Check for Swagger/OpenAPI
  const mainPath = path.join(srcDir, 'main.ts');
  if (fs.existsSync(mainPath)) {
    const mainContent = fs.readFileSync(mainPath, 'utf-8');
    score += mainContent.includes('SwaggerModule') ? 25 : 5;
  }

  return Math.min(score, 100);
}

// Run
runCertification().catch((error) => {
  logger.error(`Certification run failed: ${error.message}`, error.stack);
  process.exit(2);
});
