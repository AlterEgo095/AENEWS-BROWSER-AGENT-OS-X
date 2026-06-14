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
exports.LLMValidatorAgentService = exports.LLM_VALIDATOR_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
const agent_interface_1 = require("../interfaces/agent.interface");
const bridge_1 = require("../bridge");
exports.LLM_VALIDATOR_AGENT_CONFIG = {
    id: 'llm-validator',
    name: 'LLMValidator',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '2.0.0',
    description: 'Intelligent deliverable validator using LLM reasoning to contextually validate mission results against requirements. Understands the intent behind requirements, not just their literal specification.',
    capabilities: [
        {
            name: 'validateDeliverables',
            description: 'Validate mission deliverables against requirements using LLM contextual analysis',
            inputSchema: {
                type: 'object',
                properties: {
                    missionRequirements: { type: 'object', description: 'Original mission requirements' },
                    deliverables: { type: 'object', description: 'Produced deliverables to validate' },
                    validationCriteria: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Specific validation criteria',
                    },
                    strictMode: { type: 'boolean', description: 'Whether to apply strict validation rules' },
                },
                required: ['missionRequirements', 'deliverables'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    isValid: { type: 'boolean' },
                    validationScore: { type: 'number', minimum: 0, maximum: 100 },
                    missingElements: { type: 'array', items: { type: 'string' } },
                    qualityIssues: { type: 'array', items: { type: 'object' } },
                    complianceStatus: { type: 'object' },
                    recommendations: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'validateCompliance',
            description: 'Validate deliverables against specific compliance standards',
            inputSchema: {
                type: 'object',
                properties: {
                    deliverables: { type: 'object', description: 'Deliverables to check' },
                    complianceStandards: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Compliance standards to check against',
                    },
                    context: { type: 'object', description: 'Validation context' },
                },
                required: ['deliverables', 'complianceStandards'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    compliant: { type: 'boolean' },
                    violations: { type: 'array', items: { type: 'object' } },
                    recommendations: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:mission', 'write:validation'],
    maxConcurrentTasks: 5,
    timeout: 45000,
    retryPolicy: { maxRetries: 2, backoffMs: 1500, exponentialBackoff: true },
};
const VALIDATOR_SYSTEM_PROMPT = `You are an expert deliverable validator. Given the mission requirements and the produced deliverables, validate whether they meet the requirements.

Consider:
- Do the deliverables satisfy all stated requirements?
- Are there missing elements that were expected but not delivered?
- Are there quality issues that would prevent the deliverables from being used?
- Do the deliverables comply with relevant standards and best practices?
- Are there any gaps between what was requested and what was delivered?

Output JSON with: isValid (boolean), validationScore (0-100), missingElements (array of strings describing what is missing), qualityIssues (array of {severity, category, description}), complianceStatus ({overall: compliant|partial|non-compliant, details}), recommendations (array of strings suggesting improvements).`;
let LLMValidatorAgentService = class LLMValidatorAgentService extends base_agent_service_1.BaseAgentService {
    constructor(bridge) {
        super();
        this.bridge = bridge;
    }
    defineConfig() {
        return exports.LLM_VALIDATOR_AGENT_CONFIG;
    }
    async onInitialize() {
        this.logger.log('LLM Validator agent initialized — contextual deliverable validation enabled');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: VALIDATOR_SYSTEM_PROMPT,
                    userPrompt: `Validate these deliverables against their requirements: ${JSON.stringify(input.payload, null, 2)}`,
                    temperature: 0.2,
                    maxTokens: 4096,
                });
                const validation = this.parseValidationFromLLM(llmResult.content);
                return this.createAgentOutput(input.taskId, true, {
                    validation,
                    rawAnalysis: llmResult.content,
                    costUsd: llmResult.costUsd,
                    tokensUsed: llmResult.tokenCount,
                }, undefined, startTime);
            }
            catch (error) {
                this.logger.warn(`LLM validation failed, falling back to rule-based: ${error.message}`);
            }
        }
        const payload = input.payload || {};
        const hasDeliverables = payload.deliverables !== undefined && payload.deliverables !== null;
        const hasError = payload.deliverables?.error !== undefined;
        const isValid = hasDeliverables && !hasError;
        return this.createAgentOutput(input.taskId, true, {
            validation: {
                isValid,
                validationScore: isValid ? 60 : 20,
                missingElements: hasError
                    ? [payload.deliverables.error]
                    : hasDeliverables
                        ? []
                        : ['No deliverables provided'],
                qualityIssues: isValid
                    ? []
                    : [
                        {
                            severity: 'major',
                            category: 'completeness',
                            description: 'Deliverables missing or contain errors',
                        },
                    ],
                complianceStatus: {
                    overall: isValid ? 'partial' : 'non-compliant',
                    details: 'Rule-based validation only — LLM unavailable for contextual analysis',
                },
                recommendations: isValid
                    ? ['Consider LLM-based validation for deeper analysis']
                    : ['Review deliverables for errors and retry'],
            },
        }, undefined, startTime);
    }
    parseValidationFromLLM(content) {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
        }
        catch {
            return { raw: content };
        }
    }
    async onDestroy() {
        this.logger.log('LLM Validator agent destroyed');
    }
};
exports.LLMValidatorAgentService = LLMValidatorAgentService;
exports.LLMValidatorAgentService = LLMValidatorAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], LLMValidatorAgentService);
//# sourceMappingURL=llm-validator-agent.service.js.map