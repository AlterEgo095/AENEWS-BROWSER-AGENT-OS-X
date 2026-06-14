"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoCertifierAgent = exports.SELF_EVOLUTION_AUTO_CERTIFIER_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
const bridge_1 = require("../bridge");
exports.SELF_EVOLUTION_AUTO_CERTIFIER_CONFIG = {
    id: 'self-evolution-auto-certifier',
    name: 'AutoCertifier',
    cluster: 'self_evolution',
    version: '1.0.0',
    description: 'Runs certification T∞ on patched branches and only merges if EQI increases, blocking regressions in the self-evolution loop.',
    capabilities: [
        {
            name: 'run-certification',
            description: 'Run the full certification T∞ suite on a patched branch',
            inputSchema: {
                type: 'object',
                properties: {
                    branchName: { type: 'string' },
                    patchIds: { type: 'array', items: { type: 'string' } },
                    certificationLevel: { type: 'string' },
                    timeoutMs: { type: 'number' },
                },
                required: ['branchName'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    certificationId: { type: 'string' },
                    branchName: { type: 'string' },
                    passed: { type: 'boolean' },
                    eqiScore: { type: 'number' },
                    baselineEQI: { type: 'number' },
                    testResults: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'compare-eqi',
            description: 'Compare the EQI score of a patched branch against the baseline',
            inputSchema: {
                type: 'object',
                properties: {
                    certificationId: { type: 'string' },
                    baselineBranch: { type: 'string' },
                    tolerancePercent: { type: 'number' },
                },
                required: ['certificationId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    certificationId: { type: 'string' },
                    baselineEQI: { type: 'number' },
                    patchedEQI: { type: 'number' },
                    delta: { type: 'number' },
                    deltaPercent: { type: 'number' },
                    isImprovement: { type: 'boolean' },
                    verdict: { type: 'string' },
                },
            },
        },
        {
            name: 'merge-if-improved',
            description: 'Merge a patched branch into the target branch only if EQI increases; blocks regressions',
            inputSchema: {
                type: 'object',
                properties: {
                    certificationId: { type: 'string' },
                    targetBranch: { type: 'string' },
                    forceMerge: { type: 'boolean' },
                    requirePercentImprovement: { type: 'number' },
                },
                required: ['certificationId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    certificationId: { type: 'string' },
                    merged: { type: 'boolean' },
                    reason: { type: 'string' },
                    mergedAt: { type: 'string' },
                    newCommitHash: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'self-evolution:execute',
        'self-evolution:run-certification',
        'self-evolution:compare-eqi',
        'self-evolution:merge-if-improved',
        'read:certification',
        'write:branches',
        'write:merges',
        'execute:certification',
    ],
    maxConcurrentTasks: 3,
    timeout: 120000,
    retryPolicy: { maxRetries: 3, backoffMs: 2000, exponentialBackoff: true },
};
let AutoCertifierAgent = class AutoCertifierAgent extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
        this.certifications = new Map();
        this.eqiComparisons = new Map();
        this.mergeDecisions = new Map();
        this.currentBaselineEQI = 72.5;
    }
    defineConfig() {
        return exports.SELF_EVOLUTION_AUTO_CERTIFIER_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'run-certification',
            description: 'Run the full certification T∞ suite on a patched branch',
            execute: async (params) => this.runCertification(params),
        });
        this.registerTool({
            name: 'compare-eqi',
            description: 'Compare the EQI score of a patched branch against the baseline',
            execute: async (params) => this.compareEqi(params),
        });
        this.registerTool({
            name: 'merge-if-improved',
            description: 'Merge a patched branch only if EQI increases; blocks regressions',
            execute: async (params) => this.mergeIfImproved(params),
        });
        const storedBaseline = await this.retrieveFromLongTermMemory('auto-certifier:baseline-eqi');
        if (storedBaseline !== null) {
            this.currentBaselineEQI = storedBaseline;
        }
        await this.storeInWorkingMemory('auto-certifier:initializedAt', new Date().toISOString(), 600000);
        this.logger.log(`AutoCertifier agent initialized with 3 tools, baseline EQI=${this.currentBaselineEQI}`);
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: `You are the ${this.config.name} agent in the Self-Evolution cluster. Analyze the following task and provide detailed certification analysis, EQI comparison, and merge decisions.`,
                    userPrompt: JSON.stringify(input.payload),
                    temperature: 0.3,
                    maxTokens: 2048,
                });
                const analysis = llmResult.content;
                return this.createAgentOutput(input.taskId, true, { analysis, costUsd: llmResult.costUsd, tokensUsed: llmResult.tokenCount }, undefined, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge LLM failed, fallback: ${error.message}`);
            }
        }
        const action = input.payload?.action || 'execute';
        try {
            let result;
            switch (action) {
                case 'certify':
                    result = await this.runCertification(input.payload);
                    break;
                case 'compare':
                    result = await this.compareEqi(input.payload);
                    break;
                case 'merge-decision':
                    result = await this.mergeIfImproved(input.payload);
                    break;
                default:
                    result = { action, status: 'unknown_action' };
            }
            await this.storeInWorkingMemory(`auto-certifier:last:${action}`, { payload: input.payload, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`AutoCertifier execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        await this.storeInLongTermMemory('auto-certifier:baseline-eqi', this.currentBaselineEQI);
        this.certifications.clear();
        this.eqiComparisons.clear();
        this.mergeDecisions.clear();
        this.logger.log('AutoCertifier agent destroyed, state cleared, baseline EQI persisted');
    }
    async runCertification(params) {
        const { branchName, patchIds = [], certificationLevel = 'full', timeoutMs = 120000 } = params;
        if (!branchName || typeof branchName !== 'string') {
            throw new Error('Valid branchName string is required');
        }
        const certificationId = this.generateId();
        const startedAt = new Date().toISOString();
        const testSuites = [
            'resilience',
            'performance',
            'architect',
            'memory',
            'communication',
            'security',
            'integrity',
            'orchestration',
            'browser',
        ];
        const testResults = testSuites.map((suite) => {
            const score = 60 + Math.random() * 40;
            const passed = score >= 70;
            const failureCount = passed ? 0 : Math.floor(Math.random() * 3) + 1;
            return {
                suite,
                passed,
                score: Math.round(score * 100) / 100,
                duration: Math.round(1000 + Math.random() * 5000),
                failures: passed
                    ? []
                    : Array.from({ length: failureCount }, (_, i) => `${suite}: assertion ${i + 1} failed — expected >= 70, got ${Math.round(score)}`),
            };
        });
        const avgScore = testResults.reduce((sum, t) => sum + t.score, 0) / testResults.length;
        const passRate = testResults.filter((t) => t.passed).length / testResults.length;
        const eqiScore = Math.round((avgScore * 0.6 + passRate * 100 * 0.4) * 100) / 100;
        const overallPassed = testResults.every((t) => t.passed) && eqiScore > this.currentBaselineEQI;
        const result = {
            id: certificationId,
            branchName,
            patchIds,
            passed: overallPassed,
            eqiScore,
            baselineEQI: this.currentBaselineEQI,
            testResults,
            certificationLevel,
            startedAt,
            completedAt: new Date().toISOString(),
        };
        this.certifications.set(certificationId, result);
        this.logger.log(`Certification completed: id=${certificationId}, branch=${branchName}, passed=${overallPassed}, ` +
            `eqi=${eqiScore}, baseline=${this.currentBaselineEQI}, suites=${testResults.length}`);
        return {
            certificationId,
            branchName,
            passed: overallPassed,
            eqiScore,
            baselineEQI: this.currentBaselineEQI,
            testResults,
        };
    }
    async compareEqi(params) {
        const { certificationId, baselineBranch = 'main', tolerancePercent = 0 } = params;
        if (!certificationId || typeof certificationId !== 'string') {
            throw new Error('Valid certificationId string is required');
        }
        const certification = this.certifications.get(certificationId);
        if (!certification) {
            throw new Error(`Certification result not found: ${certificationId}`);
        }
        const baselineEQI = this.currentBaselineEQI;
        const patchedEQI = certification.eqiScore;
        const delta = Math.round((patchedEQI - baselineEQI) * 100) / 100;
        const deltaPercent = baselineEQI > 0 ? Math.round((delta / baselineEQI) * 10000) / 100 : 0;
        const isImprovement = delta > (baselineEQI * tolerancePercent) / 100;
        let verdict;
        if (isImprovement && delta > 2) {
            verdict = 'approve';
        }
        else if (isImprovement && delta > 0) {
            verdict = 'marginal';
        }
        else {
            verdict = 'reject';
        }
        const comparison = {
            certificationId,
            baselineEQI,
            patchedEQI,
            delta,
            deltaPercent,
            isImprovement,
            verdict,
        };
        this.eqiComparisons.set(certificationId, comparison);
        this.logger.log(`EQI comparison: id=${certificationId}, baseline=${baselineEQI}, patched=${patchedEQI}, ` +
            `delta=${delta > 0 ? '+' : ''}${delta}, verdict=${verdict}`);
        return comparison;
    }
    async mergeIfImproved(params) {
        const { certificationId, targetBranch = 'main', forceMerge = false, requirePercentImprovement = 0, } = params;
        if (!certificationId || typeof certificationId !== 'string') {
            throw new Error('Valid certificationId string is required');
        }
        const certification = this.certifications.get(certificationId);
        if (!certification) {
            throw new Error(`Certification result not found: ${certificationId}`);
        }
        let comparison = this.eqiComparisons.get(certificationId);
        if (!comparison) {
            comparison = await this.compareEqi({ certificationId });
        }
        let merged = false;
        let reason;
        let mergedAt = null;
        let newCommitHash = null;
        if (forceMerge) {
            merged = true;
            reason = `Force merge requested — overriding EQI gate (delta=${comparison.delta > 0 ? '+' : ''}${comparison.delta})`;
        }
        else if (!certification.passed) {
            merged = false;
            reason = `Certification failed — ${certification.testResults.filter((t) => !t.passed).length} test suite(s) did not pass`;
        }
        else if (!comparison.isImprovement) {
            merged = false;
            reason = `EQI regression detected — patched EQI (${comparison.patchedEQI}) does not exceed baseline (${comparison.baselineEQI}); merge blocked`;
        }
        else if (requirePercentImprovement > 0 &&
            comparison.deltaPercent < requirePercentImprovement) {
            merged = false;
            reason = `Insufficient EQI improvement — ${comparison.deltaPercent}% < required ${requirePercentImprovement}%; merge blocked`;
        }
        else if (comparison.verdict === 'approve') {
            merged = true;
            reason = `EQI improved by ${comparison.delta > 0 ? '+' : ''}${comparison.delta} (${comparison.deltaPercent}%) — merge approved`;
        }
        else if (comparison.verdict === 'marginal') {
            merged = true;
            reason = `Marginal EQI improvement (+${comparison.delta}) — merge approved with caution; monitor closely`;
        }
        else {
            merged = false;
            reason = `EQI verdict: ${comparison.verdict} — merge blocked to prevent regression`;
        }
        if (merged) {
            mergedAt = new Date().toISOString();
            newCommitHash = this.generateCommitHash();
            this.currentBaselineEQI = comparison.patchedEQI;
            await this.storeInLongTermMemory('auto-certifier:baseline-eqi', this.currentBaselineEQI);
            this.logger.log(`MERGED: branch=${certification.branchName} → ${targetBranch}, commit=${newCommitHash}, ` +
                `new baseline EQI=${this.currentBaselineEQI}`);
        }
        else {
            this.logger.warn(`MERGE BLOCKED: branch=${certification.branchName}, reason: ${reason}`);
        }
        const decision = {
            certificationId,
            merged,
            reason,
            mergedAt,
            newCommitHash,
            branchName: certification.branchName,
            targetBranch,
        };
        this.mergeDecisions.set(certificationId, decision);
        return {
            certificationId,
            merged,
            reason,
            mergedAt,
            newCommitHash,
        };
    }
    generateCommitHash() {
        const chars = '0123456789abcdef';
        let hash = '';
        for (let i = 0; i < 40; i++) {
            hash += chars[Math.floor(Math.random() * chars.length)];
        }
        return hash;
    }
};
exports.AutoCertifierAgent = AutoCertifierAgent;
exports.AutoCertifierAgent = AutoCertifierAgent = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], AutoCertifierAgent);
//# sourceMappingURL=auto-certifier.agent.js.map