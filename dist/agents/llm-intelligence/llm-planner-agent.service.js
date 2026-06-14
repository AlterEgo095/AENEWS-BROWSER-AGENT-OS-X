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
exports.LLMPlannerAgentService = exports.LLM_PLANNER_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
const agent_interface_1 = require("../interfaces/agent.interface");
const bridge_1 = require("../bridge");
exports.LLM_PLANNER_AGENT_CONFIG = {
    id: 'llm-planner',
    name: 'LLMPlanner',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '2.0.0',
    description: 'Intelligent mission planner using LLM reasoning for optimal execution strategies. Understands mission semantics, capability trade-offs, and constraint interactions to produce detailed, actionable execution plans.',
    capabilities: [
        {
            name: 'planMission',
            description: 'Create an intelligent execution plan for a mission using LLM reasoning',
            inputSchema: {
                type: 'object',
                properties: {
                    missionDescription: { type: 'string', description: 'Description of the mission to plan' },
                    availableCapabilities: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Available capability packs',
                    },
                    constraints: {
                        type: 'object',
                        description: 'Planning constraints (time, budget, resources)',
                    },
                },
                required: ['missionDescription'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    steps: { type: 'array', items: { type: 'object' } },
                    strategy: { type: 'string', enum: ['sequential', 'parallel', 'hybrid'] },
                    estimatedDurationMs: { type: 'number' },
                    riskAssessment: { type: 'object' },
                },
            },
        },
        {
            name: 'replanMission',
            description: 'Re-plan a mission based on execution feedback and changed circumstances',
            inputSchema: {
                type: 'object',
                properties: {
                    originalPlan: { type: 'object', description: 'The original execution plan' },
                    executionFeedback: { type: 'object', description: 'Feedback from execution so far' },
                    changedConstraints: { type: 'object', description: 'Updated constraints' },
                },
                required: ['originalPlan', 'executionFeedback'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    revisedPlan: { type: 'object' },
                    changesFromOriginal: { type: 'array', items: { type: 'object' } },
                    reasoning: { type: 'string' },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:mission', 'write:plan'],
    maxConcurrentTasks: 3,
    timeout: 60000,
    retryPolicy: { maxRetries: 2, backoffMs: 2000, exponentialBackoff: true },
};
const PLANNER_SYSTEM_PROMPT = `You are an expert mission planner for an AI agent platform. Given a mission description, available capabilities, and constraints, create a detailed execution plan.

Available capability packs:
- BROWSER: login, navigation, search, form, upload, download, screenshot, vision, session, cookie, popup, ocr
- DEVELOPMENT: architecture, frontend, backend, database, api, devops, docker, kubernetes, qa, test, debug, documentation
- OFFICE: pdf, docx, excel, powerpoint, ocr, signature, email, calendar
- BUSINESS: seo, marketing, copywriting, branding, crm, analytics, finance, sales, legal, partnership
- CERTIFICATION: architecture_review, security_audit, test_coverage, regression, performance, doc_review, integration, compliance, accessibility, data_privacy
- DELIVERY: zip, github, docker_registry, vps, cloud, pdf_report, notification, deployment, cdn, backup, monitoring_setup, load_balancer

Output a JSON execution plan with: steps (array of {capability, parameters, dependsOn}), strategy (sequential|parallel|hybrid), estimatedDurationMs, riskAssessment.`;
let LLMPlannerAgentService = class LLMPlannerAgentService extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
    }
    defineConfig() {
        return exports.LLM_PLANNER_AGENT_CONFIG;
    }
    async onInitialize() {
        this.logger.log('LLM Planner agent initialized — intelligent mission planning enabled');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: PLANNER_SYSTEM_PROMPT,
                    userPrompt: `Plan this mission: ${JSON.stringify(input.payload, null, 2)}`,
                    temperature: 0.2,
                    maxTokens: 4096,
                });
                const plan = this.parsePlanFromLLM(llmResult.content);
                return this.createAgentOutput(input.taskId, true, {
                    plan,
                    rawAnalysis: llmResult.content,
                    costUsd: llmResult.costUsd,
                    tokensUsed: llmResult.tokenCount,
                }, undefined, startTime);
            }
            catch (error) {
                this.logger.warn(`LLM planning failed, falling back to rule-based: ${error.message}`);
            }
        }
        return this.createAgentOutput(input.taskId, true, {
            plan: {
                steps: [
                    {
                        capability: 'dev.architecture',
                        parameters: input.payload,
                        dependsOn: [],
                    },
                ],
                strategy: 'sequential',
                estimatedDurationMs: 120000,
                riskAssessment: { level: 'low', notes: 'Fallback plan — LLM unavailable' },
            },
        }, undefined, startTime);
    }
    parsePlanFromLLM(content) {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
        }
        catch {
            return { raw: content };
        }
    }
    async onDestroy() {
        this.logger.log('LLM Planner agent destroyed');
    }
};
exports.LLMPlannerAgentService = LLMPlannerAgentService;
exports.LLMPlannerAgentService = LLMPlannerAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], LLMPlannerAgentService);
//# sourceMappingURL=llm-planner-agent.service.js.map