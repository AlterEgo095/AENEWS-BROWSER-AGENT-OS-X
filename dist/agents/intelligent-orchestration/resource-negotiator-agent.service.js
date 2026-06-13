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
exports.ResourceNegotiatorAgentService = exports.RESOURCE_NEGOTIATOR_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
const agent_interface_1 = require("../interfaces/agent.interface");
const bridge_1 = require("../bridge");
exports.RESOURCE_NEGOTIATOR_AGENT_CONFIG = {
    id: 'intelligent-resource-negotiator',
    name: 'ResourceNegotiator',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '2.0.0',
    description: 'LLM-driven resource negotiator that manages allocation between competing agents and missions, resolves resource conflicts, and optimizes overall platform utilization',
    capabilities: [
        {
            name: 'negotiateAllocation',
            description: 'Negotiate resource allocation between competing missions',
            inputSchema: {
                type: 'object',
                properties: {
                    missions: {
                        type: 'array',
                        items: { type: 'object' },
                        description: 'Competing missions with their resource requirements',
                    },
                    availableResources: { type: 'object', description: 'Currently available resource pool' },
                    constraints: { type: 'object', description: 'Allocation constraints and policies' },
                },
                required: ['missions', 'availableResources'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    allocationDecisions: { type: 'array', items: { type: 'object' } },
                    deferredMissions: { type: 'array', items: { type: 'string' } },
                    conflictResolutions: { type: 'array', items: { type: 'object' } },
                    totalResourceUtilization: { type: 'number' },
                },
            },
        },
        {
            name: 'resolveConflict',
            description: 'Resolve a specific resource conflict between two or more missions',
            inputSchema: {
                type: 'object',
                properties: {
                    conflictType: { type: 'string', description: 'Type of resource conflict' },
                    competingMissions: { type: 'array', items: { type: 'object' } },
                    resourceInDispute: { type: 'string', description: 'The contested resource' },
                    availableAmount: { type: 'number', description: 'Amount of resource available' },
                },
                required: ['conflictType', 'competingMissions', 'resourceInDispute'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    resolution: { type: 'object' },
                    winner: { type: 'string' },
                    reasoning: { type: 'string' },
                    compensation: { type: 'object' },
                },
            },
        },
        {
            name: 'rebalanceResources',
            description: 'Rebalance resource allocation based on changing mission priorities and progress',
            inputSchema: {
                type: 'object',
                properties: {
                    currentAllocation: { type: 'object' },
                    missionUpdates: { type: 'array', items: { type: 'object' } },
                    newResourceAvailability: { type: 'object' },
                },
                required: ['currentAllocation'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    rebalancedAllocation: { type: 'object' },
                    transfers: { type: 'array', items: { type: 'object' } },
                    utilizationImprovement: { type: 'number' },
                },
            },
        },
    ],
    permissions: [
        'read:resources',
        'write:resources',
        'manage:allocation',
        'read:mission',
        'write:negotiation',
    ],
    maxConcurrentTasks: 5,
    timeout: 90000,
    retryPolicy: { maxRetries: 2, backoffMs: 2500, exponentialBackoff: true },
};
let ResourceNegotiatorAgentService = class ResourceNegotiatorAgentService extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
        this.currentAllocations = new Map();
    }
    defineConfig() {
        return exports.RESOURCE_NEGOTIATOR_AGENT_CONFIG;
    }
    async onInitialize() {
        this.logger.log('Resource Negotiator agent initialized');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { missions, availableResources, constraints, conflictType, competingMissions, resourceInDispute, action, } = input.payload;
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: `You are a resource negotiator for an AI agent platform. When multiple missions compete for limited resources (LLM tokens, browser instances, compute capacity), you negotiate optimal allocation. Output JSON with: allocationDecisions (array of {missionId, allocatedResources, priority, reasoning}), deferredMissions, conflictResolutions, totalResourceUtilization.`,
                    userPrompt: `Negotiate resource allocation:\nMissions: ${JSON.stringify(missions || competingMissions || [])}\nAvailable resources: ${JSON.stringify(availableResources || {})}\nConstraints: ${JSON.stringify(constraints || {})}\nConflict type: ${conflictType || 'general'}\nResource in dispute: ${resourceInDispute || 'N/A'}\nAction: ${action || 'negotiateAllocation'}`,
                    temperature: 0.2,
                    maxTokens: 4096,
                });
                const negotiation = this.parseNegotiation(llmResult.content);
                for (const decision of negotiation.allocationDecisions) {
                    this.currentAllocations.set(decision.missionId, decision.allocatedResources);
                }
                await this.storeInWorkingMemory('resource-negotiator:last-negotiation', { missions, negotiation, timestamp: new Date() }, 300000);
                return this.createAgentOutput(input.taskId, true, {
                    negotiation,
                    rawAnalysis: llmResult.content,
                    costUsd: llmResult.costUsd,
                }, undefined, startTime);
            }
            catch (error) {
                this.logger.warn(`LLM negotiation failed: ${error.message}`);
            }
        }
        const fallbackNegotiation = this.buildFallbackNegotiation(missions || competingMissions || [], availableResources || {});
        for (const decision of fallbackNegotiation.allocationDecisions) {
            this.currentAllocations.set(decision.missionId, decision.allocatedResources);
        }
        return this.createAgentOutput(input.taskId, true, { negotiation: fallbackNegotiation }, undefined, startTime);
    }
    parseNegotiation(content) {
        try {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return {
                    allocationDecisions: parsed.allocationDecisions || [],
                    deferredMissions: parsed.deferredMissions || [],
                    conflictResolutions: parsed.conflictResolutions || [],
                    totalResourceUtilization: parsed.totalResourceUtilization || 0,
                };
            }
            return {
                allocationDecisions: [],
                deferredMissions: [],
                conflictResolutions: [],
                totalResourceUtilization: 0,
                raw: content,
            };
        }
        catch {
            return {
                allocationDecisions: [],
                deferredMissions: [],
                conflictResolutions: [],
                totalResourceUtilization: 0,
                raw: content,
            };
        }
    }
    buildFallbackNegotiation(missions, availableResources) {
        const allocationDecisions = [];
        const deferredMissions = [];
        const conflictResolutions = [];
        if (missions.length === 0) {
            return {
                allocationDecisions,
                deferredMissions,
                conflictResolutions,
                totalResourceUtilization: 0,
            };
        }
        const sorted = [...missions].sort((a, b) => (b.priority || 1) - (a.priority || 1));
        const totalPriorityWeight = sorted.reduce((sum, m) => sum + (m.priority || 1), 0);
        const remaining = { ...availableResources };
        for (const mission of sorted) {
            const allocatedResources = {};
            let fullyAllocated = true;
            if (mission.requestedResources) {
                for (const [resource, requested] of Object.entries(mission.requestedResources)) {
                    const available = remaining[resource] ?? 0;
                    if (available >= requested) {
                        allocatedResources[resource] = requested;
                        remaining[resource] = available - requested;
                    }
                    else if (available > 0) {
                        const weight = (mission.priority || 1) / totalPriorityWeight;
                        const proportionalAmount = Math.floor(available * weight);
                        const allocated = Math.min(proportionalAmount, requested);
                        allocatedResources[resource] = allocated;
                        remaining[resource] = available - allocated;
                        fullyAllocated = false;
                        conflictResolutions.push({
                            resource,
                            missions: sorted.map((m) => m.missionId),
                            resolution: `Proportional allocation: ${allocated}/${requested} units to ${mission.missionId} (priority weight: ${(weight * 100).toFixed(1)}%)`,
                        });
                    }
                    else {
                        fullyAllocated = false;
                    }
                }
            }
            if (fullyAllocated && Object.keys(allocatedResources).length > 0) {
                allocationDecisions.push({
                    missionId: mission.missionId,
                    allocatedResources,
                    priority: mission.priority || 1,
                    reasoning: `Full allocation granted — priority ${mission.priority || 1}, sufficient resources available`,
                });
            }
            else if (Object.keys(allocatedResources).length > 0) {
                allocationDecisions.push({
                    missionId: mission.missionId,
                    allocatedResources,
                    priority: mission.priority || 1,
                    reasoning: `Partial allocation — some resources insufficient, allocated what was available`,
                });
            }
            else {
                deferredMissions.push(mission.missionId);
            }
        }
        let totalAllocated = 0;
        let totalAvailable = 0;
        for (const [resource, amount] of Object.entries(availableResources)) {
            totalAvailable += amount;
            totalAllocated += amount - (remaining[resource] || 0);
        }
        const totalResourceUtilization = totalAvailable > 0 ? totalAllocated / totalAvailable : 0;
        return { allocationDecisions, deferredMissions, conflictResolutions, totalResourceUtilization };
    }
    async onDestroy() {
        this.currentAllocations.clear();
        this.logger.log('Resource Negotiator agent destroyed, allocation tracking cleared');
    }
};
exports.ResourceNegotiatorAgentService = ResourceNegotiatorAgentService;
exports.ResourceNegotiatorAgentService = ResourceNegotiatorAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], ResourceNegotiatorAgentService);
//# sourceMappingURL=resource-negotiator-agent.service.js.map