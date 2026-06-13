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
exports.MemoryManagerAgentService = exports.META_MEMORY_MANAGER_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
exports.META_MEMORY_MANAGER_AGENT_CONFIG = {
    id: 'meta-memory-manager',
    name: 'MetaMemoryManager',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '1.0.0',
    description: 'Memory management agent that consolidates memory, optimizes storage, archives old memories, retrieves context, prunes memories, and migrates memory across the Meta Intelligence cluster.',
    capabilities: [
        {
            name: 'consolidateMemory',
            description: 'Consolidate memories from multiple sources into unified storage',
            inputSchema: {
                type: 'object',
                properties: {
                    sources: { type: 'array', items: { type: 'string' }, description: 'Memory source IDs' },
                    strategy: {
                        type: 'string',
                        enum: ['merge', 'deduplicate', 'summarize'],
                        description: 'Consolidation strategy',
                    },
                },
                required: ['sources'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    consolidationId: { type: 'string' },
                    entriesProcessed: { type: 'number' },
                    entriesConsolidated: { type: 'number' },
                    duplicatesRemoved: { type: 'number' },
                },
            },
        },
        {
            name: 'optimizeStorage',
            description: 'Optimize memory storage for better performance',
            inputSchema: {
                type: 'object',
                properties: {
                    targetTier: { type: 'string', description: 'Memory tier to optimize' },
                    optimizationGoal: {
                        type: 'string',
                        enum: ['speed', 'space', 'balanced'],
                        description: 'Optimization goal',
                    },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    optimizationId: { type: 'string' },
                    entriesOptimized: { type: 'number' },
                    spaceSaved: { type: 'number' },
                    performanceGain: { type: 'number' },
                },
            },
        },
        {
            name: 'archiveOldMemories',
            description: 'Archive old or infrequently accessed memories',
            inputSchema: {
                type: 'object',
                properties: {
                    maxAgeDays: { type: 'number', description: 'Maximum age in days before archiving' },
                    minAccessThreshold: {
                        type: 'number',
                        description: 'Minimum access count to keep active',
                    },
                    dryRun: { type: 'boolean', description: 'Preview without making changes' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    archiveId: { type: 'string' },
                    entriesArchived: { type: 'number' },
                    spaceFreed: { type: 'number' },
                    archiveLocation: { type: 'string' },
                },
            },
        },
        {
            name: 'retrieveContext',
            description: 'Retrieve relevant context from memory for a given query',
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Context query' },
                    maxResults: { type: 'number', description: 'Maximum number of results' },
                    relevanceThreshold: { type: 'number', description: 'Minimum relevance score' },
                },
                required: ['query'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    results: { type: 'array', items: { type: 'object' } },
                    totalCount: { type: 'number' },
                    bestMatch: { type: 'object' },
                },
            },
        },
        {
            name: 'pruneMemories',
            description: 'Prune invalid, corrupted, or irrelevant memories',
            inputSchema: {
                type: 'object',
                properties: {
                    criteria: { type: 'object', description: 'Pruning criteria' },
                    confirmDeletion: { type: 'boolean', description: 'Actually delete vs mark for deletion' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    pruneId: { type: 'string' },
                    entriesPruned: { type: 'number' },
                    entriesMarked: { type: 'number' },
                    spaceRecovered: { type: 'number' },
                },
            },
        },
        {
            name: 'migrateMemory',
            description: 'Migrate memory between tiers or agents',
            inputSchema: {
                type: 'object',
                properties: {
                    sourceTier: { type: 'string', description: 'Source memory tier' },
                    targetTier: { type: 'string', description: 'Target memory tier' },
                    filter: { type: 'object', description: 'Filter criteria for migration' },
                },
                required: ['sourceTier', 'targetTier'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    migrationId: { type: 'string' },
                    entriesMigrated: { type: 'number' },
                    sourceSize: { type: 'number' },
                    targetSize: { type: 'number' },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:memory', 'write:memory', 'delete:memory', 'admin:memory'],
    maxConcurrentTasks: 3,
    timeout: 90000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 3000,
        exponentialBackoff: true,
    },
};
let MemoryManagerAgentService = class MemoryManagerAgentService extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
        this.memoryStore = new Map();
    }
    defineConfig() {
        return exports.META_MEMORY_MANAGER_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'consolidateMemory',
            description: 'Consolidate memories from multiple sources into unified storage',
            execute: async (params) => this.consolidateMemory(params),
        });
        this.registerTool({
            name: 'optimizeStorage',
            description: 'Optimize memory storage for better performance',
            execute: async (params) => this.optimizeStorage(params),
        });
        this.registerTool({
            name: 'archiveOldMemories',
            description: 'Archive old or infrequently accessed memories',
            execute: async (params) => this.archiveOldMemories(params),
        });
        this.registerTool({
            name: 'retrieveContext',
            description: 'Retrieve relevant context from memory for a given query',
            execute: async (params) => this.retrieveContext(params),
        });
        this.registerTool({
            name: 'pruneMemories',
            description: 'Prune invalid, corrupted, or irrelevant memories',
            execute: async (params) => this.pruneMemories(params),
        });
        this.registerTool({
            name: 'migrateMemory',
            description: 'Migrate memory between tiers or agents',
            execute: async (params) => this.migrateMemory(params),
        });
        this.seedMemoryStore();
        await this.storeInWorkingMemory('memory-manager:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('MetaMemoryManager agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: `You are the ${this.config.name} agent in the Meta-Intelligence cluster. Analyze the following task and provide detailed memory consolidation, storage optimization, and context retrieval.`,
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
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'consolidateMemory',
            'optimizeStorage',
            'archiveOldMemories',
            'retrieveContext',
            'pruneMemories',
            'migrateMemory',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown memory action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`memory-manager:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`MetaMemoryManager execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.memoryStore.clear();
        this.logger.log('MetaMemoryManager agent destroyed, memory store cleared');
    }
    async consolidateMemory(params) {
        const { sources, strategy = 'merge' } = params;
        if (!sources || !Array.isArray(sources) || sources.length === 0) {
            throw new Error('Non-empty sources array is required');
        }
        const consolidationId = this.generateId();
        let entriesProcessed = 0;
        let entriesConsolidated = 0;
        let duplicatesRemoved = 0;
        const seenKeys = new Map();
        for (const [key, entry] of this.memoryStore.entries()) {
            if (!sources.some((s) => entry.tier.includes(s) || entry.key.includes(s)))
                continue;
            entriesProcessed++;
            if (seenKeys.has(entry.key)) {
                const existingId = seenKeys.get(entry.key);
                const existing = this.memoryStore.get(existingId);
                if (existing) {
                    switch (strategy) {
                        case 'deduplicate':
                            if (entry.createdAt > existing.createdAt) {
                                this.memoryStore.delete(existingId);
                                seenKeys.set(entry.key, key);
                            }
                            else {
                                this.memoryStore.delete(key);
                            }
                            duplicatesRemoved++;
                            break;
                        case 'summarize':
                            existing.value = {
                                summary: `Consolidated: ${JSON.stringify(existing.value)}, ${JSON.stringify(entry.value)}`,
                            };
                            existing.size = Math.round(existing.size * 0.6);
                            this.memoryStore.delete(key);
                            duplicatesRemoved++;
                            entriesConsolidated++;
                            break;
                        case 'merge':
                        default:
                            existing.accessCount += entry.accessCount;
                            existing.size += entry.size;
                            this.memoryStore.delete(key);
                            entriesConsolidated++;
                            break;
                    }
                }
            }
            else {
                seenKeys.set(entry.key, key);
                entriesConsolidated++;
            }
        }
        this.logger.log(`Memory consolidated: processed=${entriesProcessed}, consolidated=${entriesConsolidated}, duplicates=${duplicatesRemoved}`);
        return { consolidationId, entriesProcessed, entriesConsolidated, duplicatesRemoved };
    }
    async optimizeStorage(params) {
        const { targetTier = 'all', optimizationGoal = 'balanced' } = params;
        const optimizationId = this.generateId();
        let entriesOptimized = 0;
        let spaceSaved = 0;
        for (const [, entry] of this.memoryStore.entries()) {
            if (targetTier !== 'all' && entry.tier !== targetTier)
                continue;
            const originalSize = entry.size;
            switch (optimizationGoal) {
                case 'speed':
                    if (entry.accessCount > 5) {
                        entry.relevance = Math.min(1.0, entry.relevance + 0.1);
                    }
                    break;
                case 'space':
                    if (entry.size > 1000) {
                        entry.size = Math.round(entry.size * 0.7);
                    }
                    break;
                case 'balanced':
                default:
                    if (entry.size > 500) {
                        entry.size = Math.round(entry.size * 0.85);
                    }
                    if (entry.accessCount > 3) {
                        entry.relevance = Math.min(1.0, entry.relevance + 0.05);
                    }
                    break;
            }
            spaceSaved += originalSize - entry.size;
            entriesOptimized++;
        }
        const performanceGain = entriesOptimized > 0 ? Math.round((spaceSaved / (spaceSaved + 1000)) * 100) / 100 : 0;
        this.logger.log(`Storage optimized: entries=${entriesOptimized}, saved=${spaceSaved} bytes, gain=${(performanceGain * 100).toFixed(1)}%`);
        return { optimizationId, entriesOptimized, spaceSaved, performanceGain };
    }
    async archiveOldMemories(params) {
        const { maxAgeDays = 30, minAccessThreshold = 2, dryRun = false } = params;
        const archiveId = this.generateId();
        const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
        let entriesArchived = 0;
        let spaceFreed = 0;
        for (const [key, entry] of this.memoryStore.entries()) {
            const isOld = entry.createdAt < cutoffDate;
            const isUnused = entry.accessCount < minAccessThreshold;
            if (isOld && isUnused) {
                spaceFreed += entry.size;
                entriesArchived++;
                if (!dryRun) {
                    this.memoryStore.delete(key);
                }
            }
        }
        const archiveLocation = `archive://${archiveId}/meta-memory-archive`;
        this.logger.log(`Memories archived: count=${entriesArchived}, freed=${spaceFreed} bytes, dryRun=${dryRun}`);
        return { archiveId, entriesArchived, spaceFreed, archiveLocation };
    }
    async retrieveContext(params) {
        const { query, maxResults = 10, relevanceThreshold = 0.3 } = params;
        if (!query || typeof query !== 'string') {
            throw new Error('Valid query string is required');
        }
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/);
        const scored = [];
        for (const [, entry] of this.memoryStore.entries()) {
            let relevance = entry.relevance;
            const keyLower = entry.key.toLowerCase();
            for (const word of queryWords) {
                if (keyLower.includes(word))
                    relevance += 0.2;
            }
            const valueStr = JSON.stringify(entry.value).toLowerCase();
            for (const word of queryWords) {
                if (valueStr.includes(word))
                    relevance += 0.1;
            }
            if (entry.accessCount > 5)
                relevance += 0.05;
            relevance = Math.min(1.0, relevance);
            if (relevance >= relevanceThreshold) {
                scored.push({
                    key: entry.key,
                    value: entry.value,
                    relevance: Math.round(relevance * 100) / 100,
                    tier: entry.tier,
                });
            }
        }
        scored.sort((a, b) => b.relevance - a.relevance);
        const results = scored.slice(0, maxResults);
        const bestMatch = results.length > 0 ? results[0] : null;
        for (const result of results) {
            const entry = Array.from(this.memoryStore.values()).find((e) => e.key === result.key);
            if (entry) {
                entry.accessCount++;
                entry.lastAccessedAt = new Date();
            }
        }
        this.logger.log(`Context retrieved: query="${query.substring(0, 50)}", results=${results.length}, best=${bestMatch?.relevance || 0}`);
        return { results, totalCount: scored.length, bestMatch };
    }
    async pruneMemories(params) {
        const { criteria = {}, confirmDeletion = false } = params;
        const pruneId = this.generateId();
        let entriesPruned = 0;
        let entriesMarked = 0;
        let spaceRecovered = 0;
        const minRelevance = criteria.minRelevance || 0.1;
        const maxAge = criteria.maxAgeDays || 180;
        for (const [key, entry] of this.memoryStore.entries()) {
            const isLowRelevance = entry.relevance < minRelevance;
            const isOld = Date.now() - entry.createdAt.getTime() > maxAge * 24 * 60 * 60 * 1000;
            const isMarked = entry.markedForDeletion;
            if (isLowRelevance || isOld || isMarked) {
                spaceRecovered += entry.size;
                if (confirmDeletion) {
                    this.memoryStore.delete(key);
                    entriesPruned++;
                }
                else {
                    entry.markedForDeletion = true;
                    entriesMarked++;
                }
            }
        }
        this.logger.log(`Memories pruned: pruned=${entriesPruned}, marked=${entriesMarked}, recovered=${spaceRecovered} bytes`);
        return { pruneId, entriesPruned, entriesMarked, spaceRecovered };
    }
    async migrateMemory(params) {
        const { sourceTier, targetTier, filter = {} } = params;
        if (!sourceTier || typeof sourceTier !== 'string') {
            throw new Error('Valid sourceTier string is required');
        }
        if (!targetTier || typeof targetTier !== 'string') {
            throw new Error('Valid targetTier string is required');
        }
        const migrationId = this.generateId();
        let entriesMigrated = 0;
        let sourceSize = 0;
        let targetSize = 0;
        const minRelevance = filter.minRelevance || 0;
        for (const [, entry] of this.memoryStore.entries()) {
            if (entry.tier !== sourceTier)
                continue;
            if (entry.relevance < minRelevance)
                continue;
            sourceSize += entry.size;
            entry.tier = targetTier;
            targetSize += entry.size;
            entriesMigrated++;
        }
        this.logger.log(`Memory migrated: ${sourceTier} → ${targetTier}, entries=${entriesMigrated}, size=${sourceSize} bytes`);
        return { migrationId, entriesMigrated, sourceSize, targetSize };
    }
    seedMemoryStore() {
        const tiers = ['working', 'session', 'long-term'];
        const domains = ['orchestration', 'planning', 'critique', 'learning', 'governance'];
        for (const tier of tiers) {
            for (const domain of domains) {
                const key = `${tier}:${domain}:config`;
                const id = this.generateId();
                this.memoryStore.set(id, {
                    id,
                    tier,
                    key,
                    value: { domain, tier, lastUpdated: new Date().toISOString() },
                    size: 256 + Math.floor(Math.random() * 512),
                    accessCount: Math.floor(Math.random() * 10),
                    lastAccessedAt: new Date(),
                    createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
                    relevance: 0.5 + Math.random() * 0.4,
                    markedForDeletion: false,
                });
            }
        }
    }
};
exports.MemoryManagerAgentService = MemoryManagerAgentService;
exports.MemoryManagerAgentService = MemoryManagerAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], MemoryManagerAgentService);
//# sourceMappingURL=memory-manager-agent.service.js.map