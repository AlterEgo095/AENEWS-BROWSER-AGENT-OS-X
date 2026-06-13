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
exports.LLMDecomposerAgentService = exports.LLM_DECOMPOSER_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
const agent_interface_1 = require("../interfaces/agent.interface");
const bridge_1 = require("../bridge");
exports.LLM_DECOMPOSER_AGENT_CONFIG = {
    id: 'llm-decomposer',
    name: 'LLMDecomposer',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '2.0.0',
    description: 'Intelligent task decomposer using LLM reasoning to break down complex missions into atomic, executable subtasks with proper dependency ordering and parallel execution groups.',
    capabilities: [
        {
            name: 'decomposeMission',
            description: 'Decompose a complex mission into atomic subtasks with dependency ordering',
            inputSchema: {
                type: 'object',
                properties: {
                    missionDescription: { type: 'string', description: 'The complex mission to decompose' },
                    availableCapabilities: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Available capability packs',
                    },
                    constraints: { type: 'object', description: 'Decomposition constraints' },
                    maxSubtasks: { type: 'number', description: 'Maximum number of subtasks to generate' },
                },
                required: ['missionDescription'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    subtasks: { type: 'array', items: { type: 'object' } },
                    executionGroups: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
                    strategy: { type: 'string', enum: ['sequential', 'parallel', 'hybrid'] },
                },
            },
        },
        {
            name: 'refineDecomposition',
            description: 'Refine an existing decomposition based on execution feedback',
            inputSchema: {
                type: 'object',
                properties: {
                    originalDecomposition: { type: 'object', description: 'The original task decomposition' },
                    executionFeedback: { type: 'object', description: 'Feedback from partial execution' },
                    refinementGoal: {
                        type: 'string',
                        description: 'What to improve (e.g., parallelism, granularity)',
                    },
                },
                required: ['originalDecomposition', 'executionFeedback'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    refinedSubtasks: { type: 'array', items: { type: 'object' } },
                    changesApplied: { type: 'array', items: { type: 'object' } },
                    reasoning: { type: 'string' },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:mission', 'write:decomposition'],
    maxConcurrentTasks: 3,
    timeout: 60000,
    retryPolicy: { maxRetries: 2, backoffMs: 2000, exponentialBackoff: true },
};
const DECOMPOSER_SYSTEM_PROMPT = `You are an expert task decomposer. Break down complex missions into atomic, executable subtasks.

Available capability packs:
- BROWSER: login, navigation, search, form, upload, download, screenshot, vision, session, cookie, popup, ocr
- DEVELOPMENT: architecture, frontend, backend, database, api, devops, docker, kubernetes, qa, test, debug, documentation
- OFFICE: pdf, docx, excel, powerpoint, ocr, signature, email, calendar
- BUSINESS: seo, marketing, copywriting, branding, crm, analytics, finance, sales, legal, partnership
- CERTIFICATION: architecture_review, security_audit, test_coverage, regression, performance, doc_review, integration, compliance, accessibility, data_privacy
- DELIVERY: zip, github, docker_registry, vps, cloud, pdf_report, notification, deployment, cdn, backup, monitoring_setup, load_balancer

For each subtask, specify: id (string like "sub-1"), description (clear, actionable), capability (from the available packs, e.g., "dev.frontend"), parameters (object with inputs), dependencies (IDs of subtasks that must complete first), priority (1-5, 5=highest), estimatedDurationMs.

Group subtasks that can run in parallel into executionGroups. Subtasks with no unmet dependencies can be in the same group.

Output JSON with: subtasks (array), executionGroups (arrays of subtask IDs that can run in parallel), strategy (sequential|parallel|hybrid).`;
let LLMDecomposerAgentService = class LLMDecomposerAgentService extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
    }
    defineConfig() {
        return exports.LLM_DECOMPOSER_AGENT_CONFIG;
    }
    async onInitialize() {
        this.logger.log('LLM Decomposer agent initialized — intelligent task decomposition enabled');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: DECOMPOSER_SYSTEM_PROMPT,
                    userPrompt: `Decompose this mission into subtasks: ${JSON.stringify(input.payload, null, 2)}`,
                    temperature: 0.25,
                    maxTokens: 4096,
                });
                const decomposition = this.parseDecompositionFromLLM(llmResult.content);
                return this.createAgentOutput(input.taskId, true, {
                    decomposition,
                    rawAnalysis: llmResult.content,
                    costUsd: llmResult.costUsd,
                    tokensUsed: llmResult.tokenCount,
                }, undefined, startTime);
            }
            catch (error) {
                this.logger.warn(`LLM decomposition failed, falling back to rule-based: ${error.message}`);
            }
        }
        return this.createAgentOutput(input.taskId, true, {
            decomposition: {
                subtasks: [
                    {
                        id: 'sub-1',
                        description: 'Analyze and execute the mission',
                        capability: 'dev.architecture',
                        parameters: input.payload,
                        dependencies: [],
                        priority: 5,
                        estimatedDurationMs: 60000,
                    },
                ],
                executionGroups: [['sub-1']],
                strategy: 'sequential',
            },
        }, undefined, startTime);
    }
    parseDecompositionFromLLM(content) {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
        }
        catch {
            return { raw: content };
        }
    }
    async onDestroy() {
        this.logger.log('LLM Decomposer agent destroyed');
    }
};
exports.LLMDecomposerAgentService = LLMDecomposerAgentService;
exports.LLMDecomposerAgentService = LLMDecomposerAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], LLMDecomposerAgentService);
//# sourceMappingURL=llm-decomposer-agent.service.js.map