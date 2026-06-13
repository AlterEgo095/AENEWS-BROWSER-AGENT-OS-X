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
exports.KnowledgeSynthesisAgentService = exports.META_KNOWLEDGE_SYNTHESIS_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
exports.META_KNOWLEDGE_SYNTHESIS_AGENT_CONFIG = {
    id: 'meta-knowledge-synthesis',
    name: 'MetaKnowledgeSynthesis',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '1.0.0',
    description: 'Knowledge synthesis agent that synthesizes knowledge from multiple sources, merges insights, resolves contradictions, builds knowledge graphs, generates summaries, and identifies knowledge gaps across the Meta Intelligence cluster.',
    capabilities: [
        {
            name: 'synthesizeKnowledge',
            description: 'Synthesize knowledge from multiple sources into a unified view',
            inputSchema: {
                type: 'object',
                properties: {
                    sources: { type: 'array', items: { type: 'object' } },
                    domain: { type: 'string' },
                },
                required: ['sources'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    synthesisId: { type: 'string' },
                    synthesizedKnowledge: { type: 'object' },
                    confidence: { type: 'number' },
                    sourceCount: { type: 'number' },
                },
            },
        },
        {
            name: 'mergeInsights',
            description: 'Merge insights from different analyses or agents',
            inputSchema: {
                type: 'object',
                properties: {
                    insights: { type: 'array', items: { type: 'object' } },
                    mergeStrategy: { type: 'string' },
                },
                required: ['insights'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    mergedInsight: { type: 'object' },
                    conflicts: { type: 'number' },
                    resolutions: { type: 'number' },
                    mergeId: { type: 'string' },
                },
            },
        },
        {
            name: 'resolveContradictions',
            description: 'Resolve contradictions between conflicting knowledge claims',
            inputSchema: {
                type: 'object',
                properties: {
                    claims: { type: 'array', items: { type: 'object' } },
                    resolutionStrategy: { type: 'string' },
                },
                required: ['claims'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    resolved: { type: 'boolean' },
                    resolution: { type: 'object' },
                    contradictions: { type: 'number' },
                    resolutionId: { type: 'string' },
                },
            },
        },
        {
            name: 'buildKnowledgeGraph',
            description: 'Build a knowledge graph from given entities and relationships',
            inputSchema: {
                type: 'object',
                properties: {
                    entities: { type: 'array', items: { type: 'object' } },
                    relationships: { type: 'array', items: { type: 'object' } },
                },
                required: ['entities'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    graphId: { type: 'string' },
                    nodeCount: { type: 'number' },
                    edgeCount: { type: 'number' },
                    clusters: { type: 'number' },
                },
            },
        },
        {
            name: 'generateSummary',
            description: 'Generate a summary of knowledge in a given domain',
            inputSchema: {
                type: 'object',
                properties: {
                    domain: { type: 'string' },
                    depth: { type: 'string' },
                    includeConfidence: { type: 'boolean' },
                },
                required: ['domain'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    summary: { type: 'string' },
                    keyPoints: { type: 'array', items: { type: 'string' } },
                    confidence: { type: 'number' },
                    summaryId: { type: 'string' },
                },
            },
        },
        {
            name: 'identifyGaps',
            description: 'Identify gaps in current knowledge',
            inputSchema: {
                type: 'object',
                properties: {
                    domain: { type: 'string' },
                    currentKnowledge: { type: 'object' },
                    requiredCoverage: { type: 'array', items: { type: 'string' } },
                },
                required: ['domain'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    gaps: { type: 'array', items: { type: 'object' } },
                    gapCount: { type: 'number' },
                    coverageScore: { type: 'number' },
                    gapId: { type: 'string' },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:knowledge', 'write:synthesis', 'read:graph'],
    maxConcurrentTasks: 4,
    timeout: 90000,
    retryPolicy: { maxRetries: 2, backoffMs: 2500, exponentialBackoff: true },
};
let KnowledgeSynthesisAgentService = class KnowledgeSynthesisAgentService extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
        this.knowledgeGraph = {
            nodes: new Map(),
            edges: [],
        };
    }
    defineConfig() {
        return exports.META_KNOWLEDGE_SYNTHESIS_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'synthesizeKnowledge',
            description: 'Synthesize knowledge from multiple sources',
            execute: async (params) => this.synthesizeKnowledge(params),
        });
        this.registerTool({
            name: 'mergeInsights',
            description: 'Merge insights from different analyses',
            execute: async (params) => this.mergeInsights(params),
        });
        this.registerTool({
            name: 'resolveContradictions',
            description: 'Resolve contradictions between conflicting claims',
            execute: async (params) => this.resolveContradictions(params),
        });
        this.registerTool({
            name: 'buildKnowledgeGraph',
            description: 'Build a knowledge graph',
            execute: async (params) => this.buildKnowledgeGraph(params),
        });
        this.registerTool({
            name: 'generateSummary',
            description: 'Generate a knowledge summary',
            execute: async (params) => this.generateSummary(params),
        });
        this.registerTool({
            name: 'identifyGaps',
            description: 'Identify gaps in knowledge',
            execute: async (params) => this.identifyGaps(params),
        });
        await this.storeInWorkingMemory('knowledge-synthesis:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('MetaKnowledgeSynthesis agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: `You are the ${this.config.name} agent in the Meta-Intelligence cluster. Analyze the following task and provide detailed knowledge synthesis, insight merging, and contradiction resolution.`,
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
        if (!action)
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        const supportedActions = [
            'synthesizeKnowledge',
            'mergeInsights',
            'resolveContradictions',
            'buildKnowledgeGraph',
            'generateSummary',
            'identifyGaps',
        ];
        if (!supportedActions.includes(action))
            return this.createAgentOutput(input.taskId, false, null, `Unknown knowledge-synthesis action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        try {
            const tool = this.getTool(action);
            if (!tool)
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`knowledge-synthesis:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`MetaKnowledgeSynthesis execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.knowledgeGraph.nodes.clear();
        this.knowledgeGraph.edges = [];
        this.logger.log('MetaKnowledgeSynthesis agent destroyed, knowledge graph cleared');
    }
    async synthesizeKnowledge(params) {
        const { sources, domain = 'general' } = params;
        if (!sources || !Array.isArray(sources) || sources.length === 0)
            throw new Error('Non-empty sources array is required');
        const synthesisId = this.generateId();
        const allKeys = new Set();
        for (const source of sources) {
            for (const key of Object.keys(source))
                allKeys.add(key);
        }
        const synthesizedKnowledge = {};
        for (const key of allKeys) {
            const values = sources.map((s) => s[key]).filter((v) => v !== undefined && v !== null);
            if (values.length === 0)
                continue;
            if (values.length === 1) {
                synthesizedKnowledge[key] = values[0];
                continue;
            }
            if (typeof values[0] === 'number') {
                synthesizedKnowledge[key] =
                    Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100;
            }
            else if (typeof values[0] === 'string') {
                const unique = [...new Set(values)];
                synthesizedKnowledge[key] = unique.length === 1 ? unique[0] : unique.join(' | ');
            }
            else {
                synthesizedKnowledge[key] = values[0];
            }
        }
        synthesizedKnowledge._domain = domain;
        synthesizedKnowledge._sourceCount = sources.length;
        synthesizedKnowledge._synthesizedAt = new Date().toISOString();
        const confidence = Math.min(0.95, 0.5 + sources.length * 0.1);
        this.logger.log(`Knowledge synthesized: id=${synthesisId}, sources=${sources.length}, domain=${domain}, confidence=${confidence.toFixed(2)}`);
        return { synthesisId, synthesizedKnowledge, confidence, sourceCount: sources.length };
    }
    async mergeInsights(params) {
        const { insights, mergeStrategy = 'weighted' } = params;
        if (!insights || !Array.isArray(insights) || insights.length < 2)
            throw new Error('At least two insights are required for merging');
        const mergeId = this.generateId();
        let conflicts = 0;
        let resolutions = 0;
        const mergedInsight = {
            insights: [],
            _mergedAt: new Date().toISOString(),
        };
        const allKeys = new Set();
        for (const insight of insights) {
            for (const key of Object.keys(insight))
                allKeys.add(key);
        }
        for (const key of allKeys) {
            const values = insights.map((i) => i[key]).filter((v) => v !== undefined);
            if (values.length <= 1) {
                mergedInsight[key] = values[0];
                continue;
            }
            const unique = [...new Set(values.map((v) => JSON.stringify(v)))];
            if (unique.length > 1) {
                conflicts++;
                if (mergeStrategy === 'weighted') {
                    mergedInsight[key] = values[0];
                    resolutions++;
                }
                else if (mergeStrategy === 'union') {
                    mergedInsight[key] = values;
                    resolutions++;
                }
                else {
                    mergedInsight[key] = values[0];
                    resolutions++;
                }
            }
            else {
                mergedInsight[key] = values[0];
            }
        }
        mergedInsight._mergeStrategy = mergeStrategy;
        this.logger.log(`Insights merged: id=${mergeId}, conflicts=${conflicts}, resolutions=${resolutions}`);
        return { mergedInsight, conflicts, resolutions, mergeId };
    }
    async resolveContradictions(params) {
        const { claims, resolutionStrategy = 'evidence-weighted' } = params;
        if (!claims || !Array.isArray(claims) || claims.length < 2)
            throw new Error('At least two claims are required');
        const resolutionId = this.generateId();
        let contradictions = 0;
        for (let i = 0; i < claims.length; i++) {
            for (let j = i + 1; j < claims.length; j++) {
                const claimA = claims[i].claim.toLowerCase();
                const claimB = claims[j].claim.toLowerCase();
                if (claimA !== claimB &&
                    (claimA.includes('not') !== claimB.includes('not') ||
                        this.areContradictory(claimA, claimB))) {
                    contradictions++;
                }
            }
        }
        let resolution;
        if (contradictions === 0) {
            resolution = {
                strategy: 'none-needed',
                allClaims: claims.map((c) => c.claim),
                note: 'No contradictions detected',
            };
        }
        else {
            switch (resolutionStrategy) {
                case 'evidence-weighted':
                    const sorted = [...claims].sort((a, b) => b.confidence - a.confidence);
                    resolution = {
                        strategy: 'evidence-weighted',
                        acceptedClaim: sorted[0].claim,
                        rejectedClaims: sorted.slice(1).map((c) => c.claim),
                        reasoning: `Accepted claim with highest confidence (${sorted[0].confidence})`,
                    };
                    break;
                case 'consensus':
                    const claimCounts = {};
                    for (const c of claims)
                        claimCounts[c.claim] = (claimCounts[c.claim] || 0) + 1;
                    const consensus = Object.entries(claimCounts).sort(([, a], [, b]) => b - a)[0];
                    resolution = {
                        strategy: 'consensus',
                        acceptedClaim: consensus[0],
                        voteCount: consensus[1],
                        totalVotes: claims.length,
                    };
                    break;
                default:
                    resolution = {
                        strategy: 'first-claim',
                        acceptedClaim: claims[0].claim,
                        note: 'Defaulted to first claim',
                    };
            }
        }
        const resolved = contradictions === 0 || !!resolution.acceptedClaim;
        this.logger.log(`Contradictions resolved: id=${resolutionId}, contradictions=${contradictions}, resolved=${resolved}`);
        return { resolved, resolution, contradictions, resolutionId };
    }
    async buildKnowledgeGraph(params) {
        const { entities, relationships = [] } = params;
        if (!entities || !Array.isArray(entities) || entities.length === 0)
            throw new Error('Non-empty entities array is required');
        const graphId = this.generateId();
        for (const entity of entities) {
            const nodeId = `${entity.type}:${entity.name}`;
            this.knowledgeGraph.nodes.set(nodeId, {
                id: nodeId,
                entity: entity.name,
                type: entity.type,
                attributes: entity.attributes || {},
                confidence: 0.8,
            });
        }
        for (const rel of relationships) {
            this.knowledgeGraph.edges.push({
                source: rel.source,
                target: rel.target,
                relationship: rel.relationship,
                weight: rel.weight || 1.0,
            });
        }
        if (relationships.length === 0) {
            const types = [...new Set(entities.map((e) => e.type))];
            for (let i = 0; i < types.length - 1; i++) {
                const sourceEntities = entities.filter((e) => e.type === types[i]);
                const targetEntities = entities.filter((e) => e.type === types[i + 1]);
                for (const src of sourceEntities) {
                    for (const tgt of targetEntities) {
                        this.knowledgeGraph.edges.push({
                            source: `${src.type}:${src.name}`,
                            target: `${tgt.type}:${tgt.name}`,
                            relationship: 'related-to',
                            weight: 0.5,
                        });
                    }
                }
            }
        }
        const types = [...new Set(entities.map((e) => e.type))];
        const clusters = types.length;
        this.logger.log(`Knowledge graph built: id=${graphId}, nodes=${this.knowledgeGraph.nodes.size}, edges=${this.knowledgeGraph.edges.length}, clusters=${clusters}`);
        return {
            graphId,
            nodeCount: this.knowledgeGraph.nodes.size,
            edgeCount: this.knowledgeGraph.edges.length,
            clusters,
        };
    }
    async generateSummary(params) {
        const { domain, depth = 'standard', includeConfidence = false } = params;
        if (!domain || typeof domain !== 'string')
            throw new Error('Valid domain string is required');
        const summaryId = this.generateId();
        const domainNodes = Array.from(this.knowledgeGraph.nodes.values()).filter((n) => n.type === domain || n.entity.includes(domain));
        const domainEdges = this.knowledgeGraph.edges.filter((e) => e.source.includes(domain) || e.target.includes(domain));
        const keyPoints = [];
        if (domainNodes.length > 0) {
            keyPoints.push(`${domainNodes.length} entities identified in the "${domain}" domain`);
            for (const node of domainNodes.slice(0, 5)) {
                const point = `Entity: ${node.entity} (type: ${node.type})`;
                keyPoints.push(includeConfidence ? `${point} [confidence: ${node.confidence.toFixed(2)}]` : point);
            }
        }
        else {
            keyPoints.push(`No specific entities found for domain "${domain}"`);
            keyPoints.push('General domain knowledge applies');
        }
        if (domainEdges.length > 0) {
            keyPoints.push(`${domainEdges.length} relationships connect entities in this domain`);
        }
        let summary = `Knowledge summary for "${domain}": `;
        summary +=
            keyPoints.length > 2
                ? `${keyPoints.length} key insights identified.`
                : 'Limited knowledge available in this domain.';
        if (depth === 'detailed' || depth === 'comprehensive') {
            summary += ` The domain contains ${domainNodes.length} primary entities and ${domainEdges.length} connecting relationships.`;
            summary += ` Average entity confidence: ${domainNodes.length > 0 ? (domainNodes.reduce((s, n) => s + n.confidence, 0) / domainNodes.length).toFixed(2) : 'N/A'}.`;
        }
        const confidence = domainNodes.length > 0
            ? Math.min(0.9, domainNodes.reduce((s, n) => s + n.confidence, 0) / domainNodes.length)
            : 0.3;
        this.logger.log(`Summary generated: domain=${domain}, points=${keyPoints.length}, confidence=${confidence.toFixed(2)}`);
        return { summary, keyPoints, confidence, summaryId };
    }
    async identifyGaps(params) {
        const { domain, currentKnowledge = {}, requiredCoverage = ['basics', 'advanced', 'edge-cases', 'integration', 'performance'], } = params;
        if (!domain || typeof domain !== 'string')
            throw new Error('Valid domain string is required');
        const gapId = this.generateId();
        const gaps = [];
        const knowledgeKeys = Object.keys(currentKnowledge);
        for (const area of requiredCoverage) {
            const hasCoverage = knowledgeKeys.some((k) => k.toLowerCase().includes(area));
            const nodeCoverage = Array.from(this.knowledgeGraph.nodes.values()).some((n) => n.entity.toLowerCase().includes(area));
            if (!hasCoverage && !nodeCoverage) {
                gaps.push({
                    area,
                    description: `No knowledge found for "${area}" in domain "${domain}"`,
                    priority: area === 'basics' ? 'high' : area === 'advanced' ? 'medium' : 'low',
                    suggestedAction: `Research and acquire knowledge about ${area} in ${domain}`,
                });
            }
        }
        if (knowledgeKeys.length === 0) {
            gaps.push({
                area: 'domain-foundation',
                description: `Domain "${domain}" has no foundational knowledge`,
                priority: 'high',
                suggestedAction: `Build baseline knowledge base for ${domain}`,
            });
        }
        const coverageScore = requiredCoverage.length > 0
            ? Math.round((1 - gaps.length / requiredCoverage.length) * 100)
            : 100;
        this.logger.log(`Gaps identified: domain=${domain}, gaps=${gaps.length}, coverage=${coverageScore}%`);
        return { gaps, gapCount: gaps.length, coverageScore, gapId };
    }
    areContradictory(a, b) {
        const negationWords = ['not', 'never', 'cannot', 'impossible', 'no'];
        const aHasNegation = negationWords.some((w) => a.includes(w));
        const bHasNegation = negationWords.some((w) => b.includes(w));
        return aHasNegation !== bHasNegation;
    }
};
exports.KnowledgeSynthesisAgentService = KnowledgeSynthesisAgentService;
exports.KnowledgeSynthesisAgentService = KnowledgeSynthesisAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], KnowledgeSynthesisAgentService);
//# sourceMappingURL=knowledge-synthesis-agent.service.js.map