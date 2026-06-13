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
exports.CircuitBreakerManagerAgentService = exports.WATCHDOG_CIRCUIT_BREAKER_MANAGER_CONFIG = exports.GlobalHealthStatus = exports.CircuitBreakerState = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
const agent_interface_1 = require("../interfaces/agent.interface");
const bridge_1 = require("../bridge");
var CircuitBreakerState;
(function (CircuitBreakerState) {
    CircuitBreakerState["CLOSED"] = "CLOSED";
    CircuitBreakerState["OPEN"] = "OPEN";
    CircuitBreakerState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitBreakerState || (exports.CircuitBreakerState = CircuitBreakerState = {}));
var GlobalHealthStatus;
(function (GlobalHealthStatus) {
    GlobalHealthStatus["HEALTHY"] = "healthy";
    GlobalHealthStatus["DEGRADED"] = "degraded";
    GlobalHealthStatus["CRITICAL"] = "critical";
})(GlobalHealthStatus || (exports.GlobalHealthStatus = GlobalHealthStatus = {}));
exports.WATCHDOG_CIRCUIT_BREAKER_MANAGER_CONFIG = {
    id: 'watchdog-circuit-breaker-manager',
    name: 'CircuitBreakerManager',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '2.0.0',
    description: 'Manages circuit breakers across the platform — monitors agent health, opens/closes circuit breakers, and coordinates recovery using LLM-powered intelligent decisions',
    capabilities: [
        {
            name: 'assessHealth',
            description: 'Assess the health of all agents and determine circuit breaker states',
            inputSchema: {
                type: 'object',
                properties: {
                    agentIds: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Specific agents to assess (optional)',
                    },
                    includeHistory: {
                        type: 'boolean',
                        description: 'Include failure history in the assessment',
                    },
                },
                required: [],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    agentStates: { type: 'object', description: 'Map of agentId to circuit state' },
                    globalHealth: { type: 'string', description: 'Overall platform health' },
                    recoveryPlan: { type: 'object', description: 'Recovery plan if needed' },
                },
            },
        },
        {
            name: 'updateCircuitState',
            description: 'Update the circuit breaker state for a specific agent based on failure or success',
            inputSchema: {
                type: 'object',
                properties: {
                    agentId: { type: 'string', description: 'The agent to update' },
                    eventType: { type: 'string', enum: ['failure', 'success'], description: 'Type of event' },
                    errorCategory: { type: 'string', description: 'Error category if failure' },
                    errorMessage: { type: 'string', description: 'Error message if failure' },
                    taskId: { type: 'string', description: 'Related task ID' },
                },
                required: ['agentId', 'eventType'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    previousState: { type: 'string' },
                    newState: { type: 'string' },
                    action: { type: 'string' },
                },
            },
        },
        {
            name: 'planRecovery',
            description: 'Plan a recovery strategy for agents in OPEN or HALF_OPEN circuit states',
            inputSchema: {
                type: 'object',
                properties: {
                    agentIds: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Agents needing recovery',
                    },
                    strategy: { type: 'string', description: 'Recovery strategy hint' },
                },
                required: [],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    recoveryPlan: { type: 'object', description: 'Detailed recovery plan' },
                    globalHealth: { type: 'string', description: 'Current global health status' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:agent',
        'write:circuit-breaker',
        'read:health',
        'write:recovery',
    ],
    maxConcurrentTasks: 5,
    timeout: 30000,
    retryPolicy: { maxRetries: 2, backoffMs: 1500, exponentialBackoff: true },
};
let CircuitBreakerManagerAgentService = class CircuitBreakerManagerAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.circuitStates = new Map();
        this.defaultThresholds = {
            failureThreshold: 5,
            successThreshold: 3,
            resetTimeoutMs: 60000,
            maxHistorySize: 100,
        };
    }
    defineConfig() {
        return exports.WATCHDOG_CIRCUIT_BREAKER_MANAGER_CONFIG;
    }
    async onInitialize() {
        this.logger.log('Circuit Breaker Manager agent initialized');
        await this.restoreCircuitStates();
    }
    async onExecute(input) {
        const startTime = Date.now();
        const capability = input.payload.capability || 'assessHealth';
        switch (capability) {
            case 'assessHealth':
                return this.assessHealth(input.taskId, input.payload, startTime);
            case 'updateCircuitState':
                return this.updateCircuitState(input.taskId, input.payload, startTime);
            case 'planRecovery':
                return this.planRecovery(input.taskId, input.payload, startTime);
            default:
                return this.assessHealth(input.taskId, input.payload, startTime);
        }
    }
    async onDestroy() {
        await this.persistCircuitStates();
        this.logger.log('Circuit Breaker Manager agent destroyed');
    }
    async assessHealth(taskId, payload, startTime) {
        const { agentIds, includeHistory = true } = payload;
        const targetAgentIds = agentIds?.length > 0 ? agentIds : Array.from(this.circuitStates.keys());
        const agentStates = {};
        for (const agentId of targetAgentIds) {
            const state = this.getOrCreateCircuitState(agentId);
            agentStates[agentId] = {
                agentId,
                currentState: state.state,
                failureCount: state.failureCount,
                lastFailureTime: state.lastFailureTime?.toISOString() || null,
                lastSuccessTime: state.lastSuccessTime?.toISOString() || null,
                consecutiveFailures: state.consecutiveFailures,
                consecutiveSuccesses: state.consecutiveSuccesses,
                recommendedAction: this.getRecommendedAction(state),
                failureHistory: includeHistory ? state.failureHistory : [],
            };
        }
        const globalHealth = this.calculateGlobalHealth(agentStates);
        if (this.bridge && Object.keys(agentStates).length > 0) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: `You are a circuit breaker manager for a distributed AI agent platform. Given the current health states of agents and their failure history, determine circuit breaker actions.

Circuit breaker states:
- CLOSED: Normal operation, requests flow through
- OPEN: Blocking requests, agent is in failure state
- HALF_OPEN: Testing recovery, limited requests allowed

Output JSON:
{
  "agentStates": { "<agentId>": { "currentState": "CLOSED|OPEN|HALF_OPEN", "failureCount": number, "lastFailureTime": "ISO string", "recommendedAction": "string describing what to do" } },
  "globalHealth": "healthy|degraded|critical",
  "recoveryPlan": {
    "immediateActions": ["actions to take now"],
    "phasedRecovery": [
      { "phase": 1, "description": "string", "agentsToRecover": ["agentIds"], "estimatedDurationMs": number }
    ],
    "monitoringStrategy": "string",
    "rollbackTriggers": ["conditions that should trigger rollback"]
  }
}`,
                    userPrompt: `Assess the health of these agents and determine circuit breaker actions:
${JSON.stringify(agentStates, null, 2)}

Global health pre-assessment: ${globalHealth}`,
                    temperature: 0.1,
                    maxTokens: 4096,
                });
                const assessment = this.parseAssessment(llmResult.content, agentStates, globalHealth);
                await this.applyRecommendedStateChanges(assessment.agentStates);
                await this.storeInWorkingMemory('circuit-breaker:latest-assessment', assessment, 300000);
                return this.createAgentOutput(taskId, true, {
                    ...assessment,
                    costUsd: llmResult.costUsd,
                }, undefined, startTime);
            }
            catch (err) {
                this.logger.warn(`LLM health assessment failed: ${err.message}`);
            }
        }
        const fallbackAssessment = {
            agentStates,
            globalHealth,
            recoveryPlan: this.generateFallbackRecoveryPlan(agentStates, globalHealth),
            timestamp: new Date().toISOString(),
        };
        await this.storeInWorkingMemory('circuit-breaker:latest-assessment', fallbackAssessment, 300000);
        return this.createAgentOutput(taskId, true, fallbackAssessment, undefined, startTime);
    }
    async updateCircuitState(taskId, payload, startTime) {
        const { agentId, eventType, errorCategory, errorMessage, taskId: eventTaskId } = payload;
        if (!agentId) {
            return this.createAgentOutput(taskId, false, null, 'agentId is required for circuit state update', startTime);
        }
        const state = this.getOrCreateCircuitState(agentId);
        const previousState = state.state;
        if (eventType === 'failure') {
            state.failureCount++;
            state.consecutiveFailures++;
            state.consecutiveSuccesses = 0;
            state.lastFailureTime = new Date();
            state.failureHistory.push({
                timestamp: new Date().toISOString(),
                errorCategory: errorCategory || 'UNKNOWN',
                errorMessage: errorMessage || 'Unknown error',
                taskId: eventTaskId || '',
            });
            if (state.failureHistory.length > this.defaultThresholds.maxHistorySize) {
                state.failureHistory = state.failureHistory.slice(-this.defaultThresholds.maxHistorySize);
            }
            if (state.state === CircuitBreakerState.CLOSED) {
                if (state.consecutiveFailures >= this.defaultThresholds.failureThreshold) {
                    state.state = CircuitBreakerState.OPEN;
                    state.openedAt = new Date();
                    this.logger.warn(`Circuit breaker OPENED for agent ${agentId} after ${state.consecutiveFailures} consecutive failures`);
                }
            }
            else if (state.state === CircuitBreakerState.HALF_OPEN) {
                state.state = CircuitBreakerState.OPEN;
                state.openedAt = new Date();
                state.halfOpenTestCount = 0;
                this.logger.warn(`Circuit breaker re-OPENED for agent ${agentId} — half-open test failed`);
            }
        }
        else if (eventType === 'success') {
            state.consecutiveSuccesses++;
            state.consecutiveFailures = 0;
            state.lastSuccessTime = new Date();
            if (state.state === CircuitBreakerState.HALF_OPEN) {
                state.halfOpenTestCount++;
                if (state.halfOpenTestCount >= state.halfOpenSuccessThreshold) {
                    state.state = CircuitBreakerState.CLOSED;
                    state.halfOpenTestCount = 0;
                    state.openedAt = null;
                    this.logger.log(`Circuit breaker CLOSED for agent ${agentId} — recovery successful`);
                }
            }
        }
        if (state.state === CircuitBreakerState.OPEN && state.openedAt) {
            const elapsed = Date.now() - state.openedAt.getTime();
            if (elapsed >= this.defaultThresholds.resetTimeoutMs) {
                state.state = CircuitBreakerState.HALF_OPEN;
                state.halfOpenTestCount = 0;
                this.logger.log(`Circuit breaker transitioned to HALF_OPEN for agent ${agentId} after timeout`);
            }
        }
        await this.persistCircuitStates();
        const action = this.describeAction(previousState, state.state, eventType);
        return this.createAgentOutput(taskId, true, {
            agentId,
            previousState,
            newState: state.state,
            action,
            failureCount: state.failureCount,
            consecutiveFailures: state.consecutiveFailures,
            consecutiveSuccesses: state.consecutiveSuccesses,
        }, undefined, startTime);
    }
    async planRecovery(taskId, payload, startTime) {
        const { agentIds, strategy } = payload;
        const agentsNeedingRecovery = (agentIds?.length > 0 ? agentIds : Array.from(this.circuitStates.keys())).filter((id) => {
            const state = this.circuitStates.get(id);
            return (state &&
                (state.state === CircuitBreakerState.OPEN || state.state === CircuitBreakerState.HALF_OPEN));
        });
        if (agentsNeedingRecovery.length === 0) {
            return this.createAgentOutput(taskId, true, {
                recoveryPlan: {
                    immediateActions: ['No agents currently in failure state — no recovery needed'],
                    phasedRecovery: [],
                    monitoringStrategy: 'Continue regular health monitoring',
                    rollbackTriggers: [],
                },
                globalHealth: GlobalHealthStatus.HEALTHY,
            }, undefined, startTime);
        }
        const agentStates = {};
        for (const agentId of agentsNeedingRecovery) {
            const state = this.circuitStates.get(agentId);
            agentStates[agentId] = {
                agentId,
                currentState: state.state,
                failureCount: state.failureCount,
                lastFailureTime: state.lastFailureTime?.toISOString() || null,
                lastSuccessTime: state.lastSuccessTime?.toISOString() || null,
                consecutiveFailures: state.consecutiveFailures,
                consecutiveSuccesses: state.consecutiveSuccesses,
                recommendedAction: this.getRecommendedAction(state),
                failureHistory: state.failureHistory.slice(-10),
            };
        }
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: `You are a circuit breaker recovery planner for a distributed AI agent platform. Design a phased recovery plan for agents in failure states.

Consider:
- Prioritize recovery by criticality and dependency
- Use gradual traffic increase (canary approach)
- Include monitoring checkpoints between phases
- Define clear rollback triggers

Output JSON:
{
  "recoveryPlan": {
    "immediateActions": ["actions to take now"],
    "phasedRecovery": [
      { "phase": 1, "description": "string", "agentsToRecover": ["agentIds"], "estimatedDurationMs": number }
    ],
    "monitoringStrategy": "string describing how to monitor during recovery",
    "rollbackTriggers": ["conditions that trigger rollback"]
  },
  "globalHealth": "degraded|critical"
}`,
                    userPrompt: `Plan recovery for these agents in failure states:
${JSON.stringify(agentStates, null, 2)}

Strategy hint: ${strategy || 'auto'}
Current time: ${new Date().toISOString()}`,
                    temperature: 0.2,
                    maxTokens: 3072,
                });
                const parsed = this.parseRecoveryPlan(llmResult.content, agentStates);
                return this.createAgentOutput(taskId, true, {
                    ...parsed,
                    costUsd: llmResult.costUsd,
                }, undefined, startTime);
            }
            catch (err) {
                this.logger.warn(`LLM recovery planning failed: ${err.message}`);
            }
        }
        const globalHealth = this.calculateGlobalHealth(agentStates);
        const fallbackPlan = this.generateFallbackRecoveryPlan(agentStates, globalHealth);
        return this.createAgentOutput(taskId, true, {
            recoveryPlan: fallbackPlan,
            globalHealth,
        }, undefined, startTime);
    }
    getOrCreateCircuitState(agentId) {
        if (!this.circuitStates.has(agentId)) {
            this.circuitStates.set(agentId, {
                state: CircuitBreakerState.CLOSED,
                failureCount: 0,
                lastFailureTime: null,
                lastSuccessTime: null,
                consecutiveFailures: 0,
                consecutiveSuccesses: 0,
                failureHistory: [],
                halfOpenTestCount: 0,
                halfOpenSuccessThreshold: this.defaultThresholds.successThreshold,
                openedAt: null,
            });
        }
        return this.circuitStates.get(agentId);
    }
    getRecommendedAction(state) {
        switch (state.state) {
            case CircuitBreakerState.CLOSED:
                if (state.consecutiveFailures > 0) {
                    return `Monitor closely — ${state.consecutiveFailures} consecutive failures observed`;
                }
                return 'Normal operation — no action needed';
            case CircuitBreakerState.OPEN:
                return `Block all requests — agent has ${state.consecutiveFailures} consecutive failures. Wait for reset timeout before attempting half-open test.`;
            case CircuitBreakerState.HALF_OPEN:
                return `Allow limited test requests — ${state.halfOpenTestCount}/${state.halfOpenSuccessThreshold} successful tests completed`;
            default:
                return 'Unknown state';
        }
    }
    calculateGlobalHealth(agentStates) {
        const states = Object.values(agentStates);
        if (states.length === 0)
            return GlobalHealthStatus.HEALTHY;
        const openCount = states.filter((s) => s.currentState === CircuitBreakerState.OPEN).length;
        const halfOpenCount = states.filter((s) => s.currentState === CircuitBreakerState.HALF_OPEN).length;
        const total = states.length;
        const openRatio = openCount / total;
        const degradedRatio = (openCount + halfOpenCount) / total;
        if (openRatio > 0.5 || openCount >= 5) {
            return GlobalHealthStatus.CRITICAL;
        }
        if (degradedRatio > 0.3 || openCount >= 2) {
            return GlobalHealthStatus.DEGRADED;
        }
        return GlobalHealthStatus.HEALTHY;
    }
    describeAction(previousState, newState, eventType) {
        if (previousState === newState) {
            return `${eventType} recorded — circuit remains ${newState}`;
        }
        return `Circuit transitioned from ${previousState} to ${newState} on ${eventType}`;
    }
    parseAssessment(content, originalStates, fallbackGlobalHealth) {
        try {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                const agentStates = { ...originalStates };
                if (parsed.agentStates && typeof parsed.agentStates === 'object') {
                    for (const [agentId, recommended] of Object.entries(parsed.agentStates)) {
                        if (agentStates[agentId] && recommended.currentState) {
                            const validStates = Object.values(CircuitBreakerState);
                            const recommendedState = recommended.currentState;
                            if (validStates.includes(recommendedState)) {
                                agentStates[agentId] = {
                                    ...agentStates[agentId],
                                    ...(recommended.recommendedAction
                                        ? { recommendedAction: recommended.recommendedAction }
                                        : {}),
                                };
                            }
                        }
                    }
                }
                const globalHealth = Object.values(GlobalHealthStatus).includes(parsed.globalHealth)
                    ? parsed.globalHealth
                    : fallbackGlobalHealth;
                return {
                    agentStates,
                    globalHealth,
                    recoveryPlan: parsed.recoveryPlan || this.generateFallbackRecoveryPlan(agentStates, globalHealth),
                    timestamp: new Date().toISOString(),
                };
            }
        }
        catch {
        }
        return {
            agentStates: originalStates,
            globalHealth: fallbackGlobalHealth,
            recoveryPlan: this.generateFallbackRecoveryPlan(originalStates, fallbackGlobalHealth),
            timestamp: new Date().toISOString(),
        };
    }
    parseRecoveryPlan(content, agentStates) {
        try {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                const globalHealth = Object.values(GlobalHealthStatus).includes(parsed.globalHealth)
                    ? parsed.globalHealth
                    : GlobalHealthStatus.DEGRADED;
                const plan = parsed.recoveryPlan;
                if (plan) {
                    return {
                        recoveryPlan: {
                            immediateActions: Array.isArray(plan.immediateActions) ? plan.immediateActions : [],
                            phasedRecovery: Array.isArray(plan.phasedRecovery)
                                ? plan.phasedRecovery.map((p, i) => ({
                                    phase: p.phase || i + 1,
                                    description: p.description || `Phase ${i + 1}`,
                                    agentsToRecover: Array.isArray(p.agentsToRecover) ? p.agentsToRecover : [],
                                    estimatedDurationMs: p.estimatedDurationMs || 30000,
                                }))
                                : [],
                            monitoringStrategy: plan.monitoringStrategy || 'Monitor agent health every 30 seconds during recovery',
                            rollbackTriggers: Array.isArray(plan.rollbackTriggers) ? plan.rollbackTriggers : [],
                        },
                        globalHealth,
                    };
                }
            }
        }
        catch {
        }
        return {
            recoveryPlan: this.generateFallbackRecoveryPlan(agentStates, GlobalHealthStatus.DEGRADED),
            globalHealth: GlobalHealthStatus.DEGRADED,
        };
    }
    async applyRecommendedStateChanges(recommendedStates) {
        for (const [agentId, recommendation] of Object.entries(recommendedStates)) {
            const state = this.circuitStates.get(agentId);
            if (!state)
                continue;
            const recommendedState = recommendation.currentState;
            if (Object.values(CircuitBreakerState).includes(recommendedState)) {
                if (state.state !== recommendedState) {
                    const previousState = state.state;
                    state.state = recommendedState;
                    if (recommendedState === CircuitBreakerState.HALF_OPEN) {
                        state.halfOpenTestCount = 0;
                    }
                    else if (recommendedState === CircuitBreakerState.CLOSED) {
                        state.consecutiveFailures = 0;
                        state.openedAt = null;
                    }
                    else if (recommendedState === CircuitBreakerState.OPEN) {
                        state.openedAt = new Date();
                    }
                    this.logger.log(`Circuit breaker for ${agentId} changed from ${previousState} to ${recommendedState} (LLM recommended)`);
                }
            }
        }
    }
    generateFallbackRecoveryPlan(agentStates, globalHealth) {
        const openAgents = Object.values(agentStates).filter((s) => s.currentState === CircuitBreakerState.OPEN);
        const halfOpenAgents = Object.values(agentStates).filter((s) => s.currentState === CircuitBreakerState.HALF_OPEN);
        const immediateActions = [];
        const phasedRecovery = [];
        if (openAgents.length > 0) {
            immediateActions.push(`Block all traffic to ${openAgents.length} agents in OPEN state`, 'Initiate health check probes for all OPEN agents');
            phasedRecovery.push({
                phase: 1,
                description: 'Transition OPEN agents to HALF_OPEN for recovery testing',
                agentsToRecover: openAgents.map((a) => a.agentId),
                estimatedDurationMs: this.defaultThresholds.resetTimeoutMs,
            });
        }
        if (halfOpenAgents.length > 0) {
            immediateActions.push(`Allow limited test traffic to ${halfOpenAgents.length} agents in HALF_OPEN state`);
            phasedRecovery.push({
                phase: openAgents.length > 0 ? 2 : 1,
                description: 'Monitor HALF_OPEN agents and transition to CLOSED on success',
                agentsToRecover: halfOpenAgents.map((a) => a.agentId),
                estimatedDurationMs: 30000,
            });
        }
        if (globalHealth === GlobalHealthStatus.HEALTHY) {
            immediateActions.push('Continue regular health monitoring');
        }
        return {
            immediateActions: immediateActions.length > 0
                ? immediateActions
                : ['No immediate actions required — all agents healthy'],
            phasedRecovery,
            monitoringStrategy: 'Monitor circuit breaker states every 30 seconds; alert on OPEN transitions',
            rollbackTriggers: [
                'Any agent exceeds 10 consecutive failures during recovery',
                'Global health degrades to CRITICAL during recovery',
                'Recovery phase takes 3x longer than estimated',
            ],
        };
    }
    async persistCircuitStates() {
        const serializable = {};
        for (const [agentId, state] of this.circuitStates.entries()) {
            serializable[agentId] = {
                ...state,
                lastFailureTime: state.lastFailureTime?.toISOString() || null,
                lastSuccessTime: state.lastSuccessTime?.toISOString() || null,
                openedAt: state.openedAt?.toISOString() || null,
            };
        }
        await this.storeInWorkingMemory('circuit-breaker:states', serializable, 86400000);
    }
    async restoreCircuitStates() {
        const stored = await this.retrieveFromWorkingMemory('circuit-breaker:states');
        if (stored && typeof stored === 'object') {
            for (const [agentId, state] of Object.entries(stored)) {
                this.circuitStates.set(agentId, {
                    ...state,
                    lastFailureTime: state.lastFailureTime
                        ? new Date(state.lastFailureTime)
                        : null,
                    lastSuccessTime: state.lastSuccessTime
                        ? new Date(state.lastSuccessTime)
                        : null,
                    openedAt: state.openedAt ? new Date(state.openedAt) : null,
                });
            }
            this.logger.log(`Restored circuit states for ${this.circuitStates.size} agents`);
        }
    }
};
exports.CircuitBreakerManagerAgentService = CircuitBreakerManagerAgentService;
exports.CircuitBreakerManagerAgentService = CircuitBreakerManagerAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __param(3, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], CircuitBreakerManagerAgentService);
//# sourceMappingURL=circuit-breaker-manager-agent.service.js.map