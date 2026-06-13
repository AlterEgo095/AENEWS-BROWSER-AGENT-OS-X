"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SimulationEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationEngineService = exports.RiskLevel = void 0;
const common_1 = require("@nestjs/common");
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["LOW"] = "low";
    RiskLevel["MEDIUM"] = "medium";
    RiskLevel["HIGH"] = "high";
    RiskLevel["CRITICAL"] = "critical";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
const DEFAULT_ITERATIONS = 1000;
const MAX_HISTORY_SIZE = 500;
const SUCCESS_RATE_VARIANCE = 0.15;
const DURATION_VARIANCE = 0.25;
const COST_VARIANCE = 0.15;
let SimulationEngineService = SimulationEngineService_1 = class SimulationEngineService {
    constructor() {
        this.logger = new common_1.Logger(SimulationEngineService_1.name);
        this.history = [];
    }
    simulate(input) {
        const iterations = input.iterations ?? DEFAULT_ITERATIONS;
        const { missionId, taskGraph, resourceConstraints, historicalData } = input;
        this.logger.log(`Starting Monte Carlo simulation for mission ${missionId} (${iterations} iterations, ${taskGraph.nodes.length} nodes)`);
        const nodeMap = this.buildNodeMap(taskGraph);
        const edgeMap = this.buildEdgeMap(taskGraph);
        const topoLevels = this.computeTopologicalLevels(taskGraph);
        const iterationResults = [];
        for (let i = 0; i < iterations; i++) {
            const result = this.runSingleIteration(taskGraph, nodeMap, edgeMap, topoLevels, historicalData);
            iterationResults.push(result);
        }
        const successCount = iterationResults.filter((r) => r.success).length;
        const overallSuccessProbability = successCount / iterations;
        const costs = iterationResults.map((r) => r.totalCost).sort((a, b) => a - b);
        const durations = iterationResults
            .map((r) => r.totalDurationMs)
            .sort((a, b) => a - b);
        const costEstimate = this.computeCostEstimate(costs, iterations);
        const durationEstimate = this.computeDurationEstimate(durations, iterations);
        const riskFactors = this.computeRiskFactors(taskGraph, nodeMap, iterationResults, historicalData);
        const criticalPathAnalysis = this.analyzeCriticalPath(taskGraph);
        const bottlenecks = this.identifyBottlenecks(taskGraph, historicalData);
        const resourceConflicts = resourceConstraints
            ? this.checkResourceConflicts(taskGraph, resourceConstraints)
            : [];
        const riskLevel = this.determineRiskLevel(overallSuccessProbability, riskFactors, resourceConflicts);
        const scenarioBreakdown = this.computeScenarioBreakdown(iterationResults, overallSuccessProbability);
        const result = {
            missionId,
            overallSuccessProbability,
            estimatedCost: costEstimate,
            estimatedDuration: durationEstimate,
            riskLevel,
            riskFactors,
            bottlenecks,
            resourceConflicts,
            recommendations: [],
            criticalPathAnalysis,
            scenarioBreakdown,
            simulatedAt: new Date(),
        };
        result.recommendations = this.generateRecommendations(result);
        this.addToHistory(result);
        this.logger.log(`Simulation complete for mission ${missionId}: success=${(overallSuccessProbability * 100).toFixed(1)}%, risk=${riskLevel}, cost=${costEstimate.expected.toFixed(2)}, duration=${durationEstimate.expectedMs}ms`);
        return result;
    }
    quickEstimate(input) {
        const { missionId, taskGraph, resourceConstraints, historicalData } = input;
        this.logger.log(`Running quick estimate for mission ${missionId}`);
        const nodeMap = this.buildNodeMap(taskGraph);
        const topoLevels = this.computeTopologicalLevels(taskGraph);
        let totalExpectedCost = 0;
        let totalExpectedDurationMs = 0;
        for (const level of topoLevels) {
            let levelMaxDuration = 0;
            for (const nodeId of level.nodeIds) {
                const node = nodeMap.get(nodeId);
                const agentRateAdjust = this.getAdjustedSuccessRate(node, historicalData);
                const latencyAdjust = this.getAdjustedLatency(node, historicalData);
                const expectedAttempts = 1 / Math.max(agentRateAdjust, 0.01);
                totalExpectedCost += node.estimatedCost * expectedAttempts;
                const adjustedDuration = latencyAdjust > 0 ? latencyAdjust : node.estimatedDurationMs;
                levelMaxDuration = Math.max(levelMaxDuration, adjustedDuration);
            }
            totalExpectedDurationMs += levelMaxDuration;
        }
        let overallSuccessProbability = 1;
        for (const node of taskGraph.nodes) {
            const adjustedRate = this.getAdjustedSuccessRate(node, historicalData);
            overallSuccessProbability *= adjustedRate;
        }
        const criticalPathAnalysis = this.analyzeCriticalPath(taskGraph);
        if (criticalPathAnalysis.totalDurationMs > totalExpectedDurationMs) {
            totalExpectedDurationMs = criticalPathAnalysis.totalDurationMs;
        }
        const riskFactors = this.computeRiskFactorsFromRates(taskGraph, nodeMap, historicalData);
        const bottlenecks = this.identifyBottlenecks(taskGraph, historicalData);
        const resourceConflicts = resourceConstraints
            ? this.checkResourceConflicts(taskGraph, resourceConstraints)
            : [];
        const riskLevel = this.determineRiskLevel(overallSuccessProbability, riskFactors, resourceConflicts);
        const scenarioBreakdown = {
            optimistic: {
                probability: overallSuccessProbability * 1.2,
                cost: totalExpectedCost * 0.7,
                durationMs: totalExpectedDurationMs * 0.7,
            },
            expected: {
                probability: overallSuccessProbability,
                cost: totalExpectedCost,
                durationMs: totalExpectedDurationMs,
            },
            pessimistic: {
                probability: overallSuccessProbability * 0.6,
                cost: totalExpectedCost * 1.5,
                durationMs: totalExpectedDurationMs * 1.6,
            },
            failure: {
                probability: 1 - overallSuccessProbability,
                reason: this.getMostLikelyFailureReason(taskGraph, nodeMap, historicalData),
            },
        };
        const costEstimate = {
            minimum: totalExpectedCost * 0.7,
            expected: totalExpectedCost,
            maximum: totalExpectedCost * 1.8,
            p50: totalExpectedCost,
            p90: totalExpectedCost * 1.5,
            confidence: 0.6,
        };
        const durationEstimate = {
            minimumMs: totalExpectedDurationMs * 0.7,
            expectedMs: totalExpectedDurationMs,
            maximumMs: totalExpectedDurationMs * 1.8,
            p50Ms: totalExpectedDurationMs,
            p90Ms: totalExpectedDurationMs * 1.5,
            confidence: 0.6,
        };
        const result = {
            missionId,
            overallSuccessProbability: Math.min(overallSuccessProbability, 1),
            estimatedCost: costEstimate,
            estimatedDuration: durationEstimate,
            riskLevel,
            riskFactors,
            bottlenecks,
            resourceConflicts,
            recommendations: [],
            criticalPathAnalysis,
            scenarioBreakdown,
            simulatedAt: new Date(),
        };
        result.recommendations = this.generateRecommendations(result);
        this.addToHistory(result);
        this.logger.log(`Quick estimate complete for mission ${missionId}: success=${(overallSuccessProbability * 100).toFixed(1)}%, risk=${riskLevel}`);
        return result;
    }
    analyzeCriticalPath(taskGraph) {
        const nodeMap = this.buildNodeMap(taskGraph);
        const nodeIds = taskGraph.nodes.map((n) => n.id);
        if (nodeIds.length === 0) {
            return {
                path: [],
                totalDurationMs: 0,
                slackTimeMs: 0,
                criticalNodes: [],
            };
        }
        const successors = new Map();
        const predecessors = new Map();
        for (const nodeId of nodeIds) {
            successors.set(nodeId, []);
            predecessors.set(nodeId, []);
        }
        for (const node of taskGraph.nodes) {
            for (const depId of node.dependencies) {
                if (successors.has(depId)) {
                    successors.get(depId).push(node.id);
                }
                if (predecessors.has(node.id)) {
                    predecessors.get(node.id).push(depId);
                }
            }
        }
        const es = new Map();
        const ef = new Map();
        const visited = new Set();
        const topoOrder = [];
        const dfs = (nodeId) => {
            if (visited.has(nodeId))
                return;
            visited.add(nodeId);
            for (const pred of predecessors.get(nodeId) ?? []) {
                dfs(pred);
            }
            topoOrder.push(nodeId);
        };
        for (const nodeId of nodeIds) {
            dfs(nodeId);
        }
        for (const nodeId of topoOrder) {
            const node = nodeMap.get(nodeId);
            let maxPredEF = 0;
            for (const pred of predecessors.get(nodeId) ?? []) {
                maxPredEF = Math.max(maxPredEF, ef.get(pred) ?? 0);
            }
            es.set(nodeId, maxPredEF);
            ef.set(nodeId, maxPredEF + node.estimatedDurationMs);
        }
        const projectDuration = Math.max(...Array.from(ef.values()), 0);
        const ls = new Map();
        const lf = new Map();
        const reverseTopo = [...topoOrder].reverse();
        for (const nodeId of reverseTopo) {
            const succs = successors.get(nodeId) ?? [];
            if (succs.length === 0) {
                lf.set(nodeId, projectDuration);
            }
            else {
                let minSuccLS = Infinity;
                for (const succ of succs) {
                    minSuccLS = Math.min(minSuccLS, ls.get(succ) ?? Infinity);
                }
                lf.set(nodeId, minSuccLS);
            }
            const node = nodeMap.get(nodeId);
            ls.set(nodeId, lf.get(nodeId) - node.estimatedDurationMs);
        }
        const float = new Map();
        for (const nodeId of nodeIds) {
            float.set(nodeId, (ls.get(nodeId) ?? 0) - (es.get(nodeId) ?? 0));
        }
        const criticalNodes = nodeIds.filter((id) => Math.abs(float.get(id) ?? 0) < 1);
        const path = this.buildCriticalPathOrder(criticalNodes, predecessors, nodeMap);
        const nonCriticalFloats = nodeIds
            .filter((id) => !criticalNodes.includes(id))
            .map((id) => float.get(id) ?? 0);
        const slackTimeMs = nonCriticalFloats.length > 0
            ? nonCriticalFloats.reduce((sum, f) => sum + f, 0) / nonCriticalFloats.length
            : 0;
        return {
            path,
            totalDurationMs: projectDuration,
            slackTimeMs,
            criticalNodes,
        };
    }
    identifyBottlenecks(taskGraph, historicalData) {
        const nodeMap = this.buildNodeMap(taskGraph);
        const bottlenecks = [];
        if (taskGraph.nodes.length === 0)
            return bottlenecks;
        const durations = taskGraph.nodes.map((n) => n.estimatedDurationMs);
        const avgDuration = durations.reduce((s, d) => s + d, 0) / durations.length;
        const stdDuration = Math.sqrt(durations.reduce((s, d) => s + Math.pow(d - avgDuration, 2), 0) / durations.length);
        const dependentCount = new Map();
        for (const node of taskGraph.nodes) {
            dependentCount.set(node.id, 0);
        }
        for (const node of taskGraph.nodes) {
            for (const depId of node.dependencies) {
                dependentCount.set(depId, (dependentCount.get(depId) ?? 0) + 1);
            }
        }
        const avgDependents = Array.from(dependentCount.values()).reduce((s, c) => s + c, 0) / taskGraph.nodes.length;
        const historicalBottleneckSet = new Set(historicalData?.typicalBottlenecks ?? []);
        const totalResourceDemand = new Map();
        for (const node of taskGraph.nodes) {
            for (const [resource, amount] of Object.entries(node.resourceRequirements)) {
                totalResourceDemand.set(resource, (totalResourceDemand.get(resource) ?? 0) + amount);
            }
        }
        for (const node of taskGraph.nodes) {
            const reasons = [];
            let impactMs = 0;
            const suggestions = [];
            if (stdDuration > 0 && node.estimatedDurationMs > avgDuration + stdDuration) {
                reasons.push(`Duration (${node.estimatedDurationMs}ms) is significantly above average (${avgDuration.toFixed(0)}ms)`);
                impactMs += node.estimatedDurationMs - avgDuration;
                suggestions.push('Consider splitting this task into smaller parallel sub-tasks');
            }
            const deps = dependentCount.get(node.id) ?? 0;
            if (deps > avgDependents * 1.5 && deps > 1) {
                reasons.push(`High fan-out: ${deps} dependent tasks rely on this node`);
                impactMs += node.estimatedDurationMs * 0.3 * deps;
                suggestions.push('Add fallback agents to reduce single-point-of-failure risk');
            }
            const adjustedRate = this.getAdjustedSuccessRate(node, historicalData);
            if (adjustedRate < 0.7) {
                reasons.push(`Low success rate (${(adjustedRate * 100).toFixed(1)}%)`);
                impactMs += node.estimatedDurationMs * (1 - adjustedRate) * 2;
                suggestions.push('Add retry logic or fallback capability for this task');
            }
            for (const [resource, amount] of Object.entries(node.resourceRequirements)) {
                const totalForResource = totalResourceDemand.get(resource) ?? 0;
                if (amount > totalForResource * 0.5 && totalForResource > 0) {
                    reasons.push(`High demand for resource "${resource}" (${amount} of ${totalForResource} total)`);
                    suggestions.push(`Consider acquiring more "${resource}" capacity or scheduling off-peak`);
                }
            }
            if (historicalBottleneckSet.has(node.id) || historicalBottleneckSet.has(node.capability)) {
                reasons.push('Previously identified as a bottleneck in historical data');
                impactMs += avgDuration * 0.5;
                suggestions.push('Review and optimize based on historical performance data');
            }
            if (reasons.length > 0) {
                bottlenecks.push({
                    nodeId: node.id,
                    reason: reasons.join('; '),
                    impactMs: Math.round(impactMs),
                    suggestion: suggestions.join('. ') + '.',
                });
            }
        }
        bottlenecks.sort((a, b) => b.impactMs - a.impactMs);
        return bottlenecks;
    }
    checkResourceConflicts(taskGraph, constraints) {
        const conflicts = [];
        const nodeMap = this.buildNodeMap(taskGraph);
        const topoLevels = this.computeTopologicalLevels(taskGraph);
        let currentMs = 0;
        for (const level of topoLevels) {
            const levelResources = {};
            let levelMaxDuration = 0;
            for (const nodeId of level.nodeIds) {
                const node = nodeMap.get(nodeId);
                for (const [resource, amount] of Object.entries(node.resourceRequirements)) {
                    levelResources[resource] = (levelResources[resource] ?? 0) + amount;
                }
                levelMaxDuration = Math.max(levelMaxDuration, node.estimatedDurationMs);
            }
            for (const [resource, required] of Object.entries(levelResources)) {
                const available = constraints.availableResources[resource];
                if (available !== undefined && required > available) {
                    conflicts.push({
                        resource,
                        conflictingNodes: level.nodeIds.filter((id) => {
                            const node = nodeMap.get(id);
                            return (node.resourceRequirements[resource] ?? 0) > 0;
                        }),
                        timeWindow: {
                            startMs: currentMs,
                            endMs: currentMs + levelMaxDuration,
                        },
                        suggestedResolution: this.suggestResourceResolution(resource, required, available, level.nodeIds, nodeMap),
                    });
                }
            }
            const agentsInLevel = level.nodeIds.filter((id) => nodeMap.get(id)?.agentId !== null).length;
            if (agentsInLevel > constraints.maxParallelAgents) {
                conflicts.push({
                    resource: 'parallel_agents',
                    conflictingNodes: level.nodeIds,
                    timeWindow: {
                        startMs: currentMs,
                        endMs: currentMs + levelMaxDuration,
                    },
                    suggestedResolution: `Reduce parallel agent count from ${agentsInLevel} to ${constraints.maxParallelAgents} by staggering task execution`,
                });
            }
            currentMs += levelMaxDuration;
        }
        const totalCost = taskGraph.nodes.reduce((s, n) => s + n.estimatedCost, 0);
        if (totalCost > constraints.maxCost) {
            conflicts.push({
                resource: 'budget',
                conflictingNodes: taskGraph.nodes.map((n) => n.id),
                timeWindow: { startMs: 0, endMs: currentMs },
                suggestedResolution: `Total estimated cost (${totalCost.toFixed(2)}) exceeds budget (${constraints.maxCost.toFixed(2)}). Reduce scope or increase budget.`,
            });
        }
        const criticalPath = this.analyzeCriticalPath(taskGraph);
        if (criticalPath.totalDurationMs > constraints.maxDurationMs) {
            conflicts.push({
                resource: 'time',
                conflictingNodes: criticalPath.criticalNodes,
                timeWindow: { startMs: 0, endMs: criticalPath.totalDurationMs },
                suggestedResolution: `Critical path duration (${criticalPath.totalDurationMs}ms) exceeds time limit (${constraints.maxDurationMs}ms). Parallelize critical path tasks or reduce scope.`,
            });
        }
        return conflicts;
    }
    generateRecommendations(result) {
        const recommendations = [];
        if (result.overallSuccessProbability < 0.3) {
            recommendations.push(`Mission success probability is critically low (${(result.overallSuccessProbability * 100).toFixed(1)}%). Consider breaking into smaller, independent sub-missions.`);
        }
        else if (result.overallSuccessProbability < 0.6) {
            recommendations.push(`Mission success probability is moderate (${(result.overallSuccessProbability * 100).toFixed(1)}%). Review risk factors and add mitigations before execution.`);
        }
        const criticalRisks = result.riskFactors.filter((r) => r.riskScore > 0.7);
        if (criticalRisks.length > 0) {
            for (const risk of criticalRisks) {
                recommendations.push(`[${risk.name}] ${risk.mitigation}`);
            }
        }
        for (const bottleneck of result.bottlenecks.slice(0, 5)) {
            recommendations.push(`Bottleneck at "${bottleneck.nodeId}": ${bottleneck.suggestion}`);
        }
        for (const conflict of result.resourceConflicts) {
            recommendations.push(conflict.suggestedResolution);
        }
        if (result.criticalPathAnalysis.criticalNodes.length > 0) {
            const longCriticalNodes = result.criticalPathAnalysis.criticalNodes.filter((nodeId) => result.bottlenecks.some((b) => b.nodeId === nodeId));
            if (longCriticalNodes.length > 0) {
                recommendations.push(`Critical path has bottleneck nodes (${longCriticalNodes.join(', ')}). ` +
                    `Consider parallelizing or splitting these tasks to shorten the ${result.criticalPathAnalysis.totalDurationMs}ms critical path.`);
            }
        }
        if (result.estimatedCost.p90 > result.estimatedCost.expected * 1.5) {
            recommendations.push(`High cost variance (P90 is ${((result.estimatedCost.p90 / result.estimatedCost.expected) * 100).toFixed(0)}% of expected). ` +
                `Set budget alerts at ${result.estimatedCost.p90.toFixed(2)} and consider phased execution.`);
        }
        if (result.estimatedDuration.p90Ms > result.estimatedDuration.expectedMs * 1.5) {
            recommendations.push(`High duration variance (P90 is ${((result.estimatedDuration.p90Ms / result.estimatedDuration.expectedMs) * 100).toFixed(0)}% of expected). ` +
                `Set time checkpoints and prepare contingency plans for delays.`);
        }
        if (result.scenarioBreakdown.failure.probability > 0.3) {
            recommendations.push(`Failure scenario has ${(result.scenarioBreakdown.failure.probability * 100).toFixed(1)}% probability. ` +
                `Primary failure reason: ${result.scenarioBreakdown.failure.reason}. Address this before execution.`);
        }
        if (result.criticalPathAnalysis.slackTimeMs > result.criticalPathAnalysis.totalDurationMs * 0.3) {
            recommendations.push(`Significant slack time detected (${result.criticalPathAnalysis.slackTimeMs.toFixed(0)}ms avg). ` +
                `Non-critical tasks can be delayed or resources can be reallocated to critical path tasks.`);
        }
        const riskyNodes = result.riskFactors.filter((r) => r.probability > 0.3 && r.impact > 0.5);
        if (riskyNodes.length > 0) {
            recommendations.push(`Add fallback agents for high-impact risk factors: ${riskyNodes.map((r) => r.name).join(', ')}`);
        }
        return recommendations;
    }
    compareScenarios(input, variations) {
        this.logger.log(`Comparing ${variations.length} scenarios for mission ${input.missionId}`);
        const variationResults = [];
        const baselineResult = this.simulate(input);
        variationResults.push({ name: 'baseline', result: baselineResult });
        for (const variation of variations) {
            const variedInput = {
                ...input,
                resourceConstraints: variation.resourceConstraints
                    ? {
                        ...(input.resourceConstraints ?? {
                            maxCost: Infinity,
                            maxDurationMs: Infinity,
                            maxParallelAgents: Infinity,
                            availableResources: {},
                        }),
                        ...variation.resourceConstraints,
                    }
                    : input.resourceConstraints,
                iterations: input.iterations ?? DEFAULT_ITERATIONS,
            };
            if (variation.successRateOverride !== undefined) {
                variedInput.taskGraph = {
                    nodes: input.taskGraph.nodes.map((node) => ({
                        ...node,
                        estimatedSuccessRate: Math.min(1, node.estimatedSuccessRate * variation.successRateOverride),
                    })),
                    edges: [...input.taskGraph.edges],
                };
            }
            const result = this.simulate(variedInput);
            variationResults.push({ name: variation.name, result });
        }
        const recommendation = this.generateScenarioRecommendation(variationResults);
        this.logger.log(`Scenario comparison complete. Recommendation: ${recommendation}`);
        return {
            variations: variationResults,
            recommendation,
        };
    }
    getSimulationHistory(missionId) {
        if (missionId) {
            return this.history.filter((r) => r.missionId === missionId);
        }
        return [...this.history];
    }
    runSingleIteration(taskGraph, nodeMap, edgeMap, topoLevels, historicalData) {
        const state = new Map();
        const failedNodes = new Set();
        const completedNodes = [];
        let totalCost = 0;
        let totalDurationMs = 0;
        let missionSuccess = true;
        for (const level of topoLevels) {
            let levelMaxDuration = 0;
            for (const nodeId of level.nodeIds) {
                const node = nodeMap.get(nodeId);
                const hardDepsFailed = this.haveHardDepsFailed(nodeId, edgeMap, failedNodes);
                if (hardDepsFailed) {
                    failedNodes.add(nodeId);
                    state.set(nodeId, {
                        nodeId,
                        executed: false,
                        succeeded: false,
                        startMs: totalDurationMs,
                        endMs: totalDurationMs,
                        cost: 0,
                    });
                    missionSuccess = false;
                    continue;
                }
                const softDepsFailed = this.haveSoftDepsFailed(nodeId, edgeMap, failedNodes);
                const softFailurePenalty = softDepsFailed ? 0.1 : 0;
                const adjustedRate = Math.max(0, this.getAdjustedSuccessRate(node, historicalData) - softFailurePenalty);
                const roll = Math.random();
                const succeeded = roll <= adjustedRate;
                const durationVariance = 1 + (Math.random() * 2 - 1) * DURATION_VARIANCE;
                const costVariance = 1 + (Math.random() * 2 - 1) * COST_VARIANCE;
                const actualDuration = Math.round(node.estimatedDurationMs * durationVariance);
                const actualCost = node.estimatedCost * costVariance;
                state.set(nodeId, {
                    nodeId,
                    executed: true,
                    succeeded,
                    startMs: totalDurationMs,
                    endMs: totalDurationMs + actualDuration,
                    cost: actualCost,
                });
                totalCost += actualCost;
                levelMaxDuration = Math.max(levelMaxDuration, actualDuration);
                if (succeeded) {
                    completedNodes.push(nodeId);
                }
                else {
                    failedNodes.add(nodeId);
                    missionSuccess = false;
                }
            }
            totalDurationMs += levelMaxDuration;
        }
        return {
            success: missionSuccess,
            totalCost,
            totalDurationMs,
            failedNodes: Array.from(failedNodes),
            completedNodes,
        };
    }
    computeCostEstimate(sortedCosts, iterations) {
        const min = sortedCosts[0] ?? 0;
        const max = sortedCosts[sortedCosts.length - 1] ?? 0;
        const expected = sortedCosts.reduce((s, c) => s + c, 0) / iterations;
        const p50 = this.percentile(sortedCosts, 50);
        const p90 = this.percentile(sortedCosts, 90);
        const spread = p90 - p50;
        const confidence = Math.max(0, Math.min(1, 1 - spread / (expected || 1)));
        return {
            minimum: Math.round(min * 100) / 100,
            expected: Math.round(expected * 100) / 100,
            maximum: Math.round(max * 100) / 100,
            p50: Math.round(p50 * 100) / 100,
            p90: Math.round(p90 * 100) / 100,
            confidence: Math.round(confidence * 100) / 100,
        };
    }
    computeDurationEstimate(sortedDurations, iterations) {
        const min = sortedDurations[0] ?? 0;
        const max = sortedDurations[sortedDurations.length - 1] ?? 0;
        const expected = sortedDurations.reduce((s, d) => s + d, 0) / iterations;
        const p50 = this.percentile(sortedDurations, 50);
        const p90 = this.percentile(sortedDurations, 90);
        const spread = p90 - p50;
        const confidence = Math.max(0, Math.min(1, 1 - spread / (expected || 1)));
        return {
            minimumMs: Math.round(min),
            expectedMs: Math.round(expected),
            maximumMs: Math.round(max),
            p50Ms: Math.round(p50),
            p90Ms: Math.round(p90),
            confidence: Math.round(confidence * 100) / 100,
        };
    }
    computeRiskFactors(taskGraph, nodeMap, iterationResults, historicalData) {
        const riskFactors = [];
        const totalIterations = iterationResults.length;
        const nodeFailureCount = new Map();
        for (const result of iterationResults) {
            for (const failedId of result.failedNodes) {
                nodeFailureCount.set(failedId, (nodeFailureCount.get(failedId) ?? 0) + 1);
            }
        }
        for (const node of taskGraph.nodes) {
            const failureProb = (nodeFailureCount.get(node.id) ?? 0) / totalIterations;
            if (failureProb < 0.05)
                continue;
            const dependentCount = taskGraph.nodes.filter((n) => n.dependencies.includes(node.id)).length;
            const impact = Math.min(1, dependentCount / Math.max(taskGraph.nodes.length * 0.3, 1));
            const riskScore = failureProb * impact;
            let mitigation;
            if (failureProb > 0.5) {
                mitigation = `Add fallback agent or alternative capability for "${node.capability}"`;
            }
            else if (failureProb > 0.3) {
                mitigation = `Add retry policy (2-3 attempts) for task "${node.id}"`;
            }
            else {
                mitigation = `Monitor task "${node.id}" closely during execution`;
            }
            riskFactors.push({
                name: `Task Failure: ${node.id}`,
                description: `Task "${node.id}" (capability: ${node.capability}) fails in ${(failureProb * 100).toFixed(1)}% of simulations`,
                probability: Math.round(failureProb * 100) / 100,
                impact: Math.round(impact * 100) / 100,
                riskScore: Math.round(riskScore * 100) / 100,
                mitigation,
            });
        }
        const cascadeFailures = iterationResults.filter((r) => r.failedNodes.length > 1 && !r.success).length;
        const cascadeProb = cascadeFailures / totalIterations;
        if (cascadeProb > 0.1) {
            riskFactors.push({
                name: 'Cascade Failure',
                description: `Multiple task failures cascade in ${(cascadeProb * 100).toFixed(1)}% of simulations`,
                probability: Math.round(cascadeProb * 100) / 100,
                impact: 0.9,
                riskScore: Math.round(cascadeProb * 0.9 * 100) / 100,
                mitigation: 'Reduce hard dependencies between tasks; use soft dependencies where possible',
            });
        }
        const successfulResults = iterationResults.filter((r) => r.success);
        if (successfulResults.length > 0) {
            const avgCost = successfulResults.reduce((s, r) => s + r.totalCost, 0) / successfulResults.length;
            const overruns = successfulResults.filter((r) => r.totalCost > avgCost * 1.5).length;
            const overrunProb = overruns / successfulResults.length;
            if (overrunProb > 0.1) {
                riskFactors.push({
                    name: 'Cost Overrun',
                    description: `Cost exceeds 1.5x average in ${(overrunProb * 100).toFixed(1)}% of successful simulations`,
                    probability: Math.round(overrunProb * 100) / 100,
                    impact: 0.6,
                    riskScore: Math.round(overrunProb * 0.6 * 100) / 100,
                    mitigation: 'Set cost thresholds and implement early termination if budget is exceeded',
                });
            }
        }
        if (successfulResults.length > 0) {
            const avgDuration = successfulResults.reduce((s, r) => s + r.totalDurationMs, 0) / successfulResults.length;
            const durationOverruns = successfulResults.filter((r) => r.totalDurationMs > avgDuration * 1.5).length;
            const durationOverrunProb = durationOverruns / successfulResults.length;
            if (durationOverrunProb > 0.1) {
                riskFactors.push({
                    name: 'Duration Overrun',
                    description: `Duration exceeds 1.5x average in ${(durationOverrunProb * 100).toFixed(1)}% of successful simulations`,
                    probability: Math.round(durationOverrunProb * 100) / 100,
                    impact: 0.5,
                    riskScore: Math.round(durationOverrunProb * 0.5 * 100) / 100,
                    mitigation: 'Set time checkpoints and prepare contingency plans for long-running tasks',
                });
            }
        }
        riskFactors.sort((a, b) => b.riskScore - a.riskScore);
        return riskFactors;
    }
    computeRiskFactorsFromRates(taskGraph, nodeMap, historicalData) {
        const riskFactors = [];
        for (const node of taskGraph.nodes) {
            const adjustedRate = this.getAdjustedSuccessRate(node, historicalData);
            const failureProb = 1 - adjustedRate;
            if (failureProb < 0.05)
                continue;
            const dependentCount = taskGraph.nodes.filter((n) => n.dependencies.includes(node.id)).length;
            const impact = Math.min(1, dependentCount / Math.max(taskGraph.nodes.length * 0.3, 1));
            const riskScore = failureProb * impact;
            riskFactors.push({
                name: `Task Failure: ${node.id}`,
                description: `Task "${node.id}" (capability: ${node.capability}) has ${(failureProb * 100).toFixed(1)}% estimated failure rate`,
                probability: Math.round(failureProb * 100) / 100,
                impact: Math.round(impact * 100) / 100,
                riskScore: Math.round(riskScore * 100) / 100,
                mitigation: failureProb > 0.5
                    ? `Add fallback agent or alternative capability for "${node.capability}"`
                    : `Add retry policy for task "${node.id}"`,
            });
        }
        riskFactors.sort((a, b) => b.riskScore - a.riskScore);
        return riskFactors;
    }
    computeScenarioBreakdown(iterationResults, overallSuccessProbability) {
        const successful = iterationResults.filter((r) => r.success);
        const failed = iterationResults.filter((r) => !r.success);
        const total = iterationResults.length;
        if (successful.length === 0) {
            return {
                optimistic: { probability: 0, cost: 0, durationMs: 0 },
                expected: { probability: 0, cost: 0, durationMs: 0 },
                pessimistic: { probability: 0, cost: 0, durationMs: 0 },
                failure: { probability: 1, reason: 'All simulation iterations failed' },
            };
        }
        const successCosts = successful.map((r) => r.totalCost).sort((a, b) => a - b);
        const successDurations = successful
            .map((r) => r.totalDurationMs)
            .sort((a, b) => a - b);
        const optimisticIdx = Math.floor(successful.length * 0.25);
        const expectedIdx = Math.floor(successful.length * 0.5);
        const pessimisticIdx = Math.floor(successful.length * 0.75);
        const optimisticProb = (successful.length * 0.25) / total;
        const expectedProb = (successful.length * 0.5) / total;
        const pessimisticProb = (successful.length * 0.25) / total;
        let failureReason = 'Task execution failures';
        if (failed.length > 0) {
            const failCounts = new Map();
            for (const result of failed) {
                for (const nodeId of result.failedNodes) {
                    failCounts.set(nodeId, (failCounts.get(nodeId) ?? 0) + 1);
                }
            }
            const topFailed = Array.from(failCounts.entries()).sort((a, b) => b[1] - a[1]);
            if (topFailed.length > 0) {
                failureReason = `Primary failure at task "${topFailed[0][0]}" (failed in ${topFailed[0][1]} of ${failed.length} failed iterations)`;
            }
        }
        return {
            optimistic: {
                probability: Math.round(optimisticProb * 100) / 100,
                cost: Math.round((successCosts[optimisticIdx] ?? 0) * 100) / 100,
                durationMs: Math.round(successDurations[optimisticIdx] ?? 0),
            },
            expected: {
                probability: Math.round(expectedProb * 100) / 100,
                cost: Math.round((successCosts[expectedIdx] ?? 0) * 100) / 100,
                durationMs: Math.round(successDurations[expectedIdx] ?? 0),
            },
            pessimistic: {
                probability: Math.round(pessimisticProb * 100) / 100,
                cost: Math.round((successCosts[pessimisticIdx] ?? 0) * 100) / 100,
                durationMs: Math.round(successDurations[pessimisticIdx] ?? 0),
            },
            failure: {
                probability: Math.round((failed.length / total) * 100) / 100,
                reason: failureReason,
            },
        };
    }
    determineRiskLevel(successProbability, riskFactors, resourceConflicts) {
        let riskScore = 0;
        riskScore += (1 - successProbability) * 0.4;
        const maxRiskScore = riskFactors.length > 0
            ? Math.max(...riskFactors.map((r) => r.riskScore))
            : 0;
        riskScore += maxRiskScore * 0.3;
        const conflictScore = Math.min(1, resourceConflicts.length / 5);
        riskScore += conflictScore * 0.3;
        if (riskScore >= 0.7)
            return RiskLevel.CRITICAL;
        if (riskScore >= 0.5)
            return RiskLevel.HIGH;
        if (riskScore >= 0.25)
            return RiskLevel.MEDIUM;
        return RiskLevel.LOW;
    }
    buildNodeMap(taskGraph) {
        const map = new Map();
        for (const node of taskGraph.nodes) {
            map.set(node.id, node);
        }
        return map;
    }
    buildEdgeMap(taskGraph) {
        const map = new Map();
        for (const edge of taskGraph.edges) {
            const existing = map.get(edge.fromId) ?? [];
            existing.push(edge);
            map.set(edge.fromId, existing);
        }
        return map;
    }
    computeTopologicalLevels(taskGraph) {
        const nodeMap = this.buildNodeMap(taskGraph);
        const nodeIds = new Set(taskGraph.nodes.map((n) => n.id));
        const inDegree = new Map();
        const dependents = new Map();
        for (const node of taskGraph.nodes) {
            inDegree.set(node.id, node.dependencies.length);
            for (const depId of node.dependencies) {
                if (!dependents.has(depId)) {
                    dependents.set(depId, []);
                }
                dependents.get(depId).push(node.id);
            }
        }
        const levels = [];
        let remaining = new Set(nodeIds);
        while (remaining.size > 0) {
            const readyNodes = [];
            for (const nodeId of remaining) {
                const degree = inDegree.get(nodeId) ?? 0;
                if (degree === 0) {
                    readyNodes.push(nodeId);
                }
            }
            if (readyNodes.length === 0) {
                this.logger.warn(`Circular dependency detected in task graph. Force-breaking with ${remaining.size} remaining nodes.`);
                levels.push({
                    nodeIds: Array.from(remaining),
                    level: levels.length,
                });
                break;
            }
            levels.push({
                nodeIds: readyNodes,
                level: levels.length,
            });
            for (const nodeId of readyNodes) {
                remaining.delete(nodeId);
                for (const depId of dependents.get(nodeId) ?? []) {
                    inDegree.set(depId, (inDegree.get(depId) ?? 1) - 1);
                }
            }
        }
        return levels;
    }
    haveHardDepsFailed(nodeId, edgeMap, failedNodes) {
        for (const [, edges] of edgeMap) {
            for (const edge of edges) {
                if (edge.toId === nodeId && edge.type === 'hard' && failedNodes.has(edge.fromId)) {
                    return true;
                }
            }
        }
        return false;
    }
    haveSoftDepsFailed(nodeId, edgeMap, failedNodes) {
        for (const [, edges] of edgeMap) {
            for (const edge of edges) {
                if (edge.toId === nodeId && edge.type === 'soft' && failedNodes.has(edge.fromId)) {
                    return true;
                }
            }
        }
        return false;
    }
    getAdjustedSuccessRate(node, historicalData) {
        let rate = node.estimatedSuccessRate;
        if (historicalData) {
            if (node.agentId) {
                const agentRate = historicalData.agentSuccessRates.get(node.agentId);
                if (agentRate !== undefined) {
                    rate = rate * 0.6 + agentRate * 0.4;
                }
            }
            const capabilityRate = historicalData.capabilitySuccessRates.get(node.capability);
            if (capabilityRate !== undefined) {
                rate = rate * 0.7 + capabilityRate * 0.3;
            }
        }
        return Math.max(0, Math.min(1, rate));
    }
    getAdjustedLatency(node, historicalData) {
        if (historicalData && node.agentId) {
            const avgLatency = historicalData.agentAvgLatencies.get(node.agentId);
            if (avgLatency !== undefined && avgLatency > 0) {
                return node.estimatedDurationMs * 0.5 + avgLatency * 0.5;
            }
        }
        return 0;
    }
    getMostLikelyFailureReason(taskGraph, nodeMap, historicalData) {
        let lowestRate = 1;
        let lowestNode = null;
        for (const node of taskGraph.nodes) {
            const adjustedRate = this.getAdjustedSuccessRate(node, historicalData);
            if (adjustedRate < lowestRate) {
                lowestRate = adjustedRate;
                lowestNode = node;
            }
        }
        if (lowestNode) {
            return `Task "${lowestNode.id}" has lowest success rate (${(lowestRate * 100).toFixed(1)}%)`;
        }
        return 'Unknown failure cause';
    }
    buildCriticalPathOrder(criticalNodes, predecessors, nodeMap) {
        if (criticalNodes.length === 0)
            return [];
        const criticalSet = new Set(criticalNodes);
        const path = [];
        const visited = new Set();
        const findStart = () => {
            for (const nodeId of criticalNodes) {
                if (visited.has(nodeId))
                    continue;
                const preds = (predecessors.get(nodeId) ?? []).filter((p) => criticalSet.has(p));
                const unvisitedPreds = preds.filter((p) => !visited.has(p));
                if (unvisitedPreds.length === 0) {
                    return nodeId;
                }
            }
            for (const nodeId of criticalNodes) {
                if (!visited.has(nodeId))
                    return nodeId;
            }
            return null;
        };
        let next = findStart();
        while (next) {
            path.push(next);
            visited.add(next);
            next = findStart();
        }
        return path;
    }
    percentile(sortedArray, p) {
        if (sortedArray.length === 0)
            return 0;
        if (sortedArray.length === 1)
            return sortedArray[0];
        const index = (p / 100) * (sortedArray.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const fraction = index - lower;
        if (lower === upper)
            return sortedArray[lower];
        return sortedArray[lower] * (1 - fraction) + sortedArray[upper] * fraction;
    }
    suggestResourceResolution(resource, required, available, nodeIds, nodeMap) {
        const deficit = required - available;
        const nodesUsingResource = nodeIds.filter((id) => {
            const node = nodeMap.get(id);
            return (node.resourceRequirements[resource] ?? 0) > 0;
        });
        if (nodesUsingResource.length <= 1) {
            return `Increase "${resource}" capacity by at least ${deficit.toFixed(1)} units, or reduce this task's resource requirement`;
        }
        return `Stagger execution of tasks ${nodesUsingResource.join(', ')} to reduce peak "${resource}" demand from ${required.toFixed(1)} to ≤${available.toFixed(1)}`;
    }
    generateScenarioRecommendation(variations) {
        if (variations.length <= 1) {
            return 'No alternative scenarios to compare';
        }
        let bestIdx = 0;
        let bestScore = -Infinity;
        for (let i = 0; i < variations.length; i++) {
            const { result } = variations[i];
            const successWeight = result.overallSuccessProbability * 0.4;
            const costEfficiency = variations[0].result.estimatedCost.expected > 0
                ? (1 - result.estimatedCost.expected / (variations[0].result.estimatedCost.expected * 3)) * 0.25
                : 0.25;
            const riskScore = result.riskLevel === RiskLevel.LOW ? 0.25
                : result.riskLevel === RiskLevel.MEDIUM ? 0.15
                    : result.riskLevel === RiskLevel.HIGH ? 0.05
                        : 0;
            const durationEfficiency = variations[0].result.estimatedDuration.expectedMs > 0
                ? (1 - result.estimatedDuration.expectedMs / (variations[0].result.estimatedDuration.expectedMs * 3)) * 0.1
                : 0.1;
            const score = successWeight + costEfficiency + riskScore + durationEfficiency;
            if (score > bestScore) {
                bestScore = score;
                bestIdx = i;
            }
        }
        const best = variations[bestIdx];
        if (bestIdx === 0) {
            return `Baseline configuration is optimal (${(best.result.overallSuccessProbability * 100).toFixed(1)}% success, ${best.result.riskLevel} risk)`;
        }
        return `"${best.name}" scenario is recommended: ${(best.result.overallSuccessProbability * 100).toFixed(1)}% success probability, ${best.result.riskLevel} risk, expected cost ${best.result.estimatedCost.expected.toFixed(2)}`;
    }
    addToHistory(result) {
        this.history.push(result);
        if (this.history.length > MAX_HISTORY_SIZE) {
            this.history.splice(0, this.history.length - MAX_HISTORY_SIZE);
        }
    }
};
exports.SimulationEngineService = SimulationEngineService;
exports.SimulationEngineService = SimulationEngineService = SimulationEngineService_1 = __decorate([
    (0, common_1.Injectable)()
], SimulationEngineService);
//# sourceMappingURL=simulation-engine.service.js.map