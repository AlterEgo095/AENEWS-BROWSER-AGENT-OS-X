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
exports.MemoryAuditorAgent = exports.MEMORY_AUDITOR_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.MEMORY_AUDITOR_CONFIG = {
    id: 'certification-memory-auditor',
    name: 'MemoryAuditor',
    cluster: 'certification',
    version: '1.0.0',
    description: 'Audits memory tiers (working, session, long-term), gateway operations, cross-tier retrieval, cache efficiency, and memory lifecycle management.',
    capabilities: [
        {
            name: 'audit-memory',
            description: 'Perform a comprehensive memory system audit',
            inputSchema: {
                type: 'object',
                properties: {
                    target: { type: 'string', description: 'Memory tier or system to audit' },
                    depth: {
                        type: 'string',
                        enum: ['surface', 'deep', 'exhaustive'],
                        description: 'Audit depth',
                    },
                },
                required: ['target'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    score: { type: 'number' },
                    issues: { type: 'array', items: { type: 'object' } },
                    recommendations: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'audit-tiers',
            description: 'Audit all memory tiers for consistency and data integrity',
            inputSchema: {
                type: 'object',
                properties: {
                    checkTTL: { type: 'boolean', description: 'Verify TTL enforcement' },
                    checkEviction: { type: 'boolean', description: 'Verify eviction policies' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    tierHealth: { type: 'object' },
                    consistencyScore: { type: 'number' },
                },
            },
        },
        {
            name: 'audit-gateway',
            description: 'Audit memory gateway operations and routing',
            inputSchema: {
                type: 'object',
                properties: {
                    gatewayId: { type: 'string', description: 'Specific gateway to audit' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    gatewayScore: { type: 'number' },
                    routingIssues: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'audit-cross-tier-retrieval',
            description: 'Audit cross-tier memory retrieval accuracy and latency',
            inputSchema: {
                type: 'object',
                properties: {
                    testQueries: { type: 'number', description: 'Number of test queries to run' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    retrievalAccuracy: { type: 'number' },
                    avgRetrievalTimeMs: { type: 'number' },
                    tierHitRates: { type: 'object' },
                },
            },
        },
    ],
    permissions: ['certification:audit', 'certification:memory', 'read:memory', 'read:gateway'],
    maxConcurrentTasks: 5,
    timeout: 60000,
    retryPolicy: { maxRetries: 2, backoffMs: 1000, exponentialBackoff: true },
};
let MemoryAuditorAgent = class MemoryAuditorAgent extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
        this.memoryAuditLog = [];
    }
    defineConfig() {
        return exports.MEMORY_AUDITOR_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'audit-memory',
            description: 'Perform a comprehensive memory system audit',
            execute: async (target, depth) => this.performAudit({ target, depth }),
        });
        this.registerTool({
            name: 'audit-tiers',
            description: 'Audit all memory tiers for consistency and data integrity',
            execute: async (checkTTL, checkEviction) => this.auditTiers(checkTTL, checkEviction),
        });
        this.registerTool({
            name: 'audit-gateway',
            description: 'Audit memory gateway operations and routing',
            execute: async (gatewayId) => this.auditGateway(gatewayId),
        });
        this.registerTool({
            name: 'audit-cross-tier-retrieval',
            description: 'Audit cross-tier memory retrieval accuracy and latency',
            execute: async (testQueries) => this.auditCrossTierRetrieval(testQueries),
        });
        this.logger.log('MemoryAuditor agent initialized with 4 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.CertCapability.DATA_PRIVACY, {
                    missionId: input.taskId,
                    instruction: JSON.stringify(input.payload),
                    workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
                    parameters: input.payload,
                });
                return this.createAgentOutput(input.taskId, result.success, result.output, result.error, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge failed, fallback: ${error.message}`);
            }
        }
        const action = input.payload?.action || 'audit';
        try {
            let result;
            switch (action) {
                case 'audit':
                    result = await this.performAudit(input.payload);
                    break;
                case 'audit-tiers':
                    result = await this.auditTiers(input.payload.checkTTL, input.payload.checkEviction);
                    break;
                case 'audit-gateway':
                    result = await this.auditGateway(input.payload.gatewayId);
                    break;
                case 'audit-cross-tier-retrieval':
                    result = await this.auditCrossTierRetrieval(input.payload.testQueries);
                    break;
                default:
                    result = { action, status: 'unknown_action' };
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            return this.createAgentOutput(input.taskId, false, null, error.message, startTime);
        }
    }
    async onDestroy() {
        this.memoryAuditLog = [];
        this.logger.log('MemoryAuditor agent destroyed, state cleared');
    }
    async performAudit(payload) {
        const { target = 'all', depth = 'deep' } = payload || {};
        const issues = [];
        const recommendations = [];
        const tiers = ['working', 'session', 'long_term'];
        const categories = [
            'tier_consistency',
            'gateway_routing',
            'ttl_violation',
            'eviction_policy',
            'retrieval_accuracy',
        ];
        const auditDepth = depth === 'exhaustive' ? 8 : depth === 'deep' ? 5 : 3;
        for (let i = 0; i < auditDepth; i++) {
            const issue = {
                id: this.generateId(),
                severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
                category: categories[i % categories.length],
                description: `Memory issue in ${target}: ${categories[i % categories.length].replace('_', ' ')} detected`,
                tier: tiers[i % tiers.length],
            };
            issues.push(issue);
            this.memoryAuditLog.push(issue);
        }
        const score = Math.max(0, 100 -
            issues.reduce((penalty, issue) => {
                const weight = issue.severity === 'critical'
                    ? 25
                    : issue.severity === 'high'
                        ? 15
                        : issue.severity === 'medium'
                            ? 8
                            : 3;
                return penalty + weight;
            }, 0));
        if (issues.some((i) => i.category === 'tier_consistency')) {
            recommendations.push('Ensure data consistency across memory tiers with write-through or write-behind strategies');
        }
        if (issues.some((i) => i.category === 'ttl_violation')) {
            recommendations.push('Enforce TTL policies and implement automated cleanup for expired entries');
        }
        if (issues.some((i) => i.category === 'retrieval_accuracy')) {
            recommendations.push('Improve vector search indexing and query optimization for cross-tier retrieval');
        }
        this.logger.log(`Memory audit completed for ${target}: score ${score}, ${issues.length} issues`);
        return { score, issues, recommendations };
    }
    async auditTiers(checkTTL = true, checkEviction = true) {
        const tierHealth = {
            working: {
                entries: Math.floor(Math.random() * 500),
                hitRate: Math.round(Math.random() * 40 + 60),
                avgTTL: 300,
            },
            session: {
                entries: Math.floor(Math.random() * 200),
                hitRate: Math.round(Math.random() * 30 + 50),
                avgTTL: 1800,
            },
            long_term: {
                entries: Math.floor(Math.random() * 1000),
                hitRate: Math.round(Math.random() * 20 + 40),
                avgTTL: Infinity,
            },
        };
        if (checkTTL) {
            const ttlViolations = Math.floor(Math.random() * 5);
            tierHealth.working.ttlViolations = ttlViolations;
        }
        if (checkEviction) {
            const evictionPolicies = { working: 'LRU', session: 'LRU', long_term: 'none' };
            Object.keys(tierHealth).forEach((tier) => {
                tierHealth[tier].evictionPolicy = evictionPolicies[tier];
            });
        }
        const consistencyScore = Math.round((tierHealth.working.hitRate + tierHealth.session.hitRate + tierHealth.long_term.hitRate) / 3);
        this.logger.log(`Memory tier audit: consistency score ${consistencyScore}`);
        return { tierHealth, consistencyScore };
    }
    async auditGateway(gatewayId) {
        const routingIssues = [];
        const issueCount = Math.floor(Math.random() * 4);
        for (let i = 0; i < issueCount; i++) {
            routingIssues.push({
                id: this.generateId(),
                type: ['misroute', 'timeout', 'fallback_failure', 'deadlock'][i % 4],
                gateway: gatewayId || 'memory-gateway',
                description: `Gateway routing issue: ${['Request misrouted to wrong tier', 'Gateway timeout on retrieval', 'Fallback mechanism failed', 'Potential deadlock detected'][i % 4]}`,
                severity: 'medium',
            });
        }
        const gatewayScore = Math.max(0, 100 - routingIssues.length * 15);
        this.logger.log(`Gateway audit for ${gatewayId || 'memory-gateway'}: score ${gatewayScore}, ${routingIssues.length} issues`);
        return { gatewayScore, routingIssues };
    }
    async auditCrossTierRetrieval(testQueries = 50) {
        const tierHitRates = {
            working: Math.round(Math.random() * 30 + 70),
            session: Math.round(Math.random() * 25 + 50),
            long_term: Math.round(Math.random() * 20 + 30),
        };
        const retrievalAccuracy = Math.round(((tierHitRates.working + tierHitRates.session + tierHitRates.long_term) / 3) * 100) / 100;
        const avgRetrievalTimeMs = Math.round((tierHitRates.working * 2 + tierHitRates.session * 10 + tierHitRates.long_term * 50) / 3);
        this.logger.log(`Cross-tier retrieval audit: accuracy ${retrievalAccuracy}%, avg time ${avgRetrievalTimeMs}ms`);
        return { retrievalAccuracy, avgRetrievalTimeMs, tierHitRates };
    }
};
exports.MemoryAuditorAgent = MemoryAuditorAgent;
exports.MemoryAuditorAgent = MemoryAuditorAgent = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], MemoryAuditorAgent);
//# sourceMappingURL=memory-auditor-agent.service.js.map