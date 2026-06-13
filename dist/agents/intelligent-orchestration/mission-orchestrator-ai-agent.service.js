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
exports.MissionOrchestratorAIAgentService = exports.MISSION_ORCHESTRATOR_AI_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
const agent_interface_1 = require("../interfaces/agent.interface");
const bridge_1 = require("../bridge");
exports.MISSION_ORCHESTRATOR_AI_AGENT_CONFIG = {
    id: 'intelligent-mission-orchestrator',
    name: 'MissionOrchestratorAI',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '2.0.0',
    description: 'LLM-driven mission orchestrator that coordinates entire mission execution with intelligent decision-making across all agent clusters and capabilities',
    capabilities: [
        {
            name: 'orchestrateMission',
            description: 'Orchestrate an entire mission from start to finish',
            inputSchema: {
                type: 'object',
                properties: {
                    mission: { type: 'object', description: 'The mission definition' },
                    phase: { type: 'string', description: 'Current execution phase' },
                    currentResults: { type: 'object', description: 'Results from completed phases' },
                    failedSteps: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Steps that have failed',
                    },
                },
                required: ['mission'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    orchestration: { type: 'object' },
                    rawAnalysis: { type: 'string' },
                    costUsd: { type: 'number' },
                },
            },
        },
        {
            name: 'adaptPipeline',
            description: 'Adapt the execution pipeline based on intermediate results',
            inputSchema: {
                type: 'object',
                properties: {
                    mission: { type: 'object' },
                    currentPhase: { type: 'string' },
                    currentResults: { type: 'object' },
                    failedSteps: { type: 'array', items: { type: 'string' } },
                },
                required: ['mission', 'currentPhase', 'currentResults'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    adaptedPipeline: { type: 'object' },
                    reasoning: { type: 'string' },
                },
            },
        },
        {
            name: 'handleFailure',
            description: 'Handle a failure during mission execution',
            inputSchema: {
                type: 'object',
                properties: {
                    mission: { type: 'object' },
                    failedPhase: { type: 'string' },
                    failureReason: { type: 'string' },
                    currentResults: { type: 'object' },
                },
                required: ['mission', 'failedPhase', 'failureReason'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    recoveryStrategy: { type: 'string' },
                    updatedPipeline: { type: 'object' },
                    alternativeCapability: { type: 'string' },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:mission', 'write:mission', 'manage:agents', 'manage:tasks'],
    maxConcurrentTasks: 5,
    timeout: 120000,
    retryPolicy: { maxRetries: 2, backoffMs: 3000, exponentialBackoff: true },
};
let MissionOrchestratorAIAgentService = class MissionOrchestratorAIAgentService extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
    }
    defineConfig() {
        return exports.MISSION_ORCHESTRATOR_AI_AGENT_CONFIG;
    }
    async onInitialize() {
        this.logger.log('Mission Orchestrator AI agent initialized');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { mission, phase, currentResults, failedSteps } = input.payload;
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: `You are the master mission orchestrator for an AI agent platform with 80+ specialized agents across 11 clusters and 64 capabilities.

Your role is to:
1. Determine the optimal execution pipeline for missions
2. Decide which capabilities to use and in what order
3. Adapt the pipeline when intermediate results change requirements
4. Handle failures by redirecting to alternative capabilities
5. Ensure quality gates are met before proceeding

Available capability packs:
- BROWSER (12 caps): login, navigation, search, form, upload, download, screenshot, vision, session, cookie, popup, ocr
- DEVELOPMENT (12 caps): architecture, frontend, backend, database, api, devops, docker, kubernetes, qa, test, debug, documentation
- OFFICE (8 caps): pdf, docx, excel, powerpoint, ocr, signature, email, calendar
- BUSINESS (10 caps): seo, marketing, copywriting, branding, crm, analytics, finance, sales, legal, partnership
- CERTIFICATION (10 caps): architecture_review, security_audit, test_coverage, regression, performance, doc_review, integration, compliance, accessibility, data_privacy
- DELIVERY (12 caps): zip, github, docker_registry, vps, cloud, pdf_report, notification, deployment, cdn, backup, monitoring_setup, load_balancer

Output JSON:
{
  "pipeline": [{"phase": "string", "capability": "string", "parameters": {}, "dependsOn": ["phase names"], "onFailure": "strategy"}],
  "qualityGates": [{"afterPhase": "string", "minScore": number, "onFail": "strategy"}],
  "estimatedDurationMs": number,
  "riskFactors": ["string"],
  "adaptationTriggers": [{"condition": "string", "action": "string"}]
}`,
                    userPrompt: `Orchestrate this mission:\nMission: ${JSON.stringify(mission)}\nPhase: ${phase || 'initial'}\nCurrent results: ${JSON.stringify(currentResults || {})}\nFailed steps: ${JSON.stringify(failedSteps || [])}`,
                    temperature: 0.2,
                    maxTokens: 4096,
                });
                const orchestration = this.parseOrchestration(llmResult.content);
                await this.storeInWorkingMemory('mission-orchestrator:last-orchestration', { mission, orchestration, timestamp: new Date() }, 300000);
                return this.createAgentOutput(input.taskId, true, {
                    orchestration,
                    rawAnalysis: llmResult.content,
                    costUsd: llmResult.costUsd,
                }, undefined, startTime);
            }
            catch (error) {
                this.logger.warn(`LLM orchestration failed: ${error.message}`);
            }
        }
        const fallbackOrchestration = {
            pipeline: [
                {
                    phase: 'architecture',
                    capability: 'dev.architecture',
                    parameters: mission,
                    dependsOn: [],
                    onFailure: 'simplify',
                },
                {
                    phase: 'build',
                    capability: 'dev.frontend',
                    parameters: mission,
                    dependsOn: ['architecture'],
                    onFailure: 'retry',
                },
                {
                    phase: 'test',
                    capability: 'dev.test',
                    parameters: {},
                    dependsOn: ['build'],
                    onFailure: 'skip',
                },
                {
                    phase: 'certify',
                    capability: 'cert.security_audit',
                    parameters: {},
                    dependsOn: ['test'],
                    onFailure: 'permissive',
                },
                {
                    phase: 'deliver',
                    capability: 'delivery.zip',
                    parameters: {},
                    dependsOn: ['certify'],
                    onFailure: 'retry',
                },
            ],
            qualityGates: [{ afterPhase: 'certify', minScore: 60, onFail: 'repair' }],
        };
        return this.createAgentOutput(input.taskId, true, { orchestration: fallbackOrchestration }, undefined, startTime);
    }
    parseOrchestration(content) {
        try {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return {
                    pipeline: parsed.pipeline || [],
                    qualityGates: parsed.qualityGates || [],
                    estimatedDurationMs: parsed.estimatedDurationMs,
                    riskFactors: parsed.riskFactors,
                    adaptationTriggers: parsed.adaptationTriggers,
                };
            }
            return { pipeline: [], qualityGates: [], raw: content };
        }
        catch {
            return { pipeline: [], qualityGates: [], raw: content };
        }
    }
    async onDestroy() {
        this.logger.log('Mission Orchestrator AI agent destroyed');
    }
};
exports.MissionOrchestratorAIAgentService = MissionOrchestratorAIAgentService;
exports.MissionOrchestratorAIAgentService = MissionOrchestratorAIAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], MissionOrchestratorAIAgentService);
//# sourceMappingURL=mission-orchestrator-ai-agent.service.js.map