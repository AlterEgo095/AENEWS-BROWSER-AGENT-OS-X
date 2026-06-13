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
var AgentIntegrityCertificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentIntegrityCertificationService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(SOURCE_ROOT, 'agents');
let AgentIntegrityCertificationService = AgentIntegrityCertificationService_1 = class AgentIntegrityCertificationService {
    constructor() {
        this.logger = new common_1.Logger(AgentIntegrityCertificationService_1.name);
    }
    async runAll() {
        const startTime = Date.now();
        this.logger.log('Starting Agent Integrity certification...');
        const tests = [];
        const criticalFailures = [];
        const agentFiles = await this.discoverAgentFiles();
        this.logger.log(`Discovered ${agentFiles.length} agent files`);
        if (agentFiles.length === 0) {
            return {
                domain: types_1.CertificationDomain.AGENTS,
                weight: 0.15,
                score: 0,
                tests: [
                    {
                        name: 'Agent Discovery',
                        passed: false,
                        score: 0,
                        durationMs: Date.now() - startTime,
                        error: 'No agent files discovered in the project',
                    },
                ],
                passed: false,
                criticalFailures: ['No agent files found'],
            };
        }
        const testMethods = [
            { name: 'Initialization', fn: (a) => this.testInitialization(a) },
            { name: 'Shutdown', fn: (a) => this.testShutdown(a) },
            { name: 'Timeout Handling', fn: (a) => this.testTimeoutHandling(a) },
            { name: 'Retry Logic', fn: (a) => this.testRetryLogic(a) },
            { name: 'Logging', fn: (a) => this.testLogging(a) },
            { name: 'Permissions', fn: (a) => this.testPermissions(a) },
            { name: 'Memory Integration', fn: (a) => this.testMemoryIntegration(a) },
            { name: 'Tools Registered', fn: (a) => this.testToolsRegistered(a) },
            { name: 'Exception Handling', fn: (a) => this.testExceptionHandling(a) },
            { name: 'Concurrent Execution', fn: (a) => this.testConcurrentExecution(a) },
        ];
        for (const testDef of testMethods) {
            try {
                const result = await testDef.fn(agentFiles);
                tests.push(result);
                if (!result.passed && result.score < 50) {
                    criticalFailures.push(`${testDef.name}: Score ${result.score}/100`);
                }
            }
            catch (error) {
                const errMsg = error.message;
                this.logger.error(`Test "${testDef.name}" execution failed: ${errMsg}`);
                tests.push({
                    name: testDef.name,
                    passed: false,
                    score: 0,
                    durationMs: 0,
                    error: errMsg,
                });
                criticalFailures.push(`Test "${testDef.name}" execution error: ${errMsg}`);
            }
        }
        const testWeights = [0.12, 0.08, 0.1, 0.1, 0.08, 0.1, 0.1, 0.12, 0.12, 0.08];
        let weightedSum = 0;
        for (let i = 0; i < tests.length; i++) {
            const weight = testWeights[i] || 0.1;
            weightedSum += tests[i].score * weight;
        }
        const score = Math.round(weightedSum);
        const passed = score >= 90 && criticalFailures.length === 0;
        const durationMs = Date.now() - startTime;
        this.logger.log(`Agent Integrity certification complete: score=${score}, passed=${passed}, ` +
            `agentsTested=${agentFiles.length}, duration=${durationMs}ms`);
        return {
            domain: types_1.CertificationDomain.AGENTS,
            weight: 0.15,
            score,
            tests,
            passed,
            criticalFailures,
        };
    }
    async testInitialization(agents) {
        const startTime = Date.now();
        const name = 'Initialization';
        this.logger.log(`Running test: ${name}`);
        try {
            const details = [];
            let totalScore = 0;
            for (const agent of agents) {
                const { content, className, relativePath } = agent;
                let agentScore = 0;
                const issues = [];
                if (content.includes('extends BaseAgentService')) {
                    agentScore += 25;
                }
                else {
                    issues.push('Does not extend BaseAgentService');
                }
                if (content.includes('@Injectable')) {
                    agentScore += 15;
                }
                else {
                    issues.push('Missing @Injectable decorator');
                }
                if (/defineConfig\s*\(\s*\)\s*:/.test(content) || content.includes('defineConfig():')) {
                    agentScore += 20;
                }
                else {
                    issues.push('Missing defineConfig() implementation');
                }
                if (/onInitialize\s*\(\s*\)\s*:/.test(content) || content.includes('onInitialize():')) {
                    agentScore += 20;
                }
                else {
                    issues.push('Missing onInitialize() implementation');
                }
                const configFields = ['id:', 'name:', 'cluster:', 'version:'];
                const foundFields = configFields.filter((f) => content.includes(f));
                agentScore += Math.round((foundFields.length / configFields.length) * 20);
                if (foundFields.length < configFields.length) {
                    issues.push(`Config missing fields: ${configFields.filter((f) => !foundFields.includes(f)).join(', ')}`);
                }
                totalScore += agentScore;
                details.push({
                    agentId: this.extractAgentId(content),
                    agentClass: className,
                    cluster: agent.cluster,
                    testScores: { initialization: agentScore },
                    healthScore: agentScore,
                    issues,
                });
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            return {
                name,
                passed: avgScore >= 90,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    averageScore: avgScore,
                    failingAgents: details.filter((d) => d.healthScore < 70).map((d) => d.agentClass),
                    sampleDetails: details.slice(0, 5),
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testShutdown(agents) {
        const startTime = Date.now();
        const name = 'Shutdown';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            for (const agent of agents) {
                const { content } = agent;
                let agentScore = 0;
                if (/onDestroy\s*\(\s*\)\s*:/.test(content) || content.includes('onDestroy():')) {
                    agentScore += 40;
                    const onDestroyMatch = content.match(/onDestroy\s*\(\s*\)\s*:\s*Promise<void>\s*\{([\s\S]*?)(?=\n\s*protected\s|\n\s*private\s|\n\s*public\s|\n\s*\}\s*$)/);
                    if (onDestroyMatch) {
                        const body = onDestroyMatch[1];
                        const hasCleanup = body.includes('= []') ||
                            body.includes('= null') ||
                            body.includes('= {}') ||
                            body.includes('= 0') ||
                            body.includes('clear()') ||
                            body.includes('.length = 0') ||
                            body.includes('delete ') ||
                            body.includes('destroy') ||
                            body.includes('cleanup') ||
                            body.includes('close') ||
                            body.includes('disconnect') ||
                            body.includes('.clear()');
                        if (hasCleanup) {
                            agentScore += 30;
                        }
                        else {
                            agentScore += 10;
                        }
                    }
                    else {
                        agentScore += 10;
                    }
                }
                if (content.includes('extends BaseAgentService')) {
                    agentScore += 30;
                }
                totalScore += agentScore;
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            return {
                name,
                passed: avgScore >= 90,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    averageScore: avgScore,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testTimeoutHandling(agents) {
        const startTime = Date.now();
        const name = 'Timeout Handling';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            const agentsWithoutTimeout = [];
            for (const agent of agents) {
                const { content, className } = agent;
                let agentScore = 0;
                if (/timeout\s*:\s*\d+/.test(content)) {
                    agentScore += 50;
                    const timeoutMatch = content.match(/timeout\s*:\s*(\d+)/);
                    if (timeoutMatch) {
                        const timeoutValue = parseInt(timeoutMatch[1], 10);
                        if (timeoutValue >= 1000 && timeoutValue <= 300000) {
                            agentScore += 10;
                        }
                    }
                }
                else {
                    agentsWithoutTimeout.push(className);
                }
                if (content.includes('extends BaseAgentService')) {
                    agentScore += 20;
                }
                if (content.includes('timeout') ||
                    content.includes('Timeout') ||
                    content.includes('TIMEOUT')) {
                    agentScore += 20;
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            return {
                name,
                passed: avgScore >= 90,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    averageScore: avgScore,
                    agentsWithoutTimeout,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testRetryLogic(agents) {
        const startTime = Date.now();
        const name = 'Retry Logic';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            const agentsWithoutRetry = [];
            for (const agent of agents) {
                const { content, className } = agent;
                let agentScore = 0;
                if (content.includes('retryPolicy')) {
                    agentScore += 40;
                    if (/maxRetries\s*:\s*\d+/.test(content)) {
                        agentScore += 20;
                    }
                    if (/backoffMs\s*:\s*\d+/.test(content)) {
                        agentScore += 15;
                    }
                    if (content.includes('exponentialBackoff')) {
                        agentScore += 15;
                    }
                    const maxRetriesMatch = content.match(/maxRetries\s*:\s*(\d+)/);
                    if (maxRetriesMatch) {
                        const retries = parseInt(maxRetriesMatch[1], 10);
                        if (retries >= 1 && retries <= 5) {
                            agentScore += 10;
                        }
                    }
                }
                else {
                    agentsWithoutRetry.push(className);
                }
                if (content.includes('extends BaseAgentService')) {
                    agentScore += 10;
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            return {
                name,
                passed: avgScore >= 90,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    averageScore: avgScore,
                    agentsWithoutRetry,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testLogging(agents) {
        const startTime = Date.now();
        const name = 'Logging';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            for (const agent of agents) {
                const { content } = agent;
                let agentScore = 0;
                const loggerUsages = (content.match(/this\.logger\./g) || []).length;
                if (loggerUsages >= 3) {
                    agentScore += 30;
                }
                else if (loggerUsages >= 1) {
                    agentScore += 20;
                }
                const onInitMatch = content.match(/onInitialize\s*\(\s*\)\s*:\s*Promise<void>\s*\{([\s\S]*?)(?=\n\s*protected\s|\n\s*private\s|\n\s*public\s|\n\s*\}\s*$)/);
                if (onInitMatch && /this\.logger\.(log|debug|info)/.test(onInitMatch[1])) {
                    agentScore += 20;
                }
                const onExecMatch = content.match(/onExecute\s*\([^)]*\)\s*:\s*Promise<AgentOutput>\s*\{([\s\S]*?)(?=\n\s*protected\s|\n\s*private\s|\n\s*public\s|\n\s*\}\s*$)/);
                if (onExecMatch && /this\.logger\.(log|warn|error|debug|info)/.test(onExecMatch[1])) {
                    agentScore += 20;
                }
                const onDestroyMatch = content.match(/onDestroy\s*\(\s*\)\s*:\s*Promise<void>\s*\{([\s\S]*?)(?=\n\s*protected\s|\n\s*private\s|\n\s*public\s|\n\s*\}\s*$)/);
                if (onDestroyMatch && /this\.logger\.(log|debug|info|warn)/.test(onDestroyMatch[1])) {
                    agentScore += 15;
                }
                if (/this\.logger\.error/.test(content)) {
                    agentScore += 15;
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            return {
                name,
                passed: avgScore >= 90,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    averageScore: avgScore,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testPermissions(agents) {
        const startTime = Date.now();
        const name = 'Permissions';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            const agentsWithoutPermissions = [];
            for (const agent of agents) {
                const { content, className } = agent;
                let agentScore = 0;
                if (content.includes('permissions:')) {
                    agentScore += 40;
                    const permMatch = content.match(/permissions\s*:\s*\[([^\]]*)\]/);
                    if (permMatch && permMatch[1].trim().length > 0) {
                        agentScore += 30;
                        const permEntries = permMatch[1].split(',').filter((s) => s.trim().length > 0);
                        if (permEntries.length >= 3) {
                            agentScore += 10;
                        }
                    }
                }
                else {
                    agentsWithoutPermissions.push(className);
                }
                if (content.includes('execute:task') || content.includes('execute:task')) {
                    agentScore += 10;
                }
                if (content.includes('extends BaseAgentService')) {
                    agentScore += 10;
                }
                if (content.includes('PermissionAction') || content.includes('PermissionResource')) {
                    agentScore += 10;
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            return {
                name,
                passed: avgScore >= 90,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    averageScore: avgScore,
                    agentsWithoutPermissions,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testMemoryIntegration(agents) {
        const startTime = Date.now();
        const name = 'Memory Integration';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            const agentsWithMemory = [];
            const agentsWithoutMemory = [];
            for (const agent of agents) {
                const { content, className } = agent;
                let agentScore = 0;
                if (content.includes('storeInWorkingMemory') ||
                    content.includes('retrieveFromWorkingMemory')) {
                    agentScore += 30;
                }
                if (content.includes('storeInSessionMemory') ||
                    content.includes('retrieveFromSessionMemory')) {
                    agentScore += 20;
                }
                if (content.includes('storeInLongTermMemory') ||
                    content.includes('retrieveFromLongTermMemory')) {
                    agentScore += 20;
                }
                if (content.includes('extends BaseAgentService')) {
                    agentScore += 20;
                }
                if (content.includes('queryMemory')) {
                    agentScore += 10;
                }
                if (agentScore >= 50) {
                    agentsWithMemory.push(className);
                }
                else {
                    agentsWithoutMemory.push(className);
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            return {
                name,
                passed: avgScore >= 70,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    averageScore: avgScore,
                    agentsWithMemory: agentsWithMemory.length,
                    agentsWithoutMemory: agentsWithoutMemory.length,
                    agentsWithoutMemoryList: agentsWithoutMemory.slice(0, 20),
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testToolsRegistered(agents) {
        const startTime = Date.now();
        const name = 'Tools Registered';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            const agentsWithoutTools = [];
            const toolCountMap = {};
            for (const agent of agents) {
                const { content, className } = agent;
                let agentScore = 0;
                const registerToolCount = (content.match(/registerTool\s*\(/g) || []).length;
                if (registerToolCount >= 1) {
                    agentScore += 40;
                    if (registerToolCount >= 3) {
                        agentScore += 30;
                    }
                    else if (registerToolCount >= 2) {
                        agentScore += 20;
                    }
                    const onInitMatch = content.match(/onInitialize\s*\(\s*\)\s*:\s*Promise<void>\s*\{([\s\S]*?)(?=\n\s*protected\s|\n\s*private\s|\n\s*public\s|\n\s*\}\s*$)/);
                    if (onInitMatch && onInitMatch[1].includes('registerTool')) {
                        agentScore += 20;
                    }
                    const toolBlocks = content.match(/registerTool\s*\(\s*\{[\s\S]*?\}\s*\)/g) || [];
                    let completeTools = 0;
                    for (const block of toolBlocks) {
                        if (block.includes('name:') &&
                            block.includes('description:') &&
                            block.includes('execute:')) {
                            completeTools++;
                        }
                    }
                    if (completeTools > 0) {
                        agentScore += 10;
                    }
                    toolCountMap[className] = registerToolCount;
                }
                else {
                    agentsWithoutTools.push(className);
                    toolCountMap[className] = 0;
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            return {
                name,
                passed: avgScore >= 90,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    averageScore: avgScore,
                    agentsWithoutTools,
                    toolCountStats: {
                        min: Math.min(...Object.values(toolCountMap)),
                        max: Math.max(...Object.values(toolCountMap)),
                        avg: Object.values(toolCountMap).length > 0
                            ? Math.round(Object.values(toolCountMap).reduce((a, b) => a + b, 0) /
                                Object.values(toolCountMap).length)
                            : 0,
                    },
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testExceptionHandling(agents) {
        const startTime = Date.now();
        const name = 'Exception Handling';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            const agentsWithoutErrorHandling = [];
            for (const agent of agents) {
                const { content, className } = agent;
                let agentScore = 0;
                const onExecMatch = content.match(/onExecute\s*\([^)]*\)\s*:\s*Promise<AgentOutput>\s*\{([\s\S]*?)(?=\n\s*protected\s|\n\s*private\s|\n\s*public\s|\n\s*\}\s*$)/);
                if (onExecMatch) {
                    const execBody = onExecMatch[1];
                    if (execBody.includes('try') && execBody.includes('catch')) {
                        agentScore += 40;
                    }
                    else {
                        agentsWithoutErrorHandling.push(className);
                    }
                }
                else {
                    if (content.includes('try') && content.includes('catch')) {
                        agentScore += 25;
                    }
                    else {
                        agentsWithoutErrorHandling.push(className);
                    }
                }
                if (content.includes('createAgentOutput') || content.includes('success: false')) {
                    agentScore += 20;
                }
                if (/catch\s*\([^)]*\)\s*\{[\s\S]*?this\.logger\.error/.test(content)) {
                    agentScore += 20;
                }
                if (content.includes('onValidateInput') || /if\s*\(!\w+/.test(content)) {
                    agentScore += 10;
                }
                if (content.includes('this.logger.error') || content.includes('this.logger.warn')) {
                    agentScore += 10;
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            return {
                name,
                passed: avgScore >= 90,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    averageScore: avgScore,
                    agentsWithoutErrorHandling,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testConcurrentExecution(agents) {
        const startTime = Date.now();
        const name = 'Concurrent Execution';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            const agentsWithoutConcurrency = [];
            for (const agent of agents) {
                const { content, className } = agent;
                let agentScore = 0;
                if (/maxConcurrentTasks\s*:\s*\d+/.test(content)) {
                    agentScore += 50;
                    const maxMatch = content.match(/maxConcurrentTasks\s*:\s*(\d+)/);
                    if (maxMatch) {
                        const maxVal = parseInt(maxMatch[1], 10);
                        if (maxVal >= 1 && maxVal <= 20) {
                            agentScore += 10;
                        }
                    }
                }
                else {
                    agentsWithoutConcurrency.push(className);
                }
                if (content.includes('extends BaseAgentService')) {
                    agentScore += 20;
                }
                if (content.includes('Set<') ||
                    content.includes('Map<') ||
                    content.includes('new Set') ||
                    content.includes('new Map')) {
                    agentScore += 10;
                }
                const hasModuleLevelMutable = /^(?:let|var)\s+\w+\s*=/m.test(content.replace(/(?:let|var)\s+\w+\s*=\s*(?:require|import)/, ''));
                if (!hasModuleLevelMutable) {
                    agentScore += 10;
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            return {
                name,
                passed: avgScore >= 90,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    averageScore: avgScore,
                    agentsWithoutConcurrency,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    calculateHealthScore(results) {
        if (results.length === 0)
            return 0;
        const weights = {
            Initialization: 0.15,
            Shutdown: 0.08,
            'Timeout Handling': 0.1,
            'Retry Logic': 0.1,
            Logging: 0.07,
            Permissions: 0.1,
            'Memory Integration': 0.1,
            'Tools Registered': 0.12,
            'Exception Handling': 0.12,
            'Concurrent Execution': 0.06,
        };
        let weightedSum = 0;
        let totalWeight = 0;
        for (const result of results) {
            const weight = weights[result.name] || 0.1;
            weightedSum += result.score * weight;
            totalWeight += weight;
        }
        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    }
    async discoverAgentFiles() {
        const results = [];
        if (!fs.existsSync(AGENTS_DIR)) {
            this.logger.warn(`Agents directory not found: ${AGENTS_DIR}`);
            return results;
        }
        const allAgentFiles = await this.getAllFilesRecursive(AGENTS_DIR, '-agent.service.ts');
        for (const filePath of allAgentFiles) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const relativePath = path.relative(SOURCE_ROOT, filePath);
                const classMatch = content.match(/export\s+class\s+(\w+)/);
                const className = classMatch ? classMatch[1] : path.basename(filePath, '.service.ts');
                const cluster = this.determineCluster(relativePath);
                const configMatch = content.match(/export\s+const\s+(\w+CONFIG)/);
                const configName = configMatch ? configMatch[1] : '';
                results.push({
                    filePath,
                    relativePath,
                    content,
                    className,
                    cluster,
                    configName,
                });
            }
            catch (error) {
                this.logger.warn(`Failed to read agent file ${filePath}: ${error.message}`);
            }
        }
        return results;
    }
    determineCluster(relativePath) {
        const parts = relativePath.split(path.sep);
        if (parts.length >= 2 && parts[0] === 'agents') {
            return parts[1];
        }
        return 'unknown';
    }
    extractAgentId(content) {
        const idMatch = content.match(/id:\s*['"]([^'"]+)['"]/);
        return idMatch ? idMatch[1] : 'unknown';
    }
    async getAllFilesRecursive(dir, suffix) {
        const results = [];
        if (!fs.existsSync(dir)) {
            this.logger.warn(`Directory does not exist: ${dir}`);
            return results;
        }
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const subResults = await this.getAllFilesRecursive(fullPath, suffix);
                results.push(...subResults);
            }
            else if (entry.name.endsWith(suffix)) {
                results.push(fullPath);
            }
        }
        return results;
    }
};
exports.AgentIntegrityCertificationService = AgentIntegrityCertificationService;
exports.AgentIntegrityCertificationService = AgentIntegrityCertificationService = AgentIntegrityCertificationService_1 = __decorate([
    (0, common_1.Injectable)()
], AgentIntegrityCertificationService);
//# sourceMappingURL=agent-integrity-certification.service.js.map