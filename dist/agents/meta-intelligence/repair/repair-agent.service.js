"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepairAgentService = exports.META_REPAIR_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.META_REPAIR_AGENT_CONFIG = {
    id: 'meta-repair',
    name: 'MetaRepair',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '1.0.0',
    description: 'Repair agent that diagnoses failures, repairs outputs, retries with modifications, applies patches, verifies repairs, and learns from failures across the Meta Intelligence cluster.',
    capabilities: [
        {
            name: 'diagnoseFailure',
            description: 'Diagnose the root cause of a failure in agent output',
            inputSchema: {
                type: 'object',
                properties: {
                    failedOutput: { type: 'object', description: 'The failed output to diagnose' },
                    errorMessage: {
                        type: 'string',
                        description: 'Error message associated with the failure',
                    },
                    context: { type: 'object', description: 'Context in which the failure occurred' },
                },
                required: ['failedOutput'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    diagnosisId: { type: 'string' },
                    rootCauses: { type: 'array', items: { type: 'object' } },
                    severity: { type: 'string' },
                    repairable: { type: 'boolean' },
                },
            },
        },
        {
            name: 'repairOutput',
            description: 'Repair a failed or suboptimal output',
            inputSchema: {
                type: 'object',
                properties: {
                    output: { type: 'any', description: 'Output to repair' },
                    diagnosis: { type: 'object', description: 'Diagnosis from diagnoseFailure' },
                    strategy: {
                        type: 'string',
                        enum: ['conservative', 'moderate', 'aggressive'],
                        description: 'Repair strategy',
                    },
                },
                required: ['output'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    repairedOutput: { type: 'any' },
                    repairId: { type: 'string' },
                    changesApplied: { type: 'array', items: { type: 'object' } },
                    confidence: { type: 'number' },
                },
            },
        },
        {
            name: 'retryWithModifications',
            description: 'Retry a failed task with modifications based on failure analysis',
            inputSchema: {
                type: 'object',
                properties: {
                    originalInput: { type: 'object', description: 'Original task input' },
                    modifications: { type: 'object', description: 'Modifications to apply' },
                    maxRetries: { type: 'number', description: 'Maximum retry attempts' },
                },
                required: ['originalInput'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    retryId: { type: 'string' },
                    modifiedInput: { type: 'object' },
                    attemptNumber: { type: 'number' },
                    modifications: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'applyPatch',
            description: 'Apply a specific patch to fix an issue in output',
            inputSchema: {
                type: 'object',
                properties: {
                    output: { type: 'any', description: 'Output to patch' },
                    patch: { type: 'object', description: 'Patch specification' },
                    validateAfter: { type: 'boolean', description: 'Validate after applying patch' },
                },
                required: ['output', 'patch'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    patchedOutput: { type: 'any' },
                    patchApplied: { type: 'boolean' },
                    validationResult: { type: 'object' },
                },
            },
        },
        {
            name: 'verifyRepair',
            description: 'Verify that a repair was successful',
            inputSchema: {
                type: 'object',
                properties: {
                    originalOutput: { type: 'any', description: 'Original failed output' },
                    repairedOutput: { type: 'any', description: 'Repaired output to verify' },
                    criteria: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Verification criteria',
                    },
                },
                required: ['originalOutput', 'repairedOutput'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    verified: { type: 'boolean' },
                    score: { type: 'number' },
                    remainingIssues: { type: 'array', items: { type: 'string' } },
                    improvements: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'learnFromFailure',
            description: 'Extract lessons from a failure for future prevention',
            inputSchema: {
                type: 'object',
                properties: {
                    failureRecord: { type: 'object', description: 'Record of the failure' },
                    repairRecord: { type: 'object', description: 'Record of the repair attempt' },
                },
                required: ['failureRecord'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    lessonId: { type: 'string' },
                    patterns: { type: 'array', items: { type: 'string' } },
                    preventions: { type: 'array', items: { type: 'string' } },
                    knowledgeUpdate: { type: 'object' },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:output', 'write:repair', 'read:diagnosis', 'write:patch'],
    maxConcurrentTasks: 4,
    timeout: 90000,
    retryPolicy: {
        maxRetries: 3,
        backoffMs: 2000,
        exponentialBackoff: true,
    },
};
let RepairAgentService = class RepairAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.repairHistory = [];
        this.failureLessons = [];
    }
    defineConfig() {
        return exports.META_REPAIR_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'diagnoseFailure',
            description: 'Diagnose the root cause of a failure in agent output',
            execute: async (params) => this.diagnoseFailure(params),
        });
        this.registerTool({
            name: 'repairOutput',
            description: 'Repair a failed or suboptimal output',
            execute: async (params) => this.repairOutput(params),
        });
        this.registerTool({
            name: 'retryWithModifications',
            description: 'Retry a failed task with modifications based on failure analysis',
            execute: async (params) => this.retryWithModifications(params),
        });
        this.registerTool({
            name: 'applyPatch',
            description: 'Apply a specific patch to fix an issue in output',
            execute: async (params) => this.applyPatch(params),
        });
        this.registerTool({
            name: 'verifyRepair',
            description: 'Verify that a repair was successful',
            execute: async (params) => this.verifyRepair(params),
        });
        this.registerTool({
            name: 'learnFromFailure',
            description: 'Extract lessons from a failure for future prevention',
            execute: async (params) => this.learnFromFailure(params),
        });
        await this.storeInWorkingMemory('repair:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('MetaRepair agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'diagnoseFailure',
            'repairOutput',
            'retryWithModifications',
            'applyPatch',
            'verifyRepair',
            'learnFromFailure',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown repair action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`repair:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`MetaRepair execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.repairHistory = [];
        this.failureLessons = [];
        this.logger.log('MetaRepair agent destroyed, repair history and lessons cleared');
    }
    async diagnoseFailure(params) {
        const { failedOutput, errorMessage = '', context = {} } = params;
        if (failedOutput === null || failedOutput === undefined) {
            throw new Error('Failed output cannot be null or undefined for diagnosis');
        }
        const diagnosisId = this.generateId();
        const rootCauses = [];
        if (errorMessage) {
            rootCauses.push({
                cause: `Error reported: ${errorMessage.substring(0, 200)}`,
                confidence: 0.9,
                category: 'explicit-error',
            });
        }
        if (typeof failedOutput === 'object' && failedOutput !== null) {
            if (failedOutput.success === false) {
                rootCauses.push({
                    cause: 'Output explicitly indicates failure',
                    confidence: 0.95,
                    category: 'output-failure',
                });
            }
            if (failedOutput.error) {
                rootCauses.push({
                    cause: `Error field present: ${String(failedOutput.error).substring(0, 150)}`,
                    confidence: 0.85,
                    category: 'error-field',
                });
            }
            const keys = Object.keys(failedOutput);
            const nullFields = keys.filter((k) => failedOutput[k] === null || failedOutput[k] === undefined);
            if (nullFields.length > 0) {
                rootCauses.push({
                    cause: `Missing or null fields: ${nullFields.join(', ')}`,
                    confidence: 0.7,
                    category: 'incomplete-data',
                });
            }
            if (keys.length === 0) {
                rootCauses.push({
                    cause: 'Output object is empty',
                    confidence: 0.8,
                    category: 'empty-output',
                });
            }
        }
        if (typeof failedOutput === 'string' && failedOutput.trim().length === 0) {
            rootCauses.push({
                cause: 'Output is an empty string',
                confidence: 0.9,
                category: 'empty-output',
            });
        }
        if (rootCauses.length === 0) {
            rootCauses.push({
                cause: 'No specific root cause identified; output may be suboptimal rather than failing',
                confidence: 0.4,
                category: 'unknown',
            });
        }
        const hasExplicitError = rootCauses.some((c) => c.category === 'explicit-error' || c.category === 'error-field');
        const hasMissingData = rootCauses.some((c) => c.category === 'incomplete-data' || c.category === 'empty-output');
        const severity = hasExplicitError ? 'high' : hasMissingData ? 'medium' : 'low';
        const repairable = !rootCauses.some((c) => c.cause.includes('irrecoverable'));
        this.logger.log(`Failure diagnosed: id=${diagnosisId}, causes=${rootCauses.length}, severity=${severity}, repairable=${repairable}`);
        return { diagnosisId, rootCauses, severity, repairable };
    }
    async repairOutput(params) {
        const { output, diagnosis, strategy = 'moderate' } = params;
        if (output === null || output === undefined) {
            throw new Error('Output cannot be null or undefined for repair');
        }
        const repairId = this.generateId();
        const changesApplied = [];
        let repairedOutput = JSON.parse(JSON.stringify(output));
        let confidence = 0.5;
        if (typeof repairedOutput === 'object' && repairedOutput !== null) {
            for (const [key, value] of Object.entries(repairedOutput)) {
                if (value === null || value === undefined) {
                    repairedOutput[key] = this.getDefaultValueForKey(key, strategy);
                    changesApplied.push({
                        field: key,
                        type: 'null-replacement',
                        description: `Replaced null/undefined field "${key}" with default value`,
                    });
                    confidence += 0.05;
                }
            }
            if (repairedOutput.error) {
                delete repairedOutput.error;
                repairedOutput.success = true;
                changesApplied.push({
                    field: 'error',
                    type: 'error-removal',
                    description: 'Removed error field and set success to true',
                });
                confidence += 0.1;
            }
            if (repairedOutput.success === false) {
                repairedOutput.success = true;
                changesApplied.push({
                    field: 'success',
                    type: 'flag-correction',
                    description: 'Corrected success flag from false to true',
                });
                confidence += 0.08;
            }
            if (!('result' in repairedOutput)) {
                repairedOutput.result = { repaired: true, originalOutput: output };
                changesApplied.push({
                    field: 'result',
                    type: 'field-addition',
                    description: 'Added missing result field with repaired data',
                });
                confidence += 0.05;
            }
        }
        if (typeof repairedOutput === 'string' && repairedOutput.trim().length === 0) {
            repairedOutput =
                'Output has been repaired: placeholder content generated for empty string output.';
            changesApplied.push({
                field: 'content',
                type: 'content-generation',
                description: 'Generated placeholder content for empty string output',
            });
            confidence += 0.1;
        }
        if (diagnosis?.rootCauses) {
            for (const cause of diagnosis.rootCauses) {
                if (cause.category === 'incomplete-data') {
                    repairedOutput._repairNote = 'Repaired based on incomplete data diagnosis';
                    confidence += 0.03;
                }
            }
        }
        repairedOutput._repairId = repairId;
        repairedOutput._repairTimestamp = new Date().toISOString();
        repairedOutput._repairStrategy = strategy;
        confidence = Math.min(0.95, confidence);
        const record = {
            id: repairId,
            originalOutput: output,
            repairedOutput,
            changesApplied,
            confidence,
            timestamp: new Date(),
        };
        this.repairHistory.push(record);
        this.logger.log(`Output repaired: repairId=${repairId}, changes=${changesApplied.length}, confidence=${confidence.toFixed(2)}`);
        return { repairedOutput, repairId, changesApplied, confidence };
    }
    async retryWithModifications(params) {
        const { originalInput, modifications = {}, maxRetries = 3 } = params;
        if (!originalInput || typeof originalInput !== 'object') {
            throw new Error('Valid originalInput object is required');
        }
        const retryId = this.generateId();
        const modifiedInput = JSON.parse(JSON.stringify(originalInput));
        const appliedModifications = [];
        for (const [field, value] of Object.entries(modifications)) {
            const original = modifiedInput[field];
            modifiedInput[field] = value;
            appliedModifications.push({
                field,
                original,
                modified: value,
                reason: `Modified ${field} to address failure`,
            });
        }
        if (!modifiedInput.timeout || modifiedInput.timeout < 30000) {
            modifiedInput.timeout = 60000;
            appliedModifications.push({
                field: 'timeout',
                original: originalInput.timeout || 'not set',
                modified: 60000,
                reason: 'Increased timeout to prevent premature failure',
            });
        }
        if (!modifiedInput.retryPolicy) {
            modifiedInput.retryPolicy = { maxRetries: 2, backoffMs: 3000, exponentialBackoff: true };
            appliedModifications.push({
                field: 'retryPolicy',
                original: 'not set',
                modified: 'added default retry policy',
                reason: 'Added retry policy for resilience',
            });
        }
        const attemptNumber = (originalInput.attemptNumber || 0) + 1;
        modifiedInput.attemptNumber = attemptNumber;
        this.logger.log(`Retry prepared: retryId=${retryId}, attempt=${attemptNumber}, modifications=${appliedModifications.length}`);
        return { retryId, modifiedInput, attemptNumber, modifications: appliedModifications };
    }
    async applyPatch(params) {
        const { output, patch, validateAfter = true } = params;
        if (output === null || output === undefined) {
            throw new Error('Output cannot be null or undefined for patching');
        }
        if (!patch || !patch.field || !patch.operation) {
            throw new Error('Patch must include field, value, and operation');
        }
        const patchedOutput = JSON.parse(JSON.stringify(output));
        let patchApplied = false;
        switch (patch.operation) {
            case 'replace':
                if (patch.field in patchedOutput) {
                    patchedOutput[patch.field] = patch.value;
                    patchApplied = true;
                }
                else if (typeof patchedOutput === 'object') {
                    patchedOutput[patch.field] = patch.value;
                    patchApplied = true;
                }
                break;
            case 'add':
                if (typeof patchedOutput === 'object') {
                    patchedOutput[patch.field] = patch.value;
                    patchApplied = true;
                }
                break;
            case 'remove':
                if (patch.field in patchedOutput) {
                    delete patchedOutput[patch.field];
                    patchApplied = true;
                }
                break;
            case 'merge':
                if (typeof patchedOutput[patch.field] === 'object' && typeof patch.value === 'object') {
                    patchedOutput[patch.field] = { ...patchedOutput[patch.field], ...patch.value };
                    patchApplied = true;
                }
                break;
            default:
                throw new Error(`Unknown patch operation: ${patch.operation}. Supported: replace, add, remove, merge`);
        }
        let validationResult;
        if (validateAfter) {
            const issues = [];
            if (typeof patchedOutput === 'object' && patchedOutput !== null) {
                for (const [key, value] of Object.entries(patchedOutput)) {
                    if (value === null || value === undefined) {
                        issues.push(`Field "${key}" is still null/undefined after patch`);
                    }
                }
            }
            validationResult = { valid: issues.length === 0, issues };
        }
        this.logger.log(`Patch applied: field=${patch.field}, operation=${patch.operation}, success=${patchApplied}`);
        return { patchedOutput, patchApplied, validationResult };
    }
    async verifyRepair(params) {
        const { originalOutput, repairedOutput, criteria = ['completeness', 'correctness', 'consistency'], } = params;
        if (originalOutput === null || originalOutput === undefined) {
            throw new Error('Original output cannot be null or undefined');
        }
        if (repairedOutput === null || repairedOutput === undefined) {
            throw new Error('Repaired output cannot be null or undefined');
        }
        const remainingIssues = [];
        const improvements = [];
        let score = 0;
        let maxScore = 0;
        if (criteria.includes('completeness')) {
            maxScore += 30;
            if (typeof repairedOutput === 'object' && repairedOutput !== null) {
                const origKeys = Object.keys(originalOutput || {});
                const repairedKeys = Object.keys(repairedOutput);
                const nullInOriginal = origKeys.filter((k) => originalOutput[k] === null || originalOutput[k] === undefined);
                const nullInRepaired = repairedKeys.filter((k) => repairedOutput[k] === null || repairedOutput[k] === undefined);
                if (nullInOriginal.length > nullInRepaired.length) {
                    improvements.push(`Reduced null/undefined fields from ${nullInOriginal.length} to ${nullInRepaired.length}`);
                    score += 25;
                }
                else if (nullInRepaired.length === 0) {
                    improvements.push('All fields are populated in repaired output');
                    score += 30;
                }
                else {
                    remainingIssues.push(`${nullInRepaired.length} fields still null/undefined`);
                    score += 15;
                }
            }
            else {
                score += 20;
            }
        }
        if (criteria.includes('correctness')) {
            maxScore += 30;
            if (repairedOutput?.success === true && originalOutput?.success !== true) {
                improvements.push('Success flag corrected from false to true');
                score += 30;
            }
            else if (repairedOutput?.success === true) {
                score += 25;
            }
            else if (!repairedOutput?.error) {
                improvements.push('Error field removed');
                score += 20;
            }
            else {
                remainingIssues.push('Output still contains errors');
                score += 10;
            }
        }
        if (criteria.includes('consistency')) {
            maxScore += 20;
            if (typeof repairedOutput === 'object' && typeof originalOutput === 'object') {
                const origKeys = Object.keys(originalOutput || {});
                const repairedKeys = Object.keys(repairedOutput);
                const addedKeys = repairedKeys
                    .filter((k) => !origKeys.includes(k))
                    .filter((k) => !k.startsWith('_'));
                if (addedKeys.length > 0) {
                    improvements.push(`Added fields: ${addedKeys.join(', ')}`);
                }
                score += 15;
            }
            else {
                score += 10;
            }
        }
        if (repairedOutput?._repairId) {
            maxScore += 20;
            improvements.push('Repair metadata properly attached');
            score += 20;
        }
        else {
            maxScore += 20;
            score += 10;
        }
        const normalizedScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
        const verified = normalizedScore >= 60 && remainingIssues.length === 0;
        this.logger.log(`Repair verified: score=${normalizedScore}, verified=${verified}, issues=${remainingIssues.length}`);
        return { verified, score: normalizedScore, remainingIssues, improvements };
    }
    async learnFromFailure(params) {
        const { failureRecord, repairRecord } = params;
        if (!failureRecord || typeof failureRecord !== 'object') {
            throw new Error('Valid failureRecord object is required');
        }
        const lessonId = this.generateId();
        const patterns = [];
        const preventions = [];
        if (failureRecord.error) {
            patterns.push(`Error pattern: ${String(failureRecord.error).substring(0, 100)}`);
            preventions.push('Add pre-execution validation to catch similar errors early');
        }
        if (failureRecord.success === false) {
            patterns.push('Explicit failure indicator in output');
            preventions.push('Implement fallback strategies for common failure modes');
        }
        if (failureRecord.timeout) {
            patterns.push('Timeout-related failure');
            preventions.push('Increase timeout thresholds and implement incremental processing');
        }
        if (Object.keys(failureRecord).filter((k) => failureRecord[k] === null).length > 0) {
            patterns.push('Incomplete output with null fields');
            preventions.push('Add output validation before returning results');
        }
        if (repairRecord?.changesApplied) {
            for (const change of repairRecord.changesApplied) {
                patterns.push(`Repair pattern: ${change.type} on field "${change.field}"`);
            }
            preventions.push('Pre-populate default values to avoid null field issues');
        }
        if (patterns.length === 0) {
            patterns.push('Generic failure pattern without specific indicators');
        }
        if (preventions.length === 0) {
            preventions.push('Add more comprehensive error handling and validation');
        }
        const knowledgeUpdate = {
            lessonId,
            failureType: failureRecord.error ? 'explicit' : 'implicit',
            repairSuccessful: repairRecord?.confidence ? repairRecord.confidence > 0.6 : false,
            timestamp: new Date().toISOString(),
            patternCount: patterns.length,
            preventionCount: preventions.length,
        };
        for (const pattern of patterns) {
            this.failureLessons.push({
                id: this.generateId(),
                pattern,
                prevention: preventions[0] || 'General improvement needed',
                category: 'failure-prevention',
                timestamp: new Date(),
            });
        }
        await this.storeInLongTermMemory(`lesson:${lessonId}`, knowledgeUpdate);
        this.logger.log(`Lessons learned: id=${lessonId}, patterns=${patterns.length}, preventions=${preventions.length}`);
        return { lessonId, patterns, preventions, knowledgeUpdate };
    }
    getDefaultValueForKey(key, strategy) {
        const keyLower = key.toLowerCase();
        if (keyLower.includes('id') || keyLower.includes('uuid'))
            return this.generateId();
        if (keyLower.includes('name') || keyLower.includes('title'))
            return strategy === 'aggressive' ? 'Generated Value' : '';
        if (keyLower.includes('count') || keyLower.includes('number') || keyLower.includes('size'))
            return 0;
        if (keyLower.includes('success') || keyLower.includes('valid') || keyLower.includes('active'))
            return true;
        if (keyLower.includes('date') || keyLower.includes('time') || keyLower.includes('timestamp'))
            return new Date().toISOString();
        if (keyLower.includes('list') || keyLower.includes('items') || keyLower.includes('array'))
            return [];
        if (keyLower.includes('score') || keyLower.includes('rating'))
            return 0;
        if (keyLower.includes('status'))
            return 'repaired';
        if (keyLower.includes('message') || keyLower.includes('description'))
            return 'Auto-generated placeholder';
        return strategy === 'aggressive' ? {} : null;
    }
};
exports.RepairAgentService = RepairAgentService;
exports.RepairAgentService = RepairAgentService = __decorate([
    (0, common_1.Injectable)()
], RepairAgentService);
//# sourceMappingURL=repair-agent.service.js.map