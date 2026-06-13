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
exports.ErrorAnalyzerAgentService = exports.WATCHDOG_ERROR_ANALYZER_CONFIG = exports.RemediationStrategy = exports.ErrorSeverity = exports.ErrorCategory = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
const agent_interface_1 = require("../interfaces/agent.interface");
const bridge_1 = require("../bridge");
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["NETWORK"] = "NETWORK";
    ErrorCategory["TIMEOUT"] = "TIMEOUT";
    ErrorCategory["LLM_FAILURE"] = "LLM_FAILURE";
    ErrorCategory["PLAYWRIGHT_CRASH"] = "PLAYWRIGHT_CRASH";
    ErrorCategory["SHELL_ERROR"] = "SHELL_ERROR";
    ErrorCategory["FILE_SYSTEM"] = "FILE_SYSTEM";
    ErrorCategory["VALIDATION"] = "VALIDATION";
    ErrorCategory["PERMISSION"] = "PERMISSION";
    ErrorCategory["RESOURCE_EXHAUSTION"] = "RESOURCE_EXHAUSTION";
    ErrorCategory["CONFIGURATION"] = "CONFIGURATION";
    ErrorCategory["DEPENDENCY"] = "DEPENDENCY";
    ErrorCategory["DATA_CORRUPTION"] = "DATA_CORRUPTION";
    ErrorCategory["RATE_LIMIT"] = "RATE_LIMIT";
    ErrorCategory["UNKNOWN"] = "UNKNOWN";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
var RemediationStrategy;
(function (RemediationStrategy) {
    RemediationStrategy["RETRY"] = "retry";
    RemediationStrategy["RECONFIGURE"] = "reconfigure";
    RemediationStrategy["FALLBACK"] = "fallback";
    RemediationStrategy["ESCALATE"] = "escalate";
    RemediationStrategy["SKIP"] = "skip";
})(RemediationStrategy || (exports.RemediationStrategy = RemediationStrategy = {}));
exports.WATCHDOG_ERROR_ANALYZER_CONFIG = {
    id: 'watchdog-error-analyzer',
    name: 'ErrorAnalyzer',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '2.0.0',
    description: 'Analyzes error traces from failed missions/agents, identifies root causes, classifies errors, and suggests remediation',
    capabilities: [
        {
            name: 'analyzeError',
            description: 'Analyze an error trace and identify root cause',
            inputSchema: {
                type: 'object',
                properties: {
                    error: { type: 'object', description: 'The error object or trace' },
                    context: { type: 'object', description: 'Execution context when error occurred' },
                    missionId: { type: 'string', description: 'Mission ID where error occurred' },
                },
                required: ['error'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    analysis: { type: 'object', description: 'Full error analysis result' },
                    costUsd: { type: 'number', description: 'Cost of LLM analysis in USD' },
                },
            },
        },
        {
            name: 'classifyError',
            description: 'Classify an error by type and severity',
            inputSchema: {
                type: 'object',
                properties: {
                    error: { type: 'object', description: 'The error to classify' },
                    errorMessage: { type: 'string', description: 'Error message string' },
                },
                required: ['error'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    errorCategory: { type: 'string', description: 'Error category classification' },
                    severity: { type: 'string', description: 'Error severity level' },
                },
            },
        },
        {
            name: 'suggestRemediation',
            description: 'Suggest remediation steps for an error',
            inputSchema: {
                type: 'object',
                properties: {
                    error: { type: 'object', description: 'The error to remediate' },
                    errorCategory: { type: 'string', description: 'Pre-classified error category' },
                    severity: { type: 'string', description: 'Pre-classified severity' },
                },
                required: ['error'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    strategy: { type: 'string', description: 'Recommended remediation strategy' },
                    parameters: { type: 'object', description: 'Parameters for the strategy' },
                    estimatedRecoveryTimeMs: { type: 'number', description: 'Estimated recovery time' },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:error', 'read:mission', 'write:diagnosis'],
    maxConcurrentTasks: 5,
    timeout: 45000,
    retryPolicy: { maxRetries: 2, backoffMs: 1000, exponentialBackoff: true },
};
let ErrorAnalyzerAgentService = class ErrorAnalyzerAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
    }
    defineConfig() {
        return exports.WATCHDOG_ERROR_ANALYZER_CONFIG;
    }
    async onInitialize() {
        this.logger.log('Error Analyzer agent initialized');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { error, context, missionId } = input.payload;
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: `You are an expert error analyst for an AI agent platform. Analyze the error trace, classify it, identify the root cause, and suggest specific remediation steps.

Error categories: NETWORK, TIMEOUT, LLM_FAILURE, PLAYWRIGHT_CRASH, SHELL_ERROR, FILE_SYSTEM, VALIDATION, PERMISSION, RESOURCE_EXHAUSTION, CONFIGURATION, DEPENDENCY, DATA_CORRUPTION, RATE_LIMIT, UNKNOWN

Output JSON:
{
  "rootCause": "string - the fundamental cause",
  "errorCategory": "one of the categories above",
  "severity": "low|medium|high|critical",
  "isRecoverable": boolean,
  "suggestedRemediation": {
    "strategy": "retry|reconfigure|fallback|escalate|skip",
    "parameters": {},
    "estimatedRecoveryTimeMs": number
  },
  "relatedErrors": ["similar error patterns"],
  "preventionStrategies": ["how to prevent this in the future"]
}`,
                    userPrompt: `Analyze this error:\nError: ${JSON.stringify(error)}\nContext: ${JSON.stringify(context)}\nMission ID: ${missionId}`,
                    temperature: 0.1,
                    maxTokens: 2048,
                });
                const analysis = this.parseAnalysis(llmResult.content);
                await this.storeInWorkingMemory(`error-pattern:${analysis.errorCategory || 'UNKNOWN'}`, analysis, 3600000);
                return this.createAgentOutput(input.taskId, true, {
                    analysis,
                    costUsd: llmResult.costUsd,
                }, undefined, startTime);
            }
            catch (err) {
                this.logger.warn(`LLM error analysis failed: ${err.message}`);
            }
        }
        const fallbackAnalysis = this.classifyErrorFallback(error, context);
        await this.storeInWorkingMemory(`error-pattern:${fallbackAnalysis.errorCategory}`, fallbackAnalysis, 3600000);
        return this.createAgentOutput(input.taskId, true, { analysis: fallbackAnalysis }, undefined, startTime);
    }
    async onDestroy() {
        this.logger.log('Error Analyzer agent destroyed');
    }
    parseAnalysis(content) {
        try {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return {
                    rootCause: parsed.rootCause || 'Unknown root cause',
                    errorCategory: Object.values(ErrorCategory).includes(parsed.errorCategory)
                        ? parsed.errorCategory
                        : ErrorCategory.UNKNOWN,
                    severity: Object.values(ErrorSeverity).includes(parsed.severity)
                        ? parsed.severity
                        : ErrorSeverity.MEDIUM,
                    isRecoverable: parsed.isRecoverable ?? true,
                    suggestedRemediation: {
                        strategy: Object.values(RemediationStrategy).includes(parsed.suggestedRemediation?.strategy)
                            ? parsed.suggestedRemediation.strategy
                            : RemediationStrategy.RETRY,
                        parameters: parsed.suggestedRemediation?.parameters || {},
                        estimatedRecoveryTimeMs: parsed.suggestedRemediation?.estimatedRecoveryTimeMs || 5000,
                    },
                    relatedErrors: Array.isArray(parsed.relatedErrors) ? parsed.relatedErrors : [],
                    preventionStrategies: Array.isArray(parsed.preventionStrategies)
                        ? parsed.preventionStrategies
                        : [],
                };
            }
        }
        catch {
        }
        return {
            rootCause: content.substring(0, 500),
            errorCategory: ErrorCategory.UNKNOWN,
            severity: ErrorSeverity.MEDIUM,
            isRecoverable: true,
            suggestedRemediation: {
                strategy: RemediationStrategy.RETRY,
                parameters: {},
                estimatedRecoveryTimeMs: 5000,
            },
            relatedErrors: [],
            preventionStrategies: [],
        };
    }
    classifyErrorFallback(error, context) {
        const errorMsg = String(error?.message || error?.toString?.() || error || 'Unknown error').toLowerCase();
        const stackTrace = String(error?.stack || '').toLowerCase();
        let category = ErrorCategory.UNKNOWN;
        let severity = ErrorSeverity.MEDIUM;
        let strategy = RemediationStrategy.RETRY;
        let isRecoverable = true;
        let estimatedRecoveryMs = 5000;
        if (errorMsg.includes('econnrefused') ||
            errorMsg.includes('enotfound') ||
            errorMsg.includes('network') ||
            errorMsg.includes('fetch')) {
            category = ErrorCategory.NETWORK;
            severity = ErrorSeverity.HIGH;
            strategy = RemediationStrategy.RETRY;
            estimatedRecoveryMs = 10000;
        }
        else if (errorMsg.includes('timeout') ||
            errorMsg.includes('timed out') ||
            errorMsg.includes('deadline')) {
            category = ErrorCategory.TIMEOUT;
            severity = ErrorSeverity.MEDIUM;
            strategy = RemediationStrategy.RETRY;
            estimatedRecoveryMs = 8000;
        }
        else if (errorMsg.includes('rate limit') ||
            errorMsg.includes('429') ||
            errorMsg.includes('too many requests')) {
            category = ErrorCategory.RATE_LIMIT;
            severity = ErrorSeverity.MEDIUM;
            strategy = RemediationStrategy.RETRY;
            estimatedRecoveryMs = 30000;
        }
        else if (errorMsg.includes('llm') ||
            errorMsg.includes('openai') ||
            errorMsg.includes('token') ||
            errorMsg.includes('completion')) {
            category = ErrorCategory.LLM_FAILURE;
            severity = ErrorSeverity.HIGH;
            strategy = RemediationStrategy.FALLBACK;
            estimatedRecoveryMs = 15000;
        }
        else if (errorMsg.includes('playwright') ||
            errorMsg.includes('browser') ||
            errorMsg.includes('page crashed')) {
            category = ErrorCategory.PLAYWRIGHT_CRASH;
            severity = ErrorSeverity.HIGH;
            strategy = RemediationStrategy.RETRY;
            estimatedRecoveryMs = 20000;
        }
        else if (errorMsg.includes('enoent') ||
            errorMsg.includes('permission denied') ||
            errorMsg.includes('eacces')) {
            category = ErrorCategory.FILE_SYSTEM;
            severity = ErrorSeverity.HIGH;
            strategy = RemediationStrategy.RECONFIGURE;
            estimatedRecoveryMs = 5000;
        }
        else if (errorMsg.includes('shell') ||
            errorMsg.includes('command failed') ||
            errorMsg.includes('exit code')) {
            category = ErrorCategory.SHELL_ERROR;
            severity = ErrorSeverity.MEDIUM;
            strategy = RemediationStrategy.FALLBACK;
            estimatedRecoveryMs = 8000;
        }
        else if (errorMsg.includes('validation') ||
            errorMsg.includes('invalid') ||
            errorMsg.includes('schema')) {
            category = ErrorCategory.VALIDATION;
            severity = ErrorSeverity.LOW;
            strategy = RemediationStrategy.RECONFIGURE;
            estimatedRecoveryMs = 2000;
        }
        else if (errorMsg.includes('unauthorized') ||
            errorMsg.includes('forbidden') ||
            errorMsg.includes('access denied')) {
            category = ErrorCategory.PERMISSION;
            severity = ErrorSeverity.HIGH;
            strategy = RemediationStrategy.ESCALATE;
            isRecoverable = false;
            estimatedRecoveryMs = 60000;
        }
        else if (errorMsg.includes('out of memory') ||
            errorMsg.includes('oom') ||
            errorMsg.includes('resource')) {
            category = ErrorCategory.RESOURCE_EXHAUSTION;
            severity = ErrorSeverity.CRITICAL;
            strategy = RemediationStrategy.ESCALATE;
            estimatedRecoveryMs = 30000;
        }
        else if (errorMsg.includes('config') ||
            errorMsg.includes('missing env') ||
            errorMsg.includes('misconfigur')) {
            category = ErrorCategory.CONFIGURATION;
            severity = ErrorSeverity.HIGH;
            strategy = RemediationStrategy.RECONFIGURE;
            estimatedRecoveryMs = 5000;
        }
        else if (errorMsg.includes('dependency') ||
            errorMsg.includes('module not found') ||
            errorMsg.includes('cannot find')) {
            category = ErrorCategory.DEPENDENCY;
            severity = ErrorSeverity.HIGH;
            strategy = RemediationStrategy.RECONFIGURE;
            estimatedRecoveryMs = 10000;
        }
        else if (errorMsg.includes('corrupt') ||
            errorMsg.includes('integrity') ||
            errorMsg.includes('checksum')) {
            category = ErrorCategory.DATA_CORRUPTION;
            severity = ErrorSeverity.CRITICAL;
            strategy = RemediationStrategy.ESCALATE;
            isRecoverable = false;
            estimatedRecoveryMs = 60000;
        }
        if (stackTrace.includes('playwright') && category === ErrorCategory.UNKNOWN) {
            category = ErrorCategory.PLAYWRIGHT_CRASH;
        }
        if (stackTrace.includes('child_process') && category === ErrorCategory.UNKNOWN) {
            category = ErrorCategory.SHELL_ERROR;
        }
        return {
            rootCause: String(error?.message || error || 'Unknown error'),
            errorCategory: category,
            severity,
            isRecoverable,
            suggestedRemediation: {
                strategy,
                parameters: { retryCount: 1, backoffMs: 1000 },
                estimatedRecoveryTimeMs: estimatedRecoveryMs,
            },
            relatedErrors: [],
            preventionStrategies: this.getPreventionStrategies(category),
        };
    }
    getPreventionStrategies(category) {
        const strategies = {
            [ErrorCategory.NETWORK]: [
                'Implement retry with exponential backoff',
                'Add circuit breaker pattern',
                'Use connection pooling',
            ],
            [ErrorCategory.TIMEOUT]: [
                'Increase timeout thresholds',
                'Optimize slow operations',
                'Implement async processing',
            ],
            [ErrorCategory.LLM_FAILURE]: [
                'Add fallback LLM providers',
                'Implement token budget management',
                'Cache frequent LLM calls',
            ],
            [ErrorCategory.PLAYWRIGHT_CRASH]: [
                'Restart browser on crash',
                'Add page stability checks',
                'Implement browser session recovery',
            ],
            [ErrorCategory.SHELL_ERROR]: [
                'Validate commands before execution',
                'Add shell error parsers',
                'Implement sandbox isolation',
            ],
            [ErrorCategory.FILE_SYSTEM]: [
                'Check file existence before operations',
                'Validate permissions',
                'Use atomic writes',
            ],
            [ErrorCategory.VALIDATION]: [
                'Add input validation layer',
                'Implement schema checking',
                'Use type-safe interfaces',
            ],
            [ErrorCategory.PERMISSION]: [
                'Pre-validate permissions',
                'Implement role-based access',
                'Add permission caching',
            ],
            [ErrorCategory.RESOURCE_EXHAUSTION]: [
                'Implement resource quotas',
                'Add memory monitoring',
                'Use resource pooling',
            ],
            [ErrorCategory.CONFIGURATION]: [
                'Validate configuration at startup',
                'Use config schema validation',
                'Implement config hot-reload',
            ],
            [ErrorCategory.DEPENDENCY]: [
                'Pin dependency versions',
                'Implement dependency health checks',
                'Add fallback implementations',
            ],
            [ErrorCategory.DATA_CORRUPTION]: [
                'Add data integrity checks',
                'Implement checksums',
                'Use write-ahead logging',
            ],
            [ErrorCategory.RATE_LIMIT]: [
                'Implement rate limiting on client side',
                'Add request queuing',
                'Use token bucket algorithm',
            ],
            [ErrorCategory.UNKNOWN]: [
                'Add comprehensive error logging',
                'Implement error fingerprinting',
                'Create error taxonomy',
            ],
        };
        return strategies[category] || [];
    }
};
exports.ErrorAnalyzerAgentService = ErrorAnalyzerAgentService;
exports.ErrorAnalyzerAgentService = ErrorAnalyzerAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __param(3, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], ErrorAnalyzerAgentService);
//# sourceMappingURL=error-analyzer-agent.service.js.map