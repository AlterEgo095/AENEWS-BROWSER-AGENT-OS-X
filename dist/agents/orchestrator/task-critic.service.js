"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TaskCriticService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskCriticService = exports.CritiqueCategory = void 0;
const common_1 = require("@nestjs/common");
var CritiqueCategory;
(function (CritiqueCategory) {
    CritiqueCategory["COMPLETENESS"] = "completeness";
    CritiqueCategory["ACCURACY"] = "accuracy";
    CritiqueCategory["CONSISTENCY"] = "consistency";
    CritiqueCategory["PERFORMANCE"] = "performance";
    CritiqueCategory["ERROR_HANDLING"] = "error_handling";
    CritiqueCategory["DATA_QUALITY"] = "data_quality";
    CritiqueCategory["COMPLIANCE"] = "compliance";
})(CritiqueCategory || (exports.CritiqueCategory = CritiqueCategory = {}));
const DEFAULT_CRITIQUE_CONFIG = {
    passingScoreThreshold: 60,
    criticalSeverityBlocks: true,
    maxIssuesPerStep: 10,
    enableCrossStepConsistencyCheck: true,
    enableCompletenessCheck: true,
    enableDataQualityCheck: true,
};
let TaskCriticService = TaskCriticService_1 = class TaskCriticService {
    constructor() {
        this.logger = new common_1.Logger(TaskCriticService_1.name);
        this.config = { ...DEFAULT_CRITIQUE_CONFIG };
    }
    async critique(results, request) {
        const startTime = Date.now();
        this.logger.log(`Critiquing ${results.length} execution results`);
        const issues = [];
        let totalScore = 0;
        const maxScore = results.length * 100;
        for (const result of results) {
            const stepScore = this.evaluateStepResult(result, request, issues);
            totalScore += stepScore;
        }
        if (this.config.enableCrossStepConsistencyCheck) {
            this.checkCrossStepConsistency(results, issues);
        }
        if (this.config.enableCompletenessCheck) {
            this.checkCompleteness(results, request, issues);
        }
        if (this.config.enableDataQualityCheck) {
            this.checkDataQuality(results, issues);
        }
        const score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        const hasCriticalIssues = issues.some((i) => i.severity === 'critical');
        const passed = score >= this.config.passingScoreThreshold
            && !(this.config.criticalSeverityBlocks && hasCriticalIssues);
        const recommendations = this.generateRecommendations(issues);
        const critiqueResult = {
            passed,
            score,
            issues,
            summary: this.generateSummary(results, score, issues),
            recommendations,
        };
        this.logger.log(`Critique completed: ${passed ? 'PASSED' : 'FAILED'} (score: ${score}) ` +
            `with ${issues.length} issues in ${Date.now() - startTime}ms`);
        return critiqueResult;
    }
    evaluateStepResult(result, request, issues) {
        let score = 100;
        if (!result.success) {
            score -= 50;
            issues.push({
                stepId: result.stepId,
                severity: 'error',
                category: CritiqueCategory.ERROR_HANDLING,
                message: `Step failed: ${result.output.error || 'Unknown error'}`,
                details: {
                    error: result.output.error,
                    retryCount: result.retryCount,
                    executionTimeMs: result.executionTimeMs,
                    timedOut: result.timedOut,
                },
                autoRepairable: result.retryCount < 3 && !result.timedOut,
            });
        }
        if (result.timedOut) {
            score -= 20;
            issues.push({
                stepId: result.stepId,
                severity: 'warning',
                category: CritiqueCategory.PERFORMANCE,
                message: `Step timed out after ${result.executionTimeMs}ms`,
                autoRepairable: false,
            });
        }
        const expectedMaxTime = request.context?.maxStepDurationMs ?? 60000;
        if (result.executionTimeMs > expectedMaxTime && !result.timedOut) {
            score -= 15;
            issues.push({
                stepId: result.stepId,
                severity: 'warning',
                category: CritiqueCategory.PERFORMANCE,
                message: `Step took ${result.executionTimeMs}ms, exceeding expected ${expectedMaxTime}ms`,
                details: { executionTimeMs: result.executionTimeMs, expectedMaxTime },
                autoRepairable: false,
            });
        }
        if (result.success && result.output.result !== null && result.output.result !== undefined) {
            const outputQuality = this.assessOutputQuality(result.output);
            score -= outputQuality.deduction;
            issues.push(...outputQuality.issues);
        }
        else if (result.success && result.output.result === null) {
            score -= 20;
            issues.push({
                stepId: result.stepId,
                severity: 'warning',
                category: CritiqueCategory.COMPLETENESS,
                message: 'Step succeeded but produced null result',
                autoRepairable: true,
            });
        }
        if (result.output.metrics) {
            if (result.output.metrics.memoryUsedMb > 500) {
                score -= 10;
                issues.push({
                    stepId: result.stepId,
                    severity: 'warning',
                    category: CritiqueCategory.PERFORMANCE,
                    message: `High memory usage: ${result.output.metrics.memoryUsedMb}MB`,
                    autoRepairable: false,
                });
            }
        }
        if (result.retryCount > 1) {
            score -= 5 * result.retryCount;
            issues.push({
                stepId: result.stepId,
                severity: 'info',
                category: CritiqueCategory.ERROR_HANDLING,
                message: `Step required ${result.retryCount} retries`,
                details: { retryCount: result.retryCount },
                autoRepairable: false,
            });
        }
        return Math.max(0, score);
    }
    assessOutputQuality(output) {
        const issues = [];
        let deduction = 0;
        const result = output.result;
        if (typeof result === 'string' && result.trim().length === 0) {
            deduction += 15;
            issues.push({
                stepId: output.taskId,
                severity: 'warning',
                category: CritiqueCategory.COMPLETENESS,
                message: 'Output is an empty string',
                autoRepairable: true,
            });
        }
        if (typeof result === 'object' && result !== null) {
            if (result.error || result.errors) {
                deduction += 20;
                issues.push({
                    stepId: output.taskId,
                    severity: 'warning',
                    category: CritiqueCategory.ACCURACY,
                    message: 'Successful output contains error indicators',
                    details: { error: result.error, errors: result.errors },
                    autoRepairable: true,
                });
            }
            if (result.partial === true) {
                deduction += 10;
                issues.push({
                    stepId: output.taskId,
                    severity: 'info',
                    category: CritiqueCategory.COMPLETENESS,
                    message: 'Output is marked as partial',
                    autoRepairable: true,
                });
            }
            if (result.truncated === true) {
                deduction += 15;
                issues.push({
                    stepId: output.taskId,
                    severity: 'warning',
                    category: CritiqueCategory.COMPLETENESS,
                    message: 'Output was truncated',
                    autoRepairable: true,
                });
            }
        }
        return { deduction, issues };
    }
    checkCrossStepConsistency(results, issues) {
        const successResults = results.filter((r) => r.success);
        for (let i = 0; i < successResults.length; i++) {
            for (let j = i + 1; j < successResults.length; j++) {
                const a = successResults[i].output.result;
                const b = successResults[j].output.result;
                if (typeof a === 'object' &&
                    typeof b === 'object' &&
                    a !== null &&
                    b !== null) {
                    const conflicting = this.findConflicts(a, b);
                    if (conflicting.length > 0) {
                        issues.push({
                            stepId: `${successResults[i].stepId}+${successResults[j].stepId}`,
                            severity: 'warning',
                            category: CritiqueCategory.CONSISTENCY,
                            message: `Conflicting results between steps: ${conflicting.join(', ')}`,
                            details: { conflicts: conflicting },
                            autoRepairable: true,
                        });
                    }
                }
            }
        }
        const resultHashes = new Map();
        for (const result of successResults) {
            const hash = this.hashResult(result.output.result);
            if (resultHashes.has(hash)) {
                issues.push({
                    stepId: result.stepId,
                    severity: 'info',
                    category: CritiqueCategory.CONSISTENCY,
                    message: `Duplicate result detected, same as step ${resultHashes.get(hash)}`,
                    autoRepairable: false,
                });
            }
            else {
                resultHashes.set(hash, result.stepId);
            }
        }
    }
    checkCompleteness(results, request, issues) {
        const requiredSteps = request.context?.requiredSteps;
        if (requiredSteps && Array.isArray(requiredSteps)) {
            const completedStepIds = new Set(results.map((r) => r.stepId));
            for (const requiredId of requiredSteps) {
                if (!completedStepIds.has(requiredId)) {
                    issues.push({
                        stepId: requiredId,
                        severity: 'error',
                        category: CritiqueCategory.COMPLETENESS,
                        message: `Required step ${requiredId} is missing from results`,
                        autoRepairable: true,
                    });
                }
            }
        }
        const failedCount = results.filter((r) => !r.success).length;
        const totalSteps = results.length;
        if (totalSteps > 0 && failedCount === totalSteps) {
            issues.push({
                stepId: 'all',
                severity: 'critical',
                category: CritiqueCategory.COMPLETENESS,
                message: 'All steps failed',
                autoRepairable: false,
            });
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
                    issues.push({
                        stepId: 'output',
                        severity: 'warning',
                        category: CritiqueCategory.COMPLETENESS,
                        message: `Required output key '${required}' not found in results`,
                        autoRepairable: true,
                    });
                }
            }
        }
    }
    checkDataQuality(results, issues) {
        for (const result of results) {
            if (!result.success || !result.output.result)
                continue;
            const resultValue = result.output.result;
            if (typeof resultValue === 'string') {
                if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(resultValue)) {
                    issues.push({
                        stepId: result.stepId,
                        severity: 'warning',
                        category: CritiqueCategory.DATA_QUALITY,
                        message: 'Output contains control characters',
                        autoRepairable: true,
                    });
                }
            }
            if (typeof resultValue === 'object' && resultValue !== null) {
                const serialized = JSON.stringify(resultValue);
                if (serialized.includes('NaN') || serialized.includes('Infinity')) {
                    issues.push({
                        stepId: result.stepId,
                        severity: 'warning',
                        category: CritiqueCategory.DATA_QUALITY,
                        message: 'Output contains NaN or Infinity values',
                        autoRepairable: true,
                    });
                }
            }
        }
    }
    findConflicts(a, b) {
        const conflicts = [];
        const commonKeys = Object.keys(a).filter((k) => k in b);
        for (const key of commonKeys) {
            if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
                conflicts.push(key);
            }
        }
        return conflicts;
    }
    hashResult(result) {
        const str = JSON.stringify(result);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    generateRecommendations(issues) {
        const recommendations = [];
        const errorIssues = issues.filter((i) => i.severity === 'error' || i.severity === 'critical');
        const warningIssues = issues.filter((i) => i.severity === 'warning');
        if (errorIssues.length > 0) {
            recommendations.push(`Address ${errorIssues.length} error(s) before accepting results`);
        }
        for (const error of errorIssues) {
            if (error.autoRepairable) {
                recommendations.push(`Auto-repair step ${error.stepId}: ${error.message}`);
            }
        }
        if (warningIssues.some((i) => i.category === CritiqueCategory.PERFORMANCE)) {
            recommendations.push('Consider optimizing steps with high execution time or memory usage');
        }
        if (warningIssues.some((i) => i.category === CritiqueCategory.CONSISTENCY)) {
            recommendations.push('Review conflicting results between steps for data integrity');
        }
        if (warningIssues.some((i) => i.category === CritiqueCategory.DATA_QUALITY)) {
            recommendations.push('Review data quality issues in step outputs');
        }
        if (issues.every((i) => i.severity === 'info')) {
            recommendations.push('Results look good, no significant issues found');
        }
        return recommendations;
    }
    generateSummary(results, score, issues) {
        const total = results.length;
        const succeeded = results.filter((r) => r.success).length;
        const failed = total - succeeded;
        const critical = issues.filter((i) => i.severity === 'critical').length;
        const errors = issues.filter((i) => i.severity === 'error').length;
        const warnings = issues.filter((i) => i.severity === 'warning').length;
        const timedOut = results.filter((r) => r.timedOut).length;
        return (`Execution summary: ${succeeded}/${total} steps succeeded (score: ${score}/100). ` +
            `Issues: ${critical} critical, ${errors} errors, ${warnings} warnings. ` +
            `${failed} step(s) failed${timedOut > 0 ? `, ${timedOut} timed out` : ''}.`);
    }
};
exports.TaskCriticService = TaskCriticService;
exports.TaskCriticService = TaskCriticService = TaskCriticService_1 = __decorate([
    (0, common_1.Injectable)()
], TaskCriticService);
//# sourceMappingURL=task-critic.service.js.map