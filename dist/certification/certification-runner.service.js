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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CertificationRunnerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificationRunnerService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("./types");
const eqi_calculator_service_1 = require("./eqi-calculator.service");
const architect_certification_service_1 = require("./architect/architect-certification.service");
const agent_integrity_certification_service_1 = require("./integrity/agent-integrity-certification.service");
const orchestration_certification_service_1 = require("./orchestration/orchestration-certification.service");
const browser_certification_service_1 = require("./browser/browser-certification.service");
const performance_certification_service_1 = require("./performance/performance-certification.service");
const communication_certification_service_1 = require("./communication/communication-certification.service");
const memory_certification_service_1 = require("./memory/memory-certification.service");
const resilience_certification_service_1 = require("./resilience/resilience-certification.service");
const security_certification_service_1 = require("./security/security-certification.service");
const dependency_analyzer_service_1 = require("./architect/dependency-analyzer.service");
let CertificationRunnerService = CertificationRunnerService_1 = class CertificationRunnerService {
    constructor(eqiCalculator, architectCertification, agentIntegrityCertification, orchestrationCertification, browserCertification, performanceCertification, communicationCertification, memoryCertification, resilienceCertification, securityCertification, dependencyAnalyzer) {
        this.eqiCalculator = eqiCalculator;
        this.architectCertification = architectCertification;
        this.agentIntegrityCertification = agentIntegrityCertification;
        this.orchestrationCertification = orchestrationCertification;
        this.browserCertification = browserCertification;
        this.performanceCertification = performanceCertification;
        this.communicationCertification = communicationCertification;
        this.memoryCertification = memoryCertification;
        this.resilienceCertification = resilienceCertification;
        this.securityCertification = securityCertification;
        this.dependencyAnalyzer = dependencyAnalyzer;
        this.logger = new common_1.Logger(CertificationRunnerService_1.name);
        this.lastReport = null;
        this.isRunning = false;
    }
    async runFullCertification() {
        if (this.isRunning) {
            throw new Error('Certification run is already in progress');
        }
        this.isRunning = true;
        const overallStart = Date.now();
        this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        this.logger.log('  Starting Full Certification Run (v2 - 10 Domains)');
        this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        try {
            const domains = [];
            const previousEqi = this.lastReport?.eqi;
            this.logger.log('▶ [1/10] Running Architecture certification...');
            const archResult = await this.runArchitectureDomain();
            domains.push(archResult);
            this.logger.log(`  Architecture: score=${archResult.score}, passed=${archResult.passed}`);
            this.logger.log('▶ [2/10] Running Agents certification...');
            const agentsResult = await this.agentIntegrityCertification.runAll();
            domains.push(agentsResult);
            this.logger.log(`  Agents: score=${agentsResult.score}, passed=${agentsResult.passed}`);
            this.logger.log('▶ [3/10] Running Orchestration certification...');
            const orchResult = await this.orchestrationCertification.runAll();
            domains.push(orchResult);
            this.logger.log(`  Orchestration: score=${orchResult.score}, passed=${orchResult.passed}`);
            this.logger.log('▶ [4/10] Running Browser certification...');
            const browserResult = await this.browserCertification.runAll();
            domains.push(browserResult);
            this.logger.log(`  Browser: score=${browserResult.score}, passed=${browserResult.passed}`);
            this.logger.log('▶ [5/10] Running Memory certification...');
            const memoryResult = await this.runMemoryDomain();
            domains.push(memoryResult);
            this.logger.log(`  Memory: score=${memoryResult.score}, passed=${memoryResult.passed}`);
            this.logger.log('▶ [6/10] Running Security certification...');
            const securityResult = await this.runSecurityDomain();
            domains.push(securityResult);
            this.logger.log(`  Security: score=${securityResult.score}, passed=${securityResult.passed}`);
            this.logger.log('▶ [7/10] Running Performance certification...');
            const perfResult = await this.performanceCertification.runAll();
            domains.push(perfResult);
            this.logger.log(`  Performance: score=${perfResult.score}, passed=${perfResult.passed}`);
            this.logger.log('▶ [8/10] Running Tests certification...');
            const testResult = await this.runTestsDomain();
            domains.push(testResult);
            this.logger.log(`  Tests: score=${testResult.score}, passed=${testResult.passed}`);
            this.logger.log('▶ [9/10] Running Documentation certification...');
            const docResult = await this.runDocumentationDomain();
            domains.push(docResult);
            this.logger.log(`  Documentation: score=${docResult.score}, passed=${docResult.passed}`);
            this.logger.log('▶ [10/10] Running Observability certification...');
            const obsResult = await this.runObservabilityDomain();
            domains.push(obsResult);
            this.logger.log(`  Observability: score=${obsResult.score}, passed=${obsResult.passed}`);
            const eqi = this.eqiCalculator.calculateEqi(domains);
            const level = this.eqiCalculator.determineLevel(eqi);
            const milestone = this.eqiCalculator.determineMilestone(eqi);
            const recommendations = this.eqiCalculator.generateRecommendations(domains);
            const criticalIssues = this.eqiCalculator.identifyCriticalFailures(domains);
            const allTests = domains.flatMap((d) => d.tests);
            const summary = {
                totalTests: allTests.length,
                passed: allTests.filter((t) => t.passed).length,
                failed: allTests.filter((t) => !t.passed).length,
                skipped: 0,
            };
            const report = {
                timestamp: new Date(),
                eqi,
                level,
                milestone,
                domains,
                summary,
                criticalIssues,
                recommendations,
                approved: level !== types_1.CertificationLevel.REJECTED,
                governanceCompliant: level !== types_1.CertificationLevel.REJECTED,
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
            this.logger.log(`  Governance: ${report.governanceCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
            if (previousEqi !== undefined) {
                this.logger.log(`  EQI Delta: ${report.eqiDelta >= 0 ? '+' : ''}${report.eqiDelta}`);
            }
            this.logger.log(`  Duration: ${totalDuration}ms`);
            this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return report;
        }
        catch (error) {
            this.logger.error(`Certification run failed: ${error.message}`, error.stack);
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    async runDomainCertification(domain) {
        switch (domain) {
            case types_1.CertificationDomain.ARCHITECTURE:
                return this.runArchitectureDomain();
            case types_1.CertificationDomain.ORCHESTRATION:
                return this.orchestrationCertification.runAll();
            case types_1.CertificationDomain.AGENTS:
                return this.agentIntegrityCertification.runAll();
            case types_1.CertificationDomain.BROWSER:
                return this.browserCertification.runAll();
            case types_1.CertificationDomain.PERFORMANCE:
                return this.performanceCertification.runAll();
            case types_1.CertificationDomain.MEMORY:
                return this.runMemoryDomain();
            case types_1.CertificationDomain.SECURITY:
                return this.runSecurityDomain();
            case types_1.CertificationDomain.TESTS:
                return this.runTestsDomain();
            case types_1.CertificationDomain.DOCUMENTATION:
                return this.runDocumentationDomain();
            case types_1.CertificationDomain.OBSERVABILITY:
                return this.runObservabilityDomain();
            default:
                throw new Error(`Unknown certification domain: ${domain}`);
        }
    }
    getLastReport() {
        return this.lastReport;
    }
    getStatus() {
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
    async runArchitectureDomain() {
        const startTime = Date.now();
        const tests = [];
        const criticalFailures = [];
        const archResult = await this.architectCertification.runAll();
        tests.push(...archResult.tests);
        try {
            const analysis = await this.dependencyAnalyzer.analyze();
            tests.push({
                name: 'Circular dependency detection',
                passed: analysis.cycles.length === 0,
                score: analysis.cycles.length === 0 ? 100 : Math.max(0, 100 - analysis.cycles.length * 20),
                durationMs: Date.now() - startTime,
                details: { cycleCount: analysis.cycles.length, cycles: analysis.cycles.map((c) => c.description) },
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
                score: analysis.crossClusterImports.length === 0 ? 100 : Math.max(0, 100 - analysis.crossClusterImports.length * 15),
                durationMs: Date.now() - startTime,
                details: { crossClusterImports: analysis.crossClusterImports.length },
            });
            if (analysis.cycles.some((c) => c.severity === 'critical')) {
                criticalFailures.push(`Circular dependencies detected: ${analysis.cycles.filter((c) => c.severity === 'critical').length} critical cycles`);
            }
        }
        catch (error) {
            tests.push({
                name: 'Dependency analysis',
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            });
        }
        const allTests = [...archResult.tests, ...tests.filter((t) => !archResult.tests.some((at) => at.name === t.name))];
        const totalScore = allTests.reduce((sum, t) => sum + t.score, 0);
        const score = allTests.length > 0 ? Math.round(totalScore / allTests.length) : 0;
        const allCriticals = [...archResult.criticalFailures, ...criticalFailures];
        const passed = score >= 90 && allCriticals.length === 0;
        return {
            domain: types_1.CertificationDomain.ARCHITECTURE,
            weight: this.eqiCalculator.getWeight(types_1.CertificationDomain.ARCHITECTURE),
            score,
            tests: allTests,
            passed,
            criticalFailures: allCriticals,
        };
    }
    async runMemoryDomain() {
        const baseResult = await this.memoryCertification.runAll();
        const tests = [...baseResult.tests];
        const criticalFailures = [...baseResult.criticalFailures];
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const gatewayPath = path.resolve(__dirname, '..', 'gateway', 'memory', 'memory-gateway.service.ts');
        tests.push({
            name: 'Unified Memory Gateway existence',
            passed: fs.existsSync(gatewayPath),
            score: fs.existsSync(gatewayPath) ? 100 : 0,
            durationMs: 0,
            details: { path: gatewayPath },
        });
        if (fs.existsSync(gatewayPath)) {
            const content = fs.readFileSync(gatewayPath, 'utf-8');
            const requiredMethods = ['store(', 'retrieve(', 'search(', 'summarize(', 'promote(', 'archive(', 'crossTierRetrieve('];
            const foundMethods = requiredMethods.filter((m) => content.includes(m));
            tests.push({
                name: 'Memory Gateway unified API',
                passed: foundMethods.length === requiredMethods.length,
                score: Math.round((foundMethods.length / requiredMethods.length) * 100),
                durationMs: 0,
                details: { foundMethods, missingMethods: requiredMethods.filter((m) => !foundMethods.includes(m)) },
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
            domain: types_1.CertificationDomain.MEMORY,
            weight: this.eqiCalculator.getWeight(types_1.CertificationDomain.MEMORY),
            score,
            tests,
            passed,
            criticalFailures,
        };
    }
    async runSecurityDomain() {
        const baseResult = await this.securityCertification.runAll();
        const tests = [...baseResult.tests];
        const criticalFailures = [...baseResult.criticalFailures];
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const gatewayPath = path.resolve(__dirname, '..', 'gateway', 'security', 'security-gateway.service.ts');
        tests.push({
            name: 'Security Gateway existence',
            passed: fs.existsSync(gatewayPath),
            score: fs.existsSync(gatewayPath) ? 100 : 0,
            durationMs: 0,
        });
        if (fs.existsSync(gatewayPath)) {
            const content = fs.readFileSync(gatewayPath, 'utf-8');
            const hasInjectionDetection = content.includes('PROMPT_INJECTION') && content.includes('COMMAND_INJECTION') && content.includes('SQL_INJECTION');
            tests.push({
                name: 'Injection prevention patterns',
                passed: hasInjectionDetection,
                score: hasInjectionDetection ? 100 : 30,
                durationMs: 0,
            });
            const hasPolicyEngine = content.includes('evaluatePolicies') && content.includes('SecurityPolicy');
            tests.push({
                name: 'Policy engine',
                passed: hasPolicyEngine,
                score: hasPolicyEngine ? 100 : 0,
                durationMs: 0,
            });
            const hasAudit = content.includes('auditLog') && content.includes('AuditLogEntry');
            tests.push({
                name: 'Audit logging',
                passed: hasAudit,
                score: hasAudit ? 100 : 0,
                durationMs: 0,
            });
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
            domain: types_1.CertificationDomain.SECURITY,
            weight: this.eqiCalculator.getWeight(types_1.CertificationDomain.SECURITY),
            score,
            tests,
            passed,
            criticalFailures,
        };
    }
    async runTestsDomain() {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const tests = [];
        const criticalFailures = [];
        const testDir = path.resolve(__dirname, '..', '..', 'test');
        const srcDir = path.resolve(__dirname, '..', '..');
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
        const jestConfigPath = path.resolve(srcDir, '..', 'jest.config.js');
        const hasJestConfig = fs.existsSync(jestConfigPath);
        tests.push({
            name: 'Jest configuration',
            passed: hasJestConfig,
            score: hasJestConfig ? 100 : 0,
            durationMs: 0,
        });
        const clusters = ['browser', 'computer', 'coding', 'office', 'marketing', 'business', 'infrastructure', 'security', 'meta-intelligence', 'certification', 'self-evolution'];
        const clustersWithTests = [];
        for (const c of clusters) {
            const clusterDir = path.join(srcDir, 'agents', c);
            if (!fs.existsSync(clusterDir))
                continue;
            const files = await this.findFilesAsync(clusterDir, '.spec.ts');
            if (files.length > 0)
                clustersWithTests.push(c);
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
            domain: types_1.CertificationDomain.TESTS,
            weight: this.eqiCalculator.getWeight(types_1.CertificationDomain.TESTS),
            score,
            tests,
            passed,
            criticalFailures,
        };
    }
    async runDocumentationDomain() {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const tests = [];
        const criticalFailures = [];
        const docGenPath = path.resolve(__dirname, '..', 'gateway', 'documentation', 'documentation-generator.service.ts');
        tests.push({
            name: 'Documentation generator existence',
            passed: fs.existsSync(docGenPath),
            score: fs.existsSync(docGenPath) ? 100 : 0,
            durationMs: 0,
        });
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
            }
            catch { }
        }
        const jsdocCoverage = totalFiles > 0 ? Math.round((filesWithJSDoc / totalFiles) * 100) : 0;
        tests.push({
            name: 'JSDoc comment coverage',
            passed: jsdocCoverage >= 70,
            score: jsdocCoverage,
            durationMs: 0,
            details: { filesWithJSDoc, totalFiles },
        });
        const readmePath = path.resolve(srcDir, '..', 'README.md');
        tests.push({
            name: 'README presence',
            passed: fs.existsSync(readmePath),
            score: fs.existsSync(readmePath) ? 100 : 0,
            durationMs: 0,
        });
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
            domain: types_1.CertificationDomain.DOCUMENTATION,
            weight: this.eqiCalculator.getWeight(types_1.CertificationDomain.DOCUMENTATION),
            score,
            tests,
            passed,
            criticalFailures,
        };
    }
    async runObservabilityDomain() {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const tests = [];
        const criticalFailures = [];
        const srcDir = path.resolve(__dirname, '..', '..');
        const healthModule = path.join(srcDir, 'agents', 'health', 'health.module.ts');
        const hasHealthModule = fs.existsSync(healthModule);
        tests.push({
            name: 'Health monitoring module',
            passed: hasHealthModule,
            score: hasHealthModule ? 100 : 0,
            durationMs: 0,
        });
        const metricsService = path.join(srcDir, 'agents', 'health', 'agent-metrics.service.ts');
        const hasMetrics = fs.existsSync(metricsService);
        tests.push({
            name: 'Metrics collection service',
            passed: hasMetrics,
            score: hasMetrics ? 100 : 0,
            durationMs: 0,
        });
        const eventBus = path.join(srcDir, 'agents', 'events', 'event-bus.service.ts');
        const hasEventBus = fs.existsSync(eventBus);
        tests.push({
            name: 'Event bus for tracing',
            passed: hasEventBus,
            score: hasEventBus ? 100 : 0,
            durationMs: 0,
        });
        const baseAgent = path.join(srcDir, 'agents', 'base', 'base-agent.service.ts');
        if (fs.existsSync(baseAgent)) {
            const content = fs.readFileSync(baseAgent, 'utf-8');
            const hasCircuitBreaker = content.includes('circuitBreaker');
            const hasHealthCheck = content.includes('healthCheck') || content.includes('performHealthCheck');
            const hasMetricsCollection = content.includes('collectMetrics') || content.includes('emitMetrics');
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
        const packageJsonPath = path.join(srcDir, '..', 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const hasOtel = pkg.dependencies?.['@opentelemetry/api'] || pkg.dependencies?.['@opentelemetry/sdk-node'];
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
            domain: types_1.CertificationDomain.OBSERVABILITY,
            weight: this.eqiCalculator.getWeight(types_1.CertificationDomain.OBSERVABILITY),
            score,
            tests,
            passed,
            criticalFailures,
        };
    }
    async findFilesAsync(dir, extension) {
        const fsMod = await Promise.resolve().then(() => __importStar(require('fs')));
        const pathMod = await Promise.resolve().then(() => __importStar(require('path')));
        const files = [];
        const excludeDirs = ['node_modules', 'dist', '.git', 'coverage', 'backend', 'frontend'];
        try {
            const entries = fsMod.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (excludeDirs.includes(entry.name))
                    continue;
                const fullPath = pathMod.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const subFiles = await this.findFilesAsync(fullPath, extension);
                    files.push(...subFiles);
                }
                else if (entry.name.endsWith(extension)) {
                    files.push(fullPath);
                }
            }
        }
        catch { }
        return files;
    }
};
exports.CertificationRunnerService = CertificationRunnerService;
exports.CertificationRunnerService = CertificationRunnerService = CertificationRunnerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [eqi_calculator_service_1.EqiCalculatorService,
        architect_certification_service_1.ArchitectCertificationService,
        agent_integrity_certification_service_1.AgentIntegrityCertificationService,
        orchestration_certification_service_1.OrchestrationCertificationService,
        browser_certification_service_1.BrowserCertificationService,
        performance_certification_service_1.PerformanceCertificationService,
        communication_certification_service_1.CommunicationCertificationService,
        memory_certification_service_1.MemoryCertificationService,
        resilience_certification_service_1.ResilienceCertificationService,
        security_certification_service_1.SecurityCertificationService,
        dependency_analyzer_service_1.DependencyAnalyzerService])
], CertificationRunnerService);
//# sourceMappingURL=certification-runner.service.js.map