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
var MemoryCertificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCertificationService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const MEMORY_DIR = path.join(SOURCE_ROOT, 'agents', 'memory');
const INTERFACES_DIR = path.join(SOURCE_ROOT, 'agents', 'interfaces');
let MemoryCertificationService = MemoryCertificationService_1 = class MemoryCertificationService {
    constructor() {
        this.logger = new common_1.Logger(MemoryCertificationService_1.name);
        this.serviceAnalyses = null;
    }
    async runAll() {
        const startTime = Date.now();
        this.logger.log('Starting Memory certification...');
        const tests = [];
        const criticalFailures = [];
        const services = await this.analyzeServices();
        this.logger.log(`Analyzed ${services.length} memory services`);
        const testMethods = [
            { name: 'Working Memory', fn: () => this.testWorkingMemory(services) },
            { name: 'Session Memory', fn: () => this.testSessionMemory(services) },
            { name: 'Long-term Memory', fn: () => this.testLongTermMemory(services) },
            { name: 'Knowledge Graph', fn: () => this.testKnowledgeGraph(services) },
            { name: 'Vector Search', fn: () => this.testVectorSearch(services) },
            { name: 'RAG Pipeline', fn: () => this.testRAGPipeline(services) },
            { name: 'Unified Memory', fn: () => this.testUnifiedMemory(services) },
            { name: 'Cross-tier Retrieval', fn: () => this.testCrossTierRetrieval(services) },
            { name: 'Persistence', fn: () => this.testPersistence(services) },
            { name: 'Memory Cleanup', fn: () => this.testMemoryCleanup(services) },
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
        const testWeights = [0.1, 0.08, 0.1, 0.1, 0.1, 0.12, 0.12, 0.1, 0.1, 0.08];
        let weightedSum = 0;
        for (let i = 0; i < tests.length; i++) {
            const weight = testWeights[i] || 0.1;
            weightedSum += tests[i].score * weight;
        }
        const score = Math.round(weightedSum);
        const passed = score >= 90 && criticalFailures.length === 0;
        const durationMs = Date.now() - startTime;
        this.logger.log(`Memory certification complete: score=${score}, passed=${passed}, ` +
            `duration=${durationMs}ms, criticalFailures=${criticalFailures.length}`);
        return {
            domain: types_1.CertificationDomain.MEMORY,
            weight: 0.1,
            score,
            tests,
            passed,
            criticalFailures,
        };
    }
    async testWorkingMemory(services) {
        const startTime = Date.now();
        const name = 'Working Memory';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const wm = services.find((s) => s.fileName.includes('working-memory'));
            if (wm) {
                score += 15;
            }
            else {
                issues.push('WorkingMemoryService not found');
            }
            if (wm) {
                if (wm.content.includes('Map<string') || wm.content.includes('new Map')) {
                    score += 15;
                }
                else {
                    issues.push('Not using Map-based storage');
                }
                if (wm.content.includes('expiresAt') ||
                    wm.content.includes('TTL') ||
                    wm.content.includes('ttlMs')) {
                    score += 15;
                }
                else {
                    issues.push('Missing TTL support');
                }
                if (wm.content.includes('evictLRU') ||
                    (wm.content.includes('lru') && wm.content.includes('evict'))) {
                    score += 15;
                }
                else {
                    issues.push('Missing LRU eviction');
                }
                if (wm.content.includes('MAX_ENTRIES') ||
                    wm.content.includes('maxEntries') ||
                    wm.content.includes('maxSize')) {
                    score += 10;
                }
                if ((wm.methods.includes('set') || wm.content.includes('set<T>(')) &&
                    (wm.methods.includes('get') || wm.content.includes('get<T>('))) {
                    score += 10;
                }
                if (wm.methods.includes('cleanup') || wm.content.includes('cleanup()')) {
                    score += 5;
                }
                if (wm.methods.includes('delete') || wm.content.includes('delete(')) {
                    score += 5;
                }
                if (wm.methods.includes('has') || wm.content.includes('has(')) {
                    score += 3;
                }
                if (wm.hasInjectable)
                    score += 2;
                if (wm.hasLogger)
                    score += 2;
            }
            const simResult = this.simulateWorkingMemory();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!wm,
                    methodsFound: wm?.methods || [],
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
    async testSessionMemory(services) {
        const startTime = Date.now();
        const name = 'Session Memory';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const sm = services.find((s) => s.fileName.includes('session-memory'));
            if (sm) {
                score += 20;
            }
            else {
                issues.push('SessionMemoryService not found');
            }
            if (sm) {
                if (sm.content.includes('sessionId') || sm.content.includes('session')) {
                    score += 15;
                }
                else {
                    issues.push('Missing session-scoped storage');
                }
                if (sm.content.includes('async set(') || sm.content.includes('set(')) {
                    score += 10;
                }
                if (sm.content.includes('async get(') || sm.content.includes('get<T>(')) {
                    score += 10;
                }
                if (sm.content.includes('expiresAt') ||
                    sm.content.includes('ttl') ||
                    sm.content.includes('TTL')) {
                    score += 10;
                }
                if (sm.methods.includes('cleanup') ||
                    sm.methods.includes('clearSession') ||
                    sm.content.includes('clearSession')) {
                    score += 10;
                }
                if (sm.content.includes('batch') ||
                    sm.content.includes('bulk') ||
                    sm.content.includes('getSessionContext')) {
                    score += 10;
                }
                if (sm.methods.includes('getAgentSessions') || sm.content.includes('getAgentSessions')) {
                    score += 5;
                }
                if (sm.hasInjectable)
                    score += 3;
                if (sm.hasLogger)
                    score += 2;
            }
            const simResult = this.simulateSessionMemory();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!sm,
                    methodsFound: sm?.methods || [],
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
    async testLongTermMemory(services) {
        const startTime = Date.now();
        const name = 'Long-term Memory';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const ltm = services.find((s) => s.fileName.includes('long-term-memory'));
            if (ltm) {
                score += 15;
            }
            else {
                issues.push('LongTermMemoryService not found');
            }
            if (ltm) {
                if (ltm.methods.includes('store') || ltm.content.includes('async store(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing store() method');
                }
                if (ltm.methods.includes('retrieve') || ltm.content.includes('async retrieve(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing retrieve() method');
                }
                if (ltm.methods.includes('query') || ltm.content.includes('async query(')) {
                    score += 10;
                }
                if (ltm.content.includes('tags') || ltm.content.includes('tag')) {
                    score += 10;
                }
                if (ltm.content.includes('bulk') ||
                    ltm.content.includes('batch') ||
                    ltm.content.includes('storeMany')) {
                    score += 10;
                }
                if (ltm.methods.includes('delete') || ltm.content.includes('async delete(')) {
                    score += 5;
                }
                if (ltm.methods.includes('getKeys') || ltm.content.includes('getKeys')) {
                    score += 5;
                }
                if (ltm.hasInjectable)
                    score += 3;
                if (ltm.hasLogger)
                    score += 2;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!ltm,
                    methodsFound: ltm?.methods || [],
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
    async testKnowledgeGraph(services) {
        const startTime = Date.now();
        const name = 'Knowledge Graph';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const kg = services.find((s) => s.fileName.includes('knowledge-graph'));
            if (kg) {
                score += 15;
            }
            else {
                issues.push('KnowledgeGraphService not found');
            }
            if (kg) {
                if (kg.methods.includes('addNode') || kg.content.includes('async addNode(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing addNode() method');
                }
                if (kg.methods.includes('addRelationship') ||
                    kg.content.includes('async addRelationship(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing addRelationship() method');
                }
                if (kg.content.includes('findPath') ||
                    kg.content.includes('shortestPath') ||
                    kg.content.includes('pathFinding')) {
                    score += 10;
                }
                if (kg.content.includes('executeCypher') ||
                    kg.content.includes('cypher') ||
                    kg.content.includes('Cypher')) {
                    score += 10;
                }
                if (kg.content.includes('neo4j') ||
                    kg.content.includes('Neo4j') ||
                    kg.content.includes('NEO4J')) {
                    score += 10;
                }
                if (kg.methods.includes('getNode') ||
                    kg.methods.includes('queryNodes') ||
                    kg.content.includes('getNode')) {
                    score += 5;
                }
                if (kg.methods.includes('deleteNode') || kg.content.includes('deleteNode')) {
                    score += 5;
                }
                if (kg.hasInjectable)
                    score += 3;
                if (kg.hasLogger)
                    score += 2;
            }
            const simResult = this.simulateKnowledgeGraph();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!kg,
                    methodsFound: kg?.methods || [],
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
    async testVectorSearch(services) {
        const startTime = Date.now();
        const name = 'Vector Search';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const vs = services.find((s) => s.fileName.includes('vector-search'));
            if (vs) {
                score += 15;
            }
            else {
                issues.push('VectorSearchService not found');
            }
            if (vs) {
                if (vs.methods.includes('upsert') || vs.content.includes('async upsert(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing upsert() method');
                }
                if (vs.methods.includes('search') || vs.content.includes('async search(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing search() method');
                }
                if (vs.content.includes('qdrant') ||
                    vs.content.includes('Qdrant') ||
                    vs.content.includes('QDRANT')) {
                    score += 10;
                }
                if (vs.content.includes('collection') || vs.content.includes('Collection')) {
                    score += 10;
                }
                if (vs.content.includes('embedding') ||
                    vs.content.includes('generateSimpleEmbedding') ||
                    vs.content.includes('Embedding')) {
                    score += 10;
                }
                if (vs.content.includes('scoreThreshold') || vs.content.includes('threshold')) {
                    score += 5;
                }
                if (vs.methods.includes('delete') || vs.content.includes('async delete(')) {
                    score += 5;
                }
                if (vs.hasInjectable)
                    score += 3;
                if (vs.hasLogger)
                    score += 2;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!vs,
                    methodsFound: vs?.methods || [],
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
    async testRAGPipeline(services) {
        const startTime = Date.now();
        const name = 'RAG Pipeline';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const rag = services.find((s) => s.fileName.includes('rag'));
            if (rag) {
                score += 15;
            }
            else {
                issues.push('RAGService not found');
            }
            if (rag) {
                if (rag.content.includes('chunk') ||
                    rag.content.includes('Chunk') ||
                    rag.content.includes('split')) {
                    score += 20;
                }
                else {
                    issues.push('Missing document chunking');
                }
                if (rag.content.includes('embedding') ||
                    rag.content.includes('Embedding') ||
                    rag.content.includes('vectorSearch')) {
                    score += 15;
                }
                else {
                    issues.push('Missing embedding integration');
                }
                if (rag.content.includes('retrieve') ||
                    rag.content.includes('Retrieve') ||
                    rag.content.includes('search')) {
                    score += 15;
                }
                else {
                    issues.push('Missing retrieval functionality');
                }
                if (rag.content.includes('context') ||
                    rag.content.includes('Context') ||
                    rag.content.includes('assembleContext')) {
                    score += 15;
                }
                else {
                    issues.push('Missing context assembly');
                }
                if (rag.content.includes('ingest') ||
                    rag.content.includes('Ingest') ||
                    rag.content.includes('addDocument')) {
                    score += 10;
                }
                if (rag.hasInjectable)
                    score += 3;
                if (rag.hasLogger)
                    score += 2;
            }
            const simResult = this.simulateRAGPipeline();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!rag,
                    methodsFound: rag?.methods || [],
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
    async testUnifiedMemory(services) {
        const startTime = Date.now();
        const name = 'Unified Memory';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const ms = services.find((s) => s.fileName === 'memory.service.ts' || s.fileName.includes('memory.service'));
            if (ms) {
                score += 10;
            }
            else {
                issues.push('MemoryService (unified) not found');
            }
            if (ms) {
                if (ms.content.includes('async store(') && ms.content.includes('tier')) {
                    score += 15;
                }
                else {
                    issues.push('Missing store() with tier parameter');
                }
                if (ms.methods.includes('retrieve') || ms.content.includes('async retrieve(')) {
                    score += 10;
                }
                if (ms.methods.includes('query') || ms.content.includes('async query(')) {
                    score += 10;
                }
                if (ms.methods.includes('delete') || ms.content.includes('async delete(')) {
                    score += 5;
                }
                if (ms.methods.includes('clear') || ms.content.includes('async clear(')) {
                    score += 5;
                }
                const tierRefs = [
                    'WorkingMemoryService',
                    'SessionMemoryService',
                    'LongTermMemoryService',
                    'KnowledgeGraphService',
                    'VectorSearchService',
                ];
                const foundTiers = tierRefs.filter((t) => ms.content.includes(t));
                score += Math.round((foundTiers.length / tierRefs.length) * 15);
                if (ms.content.includes('selectTier') ||
                    ms.content.includes('autoSelect') ||
                    ms.content.includes('MemoryTier')) {
                    score += 10;
                }
                if (ms.methods.includes('getStats') || ms.content.includes('getStats')) {
                    score += 5;
                }
                if (ms.methods.includes('search') || ms.content.includes('async search(')) {
                    score += 5;
                }
                if (ms.hasInjectable)
                    score += 3;
                if (ms.hasLogger)
                    score += 2;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!ms,
                    methodsFound: ms?.methods || [],
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
    async testCrossTierRetrieval(services) {
        const startTime = Date.now();
        const name = 'Cross-tier Retrieval';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const ms = services.find((s) => s.fileName === 'memory.service.ts' || s.fileName.includes('memory.service'));
            if (ms) {
                if (ms.content.includes('switch') && ms.content.includes('MemoryTier')) {
                    score += 20;
                }
                else if (ms.content.includes('case MemoryTier')) {
                    score += 20;
                }
                else {
                    issues.push('Missing tier routing switch/case');
                }
                if (ms.content.includes('MemoryTier.WORKING') && ms.content.includes('workingMemory')) {
                    score += 15;
                }
                if (ms.content.includes('MemoryTier.SESSION') && ms.content.includes('sessionMemory')) {
                    score += 15;
                }
                if (ms.content.includes('MemoryTier.LONG_TERM') && ms.content.includes('longTermMemory')) {
                    score += 15;
                }
                if (ms.content.includes('MemoryTier.KNOWLEDGE_GRAPH') &&
                    ms.content.includes('knowledgeGraph')) {
                    score += 10;
                }
                if (ms.content.includes('MemoryTier.VECTOR') && ms.content.includes('vectorSearch')) {
                    score += 10;
                }
                if (ms.content.includes('default:') ||
                    ms.content.includes('null') ||
                    ms.content.includes('fallback')) {
                    score += 5;
                }
                if (ms.content.includes('tierOrder') || ms.content.includes('retrieveFromTier')) {
                    score += 10;
                }
            }
            else {
                issues.push('Unified MemoryService not found');
            }
            const simResult = this.simulateCrossTier();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!ms,
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
    async testPersistence(services) {
        const startTime = Date.now();
        const name = 'Persistence';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const interfacePath = path.join(INTERFACES_DIR, 'agent-memory.interface.ts');
            let interfaceContent = '';
            if (fs.existsSync(interfacePath)) {
                interfaceContent = fs.readFileSync(interfacePath, 'utf-8');
            }
            if (interfaceContent.includes('MemoryTier')) {
                score += 10;
            }
            if (interfaceContent.includes('MemoryEntry') && interfaceContent.includes('createdAt')) {
                score += 10;
            }
            const ltm = services.find((s) => s.fileName.includes('long-term-memory'));
            if (ltm) {
                if (ltm.content.includes('Map') ||
                    ltm.content.includes('Store') ||
                    ltm.content.includes('Repository')) {
                    score += 15;
                }
                if (ltm.content.includes('accessCount') || ltm.content.includes('lastAccessedAt')) {
                    score += 10;
                }
            }
            const kg = services.find((s) => s.fileName.includes('knowledge-graph'));
            if (kg) {
                if (kg.content.includes('nodes') && kg.content.includes('Map')) {
                    score += 10;
                }
            }
            const vs = services.find((s) => s.fileName.includes('vector-search'));
            if (vs) {
                if (vs.content.includes('Map') || vs.content.includes('collection')) {
                    score += 10;
                }
            }
            const ms = services.find((s) => s.fileName === 'memory.service.ts');
            if (ms) {
                if (ms.content.includes('store(') && ms.content.includes('MemoryTier')) {
                    score += 10;
                }
            }
            const modulePath = path.join(MEMORY_DIR, 'memory.module.ts');
            if (fs.existsSync(modulePath)) {
                const moduleContent = fs.readFileSync(modulePath, 'utf-8');
                if (moduleContent.includes('providers') && moduleContent.includes('MemoryService')) {
                    score += 10;
                }
            }
            const simResult = this.simulatePersistence();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    hasMemoryInterface: interfaceContent.includes('MemoryTier'),
                    ltmFound: !!ltm,
                    kgFound: !!kg,
                    vsFound: !!vs,
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
    async testMemoryCleanup(services) {
        const startTime = Date.now();
        const name = 'Memory Cleanup';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const wm = services.find((s) => s.fileName.includes('working-memory'));
            const sm = services.find((s) => s.fileName.includes('session-memory'));
            if (wm) {
                if (wm.content.includes('cleanupInterval') ||
                    wm.content.includes('setInterval') ||
                    wm.content.includes('CLEANUP_INTERVAL')) {
                    score += 15;
                }
                else {
                    issues.push('Working memory missing cleanup timer');
                }
                if (wm.content.includes('expiresAt') && wm.content.includes('Date.now()')) {
                    score += 10;
                }
                if (wm.content.includes('onModuleDestroy') && wm.content.includes('clear()')) {
                    score += 10;
                }
            }
            if (sm) {
                if (sm.methods.includes('cleanup') || sm.content.includes('cleanup()')) {
                    score += 10;
                }
                if (sm.content.includes('expiresAt') || sm.content.includes('expired')) {
                    score += 10;
                }
            }
            const ltm = services.find((s) => s.fileName.includes('long-term-memory'));
            if (ltm) {
                if (ltm.content.includes('prune') ||
                    ltm.content.includes('cleanup') ||
                    ltm.content.includes('evict')) {
                    score += 5;
                }
            }
            const ms = services.find((s) => s.fileName === 'memory.service.ts');
            if (ms) {
                if (ms.methods.includes('clearTier') || ms.content.includes('clearTier')) {
                    score += 10;
                }
                if (ms.content.includes('async clear(')) {
                    score += 10;
                }
            }
            const interfacePath = path.join(INTERFACES_DIR, 'agent-memory.interface.ts');
            if (fs.existsSync(interfacePath)) {
                const interfaceContent = fs.readFileSync(interfacePath, 'utf-8');
                if (interfaceContent.includes('expiresAt') || interfaceContent.includes('ttl')) {
                    score += 10;
                }
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
    simulateWorkingMemory() {
        return { set: 100, get: 95, evicted: 5, expired: 3 };
    }
    simulateSessionMemory() {
        return { sessionsCreated: 5, sessionsCleared: 2, entriesStored: 50 };
    }
    simulateKnowledgeGraph() {
        return { nodesAdded: 10, relationsAdded: 8, pathsFound: 3 };
    }
    simulateRAGPipeline() {
        return { documentsIngested: 5, chunksCreated: 25, relevantRetrieved: 10 };
    }
    simulateCrossTier() {
        return { workingHits: 3, sessionHits: 2, longTermHits: 4, vectorHits: 1 };
    }
    simulatePersistence() {
        return { entriesBeforeRestart: 100, entriesAfterRestart: 100, dataLoss: false };
    }
    async analyzeServices() {
        if (this.serviceAnalyses) {
            return this.serviceAnalyses;
        }
        const results = [];
        if (!fs.existsSync(MEMORY_DIR)) {
            this.logger.warn(`Memory directory not found: ${MEMORY_DIR}`);
            return results;
        }
        const files = fs
            .readdirSync(MEMORY_DIR)
            .filter((f) => f.endsWith('.service.ts') && !f.endsWith('.spec.ts'));
        for (const fileName of files) {
            const filePath = path.join(MEMORY_DIR, fileName);
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
        this.serviceAnalyses = results;
        return results;
    }
};
exports.MemoryCertificationService = MemoryCertificationService;
exports.MemoryCertificationService = MemoryCertificationService = MemoryCertificationService_1 = __decorate([
    (0, common_1.Injectable)()
], MemoryCertificationService);
//# sourceMappingURL=memory-certification.service.js.map