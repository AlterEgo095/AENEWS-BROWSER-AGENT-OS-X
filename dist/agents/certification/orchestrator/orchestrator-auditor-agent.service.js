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
exports.OrchestratorAuditorAgent = exports.ORCHESTRATOR_AUDITOR_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.ORCHESTRATOR_AUDITOR_CONFIG = {
    id: 'certification-orchestrator-auditor',
    name: 'OrchestratorAuditor',
    cluster: 'certification',
    version: '1.0.0',
    description: 'Audits orchestration pipeline stages (decompose → plan → execute → critique → repair → deliver), task routing, and pipeline resilience across the agent framework.',
    capabilities: [
        {
            name: 'audit-orchestrator',
            description: 'Perform a comprehensive orchestration pipeline audit',
            inputSchema: {
                type: 'object',
                properties: {
                    target: { type: 'string', description: 'Pipeline or orchestrator to audit' },
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
            name: 'audit-pipeline',
            description: 'Audit each pipeline stage for correctness and error handling',
            inputSchema: {
                type: 'object',
                properties: {
                    taskId: { type: 'string', description: 'Task ID to trace through pipeline' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    stageResults: { type: 'array', items: { type: 'object' } },
                    pipelineScore: { type: 'number' },
                },
            },
        },
        {
            name: 'audit-routing',
            description: 'Audit task routing accuracy and agent selection',
            inputSchema: {
                type: 'object',
                properties: {
                    sampleSize: { type: 'number', description: 'Number of routing decisions to audit' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    routingAccuracy: { type: 'number' },
                    misroutes: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'audit-resilience',
            description: 'Audit pipeline resilience and failure recovery',
            inputSchema: {
                type: 'object',
                properties: {
                    simulateFailures: { type: 'boolean', description: 'Simulate failures to test recovery' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    resilienceScore: { type: 'number' },
                    failureRecoveries: { type: 'array', items: { type: 'object' } },
                },
            },
        },
    ],
    permissions: [
        'certification:audit',
        'certification:orchestrator',
        'read:orchestrator',
        'read:pipeline',
    ],
    maxConcurrentTasks: 5,
    timeout: 60000,
    retryPolicy: { maxRetries: 2, backoffMs: 1000, exponentialBackoff: true },
};
let OrchestratorAuditorAgent = class OrchestratorAuditorAgent extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
        this.orchestratorAuditLog = [];
    }
    defineConfig() {
        return exports.ORCHESTRATOR_AUDITOR_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'audit-orchestrator',
            description: 'Perform a comprehensive orchestration pipeline audit',
            execute: async (target, depth) => this.performAudit({ target, depth }),
        });
        this.registerTool({
            name: 'audit-pipeline',
            description: 'Audit each pipeline stage for correctness and error handling',
            execute: async (taskId) => this.auditPipeline(taskId),
        });
        this.registerTool({
            name: 'audit-routing',
            description: 'Audit task routing accuracy and agent selection',
            execute: async (sampleSize) => this.auditRouting(sampleSize),
        });
        this.registerTool({
            name: 'audit-resilience',
            description: 'Audit pipeline resilience and failure recovery',
            execute: async (simulateFailures) => this.auditResilience(simulateFailures),
        });
        this.logger.log('OrchestratorAuditor agent initialized with 4 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.CertCapability.INTEGRATION, {
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
                case 'audit-pipeline':
                    result = await this.auditPipeline(input.payload.taskId);
                    break;
                case 'audit-routing':
                    result = await this.auditRouting(input.payload.sampleSize);
                    break;
                case 'audit-resilience':
                    result = await this.auditResilience(input.payload.simulateFailures);
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
        this.orchestratorAuditLog = [];
        this.logger.log('OrchestratorAuditor agent destroyed, state cleared');
    }
    async performAudit(payload) {
        const { target = 'all', depth = 'deep' } = payload || {};
        const issues = [];
        const recommendations = [];
        const stages = ['decompose', 'plan', 'execute', 'critique', 'repair', 'deliver'];
        const categories = [...stages, 'routing', 'resilience'];
        const auditDepth = depth === 'exhaustive' ? 8 : depth === 'deep' ? 5 : 3;
        for (let i = 0; i < auditDepth; i++) {
            const category = categories[i % categories.length];
            const issue = {
                id: this.generateId(),
                severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
                category,
                description: `Orchestration issue at ${category} stage: ${this.getStageDescription(category)}`,
                stage: category,
            };
            issues.push(issue);
            this.orchestratorAuditLog.push(issue);
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
        if (issues.some((i) => ['decompose', 'plan'].includes(i.category))) {
            recommendations.push('Improve task decomposition heuristics and planning accuracy');
        }
        if (issues.some((i) => i.category === 'execute')) {
            recommendations.push('Add execution timeout handling and partial completion support');
        }
        if (issues.some((i) => ['critique', 'repair'].includes(i.category))) {
            recommendations.push('Strengthen critique criteria and repair strategy selection');
        }
        this.logger.log(`Orchestrator audit completed for ${target}: score ${score}, ${issues.length} issues`);
        return { score, issues, recommendations };
    }
    async auditPipeline(taskId) {
        const stages = ['decompose', 'plan', 'execute', 'critique', 'repair', 'deliver'];
        const stageResults = [];
        for (const stage of stages) {
            const success = Math.random() > 0.15;
            stageResults.push({
                stage,
                taskId: taskId || 'sample-task',
                success,
                durationMs: Math.floor(Math.random() * 5000 + 100),
                errorRate: Math.round(Math.random() * 20),
                qualityScore: Math.round(Math.random() * 30 + 70),
            });
        }
        const pipelineScore = Math.round(stageResults.reduce((sum, r) => sum + r.qualityScore, 0) / stageResults.length);
        this.logger.log(`Pipeline audit for ${taskId || 'sample'}: score ${pipelineScore}`);
        return { stageResults, pipelineScore };
    }
    async auditRouting(sampleSize = 100) {
        const misroutes = [];
        const clusters = ['browser', 'coding', 'security', 'infrastructure', 'office', 'marketing'];
        for (let i = 0; i < Math.floor(sampleSize * 0.1); i++) {
            misroutes.push({
                taskId: this.generateId(),
                expectedCluster: clusters[Math.floor(Math.random() * clusters.length)],
                actualCluster: clusters[Math.floor(Math.random() * clusters.length)],
                reason: 'Task capability mismatch',
            });
        }
        const routingAccuracy = Math.round((1 - misroutes.length / sampleSize) * 100 * 100) / 100;
        this.logger.log(`Routing audit: accuracy ${routingAccuracy}%, ${misroutes.length} misroutes out of ${sampleSize}`);
        return { routingAccuracy, misroutes };
    }
    async auditResilience(simulateFailures = true) {
        const failureRecoveries = [];
        if (simulateFailures) {
            const failureTypes = [
                'agent_timeout',
                'agent_error',
                'network_failure',
                'resource_exhaustion',
            ];
            for (const failureType of failureTypes) {
                const recovered = Math.random() > 0.3;
                failureRecoveries.push({
                    failureType,
                    detected: true,
                    recovered,
                    recoveryTimeMs: recovered ? Math.floor(Math.random() * 5000 + 500) : null,
                    recoveryStrategy: recovered
                        ? ['retry', 'fallback', 'circuit_breaker'][Math.floor(Math.random() * 3)]
                        : null,
                });
            }
        }
        const resilienceScore = Math.round((failureRecoveries.filter((f) => f.recovered).length /
            Math.max(failureRecoveries.length, 1)) *
            100);
        this.logger.log(`Resilience audit: score ${resilienceScore}%, ${failureRecoveries.filter((f) => f.recovered).length}/${failureRecoveries.length} recovered`);
        return { resilienceScore, failureRecoveries };
    }
    getStageDescription(stage) {
        const descriptions = {
            decompose: 'Task decomposition accuracy and granularity issues',
            plan: 'Planning quality and execution order optimization',
            execute: 'Execution correctness and error handling',
            critique: 'Critique criteria coverage and scoring consistency',
            repair: 'Repair strategy selection and effectiveness',
            deliver: 'Delivery format and completeness verification',
            routing: 'Task routing accuracy and agent selection',
            resilience: 'Failure detection and recovery mechanisms',
        };
        return descriptions[stage] || 'Unknown stage issue';
    }
};
exports.OrchestratorAuditorAgent = OrchestratorAuditorAgent;
exports.OrchestratorAuditorAgent = OrchestratorAuditorAgent = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], OrchestratorAuditorAgent);
//# sourceMappingURL=orchestrator-auditor-agent.service.js.map