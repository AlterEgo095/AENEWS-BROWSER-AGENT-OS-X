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
var TaskValidatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskValidatorService = void 0;
const common_1 = require("@nestjs/common");
const bridge_1 = require("../bridge");
let TaskValidatorService = TaskValidatorService_1 = class TaskValidatorService {
    constructor(bridge) {
        this.bridge = bridge;
        this.logger = new common_1.Logger(TaskValidatorService_1.name);
    }
    async validate(results, request) {
        const startTime = Date.now();
        this.logger.log(`Validating ${results.length} execution results`);
        const errors = [];
        const warnings = [];
        const totalSteps = results.length;
        const successfulSteps = results.filter((r) => r.success).length;
        const failedSteps = totalSteps - successfulSteps;
        const completenessScore = this.validateCompleteness(results, request, errors, warnings);
        const qualityScore = this.validateQuality(results, request, errors, warnings);
        const performanceScore = this.validatePerformance(results, request, warnings);
        const complianceScore = this.validateCompliance(results, request, errors, warnings);
        const integrityScore = this.validateIntegrity(results, errors, warnings);
        const schemaValidationScore = this.validateAgainstSchema(results, request, errors, warnings);
        const score = Math.round(completenessScore * 0.25 +
            qualityScore * 0.2 +
            performanceScore * 0.1 +
            complianceScore * 0.15 +
            integrityScore * 0.15 +
            schemaValidationScore * 0.15);
        const isValid = errors.length === 0 && score >= 50;
        const result = {
            isValid,
            score,
            errors,
            warnings,
            details: {
                totalSteps,
                successfulSteps,
                failedSteps,
                completenessScore,
                qualityScore,
                performanceScore,
                complianceScore,
                integrityScore,
                schemaValidationScore,
            },
        };
        this.logger.log(`Validation ${isValid ? 'PASSED' : 'FAILED'} (score: ${score}): ` +
            `${errors.length} errors, ${warnings.length} warnings in ${Date.now() - startTime}ms`);
        return result;
    }
    async llmValidate(results, requirements) {
        if (!this.bridge) {
            return null;
        }
        const userPrompt = JSON.stringify({
            results,
            requirements,
        });
        const result = await this.bridge.callLLM({
            systemPrompt: 'You are an expert deliverable validator. Validate the results against the requirements. ' +
                'Output JSON: {isValid, errors: [], warnings: []}',
            userPrompt,
            temperature: 0.2,
            maxTokens: 4096,
        });
        const parsed = JSON.parse(result.content);
        const totalSteps = Array.isArray(results) ? results.length : 0;
        const successfulSteps = Array.isArray(results)
            ? results.filter((r) => r.success).length
            : 0;
        return {
            isValid: parsed.isValid ?? false,
            score: parsed.isValid ? 100 : 0,
            errors: parsed.errors || [],
            warnings: parsed.warnings || [],
            details: {
                totalSteps,
                successfulSteps,
                failedSteps: totalSteps - successfulSteps,
                completenessScore: parsed.isValid ? 100 : 50,
                qualityScore: parsed.isValid ? 100 : 50,
                performanceScore: 100,
                complianceScore: parsed.isValid ? 100 : 50,
                integrityScore: parsed.isValid ? 100 : 50,
                schemaValidationScore: parsed.isValid ? 100 : 50,
            },
        };
    }
    validateCompleteness(results, request, errors, warnings) {
        let score = 100;
        const totalSteps = results.length;
        if (totalSteps === 0) {
            errors.push('No execution results to validate');
            return 0;
        }
        const successfulSteps = results.filter((r) => r.success).length;
        const successRate = successfulSteps / totalSteps;
        if (successRate < 0.5) {
            errors.push(`Less than 50% of steps succeeded (${successfulSteps}/${totalSteps})`);
            score -= 50;
        }
        else if (successRate < 0.8) {
            warnings.push(`Only ${Math.round(successRate * 100)}% of steps succeeded (${successfulSteps}/${totalSteps})`);
            score -= 20;
        }
        const emptyResults = results.filter((r) => r.success && (r.output.result === null || r.output.result === undefined));
        if (emptyResults.length > 0) {
            warnings.push(`${emptyResults.length} successful step(s) have empty results`);
            score -= 5 * emptyResults.length;
        }
        const requiredOutputs = request.context?.requiredOutputs;
        if (requiredOutputs && Array.isArray(requiredOutputs)) {
            const resultKeys = new Set();
            for (const result of results) {
                if (result.success && typeof result.output.result === 'object' && result.output.result) {
                    Object.keys(result.output.result).forEach((k) => resultKeys.add(k));
                }
            }
            for (const required of requiredOutputs) {
                if (!resultKeys.has(required)) {
                    errors.push(`Required output '${required}' is missing`);
                    score -= 15;
                }
            }
        }
        const requiredSteps = request.context?.requiredSteps;
        if (requiredSteps && Array.isArray(requiredSteps)) {
            const completedStepIds = new Set(results.map((r) => r.stepId));
            for (const requiredId of requiredSteps) {
                if (!completedStepIds.has(requiredId)) {
                    errors.push(`Required step '${requiredId}' is missing from results`);
                    score -= 10;
                }
            }
        }
        return Math.max(0, score);
    }
    validateQuality(results, request, errors, warnings) {
        let score = 100;
        for (const result of results) {
            if (!result.success)
                continue;
            const output = result.output;
            if (output.error) {
                warnings.push(`Step ${result.stepId} succeeded but has error message: ${output.error}`);
                score -= 10;
            }
            const resultValue = output.result;
            if (resultValue !== null && resultValue !== undefined) {
                if (typeof resultValue === 'string') {
                    if (resultValue.length === 0) {
                        warnings.push(`Step ${result.stepId} produced an empty string result`);
                        score -= 5;
                    }
                    if (resultValue.length > 1000000) {
                        warnings.push(`Step ${result.stepId} produced a very large string result`);
                        score -= 5;
                    }
                }
                if (typeof resultValue === 'object' && !Array.isArray(resultValue)) {
                    if (resultValue.status === 'failed' || resultValue.status === 'error') {
                        errors.push(`Step ${result.stepId} succeeded but result indicates failure: ${resultValue.status}`);
                        score -= 20;
                    }
                }
            }
        }
        return Math.max(0, score);
    }
    validatePerformance(results, request, warnings) {
        let score = 100;
        const maxTotalTime = request.context?.maxTotalDurationMs ?? 300000;
        const maxStepTime = request.context?.maxStepDurationMs ?? 60000;
        const totalTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0);
        const avgTime = totalTime / Math.max(results.length, 1);
        if (totalTime > maxTotalTime) {
            warnings.push(`Total execution time ${totalTime}ms exceeds maximum ${maxTotalTime}ms`);
            score -= 20;
        }
        const slowSteps = results.filter((r) => r.executionTimeMs > maxStepTime);
        if (slowSteps.length > 0) {
            warnings.push(`${slowSteps.length} step(s) exceeded maximum step duration of ${maxStepTime}ms`);
            score -= 10;
        }
        const highMemorySteps = results.filter((r) => r.output.metrics && r.output.metrics.memoryUsedMb > 256);
        if (highMemorySteps.length > 0) {
            warnings.push(`${highMemorySteps.length} step(s) used more than 256MB of memory`);
            score -= 5;
        }
        if (avgTime > 30000) {
            warnings.push(`Average step execution time ${Math.round(avgTime)}ms is high`);
            score -= 10;
        }
        return Math.max(0, score);
    }
    validateCompliance(results, request, errors, warnings) {
        let score = 100;
        const requiredPermissions = request.context?.requiredPermissions;
        if (requiredPermissions && Array.isArray(requiredPermissions)) {
            const permissionErrors = results.filter((r) => r.output.error?.includes('Permission denied'));
            if (permissionErrors.length > 0) {
                errors.push(`${permissionErrors.length} step(s) had permission errors despite having required permissions`);
                score -= 30;
            }
        }
        const constraints = request.context?.constraints;
        if (constraints) {
            if (constraints.maxResultSize) {
                const oversizedResults = results.filter((r) => {
                    const size = JSON.stringify(r.output.result).length;
                    return size > constraints.maxResultSize;
                });
                if (oversizedResults.length > 0) {
                    warnings.push(`${oversizedResults.length} result(s) exceed maximum size constraint`);
                    score -= 10;
                }
            }
            if (constraints.allowedContentTypes) {
                const invalidTypes = results.filter((r) => {
                    const contentType = r.output.result?.contentType || r.output.result?.type;
                    return contentType && !constraints.allowedContentTypes.includes(contentType);
                });
                if (invalidTypes.length > 0) {
                    errors.push(`${invalidTypes.length} result(s) have disallowed content types`);
                    score -= 20;
                }
            }
        }
        for (const result of results) {
            if (result.success && result.output.result) {
                const resultStr = JSON.stringify(result.output.result);
                if (/password|secret|api_key|token|credential/i.test(resultStr)) {
                    warnings.push(`Step ${result.stepId} may contain sensitive data in output`);
                    score -= 5;
                }
            }
        }
        return Math.max(0, score);
    }
    validateIntegrity(results, errors, warnings) {
        let score = 100;
        for (const result of results) {
            if (!result.success || !result.output.result)
                continue;
            const resultValue = result.output.result;
            if (typeof resultValue === 'object' && resultValue !== null) {
                const nullKeys = Object.entries(resultValue)
                    .filter(([, v]) => v === null || v === undefined)
                    .map(([k]) => k);
                if (nullKeys.length > 0) {
                    warnings.push(`Step ${result.stepId} has null/undefined values in fields: ${nullKeys.join(', ')}`);
                    score -= 3 * nullKeys.length;
                }
            }
            if (typeof resultValue === 'object' && resultValue !== null) {
                const nanPaths = this.findNumericIssues(resultValue);
                if (nanPaths.length > 0) {
                    warnings.push(`Step ${result.stepId} has NaN/Infinity values at paths: ${nanPaths.join(', ')}`);
                    score -= 5 * nanPaths.length;
                }
            }
            try {
                JSON.stringify(resultValue);
            }
            catch (error) {
                errors.push(`Step ${result.stepId} result contains circular references or non-serializable values`);
                score -= 30;
            }
        }
        return Math.max(0, score);
    }
    validateAgainstSchema(results, request, errors, warnings) {
        const expectedSchema = request.context?.outputSchema;
        if (!expectedSchema) {
            return 100;
        }
        let score = 100;
        for (const result of results) {
            if (!result.success || !result.output.result)
                continue;
            const schemaResult = this.validateSchema(result.output.result, expectedSchema);
            if (schemaResult.errors.length > 0) {
                errors.push(`Step ${result.stepId} schema validation failed: ${schemaResult.errors.join('; ')}`);
                score -= 15;
            }
            if (schemaResult.warnings.length > 0) {
                warnings.push(`Step ${result.stepId} schema warnings: ${schemaResult.warnings.join('; ')}`);
                score -= 5;
            }
        }
        return Math.max(0, score);
    }
    validateSchema(value, schema) {
        const errors = [];
        const warnings = [];
        if (schema.type === 'object' && typeof value !== 'object') {
            errors.push(`Expected object, got ${typeof value}`);
            return { valid: false, errors, warnings };
        }
        if (schema.type === 'array' && !Array.isArray(value)) {
            errors.push(`Expected array, got ${typeof value}`);
            return { valid: false, errors, warnings };
        }
        if (schema.type === 'string' && typeof value !== 'string') {
            errors.push(`Expected string, got ${typeof value}`);
            return { valid: false, errors, warnings };
        }
        if (schema.type === 'number' && typeof value !== 'number') {
            errors.push(`Expected number, got ${typeof value}`);
            return { valid: false, errors, warnings };
        }
        if (schema.type === 'boolean' && typeof value !== 'boolean') {
            errors.push(`Expected boolean, got ${typeof value}`);
            return { valid: false, errors, warnings };
        }
        if (schema.required && Array.isArray(schema.required)) {
            for (const field of schema.required) {
                if (!(field in value)) {
                    errors.push(`Missing required field: ${field}`);
                }
            }
        }
        if (schema.properties) {
            for (const [key, propSchema] of Object.entries(schema.properties)) {
                if (value[key] !== undefined && propSchema && typeof propSchema === 'object') {
                    const prop = propSchema;
                    if (prop.type && typeof value[key] !== prop.type) {
                        errors.push(`Field ${key}: expected ${prop.type}, got ${typeof value[key]}`);
                    }
                    if (prop.minLength &&
                        typeof value[key] === 'string' &&
                        value[key].length < prop.minLength) {
                        errors.push(`Field ${key}: minimum length ${prop.minLength} not met`);
                    }
                    if (prop.maxLength &&
                        typeof value[key] === 'string' &&
                        value[key].length > prop.maxLength) {
                        warnings.push(`Field ${key}: exceeds maximum length ${prop.maxLength}`);
                    }
                    if (prop.minimum && typeof value[key] === 'number' && value[key] < prop.minimum) {
                        errors.push(`Field ${key}: value ${value[key]} below minimum ${prop.minimum}`);
                    }
                    if (prop.maximum && typeof value[key] === 'number' && value[key] > prop.maximum) {
                        warnings.push(`Field ${key}: value ${value[key]} exceeds maximum ${prop.maximum}`);
                    }
                    if (prop.enum && Array.isArray(prop.enum) && !prop.enum.includes(value[key])) {
                        errors.push(`Field ${key}: value '${value[key]}' not in enum [${prop.enum.join(', ')}]`);
                    }
                }
            }
        }
        if (schema.additionalProperties === false && typeof value === 'object' && value !== null) {
            const allowedKeys = new Set(Object.keys(schema.properties || {}));
            const extraKeys = Object.keys(value).filter((k) => !allowedKeys.has(k));
            if (extraKeys.length > 0) {
                warnings.push(`Additional properties found: ${extraKeys.join(', ')}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    findNumericIssues(obj, prefix = '') {
        const issues = [];
        if (typeof obj === 'number') {
            if (isNaN(obj) || !isFinite(obj)) {
                issues.push(prefix || 'root');
            }
        }
        else if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                const path = prefix ? `${prefix}.${key}` : key;
                if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
                    issues.push(path);
                }
                else if (typeof value === 'object' && value !== null) {
                    issues.push(...this.findNumericIssues(value, path));
                }
            }
        }
        return issues;
    }
};
exports.TaskValidatorService = TaskValidatorService;
exports.TaskValidatorService = TaskValidatorService = TaskValidatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [bridge_1.AgentConnectorBridge])
], TaskValidatorService);
//# sourceMappingURL=task-validator.service.js.map