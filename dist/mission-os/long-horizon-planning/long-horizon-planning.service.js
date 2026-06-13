"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var LongHorizonPlanningService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LongHorizonPlanningService = exports.PlanStatus = exports.PlanningLevelType = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
var PlanningLevelType;
(function (PlanningLevelType) {
    PlanningLevelType["STRATEGIC"] = "strategic";
    PlanningLevelType["OPERATIONAL"] = "operational";
    PlanningLevelType["TACTICAL"] = "tactical";
    PlanningLevelType["EXECUTION"] = "execution";
})(PlanningLevelType || (exports.PlanningLevelType = PlanningLevelType = {}));
var PlanStatus;
(function (PlanStatus) {
    PlanStatus["DRAFT"] = "draft";
    PlanStatus["SIMULATING"] = "simulating";
    PlanStatus["READY"] = "ready";
    PlanStatus["IN_PROGRESS"] = "in_progress";
    PlanStatus["COMPLETED"] = "completed";
    PlanStatus["FAILED"] = "failed";
    PlanStatus["REVISED"] = "revised";
})(PlanStatus || (exports.PlanStatus = PlanStatus = {}));
const CONJUNCTION_MARKERS = [
    ' and ', ' then ', ' after ', ' followed by ', ' before ',
    ' while ', ' alongside ', ' once ', ' upon ',
];
const TEMPORAL_MARKERS = [
    'first', 'second', 'third', 'finally', 'lastly',
    'initially', 'subsequently', 'next', 'afterwards',
    'before', 'after', 'during', 'meanwhile',
];
const RESOURCE_BOUNDARIES = [
    'using', 'with', 'requiring', 'utilizing', 'via', 'through',
];
const DEFAULT_MAX_DEPTH = 4;
const DEFAULT_MONTE_CARLO_ITERATIONS = 1000;
const HISTORICAL_BASE_SUCCESS_RATE = 0.85;
const DURATION_VARIANCE_FACTOR = 0.25;
let LongHorizonPlanningService = LongHorizonPlanningService_1 = class LongHorizonPlanningService {
    constructor() {
        this.logger = new common_1.Logger(LongHorizonPlanningService_1.name);
        this.plans = new Map();
        this.objectiveIndex = new Map();
    }
    createPlan(missionId, missionDescription, config) {
        const maxDepth = config?.maxDepth ?? DEFAULT_MAX_DEPTH;
        const planId = (0, uuid_1.v4)();
        this.logger.log(`Creating plan ${planId} for mission ${missionId}`);
        const strategicObjectives = this.parseMissionToObjectives(missionDescription, 1);
        const strategicLevel = {
            level: 0,
            type: PlanningLevelType.STRATEGIC,
            name: 'Mission Strategy',
            description: `Top-level strategic plan for: ${missionDescription}`,
            objectives: strategicObjectives,
            subPlans: [],
            taskGraph: null,
            dependencies: [],
            estimatedDurationMs: config?.timeBudgetMs ?? this.estimateObjectiveDuration(strategicObjectives),
            status: PlanStatus.DRAFT,
        };
        const levels = [strategicLevel];
        for (let depth = 1; depth < maxDepth; depth++) {
            const parentLevel = levels[depth - 1];
            const levelType = this.getLevelTypeForDepth(depth);
            const levelName = this.getLevelNameForType(levelType);
            const levelObjectives = [];
            for (const parentObj of parentLevel.objectives) {
                const decomposed = this.decomposeObjective(parentObj, depth);
                levelObjectives.push(...decomposed);
            }
            if (levelObjectives.length === 0) {
                break;
            }
            const childLevel = {
                level: depth,
                type: levelType,
                name: levelName,
                description: `${levelName} level decomposition (depth ${depth})`,
                objectives: levelObjectives,
                subPlans: [],
                taskGraph: null,
                dependencies: this.inferCrossLevelDependencies(levelObjectives),
                estimatedDurationMs: this.estimateObjectiveDuration(levelObjectives),
                status: PlanStatus.DRAFT,
            };
            levels.push(childLevel);
        }
        const executionLevel = levels.find((l) => l.type === PlanningLevelType.EXECUTION);
        if (executionLevel) {
            executionLevel.taskGraph = this.buildTaskGraph(executionLevel.objectives);
        }
        const totalEstimatedDurationMs = this.calculateTotalDuration(levels);
        const resourceRequirements = this.estimateLevelResources(levels);
        const riskAssessment = this.assessLevelRisks(levels, resourceRequirements);
        const plan = {
            id: planId,
            missionId,
            levels,
            totalEstimatedDurationMs,
            resourceRequirements,
            riskAssessment,
            simulationResult: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: PlanStatus.DRAFT,
        };
        this.plans.set(planId, plan);
        this.rebuildObjectiveIndex(plan);
        this.logger.log(`Plan ${planId} created with ${levels.length} levels, ` +
            `${this.countTotalObjectives(plan)} total objectives`);
        return { ...plan };
    }
    decomposeObjective(objective, depth) {
        this.logger.debug?.(`Decomposing objective "${objective.description}" at depth ${depth}`);
        const description = objective.description;
        const subDescriptions = [];
        let parts = this.splitByMarkers(description, CONJUNCTION_MARKERS);
        if (parts.length <= 1) {
            parts = this.splitByMarkers(description, TEMPORAL_MARKERS.map((m) => ` ${m} `));
        }
        if (parts.length <= 1) {
            parts = this.splitByMarkers(description, RESOURCE_BOUNDARIES.map((m) => ` ${m} `));
        }
        if (parts.length <= 1) {
            parts = description.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        }
        subDescriptions.push(...parts.filter((s) => s.trim().length > 5));
        if (subDescriptions.length === 0) {
            subDescriptions.push(`Execute: ${description}`);
        }
        const subObjectives = subDescriptions.map((desc, index) => {
            const id = (0, uuid_1.v4)();
            return {
                id,
                description: desc.trim(),
                successCriteria: this.inferSuccessCriteria(desc),
                priority: Math.max(1, objective.priority - 1),
                assignedTo: [...objective.assignedTo],
                dependencies: index > 0 ? [subObjectives[index - 1]?.id ?? objective.id].filter(Boolean) : [],
                status: 'pending',
            };
        });
        if (subObjectives.length > 0 && subObjectives[0]) {
            subObjectives[0].dependencies = [objective.id];
        }
        return subObjectives;
    }
    addLevel(planId, level) {
        const plan = this.getPlanInternal(planId);
        if (!plan) {
            throw new Error(`Plan with id "${planId}" not found`);
        }
        const insertAt = level.level;
        level.level = insertAt;
        for (const existingLevel of plan.levels) {
            if (existingLevel.level >= insertAt) {
                existingLevel.level += 1;
            }
        }
        plan.levels.push(level);
        plan.levels.sort((a, b) => a.level - b.level);
        plan.totalEstimatedDurationMs = this.calculateTotalDuration(plan.levels);
        plan.updatedAt = new Date();
        this.rebuildObjectiveIndex(plan);
        this.logger.log(`Level "${level.name}" added to plan ${planId} at position ${insertAt}`);
    }
    refineLevel(planId, levelIndex) {
        const plan = this.getPlanInternal(planId);
        if (!plan) {
            throw new Error(`Plan with id "${planId}" not found`);
        }
        const level = plan.levels.find((l) => l.level === levelIndex);
        if (!level) {
            throw new Error(`Level ${levelIndex} not found in plan ${planId}`);
        }
        this.logger.log(`Refining level ${levelIndex} ("${level.name}") of plan ${planId}`);
        for (const objective of level.objectives) {
            if (objective.status === 'completed') {
                continue;
            }
            const subPlanId = (0, uuid_1.v4)();
            const subObjectives = this.decomposeObjective(objective, levelIndex + 1);
            const subPlan = {
                id: subPlanId,
                missionId: plan.missionId,
                levels: [
                    {
                        level: 0,
                        type: level.type,
                        name: `Sub-plan for: ${objective.description.substring(0, 50)}`,
                        description: objective.description,
                        objectives: subObjectives,
                        subPlans: [],
                        taskGraph: this.buildTaskGraph(subObjectives),
                        dependencies: objective.dependencies,
                        estimatedDurationMs: this.estimateObjectiveDuration(subObjectives),
                        status: PlanStatus.DRAFT,
                    },
                ],
                totalEstimatedDurationMs: this.estimateObjectiveDuration(subObjectives),
                resourceRequirements: this.estimateLevelResources([{ objectives: subObjectives }]),
                riskAssessment: {
                    overallRisk: 0.3,
                    risks: [],
                    mitigations: [],
                },
                simulationResult: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: PlanStatus.DRAFT,
            };
            this.plans.set(subPlanId, subPlan);
            level.subPlans.push(subPlan);
        }
        level.estimatedDurationMs = this.calculateLevelDuration(level);
        plan.totalEstimatedDurationMs = this.calculateTotalDuration(plan.levels);
        plan.resourceRequirements = this.estimateLevelResources(plan.levels);
        plan.riskAssessment = this.assessLevelRisks(plan.levels, plan.resourceRequirements);
        plan.updatedAt = new Date();
        this.rebuildObjectiveIndex(plan);
        return { ...level };
    }
    buildExecutionOrder(planId) {
        const plan = this.getPlanInternal(planId);
        if (!plan) {
            throw new Error(`Plan with id "${planId}" not found`);
        }
        const allObjectives = [];
        for (const level of plan.levels) {
            for (const obj of level.objectives) {
                allObjectives.push({ objective: obj, levelIndex: level.level });
            }
        }
        for (const level of plan.levels) {
            for (const subPlan of level.subPlans) {
                for (const subLevel of subPlan.levels) {
                    for (const obj of subLevel.objectives) {
                        allObjectives.push({ objective: obj, levelIndex: level.level });
                    }
                }
            }
        }
        const objMap = new Map();
        for (const entry of allObjectives) {
            objMap.set(entry.objective.id, entry);
        }
        const inDegree = new Map();
        const dependents = new Map();
        for (const entry of allObjectives) {
            const id = entry.objective.id;
            if (!inDegree.has(id)) {
                inDegree.set(id, 0);
            }
            if (!dependents.has(id)) {
                dependents.set(id, []);
            }
            for (const depId of entry.objective.dependencies) {
                if (objMap.has(depId)) {
                    inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
                    if (!dependents.has(depId)) {
                        dependents.set(depId, []);
                    }
                    dependents.get(depId).push(id);
                }
            }
        }
        const batches = [];
        const processed = new Set();
        let remaining = allObjectives.length;
        while (remaining > 0) {
            const readyIds = [];
            for (const [id, degree] of inDegree) {
                if (degree === 0 && !processed.has(id)) {
                    readyIds.push(id);
                }
            }
            if (readyIds.length === 0) {
                let minDegree = Infinity;
                let minId = null;
                for (const [id, degree] of inDegree) {
                    if (!processed.has(id) && degree < minDegree) {
                        minDegree = degree;
                        minId = id;
                    }
                }
                if (minId) {
                    this.logger.warn(`Circular dependency detected in plan ${planId}; breaking at objective ${minId}`);
                    readyIds.push(minId);
                }
                else {
                    break;
                }
            }
            const batch = {
                batchIndex: batches.length,
                objectiveIds: [],
                levelIndices: [],
                estimatedDurationMs: 0,
                parallel: readyIds.length > 1,
            };
            for (const id of readyIds) {
                processed.add(id);
                remaining--;
                const entry = objMap.get(id);
                if (entry) {
                    batch.objectiveIds.push(id);
                    batch.levelIndices.push(entry.levelIndex);
                    batch.estimatedDurationMs += entry.objective.priority;
                }
                const deps = dependents.get(id) ?? [];
                for (const depId of deps) {
                    inDegree.set(depId, Math.max(0, (inDegree.get(depId) ?? 1) - 1));
                }
            }
            if (batch.objectiveIds.length > 0) {
                let maxDuration = 0;
                for (const id of batch.objectiveIds) {
                    const entry = objMap.get(id);
                    if (entry) {
                        const estDuration = this.estimateSingleObjectiveDuration(entry.objective);
                        maxDuration = Math.max(maxDuration, estDuration);
                    }
                }
                batch.estimatedDurationMs = maxDuration;
            }
            batches.push(batch);
        }
        this.logger.log(`Built execution order for plan ${planId}: ${batches.length} batches, ` +
            `${allObjectives.length} total objectives`);
        return batches;
    }
    estimateResources(planId) {
        const plan = this.getPlanInternal(planId);
        if (!plan) {
            throw new Error(`Plan with id "${planId}" not found`);
        }
        const allResources = this.estimateLevelResources(plan.levels);
        for (const level of plan.levels) {
            for (const subPlan of level.subPlans) {
                const subResources = this.estimateLevelResources(subPlan.levels);
                allResources.push(...subResources);
            }
        }
        const merged = this.mergeResourceRequirements(allResources);
        const conflicts = this.detectResourceConflicts(merged);
        if (conflicts.length > 0) {
            this.logger.warn(`Resource conflicts detected in plan ${planId}: ${conflicts.join('; ')}`);
        }
        plan.resourceRequirements = merged;
        plan.updatedAt = new Date();
        return merged;
    }
    assessRisks(planId) {
        const plan = this.getPlanInternal(planId);
        if (!plan) {
            throw new Error(`Plan with id "${planId}" not found`);
        }
        const risks = [];
        const mitigations = [];
        const executionBatches = this.buildExecutionOrder(planId);
        if (executionBatches.length > 8) {
            risks.push({
                description: `Deep dependency chain: ${executionBatches.length} sequential batches`,
                probability: 0.4 + (executionBatches.length - 8) * 0.05,
                impact: 0.7,
                mitigation: 'Introduce checkpointing and intermediate validation to allow partial recovery',
            });
            mitigations.push('Add checkpoint validation between dependency chains');
        }
        const resourceConflicts = this.detectResourceConflicts(plan.resourceRequirements);
        for (const conflict of resourceConflicts) {
            risks.push({
                description: `Resource conflict: ${conflict}`,
                probability: 0.6,
                impact: 0.5,
                mitigation: 'Stagger execution or provision additional resource capacity',
            });
        }
        if (resourceConflicts.length > 0) {
            mitigations.push('Implement resource scheduling with time-slicing to avoid conflicts');
        }
        const criticalPathLength = this.calculateCriticalPathLength(plan);
        if (criticalPathLength > plan.totalEstimatedDurationMs * 0.7) {
            risks.push({
                description: `Critical path too long: ${criticalPathLength}ms / ${plan.totalEstimatedDurationMs}ms total`,
                probability: 0.5,
                impact: 0.8,
                mitigation: 'Identify tasks on critical path that can be parallelized or optimized',
            });
            mitigations.push('Optimize critical path tasks by reducing scope or adding resources');
        }
        for (const level of plan.levels) {
            const failedCount = level.objectives.filter((o) => o.status === 'failed').length;
            const pendingCount = level.objectives.filter((o) => o.status === 'pending').length;
            const totalCount = level.objectives.length;
            if (failedCount > 0) {
                risks.push({
                    description: `${failedCount} failed objectives at ${level.type} level "${level.name}"`,
                    probability: 0.7,
                    impact: 0.8,
                    mitigation: 'Re-decompose failed objectives into alternative sub-tasks',
                });
            }
            if (pendingCount > totalCount * 0.8 && plan.status === PlanStatus.IN_PROGRESS) {
                risks.push({
                    description: `Low progress at ${level.type} level "${level.name}": ${pendingCount}/${totalCount} still pending`,
                    probability: 0.4,
                    impact: 0.6,
                    mitigation: 'Review and unblock pending objectives',
                });
            }
            if (level.dependencies.length > 3) {
                risks.push({
                    description: `High cross-level dependency count (${level.dependencies.length}) at level "${level.name}"`,
                    probability: 0.35,
                    impact: 0.5,
                    mitigation: 'Reduce dependencies by making sub-plans more self-contained',
                });
            }
        }
        const agentLoad = new Map();
        for (const level of plan.levels) {
            for (const obj of level.objectives) {
                for (const agentId of obj.assignedTo) {
                    agentLoad.set(agentId, (agentLoad.get(agentId) ?? 0) + 1);
                }
            }
        }
        for (const [agentId, load] of agentLoad) {
            if (load > 5) {
                risks.push({
                    description: `Agent ${agentId} is overloaded with ${load} objectives`,
                    probability: 0.5,
                    impact: 0.6,
                    mitigation: `Redistribute ${agentId}'s objectives to other available agents`,
                });
                mitigations.push(`Rebalance workload for agent ${agentId}`);
            }
        }
        const overallRisk = risks.length > 0
            ? Math.min(1, risks.reduce((sum, r) => sum + r.probability * r.impact, 0) / Math.max(1, risks.length))
            : 0.1;
        const assessment = {
            overallRisk,
            risks,
            mitigations: [...new Set(mitigations)],
        };
        plan.riskAssessment = assessment;
        plan.updatedAt = new Date();
        this.logger.log(`Risk assessment for plan ${planId}: overallRisk=${overallRisk.toFixed(3)}, ${risks.length} risks identified`);
        return assessment;
    }
    simulateExecution(planId) {
        const plan = this.getPlanInternal(planId);
        if (!plan) {
            throw new Error(`Plan with id "${planId}" not found`);
        }
        const previousStatus = plan.status;
        plan.status = PlanStatus.SIMULATING;
        plan.updatedAt = new Date();
        const iterations = 1000;
        const completionTimes = [];
        const completionCosts = [];
        const successCount = { value: 0 };
        const bottleneckFrequency = new Map();
        for (let i = 0; i < iterations; i++) {
            let totalTime = 0;
            let totalCost = 0;
            let planSucceeded = true;
            let currentBottleneck = null;
            for (const level of plan.levels) {
                let levelTime = 0;
                let levelFailed = false;
                for (const objective of level.objectives) {
                    const complexityFactor = Math.max(0.5, 1 - objective.description.length / 500);
                    const depthFactor = Math.max(0.6, 1 - level.level * 0.1);
                    const successProb = HISTORICAL_BASE_SUCCESS_RATE * complexityFactor * depthFactor;
                    if (Math.random() > successProb) {
                        levelFailed = true;
                        currentBottleneck = objective.id;
                        const estimatedDuration = this.estimateSingleObjectiveDuration(objective);
                        const failurePoint = 0.3 + Math.random() * 0.5;
                        levelTime += estimatedDuration * failurePoint;
                        if (Math.random() < 0.5) {
                            levelTime += estimatedDuration * 0.3;
                        }
                        else {
                            planSucceeded = false;
                        }
                    }
                    else {
                        const baseDuration = this.estimateSingleObjectiveDuration(objective);
                        const variance = baseDuration * DURATION_VARIANCE_FACTOR;
                        const actualDuration = baseDuration + (Math.random() - 0.5) * 2 * variance;
                        levelTime += Math.max(baseDuration * 0.5, actualDuration);
                    }
                    totalCost += this.estimateSingleObjectiveCost(objective);
                }
                const parallelism = level.taskGraph?.parallelismFactor ?? Math.max(1, level.objectives.length / 3);
                levelTime = levelTime / parallelism;
                totalTime += levelTime;
                if (levelFailed && currentBottleneck) {
                    bottleneckFrequency.set(currentBottleneck, (bottleneckFrequency.get(currentBottleneck) ?? 0) + 1);
                }
            }
            completionTimes.push(totalTime);
            completionCosts.push(totalCost);
            if (planSucceeded) {
                successCount.value++;
            }
        }
        completionTimes.sort((a, b) => a - b);
        completionCosts.sort((a, b) => a - b);
        const p50Time = completionTimes[Math.floor(iterations * 0.5)];
        const p90Time = completionTimes[Math.floor(iterations * 0.9)];
        const p50Cost = completionCosts[Math.floor(iterations * 0.5)];
        const bottlenecks = Array.from(bottleneckFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id, count]) => {
            for (const level of plan.levels) {
                const obj = level.objectives.find((o) => o.id === id);
                if (obj) {
                    return `${obj.description} (failed ${count}/${iterations} times)`;
                }
            }
            return `Objective ${id} (failed ${count}/${iterations} times)`;
        });
        const resourceConflicts = this.detectResourceConflicts(plan.resourceRequirements);
        const snapshot = {
            estimatedSuccessRate: successCount.value / iterations,
            estimatedDurationMs: p50Time,
            estimatedCost: p50Cost,
            bottlenecks,
            resourceConflicts,
        };
        plan.simulationResult = snapshot;
        plan.status = previousStatus === PlanStatus.SIMULATING ? PlanStatus.READY : previousStatus;
        plan.totalEstimatedDurationMs = p90Time;
        plan.updatedAt = new Date();
        this.logger.log(`Simulation complete for plan ${planId}: ` +
            `successRate=${snapshot.estimatedSuccessRate.toFixed(3)}, ` +
            `P50=${p50Time}ms, P90=${p90Time}ms, ` +
            `bottlenecks=${bottlenecks.length}`);
        return snapshot;
    }
    revisePlan(planId, feedback) {
        const plan = this.getPlanInternal(planId);
        if (!plan) {
            throw new Error(`Plan with id "${planId}" not found`);
        }
        this.logger.log(`Revising plan ${planId} based on execution feedback`);
        for (const objId of feedback.completedObjectives ?? []) {
            this.updateObjectiveStatus(plan, objId, 'completed');
        }
        for (const objId of feedback.failedObjectives ?? []) {
            this.updateObjectiveStatus(plan, objId, 'failed');
            for (const level of plan.levels) {
                const failedObj = level.objectives.find((o) => o.id === objId);
                if (failedObj) {
                    const alternativeObjectives = this.decomposeObjective({
                        ...failedObj,
                        description: `Alternative approach: ${failedObj.description}`,
                        id: (0, uuid_1.v4)(),
                        status: 'pending',
                    }, level.level + 1);
                    const nextLevel = plan.levels.find((l) => l.level === level.level + 1);
                    if (nextLevel) {
                        nextLevel.objectives.push(...alternativeObjectives);
                    }
                    else {
                        const newLevel = {
                            level: level.level + 1,
                            type: this.getLevelTypeForDepth(level.level + 1),
                            name: `Revised decomposition (from failure of ${objId.substring(0, 8)})`,
                            description: `Alternative objectives generated from failure feedback`,
                            objectives: alternativeObjectives,
                            subPlans: [],
                            taskGraph: this.buildTaskGraph(alternativeObjectives),
                            dependencies: [objId],
                            estimatedDurationMs: this.estimateObjectiveDuration(alternativeObjectives),
                            status: PlanStatus.DRAFT,
                        };
                        plan.levels.push(newLevel);
                        plan.levels.sort((a, b) => a.level - b.level);
                    }
                }
            }
        }
        if (feedback.adjustedEstimates) {
            for (const [objId, adjustments] of Object.entries(feedback.adjustedEstimates)) {
                for (const level of plan.levels) {
                    const obj = level.objectives.find((o) => o.id === objId);
                    if (obj && adjustments.durationMs) {
                        this.logger.debug?.(`Adjusted estimate for objective ${objId}: ${adjustments.durationMs}ms`);
                    }
                }
            }
        }
        for (const issue of feedback.issues ?? []) {
            plan.riskAssessment.risks.push({
                description: issue,
                probability: 0.6,
                impact: 0.5,
                mitigation: 'Monitor and escalate if persists',
            });
        }
        plan.totalEstimatedDurationMs = this.calculateTotalDuration(plan.levels);
        plan.resourceRequirements = this.estimateLevelResources(plan.levels);
        plan.riskAssessment = this.assessLevelRisks(plan.levels, plan.resourceRequirements);
        plan.status = PlanStatus.REVISED;
        plan.updatedAt = new Date();
        this.rebuildObjectiveIndex(plan);
        this.logger.log(`Plan ${planId} revised: status=REVISED, ` +
            `${this.countTotalObjectives(plan)} objectives, ` +
            `${plan.riskAssessment.risks.length} risks`);
        return { ...plan };
    }
    getPlan(planId) {
        const plan = this.plans.get(planId);
        return plan ? { ...plan } : null;
    }
    getPlanStatus(planId) {
        const plan = this.getPlanInternal(planId);
        if (!plan) {
            throw new Error(`Plan with id "${planId}" not found`);
        }
        const levelSummaries = plan.levels.map((level) => {
            const total = level.objectives.length;
            const completed = level.objectives.filter((o) => o.status === 'completed').length;
            const failed = level.objectives.filter((o) => o.status === 'failed').length;
            return {
                level: level.level,
                type: level.type,
                name: level.name,
                status: level.status,
                totalObjectives: total,
                completedObjectives: completed,
                failedObjectives: failed,
                progress: total > 0 ? completed / total : 0,
            };
        });
        const totalObjectives = levelSummaries.reduce((s, l) => s + l.totalObjectives, 0);
        const totalCompleted = levelSummaries.reduce((s, l) => s + l.completedObjectives, 0);
        return {
            planId,
            overallStatus: plan.status,
            levelSummaries,
            overallProgress: totalObjectives > 0 ? totalCompleted / totalObjectives : 0,
        };
    }
    getExecutionTimeline(planId) {
        const plan = this.getPlanInternal(planId);
        if (!plan) {
            throw new Error(`Plan with id "${planId}" not found`);
        }
        const batches = this.buildExecutionOrder(planId);
        const timeline = [];
        let currentOffset = 0;
        const objLevelMap = new Map();
        for (const level of plan.levels) {
            for (const obj of level.objectives) {
                objLevelMap.set(obj.id, level.type);
            }
        }
        for (const batch of batches) {
            let maxBatchDuration = 0;
            for (const objId of batch.objectiveIds) {
                let objective = null;
                for (const level of plan.levels) {
                    const found = level.objectives.find((o) => o.id === objId);
                    if (found) {
                        objective = found;
                        break;
                    }
                }
                if (objective) {
                    const duration = this.estimateSingleObjectiveDuration(objective);
                    maxBatchDuration = Math.max(maxBatchDuration, duration);
                    timeline.push({
                        objectiveId: objId,
                        description: objective.description,
                        levelType: objLevelMap.get(objId) ?? PlanningLevelType.EXECUTION,
                        startOffsetMs: currentOffset,
                        durationMs: duration,
                        dependencies: objective.dependencies,
                        status: objective.status,
                    });
                }
            }
            currentOffset += maxBatchDuration;
        }
        return timeline;
    }
    fusion(planId, partialResults) {
        const plan = this.getPlanInternal(planId);
        if (!plan) {
            throw new Error(`Plan with id "${planId}" not found`);
        }
        this.logger.log(`Fusing ${partialResults.size} partial results for plan ${planId}`);
        const mergedObjectives = [];
        const conflicts = [];
        for (const level of plan.levels) {
            for (const objective of level.objectives) {
                const result = partialResults.get(objective.id);
                if (result) {
                    objective.status = result.status;
                }
                mergedObjectives.push({ ...objective });
            }
        }
        for (const level of plan.levels) {
            for (const subPlan of level.subPlans) {
                for (const subLevel of subPlan.levels) {
                    for (const objective of subLevel.objectives) {
                        const result = partialResults.get(objective.id);
                        if (result) {
                            objective.status = result.status;
                        }
                    }
                }
            }
        }
        const completedByDescription = new Map();
        for (const obj of mergedObjectives) {
            const key = this.canonicalizeDescription(obj.description);
            if (!completedByDescription.has(key)) {
                completedByDescription.set(key, []);
            }
            completedByDescription.get(key).push(obj.id);
        }
        for (const [description, objIds] of completedByDescription) {
            if (objIds.length > 1) {
                const statuses = objIds
                    .map((id) => mergedObjectives.find((o) => o.id === id)?.status)
                    .filter(Boolean);
                const uniqueStatuses = new Set(statuses);
                if (uniqueStatuses.size > 1) {
                    const resolution = this.resolveConflict(objIds, mergedObjectives);
                    conflicts.push({
                        objectiveIds: objIds,
                        description: `Conflicting outcomes for: ${description}`,
                        resolution,
                    });
                }
            }
        }
        const agentAssignments = new Map();
        for (const obj of mergedObjectives) {
            for (const agentId of obj.assignedTo) {
                if (!agentAssignments.has(agentId)) {
                    agentAssignments.set(agentId, []);
                }
                agentAssignments.get(agentId).push(obj);
            }
        }
        for (const [agentId, objectives] of agentAssignments) {
            const inProgressObjs = objectives.filter((o) => o.status === 'in_progress');
            if (inProgressObjs.length > 1) {
                conflicts.push({
                    objectiveIds: inProgressObjs.map((o) => o.id),
                    description: `Agent ${agentId} has ${inProgressObjs.length} objectives in progress simultaneously`,
                    resolution: `Prioritize by objective priority; pause lower-priority objectives`,
                });
            }
        }
        const totalCompleted = mergedObjectives.filter((o) => o.status === 'completed').length;
        const totalFailed = mergedObjectives.filter((o) => o.status === 'failed').length;
        const totalPending = mergedObjectives.filter((o) => o.status === 'pending').length;
        const totalObjectives = mergedObjectives.length;
        const successRate = totalObjectives > 0 ? totalCompleted / totalObjectives : 0;
        let estimatedRemainingMs = 0;
        for (const obj of mergedObjectives) {
            if (obj.status === 'pending' || obj.status === 'in_progress') {
                estimatedRemainingMs += this.estimateSingleObjectiveDuration(obj);
            }
        }
        let unifiedStatus;
        if (totalFailed > totalObjectives * 0.5) {
            unifiedStatus = PlanStatus.FAILED;
        }
        else if (totalCompleted === totalObjectives) {
            unifiedStatus = PlanStatus.COMPLETED;
        }
        else if (totalCompleted > 0 || partialResults.size > 0) {
            unifiedStatus = PlanStatus.IN_PROGRESS;
        }
        else {
            unifiedStatus = plan.status;
        }
        plan.status = unifiedStatus;
        plan.updatedAt = new Date();
        const result = {
            planId,
            mergedObjectives,
            conflicts,
            unifiedStatus,
            aggregatedMetrics: {
                totalCompleted,
                totalFailed,
                totalPending,
                successRate,
                estimatedRemainingMs,
            },
        };
        this.logger.log(`Fusion complete for plan ${planId}: ` +
            `${totalCompleted}/${totalObjectives} completed, ` +
            `${totalFailed} failed, ${conflicts.length} conflicts, ` +
            `status=${unifiedStatus}`);
        return result;
    }
    getPlanInternal(planId) {
        return this.plans.get(planId);
    }
    parseMissionToObjectives(description, priority) {
        const sentences = description
            .split(/[.!?\n]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 5);
        if (sentences.length === 0) {
            sentences.push(description);
        }
        return sentences.map((sentence, index) => ({
            id: (0, uuid_1.v4)(),
            description: sentence,
            successCriteria: this.inferSuccessCriteria(sentence),
            priority: Math.max(1, priority - Math.floor(index / 3)),
            assignedTo: [],
            dependencies: index > 0 ? [sentences.length > 1 ? 'prev' : ''].filter(Boolean) : [],
            status: 'pending',
        }));
    }
    inferSuccessCriteria(description) {
        const criteria = [];
        const numberMatches = description.match(/\d+(\.\d+)?%?/g);
        if (numberMatches) {
            for (const match of numberMatches) {
                criteria.push(`Target metric: ${match}`);
            }
        }
        const actionVerbs = [
            'create', 'build', 'deploy', 'implement', 'design', 'test',
            'verify', 'validate', 'optimize', 'migrate', 'configure',
        ];
        for (const verb of actionVerbs) {
            if (description.toLowerCase().includes(verb)) {
                criteria.push(`${verb} completed successfully`);
            }
        }
        if (criteria.length === 0) {
            criteria.push('Objective completed without errors');
        }
        return criteria;
    }
    splitByMarkers(description, markers) {
        let parts = [description];
        for (const marker of markers) {
            const newParts = [];
            for (const part of parts) {
                const splits = part.split(marker);
                if (splits.length > 1) {
                    newParts.push(...splits);
                }
                else {
                    newParts.push(part);
                }
            }
            parts = newParts;
            if (parts.length > 4)
                break;
        }
        return parts.map((p) => p.trim()).filter((p) => p.length > 0);
    }
    getLevelTypeForDepth(depth) {
        switch (depth) {
            case 0:
                return PlanningLevelType.STRATEGIC;
            case 1:
                return PlanningLevelType.OPERATIONAL;
            case 2:
                return PlanningLevelType.TACTICAL;
            default:
                return PlanningLevelType.EXECUTION;
        }
    }
    getLevelNameForType(type) {
        switch (type) {
            case PlanningLevelType.STRATEGIC:
                return 'Strategic Planning';
            case PlanningLevelType.OPERATIONAL:
                return 'Operational Planning';
            case PlanningLevelType.TACTICAL:
                return 'Tactical Planning';
            case PlanningLevelType.EXECUTION:
                return 'Execution Planning';
        }
    }
    inferCrossLevelDependencies(objectives) {
        const deps = [];
        for (const obj of objectives) {
            if (obj.dependencies.length > 0) {
                deps.push(...obj.dependencies);
            }
        }
        return [...new Set(deps)];
    }
    buildTaskGraph(objectives) {
        const nodes = objectives.map((o) => o.id);
        const edges = [];
        for (const obj of objectives) {
            for (const depId of obj.dependencies) {
                if (nodes.includes(depId)) {
                    edges.push({ from: depId, to: obj.id, type: 'dependency' });
                }
            }
        }
        const criticalPathLength = this.calculateGraphCriticalPath(nodes, edges);
        const maxDepth = this.calculateMaxDependencyDepth(objectives);
        const parallelismFactor = objectives.length > 0 ? Math.max(1, objectives.length / Math.max(1, maxDepth)) : 1;
        return {
            nodes,
            edges,
            criticalPathLength,
            parallelismFactor: Math.round(parallelismFactor * 100) / 100,
        };
    }
    calculateGraphCriticalPath(nodes, edges) {
        if (nodes.length === 0)
            return 0;
        const adj = new Map();
        for (const node of nodes) {
            adj.set(node, []);
        }
        for (const edge of edges) {
            adj.get(edge.from)?.push(edge.to);
        }
        const memo = new Map();
        const dfs = (node) => {
            if (memo.has(node))
                return memo.get(node);
            const neighbors = adj.get(node) ?? [];
            if (neighbors.length === 0) {
                memo.set(node, 1);
                return 1;
            }
            const maxLen = 1 + Math.max(...neighbors.map(dfs));
            memo.set(node, maxLen);
            return maxLen;
        };
        let maxPath = 0;
        for (const node of nodes) {
            maxPath = Math.max(maxPath, dfs(node));
        }
        return maxPath;
    }
    calculateMaxDependencyDepth(objectives) {
        const objMap = new Map();
        for (const obj of objectives) {
            objMap.set(obj.id, obj);
        }
        const depthCache = new Map();
        const getDepth = (obj) => {
            if (depthCache.has(obj.id))
                return depthCache.get(obj.id);
            if (obj.dependencies.length === 0) {
                depthCache.set(obj.id, 1);
                return 1;
            }
            let maxDep = 0;
            for (const depId of obj.dependencies) {
                const dep = objMap.get(depId);
                if (dep) {
                    maxDep = Math.max(maxDep, getDepth(dep));
                }
            }
            const depth = maxDep + 1;
            depthCache.set(obj.id, depth);
            return depth;
        };
        let maxDepth = 0;
        for (const obj of objectives) {
            maxDepth = Math.max(maxDepth, getDepth(obj));
        }
        return maxDepth;
    }
    estimateObjectiveDuration(objectives) {
        if (objectives.length === 0)
            return 0;
        const totalSerialDuration = objectives.reduce((sum, obj) => sum + this.estimateSingleObjectiveDuration(obj), 0);
        const maxDepth = this.calculateMaxDependencyDepth(objectives);
        const parallelism = Math.max(1, objectives.length / Math.max(1, maxDepth));
        return Math.round(totalSerialDuration / parallelism);
    }
    estimateSingleObjectiveDuration(objective) {
        const baseDuration = 5 * 60 * 1000;
        const descriptionLength = objective.description.length;
        const complexityMultiplier = 1 + Math.min(descriptionLength / 200, 3);
        const criteriaMultiplier = 1 + objective.successCriteria.length * 0.1;
        const priorityMultiplier = 1.2 - objective.priority * 0.05;
        return Math.round(baseDuration * complexityMultiplier * criteriaMultiplier * Math.max(0.5, priorityMultiplier));
    }
    estimateSingleObjectiveCost(objective) {
        const baseCost = 0.10;
        const complexityMultiplier = 1 + Math.min(objective.description.length / 300, 2);
        const criteriaMultiplier = 1 + objective.successCriteria.length * 0.05;
        return baseCost * complexityMultiplier * criteriaMultiplier;
    }
    calculateTotalDuration(levels) {
        return levels.reduce((sum, level) => {
            const subPlanDuration = level.subPlans.reduce((spSum, sp) => spSum + sp.totalEstimatedDurationMs, 0);
            return sum + Math.max(level.estimatedDurationMs, subPlanDuration);
        }, 0);
    }
    calculateLevelDuration(level) {
        const subPlanDuration = level.subPlans.reduce((sum, sp) => sum + sp.totalEstimatedDurationMs, 0);
        return Math.max(level.estimatedDurationMs, subPlanDuration);
    }
    estimateLevelResources(levels) {
        const resources = [];
        let timeOffset = 0;
        for (const level of levels) {
            const objectiveCount = level.objectives.length;
            if (objectiveCount === 0)
                continue;
            const levelDuration = level.estimatedDurationMs;
            resources.push({
                type: 'llm_compute',
                amount: objectiveCount * 2,
                unit: 'api_calls',
                estimatedCost: objectiveCount * 0.05,
                timeWindow: { start: timeOffset, end: timeOffset + levelDuration },
            });
            resources.push({
                type: 'worker_time',
                amount: levelDuration / 1000 / 60,
                unit: 'minutes',
                estimatedCost: (levelDuration / 1000 / 60) * 0.01,
                timeWindow: { start: timeOffset, end: timeOffset + levelDuration },
            });
            if (objectiveCount > 3) {
                resources.push({
                    type: 'memory',
                    amount: objectiveCount * 256,
                    unit: 'MB',
                    estimatedCost: 0,
                    timeWindow: { start: timeOffset, end: timeOffset + levelDuration },
                });
            }
            for (const subPlan of level.subPlans) {
                const subResources = this.estimateLevelResources(subPlan.levels);
                for (const sr of subResources) {
                    sr.timeWindow.start += timeOffset;
                    sr.timeWindow.end += timeOffset;
                }
                resources.push(...subResources);
            }
            timeOffset += levelDuration;
        }
        return resources;
    }
    mergeResourceRequirements(resources) {
        const typeMap = new Map();
        for (const r of resources) {
            if (!typeMap.has(r.type)) {
                typeMap.set(r.type, []);
            }
            typeMap.get(r.type).push(r);
        }
        const merged = [];
        for (const [type, entries] of typeMap) {
            const sorted = [...entries].sort((a, b) => a.timeWindow.start - b.timeWindow.start);
            let current = { ...sorted[0] };
            for (let i = 1; i < sorted.length; i++) {
                const next = sorted[i];
                if (next.timeWindow.start <= current.timeWindow.end) {
                    current.amount += next.amount;
                    current.estimatedCost += next.estimatedCost;
                    current.timeWindow.end = Math.max(current.timeWindow.end, next.timeWindow.end);
                }
                else {
                    merged.push(current);
                    current = { ...next };
                }
            }
            merged.push(current);
        }
        return merged;
    }
    detectResourceConflicts(resources) {
        const conflicts = [];
        const typeGroups = new Map();
        for (const r of resources) {
            if (!typeGroups.has(r.type)) {
                typeGroups.set(r.type, []);
            }
            typeGroups.get(r.type).push(r);
        }
        for (const [type, entries] of typeGroups) {
            for (let i = 0; i < entries.length; i++) {
                for (let j = i + 1; j < entries.length; j++) {
                    const a = entries[i];
                    const b = entries[j];
                    if (a.timeWindow.start < b.timeWindow.end &&
                        b.timeWindow.start < a.timeWindow.end) {
                        conflicts.push(`${type}: needed during overlapping windows ` +
                            `[${a.timeWindow.start}-${a.timeWindow.end}] and ` +
                            `[${b.timeWindow.start}-${b.timeWindow.end}]`);
                    }
                }
            }
        }
        return conflicts;
    }
    assessLevelRisks(levels, resources) {
        const risks = [];
        const mitigations = [];
        for (const level of levels) {
            if (level.objectives.length === 0) {
                risks.push({
                    description: `Level "${level.name}" has no objectives`,
                    probability: 0.9,
                    impact: 0.3,
                    mitigation: 'Populate objectives or remove empty level',
                });
            }
        }
        const conflicts = this.detectResourceConflicts(resources);
        if (conflicts.length > 0) {
            risks.push({
                description: `${conflicts.length} resource conflicts detected`,
                probability: 0.5,
                impact: 0.6,
                mitigation: 'Resolve resource scheduling conflicts before execution',
            });
            mitigations.push('Implement time-sliced resource allocation');
        }
        if (risks.length === 0) {
            risks.push({
                description: 'Standard execution variance',
                probability: 0.2,
                impact: 0.2,
                mitigation: 'Monitor execution and adjust as needed',
            });
        }
        const overallRisk = Math.min(1, risks.reduce((sum, r) => sum + r.probability * r.impact, 0) / Math.max(1, risks.length));
        return {
            overallRisk,
            risks,
            mitigations,
        };
    }
    calculateCriticalPathLength(plan) {
        let totalCriticalPath = 0;
        for (const level of plan.levels) {
            if (level.taskGraph) {
                totalCriticalPath += level.taskGraph.criticalPathLength;
            }
            else {
                totalCriticalPath += this.calculateMaxDependencyDepth(level.objectives);
            }
        }
        return totalCriticalPath;
    }
    updateObjectiveStatus(plan, objectiveId, status) {
        for (const level of plan.levels) {
            const objective = level.objectives.find((o) => o.id === objectiveId);
            if (objective) {
                objective.status = status;
                const allCompleted = level.objectives.every((o) => o.status === 'completed');
                const anyFailed = level.objectives.some((o) => o.status === 'failed');
                const anyInProgress = level.objectives.some((o) => o.status === 'in_progress');
                if (allCompleted) {
                    level.status = PlanStatus.COMPLETED;
                }
                else if (anyFailed) {
                    level.status = PlanStatus.FAILED;
                }
                else if (anyInProgress) {
                    level.status = PlanStatus.IN_PROGRESS;
                }
                return;
            }
        }
    }
    rebuildObjectiveIndex(plan) {
        for (const [key, value] of this.objectiveIndex) {
            if (value.planId === plan.id) {
                this.objectiveIndex.delete(key);
            }
        }
        for (let i = 0; i < plan.levels.length; i++) {
            for (const obj of plan.levels[i].objectives) {
                this.objectiveIndex.set(obj.id, { planId: plan.id, levelIndex: i });
            }
        }
    }
    countTotalObjectives(plan) {
        return plan.levels.reduce((sum, level) => sum + level.objectives.length, 0);
    }
    canonicalizeDescription(description) {
        return description
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 100);
    }
    resolveConflict(objIds, objectives) {
        const objs = objIds
            .map((id) => objectives.find((o) => o.id === id))
            .filter(Boolean);
        const priorityOrder = [
            'completed',
            'in_progress',
            'pending',
            'failed',
        ];
        for (const preferredStatus of priorityOrder) {
            const preferred = objs.find((o) => o.status === preferredStatus);
            if (preferred) {
                return `Accept "${preferred.status}" result from objective ${preferred.id} (highest priority status)`;
            }
        }
        return 'Manual resolution required: review conflicting objectives and select outcome';
    }
};
exports.LongHorizonPlanningService = LongHorizonPlanningService;
exports.LongHorizonPlanningService = LongHorizonPlanningService = LongHorizonPlanningService_1 = __decorate([
    (0, common_1.Injectable)()
], LongHorizonPlanningService);
//# sourceMappingURL=long-horizon-planning.service.js.map