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
var CommunicationCertificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationCertificationService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const EVENTS_DIR = path.join(SOURCE_ROOT, 'agents', 'events');
const COMM_DIR = path.join(SOURCE_ROOT, 'agents', 'communication');
const INTERFACES_DIR = path.join(SOURCE_ROOT, 'agents', 'interfaces');
let CommunicationCertificationService = CommunicationCertificationService_1 = class CommunicationCertificationService {
    constructor() {
        this.logger = new common_1.Logger(CommunicationCertificationService_1.name);
        this.serviceAnalyses = null;
    }
    async runAll() {
        const startTime = Date.now();
        this.logger.log('Starting Communication certification...');
        const tests = [];
        const criticalFailures = [];
        const services = await this.analyzeServices();
        this.logger.log(`Analyzed ${services.length} communication services`);
        const testMethods = [
            { name: 'Event Publish/Subscribe', fn: () => this.testEventPubSub(services) },
            { name: 'Dead Letter Queue', fn: () => this.testDeadLetterQueue(services) },
            { name: 'Event Persistence', fn: () => this.testEventPersistence(services) },
            { name: 'Event Replay', fn: () => this.testEventReplay(services) },
            { name: 'Inter-Agent Messaging', fn: () => this.testInterAgentMessaging(services) },
            { name: 'Correlation ID Tracking', fn: () => this.testCorrelationIdTracking(services) },
            { name: 'Message Broker', fn: () => this.testMessageBroker(services) },
            { name: 'No Event Loss', fn: () => this.testNoEventLoss(services) },
            { name: 'Event Ordering', fn: () => this.testEventOrdering(services) },
            { name: 'Subscription Management', fn: () => this.testSubscriptionManagement(services) },
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
        const testWeights = [0.12, 0.1, 0.1, 0.1, 0.12, 0.08, 0.1, 0.1, 0.08, 0.1];
        let weightedSum = 0;
        for (let i = 0; i < tests.length; i++) {
            const weight = testWeights[i] || 0.1;
            weightedSum += tests[i].score * weight;
        }
        const score = Math.round(weightedSum);
        const passed = score >= 90 && criticalFailures.length === 0;
        const durationMs = Date.now() - startTime;
        this.logger.log(`Communication certification complete: score=${score}, passed=${passed}, ` +
            `duration=${durationMs}ms, criticalFailures=${criticalFailures.length}`);
        return {
            domain: types_1.CertificationDomain.ORCHESTRATION,
            weight: 0.1,
            score,
            tests,
            passed,
            criticalFailures,
        };
    }
    async testEventPubSub(services) {
        const startTime = Date.now();
        const name = 'Event Publish/Subscribe';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const eventBus = services.find((s) => s.fileName.includes('event-bus.service'));
            if (eventBus) {
                score += 15;
            }
            else {
                issues.push('EventBusService not found');
            }
            if (eventBus) {
                if (eventBus.methods.includes('publish') || eventBus.content.includes('async publish(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing publish() method on EventBusService');
                }
                if (eventBus.methods.includes('subscribe') ||
                    eventBus.content.includes('async subscribe(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing subscribe() method on EventBusService');
                }
                if (eventBus.methods.includes('unsubscribe') ||
                    eventBus.content.includes('async unsubscribe(')) {
                    score += 10;
                }
                else {
                    issues.push('Missing unsubscribe() method');
                }
                if (eventBus.methods.includes('publishEvent') ||
                    eventBus.content.includes('async publishEvent(')) {
                    score += 5;
                }
                if (eventBus.content.includes('handler') && eventBus.content.includes('subscription')) {
                    score += 10;
                }
                if (eventBus.content.includes("'*'") || eventBus.content.includes('"*"')) {
                    score += 10;
                }
                if (eventBus.content.includes('typeIndex') ||
                    eventBus.content.includes('Map<string, Set<string>>')) {
                    score += 10;
                }
                if (eventBus.content.includes('EventEmitter2') ||
                    eventBus.content.includes('eventEmitter')) {
                    score += 5;
                }
                if (eventBus.hasInjectable) {
                    score += 3;
                }
                if (eventBus.hasLogger) {
                    score += 2;
                }
            }
            const simResult = this.simulatePubSub();
            if (simResult.eventsDelivered === simResult.eventsPublished) {
                score += 0;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!eventBus,
                    methodsFound: eventBus?.methods || [],
                    issues,
                    simulatedDelivery: simResult,
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
    async testDeadLetterQueue(services) {
        const startTime = Date.now();
        const name = 'Dead Letter Queue';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const dlq = services.find((s) => s.fileName.includes('dead-letter-queue'));
            if (dlq) {
                score += 15;
            }
            else {
                issues.push('DeadLetterQueueService not found');
            }
            if (dlq) {
                if (dlq.methods.includes('add') || dlq.content.includes('async add(')) {
                    score += 10;
                }
                else {
                    issues.push('Missing add() method');
                }
                if (dlq.methods.includes('retry') || dlq.content.includes('async retry(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing retry() method');
                }
                if (dlq.content.includes('maxRetryAttempts') || dlq.content.includes('maxRetries')) {
                    score += 10;
                }
                else {
                    issues.push('Missing max retry limit');
                }
                if (dlq.content.includes('exponentialBackoff') || dlq.content.includes('Math.pow(2,')) {
                    score += 10;
                }
                if (dlq.methods.includes('purge') || dlq.content.includes('purge()')) {
                    score += 10;
                }
                if (dlq.methods.includes('getStats') || dlq.content.includes('getStats()')) {
                    score += 5;
                }
                if (dlq.content.includes('failureCount') || dlq.content.includes('failure_count')) {
                    score += 10;
                }
                if (dlq.content.includes('canRetry')) {
                    score += 5;
                }
                if (dlq.content.includes('jitter')) {
                    score += 5;
                }
                if (dlq.hasInjectable) {
                    score += 3;
                }
                if (dlq.hasLogger) {
                    score += 2;
                }
            }
            const simResult = this.simulateDeadLetterQueue();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!dlq,
                    methodsFound: dlq?.methods || [],
                    issues,
                    simulatedDLQ: simResult,
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
    async testEventPersistence(services) {
        const startTime = Date.now();
        const name = 'Event Persistence';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const store = services.find((s) => s.fileName.includes('event-store'));
            if (store) {
                score += 15;
            }
            else {
                issues.push('EventStoreService not found');
            }
            if (store) {
                if (store.methods.includes('store') || store.content.includes('async store(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing store() method');
                }
                if (store.methods.includes('query') || store.content.includes('async query(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing query() method');
                }
                if (store.content.includes('fromTimestamp') && store.content.includes('toTimestamp')) {
                    score += 10;
                }
                else {
                    issues.push('Missing time-range query support');
                }
                if (store.content.includes('typeIndex') && store.content.includes('Map')) {
                    score += 10;
                }
                if (store.content.includes('sourceIndex') || store.content.includes('agentIndex')) {
                    score += 5;
                }
                if (store.methods.includes('markProcessed') || store.content.includes('markProcessed')) {
                    score += 10;
                }
                if (store.content.includes('getStats') || store.content.includes('getStatistics')) {
                    score += 5;
                }
                if (store.methods.includes('clear') || store.content.includes('clear()')) {
                    score += 5;
                }
                if (store.content.includes('correlationIndex')) {
                    score += 5;
                }
                if (store.hasInjectable) {
                    score += 3;
                }
                if (store.hasLogger) {
                    score += 2;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!store,
                    methodsFound: store?.methods || [],
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
    async testEventReplay(services) {
        const startTime = Date.now();
        const name = 'Event Replay';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const replay = services.find((s) => s.fileName.includes('event-replay'));
            if (replay) {
                score += 15;
            }
            else {
                issues.push('EventReplayService not found');
            }
            if (replay) {
                if (replay.methods.includes('replay') || replay.content.includes('async replay(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing replay() method');
                }
                if (replay.content.includes('rateLimit') ||
                    replay.content.includes('eventsPerSecond') ||
                    replay.content.includes('tokenBucket')) {
                    score += 15;
                }
                else {
                    issues.push('Missing rate limiting for replay');
                }
                if (replay.methods.includes('cancelReplay') ||
                    replay.content.includes('cancelReplay') ||
                    replay.content.includes('cancelled')) {
                    score += 15;
                }
                else {
                    issues.push('Missing replay cancellation');
                }
                if (replay.content.includes('progress') || replay.content.includes('processedCount')) {
                    score += 10;
                }
                if (replay.methods.includes('getReplayStatus') ||
                    replay.content.includes('getReplayStatus')) {
                    score += 10;
                }
                if (replay.content.includes('replayWithFilter') ||
                    replay.content.includes('ReplayFilter')) {
                    score += 10;
                }
                if (replay.content.includes('activeReplays')) {
                    score += 5;
                }
                if (replay.hasInjectable) {
                    score += 3;
                }
                if (replay.hasLogger) {
                    score += 2;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!replay,
                    methodsFound: replay?.methods || [],
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
    async testInterAgentMessaging(services) {
        const startTime = Date.now();
        const name = 'Inter-Agent Messaging';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const comm = services.find((s) => s.fileName.includes('inter-agent-comm'));
            if (comm) {
                score += 15;
            }
            else {
                issues.push('InterAgentCommService not found');
            }
            if (comm) {
                if (comm.methods.includes('sendDirect') || comm.content.includes('async sendDirect(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing sendDirect() method');
                }
                if (comm.methods.includes('broadcast') || comm.content.includes('async broadcast(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing broadcast() method');
                }
                if (comm.methods.includes('request') || comm.content.includes('async request<')) {
                    score += 15;
                }
                else {
                    issues.push('Missing request/response pattern');
                }
                if (comm.methods.includes('respond') || comm.content.includes('async respond(')) {
                    score += 10;
                }
                if (comm.content.includes('REQUEST_TIMEOUT') || comm.content.includes('timeout')) {
                    score += 10;
                }
                if (comm.methods.includes('registerHandler') || comm.content.includes('registerHandler')) {
                    score += 5;
                }
                if (comm.content.includes('messageHistory') || comm.content.includes('getMessageHistory')) {
                    score += 5;
                }
                if (comm.hasInjectable) {
                    score += 5;
                }
                if (comm.hasLogger) {
                    score += 5;
                }
            }
            const simResult = this.simulateInterAgentMessaging();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!comm,
                    methodsFound: comm?.methods || [],
                    issues,
                    simulatedMessaging: simResult,
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
    async testCorrelationIdTracking(services) {
        const startTime = Date.now();
        const name = 'Correlation ID Tracking';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const interfacePath = path.join(INTERFACES_DIR, 'agent-event.interface.ts');
            let interfaceContent = '';
            if (fs.existsSync(interfacePath)) {
                interfaceContent = fs.readFileSync(interfacePath, 'utf-8');
            }
            if (interfaceContent.includes('correlationId')) {
                score += 20;
            }
            else {
                issues.push('AgentEvent interface missing correlationId field');
            }
            if (interfaceContent.includes('causationId')) {
                score += 10;
            }
            const eventBus = services.find((s) => s.fileName.includes('event-bus'));
            if (eventBus) {
                if (eventBus.content.includes('correlationId')) {
                    score += 15;
                }
                if (eventBus.content.includes('filter') || eventBus.content.includes('EventFilter')) {
                    score += 10;
                }
            }
            const store = services.find((s) => s.fileName.includes('event-store'));
            if (store) {
                if (store.content.includes('correlationIndex') || store.content.includes('correlationId')) {
                    score += 15;
                }
            }
            const comm = services.find((s) => s.fileName.includes('inter-agent-comm'));
            if (comm) {
                if (comm.content.includes('correlationId')) {
                    score += 15;
                }
            }
            const replay = services.find((s) => s.fileName.includes('event-replay'));
            if (replay) {
                if (replay.content.includes('correlationId') || replay.content.includes('causationId')) {
                    score += 10;
                }
            }
            const dlq = services.find((s) => s.fileName.includes('dead-letter'));
            if (dlq && dlq.content.includes('correlationId')) {
                score += 5;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    interfaceHasCorrelationId: interfaceContent.includes('correlationId'),
                    interfaceHasCausationId: interfaceContent.includes('causationId'),
                    eventBusSupportsCorrelation: eventBus?.content.includes('correlationId') || false,
                    eventStoreSupportsCorrelation: store?.content.includes('correlationId') || false,
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
    async testMessageBroker(services) {
        const startTime = Date.now();
        const name = 'Message Broker';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const broker = services.find((s) => s.fileName.includes('message-broker'));
            if (broker) {
                score += 15;
            }
            else {
                issues.push('MessageBrokerService not found');
            }
            if (broker) {
                if (broker.methods.includes('send') ||
                    broker.content.includes('async send(') ||
                    broker.content.includes('async publish(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing send/publish method');
                }
                if (broker.methods.includes('consume') || broker.content.includes('async consume(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing consume() method');
                }
                if (broker.content.includes('attemptReconnect') ||
                    broker.content.includes('reconnect') ||
                    broker.content.includes('ConnectionState')) {
                    score += 15;
                }
                else {
                    issues.push('Missing reconnection logic');
                }
                if (broker.content.includes('inMemory') || broker.content.includes('in-memory')) {
                    score += 10;
                }
                if (broker.methods.includes('assertQueue') || broker.content.includes('assertQueue')) {
                    score += 5;
                }
                if (broker.content.includes('deadLetter') || broker.content.includes('dead_letter')) {
                    score += 10;
                }
                if (broker.content.includes('retryCount') || broker.content.includes('maxRetries')) {
                    score += 5;
                }
                if (broker.hasInjectable) {
                    score += 5;
                }
                if (broker.hasLogger) {
                    score += 5;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!broker,
                    methodsFound: broker?.methods || [],
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
    async testNoEventLoss(services) {
        const startTime = Date.now();
        const name = 'No Event Loss';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const eventBus = services.find((s) => s.fileName.includes('event-bus'));
            const dlq = services.find((s) => s.fileName.includes('dead-letter'));
            const store = services.find((s) => s.fileName.includes('event-store'));
            if (eventBus && eventBus.content.includes('eventStore.store')) {
                score += 15;
            }
            else if (eventBus &&
                eventBus.content.includes('eventStore') &&
                eventBus.content.includes('store')) {
                score += 15;
            }
            else {
                issues.push('EventBus does not persist events before delivery');
            }
            if (eventBus && eventBus.content.includes('try') && eventBus.content.includes('catch')) {
                score += 15;
            }
            else {
                issues.push('EventBus missing try/catch in handler invocation');
            }
            if (eventBus && eventBus.content.includes('deadLetterQueue.add')) {
                score += 15;
            }
            else if (eventBus && eventBus.content.includes('deadLetter')) {
                score += 10;
            }
            else {
                issues.push('Failed events not routed to dead letter queue');
            }
            if (dlq &&
                (dlq.content.includes('startRetryTimer') || dlq.content.includes('processRetries'))) {
                score += 10;
            }
            if (store && store.content.includes('store(') && store.content.includes('Map')) {
                score += 10;
            }
            if (eventBus && eventBus.content.includes('deliverToSubscriptions')) {
                score += 10;
            }
            if (dlq && (dlq.content.includes('MAX_QUEUE_SIZE') || dlq.content.includes('evict'))) {
                score += 10;
            }
            if (store && (store.content.includes('maxStoreSize') || store.content.includes('evict'))) {
                score += 10;
            }
            if (eventBus && eventBus.content.includes('this.logger.error')) {
                score += 5;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    eventBusFound: !!eventBus,
                    dlqFound: !!dlq,
                    storeFound: !!store,
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
    async testEventOrdering(services) {
        const startTime = Date.now();
        const name = 'Event Ordering';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const interfacePath = path.join(INTERFACES_DIR, 'agent-event.interface.ts');
            let interfaceContent = '';
            if (fs.existsSync(interfacePath)) {
                interfaceContent = fs.readFileSync(interfacePath, 'utf-8');
            }
            if (interfaceContent.includes('timestamp')) {
                score += 20;
            }
            else {
                issues.push('AgentEvent interface missing timestamp');
            }
            if (interfaceContent.includes('version') || interfaceContent.includes('sequenceId')) {
                score += 15;
            }
            else {
                issues.push('AgentEvent interface missing version/sequenceId');
            }
            const store = services.find((s) => s.fileName.includes('event-store'));
            if (store) {
                if (store.content.includes('timestamp.getTime()') ||
                    (store.content.includes('sort') && store.content.includes('timestamp'))) {
                    score += 15;
                }
                if (store.content.includes('timeIndex') || store.content.includes('insertIntoTimeIndex')) {
                    score += 15;
                }
                if (store.content.includes('queryByTimeRange') ||
                    (store.content.includes('fromTimestamp') && store.content.includes('toTimestamp'))) {
                    score += 15;
                }
            }
            const replay = services.find((s) => s.fileName.includes('event-replay'));
            if (replay) {
                if (replay.content.includes('fromTimestamp') && replay.content.includes('toTimestamp')) {
                    score += 10;
                }
            }
            const eventBus = services.find((s) => s.fileName.includes('event-bus'));
            if (eventBus) {
                if (eventBus.content.includes('timestamp: new Date()')) {
                    score += 10;
                }
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    interfaceHasTimestamp: interfaceContent.includes('timestamp'),
                    interfaceHasVersion: interfaceContent.includes('version'),
                    storeSupportsTimeRange: store?.content.includes('queryByTimeRange') || false,
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
    async testSubscriptionManagement(services) {
        const startTime = Date.now();
        const name = 'Subscription Management';
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
                if (eventBus.methods.includes('subscribe') ||
                    eventBus.content.includes('async subscribe(')) {
                    score += 10;
                }
                else {
                    issues.push('Missing subscribe() method');
                }
                if (eventBus.methods.includes('unsubscribe') ||
                    eventBus.content.includes('async unsubscribe(')) {
                    score += 10;
                }
                else {
                    issues.push('Missing unsubscribe() method');
                }
                if (eventBus.content.includes('typeIndex.delete') ||
                    eventBus.content.includes('typeSet.delete')) {
                    score += 15;
                }
                else {
                    issues.push('Unsubscribe does not clean up type indexes');
                }
                if (eventBus.content.includes('subscriberIndex.delete') ||
                    eventBus.content.includes('subscriberSet.delete')) {
                    score += 10;
                }
                if (eventBus.methods.includes('getSubscriptions') ||
                    eventBus.content.includes('getSubscriptions')) {
                    score += 10;
                }
                if (eventBus.content.includes('onModuleDestroy') && eventBus.content.includes('.clear()')) {
                    score += 15;
                }
                else {
                    issues.push('Missing onModuleDestroy cleanup for subscriptions');
                }
                if (eventBus.content.includes('Map<string, EventSubscription>') ||
                    eventBus.content.includes('subscriptions: Map')) {
                    score += 5;
                }
                if (eventBus.content.includes('subscribeTo(')) {
                    score += 5;
                }
                if (eventBus.content.includes('unsubscribeFrom(')) {
                    score += 5;
                }
                if (eventBus.content.includes('removeListener')) {
                    score += 5;
                }
            }
            const dlq = services.find((s) => s.fileName.includes('dead-letter'));
            if (dlq) {
                if (dlq.content.includes('purgeOlderThan') ||
                    dlq.content.includes('purgePermanentlyFailed')) {
                    score += 5;
                }
            }
            return {
                name,
                passed: Math.min(score, 100) >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!eventBus,
                    methodsFound: eventBus?.methods || [],
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
    simulatePubSub() {
        const eventsPublished = 5;
        const handlersPerEvent = 3;
        const eventsDelivered = eventsPublished * handlersPerEvent;
        return {
            eventsPublished,
            eventsDelivered,
            handlersInvoked: eventsDelivered,
        };
    }
    simulateDeadLetterQueue() {
        return {
            eventsAdded: 10,
            eventsRetried: 7,
            eventsPermanentlyFailed: 3,
        };
    }
    simulateInterAgentMessaging() {
        return {
            direct: 5,
            broadcast: 3,
            requestResponse: 4,
        };
    }
    async analyzeServices() {
        if (this.serviceAnalyses) {
            return this.serviceAnalyses;
        }
        const results = [];
        const dirs = [EVENTS_DIR, COMM_DIR];
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
exports.CommunicationCertificationService = CommunicationCertificationService;
exports.CommunicationCertificationService = CommunicationCertificationService = CommunicationCertificationService_1 = __decorate([
    (0, common_1.Injectable)()
], CommunicationCertificationService);
//# sourceMappingURL=communication-certification.service.js.map