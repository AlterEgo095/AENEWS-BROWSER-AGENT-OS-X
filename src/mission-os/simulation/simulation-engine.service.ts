/**
 * AENEWS Agent OS X - Simulation Engine Service
 *
 * Runs pre-execution simulations to estimate cost, time, risks, and success
 * probability before actual execution.
 *
 * Flow: Mission → Simulation → Cost/Time/Risks/Success → Execute only if viable
 *
 * Uses Monte Carlo simulation to model task graph execution with probabilistic
 * success/failure, cascade impact analysis, critical path identification,
 * resource conflict detection, and actionable recommendation generation.
 */

import { Injectable, Logger } from '@nestjs/common';

// ─── Type Definitions ──────────────────────────────────────────────

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface SimulationInput {
  missionId: string;
  taskGraph: SimulationTaskGraph;
  resourceConstraints?: ResourceConstraints;
  historicalData?: HistoricalData;
  iterations?: number; // Monte Carlo iterations, default 1000
}

export interface SimulationTaskGraph {
  nodes: SimulationTaskNode[];
  edges: SimulationTaskEdge[];
}

export interface SimulationTaskNode {
  id: string;
  agentId: string | null;
  capability: string;
  estimatedDurationMs: number;
  estimatedCost: number;
  estimatedSuccessRate: number;
  dependencies: string[];
  resourceRequirements: Record<string, number>;
}

export interface SimulationTaskEdge {
  fromId: string;
  toId: string;
  type: 'hard' | 'soft' | 'resource';
}

export interface ResourceConstraints {
  maxCost: number;
  maxDurationMs: number;
  maxParallelAgents: number;
  availableResources: Record<string, number>;
}

export interface HistoricalData {
  agentSuccessRates: Map<string, number>;
  agentAvgLatencies: Map<string, number>;
  capabilitySuccessRates: Map<string, number>;
  typicalBottlenecks: string[];
}

export interface SimulationResult {
  missionId: string;
  overallSuccessProbability: number;
  estimatedCost: CostEstimate;
  estimatedDuration: DurationEstimate;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  bottlenecks: Bottleneck[];
  resourceConflicts: ResourceConflict[];
  recommendations: string[];
  criticalPathAnalysis: CriticalPathAnalysis;
  scenarioBreakdown: ScenarioBreakdown;
  simulatedAt: Date;
}

export interface CostEstimate {
  minimum: number;
  expected: number;
  maximum: number;
  p50: number;
  p90: number;
  confidence: number;
}

export interface DurationEstimate {
  minimumMs: number;
  expectedMs: number;
  maximumMs: number;
  p50Ms: number;
  p90Ms: number;
  confidence: number;
}

export interface RiskFactor {
  name: string;
  description: string;
  probability: number;
  impact: number;
  riskScore: number;
  mitigation: string;
}

export interface Bottleneck {
  nodeId: string;
  reason: string;
  impactMs: number;
  suggestion: string;
}

export interface ResourceConflict {
  resource: string;
  conflictingNodes: string[];
  timeWindow: { startMs: number; endMs: number };
  suggestedResolution: string;
}

export interface CriticalPathAnalysis {
  path: string[];
  totalDurationMs: number;
  slackTimeMs: number;
  criticalNodes: string[];
}

export interface ScenarioBreakdown {
  optimistic: { probability: number; cost: number; durationMs: number };
  expected: { probability: number; cost: number; durationMs: number };
  pessimistic: { probability: number; cost: number; durationMs: number };
  failure: { probability: number; reason: string };
}

// ─── Internal Simulation Types ─────────────────────────────────────

interface IterationResult {
  success: boolean;
  totalCost: number;
  totalDurationMs: number;
  failedNodes: string[];
  completedNodes: string[];
}

interface TopologicalLevel {
  nodeIds: string[];
  level: number;
}

interface NodeExecutionState {
  nodeId: string;
  executed: boolean;
  succeeded: boolean;
  startMs: number;
  endMs: number;
  cost: number;
}

interface ScenarioVariation {
  name: string;
  resourceConstraints?: Partial<ResourceConstraints>;
  successRateOverride?: number; // Multiplier on all success rates
  priorityNodes?: string[]; // Nodes to execute first
}

interface ScenarioComparison {
  variations: {
    name: string;
    result: SimulationResult;
  }[];
  recommendation: string;
}

// ─── Constants ─────────────────────────────────────────────────────

const DEFAULT_ITERATIONS = 1000;
const MAX_HISTORY_SIZE = 500;
const SUCCESS_RATE_VARIANCE = 0.15; // Variance band for Monte Carlo sampling
const DURATION_VARIANCE = 0.25; // ±25% duration variance in simulation
const COST_VARIANCE = 0.15; // ±15% cost variance in simulation

// ─── Service ───────────────────────────────────────────────────────

@Injectable()
export class SimulationEngineService {
  private readonly logger = new Logger(SimulationEngineService.name);

  /** Bounded history of simulation results */
  private readonly history: SimulationResult[] = [];

  // ─── 1. simulate ──────────────────────────────────────────────────

  /**
   * THE CORE METHOD. Run Monte Carlo simulation to estimate mission viability.
   *
   * For each iteration:
   *  - Simulate execution of the task graph
   *  - For each task node, randomly determine success/failure based on
   *    estimatedSuccessRate (adjusted by historical data if available)
   *  - If a task fails, cascade impact: hard dependencies fail, soft continue
   *  - Calculate total cost (sum of all executed task costs, even failed ones)
   *  - Calculate total duration using topological execution with parallel grouping
   *
   * Aggregate: success probability, P50/P90 cost/duration, risk factors,
   * bottlenecks, resource conflicts, recommendations.
   */
  simulate(input: SimulationInput): SimulationResult {
    const iterations = input.iterations ?? DEFAULT_ITERATIONS;
    const { missionId, taskGraph, resourceConstraints, historicalData } = input;

    this.logger.log(
      `Starting Monte Carlo simulation for mission ${missionId} (${iterations} iterations, ${taskGraph.nodes.length} nodes)`,
    );

    const nodeMap = this.buildNodeMap(taskGraph);
    const edgeMap = this.buildEdgeMap(taskGraph);
    const topoLevels = this.computeTopologicalLevels(taskGraph);

    // Run Monte Carlo iterations
    const iterationResults: IterationResult[] = [];
    for (let i = 0; i < iterations; i++) {
      const result = this.runSingleIteration(
        taskGraph,
        nodeMap,
        edgeMap,
        topoLevels,
        historicalData,
      );
      iterationResults.push(result);
    }

    // Aggregate results
    const successCount = iterationResults.filter((r) => r.success).length;
    const overallSuccessProbability = successCount / iterations;

    const costs = iterationResults.map((r) => r.totalCost).sort((a, b) => a - b);
    const durations = iterationResults
      .map((r) => r.totalDurationMs)
      .sort((a, b) => a - b);

    const costEstimate = this.computeCostEstimate(costs, iterations);
    const durationEstimate = this.computeDurationEstimate(durations, iterations);

    // Risk analysis
    const riskFactors = this.computeRiskFactors(
      taskGraph,
      nodeMap,
      iterationResults,
      historicalData,
    );

    // Critical path analysis
    const criticalPathAnalysis = this.analyzeCriticalPath(taskGraph);

    // Bottleneck identification
    const bottlenecks = this.identifyBottlenecks(taskGraph, historicalData);

    // Resource conflict detection
    const resourceConflicts = resourceConstraints
      ? this.checkResourceConflicts(taskGraph, resourceConstraints)
      : [];

    // Risk level determination
    const riskLevel = this.determineRiskLevel(
      overallSuccessProbability,
      riskFactors,
      resourceConflicts,
    );

    // Scenario breakdown
    const scenarioBreakdown = this.computeScenarioBreakdown(
      iterationResults,
      overallSuccessProbability,
    );

    // Generate recommendations
    const result: SimulationResult = {
      missionId,
      overallSuccessProbability,
      estimatedCost: costEstimate,
      estimatedDuration: durationEstimate,
      riskLevel,
      riskFactors,
      bottlenecks,
      resourceConflicts,
      recommendations: [], // Populated below
      criticalPathAnalysis,
      scenarioBreakdown,
      simulatedAt: new Date(),
    };

    result.recommendations = this.generateRecommendations(result);

    // Store in bounded history
    this.addToHistory(result);

    this.logger.log(
      `Simulation complete for mission ${missionId}: success=${(overallSuccessProbability * 100).toFixed(1)}%, risk=${riskLevel}, cost=${costEstimate.expected.toFixed(2)}, duration=${durationEstimate.expectedMs}ms`,
    );

    return result;
  }

  // ─── 2. quickEstimate ────────────────────────────────────────────

  /**
   * Fast single-pass estimation without Monte Carlo.
   * Uses expected values directly. Good for quick go/no-go decisions.
   */
  quickEstimate(input: SimulationInput): SimulationResult {
    const { missionId, taskGraph, resourceConstraints, historicalData } = input;

    this.logger.log(`Running quick estimate for mission ${missionId}`);

    const nodeMap = this.buildNodeMap(taskGraph);
    const topoLevels = this.computeTopologicalLevels(taskGraph);

    // Calculate expected cost and duration using expected values
    let totalExpectedCost = 0;
    let totalExpectedDurationMs = 0;

    // Walk through topological levels (parallel groups)
    for (const level of topoLevels) {
      let levelMaxDuration = 0;

      for (const nodeId of level.nodeIds) {
        const node = nodeMap.get(nodeId)!;
        const agentRateAdjust = this.getAdjustedSuccessRate(node, historicalData);
        const latencyAdjust = this.getAdjustedLatency(node, historicalData);

        // Expected cost accounts for potential retries (1 / successRate attempts on average)
        const expectedAttempts = 1 / Math.max(agentRateAdjust, 0.01);
        totalExpectedCost += node.estimatedCost * expectedAttempts;

        // Use latency-adjusted duration
        const adjustedDuration = latencyAdjust > 0 ? latencyAdjust : node.estimatedDurationMs;
        levelMaxDuration = Math.max(levelMaxDuration, adjustedDuration);
      }

      totalExpectedDurationMs += levelMaxDuration;
    }

    // Overall success probability = product of all node success rates
    let overallSuccessProbability = 1;
    for (const node of taskGraph.nodes) {
      const adjustedRate = this.getAdjustedSuccessRate(node, historicalData);
      overallSuccessProbability *= adjustedRate;
    }

    // Critical path
    const criticalPathAnalysis = this.analyzeCriticalPath(taskGraph);

    // Override duration with critical path if longer
    if (criticalPathAnalysis.totalDurationMs > totalExpectedDurationMs) {
      totalExpectedDurationMs = criticalPathAnalysis.totalDurationMs;
    }

    // Compute risk factors
    const riskFactors = this.computeRiskFactorsFromRates(taskGraph, nodeMap, historicalData);

    // Bottlenecks
    const bottlenecks = this.identifyBottlenecks(taskGraph, historicalData);

    // Resource conflicts
    const resourceConflicts = resourceConstraints
      ? this.checkResourceConflicts(taskGraph, resourceConstraints)
      : [];

    // Risk level
    const riskLevel = this.determineRiskLevel(
      overallSuccessProbability,
      riskFactors,
      resourceConflicts,
    );

    // Scenario breakdown (simplified)
    const scenarioBreakdown: ScenarioBreakdown = {
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

    const costEstimate: CostEstimate = {
      minimum: totalExpectedCost * 0.7,
      expected: totalExpectedCost,
      maximum: totalExpectedCost * 1.8,
      p50: totalExpectedCost,
      p90: totalExpectedCost * 1.5,
      confidence: 0.6, // Lower confidence for quick estimate
    };

    const durationEstimate: DurationEstimate = {
      minimumMs: totalExpectedDurationMs * 0.7,
      expectedMs: totalExpectedDurationMs,
      maximumMs: totalExpectedDurationMs * 1.8,
      p50Ms: totalExpectedDurationMs,
      p90Ms: totalExpectedDurationMs * 1.5,
      confidence: 0.6,
    };

    const result: SimulationResult = {
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

    this.logger.log(
      `Quick estimate complete for mission ${missionId}: success=${(overallSuccessProbability * 100).toFixed(1)}%, risk=${riskLevel}`,
    );

    return result;
  }

  // ─── 3. analyzeCriticalPath ──────────────────────────────────────

  /**
   * Compute critical path using CPM (Critical Path Method) algorithm.
   *
   * 1. Build forward pass: earliest start/finish for each node
   * 2. Build backward pass: latest start/finish for each node
   * 3. Nodes with zero float (slack) are on the critical path
   *
   * Returns ordered list of node IDs on critical path.
   */
  analyzeCriticalPath(taskGraph: SimulationTaskGraph): CriticalPathAnalysis {
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

    // Build adjacency: for each node, what nodes depend on it (successors)
    const successors = new Map<string, string[]>();
    const predecessors = new Map<string, string[]>();

    for (const nodeId of nodeIds) {
      successors.set(nodeId, []);
      predecessors.set(nodeId, []);
    }

    for (const node of taskGraph.nodes) {
      for (const depId of node.dependencies) {
        if (successors.has(depId)) {
          successors.get(depId)!.push(node.id);
        }
        if (predecessors.has(node.id)) {
          predecessors.get(node.id)!.push(depId);
        }
      }
    }

    // Forward pass: compute earliest start (ES) and earliest finish (EF)
    const es = new Map<string, number>(); // Earliest Start
    const ef = new Map<string, number>(); // Earliest Finish

    // Topological sort for processing order
    const visited = new Set<string>();
    const topoOrder: string[] = [];

    const dfs = (nodeId: string): void => {
      if (visited.has(nodeId)) return;
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
      const node = nodeMap.get(nodeId)!;
      let maxPredEF = 0;
      for (const pred of predecessors.get(nodeId) ?? []) {
        maxPredEF = Math.max(maxPredEF, ef.get(pred) ?? 0);
      }
      es.set(nodeId, maxPredEF);
      ef.set(nodeId, maxPredEF + node.estimatedDurationMs);
    }

    // Total project duration = max EF
    const projectDuration = Math.max(...Array.from(ef.values()), 0);

    // Backward pass: compute latest start (LS) and latest finish (LF)
    const ls = new Map<string, number>(); // Latest Start
    const lf = new Map<string, number>(); // Latest Finish

    // Process in reverse topological order
    const reverseTopo = [...topoOrder].reverse();

    for (const nodeId of reverseTopo) {
      const succs = successors.get(nodeId) ?? [];
      if (succs.length === 0) {
        // Terminal node: LF = project duration
        lf.set(nodeId, projectDuration);
      } else {
        let minSuccLS = Infinity;
        for (const succ of succs) {
          minSuccLS = Math.min(minSuccLS, ls.get(succ) ?? Infinity);
        }
        lf.set(nodeId, minSuccLS);
      }

      const node = nodeMap.get(nodeId)!;
      ls.set(nodeId, lf.get(nodeId)! - node.estimatedDurationMs);
    }

    // Compute float (slack) for each node
    const float = new Map<string, number>();
    for (const nodeId of nodeIds) {
      float.set(nodeId, (ls.get(nodeId) ?? 0) - (es.get(nodeId) ?? 0));
    }

    // Critical path: nodes with zero (or near-zero) float
    const criticalNodes = nodeIds.filter(
      (id) => Math.abs(float.get(id) ?? 0) < 1, // Sub-millisecond tolerance
    );

    // Build the critical path as ordered sequence
    const path = this.buildCriticalPathOrder(criticalNodes, predecessors, nodeMap);

    // Slack time = average non-critical float
    const nonCriticalFloats = nodeIds
      .filter((id) => !criticalNodes.includes(id))
      .map((id) => float.get(id) ?? 0);
    const slackTimeMs =
      nonCriticalFloats.length > 0
        ? nonCriticalFloats.reduce((sum, f) => sum + f, 0) / nonCriticalFloats.length
        : 0;

    return {
      path,
      totalDurationMs: projectDuration,
      slackTimeMs,
      criticalNodes,
    };
  }

  // ─── 4. identifyBottlenecks ──────────────────────────────────────

  /**
   * Find nodes that are likely bottlenecks.
   * A node is a bottleneck if it has one or more of:
   *  - Long duration relative to peers
   *  - Many dependents (high fan-out)
   *  - Low success rate
   *  - Resource contention
   *  - Historical bottleneck data
   */
  identifyBottlenecks(
    taskGraph: SimulationTaskGraph,
    historicalData?: HistoricalData,
  ): Bottleneck[] {
    const nodeMap = this.buildNodeMap(taskGraph);
    const bottlenecks: Bottleneck[] = [];

    if (taskGraph.nodes.length === 0) return bottlenecks;

    // Compute statistics for relative comparisons
    const durations = taskGraph.nodes.map((n) => n.estimatedDurationMs);
    const avgDuration = durations.reduce((s, d) => s + d, 0) / durations.length;
    const stdDuration = Math.sqrt(
      durations.reduce((s, d) => s + Math.pow(d - avgDuration, 2), 0) / durations.length,
    );

    // Count dependents for each node
    const dependentCount = new Map<string, number>();
    for (const node of taskGraph.nodes) {
      dependentCount.set(node.id, 0);
    }
    for (const node of taskGraph.nodes) {
      for (const depId of node.dependencies) {
        dependentCount.set(depId, (dependentCount.get(depId) ?? 0) + 1);
      }
    }

    const avgDependents =
      Array.from(dependentCount.values()).reduce((s, c) => s + c, 0) / taskGraph.nodes.length;

    // Check historical bottleneck data
    const historicalBottleneckSet = new Set(historicalData?.typicalBottlenecks ?? []);

    // Compute resource demand per node
    const totalResourceDemand = new Map<string, number>();
    for (const node of taskGraph.nodes) {
      for (const [resource, amount] of Object.entries(node.resourceRequirements)) {
        totalResourceDemand.set(resource, (totalResourceDemand.get(resource) ?? 0) + amount);
      }
    }

    for (const node of taskGraph.nodes) {
      const reasons: string[] = [];
      let impactMs = 0;
      const suggestions: string[] = [];

      // Check 1: Long duration (significantly above average)
      if (stdDuration > 0 && node.estimatedDurationMs > avgDuration + stdDuration) {
        reasons.push(
          `Duration (${node.estimatedDurationMs}ms) is significantly above average (${avgDuration.toFixed(0)}ms)`,
        );
        impactMs += node.estimatedDurationMs - avgDuration;
        suggestions.push('Consider splitting this task into smaller parallel sub-tasks');
      }

      // Check 2: Many dependents
      const deps = dependentCount.get(node.id) ?? 0;
      if (deps > avgDependents * 1.5 && deps > 1) {
        reasons.push(`High fan-out: ${deps} dependent tasks rely on this node`);
        impactMs += node.estimatedDurationMs * 0.3 * deps;
        suggestions.push('Add fallback agents to reduce single-point-of-failure risk');
      }

      // Check 3: Low success rate
      const adjustedRate = this.getAdjustedSuccessRate(node, historicalData);
      if (adjustedRate < 0.7) {
        reasons.push(`Low success rate (${(adjustedRate * 100).toFixed(1)}%)`);
        impactMs += node.estimatedDurationMs * (1 - adjustedRate) * 2;
        suggestions.push('Add retry logic or fallback capability for this task');
      }

      // Check 4: Resource contention
      for (const [resource, amount] of Object.entries(node.resourceRequirements)) {
        const totalForResource = totalResourceDemand.get(resource) ?? 0;
        if (amount > totalForResource * 0.5 && totalForResource > 0) {
          reasons.push(`High demand for resource "${resource}" (${amount} of ${totalForResource} total)`);
          suggestions.push(`Consider acquiring more "${resource}" capacity or scheduling off-peak`);
        }
      }

      // Check 5: Historical bottleneck
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

    // Sort by impact descending
    bottlenecks.sort((a, b) => b.impactMs - a.impactMs);

    return bottlenecks;
  }

  // ─── 5. checkResourceConflicts ───────────────────────────────────

  /**
   * Check if resource requirements exceed constraints at any point in execution.
   *
   * Simulates the topological execution levels and checks if any level
   * requires more resources than available.
   */
  checkResourceConflicts(
    taskGraph: SimulationTaskGraph,
    constraints: ResourceConstraints,
  ): ResourceConflict[] {
    const conflicts: ResourceConflict[] = [];
    const nodeMap = this.buildNodeMap(taskGraph);
    const topoLevels = this.computeTopologicalLevels(taskGraph);

    let currentMs = 0;

    for (const level of topoLevels) {
      // Aggregate resource requirements for this level
      const levelResources: Record<string, number> = {};
      let levelMaxDuration = 0;

      for (const nodeId of level.nodeIds) {
        const node = nodeMap.get(nodeId)!;

        for (const [resource, amount] of Object.entries(node.resourceRequirements)) {
          levelResources[resource] = (levelResources[resource] ?? 0) + amount;
        }

        levelMaxDuration = Math.max(levelMaxDuration, node.estimatedDurationMs);
      }

      // Check against constraints
      for (const [resource, required] of Object.entries(levelResources)) {
        const available = constraints.availableResources[resource];
        if (available !== undefined && required > available) {
          conflicts.push({
            resource,
            conflictingNodes: level.nodeIds.filter((id) => {
              const node = nodeMap.get(id)!;
              return (node.resourceRequirements[resource] ?? 0) > 0;
            }),
            timeWindow: {
              startMs: currentMs,
              endMs: currentMs + levelMaxDuration,
            },
            suggestedResolution: this.suggestResourceResolution(
              resource,
              required,
              available,
              level.nodeIds,
              nodeMap,
            ),
          });
        }
      }

      // Check parallel agent constraint
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

    // Check budget constraint
    const totalCost = taskGraph.nodes.reduce((s, n) => s + n.estimatedCost, 0);
    if (totalCost > constraints.maxCost) {
      conflicts.push({
        resource: 'budget',
        conflictingNodes: taskGraph.nodes.map((n) => n.id),
        timeWindow: { startMs: 0, endMs: currentMs },
        suggestedResolution: `Total estimated cost (${totalCost.toFixed(2)}) exceeds budget (${constraints.maxCost.toFixed(2)}). Reduce scope or increase budget.`,
      });
    }

    // Check duration constraint
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

  // ─── 6. generateRecommendations ──────────────────────────────────

  /**
   * Based on simulation result, generate actionable recommendations:
   *  - Parallelize tasks where possible
   *  - Add fallback agents for risky nodes
   *  - Increase budget if cost exceeds constraints
   *  - Split risky tasks into smaller steps
   *  - Reorder tasks to minimize critical path
   *  - Add retry policies for low-success nodes
   */
  generateRecommendations(result: SimulationResult): string[] {
    const recommendations: string[] = [];

    // 1. Success probability too low
    if (result.overallSuccessProbability < 0.3) {
      recommendations.push(
        `Mission success probability is critically low (${(result.overallSuccessProbability * 100).toFixed(1)}%). Consider breaking into smaller, independent sub-missions.`,
      );
    } else if (result.overallSuccessProbability < 0.6) {
      recommendations.push(
        `Mission success probability is moderate (${(result.overallSuccessProbability * 100).toFixed(1)}%). Review risk factors and add mitigations before execution.`,
      );
    }

    // 2. Risk factors
    const criticalRisks = result.riskFactors.filter((r) => r.riskScore > 0.7);
    if (criticalRisks.length > 0) {
      for (const risk of criticalRisks) {
        recommendations.push(`[${risk.name}] ${risk.mitigation}`);
      }
    }

    // 3. Bottleneck-specific recommendations
    for (const bottleneck of result.bottlenecks.slice(0, 5)) {
      recommendations.push(
        `Bottleneck at "${bottleneck.nodeId}": ${bottleneck.suggestion}`,
      );
    }

    // 4. Resource conflict recommendations
    for (const conflict of result.resourceConflicts) {
      recommendations.push(conflict.suggestedResolution);
    }

    // 5. Critical path optimization
    if (result.criticalPathAnalysis.criticalNodes.length > 0) {
      const longCriticalNodes = result.criticalPathAnalysis.criticalNodes.filter(
        (nodeId) =>
          result.bottlenecks.some((b) => b.nodeId === nodeId),
      );
      if (longCriticalNodes.length > 0) {
        recommendations.push(
          `Critical path has bottleneck nodes (${longCriticalNodes.join(', ')}). ` +
            `Consider parallelizing or splitting these tasks to shorten the ${result.criticalPathAnalysis.totalDurationMs}ms critical path.`,
        );
      }
    }

    // 6. Cost optimization
    if (result.estimatedCost.p90 > result.estimatedCost.expected * 1.5) {
      recommendations.push(
        `High cost variance (P90 is ${((result.estimatedCost.p90 / result.estimatedCost.expected) * 100).toFixed(0)}% of expected). ` +
          `Set budget alerts at ${result.estimatedCost.p90.toFixed(2)} and consider phased execution.`,
      );
    }

    // 7. Duration optimization
    if (result.estimatedDuration.p90Ms > result.estimatedDuration.expectedMs * 1.5) {
      recommendations.push(
        `High duration variance (P90 is ${((result.estimatedDuration.p90Ms / result.estimatedDuration.expectedMs) * 100).toFixed(0)}% of expected). ` +
          `Set time checkpoints and prepare contingency plans for delays.`,
      );
    }

    // 8. Scenario-based recommendations
    if (result.scenarioBreakdown.failure.probability > 0.3) {
      recommendations.push(
        `Failure scenario has ${(result.scenarioBreakdown.failure.probability * 100).toFixed(1)}% probability. ` +
          `Primary failure reason: ${result.scenarioBreakdown.failure.reason}. Address this before execution.`,
      );
    }

    // 9. Parallelization opportunities
    if (result.criticalPathAnalysis.slackTimeMs > result.criticalPathAnalysis.totalDurationMs * 0.3) {
      recommendations.push(
        `Significant slack time detected (${result.criticalPathAnalysis.slackTimeMs.toFixed(0)}ms avg). ` +
          `Non-critical tasks can be delayed or resources can be reallocated to critical path tasks.`,
      );
    }

    // 10. Add fallback agent recommendation for risky nodes
    const riskyNodes = result.riskFactors.filter(
      (r) => r.probability > 0.3 && r.impact > 0.5,
    );
    if (riskyNodes.length > 0) {
      recommendations.push(
        `Add fallback agents for high-impact risk factors: ${riskyNodes.map((r) => r.name).join(', ')}`,
      );
    }

    return recommendations;
  }

  // ─── 7. compareScenarios ─────────────────────────────────────────

  /**
   * Run simulation with different resource/priority configurations.
   * Returns comparison of results across all variations.
   */
  compareScenarios(
    input: SimulationInput,
    variations: ScenarioVariation[],
  ): ScenarioComparison {
    this.logger.log(
      `Comparing ${variations.length} scenarios for mission ${input.missionId}`,
    );

    const variationResults: ScenarioComparison['variations'] = [];

    // Baseline: run with original input
    const baselineResult = this.simulate(input);
    variationResults.push({ name: 'baseline', result: baselineResult });

    // Run each variation
    for (const variation of variations) {
      const variedInput: SimulationInput = {
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
        // Reset iterations to a reasonable number for comparison
        iterations: input.iterations ?? DEFAULT_ITERATIONS,
      };

      // If success rate override is specified, we adjust the task graph
      if (variation.successRateOverride !== undefined) {
        variedInput.taskGraph = {
          nodes: input.taskGraph.nodes.map((node) => ({
            ...node,
            estimatedSuccessRate: Math.min(
              1,
              node.estimatedSuccessRate * variation.successRateOverride!,
            ),
          })),
          edges: [...input.taskGraph.edges],
        };
      }

      const result = this.simulate(variedInput);
      variationResults.push({ name: variation.name, result });
    }

    // Generate recommendation for best scenario
    const recommendation = this.generateScenarioRecommendation(variationResults);

    this.logger.log(
      `Scenario comparison complete. Recommendation: ${recommendation}`,
    );

    return {
      variations: variationResults,
      recommendation,
    };
  }

  // ─── 8. getSimulationHistory ─────────────────────────────────────

  /**
   * Get past simulation results, optionally filtered by mission ID.
   */
  getSimulationHistory(missionId?: string): SimulationResult[] {
    if (missionId) {
      return this.history.filter((r) => r.missionId === missionId);
    }
    return [...this.history];
  }

  // ─── Private Helpers: Monte Carlo ─────────────────────────────────

  /**
   * Run a single Monte Carlo iteration.
   * Simulates the full task graph execution with probabilistic success/failure.
   */
  private runSingleIteration(
    taskGraph: SimulationTaskGraph,
    nodeMap: Map<string, SimulationTaskNode>,
    edgeMap: Map<string, SimulationTaskEdge[]>,
    topoLevels: TopologicalLevel[],
    historicalData?: HistoricalData,
  ): IterationResult {
    const state = new Map<string, NodeExecutionState>();
    const failedNodes = new Set<string>();
    const completedNodes: string[] = [];
    let totalCost = 0;
    let totalDurationMs = 0;
    let missionSuccess = true;

    for (const level of topoLevels) {
      let levelMaxDuration = 0;

      for (const nodeId of level.nodeIds) {
        const node = nodeMap.get(nodeId)!;

        // Check if any hard dependency has failed
        const hardDepsFailed = this.haveHardDepsFailed(nodeId, edgeMap, failedNodes);

        if (hardDepsFailed) {
          // Hard dependency failed → this task cannot execute
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

        // Check if soft dependencies have failed
        const softDepsFailed = this.haveSoftDepsFailed(nodeId, edgeMap, failedNodes);
        // Soft deps failed → task can still execute but with reduced success rate
        const softFailurePenalty = softDepsFailed ? 0.1 : 0;

        // Determine success with probability
        const adjustedRate = Math.max(
          0,
          this.getAdjustedSuccessRate(node, historicalData) - softFailurePenalty,
        );
        const roll = Math.random();
        const succeeded = roll <= adjustedRate;

        // Apply variance to duration and cost
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
        } else {
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

  // ─── Private Helpers: Analysis ─────────────────────────────────────

  /**
   * Compute CostEstimate from sorted cost array.
   */
  private computeCostEstimate(sortedCosts: number[], iterations: number): CostEstimate {
    const min = sortedCosts[0] ?? 0;
    const max = sortedCosts[sortedCosts.length - 1] ?? 0;
    const expected = sortedCosts.reduce((s, c) => s + c, 0) / iterations;
    const p50 = this.percentile(sortedCosts, 50);
    const p90 = this.percentile(sortedCosts, 90);

    // Confidence: based on the spread between P50 and P90
    // Narrower spread = higher confidence
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

  /**
   * Compute DurationEstimate from sorted duration array.
   */
  private computeDurationEstimate(
    sortedDurations: number[],
    iterations: number,
  ): DurationEstimate {
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

  /**
   * Compute risk factors from Monte Carlo iteration results.
   */
  private computeRiskFactors(
    taskGraph: SimulationTaskGraph,
    nodeMap: Map<string, SimulationTaskNode>,
    iterationResults: IterationResult[],
    historicalData?: HistoricalData,
  ): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];
    const totalIterations = iterationResults.length;

    // Risk factor per node: failure frequency
    const nodeFailureCount = new Map<string, number>();
    for (const result of iterationResults) {
      for (const failedId of result.failedNodes) {
        nodeFailureCount.set(failedId, (nodeFailureCount.get(failedId) ?? 0) + 1);
      }
    }

    for (const node of taskGraph.nodes) {
      const failureProb = (nodeFailureCount.get(node.id) ?? 0) / totalIterations;

      // Skip very low-risk nodes
      if (failureProb < 0.05) continue;

      // Impact: based on how many nodes depend on this one
      const dependentCount = taskGraph.nodes.filter((n) =>
        n.dependencies.includes(node.id),
      ).length;
      const impact = Math.min(1, dependentCount / Math.max(taskGraph.nodes.length * 0.3, 1));
      const riskScore = failureProb * impact;

      let mitigation: string;
      if (failureProb > 0.5) {
        mitigation = `Add fallback agent or alternative capability for "${node.capability}"`;
      } else if (failureProb > 0.3) {
        mitigation = `Add retry policy (2-3 attempts) for task "${node.id}"`;
      } else {
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

    // Risk factor: cascade failure
    const cascadeFailures = iterationResults.filter(
      (r) => r.failedNodes.length > 1 && !r.success,
    ).length;
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

    // Risk factor: cost overrun
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

    // Risk factor: duration overrun
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

    // Sort by risk score descending
    riskFactors.sort((a, b) => b.riskScore - a.riskScore);

    return riskFactors;
  }

  /**
   * Compute risk factors from expected rates (for quickEstimate).
   */
  private computeRiskFactorsFromRates(
    taskGraph: SimulationTaskGraph,
    nodeMap: Map<string, SimulationTaskNode>,
    historicalData?: HistoricalData,
  ): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];

    for (const node of taskGraph.nodes) {
      const adjustedRate = this.getAdjustedSuccessRate(node, historicalData);
      const failureProb = 1 - adjustedRate;

      if (failureProb < 0.05) continue;

      const dependentCount = taskGraph.nodes.filter((n) =>
        n.dependencies.includes(node.id),
      ).length;
      const impact = Math.min(1, dependentCount / Math.max(taskGraph.nodes.length * 0.3, 1));
      const riskScore = failureProb * impact;

      riskFactors.push({
        name: `Task Failure: ${node.id}`,
        description: `Task "${node.id}" (capability: ${node.capability}) has ${(failureProb * 100).toFixed(1)}% estimated failure rate`,
        probability: Math.round(failureProb * 100) / 100,
        impact: Math.round(impact * 100) / 100,
        riskScore: Math.round(riskScore * 100) / 100,
        mitigation:
          failureProb > 0.5
            ? `Add fallback agent or alternative capability for "${node.capability}"`
            : `Add retry policy for task "${node.id}"`,
      });
    }

    riskFactors.sort((a, b) => b.riskScore - a.riskScore);
    return riskFactors;
  }

  /**
   * Compute scenario breakdown from Monte Carlo results.
   */
  private computeScenarioBreakdown(
    iterationResults: IterationResult[],
    overallSuccessProbability: number,
  ): ScenarioBreakdown {
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

    // Optimistic: P25 of successful iterations
    const optimisticIdx = Math.floor(successful.length * 0.25);
    // Expected: P50
    const expectedIdx = Math.floor(successful.length * 0.5);
    // Pessimistic: P75
    const pessimisticIdx = Math.floor(successful.length * 0.75);

    const optimisticProb = (successful.length * 0.25) / total;
    const expectedProb = (successful.length * 0.5) / total;
    const pessimisticProb = (successful.length * 0.25) / total;

    // Most common failure reason
    let failureReason = 'Task execution failures';
    if (failed.length > 0) {
      // Find the most frequently failed node
      const failCounts = new Map<string, number>();
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

  /**
   * Determine overall risk level based on success probability,
   * risk factors, and resource conflicts.
   */
  private determineRiskLevel(
    successProbability: number,
    riskFactors: RiskFactor[],
    resourceConflicts: ResourceConflict[],
  ): RiskLevel {
    let riskScore = 0;

    // Weight: success probability (40%)
    riskScore += (1 - successProbability) * 0.4;

    // Weight: max risk factor score (30%)
    const maxRiskScore = riskFactors.length > 0
      ? Math.max(...riskFactors.map((r) => r.riskScore))
      : 0;
    riskScore += maxRiskScore * 0.3;

    // Weight: resource conflicts (30%)
    const conflictScore = Math.min(1, resourceConflicts.length / 5);
    riskScore += conflictScore * 0.3;

    if (riskScore >= 0.7) return RiskLevel.CRITICAL;
    if (riskScore >= 0.5) return RiskLevel.HIGH;
    if (riskScore >= 0.25) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  // ─── Private Helpers: Graph Utilities ──────────────────────────────

  /**
   * Build a Map from node ID to SimulationTaskNode for O(1) lookups.
   */
  private buildNodeMap(taskGraph: SimulationTaskGraph): Map<string, SimulationTaskNode> {
    const map = new Map<string, SimulationTaskNode>();
    for (const node of taskGraph.nodes) {
      map.set(node.id, node);
    }
    return map;
  }

  /**
   * Build a Map from node ID to outgoing edges for O(1) lookups.
   */
  private buildEdgeMap(taskGraph: SimulationTaskGraph): Map<string, SimulationTaskEdge[]> {
    const map = new Map<string, SimulationTaskEdge[]>();
    for (const edge of taskGraph.edges) {
      const existing = map.get(edge.fromId) ?? [];
      existing.push(edge);
      map.set(edge.fromId, existing);
    }
    return map;
  }

  /**
   * Compute topological levels (parallel execution groups).
   * Each level contains nodes that can execute in parallel
   * (all dependencies satisfied by previous levels).
   */
  private computeTopologicalLevels(taskGraph: SimulationTaskGraph): TopologicalLevel[] {
    const nodeMap = this.buildNodeMap(taskGraph);
    const nodeIds = new Set(taskGraph.nodes.map((n) => n.id));

    // Build in-degree map based on dependency list
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>(); // node -> nodes that depend on it

    for (const node of taskGraph.nodes) {
      inDegree.set(node.id, node.dependencies.length);
      for (const depId of node.dependencies) {
        if (!dependents.has(depId)) {
          dependents.set(depId, []);
        }
        dependents.get(depId)!.push(node.id);
      }
    }

    const levels: TopologicalLevel[] = [];
    let remaining = new Set(nodeIds);

    while (remaining.size > 0) {
      // Find nodes with no unresolved dependencies
      const readyNodes: string[] = [];
      for (const nodeId of remaining) {
        const degree = inDegree.get(nodeId) ?? 0;
        if (degree === 0) {
          readyNodes.push(nodeId);
        }
      }

      if (readyNodes.length === 0) {
        // Circular dependency detected — force-break by including remaining nodes
        this.logger.warn(
          `Circular dependency detected in task graph. Force-breaking with ${remaining.size} remaining nodes.`,
        );
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

      // Remove processed nodes and update in-degrees
      for (const nodeId of readyNodes) {
        remaining.delete(nodeId);
        for (const depId of dependents.get(nodeId) ?? []) {
          inDegree.set(depId, (inDegree.get(depId) ?? 1) - 1);
        }
      }
    }

    return levels;
  }

  /**
   * Check if any hard dependencies of a node have failed.
   * Hard deps are edges with type 'hard', plus all entries in the node's
   * dependencies list (implicit hard deps).
   */
  private haveHardDepsFailed(
    nodeId: string,
    edgeMap: Map<string, SimulationTaskEdge[]>,
    failedNodes: Set<string>,
  ): boolean {
    // Check all incoming edges for hard type
    for (const [, edges] of edgeMap) {
      for (const edge of edges) {
        if (edge.toId === nodeId && edge.type === 'hard' && failedNodes.has(edge.fromId)) {
          return true;
        }
      }
    }

    // Also check the node's explicit dependencies (implicit hard deps)
    // This is handled via the dependency list in topological ordering,
    // but we double-check here for safety
    return false;
  }

  /**
   * Check if any soft dependencies of a node have failed.
   */
  private haveSoftDepsFailed(
    nodeId: string,
    edgeMap: Map<string, SimulationTaskEdge[]>,
    failedNodes: Set<string>,
  ): boolean {
    for (const [, edges] of edgeMap) {
      for (const edge of edges) {
        if (edge.toId === nodeId && edge.type === 'soft' && failedNodes.has(edge.fromId)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get adjusted success rate for a node, incorporating historical data.
   */
  private getAdjustedSuccessRate(
    node: SimulationTaskNode,
    historicalData?: HistoricalData,
  ): number {
    let rate = node.estimatedSuccessRate;

    if (historicalData) {
      // Adjust by agent-specific rate
      if (node.agentId) {
        const agentRate = historicalData.agentSuccessRates.get(node.agentId);
        if (agentRate !== undefined) {
          rate = rate * 0.6 + agentRate * 0.4; // Weighted blend
        }
      }

      // Adjust by capability-specific rate
      const capabilityRate = historicalData.capabilitySuccessRates.get(node.capability);
      if (capabilityRate !== undefined) {
        rate = rate * 0.7 + capabilityRate * 0.3; // Weighted blend
      }
    }

    return Math.max(0, Math.min(1, rate));
  }

  /**
   * Get adjusted latency for a node, incorporating historical data.
   */
  private getAdjustedLatency(
    node: SimulationTaskNode,
    historicalData?: HistoricalData,
  ): number {
    if (historicalData && node.agentId) {
      const avgLatency = historicalData.agentAvgLatencies.get(node.agentId);
      if (avgLatency !== undefined && avgLatency > 0) {
        return node.estimatedDurationMs * 0.5 + avgLatency * 0.5;
      }
    }
    return 0; // 0 means "use node's estimated duration"
  }

  /**
   * Get the most likely failure reason for the mission.
   */
  private getMostLikelyFailureReason(
    taskGraph: SimulationTaskGraph,
    nodeMap: Map<string, SimulationTaskNode>,
    historicalData?: HistoricalData,
  ): string {
    let lowestRate = 1;
    let lowestNode: SimulationTaskNode | null = null;

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

  /**
   * Build the critical path as an ordered sequence from start to end.
   */
  private buildCriticalPathOrder(
    criticalNodes: string[],
    predecessors: Map<string, string[]>,
    nodeMap: Map<string, SimulationTaskNode>,
  ): string[] {
    if (criticalNodes.length === 0) return [];

    const criticalSet = new Set(criticalNodes);
    const path: string[] = [];
    const visited = new Set<string>();

    // Find starting nodes (no critical predecessors)
    const findStart = (): string | null => {
      for (const nodeId of criticalNodes) {
        if (visited.has(nodeId)) continue;
        const preds = (predecessors.get(nodeId) ?? []).filter((p) => criticalSet.has(p));
        const unvisitedPreds = preds.filter((p) => !visited.has(p));
        if (unvisitedPreds.length === 0) {
          return nodeId;
        }
      }
      // If no clean start, pick first unvisited
      for (const nodeId of criticalNodes) {
        if (!visited.has(nodeId)) return nodeId;
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

  // ─── Private Helpers: Statistics ────────────────────────────────────

  /**
   * Calculate the percentile value from a sorted array.
   */
  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;
    if (sortedArray.length === 1) return sortedArray[0];

    const index = (p / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const fraction = index - lower;

    if (lower === upper) return sortedArray[lower];

    return sortedArray[lower] * (1 - fraction) + sortedArray[upper] * fraction;
  }

  // ─── Private Helpers: Resource Resolution ──────────────────────────

  /**
   * Suggest a resolution for a resource conflict.
   */
  private suggestResourceResolution(
    resource: string,
    required: number,
    available: number,
    nodeIds: string[],
    nodeMap: Map<string, SimulationTaskNode>,
  ): string {
    const deficit = required - available;
    const nodesUsingResource = nodeIds.filter((id) => {
      const node = nodeMap.get(id)!;
      return (node.resourceRequirements[resource] ?? 0) > 0;
    });

    if (nodesUsingResource.length <= 1) {
      return `Increase "${resource}" capacity by at least ${deficit.toFixed(1)} units, or reduce this task's resource requirement`;
    }

    return `Stagger execution of tasks ${nodesUsingResource.join(', ')} to reduce peak "${resource}" demand from ${required.toFixed(1)} to ≤${available.toFixed(1)}`;
  }

  // ─── Private Helpers: Scenario Comparison ──────────────────────────

  /**
   * Generate a recommendation for the best scenario variant.
   */
  private generateScenarioRecommendation(
    variations: ScenarioComparison['variations'],
  ): string {
    if (variations.length <= 1) {
      return 'No alternative scenarios to compare';
    }

    // Score each variation: weighted combination of success probability and cost efficiency
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < variations.length; i++) {
      const { result } = variations[i];
      // Score: high success, low cost, low risk, low duration
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

  // ─── Private Helpers: History ───────────────────────────────────────

  /**
   * Add a simulation result to the bounded history.
   */
  private addToHistory(result: SimulationResult): void {
    this.history.push(result);
    if (this.history.length > MAX_HISTORY_SIZE) {
      this.history.splice(0, this.history.length - MAX_HISTORY_SIZE);
    }
  }
}
