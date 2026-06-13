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
exports.LLMCriticAgentService = exports.LLM_CRITIC_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
const agent_interface_1 = require("../interfaces/agent.interface");
const bridge_1 = require("../bridge");
exports.LLM_CRITIC_AGENT_CONFIG = {
    id: 'llm-critic',
    name: 'LLMCritic',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '2.0.0',
    description: 'Intelligent quality critic using LLM reasoning to evaluate execution results. Performs semantic quality analysis beyond rule-based checks — understands correctness, completeness, efficiency, and adherence to requirements.',
    capabilities: [
        {
            name: 'critiqueResult',
            description: 'Critique an execution result using LLM-based semantic analysis',
            inputSchema: {
                type: 'object',
                properties: {
                    executionResult: { type: 'object', description: 'The execution result to critique' },
                    requirements: { type: 'object', description: 'Requirements the result should satisfy' },
                    evaluationCriteria: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Specific criteria to evaluate',
                    },
                },
                required: ['executionResult'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    score: { type: 'number', minimum: 0, maximum: 100 },
                    issues: { type: 'array', items: { type: 'object' } },
                    strengths: { type: 'array', items: { type: 'string' } },
                    overallAssessment: { type: 'string' },
                },
            },
        },
        {
            name: 'compareResults',
            description: 'Compare two execution results and determine which is superior',
            inputSchema: {
                type: 'object',
                properties: {
                    resultA: { type: 'object', description: 'First execution result' },
                    resultB: { type: 'object', description: 'Second execution result' },
                    comparisonCriteria: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Criteria for comparison',
                    },
                },
                required: ['resultA', 'resultB'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    preferredResult: { type: 'string', enum: ['A', 'B', 'tie'] },
                    analysis: { type: 'object' },
                    reasoning: { type: 'string' },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:result', 'write:critique'],
    maxConcurrentTasks: 5,
    timeout: 45000,
    retryPolicy: { maxRetries: 2, backoffMs: 1500, exponentialBackoff: true },
};
const CRITIC_SYSTEM_PROMPT = `You are an expert quality critic for AI agent execution results. Analyze the provided execution results and evaluate: correctness, completeness, efficiency, adherence to requirements, and potential improvements.

For each issue found, classify its severity (critical|major|minor|info) and category (correctness|completeness|efficiency|compliance|usability|maintainability).

Output JSON with: score (0-100), issues (array of {severity, category, message, suggestion}), strengths, overallAssessment.`;
let LLMCriticAgentService = class LLMCriticAgentService extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
    }
    defineConfig() {
        return exports.LLM_CRITIC_AGENT_CONFIG;
    }
    async onInitialize() {
        this.logger.log('LLM Critic agent initialized — semantic quality evaluation enabled');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: CRITIC_SYSTEM_PROMPT,
                    userPrompt: `Critique this execution result: ${JSON.stringify(input.payload, null, 2)}`,
                    temperature: 0.3,
                    maxTokens: 4096,
                });
                const critique = this.parseCritiqueFromLLM(llmResult.content);
                return this.createAgentOutput(input.taskId, true, {
                    critique,
                    rawAnalysis: llmResult.content,
                    costUsd: llmResult.costUsd,
                    tokensUsed: llmResult.tokenCount,
                }, undefined, startTime);
            }
            catch (error) {
                this.logger.warn(`LLM critique failed, falling back to rule-based: ${error.message}`);
            }
        }
        const payload = input.payload || {};
        const score = payload.success !== false ? 70 : 30;
        return this.createAgentOutput(input.taskId, true, {
            critique: {
                score,
                issues: payload.success === false
                    ? [
                        {
                            severity: 'critical',
                            category: 'correctness',
                            message: 'Execution failed',
                            suggestion: 'Review error details and retry',
                        },
                    ]
                    : [],
                strengths: payload.success !== false ? ['Execution completed successfully'] : [],
                overallAssessment: score >= 60 ? 'Acceptable result' : 'Result needs improvement',
            },
        }, undefined, startTime);
    }
    parseCritiqueFromLLM(content) {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
        }
        catch {
            return { raw: content };
        }
    }
    async onDestroy() {
        this.logger.log('LLM Critic agent destroyed');
    }
};
exports.LLMCriticAgentService = LLMCriticAgentService;
exports.LLMCriticAgentService = LLMCriticAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], LLMCriticAgentService);
//# sourceMappingURL=llm-critic-agent.service.js.map