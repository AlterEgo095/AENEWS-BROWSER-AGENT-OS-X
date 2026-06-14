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
exports.AutoFixerAgentService = exports.WATCHDOG_AUTO_FIXER_CONFIG = exports.RepairStrategy = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
const agent_interface_1 = require("../interfaces/agent.interface");
const bridge_1 = require("../bridge");
var RepairStrategy;
(function (RepairStrategy) {
    RepairStrategy["RETRY"] = "RETRY";
    RepairStrategy["REASSIGN"] = "REASSIGN";
    RepairStrategy["SIMPLIFY"] = "SIMPLIFY";
    RepairStrategy["FALLBACK"] = "FALLBACK";
    RepairStrategy["ESCALATE"] = "ESCALATE";
})(RepairStrategy || (exports.RepairStrategy = RepairStrategy = {}));
exports.WATCHDOG_AUTO_FIXER_CONFIG = {
    id: 'watchdog-auto-fixer',
    name: 'AutoFixer',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '2.0.0',
    description: 'Applies automated fixes based on error analysis — retries with modified parameters, reassigns to different agents, simplifies tasks, applies fallback strategies, or escalates to humans',
    capabilities: [
        {
            name: 'planRepair',
            description: 'Analyze an error and plan the best repair strategy',
            inputSchema: {
                type: 'object',
                properties: {
                    error: { type: 'object', description: 'The original error' },
                    errorAnalysis: { type: 'object', description: 'Error analysis from ErrorAnalyzer' },
                    originalInput: { type: 'object', description: 'The original agent input that failed' },
                    failedCapabilityId: { type: 'string', description: 'The capability that failed' },
                },
                required: ['error', 'errorAnalysis', 'originalInput'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    repairPlan: { type: 'object', description: 'The planned repair strategy' },
                    costUsd: { type: 'number', description: 'Cost of LLM planning' },
                },
            },
        },
        {
            name: 'executeRepair',
            description: 'Execute a repair plan by re-running with modified parameters',
            inputSchema: {
                type: 'object',
                properties: {
                    repairPlan: { type: 'object', description: 'The repair plan to execute' },
                    originalInput: { type: 'object', description: 'The original failed input' },
                    failedCapabilityId: { type: 'string', description: 'Capability to re-execute' },
                },
                required: ['repairPlan', 'originalInput'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    executed: { type: 'boolean' },
                    success: { type: 'boolean' },
                    output: { type: 'object' },
                    costUsd: { type: 'number' },
                    durationMs: { type: 'number' },
                },
            },
        },
        {
            name: 'autoRepair',
            description: 'End-to-end: analyze error, plan repair, and execute it',
            inputSchema: {
                type: 'object',
                properties: {
                    error: { type: 'object', description: 'The original error' },
                    errorAnalysis: { type: 'object', description: 'Error analysis from ErrorAnalyzer' },
                    originalInput: { type: 'object', description: 'The original agent input that failed' },
                    failedCapabilityId: { type: 'string', description: 'The capability that failed' },
                    maxRepairAttempts: { type: 'number', description: 'Maximum number of repair attempts' },
                },
                required: ['error', 'originalInput'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    plan: { type: 'object', description: 'The repair plan used' },
                    executed: { type: 'boolean' },
                    success: { type: 'boolean' },
                    output: { type: 'object' },
                    totalCostUsd: { type: 'number' },
                    totalDurationMs: { type: 'number' },
                },
            },
        },
    ],
    permissions: ['execute:task', 'write:repair', 'execute:capability', 'read:error', 'read:mission'],
    maxConcurrentTasks: 3,
    timeout: 60000,
    retryPolicy: { maxRetries: 1, backoffMs: 2000, exponentialBackoff: true },
};
let AutoFixerAgentService = class AutoFixerAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
    }
    defineConfig() {
        return exports.WATCHDOG_AUTO_FIXER_CONFIG;
    }
    async onInitialize() {
        this.logger.log('Auto Fixer agent initialized');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { error, errorAnalysis, originalInput, failedCapabilityId, maxRepairAttempts = 2, } = input.payload;
        const capability = input.payload.capability || 'autoRepair';
        if (capability === 'planRepair') {
            return this.planRepair(input.taskId, error, errorAnalysis, originalInput, failedCapabilityId, startTime);
        }
        if (capability === 'executeRepair') {
            return this.executeRepair(input.taskId, input.payload.repairPlan, originalInput, failedCapabilityId, startTime);
        }
        return this.autoRepair(input.taskId, error, errorAnalysis, originalInput, failedCapabilityId, maxRepairAttempts, startTime);
    }
    async onDestroy() {
        this.logger.log('Auto Fixer agent destroyed');
    }
    async planRepair(taskId, error, errorAnalysis, originalInput, failedCapabilityId, startTime) {
        if (this.bridge) {
            try {
                const llmResult = await this.bridge.callLLM({
                    systemPrompt: `You are an automated repair specialist for an AI agent platform. Given an error analysis and the original failed execution context, determine and apply the best repair strategy.

Available repair strategies:
- RETRY: Retry the same task with same or modified parameters (e.g., increased timeout, adjusted prompt)
- REASSIGN: Assign the task to a different capability or agent better suited for it
- SIMPLIFY: Reduce the task scope to something more manageable
- FALLBACK: Use a fallback capability that provides degraded but acceptable results
- ESCALATE: Request human intervention when automated repair is not feasible

Output JSON:
{
  "repairStrategy": "RETRY|REASSIGN|SIMPLIFY|FALLBACK|ESCALATE",
  "modifiedParameters": {
    "key": "value — parameters to change from the original input"
  },
  "expectedSuccessRate": 0.0-1.0,
  "alternativeApproaches": ["list of alternative strategies if the primary one fails"],
  "reasoning": "explanation of why this strategy was chosen"
}`,
                    userPrompt: `Plan a repair for this failed execution:
Error: ${JSON.stringify(error)}
Error Analysis: ${JSON.stringify(errorAnalysis)}
Original Input: ${JSON.stringify(originalInput)}
Failed Capability: ${failedCapabilityId || 'unknown'}`,
                    temperature: 0.2,
                    maxTokens: 2048,
                });
                const plan = this.parseRepairPlan(llmResult.content);
                await this.storeInWorkingMemory(`repair-plan:${taskId}`, plan, 1800000);
                return this.createAgentOutput(taskId, true, { repairPlan: plan, costUsd: llmResult.costUsd }, undefined, startTime);
            }
            catch (err) {
                this.logger.warn(`LLM repair planning failed: ${err.message}`);
            }
        }
        const fallbackPlan = this.createFallbackRepairPlan(error, errorAnalysis, failedCapabilityId);
        await this.storeInWorkingMemory(`repair-plan:${taskId}`, fallbackPlan, 1800000);
        return this.createAgentOutput(taskId, true, { repairPlan: fallbackPlan }, undefined, startTime);
    }
    async executeRepair(taskId, repairPlan, originalInput, failedCapabilityId, startTime) {
        const totalStartTime = Date.now();
        let executed = false;
        let executionSuccess = false;
        let executionOutput = null;
        let totalCostUsd = 0;
        if (!this.bridge) {
            return this.createAgentOutput(taskId, false, {
                plan: repairPlan,
                executed: false,
                executionSuccess: false,
                executionOutput: null,
                totalCostUsd: 0,
                totalDurationMs: Date.now() - totalStartTime,
            }, 'Bridge unavailable — cannot execute repair', startTime);
        }
        const capabilityId = repairPlan.modifiedParameters?.capabilityId || failedCapabilityId;
        switch (repairPlan.repairStrategy) {
            case RepairStrategy.RETRY:
                executed = true;
                try {
                    const mergedParams = {
                        ...originalInput?.parameters,
                        ...repairPlan.modifiedParameters,
                    };
                    delete mergedParams.capabilityId;
                    const result = await this.bridge.executeCapability(capabilityId || 'dev.frontend', {
                        missionId: originalInput?.missionId || `repair-${Date.now()}`,
                        instruction: repairPlan.modifiedParameters?.instruction ||
                            originalInput?.instruction ||
                            'Retry after error',
                        workspaceDir: originalInput?.workspaceDir || `/tmp/aenews-repair/${Date.now()}`,
                        parameters: mergedParams,
                    });
                    executionSuccess = result.success;
                    executionOutput = result;
                    totalCostUsd = result.costUsd;
                }
                catch (err) {
                    this.logger.warn(`Retry repair execution failed: ${err.message}`);
                    executionSuccess = false;
                    executionOutput = { error: err.message };
                }
                break;
            case RepairStrategy.REASSIGN:
                executed = true;
                try {
                    const reassignedCapability = repairPlan.modifiedParameters?.reassignedCapability || capabilityId;
                    const result = await this.bridge.executeCapability(reassignedCapability || 'dev.frontend', {
                        missionId: originalInput?.missionId || `reassign-${Date.now()}`,
                        instruction: repairPlan.modifiedParameters?.instruction ||
                            originalInput?.instruction ||
                            'Reassigned task',
                        workspaceDir: originalInput?.workspaceDir || `/tmp/aenews-repair/${Date.now()}`,
                        parameters: {
                            ...originalInput?.parameters,
                            ...repairPlan.modifiedParameters,
                        },
                    });
                    executionSuccess = result.success;
                    executionOutput = result;
                    totalCostUsd = result.costUsd;
                }
                catch (err) {
                    this.logger.warn(`Reassign repair execution failed: ${err.message}`);
                    executionSuccess = false;
                    executionOutput = { error: err.message };
                }
                break;
            case RepairStrategy.SIMPLIFY:
                executed = true;
                try {
                    const simplifiedInstruction = repairPlan.modifiedParameters?.simplifiedInstruction ||
                        `Simplified: ${originalInput?.instruction || 'Execute simplified task'}`;
                    const result = await this.bridge.executeCapability(capabilityId || 'dev.frontend', {
                        missionId: originalInput?.missionId || `simplify-${Date.now()}`,
                        instruction: simplifiedInstruction,
                        workspaceDir: originalInput?.workspaceDir || `/tmp/aenews-repair/${Date.now()}`,
                        parameters: {
                            ...originalInput?.parameters,
                            ...repairPlan.modifiedParameters,
                            scope: 'simplified',
                        },
                    });
                    executionSuccess = result.success;
                    executionOutput = result;
                    totalCostUsd = result.costUsd;
                }
                catch (err) {
                    this.logger.warn(`Simplify repair execution failed: ${err.message}`);
                    executionSuccess = false;
                    executionOutput = { error: err.message };
                }
                break;
            case RepairStrategy.FALLBACK:
                executed = true;
                try {
                    const fallbackCapability = repairPlan.modifiedParameters?.fallbackCapability || capabilityId;
                    const result = await this.bridge.executeCapability(fallbackCapability || 'dev.frontend', {
                        missionId: originalInput?.missionId || `fallback-${Date.now()}`,
                        instruction: repairPlan.modifiedParameters?.instruction ||
                            `Fallback execution for: ${originalInput?.instruction || 'task'}`,
                        workspaceDir: originalInput?.workspaceDir || `/tmp/aenews-repair/${Date.now()}`,
                        parameters: {
                            ...originalInput?.parameters,
                            ...repairPlan.modifiedParameters,
                            fallback: true,
                        },
                    });
                    executionSuccess = result.success;
                    executionOutput = result;
                    totalCostUsd = result.costUsd;
                }
                catch (err) {
                    this.logger.warn(`Fallback repair execution failed: ${err.message}`);
                    executionSuccess = false;
                    executionOutput = { error: err.message };
                }
                break;
            case RepairStrategy.ESCALATE:
                executed = false;
                executionSuccess = false;
                executionOutput = {
                    reason: 'Escalated to human intervention',
                    originalError: originalInput?.error,
                    repairPlan,
                };
                await this.storeInWorkingMemory(`escalation:${taskId}`, {
                    taskId,
                    repairPlan,
                    originalInput,
                    timestamp: new Date().toISOString(),
                }, 86400000);
                break;
            default:
                this.logger.warn(`Unknown repair strategy: ${repairPlan.repairStrategy}`);
                break;
        }
        const result = {
            plan: repairPlan,
            executed,
            executionSuccess,
            executionOutput,
            totalCostUsd,
            totalDurationMs: Date.now() - totalStartTime,
        };
        await this.storeInWorkingMemory(`repair-result:${taskId}`, result, 1800000);
        return this.createAgentOutput(taskId, executed ? executionSuccess : true, result, executionSuccess ? undefined : 'Repair execution did not succeed', startTime);
    }
    async autoRepair(taskId, error, errorAnalysis, originalInput, failedCapabilityId, maxRepairAttempts, startTime) {
        const totalStartTime = Date.now();
        let totalCostUsd = 0;
        let lastError;
        for (let attempt = 0; attempt < maxRepairAttempts; attempt++) {
            this.logger.log(`Auto-repair attempt ${attempt + 1}/${maxRepairAttempts} for task ${taskId}`);
            const planResult = await this.planRepair(`plan-${taskId}-${attempt}`, error, errorAnalysis, originalInput, failedCapabilityId, totalStartTime);
            totalCostUsd += planResult.result?.costUsd || 0;
            const repairPlan = planResult.result?.repairPlan || planResult.result?.analysis?.repairPlan;
            if (!repairPlan) {
                this.logger.warn(`Failed to generate repair plan on attempt ${attempt + 1}`);
                lastError = 'Failed to generate repair plan';
                continue;
            }
            const executionResult = await this.executeRepair(`exec-${taskId}-${attempt}`, repairPlan, originalInput, failedCapabilityId, totalStartTime);
            totalCostUsd += executionResult.result?.totalCostUsd || 0;
            const repairResult = executionResult.result;
            if (repairPlan.repairStrategy === RepairStrategy.ESCALATE) {
                return this.createAgentOutput(taskId, false, {
                    plan: repairPlan,
                    executed: false,
                    success: false,
                    output: repairResult.executionOutput,
                    totalCostUsd,
                    totalDurationMs: Date.now() - totalStartTime,
                    attempts: attempt + 1,
                    escalated: true,
                }, 'Task escalated to human intervention', startTime);
            }
            if (repairResult?.executionSuccess) {
                await this.storeInWorkingMemory(`auto-repair-success:${taskId}`, {
                    attempt: attempt + 1,
                    strategy: repairPlan.repairStrategy,
                    totalCostUsd,
                    totalDurationMs: Date.now() - totalStartTime,
                }, 3600000);
                return this.createAgentOutput(taskId, true, {
                    plan: repairPlan,
                    executed: true,
                    success: true,
                    output: repairResult.executionOutput,
                    totalCostUsd,
                    totalDurationMs: Date.now() - totalStartTime,
                    attempts: attempt + 1,
                }, undefined, startTime);
            }
            lastError = 'Repair attempt failed';
            error = { message: `Repair attempt ${attempt + 1} failed`, previousError: error };
        }
        return this.createAgentOutput(taskId, false, {
            executed: false,
            success: false,
            output: null,
            totalCostUsd,
            totalDurationMs: Date.now() - totalStartTime,
            attempts: maxRepairAttempts,
        }, lastError || `All ${maxRepairAttempts} repair attempts exhausted`, startTime);
    }
    parseRepairPlan(content) {
        try {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return {
                    repairStrategy: Object.values(RepairStrategy).includes(parsed.repairStrategy)
                        ? parsed.repairStrategy
                        : RepairStrategy.RETRY,
                    modifiedParameters: parsed.modifiedParameters || {},
                    expectedSuccessRate: typeof parsed.expectedSuccessRate === 'number'
                        ? Math.min(1, Math.max(0, parsed.expectedSuccessRate))
                        : 0.5,
                    alternativeApproaches: Array.isArray(parsed.alternativeApproaches)
                        ? parsed.alternativeApproaches
                        : [],
                    reasoning: parsed.reasoning || 'No reasoning provided',
                };
            }
        }
        catch {
        }
        return {
            repairStrategy: RepairStrategy.RETRY,
            modifiedParameters: {},
            expectedSuccessRate: 0.3,
            alternativeApproaches: [],
            reasoning: 'Fallback plan due to LLM parsing failure',
        };
    }
    createFallbackRepairPlan(error, errorAnalysis, failedCapabilityId) {
        const errorMsg = String(error?.message || error || '').toLowerCase();
        const category = errorAnalysis?.errorCategory || errorAnalysis?.analysis?.errorCategory || 'UNKNOWN';
        if (category === 'RATE_LIMIT' || category === 'TIMEOUT') {
            return {
                repairStrategy: RepairStrategy.RETRY,
                modifiedParameters: {
                    timeout: 120000,
                    retryDelay: 5000,
                },
                expectedSuccessRate: 0.7,
                alternativeApproaches: ['Increase timeout further', 'Queue task for later'],
                reasoning: `${category} errors are typically transient — retry with increased timeout`,
            };
        }
        if (category === 'LLM_FAILURE') {
            return {
                repairStrategy: RepairStrategy.FALLBACK,
                modifiedParameters: {
                    fallbackCapability: 'dev.frontend',
                    useCachedResults: true,
                },
                expectedSuccessRate: 0.5,
                alternativeApproaches: ['Use a different LLM provider', 'Simplify the prompt'],
                reasoning: 'LLM failure — fall back to cached or simplified results',
            };
        }
        if (category === 'PERMISSION' || category === 'DATA_CORRUPTION') {
            return {
                repairStrategy: RepairStrategy.ESCALATE,
                modifiedParameters: {},
                expectedSuccessRate: 0.1,
                alternativeApproaches: ['Manual review required', 'Check access policies'],
                reasoning: `${category} errors typically require human intervention`,
            };
        }
        if (category === 'VALIDATION' || category === 'CONFIGURATION') {
            return {
                repairStrategy: RepairStrategy.RETRY,
                modifiedParameters: {
                    validateInput: true,
                    strictMode: false,
                    reconfigured: true,
                },
                expectedSuccessRate: 0.6,
                alternativeApproaches: ['Adjust input format', 'Use default configuration'],
                reasoning: `${category} errors can be resolved by retrying with adjusted parameters`,
            };
        }
        if (category === 'PLAYWRIGHT_CRASH') {
            return {
                repairStrategy: RepairStrategy.RETRY,
                modifiedParameters: {
                    restartBrowser: true,
                    headless: true,
                    timeout: 60000,
                },
                expectedSuccessRate: 0.65,
                alternativeApproaches: ['Use different browser', 'Reduce page complexity'],
                reasoning: 'Browser crash — retry with fresh browser session',
            };
        }
        return {
            repairStrategy: RepairStrategy.RETRY,
            modifiedParameters: {
                retryCount: 1,
                backoffMs: 2000,
            },
            expectedSuccessRate: 0.4,
            alternativeApproaches: [
                'Try a different capability',
                'Simplify the task',
                'Escalate to human',
            ],
            reasoning: `Unknown error category (${category}) — attempting simple retry as default strategy`,
        };
    }
};
exports.AutoFixerAgentService = AutoFixerAgentService;
exports.AutoFixerAgentService = AutoFixerAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __param(3, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], AutoFixerAgentService);
//# sourceMappingURL=auto-fixer-agent.service.js.map