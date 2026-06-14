"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const eqi_calculator_service_1 = require("./eqi-calculator.service");
const architect_certification_service_1 = require("./architect/architect-certification.service");
const agent_integrity_certification_service_1 = require("./integrity/agent-integrity-certification.service");
const orchestration_certification_service_1 = require("./orchestration/orchestration-certification.service");
const browser_certification_service_1 = require("./browser/browser-certification.service");
const performance_certification_service_1 = require("./performance/performance-certification.service");
const memory_certification_service_1 = require("./memory/memory-certification.service");
const security_certification_service_1 = require("./security/security-certification.service");
const types_1 = require("./types");
const logger = new common_1.Logger('CertificationRunner');
async function runCertification() {
    const startTime = Date.now();
    logger.log('═══════════════════════════════════════════════════════════════');
    logger.log('  AENEWS Agent OS X - Phase T∞ Terminal Certification');
    logger.log('═══════════════════════════════════════════════════════════════');
    logger.log('');
    const eqiCalculator = new eqi_calculator_service_1.EqiCalculatorService();
    const domains = [];
    logger.log('▶ [1/9] Running Architecture certification...');
    const archService = new architect_certification_service_1.ArchitectCertificationService();
    const archResult = await archService.runAll();
    domains.push(archResult);
    logger.log(`  ✓ Architecture: ${archResult.score}/100 (${archResult.passed ? 'PASS' : 'FAIL'})`);
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
            check: () => fs.existsSync(path.resolve(__dirname, '..', '..', '..', 'test', 'jest-e2e.json')),
        },
    ]);
    domains.push({
        domain: types_1.CertificationDomain.TESTS,
        weight: 0.1,
        score: testScore,
        tests: [],
        passed: testScore >= 90,
        criticalFailures: testScore < 50 ? ['Test infrastructure incomplete'] : [],
    });
    logger.log(`  ✓ Tests: ${testScore}/100 (${testScore >= 90 ? 'PASS' : 'FAIL'})`);
    logger.log('▶ [3/9] Running Orchestration certification...');
    const orchService = new orchestration_certification_service_1.OrchestrationCertificationService();
    const orchResult = await orchService.runAll();
    domains.push(orchResult);
    logger.log(`  ✓ Orchestration: ${orchResult.score}/100 (${orchResult.passed ? 'PASS' : 'FAIL'})`);
    logger.log('▶ [4/9] Running Agents certification...');
    const agentService = new agent_integrity_certification_service_1.AgentIntegrityCertificationService();
    const agentResult = await agentService.runAll();
    domains.push(agentResult);
    logger.log(`  ✓ Agents: ${agentResult.score}/100 (${agentResult.passed ? 'PASS' : 'FAIL'})`);
    logger.log('▶ [5/9] Running Browser certification...');
    const browserService = new browser_certification_service_1.BrowserCertificationService();
    const browserResult = await browserService.runAll();
    domains.push(browserResult);
    logger.log(`  ✓ Browser: ${browserResult.score}/100 (${browserResult.passed ? 'PASS' : 'FAIL'})`);
    logger.log('▶ [6/9] Running Memory certification...');
    const memoryService = new memory_certification_service_1.MemoryCertificationService();
    const memoryResult = await memoryService.runAll();
    domains.push(memoryResult);
    logger.log(`  ✓ Memory: ${memoryResult.score}/100 (${memoryResult.passed ? 'PASS' : 'FAIL'})`);
    logger.log('▶ [7/9] Running Security certification...');
    const securityService = new security_certification_service_1.SecurityCertificationService();
    const securityResult = await securityService.runAll();
    domains.push(securityResult);
    logger.log(`  ✓ Security: ${securityResult.score}/100 (${securityResult.passed ? 'PASS' : 'FAIL'})`);
    logger.log('▶ [8/9] Running Performance certification...');
    const perfService = new performance_certification_service_1.PerformanceCertificationService();
    const perfResult = await perfService.runAll();
    domains.push(perfResult);
    logger.log(`  ✓ Performance: ${perfResult.score}/100 (${perfResult.passed ? 'PASS' : 'FAIL'})`);
    logger.log('▶ [9/9] Running Documentation certification...');
    const docScore = await runDocCheck();
    domains.push({
        domain: types_1.CertificationDomain.DOCUMENTATION,
        weight: 0.05,
        score: docScore,
        tests: [],
        passed: docScore >= 90,
        criticalFailures: docScore < 50 ? ['Documentation insufficient'] : [],
    });
    logger.log(`  ✓ Documentation: ${docScore}/100 (${docScore >= 90 ? 'PASS' : 'FAIL'})`);
    const eqi = eqiCalculator.calculateEqi(domains);
    const level = eqiCalculator.determineLevel(eqi);
    const recommendations = eqiCalculator.generateRecommendations(domains);
    const criticalIssues = eqiCalculator.identifyCriticalFailures(domains);
    const totalDuration = Date.now() - startTime;
    logger.log('');
    logger.log('═══════════════════════════════════════════════════════════════');
    logger.log('  CERTIFICATION REPORT');
    logger.log('═══════════════════════════════════════════════════════════════');
    logger.log('');
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
    const levelIcon = level === types_1.CertificationLevel.PLATINUM
        ? '🏆'
        : level === types_1.CertificationLevel.GOLD
            ? '🥇'
            : level === types_1.CertificationLevel.SILVER
                ? '🥈'
                : '❌';
    logger.log(`  Enterprise Quality Index (EQI): ${eqi.toFixed(1)}%`);
    logger.log(`  Certification Level: ${level} ${levelIcon}`);
    logger.log(`  Approved: ${level !== types_1.CertificationLevel.REJECTED ? 'YES ✅' : 'NO ❌'}`);
    logger.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    logger.log('');
    if (criticalIssues.length > 0) {
        logger.log('  ⚠️  Critical Issues:');
        for (const issue of criticalIssues) {
            logger.log(`    - ${issue}`);
        }
        logger.log('');
    }
    if (recommendations.length > 0) {
        logger.log('  📋 Recommendations:');
        for (const rec of recommendations) {
            logger.log(`    - ${rec}`);
        }
        logger.log('');
    }
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
    const report = {
        timestamp: new Date().toISOString(),
        eqi: Math.round(eqi * 10) / 10,
        level,
        approved: level !== types_1.CertificationLevel.REJECTED,
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
    fs.writeFileSync(path.join(reportDir, 'certification-report.json'), JSON.stringify(report, null, 2));
    logger.log(`  Report saved to: download/certification-report.json`);
    process.exit(level === types_1.CertificationLevel.REJECTED ? 1 : 0);
}
async function runSimpleCheck(domainName, checks) {
    let passed = 0;
    for (const check of checks) {
        if (check.check())
            passed++;
    }
    return Math.round((passed / checks.length) * 100);
}
async function runDocCheck() {
    const srcDir = path.resolve(__dirname, '..', '..');
    let score = 0;
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
            if (jsdocCount > 3)
                documentedFiles++;
        }
    }
    score += Math.round((documentedFiles / keyFiles.length) * 50);
    const readmePath = path.resolve(srcDir, '..', 'README.md');
    score += fs.existsSync(readmePath) ? 25 : 5;
    const mainPath = path.join(srcDir, 'main.ts');
    if (fs.existsSync(mainPath)) {
        const mainContent = fs.readFileSync(mainPath, 'utf-8');
        score += mainContent.includes('SwaggerModule') ? 25 : 5;
    }
    return Math.min(score, 100);
}
runCertification().catch((error) => {
    logger.error(`Certification run failed: ${error.message}`, error.stack);
    process.exit(2);
});
//# sourceMappingURL=run-certification.js.map