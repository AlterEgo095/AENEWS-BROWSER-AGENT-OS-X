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
exports.LLMJudgeAgentService = exports.LLM_JUDGE_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
const agent_interface_1 = require("../interfaces/agent.interface");
const bridge_1 = require("../bridge");
exports.LLM_JUDGE_AGENT_CONFIG = {
    id: 'llm-judge',
    name: 'LLMJudge',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '2.0.0',
    description: 'Intelligent final arbiter using LLM reasoning for go/no-go decisions on mission results. Produces nuanced verdicts with detailed reasoning, confidence scores, and conditional requirements when applicable.',
    capabilities: [
        {
            name: 'judgeResult',
            description: 'Make a go/no-go decision on a mission result using LLM reasoning',
            inputSchema: {
                type: 'object',
                properties: {
                    missionRequirements: { type: 'object', description: 'Original mission requirements' },
                    executionResults: { type: 'object', description: 'The execution results to judge' },
                    critiqueFeedback: { type: 'object', description: 'Prior critique feedback (if any)' },
                },
                required: ['missionRequirements', 'executionResults'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    verdict: { type: 'string', enum: ['approved', 'rejected', 'conditional'] },
                    confidenceScore: { type: 'number', minimum: 0, maximum: 1 },
                    reasoning: { type: 'string' },
                    conditions: { type: 'array', items: { type: 'string' } },
                    requiredActions: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'arbitrateDispute',
            description: 'Arbitrate between conflicting agent outputs or recommendations',
            inputSchema: {
                type: 'object',
                properties: {
                    conflictingOutputs: {
                        type: 'array',
                        items: { type: 'object' },
                        description: 'Conflicting outputs to arbitrate',
                    },
                    context: { type: 'object', description: 'Context for arbitration' },
                    criteria: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Arbitration criteria',
                    },
                },
                required: ['conflictingOutputs'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    selectedOutput: { type: 'string' },
                    reasoning: { type: 'string' },
                    confidenceScore: { type: 'number' },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:mission', 'write:verdict'],
    maxConcurrentTasks: 3,
    timeout: 60000,
    retryPolicy: { maxRetries: 2, backoffMs: 2000, exponentialBackoff: true },
};
const JUDGE_SYSTEM_PROMPT = `You are the final judge for AI mission results. Given the mission requirements and execution results, make a definitive assessment.

Consider:
- Were all requirements met?
- Is the quality sufficient for the stated purpose?
- Are there any risks or concerns with the deliverables?
- Is additional work needed before the results can be accepted?

Output JSON with: verdict (approved|rejected|conditional), confidenceScore (0-1), reasoning, conditions (if conditional, list of conditions that must be met), requiredActions (if conditional or rejected, list of {action, priority, assignee}).`;
let LLMJudgeAgentService = class LLMJudgeAgentService extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
    }
    defineConfig() {
        return exports.LLM_JUDGE_AGENT_CONFIG;
    }
    async onInitialize() {
        this.logger.log('LLM Judge agent initialized — intelligent arbitration enabled');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: JUDGE_SYSTEM_PROMPT,
                    userPrompt: `Judge this mission result: ${JSON.stringify(input.payload, null, 2)}`,
                    temperature: 0.15,
                    maxTokens: 4096,
                });
                const verdict = this.parseVerdictFromLLM(llmResult.content);
                return this.createAgentOutput(input.taskId, true, {
                    verdict,
                    rawAnalysis: llmResult.content,
                    costUsd: llmResult.costUsd,
                    tokensUsed: llmResult.tokenCount,
                }, undefined, startTime);
            }
            catch (error) {
                this.logger.warn(`LLM judging failed, falling back to rule-based: ${error.message}`);
            }
        }
        const payload = input.payload || {};
        const isSuccess = payload.executionResults?.success !== false && payload.executionResults?.error === undefined;
        return this.createAgentOutput(input.taskId, true, {
            verdict: {
                verdict: isSuccess ? 'approved' : 'rejected',
                confidenceScore: isSuccess ? 0.7 : 0.6,
                reasoning: isSuccess
                    ? 'Execution completed without errors (rule-based assessment)'
                    : 'Execution reported failures or errors (rule-based assessment)',
                conditions: [],
                requiredActions: isSuccess
                    ? []
                    : [
                        {
                            action: 'Review and fix reported errors',
                            priority: 'high',
                            assignee: 'repair-agent',
                        },
                    ],
            },
        }, undefined, startTime);
    }
    parseVerdictFromLLM(content) {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
        }
        catch {
            return { raw: content };
        }
    }
    async onDestroy() {
        this.logger.log('LLM Judge agent destroyed');
    }
};
exports.LLMJudgeAgentService = LLMJudgeAgentService;
exports.LLMJudgeAgentService = LLMJudgeAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], LLMJudgeAgentService);
//# sourceMappingURL=llm-judge-agent.service.js.map