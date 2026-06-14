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
exports.BatchRunner = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const reference_missions_1 = require("./reference-missions");
const mission_metrics_service_1 = require("./mission-metrics.service");
const development_connector_1 = require("../connectors/development-connector");
const browser_connector_1 = require("../connectors/browser-connector");
const certification_connector_1 = require("../connectors/certification-connector");
const delivery_connector_1 = require("../connectors/delivery-connector");
const office_connector_1 = require("../connectors/office-connector");
const business_connector_1 = require("../connectors/business-connector");
const interfaces_1 = require("../interfaces");
class BatchRunner {
    constructor() {
        this.baseWorkspace = '/home/z/my-project/download/missions';
        this.connectorCallCount = 0;
        this.metrics = [];
        this.connectors = new Map();
        fs.mkdirSync(this.baseWorkspace, { recursive: true });
        const devConnector = new development_connector_1.DevelopmentConnector();
        const browserConnector = new browser_connector_1.BrowserConnector();
        const certConnector = new certification_connector_1.CertificationConnector();
        const deliveryConnector = new delivery_connector_1.DeliveryConnector();
        const officeConnector = new office_connector_1.OfficeConnector();
        const businessConnector = new business_connector_1.BusinessConnector();
        this.registerConnector(devConnector);
        this.registerConnector(browserConnector);
        this.registerConnector(certConnector);
        this.registerConnector(deliveryConnector);
        this.registerConnector(officeConnector);
        this.registerConnector(businessConnector);
    }
    registerConnector(connector) {
        const capabilityIds = this.getCapabilityIdsForPack(connector.supportedPack);
        for (const capId of capabilityIds) {
            this.connectors.set(capId, connector);
        }
    }
    getCapabilityIdsForPack(pack) {
        switch (pack) {
            case 'DEVELOPMENT':
                return Object.values(interfaces_1.DevCapability);
            case 'BROWSER':
                return [
                    'browser.login',
                    'browser.navigation',
                    'browser.search',
                    'browser.form',
                    'browser.upload',
                    'browser.download',
                    'browser.screenshot',
                    'browser.vision',
                    'browser.session',
                    'browser.cookie',
                    'browser.popup',
                    'browser.ocr',
                ];
            case 'CERTIFICATION':
                return Object.values(interfaces_1.CertCapability);
            case 'DELIVERY':
                return Object.values(interfaces_1.DeliveryCapability);
            case 'OFFICE':
                return [
                    'office.pdf',
                    'office.docx',
                    'office.excel',
                    'office.powerpoint',
                    'office.ocr',
                    'office.signature',
                    'office.email',
                    'office.calendar',
                ];
            case 'BUSINESS':
                return [
                    'business.seo',
                    'business.marketing',
                    'business.copywriting',
                    'business.branding',
                    'business.crm',
                    'business.analytics',
                    'business.finance',
                    'business.sales',
                    'business.legal',
                    'business.partnership',
                ];
            default:
                return [];
        }
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async rateLimitDelay() {
        const delayMs = this.connectorCallCount > 5 ? 3000 : 1500;
        await this.delay(delayMs);
    }
    async executeViaConnector(capabilityId, input) {
        const connector = this.connectors.get(capabilityId);
        if (!connector || !connector.supports(capabilityId)) {
            return {
                success: false,
                artifacts: [],
                output: { skipped: true },
                costUsd: 0,
                durationMs: 0,
                error: `No connector for ${capabilityId}`,
            };
        }
        this.connectorCallCount++;
        return connector.execute(capabilityId, input);
    }
    buildConnectorInput(missionId, instruction, workspaceDir, previousResults, parameters = {}) {
        return {
            missionId,
            instruction,
            workspaceDir,
            parameters,
            previousResults,
            tools: [],
        };
    }
    convertArtifacts(connectorArtifacts) {
        return connectorArtifacts.map((a) => ({
            name: a.name,
            type: a.type,
            path: a.path,
            size: a.size,
            content: a.content,
        }));
    }
    async runBatch(options) {
        const count = options.count || 5;
        const delayMs = options.delayMs || 3000;
        let missions;
        if (options.missionIds && options.missionIds.length > 0) {
            missions = reference_missions_1.ReferenceMissions.ALL.filter((m) => options.missionIds.includes(m.id));
        }
        else if (options.difficulty) {
            missions = reference_missions_1.ReferenceMissions.getByDifficulty(options.difficulty);
        }
        else if (options.pack) {
            missions = reference_missions_1.ReferenceMissions.getByPack(options.pack);
        }
        else {
            missions = reference_missions_1.ReferenceMissions.getRandom(count);
        }
        missions = missions.slice(0, count);
        console.log(`\n${'═'.repeat(80)}`);
        console.log(`  AENEWS SOFTWARE FACTORY — BATCH RUN (Connector-based)`);
        console.log(`  Missions: ${missions.length} | Delay: ${delayMs}ms`);
        console.log(`${'═'.repeat(80)}\n`);
        const startTime = Date.now();
        for (let i = 0; i < missions.length; i++) {
            const mission = missions[i];
            console.log(`\n[${i + 1}/${missions.length}] Mission #${mission.id}: "${mission.instruction.slice(0, 60)}..."`);
            console.log(`  Category: ${mission.category} | Pack: ${mission.capabilityPack} | Difficulty: ${mission.difficulty}`);
            const result = await this.executeMission(mission.instruction);
            const metric = {
                missionId: result.missionId,
                instruction: mission.instruction,
                category: mission.category,
                success: result.success,
                certified: result.certified,
                qualityScore: result.qualityScore,
                artifactCount: result.artifacts.length,
                totalSizeBytes: result.artifacts.reduce((s, a) => s + a.size, 0),
                durationMs: result.totalDurationMs,
                costUsd: result.totalCostUsd,
                retries: result.errors.length > 0 ? 1 : 0,
                errors: result.errors,
                phases: [],
                timestamp: new Date().toISOString(),
            };
            this.metrics.push(metric);
            const status = result.certified
                ? '✅ CERTIFIED'
                : result.success
                    ? '⚠️ SUCCESS (uncertified)'
                    : '❌ FAILED';
            console.log(`  → ${status} | Score: ${result.qualityScore}/100 | ${(result.totalDurationMs / 1000).toFixed(1)}s | $${result.totalCostUsd.toFixed(3)}`);
            console.log(`  → ${result.artifacts.length} artifacts | ${result.errors.length} errors`);
            const runningMsr = this.metrics.filter((m) => m.success).length / this.metrics.length;
            console.log(`  → Running MSR: ${(runningMsr * 100).toFixed(1)}% (${this.metrics.filter((m) => m.success).length}/${this.metrics.length})`);
            if (i < missions.length - 1) {
                console.log(`  ⏳ Waiting ${delayMs / 1000}s before next mission...`);
                await this.delay(delayMs);
            }
        }
        const totalBatchDuration = Date.now() - startTime;
        this.printReport(totalBatchDuration);
        this.saveMetrics();
        return this.computeAggregate();
    }
    async executeMission(instruction) {
        const missionId = `mission-${(0, uuid_1.v4)().slice(0, 8)}`;
        const startTime = Date.now();
        let totalCost = 0;
        const workspaceDir = path.join(this.baseWorkspace, missionId);
        fs.mkdirSync(workspaceDir, { recursive: true });
        fs.mkdirSync(path.join(workspaceDir, 'src'), { recursive: true });
        fs.mkdirSync(path.join(workspaceDir, 'tests'), { recursive: true });
        fs.mkdirSync(path.join(workspaceDir, 'docs'), { recursive: true });
        const artifacts = [];
        const errors = [];
        const previousResults = new Map();
        let analysisPlan;
        try {
            await this.rateLimitDelay();
            const archInput = this.buildConnectorInput(missionId, instruction, workspaceDir, previousResults);
            const archResult = await this.executeViaConnector(interfaces_1.DevCapability.ARCHITECTURE, archInput);
            totalCost += archResult.costUsd;
            previousResults.set(interfaces_1.DevCapability.ARCHITECTURE, archResult);
            if (archResult.success && archResult.output?.architecture) {
                try {
                    const jsonMatch = archResult.output.architecture.match(/\{[\s\S]*\}/);
                    analysisPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
                }
                catch {
                }
            }
            artifacts.push(...this.convertArtifacts(archResult.artifacts));
        }
        catch (err) {
            errors.push(`Analysis: ${err.message}`);
        }
        if (!analysisPlan) {
            analysisPlan = this.fallbackPlan(instruction);
        }
        const hasBackend = /api|backend|server|database|erp|crm|todo|chat|auth/i.test(instruction);
        const hasDatabase = /database|db|sql|sqlite|mongo|postgres|stock|erp|crm/i.test(instruction);
        const buildCapabilities = [interfaces_1.DevCapability.FRONTEND];
        if (hasBackend)
            buildCapabilities.push(interfaces_1.DevCapability.BACKEND);
        if (hasDatabase)
            buildCapabilities.push(interfaces_1.DevCapability.DATABASE);
        for (const capId of buildCapabilities) {
            try {
                await this.rateLimitDelay();
                const buildInput = this.buildConnectorInput(missionId, instruction, workspaceDir, previousResults, { plan: analysisPlan });
                const buildResult = await this.executeViaConnector(capId, buildInput);
                totalCost += buildResult.costUsd;
                previousResults.set(capId, buildResult);
                if (buildResult.success) {
                    artifacts.push(...this.convertArtifacts(buildResult.artifacts));
                }
                else {
                    errors.push(`Build ${capId}: ${buildResult.error || 'connector returned failure'}`);
                }
            }
            catch (err) {
                errors.push(`Build ${capId}: ${err.message}`);
            }
        }
        try {
            await this.rateLimitDelay();
            const dockerInput = this.buildConnectorInput(missionId, instruction, workspaceDir, previousResults, { plan: analysisPlan });
            const dockerResult = await this.executeViaConnector(interfaces_1.DevCapability.DOCKER, dockerInput);
            totalCost += dockerResult.costUsd;
            previousResults.set(interfaces_1.DevCapability.DOCKER, dockerResult);
            if (dockerResult.success) {
                artifacts.push(...this.convertArtifacts(dockerResult.artifacts));
            }
        }
        catch (err) {
            errors.push(`Docker: ${err.message}`);
        }
        let testPassed = true;
        let testResults = [];
        try {
            await this.rateLimitDelay();
            const testInput = this.buildConnectorInput(missionId, instruction, workspaceDir, previousResults);
            const testResult = await this.executeViaConnector(interfaces_1.DevCapability.TEST, testInput);
            totalCost += testResult.costUsd;
            previousResults.set(interfaces_1.DevCapability.TEST, testResult);
            if (testResult.success) {
                artifacts.push(...this.convertArtifacts(testResult.artifacts));
            }
        }
        catch (err) {
            errors.push(`Test generation: ${err.message}`);
        }
        try {
            await this.rateLimitDelay();
            const qaInput = this.buildConnectorInput(missionId, instruction, workspaceDir, previousResults);
            const qaResult = await this.executeViaConnector(interfaces_1.DevCapability.QA, qaInput);
            totalCost += qaResult.costUsd;
            previousResults.set(interfaces_1.DevCapability.QA, qaResult);
            if (qaResult.success) {
                artifacts.push(...this.convertArtifacts(qaResult.artifacts));
            }
            else {
                testPassed = false;
                if (qaResult.output?.results) {
                    testResults = qaResult.output.results;
                }
            }
        }
        catch (err) {
            errors.push(`QA: ${err.message}`);
            testPassed = false;
        }
        let auditPassed = true;
        const auditFindings = [];
        if (artifacts.filter((a) => a.type === 'source').length === 0) {
            auditFindings.push('No source files');
            auditPassed = false;
        }
        for (const a of artifacts) {
            if (a.size < 10 && a.type === 'source') {
                auditFindings.push(`${a.name} too small`);
            }
        }
        const certResult = this.certify(artifacts, testPassed, auditFindings);
        try {
            await this.rateLimitDelay();
            const docInput = this.buildConnectorInput(missionId, instruction, workspaceDir, previousResults);
            const docResult = await this.executeViaConnector(interfaces_1.DevCapability.DOCUMENTATION, docInput);
            totalCost += docResult.costUsd;
            previousResults.set(interfaces_1.DevCapability.DOCUMENTATION, docResult);
            if (docResult.success) {
                const existingNames = new Set(artifacts.map((a) => a.name));
                for (const art of this.convertArtifacts(docResult.artifacts)) {
                    if (!existingNames.has(art.name)) {
                        artifacts.push(art);
                    }
                }
            }
        }
        catch (err) {
            errors.push(`Documentation: ${err.message}`);
        }
        try {
            const zipInput = this.buildConnectorInput(missionId, instruction, workspaceDir, previousResults, { outputPath: path.join(this.baseWorkspace, `${missionId}.zip`) });
            const zipResult = await this.executeViaConnector(interfaces_1.DeliveryCapability.ZIP, zipInput);
            totalCost += zipResult.costUsd;
            previousResults.set(interfaces_1.DeliveryCapability.ZIP, zipResult);
            if (zipResult.success) {
                artifacts.push(...this.convertArtifacts(zipResult.artifacts));
            }
        }
        catch (err) {
            errors.push(`ZIP: ${err.message}`);
        }
        let finalScore = certResult.qualityScore;
        let finalCertified = certResult.certified;
        if (finalScore < 60) {
            console.log(`  🔄 Quality gate: score ${finalScore} < 60, attempting debug + re-test...`);
            try {
                await this.rateLimitDelay();
                const debugInput = this.buildConnectorInput(missionId, instruction, workspaceDir, previousResults, {
                    error: errors.join('; ') || 'Low quality score',
                    lastError: errors.join('; ') || 'Low quality score',
                });
                const debugResult = await this.executeViaConnector(interfaces_1.DevCapability.DEBUG, debugInput);
                totalCost += debugResult.costUsd;
                previousResults.set(interfaces_1.DevCapability.DEBUG, debugResult);
                if (debugResult.success) {
                    artifacts.push(...this.convertArtifacts(debugResult.artifacts));
                }
            }
            catch (err) {
                errors.push(`Debug: ${err.message}`);
            }
            try {
                await this.rateLimitDelay();
                const reTestInput = this.buildConnectorInput(missionId, instruction, workspaceDir, previousResults);
                const reTestResult = await this.executeViaConnector(interfaces_1.DevCapability.QA, reTestInput);
                totalCost += reTestResult.costUsd;
                if (reTestResult.success) {
                    testPassed = true;
                    if (reTestResult.artifacts?.length) {
                        artifacts.push(...this.convertArtifacts(reTestResult.artifacts));
                    }
                }
            }
            catch (err) {
                errors.push(`Re-test: ${err.message}`);
            }
            const reCert = this.certify(artifacts, testPassed, auditFindings);
            finalScore = reCert.qualityScore;
            finalCertified = reCert.certified;
        }
        const totalDuration = Date.now() - startTime;
        const success = errors.length === 0 || artifacts.filter((a) => a.type === 'source').length > 0;
        return {
            missionId,
            success,
            artifacts,
            workspaceDir,
            qualityScore: finalScore,
            certified: finalCertified,
            totalDurationMs: totalDuration,
            totalCostUsd: totalCost,
            errors,
        };
    }
    certify(artifacts, testPassed, auditFindings) {
        const reasons = [];
        let score = 100;
        if (!testPassed) {
            score -= 30;
            reasons.push('Tests failed');
        }
        if (auditFindings.some((f) => f.includes('No source'))) {
            score -= 40;
            reasons.push('No source code');
        }
        if (auditFindings.some((f) => f.includes('too small'))) {
            score -= 10;
            reasons.push('Small files');
        }
        if (!artifacts.some((a) => a.type === 'test')) {
            score -= 10;
            reasons.push('No tests');
        }
        if (!artifacts.some((a) => a.type === 'document')) {
            score -= 5;
            reasons.push('No documentation');
        }
        if (!artifacts.some((a) => a.type === 'config')) {
            score -= 5;
            reasons.push('No config files');
        }
        return { certified: score >= 60, qualityScore: Math.max(0, score), reasons };
    }
    fallbackPlan(instruction) {
        const lower = instruction.toLowerCase();
        const isWebApp = /app|application|web|site|page|saas|erp|todo|list/i.test(lower);
        const hasBackend = /api|backend|server|database|erp|crm|todo/i.test(lower);
        return {
            objective: instruction,
            techStack: isWebApp ? ['HTML', 'CSS', 'JavaScript', 'Node.js'] : ['JavaScript'],
            phases: [
                {
                    name: 'Architecture',
                    tasks: ['Define structure'],
                    capabilities: ['dev.architecture'],
                    estimatedMinutes: 10,
                },
                {
                    name: 'Frontend',
                    tasks: ['Build UI'],
                    capabilities: ['dev.frontend'],
                    estimatedMinutes: 30,
                },
                ...(hasBackend
                    ? [
                        {
                            name: 'Backend',
                            tasks: ['Build API'],
                            capabilities: ['dev.backend'],
                            estimatedMinutes: 45,
                        },
                    ]
                    : []),
                {
                    name: 'Testing',
                    tasks: ['Write tests'],
                    capabilities: ['dev.test'],
                    estimatedMinutes: 15,
                },
            ],
            requiredCapabilities: hasBackend
                ? ['dev.architecture', 'dev.frontend', 'dev.backend', 'dev.test']
                : ['dev.architecture', 'dev.frontend', 'dev.test'],
            deliverables: ['index.html', 'style.css', 'app.js', 'README.md', 'Dockerfile'],
            complexity: hasBackend ? 'medium' : 'low',
        };
    }
    printReport(totalBatchDurationMs) {
        const total = this.metrics.length;
        const successes = this.metrics.filter((m) => m.success).length;
        const certified = this.metrics.filter((m) => m.certified).length;
        const msr = total > 0 ? successes / total : 0;
        const certRate = total > 0 ? certified / total : 0;
        const avgDuration = total > 0 ? Math.round(this.metrics.reduce((s, m) => s + m.durationMs, 0) / total) : 0;
        const avgCost = total > 0 ? this.metrics.reduce((s, m) => s + m.costUsd, 0) / total : 0;
        const avgQuality = total > 0 ? this.metrics.reduce((s, m) => s + m.qualityScore, 0) / total : 0;
        const currentTarget = mission_metrics_service_1.MSR_TARGETS.find((t) => msr < t.target) || mission_metrics_service_1.MSR_TARGETS[mission_metrics_service_1.MSR_TARGETS.length - 1];
        console.log(`\n${'═'.repeat(80)}`);
        console.log(`  AENEWS SOFTWARE FACTORY — BATCH RUN RESULTS`);
        console.log(`${'═'.repeat(80)}`);
        console.log(`  Total Missions:          ${total}`);
        console.log(`  Successful:              ${successes}`);
        console.log(`  Certified:               ${certified}`);
        console.log(`${'─'.repeat(80)}`);
        console.log(`  MSR (Mission Success):   ${(msr * 100).toFixed(1)}%  ← KPI #1`);
        console.log(`  Certification Rate:      ${(certRate * 100).toFixed(1)}%`);
        console.log(`  Current Target:          ${(currentTarget.target * 100).toFixed(0)}% (${currentTarget.label})`);
        console.log(`  Gap to Target:           ${((currentTarget.target - msr) * 100).toFixed(1)}%`);
        console.log(`${'─'.repeat(80)}`);
        console.log(`  Avg Duration:            ${(avgDuration / 1000).toFixed(1)}s`);
        console.log(`  Avg Cost:                $${avgCost.toFixed(3)}`);
        console.log(`  Avg Quality Score:       ${avgQuality.toFixed(1)}/100`);
        console.log(`  Total Batch Duration:    ${(totalBatchDurationMs / 1000 / 60).toFixed(1)}min`);
        console.log(`${'─'.repeat(80)}`);
        console.log(`  Mission Details:`);
        for (const m of this.metrics) {
            const status = m.certified ? '✅' : m.success ? '⚠️' : '❌';
            console.log(`    ${status} #${m.missionId} — "${m.instruction.slice(0, 45)}..." — Score: ${m.qualityScore} — ${(m.durationMs / 1000).toFixed(1)}s — ${m.artifactCount} files`);
        }
        const categories = {};
        for (const m of this.metrics) {
            if (!categories[m.category])
                categories[m.category] = { total: 0, success: 0 };
            categories[m.category].total++;
            if (m.success)
                categories[m.category].success++;
        }
        console.log(`${'─'.repeat(80)}`);
        console.log(`  Category Breakdown:`);
        for (const [cat, data] of Object.entries(categories)) {
            console.log(`    ${cat}: ${data.success}/${data.total} (${((data.success / data.total) * 100).toFixed(0)}%)`);
        }
        console.log(`${'═'.repeat(80)}\n`);
        if (msr >= 0.99) {
            console.log(`  🏆 ELITE LEVEL — MSR ${(msr * 100).toFixed(1)}% ≥ 99%`);
        }
        else if (msr >= 0.95) {
            console.log(`  🥇 ENTERPRISE LEVEL — MSR ${(msr * 100).toFixed(1)}% ≥ 95%`);
        }
        else if (msr >= 0.85) {
            console.log(`  🥈 BETA LEVEL — MSR ${(msr * 100).toFixed(1)}% ≥ 85%`);
        }
        else if (msr >= 0.7) {
            console.log(`  🥉 MVP LEVEL — MSR ${(msr * 100).toFixed(1)}% ≥ 70%`);
        }
        else {
            console.log(`  ⚠️  BELOW MVP — MSR ${(msr * 100).toFixed(1)}% < 70% — Need to improve!`);
        }
        console.log();
    }
    saveMetrics() {
        const metricsDir = path.join(this.baseWorkspace, 'metrics');
        fs.mkdirSync(metricsDir, { recursive: true });
        const metricsFile = path.join(metricsDir, `batch-${Date.now()}.json`);
        fs.writeFileSync(metricsFile, JSON.stringify(this.metrics, null, 2), 'utf-8');
        console.log(`  Metrics saved to: ${metricsFile}`);
    }
    computeAggregate() {
        const total = this.metrics.length;
        const successes = this.metrics.filter((m) => m.success).length;
        const certified = this.metrics.filter((m) => m.certified).length;
        return {
            totalMissions: total,
            successes,
            certified,
            msr: total > 0 ? successes / total : 0,
            certificationRate: total > 0 ? certified / total : 0,
            avgDurationMs: total > 0 ? Math.round(this.metrics.reduce((s, m) => s + m.durationMs, 0) / total) : 0,
            avgCostUsd: total > 0 ? this.metrics.reduce((s, m) => s + m.costUsd, 0) / total : 0,
            avgQualityScore: total > 0 ? this.metrics.reduce((s, m) => s + m.qualityScore, 0) / total : 0,
            totalRetries: this.metrics.reduce((s, m) => s + m.retries, 0),
            p50DurationMs: 0,
            p95DurationMs: 0,
            p99DurationMs: 0,
            byCategory: {},
            recentTrend: { last10Msr: 0, last25Msr: 0, last50Msr: 0, improving: false },
            targetMsr: 0.7,
            msrGap: 0.7 - (total > 0 ? successes / total : 0),
        };
    }
}
exports.BatchRunner = BatchRunner;
async function main() {
    const args = process.argv.slice(2);
    let count = 5;
    const missionIds = [];
    let difficulty;
    let pack;
    let delayMs = 3000;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--count' && args[i + 1]) {
            count = parseInt(args[i + 1]);
            i++;
        }
        else if (args[i] === '--mission-id' && args[i + 1]) {
            missionIds.push(parseInt(args[i + 1]));
            i++;
        }
        else if (args[i] === '--easy') {
            difficulty = 'easy';
        }
        else if (args[i] === '--medium') {
            difficulty = 'medium';
        }
        else if (args[i] === '--hard') {
            difficulty = 'hard';
        }
        else if (args[i] === '--pack' && args[i + 1]) {
            pack = args[i + 1];
            i++;
        }
        else if (args[i] === '--delay' && args[i + 1]) {
            delayMs = parseInt(args[i + 1]);
            i++;
        }
    }
    const runner = new BatchRunner();
    try {
        await runner.runBatch({
            count,
            missionIds: missionIds.length > 0 ? missionIds : undefined,
            difficulty,
            pack,
            delayMs,
        });
    }
    catch (err) {
        console.error(`Batch run failed: ${err.message}`);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
//# sourceMappingURL=batch-runner.js.map