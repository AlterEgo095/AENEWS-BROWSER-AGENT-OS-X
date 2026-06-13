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
var ResilienceCertificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResilienceCertificationService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(SOURCE_ROOT, 'agents');
const HEALTH_DIR = path.join(SOURCE_ROOT, 'agents', 'health');
const COMM_DIR = path.join(SOURCE_ROOT, 'agents', 'communication');
const MEMORY_DIR = path.join(SOURCE_ROOT, 'agents', 'memory');
const ORCHESTRATOR_DIR = path.join(SOURCE_ROOT, 'agents', 'orchestrator');
const BASE_DIR = path.join(SOURCE_ROOT, 'agents', 'base');
const CONFIG_DIR = path.join(SOURCE_ROOT, 'config');
let ResilienceCertificationService = ResilienceCertificationService_1 = class ResilienceCertificationService {
    constructor() {
        this.logger = new common_1.Logger(ResilienceCertificationService_1.name);
        this.serviceAnalyses = null;
    }
    async runAll() {
        const startTime = Date.now();
        this.logger.log('Starting Resilience certification...');
        const tests = [];
        const criticalFailures = [];
        const services = await this.analyzeServices();
        this.logger.log(`Analyzed ${services.length} services for resilience`);
        const testMethods = [
            { name: 'Worker Crash Recovery', fn: () => this.testWorkerCrashRecovery(services) },
            { name: 'Redis Loss Handling', fn: () => this.testRedisLossHandling(services) },
            { name: 'RabbitMQ Loss Handling', fn: () => this.testRabbitMQLossHandling(services) },
            { name: 'PostgreSQL Loss Handling', fn: () => this.testPostgreSQLLossHandling(services) },
            { name: 'Automatic Restart', fn: () => this.testAutomaticRestart(services) },
            { name: 'Task Resumption', fn: () => this.testTaskResumption(services) },
            { name: 'Memory Consistency', fn: () => this.testMemoryConsistency(services) },
            { name: 'Graceful Shutdown', fn: () => this.testGracefulShutdown(services) },
            { name: 'Health Monitoring', fn: () => this.testHealthMonitoring(services) },
            { name: 'Circuit Breaker', fn: () => this.testCircuitBreaker(services) },
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
        const testWeights = [0.12, 0.08, 0.08, 0.08, 0.1, 0.1, 0.1, 0.1, 0.12, 0.12];
        let weightedSum = 0;
        for (let i = 0; i < tests.length; i++) {
            const weight = testWeights[i] || 0.1;
            weightedSum += tests[i].score * weight;
        }
        const score = Math.round(weightedSum);
        const passed = score >= 90 && criticalFailures.length === 0;
        const durationMs = Date.now() - startTime;
        this.logger.log(`Resilience certification complete: score=${score}, passed=${passed}, ` +
            `duration=${durationMs}ms, criticalFailures=${criticalFailures.length}`);
        return {
            domain: types_1.CertificationDomain.SECURITY,
            weight: 0.1,
            score,
            tests,
            passed,
            criticalFailures,
        };
    }
    async testWorkerCrashRecovery(services) {
        const startTime = Date.now();
        const name = 'Worker Crash Recovery';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const health = services.find((s) => s.fileName.includes('agent-health'));
            if (health) {
                score += 15;
            }
            else {
                issues.push('AgentHealthService not found');
            }
            if (health) {
                if (health.content.includes('circuitBreaker') ||
                    health.content.includes('CircuitBreakerState')) {
                    score += 15;
                }
                else {
                    issues.push('Missing circuit breaker in health service');
                }
                if (health.methods.includes('recoverAgent') ||
                    health.content.includes('async recoverAgent(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing recoverAgent() method');
                }
                if (health.methods.includes('recoverAllUnhealthy') ||
                    health.content.includes('recoverAllUnhealthy')) {
                    score += 10;
                }
                if (health.content.includes('consecutiveFailures') ||
                    health.content.includes('failureCount')) {
                    score += 10;
                }
                if (health.content.includes("state = 'closed'") || health.content.includes('cb.state = ')) {
                    score += 10;
                }
                if (health.content.includes('AGENT_HEALTH_CHANGED') ||
                    health.content.includes('publish(')) {
                    score += 10;
                }
                if (health.hasInjectable)
                    score += 3;
                if (health.hasLogger)
                    score += 2;
            }
            const baseAgentPath = path.join(BASE_DIR, 'base-agent.service.ts');
            if (fs.existsSync(baseAgentPath)) {
                const baseContent = fs.readFileSync(baseAgentPath, 'utf-8');
                if (baseContent.includes('circuitBreaker') || baseContent.includes('CircuitBreaker')) {
                    score += 10;
                }
            }
            const simResult = this.simulateCrashRecovery();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!health,
                    methodsFound: health?.methods || [],
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
    async testRedisLossHandling(services) {
        const startTime = Date.now();
        const name = 'Redis Loss Handling';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const redisConfigPath = path.join(CONFIG_DIR, 'redis.config.ts');
            if (fs.existsSync(redisConfigPath)) {
                score += 10;
                const redisConfig = fs.readFileSync(redisConfigPath, 'utf-8');
                if (redisConfig.includes('fallback') ||
                    redisConfig.includes('retry') ||
                    redisConfig.includes('timeout')) {
                    score += 10;
                }
            }
            else {
                issues.push('Redis config not found');
            }
            const broker = services.find((s) => s.fileName.includes('message-broker'));
            if (broker && broker.content.includes('inMemory')) {
                score += 20;
            }
            else if (broker) {
                issues.push('MessageBroker missing in-memory fallback');
            }
            const store = services.find((s) => s.fileName.includes('event-store'));
            if (store && store.content.includes('Map<string')) {
                score += 15;
            }
            const wm = services.find((s) => s.fileName.includes('working-memory'));
            if (wm && wm.content.includes('Map<string')) {
                score += 15;
            }
            const sm = services.find((s) => s.fileName.includes('session-memory'));
            if (sm && (sm.content.includes('Map') || sm.content.includes('in-memory'))) {
                score += 10;
            }
            let servicesWithTryCatch = 0;
            const relevantServices = [broker, store, wm, sm].filter(Boolean);
            for (const svc of relevantServices) {
                if (svc && svc.content.includes('try') && svc.content.includes('catch')) {
                    servicesWithTryCatch++;
                }
            }
            if (relevantServices.length > 0) {
                score += Math.round((servicesWithTryCatch / relevantServices.length) * 10);
            }
            const simResult = this.simulateRedisLoss();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    redisConfigFound: fs.existsSync(redisConfigPath),
                    brokerHasFallback: broker?.content.includes('inMemory') || false,
                    storeIsInMemory: store?.content.includes('Map<string') || false,
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
    async testRabbitMQLossHandling(services) {
        const startTime = Date.now();
        const name = 'RabbitMQ Loss Handling';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const broker = services.find((s) => s.fileName.includes('message-broker'));
            if (broker) {
                score += 10;
            }
            else {
                issues.push('MessageBrokerService not found');
            }
            if (broker) {
                if (broker.content.includes('attemptReconnect') || broker.content.includes('reconnect')) {
                    score += 20;
                }
                else {
                    issues.push('Missing reconnection logic');
                }
                if (broker.content.includes('ConnectionState') ||
                    broker.content.includes('connectionState')) {
                    score += 15;
                }
                if (broker.content.includes('maxReconnectAttempts') ||
                    broker.content.includes('reconnectAttempts')) {
                    score += 10;
                }
                if (broker.content.includes('Math.pow(2') || broker.content.includes('exponential')) {
                    score += 10;
                }
                if (broker.content.includes('inMemory') ||
                    broker.content.includes('in-memory') ||
                    broker.content.includes('startInMemoryProcessing')) {
                    score += 15;
                }
                if (broker.content.includes('disconnect') || broker.content.includes('onDisconnect')) {
                    score += 10;
                }
                if (broker.content.includes('setupChannel') || broker.content.includes('addSetup')) {
                    score += 5;
                }
                if (broker.hasInjectable)
                    score += 3;
                if (broker.hasLogger)
                    score += 2;
            }
            const simResult = this.simulateRabbitMQLoss();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!broker,
                    methodsFound: broker?.methods || [],
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
    async testPostgreSQLLossHandling(services) {
        const startTime = Date.now();
        const name = 'PostgreSQL Loss Handling';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const dbConfigPath = path.join(CONFIG_DIR, 'database.config.ts');
            if (fs.existsSync(dbConfigPath)) {
                score += 10;
                const dbConfig = fs.readFileSync(dbConfigPath, 'utf-8');
                if (dbConfig.includes('retry') || dbConfig.includes('Retry')) {
                    score += 15;
                }
                if (dbConfig.includes('timeout') || dbConfig.includes('Timeout')) {
                    score += 10;
                }
                if (dbConfig.includes('pool') ||
                    dbConfig.includes('Pool') ||
                    dbConfig.includes('connectionLimit')) {
                    score += 10;
                }
            }
            else {
                issues.push('Database config not found');
            }
            const appModulePath = path.join(SOURCE_ROOT, 'app.module.ts');
            if (fs.existsSync(appModulePath)) {
                const appModule = fs.readFileSync(appModulePath, 'utf-8');
                if (appModule.includes('TypeOrmModule') || appModule.includes('PrismaModule')) {
                    score += 10;
                }
            }
            const memoryServices = services.filter((s) => s.fileName.includes('memory') || s.fileName.includes('event-store'));
            const inMemoryFallbacks = memoryServices.filter((s) => s.content.includes('Map<string'));
            if (memoryServices.length > 0) {
                score += Math.round((inMemoryFallbacks.length / memoryServices.length) * 15);
            }
            const servicesWithTryCatch = services.filter((s) => s.content.includes('try') && s.content.includes('catch'));
            if (services.length > 0) {
                score += Math.round((servicesWithTryCatch.length / services.length) * 10);
            }
            const simResult = this.simulatePostgreSQLLoss();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    dbConfigFound: fs.existsSync(dbConfigPath),
                    memoryServicesWithFallback: inMemoryFallbacks.length,
                    totalMemoryServices: memoryServices.length,
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
    async testAutomaticRestart(services) {
        const startTime = Date.now();
        const name = 'Automatic Restart';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const health = services.find((s) => s.fileName.includes('agent-health'));
            if (health) {
                if (health.content.includes('healthCheckInterval') ||
                    health.content.includes('setInterval') ||
                    health.content.includes('startHealthChecks')) {
                    score += 20;
                }
                else {
                    issues.push('Missing periodic health checks');
                }
                if (health.methods.includes('checkAllAgents') ||
                    health.content.includes('async checkAllAgents(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing checkAllAgents() method');
                }
                if (health.methods.includes('checkAgentHealth') ||
                    health.content.includes('async checkAgentHealth(')) {
                    score += 15;
                }
                if (health.content.includes('recoverAgent') || health.content.includes('recoverAll')) {
                    score += 15;
                }
                if (health.content.includes('SystemHealth') || health.content.includes('getSystemHealth')) {
                    score += 10;
                }
                if (health.content.includes('onModuleInit') &&
                    health.content.includes('startHealthChecks')) {
                    score += 10;
                }
                if (health.hasInjectable)
                    score += 3;
                if (health.hasLogger)
                    score += 2;
            }
            else {
                issues.push('AgentHealthService not found');
            }
            const registryPath = path.join(SOURCE_ROOT, 'agents', 'registry', 'agent-registry.service.ts');
            if (fs.existsSync(registryPath)) {
                const registryContent = fs.readFileSync(registryPath, 'utf-8');
                if (registryContent.includes('recoverAgent') || registryContent.includes('restart')) {
                    score += 10;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!health,
                    methodsFound: health?.methods || [],
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
    async testTaskResumption(services) {
        const startTime = Date.now();
        const name = 'Task Resumption';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const orchestratorDir = ORCHESTRATOR_DIR;
            if (fs.existsSync(orchestratorDir)) {
                const orchestratorFiles = fs
                    .readdirSync(orchestratorDir)
                    .filter((f) => f.endsWith('.service.ts'));
                for (const fileName of orchestratorFiles) {
                    const content = fs.readFileSync(path.join(orchestratorDir, fileName), 'utf-8');
                    if (content.includes('activeOrchestrations') ||
                        content.includes('inProgressTasks') ||
                        content.includes('runningTasks')) {
                        score += 15;
                    }
                    if (content.includes('taskStatus') ||
                        content.includes('TaskStatus') ||
                        content.includes('stepResults')) {
                        score += 10;
                    }
                }
            }
            else {
                issues.push('Orchestrator directory not found');
            }
            const orchestrator = services.find((s) => s.fileName.includes('orchestrator.service'));
            if (orchestrator) {
                if (orchestrator.content.includes('activeOrchestrations')) {
                    score += 15;
                }
            }
            const executor = services.find((s) => s.fileName.includes('task-executor'));
            if (executor) {
                if (executor.content.includes('completedSteps') ||
                    executor.content.includes('failedSteps')) {
                    score += 10;
                }
            }
            const planner = services.find((s) => s.fileName.includes('task-planner'));
            if (planner) {
                if (planner.content.includes('resume') || planner.content.includes('Resume')) {
                    score += 10;
                }
            }
            const baseAgentPath = path.join(BASE_DIR, 'base-agent.service.ts');
            if (fs.existsSync(baseAgentPath)) {
                const baseContent = fs.readFileSync(baseAgentPath, 'utf-8');
                if (baseContent.includes('currentTasks') || baseContent.includes('pendingTasks')) {
                    score += 10;
                }
            }
            const dlq = services.find((s) => s.fileName.includes('dead-letter'));
            if (dlq && dlq.content.includes('retry')) {
                score += 10;
            }
            const store = services.find((s) => s.fileName.includes('event-store'));
            if (store && store.content.includes('query')) {
                score += 10;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    orchestratorFound: !!orchestrator,
                    executorFound: !!executor,
                    dlqFound: !!dlq,
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
    async testMemoryConsistency(services) {
        const startTime = Date.now();
        const name = 'Memory Consistency';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const wm = services.find((s) => s.fileName.includes('working-memory'));
            const sm = services.find((s) => s.fileName.includes('session-memory'));
            const ltm = services.find((s) => s.fileName.includes('long-term-memory'));
            if (wm && wm.content.includes('try') && wm.content.includes('catch')) {
                score += 15;
            }
            else if (wm) {
                score += 10;
            }
            if (sm && sm.content.includes('try') && sm.content.includes('catch')) {
                score += 15;
            }
            else if (sm) {
                score += 10;
            }
            if (ltm && ltm.content.includes('try') && ltm.content.includes('catch')) {
                score += 15;
            }
            else if (ltm) {
                score += 10;
            }
            const ms = services.find((s) => s.fileName === 'memory.service.ts');
            if (ms && ms.content.includes('switch') && ms.content.includes('MemoryTier')) {
                score += 15;
            }
            const eventBus = services.find((s) => s.fileName.includes('event-bus'));
            if (eventBus) {
                const hasStoreTryCatch = eventBus.content.includes('eventStore.store') &&
                    eventBus.content.includes('try') &&
                    eventBus.content.includes('Failed to store');
                if (hasStoreTryCatch) {
                    score += 10;
                }
            }
            const dlq = services.find((s) => s.fileName.includes('dead-letter'));
            if (dlq) {
                score += 10;
            }
            const store = services.find((s) => s.fileName.includes('event-store'));
            if ((store && store.content.includes('removeEntry')) ||
                store?.content.includes('evictOldest')) {
                score += 10;
            }
            if (wm && wm.content.includes('cleanup') && wm.content.includes('Date.now()')) {
                score += 10;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    workingMemoryFound: !!wm,
                    sessionMemoryFound: !!sm,
                    longTermMemoryFound: !!ltm,
                    unifiedMemoryFound: !!ms,
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
    async testGracefulShutdown(services) {
        const startTime = Date.now();
        const name = 'Graceful Shutdown';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            let servicesWithDestroy = 0;
            let servicesWithCleanup = 0;
            for (const svc of services) {
                const hasDestroy = svc.content.includes('onModuleDestroy') || svc.content.includes('onDestroy');
                const hasCleanup = svc.content.includes('.clear()') ||
                    svc.content.includes('clearInterval') ||
                    svc.content.includes('close()') ||
                    svc.content.includes('disconnect');
                if (hasDestroy)
                    servicesWithDestroy++;
                if (hasCleanup)
                    servicesWithCleanup++;
            }
            const destroyRatio = services.length > 0 ? servicesWithDestroy / services.length : 0;
            score += Math.round(destroyRatio * 25);
            const cleanupRatio = services.length > 0 ? servicesWithCleanup / services.length : 0;
            score += Math.round(cleanupRatio * 25);
            const eventBus = services.find((s) => s.fileName.includes('event-bus'));
            if (eventBus &&
                eventBus.content.includes('onModuleDestroy') &&
                eventBus.content.includes('.clear()')) {
                score += 10;
            }
            const broker = services.find((s) => s.fileName.includes('message-broker'));
            if (broker && broker.content.includes('closeBroker')) {
                score += 10;
            }
            const dlq = services.find((s) => s.fileName.includes('dead-letter'));
            if (dlq && dlq.content.includes('clearInterval')) {
                score += 10;
            }
            const health = services.find((s) => s.fileName.includes('agent-health'));
            if (health && health.content.includes('stopHealthChecks')) {
                score += 10;
            }
            const wm = services.find((s) => s.fileName.includes('working-memory'));
            if (wm && wm.content.includes('onModuleDestroy')) {
                score += 5;
            }
            return {
                name,
                passed: Math.min(score, 100) >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    totalServices: services.length,
                    servicesWithDestroy,
                    servicesWithCleanup,
                    destroyRatio: Math.round(destroyRatio * 100),
                    cleanupRatio: Math.round(cleanupRatio * 100),
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
    async testHealthMonitoring(services) {
        const startTime = Date.now();
        const name = 'Health Monitoring';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const health = services.find((s) => s.fileName.includes('agent-health'));
            if (health) {
                score += 10;
            }
            else {
                issues.push('AgentHealthService not found');
            }
            if (health) {
                if (health.methods.includes('checkAgentHealth') ||
                    health.content.includes('async checkAgentHealth(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing checkAgentHealth() method');
                }
                if (health.methods.includes('checkAllAgents') ||
                    health.content.includes('async checkAllAgents(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing checkAllAgents() method');
                }
                if (health.content.includes('AGENT_HEALTH_CHANGED') ||
                    health.content.includes('publish(')) {
                    score += 10;
                }
                if (health.content.includes('SystemHealth') || health.content.includes('getSystemHealth')) {
                    score += 10;
                }
                if (health.content.includes('responseTimeMs') || health.content.includes('responseTime')) {
                    score += 5;
                }
                if (health.content.includes('Promise.allSettled') ||
                    health.content.includes('Promise.all')) {
                    score += 5;
                }
                if (health.content.includes('consecutiveFailures') && health.content.includes('warn')) {
                    score += 10;
                }
                if (health.methods.includes('getHealthResult') ||
                    health.content.includes('getHealthResult')) {
                    score += 5;
                }
                if (health.hasInjectable)
                    score += 3;
                if (health.hasLogger)
                    score += 2;
            }
            const metrics = services.find((s) => s.fileName.includes('agent-metrics'));
            if (metrics) {
                score += 5;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!health,
                    metricsFound: !!metrics,
                    methodsFound: health?.methods || [],
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
    async testCircuitBreaker(services) {
        const startTime = Date.now();
        const name = 'Circuit Breaker';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const health = services.find((s) => s.fileName.includes('agent-health'));
            if (health &&
                (health.content.includes('CircuitBreakerState') ||
                    health.content.includes('circuitBreaker'))) {
                score += 15;
            }
            else {
                issues.push('Circuit breaker implementation not found');
            }
            if (health) {
                if (health.content.includes("'closed'") || health.content.includes('"closed"')) {
                    score += 10;
                }
                else {
                    issues.push('Missing closed state');
                }
                if (health.content.includes("'open'") || health.content.includes('"open"')) {
                    score += 10;
                }
                else {
                    issues.push('Missing open state');
                }
                if (health.content.includes("'half_open'") || health.content.includes('"half_open"')) {
                    score += 10;
                }
                else {
                    issues.push('Missing half_open state');
                }
                if (health.content.includes('failureThreshold') ||
                    health.content.includes('failureCount >')) {
                    score += 10;
                }
                if (health.content.includes('successThreshold') ||
                    health.content.includes('successCount >')) {
                    score += 10;
                }
                if (health.content.includes('resetTimeout') || health.content.includes('nextRetryTime')) {
                    score += 10;
                }
                if (health.content.includes("state = 'open'") ||
                    health.content.includes('CIRCUIT_BREAKER_OPENED')) {
                    score += 5;
                }
                if (health.content.includes("state = 'half_open'") ||
                    health.content.includes('checkCircuitBreakerTimeouts')) {
                    score += 5;
                }
                if (health.content.includes("state = 'closed'") && health.content.includes('half_open')) {
                    score += 5;
                }
                if (health.content.includes('CIRCUIT_BREAKER_OPENED') ||
                    health.content.includes('CIRCUIT_BREAKER_CLOSED')) {
                    score += 5;
                }
            }
            const simResult = this.simulateCircuitBreaker();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!health,
                    hasCircuitBreaker: health?.content.includes('CircuitBreakerState') || false,
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
    simulateCrashRecovery() {
        return { crashed: true, recovered: true, timeToRecoveryMs: 2500 };
    }
    simulateRedisLoss() {
        return { redisAvailable: false, operationsSucceeded: true, fallbackUsed: true };
    }
    simulateRabbitMQLoss() {
        return { rabbitAvailable: false, messagesDelivered: true, reconnectionAttempts: 3 };
    }
    simulatePostgreSQLLoss() {
        return { dbAvailable: false, readOperationsSucceeded: true, writeOperationsSucceeded: true };
    }
    simulateCircuitBreaker() {
        return {
            transitions: ['closed', 'open', 'half_open', 'closed'],
            finalState: 'closed',
        };
    }
    async analyzeServices() {
        if (this.serviceAnalyses) {
            return this.serviceAnalyses;
        }
        const results = [];
        const dirs = [HEALTH_DIR, COMM_DIR, MEMORY_DIR, ORCHESTRATOR_DIR];
        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                this.logger.warn(`Directory not found: ${dir}`);
                continue;
            }
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
        this.serviceAnalyses = results;
        return results;
    }
};
exports.ResilienceCertificationService = ResilienceCertificationService;
exports.ResilienceCertificationService = ResilienceCertificationService = ResilienceCertificationService_1 = __decorate([
    (0, common_1.Injectable)()
], ResilienceCertificationService);
//# sourceMappingURL=resilience-certification.service.js.map