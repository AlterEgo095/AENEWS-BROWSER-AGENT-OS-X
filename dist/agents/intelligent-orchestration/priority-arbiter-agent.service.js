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
exports.PriorityArbiterAgentService = exports.PRIORITY_ARBITER_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
const agent_interface_1 = require("../interfaces/agent.interface");
const bridge_1 = require("../bridge");
exports.PRIORITY_ARBITER_AGENT_CONFIG = {
    id: 'intelligent-priority-arbiter',
    name: 'PriorityArbiter',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '2.0.0',
    description: 'LLM-driven priority arbiter that resolves priority conflicts between missions and agents based on business context, urgency, dependencies, and strategic importance',
    capabilities: [
        {
            name: 'resolvePriorityConflict',
            description: 'Resolve a priority conflict between competing missions or agents',
            inputSchema: {
                type: 'object',
                properties: {
                    conflictingItems: {
                        type: 'array',
                        items: { type: 'object' },
                        description: 'Items with conflicting priorities',
                    },
                    conflictContext: {
                        type: 'object',
                        description: 'Business context surrounding the conflict',
                    },
                    resolutionPolicy: { type: 'string', description: 'Policy to guide resolution' },
                },
                required: ['conflictingItems'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    priorityDecisions: { type: 'array', items: { type: 'object' } },
                    escalatedItems: { type: 'array', items: { type: 'string' } },
                    rebalancingActions: { type: 'array', items: { type: 'object' } },
                    impactAssessment: { type: 'object' },
                },
            },
        },
        {
            name: 'rebalancePriorities',
            description: 'Rebalance priorities across all active missions based on current state',
            inputSchema: {
                type: 'object',
                properties: {
                    activeMissions: { type: 'array', items: { type: 'object' } },
                    recentCompletions: { type: 'array', items: { type: 'string' } },
                    newUrgencies: { type: 'array', items: { type: 'object' } },
                },
                required: ['activeMissions'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    adjustedPriorities: { type: 'array', items: { type: 'object' } },
                    rebalanceReasoning: { type: 'string' },
                    affectedMissions: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'escalateDecision',
            description: 'Escalate a priority decision that cannot be resolved automatically',
            inputSchema: {
                type: 'object',
                properties: {
                    item: { type: 'object' },
                    reason: { type: 'string' },
                    suggestedPriority: { type: 'number' },
                    humanDecisionRequired: { type: 'boolean' },
                },
                required: ['item', 'reason'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    escalationId: { type: 'string' },
                    status: { type: 'string' },
                    recommendedAction: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'read:mission',
        'write:priority',
        'manage:escalation',
        'read:agents',
        'write:arbitration',
    ],
    maxConcurrentTasks: 5,
    timeout: 90000,
    retryPolicy: { maxRetries: 2, backoffMs: 2500, exponentialBackoff: true },
};
let PriorityArbiterAgentService = class PriorityArbiterAgentService extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
        this.arbitrationHistory = new Map();
    }
    defineConfig() {
        return exports.PRIORITY_ARBITER_AGENT_CONFIG;
    }
    async onInitialize() {
        this.logger.log('Priority Arbiter agent initialized');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { conflictingItems, conflictContext, resolutionPolicy, activeMissions, action } = input.payload;
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: `You are a priority arbiter for an AI agent platform. When missions or agents have conflicting priorities, you resolve them based on business context, urgency, dependencies, and strategic importance. Output JSON with: priorityDecisions (array of {itemId, assignedPriority, reasoning}), escalatedItems, rebalancingActions, impactAssessment.`,
                    userPrompt: `Resolve priority conflict:\nConflicting items: ${JSON.stringify(conflictingItems || activeMissions || [])}\nContext: ${JSON.stringify(conflictContext || {})}\nResolution policy: ${resolutionPolicy || 'balanced'}\nAction: ${action || 'resolvePriorityConflict'}`,
                    temperature: 0.2,
                    maxTokens: 4096,
                });
                const arbitration = this.parseArbitration(llmResult.content);
                for (const decision of arbitration.priorityDecisions) {
                    this.arbitrationHistory.set(decision.itemId, decision);
                }
                await this.storeInWorkingMemory('priority-arbiter:last-arbitration', { conflictingItems, arbitration, timestamp: new Date() }, 300000);
                return this.createAgentOutput(input.taskId, true, {
                    arbitration,
                    rawAnalysis: llmResult.content,
                    costUsd: llmResult.costUsd,
                }, undefined, startTime);
            }
            catch (error) {
                this.logger.warn(`LLM arbitration failed: ${error.message}`);
            }
        }
        const fallbackArbitration = this.buildFallbackArbitration(conflictingItems || activeMissions || [], resolutionPolicy || 'balanced');
        for (const decision of fallbackArbitration.priorityDecisions) {
            this.arbitrationHistory.set(decision.itemId, decision);
        }
        return this.createAgentOutput(input.taskId, true, { arbitration: fallbackArbitration }, undefined, startTime);
    }
    parseArbitration(content) {
        try {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return {
                    priorityDecisions: parsed.priorityDecisions || [],
                    escalatedItems: parsed.escalatedItems || [],
                    rebalancingActions: parsed.rebalancingActions || [],
                    impactAssessment: parsed.impactAssessment || {
                        highImpactCount: 0,
                        mediumImpactCount: 0,
                        lowImpactCount: 0,
                        overallRisk: 'unknown',
                    },
                };
            }
            return {
                priorityDecisions: [],
                escalatedItems: [],
                rebalancingActions: [],
                impactAssessment: {
                    highImpactCount: 0,
                    mediumImpactCount: 0,
                    lowImpactCount: 0,
                    overallRisk: 'unknown',
                },
                raw: content,
            };
        }
        catch {
            return {
                priorityDecisions: [],
                escalatedItems: [],
                rebalancingActions: [],
                impactAssessment: {
                    highImpactCount: 0,
                    mediumImpactCount: 0,
                    lowImpactCount: 0,
                    overallRisk: 'unknown',
                },
                raw: content,
            };
        }
    }
    buildFallbackArbitration(items, policy) {
        const priorityDecisions = [];
        const escalatedItems = [];
        const rebalancingActions = [];
        let highImpactCount = 0;
        let mediumImpactCount = 0;
        let lowImpactCount = 0;
        if (items.length === 0) {
            return {
                priorityDecisions: [],
                escalatedItems: [],
                rebalancingActions: [],
                impactAssessment: {
                    highImpactCount: 0,
                    mediumImpactCount: 0,
                    lowImpactCount: 0,
                    overallRisk: 'none',
                },
            };
        }
        const weights = this.getPolicyWeights(policy);
        for (const item of items) {
            const urgency = item.urgency ?? 0.5;
            const strategicValue = item.strategicValue ?? 0.5;
            const deadlineProximity = this.computeDeadlineProximity(item.deadline);
            const dependencyWeight = this.computeDependencyWeight(item.dependencies);
            const compositeScore = weights.urgency * urgency * 100 +
                weights.strategic * strategicValue * 100 +
                weights.deadline * deadlineProximity * 100 +
                weights.dependency * dependencyWeight * 100;
            let assignedPriority;
            if (compositeScore >= 75) {
                assignedPriority = 3;
                highImpactCount++;
            }
            else if (compositeScore >= 50) {
                assignedPriority = 2;
                mediumImpactCount++;
            }
            else if (compositeScore >= 25) {
                assignedPriority = 1;
                lowImpactCount++;
            }
            else {
                assignedPriority = 0;
                lowImpactCount++;
            }
            const currentPriority = item.currentPriority ?? 1;
            if (Math.abs(assignedPriority - currentPriority) >= 2) {
                escalatedItems.push(item.itemId);
                rebalancingActions.push({
                    action: 'priority_shift',
                    target: item.itemId,
                    details: `Priority shifted from ${currentPriority} to ${assignedPriority} (composite score: ${compositeScore.toFixed(1)})`,
                });
            }
            const existingDecision = this.arbitrationHistory.get(item.itemId);
            if (existingDecision && existingDecision.assignedPriority !== assignedPriority) {
                rebalancingActions.push({
                    action: 'rebalance',
                    target: item.itemId,
                    details: `Rebalanced from ${existingDecision.assignedPriority} to ${assignedPriority} based on new scoring`,
                });
            }
            const reasoning = this.generateReasoning(urgency, strategicValue, deadlineProximity, dependencyWeight, compositeScore, policy);
            priorityDecisions.push({
                itemId: item.itemId,
                assignedPriority,
                reasoning,
            });
        }
        priorityDecisions.sort((a, b) => b.assignedPriority - a.assignedPriority);
        let overallRisk;
        if (highImpactCount > items.length * 0.5) {
            overallRisk = 'high';
        }
        else if (mediumImpactCount > items.length * 0.3) {
            overallRisk = 'medium';
        }
        else {
            overallRisk = 'low';
        }
        return {
            priorityDecisions,
            escalatedItems,
            rebalancingActions,
            impactAssessment: { highImpactCount, mediumImpactCount, lowImpactCount, overallRisk },
        };
    }
    getPolicyWeights(policy) {
        switch (policy) {
            case 'urgency_first':
                return { urgency: 0.45, strategic: 0.15, deadline: 0.3, dependency: 0.1 };
            case 'strategic_first':
                return { urgency: 0.15, strategic: 0.45, deadline: 0.1, dependency: 0.3 };
            case 'deadline_first':
                return { urgency: 0.25, strategic: 0.1, deadline: 0.5, dependency: 0.15 };
            case 'balanced':
            default:
                return { urgency: 0.3, strategic: 0.25, deadline: 0.25, dependency: 0.2 };
        }
    }
    computeDeadlineProximity(deadline) {
        if (!deadline)
            return 0.3;
        const now = Date.now();
        const remaining = deadline - now;
        if (remaining <= 0)
            return 1.0;
        if (remaining <= 3600000)
            return 0.9;
        if (remaining <= 86400000)
            return 0.7;
        if (remaining <= 604800000)
            return 0.4;
        return 0.2;
    }
    computeDependencyWeight(dependencies) {
        if (!dependencies || dependencies.length === 0)
            return 0.3;
        return Math.min(1.0, 0.3 + dependencies.length * 0.15);
    }
    generateReasoning(urgency, strategicValue, deadlineProximity, dependencyWeight, compositeScore, policy) {
        const factors = [];
        if (urgency >= 0.7)
            factors.push('high urgency');
        if (strategicValue >= 0.7)
            factors.push('high strategic value');
        if (deadlineProximity >= 0.7)
            factors.push('imminent deadline');
        if (dependencyWeight >= 0.6)
            factors.push('many dependencies (blocking others)');
        if (factors.length === 0) {
            return `Composite score ${compositeScore.toFixed(1)}/100 under "${policy}" policy — standard priority assigned`;
        }
        return `Composite score ${compositeScore.toFixed(1)}/100 under "${policy}" policy — driven by ${factors.join(', ')}`;
    }
    async onDestroy() {
        this.arbitrationHistory.clear();
        this.logger.log('Priority Arbiter agent destroyed, arbitration history cleared');
    }
};
exports.PriorityArbiterAgentService = PriorityArbiterAgentService;
exports.PriorityArbiterAgentService = PriorityArbiterAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], PriorityArbiterAgentService);
//# sourceMappingURL=priority-arbiter-agent.service.js.map