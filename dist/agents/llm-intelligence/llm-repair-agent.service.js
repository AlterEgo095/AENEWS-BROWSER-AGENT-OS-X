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
exports.LLMRepairAgentService = exports.LLM_REPAIR_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
const agent_interface_1 = require("../interfaces/agent.interface");
const bridge_1 = require("../bridge");
exports.LLM_REPAIR_AGENT_CONFIG = {
    id: 'llm-repair',
    name: 'LLMRepair',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '2.0.0',
    description: 'Intelligent failure analyst and repair strategist using LLM reasoning. Diagnoses root causes of failures and proposes targeted, context-aware repair strategies with confidence levels and alternatives.',
    capabilities: [
        {
            name: 'diagnoseAndRepair',
            description: 'Diagnose a failure and propose a targeted repair strategy using LLM reasoning',
            inputSchema: {
                type: 'object',
                properties: {
                    failedResult: { type: 'object', description: 'The failed execution result' },
                    errorDetails: { type: 'object', description: 'Error details and stack traces' },
                    executionContext: {
                        type: 'object',
                        description: 'Context in which the failure occurred',
                    },
                    attemptCount: { type: 'number', description: 'Number of previous attempts' },
                },
                required: ['failedResult', 'errorDetails'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    rootCause: { type: 'string' },
                    repairStrategy: {
                        type: 'string',
                        enum: ['retry', 'reassign', 'simplify', 'decompose', 'fallback', 'skip'],
                    },
                    repairParameters: { type: 'object' },
                    confidenceLevel: { type: 'number', minimum: 0, maximum: 1 },
                    alternativeStrategies: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'evaluateRepairOptions',
            description: 'Evaluate multiple repair options and recommend the best approach',
            inputSchema: {
                type: 'object',
                properties: {
                    failureContext: { type: 'object', description: 'Full context of the failure' },
                    availableOptions: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Available repair options',
                    },
                    constraints: {
                        type: 'object',
                        description: 'Constraints on repair (time, budget, resources)',
                    },
                },
                required: ['failureContext', 'availableOptions'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    recommendedOption: { type: 'string' },
                    reasoning: { type: 'string' },
                    tradeoffs: { type: 'array', items: { type: 'object' } },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:failure', 'write:repair'],
    maxConcurrentTasks: 4,
    timeout: 45000,
    retryPolicy: { maxRetries: 2, backoffMs: 1500, exponentialBackoff: true },
};
const REPAIR_SYSTEM_PROMPT = `You are an expert failure analyst and repair strategist. Given a failed execution result with its error details and context, analyze the root cause and propose a specific repair strategy.

Repair strategies:
- retry: Same approach, try again (for transient errors)
- reassign: Assign to a different agent or capability (for capability mismatch)
- simplify: Simplify the task or reduce scope (for overly complex tasks)
- decompose: Break the failing task into smaller subtasks (for tasks too large to handle)
- fallback: Use an alternative approach entirely (for fundamental approach issues)
- skip: Skip this task as non-critical (for optional tasks blocking critical path)

Output JSON with: rootCause (string describing the root cause), repairStrategy (retry|reassign|simplify|decompose|fallback|skip), repairParameters (object with specific parameters for the repair), confidenceLevel (0-1 how confident you are in this repair), alternativeStrategies (array of {strategy, parameters, confidence} as backups).`;
let LLMRepairAgentService = class LLMRepairAgentService extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
    }
    defineConfig() {
        return exports.LLM_REPAIR_AGENT_CONFIG;
    }
    async onInitialize() {
        this.logger.log('LLM Repair agent initialized — intelligent failure diagnosis enabled');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: REPAIR_SYSTEM_PROMPT,
                    userPrompt: `Analyze this failure and propose a repair strategy: ${JSON.stringify(input.payload, null, 2)}`,
                    temperature: 0.3,
                    maxTokens: 4096,
                });
                const repair = this.parseRepairFromLLM(llmResult.content);
                return this.createAgentOutput(input.taskId, true, {
                    repair,
                    rawAnalysis: llmResult.content,
                    costUsd: llmResult.costUsd,
                    tokensUsed: llmResult.tokenCount,
                }, undefined, startTime);
            }
            catch (error) {
                this.logger.warn(`LLM repair diagnosis failed, falling back to rule-based: ${error.message}`);
            }
        }
        const payload = input.payload || {};
        const attemptCount = payload.attemptCount || 0;
        const strategy = attemptCount >= 3 ? 'fallback' : 'retry';
        return this.createAgentOutput(input.taskId, true, {
            repair: {
                rootCause: `Execution failed (rule-based diagnosis)`,
                repairStrategy: strategy,
                repairParameters: strategy === 'retry'
                    ? { maxRetries: 2, delayMs: 3000, backoffMultiplier: 2 }
                    : {
                        fallbackCapability: 'dev.backend',
                        reason: 'Switching to alternative approach after multiple failures',
                    },
                confidenceLevel: 0.5,
                alternativeStrategies: [
                    { strategy: 'simplify', parameters: { reduceScope: true }, confidence: 0.4 },
                    { strategy: 'decompose', parameters: { maxSubtasks: 3 }, confidence: 0.35 },
                ],
            },
        }, undefined, startTime);
    }
    parseRepairFromLLM(content) {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
        }
        catch {
            return { raw: content };
        }
    }
    async onDestroy() {
        this.logger.log('LLM Repair agent destroyed');
    }
};
exports.LLMRepairAgentService = LLMRepairAgentService;
exports.LLMRepairAgentService = LLMRepairAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], LLMRepairAgentService);
//# sourceMappingURL=llm-repair-agent.service.js.map