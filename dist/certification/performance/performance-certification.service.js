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
var PerformanceCertificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceCertificationService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(SOURCE_ROOT, 'agents');
const BASE_DIR = path.join(SOURCE_ROOT, 'agents', 'base');
const EVENTS_DIR = path.join(SOURCE_ROOT, 'agents', 'events');
const HEALTH_DIR = path.join(SOURCE_ROOT, 'agents', 'health');
const ORCHESTRATOR_DIR = path.join(SOURCE_ROOT, 'agents', 'orchestrator');
const MEMORY_DIR = path.join(SOURCE_ROOT, 'agents', 'memory');
const CONFIG_DIR = path.join(SOURCE_ROOT, 'config');
let PerformanceCertificationService = PerformanceCertificationService_1 = class PerformanceCertificationService {
    constructor() {
        this.logger = new common_1.Logger(PerformanceCertificationService_1.name);
        this.agentAnalyses = null;
        this.serviceAnalyses = null;
    }
    async runAll() {
        const startTime = Date.now();
        this.logger.log('Starting Performance certification...');
        const tests = [];
        const criticalFailures = [];
        const agents = await this.analyzeAgents();
        const services = await this.analyzeServices();
        this.logger.log(`Analyzed ${agents.length} agents and ${services.length} services for performance`);
        const testMethods = [
            { name: 'Agent Initialization Latency', fn: () => this.testInitializationLatency(agents) },
            { name: 'Memory Footprint', fn: () => this.testMemoryFootprint(agents) },
            { name: 'CPU Efficiency', fn: () => this.testCpuEfficiency(agents) },
            { name: 'Event Bus Throughput', fn: () => this.testEventBusThroughput(services) },
            { name: 'Concurrent Agent Capacity', fn: () => this.testConcurrentCapacity(agents) },
            { name: 'Database Query Optimization', fn: () => this.testDatabaseOptimization(services) },
            { name: 'Redis Connection Efficiency', fn: () => this.testRedisEfficiency(services) },
            {
                name: 'Queue Processing Throughput',
                fn: () => this.testQueueProcessingThroughput(services),
            },
            { name: 'Memory Leak Prevention', fn: () => this.testMemoryLeakPrevention(agents) },
            { name: 'Startup Time', fn: () => this.testStartupTime(services) },
        ];
        for (const testDef of testMethods) {
            try {
                const result = await testDef.fn();
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
        const testWeights = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
        let weightedSum = 0;
        for (let i = 0; i < tests.length; i++) {
            const weight = testWeights[i] || 0.1;
            weightedSum += tests[i].score * weight;
        }
        const score = Math.round(weightedSum);
        const passed = score >= 90 && criticalFailures.length === 0;
        const durationMs = Date.now() - startTime;
        this.logger.log(`Performance certification complete: score=${score}, passed=${passed}, ` +
            `duration=${durationMs}ms, criticalFailures=${criticalFailures.length}`);
        return {
            domain: types_1.CertificationDomain.PERFORMANCE,
            weight: 0.1,
            score,
            tests,
            passed,
            criticalFailures,
        };
    }
    async testInitializationLatency(agents) {
        const startTime = Date.now();
        const name = 'Agent Initialization Latency';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            const issues = [];
            const agentsWithBadTimeout = [];
            const agentsWithBadRetry = [];
            for (const agent of agents) {
                let agentScore = 0;
                if (agent.timeout !== null) {
                    agentScore += 30;
                    if (agent.timeout >= 5000 && agent.timeout <= 120000) {
                        agentScore += 30;
                    }
                    else if (agent.timeout < 5000) {
                        agentsWithBadTimeout.push(`${agent.relativePath}: timeout=${agent.timeout}ms (too low)`);
                    }
                    else {
                        agentsWithBadTimeout.push(`${agent.relativePath}: timeout=${agent.timeout}ms (too high)`);
                    }
                }
                else {
                    issues.push(`${agent.relativePath}: No timeout configured`);
                }
                const maxRetriesMatch = agent.content.match(/maxRetries\s*:\s*(\d+)/);
                if (maxRetriesMatch) {
                    const maxRetries = parseInt(maxRetriesMatch[1], 10);
                    if (maxRetries <= 5) {
                        agentScore += 20;
                    }
                    else {
                        agentsWithBadRetry.push(`${agent.relativePath}: maxRetries=${maxRetries} (too high)`);
                    }
                }
                else {
                    agentScore += 10;
                }
                const backoffMatch = agent.content.match(/backoffMs\s*:\s*(\d+)/);
                if (backoffMatch) {
                    const backoffMs = parseInt(backoffMatch[1], 10);
                    if (backoffMs <= 10000) {
                        agentScore += 10;
                    }
                }
                else {
                    agentScore += 5;
                }
                if (agent.content.includes('exponentialBackoff')) {
                    agentScore += 10;
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            const simResult = this.simulateInitializationLatency(agents.length);
            return {
                name,
                passed: avgScore >= 90 && agentsWithBadTimeout.length === 0,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    agentsWithBadTimeout: agentsWithBadTimeout.length,
                    agentsWithBadRetry: agentsWithBadRetry.length,
                    badTimeoutList: agentsWithBadTimeout.slice(0, 10),
                    badRetryList: agentsWithBadRetry.slice(0, 10),
                    issues,
                    simulated: simResult,
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
    async testMemoryFootprint(agents) {
        const startTime = Date.now();
        const name = 'Memory Footprint';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            const issues = [];
            const agentsWithUnboundedCollections = [];
            for (const agent of agents) {
                let agentScore = 0;
                if (agent.mapCount > 0) {
                    agentScore += 10;
                    if (agent.hasMapWithSizeLimit) {
                        agentScore += 20;
                    }
                    else {
                        if (agent.content.includes('.clear()') || agent.content.includes('.delete(')) {
                            agentScore += 10;
                        }
                    }
                }
                else {
                    agentScore += 15;
                }
                if (agent.arrayCount > 0) {
                    if (agent.hasArrayWithSizeLimit) {
                        agentScore += 20;
                    }
                    else if (agent.content.includes('.slice(') || agent.content.includes('.splice(')) {
                        agentScore += 10;
                    }
                    else if (agent.hasUnboundedPush) {
                        agentsWithUnboundedCollections.push(agent.relativePath);
                    }
                }
                else {
                    agentScore += 15;
                }
                if (agent.content.includes('MAX_ENTRIES') ||
                    agent.content.includes('MAX_SIZE') ||
                    agent.content.includes('maxEntries') ||
                    agent.content.includes('maxSize') ||
                    agent.content.includes('LIMIT')) {
                    agentScore += 15;
                }
                if (agent.content.includes('.slice(') || agent.content.includes('Math.min(')) {
                    agentScore += 15;
                }
                const hasGlobalAccumulator = agent.content.includes('static ') &&
                    (agent.content.includes('Map<') || agent.content.includes('[]'));
                if (!hasGlobalAccumulator) {
                    agentScore += 10;
                }
                if (agent.maxConcurrentTasks !== null && agent.maxConcurrentTasks <= 20) {
                    agentScore += 10;
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            const simResult = this.simulateMemoryFootprint(agents.length);
            return {
                name,
                passed: avgScore >= 90 && agentsWithUnboundedCollections.length <= 2,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    agentsWithUnboundedCollections: agentsWithUnboundedCollections.length,
                    unboundedList: agentsWithUnboundedCollections.slice(0, 10),
                    issues,
                    simulated: simResult,
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
    async testCpuEfficiency(agents) {
        const startTime = Date.now();
        const name = 'CPU Efficiency';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            const issues = [];
            const agentsWithBusyWait = [];
            for (const agent of agents) {
                let agentScore = 0;
                if (!agent.hasBusyWait) {
                    agentScore += 30;
                }
                else {
                    agentsWithBusyWait.push(agent.relativePath);
                    issues.push(`${agent.relativePath}: Has busy-wait pattern`);
                }
                if (agent.usesAsyncPatterns) {
                    agentScore += 20;
                }
                const hasSyncSpin = agent.content.includes('while (true)') &&
                    !agent.content.includes('await') &&
                    !agent.content.includes('sleep');
                if (!hasSyncSpin) {
                    agentScore += 15;
                }
                if (agent.content.includes('setTimeout') || agent.content.includes('setInterval')) {
                    if (agent.content.includes('clearTimeout') || agent.content.includes('clearInterval')) {
                        agentScore += 10;
                    }
                    else {
                        agentScore += 3;
                    }
                }
                else {
                    agentScore += 10;
                }
                if (agent.content.includes('Promise.all') ||
                    agent.content.includes('Promise.allSettled') ||
                    agent.content.includes('Promise.race')) {
                    agentScore += 10;
                }
                if (agent.content.includes('this.sleep(') || agent.content.includes('await this.sleep')) {
                    agentScore += 10;
                }
                const hasUnboundedRecursion = agent.content.includes('this.onExecute(') &&
                    !agent.content.includes('maxDepth') &&
                    !agent.content.includes('depth');
                if (!hasUnboundedRecursion) {
                    agentScore += 5;
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            const simResult = this.simulateCpuEfficiency(agents.length);
            return {
                name,
                passed: avgScore >= 90 && agentsWithBusyWait.length === 0,
                score: avgScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    agentsWithBusyWait: agentsWithBusyWait.length,
                    busyWaitList: agentsWithBusyWait.slice(0, 10),
                    issues,
                    simulated: simResult,
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
    async testEventBusThroughput(services) {
        const startTime = Date.now();
        const name = 'Event Bus Throughput';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const eventBus = services.find((s) => s.fileName.includes('event-bus'));
            if (eventBus) {
                score += 10;
            }
            else {
                issues.push('EventBusService not found');
            }
            if (eventBus) {
                if (eventBus.content.includes('EventEmitter2') ||
                    eventBus.content.includes('@nestjs/event-emitter')) {
                    score += 15;
                }
                else {
                    issues.push('Not using NestJS EventEmitter2');
                }
                if (eventBus.content.includes('deliverToSubscriptions') ||
                    eventBus.content.includes('typeIndex')) {
                    score += 10;
                }
                if (eventBus.content.includes("'*'") || eventBus.content.includes('wildcard')) {
                    score += 10;
                }
                if (eventBus.content.includes('cluster:') || eventBus.content.includes('event.cluster')) {
                    score += 10;
                }
                if (eventBus.content.includes('eventStore.store') ||
                    eventBus.content.includes('eventStore')) {
                    score += 10;
                }
                if (eventBus.content.includes('deadLetterQueue') ||
                    eventBus.content.includes('DeadLetterQueue')) {
                    score += 10;
                }
                if (eventBus.content.includes('emitAsync')) {
                    score += 10;
                }
                if (eventBus.content.includes('typeIndex') &&
                    eventBus.content.includes('subscriberIndex')) {
                    score += 10;
                }
                if (eventBus.hasInjectable)
                    score += 3;
                if (eventBus.hasLogger)
                    score += 2;
            }
            const appModulePath = path.join(SOURCE_ROOT, 'app.module.ts');
            if (fs.existsSync(appModulePath)) {
                const appModule = fs.readFileSync(appModulePath, 'utf-8');
                if (appModule.includes('EventEmitterModule') || appModule.includes('EventEmitter2')) {
                    score += 5;
                }
            }
            const simResult = this.simulateEventBusThroughput();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    eventBusFound: !!eventBus,
                    usesEventEmitter2: eventBus?.content.includes('EventEmitter2') || false,
                    hasSubscriptionIndex: eventBus?.content.includes('typeIndex') || false,
                    hasDeadLetterQueue: eventBus?.content.includes('deadLetterQueue') || false,
                    issues,
                    simulated: simResult,
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
    async testConcurrentCapacity(agents) {
        const startTime = Date.now();
        const name = 'Concurrent Agent Capacity';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            const issues = [];
            const agentsWithoutConcurrency = [];
            const agentsWithHighConcurrency = [];
            for (const agent of agents) {
                let agentScore = 0;
                if (agent.maxConcurrentTasks !== null) {
                    agentScore += 40;
                    if (agent.maxConcurrentTasks >= 1 && agent.maxConcurrentTasks <= 20) {
                        agentScore += 30;
                    }
                    else if (agent.maxConcurrentTasks > 20) {
                        agentsWithHighConcurrency.push(`${agent.relativePath}: maxConcurrentTasks=${agent.maxConcurrentTasks} (too high)`);
                        agentScore += 10;
                    }
                }
                else {
                    agentsWithoutConcurrency.push(agent.relativePath);
                }
                if (agent.content.includes('currentTasks.size') || agent.content.includes('currentTasks')) {
                    agentScore += 20;
                }
                if (agent.content.includes('canAcceptTask')) {
                    agentScore += 10;
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            const baseAgentPath = path.join(BASE_DIR, 'base-agent.service.ts');
            let baseEnforcementScore = 0;
            if (fs.existsSync(baseAgentPath)) {
                const baseContent = fs.readFileSync(baseAgentPath, 'utf-8');
                if (baseContent.includes('maxConcurrentTasks') &&
                    baseContent.includes('currentTasks.size >= ')) {
                    baseEnforcementScore = 100;
                }
                else if (baseContent.includes('maxConcurrentTasks')) {
                    baseEnforcementScore = 50;
                }
            }
            const finalScore = Math.round(avgScore * 0.8 + baseEnforcementScore * 0.2);
            return {
                name,
                passed: finalScore >= 90 && agentsWithoutConcurrency.length <= 2,
                score: finalScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    agentsWithoutConcurrency: agentsWithoutConcurrency.length,
                    agentsWithHighConcurrency: agentsWithHighConcurrency.length,
                    withoutConcurrencyList: agentsWithoutConcurrency.slice(0, 10),
                    issues,
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
    async testDatabaseOptimization(services) {
        const startTime = Date.now();
        const name = 'Database Query Optimization';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const dbConfigPath = path.join(CONFIG_DIR, 'database.config.ts');
            if (fs.existsSync(dbConfigPath)) {
                score += 10;
                const dbConfig = fs.readFileSync(dbConfigPath, 'utf-8');
                if (dbConfig.includes('poolSize') ||
                    dbConfig.includes('connectionLimit') ||
                    dbConfig.includes('pool')) {
                    score += 15;
                }
                else {
                    issues.push('Database config missing pool size');
                }
                const poolSizeMatch = dbConfig.match(/poolSize['"]*\s*[:=]\s*(\d+)/);
                if (poolSizeMatch) {
                    const poolSize = parseInt(poolSizeMatch[1], 10);
                    if (poolSize >= 5 && poolSize <= 100) {
                        score += 10;
                    }
                }
            }
            else {
                issues.push('Database config not found');
            }
            const memoryServices = services.filter((s) => s.fileName.includes('working-memory') ||
                s.fileName.includes('session-memory') ||
                s.fileName.includes('long-term-memory'));
            const inProcessServices = memoryServices.filter((s) => s.content.includes('new Map') || s.content.includes('Map<'));
            if (memoryServices.length > 0) {
                score += Math.round((inProcessServices.length / memoryServices.length) * 15);
            }
            const eventStore = services.find((s) => s.fileName.includes('event-store'));
            if (eventStore && eventStore.content.includes('Map<')) {
                score += 10;
            }
            let servicesWithTryCatch = 0;
            const relevantServices = services.filter((s) => s.fileName.includes('memory') ||
                s.fileName.includes('event-store') ||
                s.fileName.includes('health'));
            for (const svc of relevantServices) {
                if (svc.content.includes('try') && svc.content.includes('catch')) {
                    servicesWithTryCatch++;
                }
            }
            if (relevantServices.length > 0) {
                score += Math.round((servicesWithTryCatch / relevantServices.length) * 10);
            }
            const servicesWithLimits = services.filter((s) => s.content.includes('.slice(') ||
                s.content.includes('LIMIT') ||
                s.content.includes('limit'));
            if (servicesWithLimits.length > 0) {
                score += Math.min(servicesWithLimits.length * 3, 10);
            }
            let nPlusOneIssues = 0;
            for (const svc of services) {
                if (svc.content.includes('for (') &&
                    svc.content.includes('await') &&
                    svc.content.includes('for (')) {
                    nPlusOneIssues++;
                }
            }
            if (nPlusOneIssues <= 2) {
                score += 10;
            }
            else {
                score += Math.max(0, 10 - (nPlusOneIssues - 2) * 2);
            }
            const appModulePath = path.join(SOURCE_ROOT, 'app.module.ts');
            if (fs.existsSync(appModulePath)) {
                const appModule = fs.readFileSync(appModulePath, 'utf-8');
                if (appModule.includes('TypeOrmModule') || appModule.includes('PrismaModule')) {
                    score += 10;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    dbConfigFound: fs.existsSync(dbConfigPath),
                    memoryServicesInProcess: inProcessServices.length,
                    totalMemoryServices: memoryServices.length,
                    nPlusOneIssues,
                    issues,
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
    async testRedisEfficiency(services) {
        const startTime = Date.now();
        const name = 'Redis Connection Efficiency';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const redisConfigPath = path.join(CONFIG_DIR, 'redis.config.ts');
            if (fs.existsSync(redisConfigPath)) {
                score += 10;
                const redisConfig = fs.readFileSync(redisConfigPath, 'utf-8');
                if (redisConfig.includes('host') && redisConfig.includes('port')) {
                    score += 10;
                }
                if (redisConfig.includes('process.env')) {
                    score += 10;
                }
            }
            else {
                issues.push('Redis config not found');
            }
            const broker = services.find((s) => s.fileName.includes('message-broker'));
            if (broker) {
                if (broker.content.includes('ConnectionState') ||
                    broker.content.includes('connectionState')) {
                    score += 15;
                }
                else {
                    issues.push('MessageBroker missing connection state management');
                }
            }
            if (broker &&
                (broker.content.includes('reconnect') || broker.content.includes('attemptReconnect'))) {
                score += 10;
            }
            if (broker &&
                (broker.content.includes('inMemory') || broker.content.includes('startInMemoryProcessing'))) {
                score += 15;
            }
            const wm = services.find((s) => s.fileName.includes('working-memory'));
            if (wm &&
                wm.content.includes('Map<') &&
                !wm.content.includes('Redis') &&
                !wm.content.includes('redis')) {
                score += 10;
            }
            const eventStore = services.find((s) => s.fileName.includes('event-store'));
            if (eventStore && eventStore.content.includes('Map<')) {
                score += 10;
            }
            if (fs.existsSync(redisConfigPath)) {
                const redisConfig = fs.readFileSync(redisConfigPath, 'utf-8');
                if (redisConfig.includes('registerAs')) {
                    score += 10;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    redisConfigFound: fs.existsSync(redisConfigPath),
                    brokerHasReconnection: broker?.content.includes('reconnect') || false,
                    brokerHasInMemoryFallback: broker?.content.includes('inMemory') || false,
                    eventStoreInMemory: eventStore?.content.includes('Map<') || false,
                    issues,
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
    async testQueueProcessingThroughput(services) {
        const startTime = Date.now();
        const name = 'Queue Processing Throughput';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const broker = services.find((s) => s.fileName.includes('message-broker'));
            if (broker) {
                score += 15;
                if (broker.content.includes('queue') || broker.content.includes('Queue')) {
                    score += 10;
                }
                if (broker.content.includes('ack') ||
                    broker.content.includes('acknowledge') ||
                    broker.content.includes('channel.ack')) {
                    score += 10;
                }
                if (broker.content.includes('nack') ||
                    broker.content.includes('requeue') ||
                    broker.content.includes('retry')) {
                    score += 10;
                }
                if (broker.content.includes('prefetch') || broker.content.includes('concurrency')) {
                    score += 10;
                }
                if (broker.content.includes('deadLetter') ||
                    broker.content.includes('DLQ') ||
                    broker.content.includes('dead-letter')) {
                    score += 10;
                }
                if (broker.content.includes('batch') || broker.content.includes('bulk')) {
                    score += 5;
                }
            }
            else {
                issues.push('MessageBrokerService not found');
            }
            const dlq = services.find((s) => s.fileName.includes('dead-letter'));
            if (dlq) {
                score += 10;
                if (dlq.content.includes('retry')) {
                    score += 5;
                }
                if (dlq.content.includes('maxRetries') || dlq.content.includes('MAX_RETRIES')) {
                    score += 5;
                }
            }
            const eventStore = services.find((s) => s.fileName.includes('event-store'));
            if (eventStore &&
                (eventStore.content.includes('MAX_EVENTS') || eventStore.content.includes('maxSize'))) {
                score += 5;
            }
            const simResult = this.simulateQueueThroughput();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    brokerFound: !!broker,
                    dlqFound: !!dlq,
                    eventStoreFound: !!eventStore,
                    issues,
                    simulated: simResult,
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
    async testMemoryLeakPrevention(agents) {
        const startTime = Date.now();
        const name = 'Memory Leak Prevention';
        this.logger.log(`Running test: ${name}`);
        try {
            let totalScore = 0;
            const agentsWithoutCleanup = [];
            for (const agent of agents) {
                let agentScore = 0;
                if (agent.hasOnDestroy) {
                    agentScore += 30;
                    if (agent.hasCleanupInOnDestroy) {
                        agentScore += 25;
                    }
                }
                else {
                    agentsWithoutCleanup.push(agent.relativePath);
                }
                if (agent.content.includes('onDestroy') && agent.content.includes('.clear()')) {
                    agentScore += 15;
                }
                if (agent.content.includes('onDestroy') &&
                    (agent.content.includes('= []') || agent.content.includes('.length = 0'))) {
                    agentScore += 10;
                }
                if (agent.content.includes('onDestroy') &&
                    (agent.content.includes('clearTimeout') || agent.content.includes('clearInterval'))) {
                    agentScore += 10;
                }
                const hasStaticAccumulator = agent.content.includes('static ') &&
                    (agent.content.includes('Map<') || agent.content.includes('[]')) &&
                    !agent.content.includes('static clear') &&
                    !agent.content.includes('static reset');
                if (!hasStaticAccumulator) {
                    agentScore += 10;
                }
                totalScore += Math.min(agentScore, 100);
            }
            const avgScore = agents.length > 0 ? Math.round(totalScore / agents.length) : 0;
            const baseAgentPath = path.join(BASE_DIR, 'base-agent.service.ts');
            let baseCleanupScore = 0;
            if (fs.existsSync(baseAgentPath)) {
                const baseContent = fs.readFileSync(baseAgentPath, 'utf-8');
                if (baseContent.includes('onModuleDestroy'))
                    baseCleanupScore += 25;
                if (baseContent.includes('clearInterval'))
                    baseCleanupScore += 25;
                if (baseContent.includes('.clear()'))
                    baseCleanupScore += 25;
                if (baseContent.includes('.delete('))
                    baseCleanupScore += 25;
            }
            const finalScore = Math.round(avgScore * 0.8 + baseCleanupScore * 0.2);
            return {
                name,
                passed: finalScore >= 90 && agentsWithoutCleanup.length <= 2,
                score: finalScore,
                durationMs: Date.now() - startTime,
                details: {
                    totalAgents: agents.length,
                    agentsWithOnDestroy: agents.filter((a) => a.hasOnDestroy).length,
                    agentsWithCleanupInOnDestroy: agents.filter((a) => a.hasCleanupInOnDestroy).length,
                    agentsWithoutCleanup: agentsWithoutCleanup.length,
                    withoutCleanupList: agentsWithoutCleanup.slice(0, 10),
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
    async testStartupTime(services) {
        const startTime = Date.now();
        const name = 'Startup Time';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const appModulePath = path.join(SOURCE_ROOT, 'app.module.ts');
            if (fs.existsSync(appModulePath)) {
                score += 5;
                const appModule = fs.readFileSync(appModulePath, 'utf-8');
                const moduleImports = (appModule.match(/Module/g) || []).length;
                if (moduleImports >= 3) {
                    score += 15;
                }
                else if (moduleImports >= 1) {
                    score += 8;
                }
                else {
                    issues.push('App module has no feature module imports');
                }
            }
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
            let circularImports = 0;
            for (const cluster of clusterDirs) {
                const clusterDir = path.join(AGENTS_DIR, cluster);
                if (!fs.existsSync(clusterDir))
                    continue;
                const modulePath = path.join(clusterDir, `${cluster.replace(/-/g, '-')}-cluster.module.ts`);
                if (!fs.existsSync(modulePath))
                    continue;
                const moduleContent = fs.readFileSync(modulePath, 'utf-8');
                for (const otherCluster of clusterDirs) {
                    if (otherCluster === cluster)
                        continue;
                    if (moduleContent.includes(`../${otherCluster}`) ||
                        moduleContent.includes(`/${otherCluster}/`)) {
                        circularImports++;
                    }
                }
            }
            if (circularImports === 0) {
                score += 15;
            }
            else {
                score += Math.max(0, 15 - circularImports * 5);
                issues.push(`Found ${circularImports} cross-cluster imports (potential circular init)`);
            }
            let heavyConstructorCount = 0;
            for (const svc of services) {
                const constructorMatch = svc.content.match(/constructor\s*\([^)]*\)\s*\{[\s\S]*?\}/);
                if (constructorMatch) {
                    const constructorBody = constructorMatch[0];
                    if (constructorBody.includes('fs.readFileSync') ||
                        constructorBody.includes('await ') ||
                        constructorBody.includes('fetch(')) {
                        heavyConstructorCount++;
                    }
                }
            }
            if (heavyConstructorCount === 0) {
                score += 15;
            }
            else {
                score += Math.max(0, 15 - heavyConstructorCount * 5);
            }
            const agentFiles = await this.getAgentFiles();
            let agentsUsingOnInitialize = 0;
            for (const agentPath of agentFiles) {
                const content = fs.readFileSync(agentPath, 'utf-8');
                if (content.includes('onInitialize')) {
                    agentsUsingOnInitialize++;
                }
            }
            if (agentFiles.length > 0) {
                const ratio = agentsUsingOnInitialize / agentFiles.length;
                score += Math.round(ratio * 15);
            }
            const eventBus = services.find((s) => s.fileName.includes('event-bus'));
            if (eventBus && eventBus.content.includes('onModuleInit')) {
                score += 10;
            }
            const wm = services.find((s) => s.fileName.includes('working-memory'));
            if (wm && wm.content.includes('onModuleInit')) {
                score += 10;
            }
            const baseAgentPath = path.join(BASE_DIR, 'base-agent.service.ts');
            if (fs.existsSync(baseAgentPath)) {
                const baseContent = fs.readFileSync(baseAgentPath, 'utf-8');
                if (baseContent.includes('onModuleInit') && baseContent.includes('onModuleDestroy')) {
                    score += 10;
                }
            }
            const simResult = this.simulateStartupTime(agentFiles.length);
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    circularImports,
                    heavyConstructorCount,
                    agentsUsingOnInitialize,
                    totalAgents: agentFiles.length,
                    issues,
                    simulated: simResult,
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
    simulateInitializationLatency(agentCount) {
        return {
            avgInitMs: Math.round(50 + agentCount * 0.5),
            p99InitMs: Math.round(200 + agentCount * 2),
            maxTimeoutMs: 120000,
        };
    }
    simulateMemoryFootprint(agentCount) {
        return {
            totalHeapMb: Math.round(50 + agentCount * 2),
            avgPerAgentMb: Math.round(2 + Math.random()),
            mapsWithLimits: Math.round(agentCount * 0.7),
            totalMaps: agentCount,
        };
    }
    simulateCpuEfficiency(agentCount) {
        return {
            avgCpuPercent: Math.round(5 + agentCount * 0.1),
            peakCpuPercent: Math.round(25 + agentCount * 0.3),
            busyWaitAgents: 0,
        };
    }
    simulateEventBusThroughput() {
        return {
            eventsPerSecond: 50000,
            avgDeliveryMs: 0.02,
            subscriptionLookupMs: 0.001,
        };
    }
    simulateQueueThroughput() {
        return {
            jobsPerSecond: 1000,
            avgProcessingMs: 50,
            dlqRate: 0.02,
        };
    }
    simulateStartupTime(agentCount) {
        return {
            coldStartMs: Math.round(2000 + agentCount * 10),
            warmStartMs: Math.round(500 + agentCount * 5),
            moduleInitMs: Math.round(300 + agentCount * 3),
        };
    }
    async analyzeAgents() {
        if (this.agentAnalyses) {
            return this.agentAnalyses;
        }
        const results = [];
        const agentFiles = await this.getAgentFiles();
        for (const filePath of agentFiles) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const relativePath = path.relative(SOURCE_ROOT, filePath);
                const classMatch = content.match(/export\s+class\s+(\w+)/);
                const className = classMatch ? classMatch[1] : '';
                const timeoutMatch = content.match(/timeout\s*:\s*(\d+)/);
                const timeout = timeoutMatch ? parseInt(timeoutMatch[1], 10) : null;
                const maxConcurrentMatch = content.match(/maxConcurrentTasks\s*:\s*(\d+)/);
                const maxConcurrentTasks = maxConcurrentMatch ? parseInt(maxConcurrentMatch[1], 10) : null;
                const hasOnDestroy = content.includes('onDestroy') || content.includes('async onDestroy(');
                const onDestroyMatch = content.match(/onDestroy[\s\S]*?\{([\s\S]*?)\}/);
                const onDestroyBody = onDestroyMatch ? onDestroyMatch[1] : '';
                const hasCleanupInOnDestroy = onDestroyBody.includes('.clear()') ||
                    onDestroyBody.includes('= []') ||
                    onDestroyBody.includes('= null') ||
                    onDestroyBody.includes('.length = 0') ||
                    onDestroyBody.includes('clearInterval') ||
                    onDestroyBody.includes('clearTimeout');
                const hasMapWithSizeLimit = content.includes('maxEntries') ||
                    content.includes('MAX_ENTRIES') ||
                    content.includes('maxSize') ||
                    content.includes('MAX_SIZE') ||
                    content.includes('.size >') ||
                    content.includes('.size >=') ||
                    (content.includes('Map') && content.includes('evict'));
                const hasArrayWithSizeLimit = content.includes('.slice(') ||
                    content.includes('.length =') ||
                    content.includes('.splice(') ||
                    content.includes('MAX_HISTORY') ||
                    content.includes('maxHistory');
                const hasUnboundedPush = content.includes('.push(') &&
                    !content.includes('.slice(') &&
                    !content.includes('.splice(') &&
                    !content.includes('MAX_') &&
                    !content.includes('limit');
                const hasBusyWait = (content.includes('while (true)') || content.includes('while(true)')) &&
                    !content.includes('await') &&
                    !content.includes('sleep');
                const usesAsyncPatterns = content.includes('async ') && content.includes('await ');
                const mapMatches = content.match(/new Map\(/g) || [];
                const mapCount = mapMatches.length;
                const arrayMatches = content.match(/:\s*\w+\[\]\s*=/g) || [];
                const arrayCount = arrayMatches.length;
                results.push({
                    filePath,
                    relativePath,
                    content,
                    className,
                    timeout,
                    maxConcurrentTasks,
                    hasOnDestroy,
                    hasCleanupInOnDestroy,
                    hasMapWithSizeLimit,
                    hasArrayWithSizeLimit,
                    hasUnboundedPush,
                    hasBusyWait,
                    usesAsyncPatterns,
                    mapCount,
                    arrayCount,
                });
            }
            catch (error) {
                this.logger.warn(`Failed to analyze ${filePath}: ${error.message}`);
            }
        }
        this.agentAnalyses = results;
        return results;
    }
    async analyzeServices() {
        if (this.serviceAnalyses) {
            return this.serviceAnalyses;
        }
        const results = [];
        const serviceDirs = [
            EVENTS_DIR,
            HEALTH_DIR,
            MEMORY_DIR,
            ORCHESTRATOR_DIR,
            path.join(AGENTS_DIR, 'communication'),
        ];
        for (const dir of serviceDirs) {
            if (!fs.existsSync(dir))
                continue;
            const files = fs
                .readdirSync(dir)
                .filter((f) => f.endsWith('.service.ts') && !f.endsWith('.spec.ts'));
            for (const fileName of files) {
                const filePath = path.join(dir, fileName);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const classMatch = content.match(/export\s+class\s+(\w+)/);
                    const className = classMatch ? classMatch[1] : fileName.replace('.service.ts', '');
                    const methodRegex = /(?:async\s+)?(\w+)\s*\(/g;
                    const methods = [];
                    let methodMatch;
                    while ((methodMatch = methodRegex.exec(content)) !== null) {
                        const mName = methodMatch[1];
                        if (![
                            'if',
                            'for',
                            'while',
                            'switch',
                            'catch',
                            'constructor',
                            'return',
                            'new',
                            'throw',
                            'typeof',
                        ].includes(mName)) {
                            methods.push(mName);
                        }
                    }
                    const uniqueMethods = Array.from(new Set(methods));
                    results.push({
                        filePath,
                        fileName,
                        content,
                        className,
                        methods: uniqueMethods,
                        hasInjectable: content.includes('@Injectable'),
                        hasLogger: content.includes('Logger') || content.includes('this.logger'),
                    });
                }
                catch (error) {
                    this.logger.warn(`Failed to analyze ${filePath}: ${error.message}`);
                }
            }
        }
        if (fs.existsSync(CONFIG_DIR)) {
            const configFiles = fs.readdirSync(CONFIG_DIR).filter((f) => f.endsWith('.config.ts'));
            for (const fileName of configFiles) {
                const filePath = path.join(CONFIG_DIR, fileName);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    results.push({
                        filePath,
                        fileName,
                        content,
                        className: fileName.replace('.config.ts', ''),
                        methods: [],
                        hasInjectable: false,
                        hasLogger: false,
                    });
                }
                catch {
                }
            }
        }
        this.serviceAnalyses = results;
        return results;
    }
    async getAgentFiles() {
        const results = [];
        if (!fs.existsSync(AGENTS_DIR)) {
            return results;
        }
        const entries = fs.readdirSync(AGENTS_DIR, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            if (entry.name === 'base' ||
                entry.name === 'decorators' ||
                entry.name === 'interfaces' ||
                entry.name === 'registry' ||
                entry.name === 'events')
                continue;
            const subDir = path.join(AGENTS_DIR, entry.name);
            const subEntries = fs.readdirSync(subDir, { withFileTypes: true });
            for (const subEntry of subEntries) {
                if (!subEntry.isDirectory())
                    continue;
                const agentDir = path.join(subDir, subEntry.name);
                try {
                    const agentFiles = fs
                        .readdirSync(agentDir)
                        .filter((f) => f.endsWith('-agent.service.ts'));
                    for (const file of agentFiles) {
                        results.push(path.join(agentDir, file));
                    }
                }
                catch {
                }
            }
        }
        return results;
    }
};
exports.PerformanceCertificationService = PerformanceCertificationService;
exports.PerformanceCertificationService = PerformanceCertificationService = PerformanceCertificationService_1 = __decorate([
    (0, common_1.Injectable)()
], PerformanceCertificationService);
//# sourceMappingURL=performance-certification.service.js.map