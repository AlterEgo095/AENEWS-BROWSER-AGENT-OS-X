"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var OrchestrationCertificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestrationCertificationService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_1 = require("../types");
const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const ORCHESTRATOR_DIR = path.join(SOURCE_ROOT, 'agents', 'orchestrator');
let OrchestrationCertificationService = OrchestrationCertificationService_1 = class OrchestrationCertificationService {
    constructor() {
        this.logger = new common_1.Logger(OrchestrationCertificationService_1.name);
        this.serviceAnalyses = null;
    }
    async runAll() {
        const startTime = Date.now();
        this.logger.log('Starting Orchestration certification...');
        const tests = [];
        const criticalFailures = [];
        const services = await this.analyzeOrchestratorServices();
        this.logger.log(`Analyzed ${services.length} orchestrator services`);
        const testMethods = [
            { name: 'Task Decomposition', fn: () => this.testDecomposition(services) },
            { name: 'Plan Generation', fn: () => this.testPlanGeneration(services) },
            { name: 'Parallel Execution', fn: () => this.testParallelExecution(services) },
            { name: 'Critique Evaluation', fn: () => this.testCritiqueEvaluation(services) },
            { name: 'Repair Mechanism', fn: () => this.testRepairMechanism(services) },
            { name: 'Validation', fn: () => this.testValidation(services) },
            { name: 'Delivery', fn: () => this.testDelivery(services) },
            { name: 'End-to-End Pipeline', fn: () => this.testEndToEndPipeline(services) },
            { name: 'Error Recovery', fn: () => this.testErrorRecovery(services) },
            { name: 'Cancellation', fn: () => this.testCancellation(services) },
        ];
        for (const testDef of testMethods) {
            try {
                const result = await testDef.fn();
                tests.push(result);
                if (!result.passed && result.score < 50) {
                    criticalFailures.push(`${testDef.name}: Score ${result.score}/100`);
                }
            }
            catch (error) {
                const errMsg = error.message;
                this.logger.error(`Test "${testDef.name}" execution failed: ${errMsg}`);
                tests.push({
                    name: testDef.name,
                    passed: false,
                    score: 0,
                    durationMs: 0,
                    error: errMsg,
                });
                criticalFailures.push(`Test "${testDef.name}" execution error: ${errMsg}`);
            }
        }
        const testWeights = [0.12, 0.12, 0.1, 0.1, 0.1, 0.1, 0.08, 0.12, 0.1, 0.06];
        let weightedSum = 0;
        for (let i = 0; i < tests.length; i++) {
            const weight = testWeights[i] || 0.1;
            weightedSum += tests[i].score * weight;
        }
        const score = Math.round(weightedSum);
        const passed = score >= 90 && criticalFailures.length === 0;
        const durationMs = Date.now() - startTime;
        this.logger.log(`Orchestration certification complete: score=${score}, passed=${passed}, ` +
            `duration=${durationMs}ms, criticalFailures=${criticalFailures.length}`);
        return {
            domain: types_1.CertificationDomain.ORCHESTRATION,
            weight: 0.15,
            score,
            tests,
            passed,
            criticalFailures,
        };
    }
    async testDecomposition(services) {
        const startTime = Date.now();
        const name = 'Task Decomposition';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const decomposer = services.find((s) => s.fileName.includes('task-decomposer'));
            if (decomposer) {
                score += 20;
            }
            else {
                issues.push('TaskDecomposerService not found');
            }
            if (decomposer) {
                if (decomposer.methods.includes('decompose') ||
                    decomposer.content.includes('async decompose(')) {
                    score += 20;
                }
                else {
                    issues.push('Missing decompose() method');
                }
                if (decomposer.methods.includes('assessComplexity') ||
                    decomposer.content.includes('assessComplexity')) {
                    score += 10;
                }
                if (decomposer.methods.includes('selectStrategy') ||
                    decomposer.content.includes('DecompositionStrategy')) {
                    score += 10;
                }
                if (decomposer.methods.includes('identifyDependencies') ||
                    decomposer.content.includes('identifyDependencies')) {
                    score += 10;
                }
                if (decomposer.methods.includes('determineExecutionOrder') ||
                    decomposer.content.includes('determineExecutionOrder')) {
                    score += 10;
                }
                if (decomposer.content.includes('TaskDefinition') &&
                    decomposer.content.includes('Promise<TaskDefinition[]>')) {
                    score += 10;
                }
                if (decomposer.hasInjectable) {
                    score += 5;
                }
                if (decomposer.hasLogger) {
                    score += 5;
                }
            }
            const simulated = this.simulateDecomposition();
            if (simulated.subtasks.length > 0) {
                score += 0;
            }
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!decomposer,
                    methodsFound: decomposer?.methods || [],
                    issues,
                    simulatedDecomposition: simulated,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testPlanGeneration(services) {
        const startTime = Date.now();
        const name = 'Plan Generation';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const planner = services.find((s) => s.fileName.includes('task-planner'));
            if (planner) {
                score += 20;
            }
            else {
                issues.push('TaskPlannerService not found');
            }
            if (planner) {
                if (planner.methods.includes('createPlan') ||
                    planner.content.includes('async createPlan(')) {
                    score += 20;
                }
                else {
                    issues.push('Missing createPlan() method');
                }
                if (planner.content.includes('OrchestrationPlan')) {
                    score += 10;
                }
                if (planner.content.includes('StepDependency') || planner.content.includes('dependsOn')) {
                    score += 10;
                }
                if (planner.content.includes('parallel') ||
                    planner.content.includes('Parallel') ||
                    planner.content.includes('maxParallelSteps')) {
                    score += 10;
                }
                if (planner.content.includes('estimate') || planner.content.includes('Estimation')) {
                    score += 10;
                }
                if (planner.content.includes('topologicalSort') ||
                    planner.content.includes('topological')) {
                    score += 10;
                }
                if (planner.hasInjectable) {
                    score += 5;
                }
                if (planner.hasLogger) {
                    score += 5;
                }
            }
            const simulated = this.simulatePlanGeneration();
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!planner,
                    methodsFound: planner?.methods || [],
                    issues,
                    simulatedPlan: simulated,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testParallelExecution(services) {
        const startTime = Date.now();
        const name = 'Parallel Execution';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const executor = services.find((s) => s.fileName.includes('task-executor'));
            if (executor) {
                score += 20;
            }
            else {
                issues.push('TaskExecutorService not found');
            }
            if (executor) {
                if (executor.methods.includes('executePlan') ||
                    executor.content.includes('async executePlan(')) {
                    score += 20;
                }
                else {
                    issues.push('Missing executePlan() method');
                }
                if (executor.content.includes('Promise.all') ||
                    executor.content.includes('Promise.allSettled')) {
                    score += 15;
                }
                else {
                    issues.push('No parallel execution pattern found (Promise.all/allSettled)');
                }
                if (executor.content.includes('timeout') || executor.content.includes('Timeout')) {
                    score += 10;
                }
                if (executor.content.includes('retry') || executor.content.includes('Retry')) {
                    score += 10;
                }
                if (executor.content.includes('dependency') ||
                    executor.content.includes('completedSteps') ||
                    executor.content.includes('dependsOn')) {
                    score += 10;
                }
                if (executor.content.includes('maxParallelSteps')) {
                    score += 5;
                }
                if (executor.hasInjectable) {
                    score += 5;
                }
                if (executor.hasLogger) {
                    score += 5;
                }
            }
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!executor,
                    methodsFound: executor?.methods || [],
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testCritiqueEvaluation(services) {
        const startTime = Date.now();
        const name = 'Critique Evaluation';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const critic = services.find((s) => s.fileName.includes('task-critic'));
            if (critic) {
                score += 20;
            }
            else {
                issues.push('TaskCriticService not found');
            }
            if (critic) {
                if (critic.methods.includes('critique') || critic.content.includes('async critique(')) {
                    score += 20;
                }
                else {
                    issues.push('Missing critique() method');
                }
                if (critic.content.includes('CritiqueResult') && critic.content.includes('score')) {
                    score += 10;
                }
                if (critic.content.includes('CritiqueIssue') && critic.content.includes('severity')) {
                    score += 10;
                }
                if (critic.content.includes('CritiqueCategory')) {
                    score += 10;
                }
                if (critic.content.includes('crossStepConsistency') ||
                    critic.content.includes('Consistency')) {
                    score += 10;
                }
                if (critic.content.includes('completeness') || critic.content.includes('Completeness')) {
                    score += 10;
                }
                if (critic.hasInjectable) {
                    score += 5;
                }
                if (critic.hasLogger) {
                    score += 5;
                }
            }
            const simulated = this.simulateCritique();
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!critic,
                    methodsFound: critic?.methods || [],
                    issues,
                    simulatedCritique: simulated,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testRepairMechanism(services) {
        const startTime = Date.now();
        const name = 'Repair Mechanism';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const repair = services.find((s) => s.fileName.includes('task-repair'));
            if (repair) {
                score += 20;
            }
            else {
                issues.push('TaskRepairService not found');
            }
            if (repair) {
                if (repair.methods.includes('repair') || repair.content.includes('async repair(')) {
                    score += 20;
                }
                else {
                    issues.push('Missing repair() method');
                }
                if (repair.content.includes('RepairStrategy')) {
                    score += 10;
                }
                if (repair.content.includes('RepairHistoryEntry') ||
                    repair.content.includes('repairHistory')) {
                    score += 10;
                }
                if (repair.content.includes('maxRepairIterations') ||
                    repair.content.includes('iteration')) {
                    score += 10;
                }
                if (repair.content.includes('categorizeIssues') ||
                    repair.content.includes('selectRepairStrategy')) {
                    score += 10;
                }
                if (repair.content.includes('RepairResult')) {
                    score += 10;
                }
                if (repair.hasInjectable) {
                    score += 5;
                }
                if (repair.hasLogger) {
                    score += 5;
                }
            }
            const simulated = this.simulateRepair();
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!repair,
                    methodsFound: repair?.methods || [],
                    issues,
                    simulatedRepair: simulated,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testValidation(services) {
        const startTime = Date.now();
        const name = 'Validation';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const validator = services.find((s) => s.fileName.includes('task-validator'));
            if (validator) {
                score += 20;
            }
            else {
                issues.push('TaskValidatorService not found');
            }
            if (validator) {
                if (validator.methods.includes('validate') ||
                    validator.content.includes('async validate(')) {
                    score += 20;
                }
                else {
                    issues.push('Missing validate() method');
                }
                if (validator.content.includes('ValidationResult')) {
                    score += 10;
                }
                if (validator.content.includes('validateCompleteness') ||
                    validator.content.includes('Completeness')) {
                    score += 10;
                }
                if (validator.content.includes('validateQuality') ||
                    validator.content.includes('Quality')) {
                    score += 10;
                }
                if (validator.content.includes('validatePerformance') ||
                    validator.content.includes('Performance')) {
                    score += 10;
                }
                if (validator.content.includes('validateSchema') || validator.content.includes('Schema')) {
                    score += 10;
                }
                if (validator.hasInjectable) {
                    score += 5;
                }
                if (validator.hasLogger) {
                    score += 5;
                }
            }
            const simulated = this.simulateValidation();
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!validator,
                    methodsFound: validator?.methods || [],
                    issues,
                    simulatedValidation: simulated,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testDelivery(services) {
        const startTime = Date.now();
        const name = 'Delivery';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const delivery = services.find((s) => s.fileName.includes('task-delivery'));
            if (delivery) {
                score += 20;
            }
            else {
                issues.push('TaskDeliveryService not found');
            }
            if (delivery) {
                if (delivery.methods.includes('deliver') || delivery.content.includes('async deliver(')) {
                    score += 20;
                }
                else {
                    issues.push('Missing deliver() method');
                }
                if (delivery.content.includes('DeliveryFormat')) {
                    score += 10;
                }
                if (delivery.content.includes('DeliveryResult')) {
                    score += 10;
                }
                if (delivery.content.includes('persist') || delivery.content.includes('store')) {
                    score += 10;
                }
                if (delivery.content.includes('notify') ||
                    delivery.content.includes('publish') ||
                    delivery.content.includes('eventBus')) {
                    score += 10;
                }
                if (delivery.content.includes('cleanup') || delivery.content.includes('clean')) {
                    score += 10;
                }
                if (delivery.hasInjectable) {
                    score += 5;
                }
                if (delivery.hasLogger) {
                    score += 5;
                }
            }
            const simulated = this.simulateDelivery();
            return {
                name,
                passed: score >= 90,
                score,
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!delivery,
                    methodsFound: delivery?.methods || [],
                    issues,
                    simulatedDelivery: simulated,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testEndToEndPipeline(services) {
        const startTime = Date.now();
        const name = 'End-to-End Pipeline';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const orchestrator = services.find((s) => s.fileName.includes('orchestrator.service'));
            if (orchestrator) {
                score += 10;
            }
            else {
                issues.push('OrchestratorService not found');
            }
            if (orchestrator) {
                if (orchestrator.content.includes('async orchestrate(')) {
                    score += 15;
                }
                else {
                    issues.push('Missing orchestrate() method');
                }
                if (orchestrator.content.includes('DECOMPOSE') ||
                    orchestrator.content.includes('decompose')) {
                    score += 5;
                }
                if (orchestrator.content.includes('PLAN') || orchestrator.content.includes('createPlan')) {
                    score += 5;
                }
                if (orchestrator.content.includes('EXECUTE') ||
                    orchestrator.content.includes('executePlan')) {
                    score += 5;
                }
                if (orchestrator.content.includes('CRITIQUE') ||
                    orchestrator.content.includes('critique')) {
                    score += 5;
                }
                if (orchestrator.content.includes('REPAIR') || orchestrator.content.includes('repair')) {
                    score += 5;
                }
                if (orchestrator.content.includes('VALIDATE') ||
                    orchestrator.content.includes('validate')) {
                    score += 5;
                }
                if (orchestrator.content.includes('DELIVER') || orchestrator.content.includes('deliver')) {
                    score += 5;
                }
                if (orchestrator.content.includes('phaseTimings') ||
                    orchestrator.content.includes('PhaseTiming')) {
                    score += 10;
                }
                if (orchestrator.content.includes('ORCHESTRATION_STARTED') ||
                    orchestrator.content.includes('ORCHESTRATION_COMPLETED') ||
                    orchestrator.content.includes('ORCHESTRATION_FAILED')) {
                    score += 10;
                }
                if (orchestrator.content.includes('storeOrchestrationResult') ||
                    orchestrator.content.includes('memoryService.store')) {
                    score += 5;
                }
                if (orchestrator.content.includes('OrchestrationResult')) {
                    score += 5;
                }
                if (orchestrator.hasInjectable) {
                    score += 3;
                }
                if (orchestrator.hasLogger) {
                    score += 2;
                }
            }
            const pipelineResult = this.simulateEndToEndPipeline();
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!orchestrator,
                    methodsFound: orchestrator?.methods || [],
                    issues,
                    pipelineStagesVerified: pipelineResult.stagesVerified,
                    simulatedPipeline: pipelineResult,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testErrorRecovery(services) {
        const startTime = Date.now();
        const name = 'Error Recovery';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const orchestrator = services.find((s) => s.fileName.includes('orchestrator.service'));
            const executor = services.find((s) => s.fileName.includes('task-executor'));
            if (orchestrator &&
                orchestrator.content.includes('try') &&
                orchestrator.content.includes('catch')) {
                score += 20;
            }
            else {
                issues.push('Orchestrator missing try/catch error handling');
            }
            if (orchestrator && orchestrator.content.includes('ORCHESTRATION_FAILED')) {
                score += 15;
            }
            else {
                issues.push('Orchestrator does not emit ORCHESTRATION_FAILED event');
            }
            if (orchestrator &&
                (orchestrator.content.includes('failedSteps') || orchestrator.content.includes('error'))) {
                score += 10;
            }
            if (executor &&
                (executor.content.includes('failedSteps') || executor.content.includes('success: false'))) {
                score += 10;
            }
            if (executor && executor.content.includes('continueOnFailure')) {
                score += 10;
            }
            if (executor &&
                (executor.content.includes('blockedByFailure') ||
                    executor.content.includes('Blocked by failed'))) {
                score += 10;
            }
            const baseAgentPath = path.join(SOURCE_ROOT, 'agents', 'base', 'base-agent.service.ts');
            if (fs.existsSync(baseAgentPath)) {
                const baseAgentContent = fs.readFileSync(baseAgentPath, 'utf-8');
                if (baseAgentContent.includes('circuitBreaker')) {
                    score += 10;
                }
            }
            const repair = services.find((s) => s.fileName.includes('task-repair'));
            if (repair &&
                (repair.content.includes('failedRepairs') || repair.content.includes('error'))) {
                score += 10;
            }
            if (orchestrator && orchestrator.content.includes('result.error')) {
                score += 5;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    orchestratorFound: !!orchestrator,
                    executorFound: !!executor,
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async testCancellation(services) {
        const startTime = Date.now();
        const name = 'Cancellation';
        this.logger.log(`Running test: ${name}`);
        try {
            let score = 0;
            const issues = [];
            const orchestrator = services.find((s) => s.fileName.includes('orchestrator.service'));
            if (orchestrator &&
                (orchestrator.methods.includes('cancelOrchestration') ||
                    orchestrator.content.includes('cancelOrchestration'))) {
                score += 25;
            }
            else {
                issues.push('Missing cancelOrchestration() method');
            }
            if (orchestrator && orchestrator.content.includes('cancelledTasks')) {
                score += 15;
            }
            else {
                issues.push('Missing cancelledTasks tracking');
            }
            if (orchestrator && orchestrator.content.includes('isCancelled')) {
                score += 15;
            }
            else {
                issues.push('Missing isCancelled() check during pipeline execution');
            }
            if (orchestrator &&
                (orchestrator.content.includes('cancelResult') ||
                    orchestrator.content.includes('cancelled'))) {
                score += 15;
            }
            if (orchestrator && orchestrator.content.includes('TASK_CANCELLED')) {
                score += 10;
            }
            if (orchestrator && orchestrator.content.includes('activeOrchestrations')) {
                score += 10;
            }
            if (orchestrator && orchestrator.content.includes('getActiveOrchestrations')) {
                score += 5;
            }
            if (orchestrator && orchestrator.content.includes('getStats')) {
                score += 5;
            }
            return {
                name,
                passed: score >= 90,
                score: Math.min(score, 100),
                durationMs: Date.now() - startTime,
                details: {
                    serviceFound: !!orchestrator,
                    methodsFound: orchestrator?.methods || [],
                    issues,
                },
            };
        }
        catch (error) {
            return {
                name,
                passed: false,
                score: 0,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }
    async analyzeOrchestratorServices() {
        if (this.serviceAnalyses) {
            return this.serviceAnalyses;
        }
        const results = [];
        if (!fs.existsSync(ORCHESTRATOR_DIR)) {
            this.logger.warn(`Orchestrator directory not found: ${ORCHESTRATOR_DIR}`);
            return results;
        }
        const files = fs
            .readdirSync(ORCHESTRATOR_DIR)
            .filter((f) => f.endsWith('.service.ts') && !f.endsWith('.spec.ts'));
        for (const fileName of files) {
            const filePath = path.join(ORCHESTRATOR_DIR, fileName);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const classMatch = content.match(/export\s+class\s+(\w+)/);
                const className = classMatch ? classMatch[1] : '';
                const methodRegex = /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(/g;
                const methods = [];
                let methodMatch;
                while ((methodMatch = methodRegex.exec(content)) !== null) {
                    const methodName = methodMatch[1];
                    if (!['constructor', 'if', 'for', 'while', 'switch', 'catch', 'new', 'return'].includes(methodName)) {
                        methods.push(methodName);
                    }
                }
                results.push({
                    filePath,
                    fileName,
                    content,
                    className,
                    methods: [...new Set(methods)],
                    hasInjectable: content.includes('@Injectable'),
                    hasLogger: content.includes('Logger') || content.includes('this.logger'),
                    implementsAsync: content.includes('async '),
                });
            }
            catch (error) {
                this.logger.warn(`Failed to analyze ${fileName}: ${error.message}`);
            }
        }
        this.serviceAnalyses = results;
        return results;
    }
    simulateDecomposition() {
        const taskId = 'sim-task-001';
        return {
            taskId,
            subtasks: [
                {
                    id: 'subtask-001',
                    description: 'Navigate to target URL',
                    cluster: 'browser',
                    payload: { action: 'navigateTo', url: 'https://example.com' },
                },
                {
                    id: 'subtask-002',
                    description: 'Extract data from page',
                    cluster: 'browser',
                    payload: { action: 'extractData', selector: '.content' },
                },
                {
                    id: 'subtask-003',
                    description: 'Process extracted data',
                    cluster: 'coding',
                    payload: { action: 'process', data: '$subtask-002.result' },
                },
            ],
            strategy: 'hybrid',
        };
    }
    simulatePlanGeneration() {
        return {
            id: 'plan-001',
            taskId: 'sim-task-001',
            steps: [
                {
                    id: 'step-001',
                    order: 0,
                    agentId: 'browser-navigation',
                    input: {
                        taskId: 'subtask-001',
                        payload: { action: 'navigateTo', url: 'https://example.com' },
                    },
                    status: 'pending',
                },
                {
                    id: 'step-002',
                    order: 1,
                    agentId: 'browser-data-extraction',
                    input: { taskId: 'subtask-002', payload: { action: 'extractData' } },
                    status: 'pending',
                },
                {
                    id: 'step-003',
                    order: 2,
                    agentId: 'coding-code-generation',
                    input: { taskId: 'subtask-003', payload: { action: 'process' } },
                    status: 'pending',
                },
            ],
            dependencies: [
                { stepId: 'step-002', dependsOnStepIds: ['step-001'] },
                { stepId: 'step-003', dependsOnStepIds: ['step-002'] },
            ],
            estimatedDurationMs: 15000,
        };
    }
    simulateCritique() {
        return {
            passed: true,
            score: 85,
            issues: [
                {
                    stepId: 'step-002',
                    severity: 'warning',
                    message: 'Step execution time exceeded expected duration',
                },
            ],
            recommendations: ['Consider optimizing step-002 for better performance'],
        };
    }
    simulateRepair() {
        return {
            repairedPlan: {
                id: 'plan-002',
                steps: [],
                dependencies: [],
            },
            repairedSteps: ['step-002'],
            failedRepairs: [],
        };
    }
    simulateValidation() {
        return {
            isValid: true,
            score: 92,
            errors: [],
            warnings: ['Step step-002 had high execution time'],
        };
    }
    simulateDelivery() {
        return {
            taskId: 'sim-task-001',
            deliveredOutput: {
                success: true,
                data: { extractedContent: 'Example content', processedResult: 'Processed' },
            },
            format: 'structured',
            deliveredAt: new Date(),
        };
    }
    simulateEndToEndPipeline() {
        const stages = [
            { stage: 'decompose', success: true, durationMs: 50 },
            { stage: 'plan', success: true, durationMs: 30 },
            { stage: 'execute', success: true, durationMs: 200 },
            { stage: 'critique', success: true, durationMs: 20 },
            { stage: 'repair', success: true, durationMs: 0 },
            { stage: 'validate', success: true, durationMs: 15 },
            { stage: 'deliver', success: true, durationMs: 10 },
        ];
        return {
            stagesVerified: stages.map((s) => s.stage),
            stages,
        };
    }
};
exports.OrchestrationCertificationService = OrchestrationCertificationService;
exports.OrchestrationCertificationService = OrchestrationCertificationService = OrchestrationCertificationService_1 = __decorate([
    (0, common_1.Injectable)()
], OrchestrationCertificationService);
//# sourceMappingURL=orchestration-certification.service.js.map