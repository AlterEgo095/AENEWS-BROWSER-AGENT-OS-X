/**
 * AENEWS Agent OS X - Long Horizon Planning Service
 * Enables missions with hierarchical multi-level planning:
 *   Mission → Sub-objectives → Sub-plans → Task Graph → Parallel Execution → Fusion → Validation
 *
 * The service decomposes mission-level goals into deeply nested planning hierarchies,
 * estimates resources, assesses risks, simulates execution, and fuses partial results
 * from parallel sub-plans into a unified outcome.
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

// ─── Type Definitions ──────────────────────────────────────────────

export enum PlanningLevelType {
  STRATEGIC = 'strategic',      // Top-level: mission goals, timeline, budget
  OPERATIONAL = 'operational',   // Mid-level: sub-objectives, milestones
  TACTICAL = 'tactical',         // Low-level: tasks, assignments
  EXECUTION = 'execution',       // Bottom: atomic actions
}

export interface PlanningLevel {
  level: number;
  type: PlanningLevelType;
  name: string;
  description: string;
  objectives: PlanningObjective[];
  subPlans: LongHorizonPlan[];
  taskGraph: TaskGraphSnapshot | null;
  dependencies: string[];        // IDs of other plans this depends on
  estimatedDurationMs: number;
  status: PlanStatus;
}

export enum PlanStatus {
  DRAFT = 'draft',
  SIMULATING = 'simulating',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVISED = 'revised',
}

export interface PlanningObjective {
  id: string;
  description: string;
  successCriteria: string[];
  priority: number;
  assignedTo: string[];           // Agent IDs
  dependencies: string[];         // Objective IDs
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface LongHorizonPlan {
  id: string;
  missionId: string;
  levels: PlanningLevel[];
  totalEstimatedDurationMs: number;
  resourceRequirements: ResourceRequirement[];
  riskAssessment: RiskAssessment;
  simulationResult: SimulationSnapshot | null;
  createdAt: Date;
  updatedAt: Date;
  status: PlanStatus;
}

export interface TaskGraphSnapshot {
  nodes: string[];
  edges: Array<{ from: string; to: string; type: string }>;
  criticalPathLength: number;
  parallelismFactor: number;
}

export interface ResourceRequirement {
  type: string;
  amount: number;
  unit: string;
  estimatedCost: number;
  timeWindow: { start: number; end: number }; // ms from plan start
}

export interface RiskAssessment {
  overallRisk: number;           // 0-1
  risks: RiskItem[];
  mitigations: string[];
}

export interface RiskItem {
  description: string;
  probability: number;
  impact: number;
  mitigation: string;
}

export interface SimulationSnapshot {
  estimatedSuccessRate: number;
  estimatedDurationMs: number;
  estimatedCost: number;
  bottlenecks: string[];
  resourceConflicts: string[];
}

// ─── Internal / Extended Types ──────────────────────────────────────

interface PlanConfig {
  maxDepth?: number;             // Maximum decomposition depth (default 4)
  defaultAgentId?: string;       // Fallback agent for assignments
  timeBudgetMs?: number;         // Overall time budget
  costBudget?: number;           // Overall cost budget
  monteCarloIterations?: number; // Simulation iterations (default 1000)
}

interface ExecutionBatch {
  batchIndex: number;
  objectiveIds: string[];
  levelIndices: number[];
  estimatedDurationMs: number;
  parallel: boolean;
}

interface TimelineEntry {
  objectiveId: string;
  description: string;
  levelType: PlanningLevelType;
  startOffsetMs: number;
  durationMs: number;
  dependencies: string[];
  status: PlanningObjective['status'];
}

interface PlanStatusSummary {
  planId: string;
  overallStatus: PlanStatus;
  levelSummaries: Array<{
    level: number;
    type: PlanningLevelType;
    name: string;
    status: PlanStatus;
    totalObjectives: number;
    completedObjectives: number;
    failedObjectives: number;
    progress: number;
  }>;
  overallProgress: number;
}

interface FusionResult {
  planId: string;
  mergedObjectives: PlanningObjective[];
  conflicts: Array<{
    objectiveIds: string[];
    description: string;
    resolution: string;
  }>;
  unifiedStatus: PlanStatus;
  aggregatedMetrics: {
    totalCompleted: number;
    totalFailed: number;
    totalPending: number;
    successRate: number;
    estimatedRemainingMs: number;
  };
}

// ─── Constants ──────────────────────────────────────────────────────

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

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class LongHorizonPlanningService {
  private readonly logger = new Logger(LongHorizonPlanningService.name);

  /** In-memory plan store: planId -> LongHorizonPlan */
  private readonly plans: Map<string, LongHorizonPlan> = new Map();

  /** Objective index for fast lookup: objectiveId -> { planId, levelIndex } */
  private readonly objectiveIndex: Map<string, { planId: string; levelIndex: number }> = new Map();

  // ─── 1. createPlan ────────────────────────────────────────────────

  /**
   * Create a new long-horizon plan. Auto-decomposes the mission description
   * into hierarchical levels: Strategic → Operational → Tactical → Execution.
   *
   * @param missionId       The mission this plan belongs to
   * @param missionDescription  Natural language description of the mission
   * @param config          Optional planning configuration
   * @returns LongHorizonPlan  The newly created plan with all levels
   */
  createPlan(
    missionId: string,
    missionDescription: string,
    config?: PlanConfig,
  ): LongHorizonPlan {
    const maxDepth = config?.maxDepth ?? DEFAULT_MAX_DEPTH;
    const planId = uuidv4();

    this.logger.log(`Creating plan ${planId} for mission ${missionId}`);

    // Step 1: Parse the mission description into strategic objectives
    const strategicObjectives = this.parseMissionToObjectives(missionDescription, 1);

    // Step 2: Create the strategic (top) level
    const strategicLevel: PlanningLevel = {
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

    // Step 3: Recursively decompose into deeper levels
    const levels: PlanningLevel[] = [strategicLevel];
    for (let depth = 1; depth < maxDepth; depth++) {
      const parentLevel = levels[depth - 1];
      const levelType = this.getLevelTypeForDepth(depth);
      const levelName = this.getLevelNameForType(levelType);

      const levelObjectives: PlanningObjective[] = [];
      for (const parentObj of parentLevel.objectives) {
        const decomposed = this.decomposeObjective(parentObj, depth);
        levelObjectives.push(...decomposed);
      }

      if (levelObjectives.length === 0) {
        break; // No further decomposition possible
      }

      const childLevel: PlanningLevel = {
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

    // Step 4: Build initial task graph for the execution level
    const executionLevel = levels.find(
      (l) => l.type === PlanningLevelType.EXECUTION,
    );
    if (executionLevel) {
      executionLevel.taskGraph = this.buildTaskGraph(executionLevel.objectives);
    }

    // Step 5: Calculate totals
    const totalEstimatedDurationMs = this.calculateTotalDuration(levels);
    const resourceRequirements = this.estimateLevelResources(levels);
    const riskAssessment = this.assessLevelRisks(levels, resourceRequirements);

    const plan: LongHorizonPlan = {
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

    // Store and index
    this.plans.set(planId, plan);
    this.rebuildObjectiveIndex(plan);

    this.logger.log(
      `Plan ${planId} created with ${levels.length} levels, ` +
        `${this.countTotalObjectives(plan)} total objectives`,
    );

    return { ...plan };
  }

  // ─── 2. decomposeObjective ────────────────────────────────────────

  /**
   * Recursively decompose an objective into sub-objectives using heuristics:
   * split by conjunctions, temporal markers, and resource boundaries.
   *
   * @param objective  The parent objective to decompose
   * @param depth      Current decomposition depth
   * @returns PlanningObjective[]  Array of child objectives
   */
  decomposeObjective(objective: PlanningObjective, depth: number): PlanningObjective[] {
    this.logger.debug?.(
      `Decomposing objective "${objective.description}" at depth ${depth}`,
    );

    const description = objective.description;
    const subDescriptions: string[] = [];

    // Heuristic 1: Split by conjunction markers
    let parts = this.splitByMarkers(description, CONJUNCTION_MARKERS);

    // Heuristic 2: If only one part, try temporal markers
    if (parts.length <= 1) {
      parts = this.splitByMarkers(description, TEMPORAL_MARKERS.map((m) => ` ${m} `));
    }

    // Heuristic 3: If still only one part, try resource boundaries
    if (parts.length <= 1) {
      parts = this.splitByMarkers(description, RESOURCE_BOUNDARIES.map((m) => ` ${m} `));
    }

    // Heuristic 4: If all heuristics fail, split by sentence boundaries
    if (parts.length <= 1) {
      parts = description.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    }

    // Filter out empty or trivial parts
    subDescriptions.push(...parts.filter((s) => s.trim().length > 5));

    // If decomposition yielded nothing meaningful, create a single execution task
    if (subDescriptions.length === 0) {
      subDescriptions.push(`Execute: ${description}`);
    }

    const subObjectives: PlanningObjective[] = subDescriptions.map((desc, index) => {
      const id = uuidv4();
      return {
        id,
        description: desc.trim(),
        successCriteria: this.inferSuccessCriteria(desc),
        priority: Math.max(1, objective.priority - 1),
        assignedTo: [...objective.assignedTo],
        dependencies: index > 0 ? [subObjectives[index - 1]?.id ?? objective.id].filter(Boolean) : [],
        status: 'pending' as const,
      };
    });

    // Link all sub-objectives back to parent as dependency chain root
    if (subObjectives.length > 0 && subObjectives[0]) {
      subObjectives[0].dependencies = [objective.id];
    }

    return subObjectives;
  }

  // ─── 3. addLevel ──────────────────────────────────────────────────

  /**
   * Add a planning level to an existing plan.
   *
   * @param planId  The plan to modify
   * @param level   The new level to add
   */
  addLevel(planId: string, level: PlanningLevel): void {
    const plan = this.getPlanInternal(planId);
    if (!plan) {
      throw new Error(`Plan with id "${planId}" not found`);
    }

    // Re-index levels to maintain ordering
    const insertAt = level.level;
    level.level = insertAt;

    // Shift existing levels at or past the insertion point
    for (const existingLevel of plan.levels) {
      if (existingLevel.level >= insertAt) {
        existingLevel.level += 1;
      }
    }

    plan.levels.push(level);
    plan.levels.sort((a, b) => a.level - b.level);

    // Recalculate totals
    plan.totalEstimatedDurationMs = this.calculateTotalDuration(plan.levels);
    plan.updatedAt = new Date();

    this.rebuildObjectiveIndex(plan);

    this.logger.log(
      `Level "${level.name}" added to plan ${planId} at position ${insertAt}`,
    );
  }

  // ─── 4. refineLevel ───────────────────────────────────────────────

  /**
   * Refine a planning level by expanding objectives into sub-plans
   * with more detail. Creates sub-plans for each objective at the
   * specified level.
   *
   * @param planId     The plan to refine
   * @param levelIndex The level index to refine
   * @returns PlanningLevel  The refined level
   */
  refineLevel(planId: string, levelIndex: number): PlanningLevel {
    const plan = this.getPlanInternal(planId);
    if (!plan) {
      throw new Error(`Plan with id "${planId}" not found`);
    }

    const level = plan.levels.find((l) => l.level === levelIndex);
    if (!level) {
      throw new Error(`Level ${levelIndex} not found in plan ${planId}`);
    }

    this.logger.log(`Refining level ${levelIndex} ("${level.name}") of plan ${planId}`);

    // For each objective, create a sub-plan
    for (const objective of level.objectives) {
      if (objective.status === 'completed') {
        continue; // Skip completed objectives
      }

      const subPlanId = uuidv4();
      const subObjectives = this.decomposeObjective(objective, levelIndex + 1);

      const subPlan: LongHorizonPlan = {
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
        resourceRequirements: this.estimateLevelResources([{ objectives: subObjectives } as PlanningLevel]),
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

      // Store the sub-plan
      this.plans.set(subPlanId, subPlan);
      level.subPlans.push(subPlan);
    }

    // Recalculate totals for parent plan
    level.estimatedDurationMs = this.calculateLevelDuration(level);
    plan.totalEstimatedDurationMs = this.calculateTotalDuration(plan.levels);
    plan.resourceRequirements = this.estimateLevelResources(plan.levels);
    plan.riskAssessment = this.assessLevelRisks(plan.levels, plan.resourceRequirements);
    plan.updatedAt = new Date();

    this.rebuildObjectiveIndex(plan);

    return { ...level };
  }

  // ─── 5. buildExecutionOrder ───────────────────────────────────────

  /**
   * Convert the hierarchical plan into a flat execution order
   * respecting all dependencies, including cross-level ones.
   * Returns an array of execution batches where each batch
   * contains objectives that can run in parallel.
   *
   * @param planId  The plan to build execution order for
   * @returns ExecutionBatch[]  Ordered batches of parallelizable objectives
   */
  buildExecutionOrder(planId: string): ExecutionBatch[] {
    const plan = this.getPlanInternal(planId);
    if (!plan) {
      throw new Error(`Plan with id "${planId}" not found`);
    }

    // Flatten all objectives with their level context
    const allObjectives: Array<{
      objective: PlanningObjective;
      levelIndex: number;
    }> = [];

    for (const level of plan.levels) {
      for (const obj of level.objectives) {
        allObjectives.push({ objective: obj, levelIndex: level.level });
      }
    }

    // Also include objectives from sub-plans
    for (const level of plan.levels) {
      for (const subPlan of level.subPlans) {
        for (const subLevel of subPlan.levels) {
          for (const obj of subLevel.objectives) {
            allObjectives.push({ objective: obj, levelIndex: level.level });
          }
        }
      }
    }

    // Build dependency graph
    const objMap = new Map<string, { objective: PlanningObjective; levelIndex: number }>();
    for (const entry of allObjectives) {
      objMap.set(entry.objective.id, entry);
    }

    // Topological sort into batches (Kahn's algorithm)
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>(); // what depends on this

    for (const entry of allObjectives) {
      const id = entry.objective.id;
      if (!inDegree.has(id)) {
        inDegree.set(id, 0);
      }
      if (!dependents.has(id)) {
        dependents.set(id, []);
      }

      for (const depId of entry.objective.dependencies) {
        // Only count dependencies that exist in our set
        if (objMap.has(depId)) {
          inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
          if (!dependents.has(depId)) {
            dependents.set(depId, []);
          }
          dependents.get(depId)!.push(id);
        }
      }
    }

    // Process in batches
    const batches: ExecutionBatch[] = [];
    const processed = new Set<string>();
    let remaining = allObjectives.length;

    while (remaining > 0) {
      // Find all objectives with in-degree 0 that haven't been processed
      const readyIds: string[] = [];
      for (const [id, degree] of inDegree) {
        if (degree === 0 && !processed.has(id)) {
          readyIds.push(id);
        }
      }

      if (readyIds.length === 0) {
        // Circular dependency detected — break by picking lowest in-degree
        let minDegree = Infinity;
        let minId: string | null = null;
        for (const [id, degree] of inDegree) {
          if (!processed.has(id) && degree < minDegree) {
            minDegree = degree;
            minId = id;
          }
        }
        if (minId) {
          this.logger.warn(
            `Circular dependency detected in plan ${planId}; breaking at objective ${minId}`,
          );
          readyIds.push(minId);
        } else {
          break; // Nothing left
        }
      }

      const batch: ExecutionBatch = {
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
          batch.estimatedDurationMs += entry.objective.priority; // Weighted by priority
        }

        // Reduce in-degree of dependents
        const deps = dependents.get(id) ?? [];
        for (const depId of deps) {
          inDegree.set(depId, Math.max(0, (inDegree.get(depId) ?? 1) - 1));
        }
      }

      // Estimate duration: max of parallel tasks, not sum
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

    this.logger.log(
      `Built execution order for plan ${planId}: ${batches.length} batches, ` +
        `${allObjectives.length} total objectives`,
    );

    return batches;
  }

  // ─── 6. estimateResources ─────────────────────────────────────────

  /**
   * Calculate total resource requirements across all levels.
   * Aggregates from sub-plans and identifies resource conflicts
   * (same resource needed at the same time by different sub-plans).
   *
   * @param planId  The plan to estimate resources for
   * @returns ResourceRequirement[]  Aggregated resource requirements
   */
  estimateResources(planId: string): ResourceRequirement[] {
    const plan = this.getPlanInternal(planId);
    if (!plan) {
      throw new Error(`Plan with id "${planId}" not found`);
    }

    const allResources = this.estimateLevelResources(plan.levels);

    // Aggregate sub-plan resources
    for (const level of plan.levels) {
      for (const subPlan of level.subPlans) {
        const subResources = this.estimateLevelResources(subPlan.levels);
        allResources.push(...subResources);
      }
    }

    // Merge overlapping resource requirements of the same type
    const merged = this.mergeResourceRequirements(allResources);

    // Detect conflicts: same resource type needed at overlapping time windows
    const conflicts = this.detectResourceConflicts(merged);
    if (conflicts.length > 0) {
      this.logger.warn(
        `Resource conflicts detected in plan ${planId}: ${conflicts.join('; ')}`,
      );
    }

    // Update plan
    plan.resourceRequirements = merged;
    plan.updatedAt = new Date();

    return merged;
  }

  // ─── 7. assessRisks ───────────────────────────────────────────────

  /**
   * Identify risks at each level:
   * - Dependency risks (long dependency chains)
   * - Resource risks (conflicts)
   * - Timing risks (critical path too long)
   * - Capability risks (required capabilities not available)
   *
   * @param planId  The plan to assess risks for
   * @returns RiskAssessment  Comprehensive risk assessment
   */
  assessRisks(planId: string): RiskAssessment {
    const plan = this.getPlanInternal(planId);
    if (!plan) {
      throw new Error(`Plan with id "${planId}" not found`);
    }

    const risks: RiskItem[] = [];
    const mitigations: string[] = [];

    // 1. Dependency risks — long chains increase failure probability
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

    // 2. Resource conflicts
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

    // 3. Timing risks — critical path analysis
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

    // 4. Per-level risk analysis
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

      // Cross-level dependency risk
      if (level.dependencies.length > 3) {
        risks.push({
          description: `High cross-level dependency count (${level.dependencies.length}) at level "${level.name}"`,
          probability: 0.35,
          impact: 0.5,
          mitigation: 'Reduce dependencies by making sub-plans more self-contained',
        });
      }
    }

    // 5. Capability risks — agents assigned to many objectives
    const agentLoad = new Map<string, number>();
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

    // Calculate overall risk score
    const overallRisk = risks.length > 0
      ? Math.min(
          1,
          risks.reduce((sum, r) => sum + r.probability * r.impact, 0) / Math.max(1, risks.length),
        )
      : 0.1;

    const assessment: RiskAssessment = {
      overallRisk,
      risks,
      mitigations: [...new Set(mitigations)], // Deduplicate
    };

    // Update plan
    plan.riskAssessment = assessment;
    plan.updatedAt = new Date();

    this.logger.log(
      `Risk assessment for plan ${planId}: overallRisk=${overallRisk.toFixed(3)}, ${risks.length} risks identified`,
    );

    return assessment;
  }

  // ─── 8. simulateExecution ─────────────────────────────────────────

  /**
   * Run a Monte Carlo-style simulation of the plan execution.
   * For each level, estimates success based on historical success rates.
   * Calculates P50/P90 completion times and identifies bottlenecks.
   *
   * @param planId  The plan to simulate
   * @returns SimulationSnapshot  Simulation results
   */
  simulateExecution(planId: string): SimulationSnapshot {
    const plan = this.getPlanInternal(planId);
    if (!plan) {
      throw new Error(`Plan with id "${planId}" not found`);
    }

    const previousStatus = plan.status;
    plan.status = PlanStatus.SIMULATING;
    plan.updatedAt = new Date();

    const iterations = 1000; // Monte Carlo iterations
    const completionTimes: number[] = [];
    const completionCosts: number[] = [];
    const successCount = { value: 0 };
    const bottleneckFrequency = new Map<string, number>();

    for (let i = 0; i < iterations; i++) {
      let totalTime = 0;
      let totalCost = 0;
      let planSucceeded = true;
      let currentBottleneck: string | null = null;

      for (const level of plan.levels) {
        // Simulate each objective in this level
        let levelTime = 0;
        let levelFailed = false;

        for (const objective of level.objectives) {
          // Success probability based on objective complexity and depth
          const complexityFactor = Math.max(0.5, 1 - objective.description.length / 500);
          const depthFactor = Math.max(0.6, 1 - level.level * 0.1);
          const successProb = HISTORICAL_BASE_SUCCESS_RATE * complexityFactor * depthFactor;

          if (Math.random() > successProb) {
            levelFailed = true;
            currentBottleneck = objective.id;

            // Partial time even on failure
            const estimatedDuration = this.estimateSingleObjectiveDuration(objective);
            const failurePoint = 0.3 + Math.random() * 0.5; // Fail 30-80% through
            levelTime += estimatedDuration * failurePoint;

            // Retry with 50% chance of success
            if (Math.random() < 0.5) {
              levelTime += estimatedDuration * 0.3; // Retry overhead
            } else {
              planSucceeded = false;
            }
          } else {
            const baseDuration = this.estimateSingleObjectiveDuration(objective);
            const variance = baseDuration * DURATION_VARIANCE_FACTOR;
            const actualDuration = baseDuration + (Math.random() - 0.5) * 2 * variance;
            levelTime += Math.max(baseDuration * 0.5, actualDuration);
          }

          // Cost estimation per objective
          totalCost += this.estimateSingleObjectiveCost(objective);
        }

        // Account for parallelism within a level
        const parallelism = level.taskGraph?.parallelismFactor ?? Math.max(1, level.objectives.length / 3);
        levelTime = levelTime / parallelism;

        totalTime += levelTime;

        if (levelFailed && currentBottleneck) {
          bottleneckFrequency.set(
            currentBottleneck,
            (bottleneckFrequency.get(currentBottleneck) ?? 0) + 1,
          );
        }
      }

      completionTimes.push(totalTime);
      completionCosts.push(totalCost);
      if (planSucceeded) {
        successCount.value++;
      }
    }

    // Calculate statistics
    completionTimes.sort((a, b) => a - b);
    completionCosts.sort((a, b) => a - b);

    const p50Time = completionTimes[Math.floor(iterations * 0.5)];
    const p90Time = completionTimes[Math.floor(iterations * 0.9)];
    const p50Cost = completionCosts[Math.floor(iterations * 0.5)];

    // Identify top bottlenecks (those that failed most frequently)
    const bottlenecks = Array.from(bottleneckFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        // Find objective description
        for (const level of plan.levels) {
          const obj = level.objectives.find((o) => o.id === id);
          if (obj) {
            return `${obj.description} (failed ${count}/${iterations} times)`;
          }
        }
        return `Objective ${id} (failed ${count}/${iterations} times)`;
      });

    // Detect resource conflicts from plan
    const resourceConflicts = this.detectResourceConflicts(plan.resourceRequirements);

    const snapshot: SimulationSnapshot = {
      estimatedSuccessRate: successCount.value / iterations,
      estimatedDurationMs: p50Time,
      estimatedCost: p50Cost,
      bottlenecks,
      resourceConflicts,
    };

    // Update plan
    plan.simulationResult = snapshot;
    plan.status = previousStatus === PlanStatus.SIMULATING ? PlanStatus.READY : previousStatus;
    plan.totalEstimatedDurationMs = p90Time; // Use P90 for planning
    plan.updatedAt = new Date();

    this.logger.log(
      `Simulation complete for plan ${planId}: ` +
        `successRate=${snapshot.estimatedSuccessRate.toFixed(3)}, ` +
        `P50=${p50Time}ms, P90=${p90Time}ms, ` +
        `bottlenecks=${bottlenecks.length}`,
    );

    return snapshot;
  }

  // ─── 9. revisePlan ────────────────────────────────────────────────

  /**
   * Revise a plan based on execution feedback. Re-decomposes failed
   * objectives, adjusts estimates, and updates the risk assessment.
   *
   * @param planId    The plan to revise
   * @param feedback  Execution feedback (objective results, issues, etc.)
   * @returns LongHorizonPlan  The revised plan
   */
  revisePlan(
    planId: string,
    feedback: {
      completedObjectives?: string[];
      failedObjectives?: string[];
      partialResults?: Record<string, any>;
      issues?: string[];
      adjustedEstimates?: Record<string, { durationMs?: number; cost?: number }>;
    },
  ): LongHorizonPlan {
    const plan = this.getPlanInternal(planId);
    if (!plan) {
      throw new Error(`Plan with id "${planId}" not found`);
    }

    this.logger.log(`Revising plan ${planId} based on execution feedback`);

    // 1. Mark completed objectives
    for (const objId of feedback.completedObjectives ?? []) {
      this.updateObjectiveStatus(plan, objId, 'completed');
    }

    // 2. Handle failed objectives — re-decompose them
    for (const objId of feedback.failedObjectives ?? []) {
      this.updateObjectiveStatus(plan, objId, 'failed');

      // Find the failed objective and re-decompose
      for (const level of plan.levels) {
        const failedObj = level.objectives.find((o) => o.id === objId);
        if (failedObj) {
          // Create alternative decomposition
          const alternativeObjectives = this.decomposeObjective(
            {
              ...failedObj,
              description: `Alternative approach: ${failedObj.description}`,
              id: uuidv4(),
              status: 'pending',
            },
            level.level + 1,
          );

          // Add alternatives to the next level down
          const nextLevel = plan.levels.find((l) => l.level === level.level + 1);
          if (nextLevel) {
            nextLevel.objectives.push(...alternativeObjectives);
          } else {
            // Create a new level for the alternatives
            const newLevel: PlanningLevel = {
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

    // 3. Apply adjusted estimates if provided
    if (feedback.adjustedEstimates) {
      for (const [objId, adjustments] of Object.entries(feedback.adjustedEstimates)) {
        for (const level of plan.levels) {
          const obj = level.objectives.find((o) => o.id === objId);
          if (obj && adjustments.durationMs) {
            // Update is implicit — we use estimates dynamically
            this.logger.debug?.(
              `Adjusted estimate for objective ${objId}: ${adjustments.durationMs}ms`,
            );
          }
        }
      }
    }

    // 4. Add issues as new risk items
    for (const issue of feedback.issues ?? []) {
      plan.riskAssessment.risks.push({
        description: issue,
        probability: 0.6,
        impact: 0.5,
        mitigation: 'Monitor and escalate if persists',
      });
    }

    // 5. Recalculate everything
    plan.totalEstimatedDurationMs = this.calculateTotalDuration(plan.levels);
    plan.resourceRequirements = this.estimateLevelResources(plan.levels);
    plan.riskAssessment = this.assessLevelRisks(plan.levels, plan.resourceRequirements);
    plan.status = PlanStatus.REVISED;
    plan.updatedAt = new Date();

    this.rebuildObjectiveIndex(plan);

    this.logger.log(
      `Plan ${planId} revised: status=REVISED, ` +
        `${this.countTotalObjectives(plan)} objectives, ` +
        `${plan.riskAssessment.risks.length} risks`,
    );

    return { ...plan };
  }

  // ─── 10. getPlan ──────────────────────────────────────────────────

  /**
   * Get the full plan by ID.
   *
   * @param planId  The plan ID
   * @returns LongHorizonPlan | null  The plan, or null if not found
   */
  getPlan(planId: string): LongHorizonPlan | null {
    const plan = this.plans.get(planId);
    return plan ? { ...plan } : null;
  }

  // ─── 11. getPlanStatus ────────────────────────────────────────────

  /**
   * Get a status summary with progress per level.
   *
   * @param planId  The plan ID
   * @returns PlanStatusSummary  Status summary
   */
  getPlanStatus(planId: string): PlanStatusSummary {
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

  // ─── 12. getExecutionTimeline ─────────────────────────────────────

  /**
   * Get a Gantt-like timeline representation of the plan.
   *
   * @param planId  The plan ID
   * @returns TimelineEntry[]  Ordered timeline entries
   */
  getExecutionTimeline(planId: string): TimelineEntry[] {
    const plan = this.getPlanInternal(planId);
    if (!plan) {
      throw new Error(`Plan with id "${planId}" not found`);
    }

    const batches = this.buildExecutionOrder(planId);
    const timeline: TimelineEntry[] = [];
    let currentOffset = 0;

    // Build a map of objective -> level
    const objLevelMap = new Map<string, PlanningLevelType>();
    for (const level of plan.levels) {
      for (const obj of level.objectives) {
        objLevelMap.set(obj.id, level.type);
      }
    }

    for (const batch of batches) {
      let maxBatchDuration = 0;

      for (const objId of batch.objectiveIds) {
        // Find the objective
        let objective: PlanningObjective | null = null;
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

  // ─── 13. fusion ───────────────────────────────────────────────────

  /**
   * Fuse partial execution results from parallel sub-plans.
   * Resolves conflicts between results, merges into a unified result.
   *
   * @param planId          The plan ID
   * @param partialResults  Map of objective ID to partial result
   * @returns FusionResult  The fused result
   */
  fusion(
    planId: string,
    partialResults: Map<string, { status: PlanningObjective['status']; output?: any }>,
  ): FusionResult {
    const plan = this.getPlanInternal(planId);
    if (!plan) {
      throw new Error(`Plan with id "${planId}" not found`);
    }

    this.logger.log(
      `Fusing ${partialResults.size} partial results for plan ${planId}`,
    );

    const mergedObjectives: PlanningObjective[] = [];
    const conflicts: FusionResult['conflicts'] = [];

    // Apply partial results to objectives
    for (const level of plan.levels) {
      for (const objective of level.objectives) {
        const result = partialResults.get(objective.id);
        if (result) {
          // Update status from partial result
          objective.status = result.status;
        }
        mergedObjectives.push({ ...objective });
      }
    }

    // Also process sub-plan objectives
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

    // Detect conflicts: multiple objectives with overlapping outcomes
    const completedByDescription = new Map<string, string[]>();
    for (const obj of mergedObjectives) {
      const key = this.canonicalizeDescription(obj.description);
      if (!completedByDescription.has(key)) {
        completedByDescription.set(key, []);
      }
      completedByDescription.get(key)!.push(obj.id);
    }

    for (const [description, objIds] of completedByDescription) {
      if (objIds.length > 1) {
        // Check if they have conflicting statuses
        const statuses = objIds
          .map((id) => mergedObjectives.find((o) => o.id === id)?.status)
          .filter(Boolean);
        const uniqueStatuses = new Set(statuses);

        if (uniqueStatuses.size > 1) {
          // Conflict: same logical objective has different outcomes
          const resolution = this.resolveConflict(objIds, mergedObjectives);
          conflicts.push({
            objectiveIds: objIds,
            description: `Conflicting outcomes for: ${description}`,
            resolution,
          });
        }
      }
    }

    // Also detect temporal conflicts (same agent assigned to overlapping tasks)
    const agentAssignments = new Map<string, PlanningObjective[]>();
    for (const obj of mergedObjectives) {
      for (const agentId of obj.assignedTo) {
        if (!agentAssignments.has(agentId)) {
          agentAssignments.set(agentId, []);
        }
        agentAssignments.get(agentId)!.push(obj);
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

    // Calculate aggregated metrics
    const totalCompleted = mergedObjectives.filter((o) => o.status === 'completed').length;
    const totalFailed = mergedObjectives.filter((o) => o.status === 'failed').length;
    const totalPending = mergedObjectives.filter((o) => o.status === 'pending').length;
    const totalObjectives = mergedObjectives.length;

    const successRate = totalObjectives > 0 ? totalCompleted / totalObjectives : 0;

    // Estimate remaining time from pending objectives
    let estimatedRemainingMs = 0;
    for (const obj of mergedObjectives) {
      if (obj.status === 'pending' || obj.status === 'in_progress') {
        estimatedRemainingMs += this.estimateSingleObjectiveDuration(obj);
      }
    }

    // Determine unified status
    let unifiedStatus: PlanStatus;
    if (totalFailed > totalObjectives * 0.5) {
      unifiedStatus = PlanStatus.FAILED;
    } else if (totalCompleted === totalObjectives) {
      unifiedStatus = PlanStatus.COMPLETED;
    } else if (totalCompleted > 0 || partialResults.size > 0) {
      unifiedStatus = PlanStatus.IN_PROGRESS;
    } else {
      unifiedStatus = plan.status;
    }

    // Update plan
    plan.status = unifiedStatus;
    plan.updatedAt = new Date();

    const result: FusionResult = {
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

    this.logger.log(
      `Fusion complete for plan ${planId}: ` +
        `${totalCompleted}/${totalObjectives} completed, ` +
        `${totalFailed} failed, ${conflicts.length} conflicts, ` +
        `status=${unifiedStatus}`,
    );

    return result;
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Internal plan getter that returns the mutable reference.
   */
  private getPlanInternal(planId: string): LongHorizonPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Parse a mission description into a set of strategic objectives.
   * Uses sentence boundary detection and keyword analysis.
   */
  private parseMissionToObjectives(description: string, priority: number): PlanningObjective[] {
    // Split by sentence boundaries
    const sentences = description
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    if (sentences.length === 0) {
      // Single objective for the entire description
      sentences.push(description);
    }

    return sentences.map((sentence, index) => ({
      id: uuidv4(),
      description: sentence,
      successCriteria: this.inferSuccessCriteria(sentence),
      priority: Math.max(1, priority - Math.floor(index / 3)),
      assignedTo: [],
      dependencies: index > 0 ? [sentences.length > 1 ? 'prev' : ''].filter(Boolean) : [],
      status: 'pending' as const,
    }));
  }

  /**
   * Infer success criteria from an objective description.
   */
  private inferSuccessCriteria(description: string): string[] {
    const criteria: string[] = [];

    // Look for quantifiable targets
    const numberMatches = description.match(/\d+(\.\d+)?%?/g);
    if (numberMatches) {
      for (const match of numberMatches) {
        criteria.push(`Target metric: ${match}`);
      }
    }

    // Look for action verbs
    const actionVerbs = [
      'create', 'build', 'deploy', 'implement', 'design', 'test',
      'verify', 'validate', 'optimize', 'migrate', 'configure',
    ];
    for (const verb of actionVerbs) {
      if (description.toLowerCase().includes(verb)) {
        criteria.push(`${verb} completed successfully`);
      }
    }

    // Default criterion if none inferred
    if (criteria.length === 0) {
      criteria.push('Objective completed without errors');
    }

    return criteria;
  }

  /**
   * Split a description by a set of marker strings.
   * Returns the parts between markers.
   */
  private splitByMarkers(description: string, markers: string[]): string[] {
    let parts = [description];

    for (const marker of markers) {
      const newParts: string[] = [];
      for (const part of parts) {
        const splits = part.split(marker);
        if (splits.length > 1) {
          newParts.push(...splits);
        } else {
          newParts.push(part);
        }
      }
      parts = newParts;
      if (parts.length > 4) break; // Limit granularity
    }

    return parts.map((p) => p.trim()).filter((p) => p.length > 0);
  }

  /**
   * Map depth to planning level type.
   */
  private getLevelTypeForDepth(depth: number): PlanningLevelType {
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

  /**
   * Get a human-readable name for a level type.
   */
  private getLevelNameForType(type: PlanningLevelType): string {
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

  /**
   * Infer cross-level dependencies between objectives.
   * Simple heuristic: sequential objectives depend on the previous one.
   */
  private inferCrossLevelDependencies(objectives: PlanningObjective[]): string[] {
    const deps: string[] = [];
    for (const obj of objectives) {
      if (obj.dependencies.length > 0) {
        deps.push(...obj.dependencies);
      }
    }
    return [...new Set(deps)];
  }

  /**
   * Build a task graph snapshot from a set of objectives.
   */
  private buildTaskGraph(objectives: PlanningObjective[]): TaskGraphSnapshot {
    const nodes = objectives.map((o) => o.id);
    const edges: Array<{ from: string; to: string; type: string }> = [];

    for (const obj of objectives) {
      for (const depId of obj.dependencies) {
        if (nodes.includes(depId)) {
          edges.push({ from: depId, to: obj.id, type: 'dependency' });
        }
      }
    }

    // Calculate critical path length (longest path in the DAG)
    const criticalPathLength = this.calculateGraphCriticalPath(nodes, edges);

    // Calculate parallelism factor
    const maxDepth = this.calculateMaxDependencyDepth(objectives);
    const parallelismFactor =
      objectives.length > 0 ? Math.max(1, objectives.length / Math.max(1, maxDepth)) : 1;

    return {
      nodes,
      edges,
      criticalPathLength,
      parallelismFactor: Math.round(parallelismFactor * 100) / 100,
    };
  }

  /**
   * Calculate the critical path length in a graph.
   */
  private calculateGraphCriticalPath(
    nodes: string[],
    edges: Array<{ from: string; to: string; type: string }>,
  ): number {
    if (nodes.length === 0) return 0;

    // Build adjacency list for longest path computation
    const adj = new Map<string, string[]>();
    for (const node of nodes) {
      adj.set(node, []);
    }
    for (const edge of edges) {
      adj.get(edge.from)?.push(edge.to);
    }

    // DFS to find the longest path
    const memo = new Map<string, number>();
    const dfs = (node: string): number => {
      if (memo.has(node)) return memo.get(node)!;
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

  /**
   * Calculate maximum dependency depth among objectives.
   */
  private calculateMaxDependencyDepth(objectives: PlanningObjective[]): number {
    const objMap = new Map<string, PlanningObjective>();
    for (const obj of objectives) {
      objMap.set(obj.id, obj);
    }

    const depthCache = new Map<string, number>();
    const getDepth = (obj: PlanningObjective): number => {
      if (depthCache.has(obj.id)) return depthCache.get(obj.id)!;
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

  /**
   * Estimate the total duration for a set of objectives.
   * Accounts for parallelism based on dependency structure.
   */
  private estimateObjectiveDuration(objectives: PlanningObjective[]): number {
    if (objectives.length === 0) return 0;

    const totalSerialDuration = objectives.reduce(
      (sum, obj) => sum + this.estimateSingleObjectiveDuration(obj),
      0,
    );

    // Factor in parallelism
    const maxDepth = this.calculateMaxDependencyDepth(objectives);
    const parallelism = Math.max(1, objectives.length / Math.max(1, maxDepth));

    return Math.round(totalSerialDuration / parallelism);
  }

  /**
   * Estimate duration for a single objective based on its characteristics.
   */
  private estimateSingleObjectiveDuration(objective: PlanningObjective): number {
    // Base duration: 5 minutes per objective, scaled by complexity
    const baseDuration = 5 * 60 * 1000; // 5 minutes in ms

    // Complexity factors
    const descriptionLength = objective.description.length;
    const complexityMultiplier = 1 + Math.min(descriptionLength / 200, 3); // 1x to 4x

    // Criteria count adds time
    const criteriaMultiplier = 1 + objective.successCriteria.length * 0.1;

    // Priority increases focus (slightly faster for high priority)
    const priorityMultiplier = 1.2 - objective.priority * 0.05;

    return Math.round(baseDuration * complexityMultiplier * criteriaMultiplier * Math.max(0.5, priorityMultiplier));
  }

  /**
   * Estimate cost for a single objective.
   */
  private estimateSingleObjectiveCost(objective: PlanningObjective): number {
    // Base cost: $0.10 per objective, scaled by complexity
    const baseCost = 0.10;
    const complexityMultiplier = 1 + Math.min(objective.description.length / 300, 2);
    const criteriaMultiplier = 1 + objective.successCriteria.length * 0.05;
    return baseCost * complexityMultiplier * criteriaMultiplier;
  }

  /**
   * Calculate total duration across all levels.
   */
  private calculateTotalDuration(levels: PlanningLevel[]): number {
    return levels.reduce((sum, level) => {
      // If the level has sub-plans, use the max of the level and its sub-plans
      const subPlanDuration = level.subPlans.reduce(
        (spSum, sp) => spSum + sp.totalEstimatedDurationMs,
        0,
      );
      return sum + Math.max(level.estimatedDurationMs, subPlanDuration);
    }, 0);
  }

  /**
   * Calculate duration for a single level including sub-plans.
   */
  private calculateLevelDuration(level: PlanningLevel): number {
    const subPlanDuration = level.subPlans.reduce(
      (sum, sp) => sum + sp.totalEstimatedDurationMs,
      0,
    );
    return Math.max(level.estimatedDurationMs, subPlanDuration);
  }

  /**
   * Estimate resource requirements for an array of levels.
   */
  private estimateLevelResources(levels: PlanningLevel[]): ResourceRequirement[] {
    const resources: ResourceRequirement[] = [];
    let timeOffset = 0;

    for (const level of levels) {
      const objectiveCount = level.objectives.length;
      if (objectiveCount === 0) continue;

      const levelDuration = level.estimatedDurationMs;

      // LLM compute resource
      resources.push({
        type: 'llm_compute',
        amount: objectiveCount * 2,
        unit: 'api_calls',
        estimatedCost: objectiveCount * 0.05,
        timeWindow: { start: timeOffset, end: timeOffset + levelDuration },
      });

      // Worker time
      resources.push({
        type: 'worker_time',
        amount: levelDuration / 1000 / 60, // minutes
        unit: 'minutes',
        estimatedCost: (levelDuration / 1000 / 60) * 0.01,
        timeWindow: { start: timeOffset, end: timeOffset + levelDuration },
      });

      // Memory (if many parallel objectives)
      if (objectiveCount > 3) {
        resources.push({
          type: 'memory',
          amount: objectiveCount * 256,
          unit: 'MB',
          estimatedCost: 0,
          timeWindow: { start: timeOffset, end: timeOffset + levelDuration },
        });
      }

      // Include sub-plan resources
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

  /**
   * Merge overlapping resource requirements of the same type.
   */
  private mergeResourceRequirements(resources: ResourceRequirement[]): ResourceRequirement[] {
    const typeMap = new Map<string, ResourceRequirement[]>();

    for (const r of resources) {
      if (!typeMap.has(r.type)) {
        typeMap.set(r.type, []);
      }
      typeMap.get(r.type)!.push(r);
    }

    const merged: ResourceRequirement[] = [];
    for (const [type, entries] of typeMap) {
      // Merge overlapping time windows
      const sorted = [...entries].sort((a, b) => a.timeWindow.start - b.timeWindow.start);
      let current = { ...sorted[0] };

      for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        if (next.timeWindow.start <= current.timeWindow.end) {
          // Overlap — merge
          current.amount += next.amount;
          current.estimatedCost += next.estimatedCost;
          current.timeWindow.end = Math.max(current.timeWindow.end, next.timeWindow.end);
        } else {
          merged.push(current);
          current = { ...next };
        }
      }
      merged.push(current);
    }

    return merged;
  }

  /**
   * Detect resource conflicts where the same resource type
   * is needed at overlapping time windows by different consumers.
   */
  private detectResourceConflicts(resources: ResourceRequirement[]): string[] {
    const conflicts: string[] = [];
    const typeGroups = new Map<string, ResourceRequirement[]>();

    for (const r of resources) {
      if (!typeGroups.has(r.type)) {
        typeGroups.set(r.type, []);
      }
      typeGroups.get(r.type)!.push(r);
    }

    for (const [type, entries] of typeGroups) {
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const a = entries[i];
          const b = entries[j];

          // Check for time window overlap
          if (
            a.timeWindow.start < b.timeWindow.end &&
            b.timeWindow.start < a.timeWindow.end
          ) {
            conflicts.push(
              `${type}: needed during overlapping windows ` +
                `[${a.timeWindow.start}-${a.timeWindow.end}] and ` +
                `[${b.timeWindow.start}-${b.timeWindow.end}]`,
            );
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Assess risks for a set of levels with known resources.
   */
  private assessLevelRisks(
    levels: PlanningLevel[],
    resources: ResourceRequirement[],
  ): RiskAssessment {
    const risks: RiskItem[] = [];
    const mitigations: string[] = [];

    // Check for empty levels
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

    // Check resource conflicts
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

    // Default low risk if nothing else
    if (risks.length === 0) {
      risks.push({
        description: 'Standard execution variance',
        probability: 0.2,
        impact: 0.2,
        mitigation: 'Monitor execution and adjust as needed',
      });
    }

    const overallRisk = Math.min(
      1,
      risks.reduce((sum, r) => sum + r.probability * r.impact, 0) / Math.max(1, risks.length),
    );

    return {
      overallRisk,
      risks,
      mitigations,
    };
  }

  /**
   * Calculate the critical path length for the entire plan.
   */
  private calculateCriticalPathLength(plan: LongHorizonPlan): number {
    let totalCriticalPath = 0;
    for (const level of plan.levels) {
      if (level.taskGraph) {
        totalCriticalPath += level.taskGraph.criticalPathLength;
      } else {
        // Estimate from objectives
        totalCriticalPath += this.calculateMaxDependencyDepth(level.objectives);
      }
    }
    return totalCriticalPath;
  }

  /**
   * Update an objective's status within a plan.
   */
  private updateObjectiveStatus(
    plan: LongHorizonPlan,
    objectiveId: string,
    status: PlanningObjective['status'],
  ): void {
    for (const level of plan.levels) {
      const objective = level.objectives.find((o) => o.id === objectiveId);
      if (objective) {
        objective.status = status;

        // Update level status based on objective statuses
        const allCompleted = level.objectives.every((o) => o.status === 'completed');
        const anyFailed = level.objectives.some((o) => o.status === 'failed');
        const anyInProgress = level.objectives.some((o) => o.status === 'in_progress');

        if (allCompleted) {
          level.status = PlanStatus.COMPLETED;
        } else if (anyFailed) {
          level.status = PlanStatus.FAILED;
        } else if (anyInProgress) {
          level.status = PlanStatus.IN_PROGRESS;
        }

        return;
      }
    }
  }

  /**
   * Rebuild the objective index for fast lookups.
   */
  private rebuildObjectiveIndex(plan: LongHorizonPlan): void {
    // Clear old entries for this plan
    for (const [key, value] of this.objectiveIndex) {
      if (value.planId === plan.id) {
        this.objectiveIndex.delete(key);
      }
    }

    // Re-index
    for (let i = 0; i < plan.levels.length; i++) {
      for (const obj of plan.levels[i].objectives) {
        this.objectiveIndex.set(obj.id, { planId: plan.id, levelIndex: i });
      }
    }
  }

  /**
   * Count total objectives across all levels of a plan.
   */
  private countTotalObjectives(plan: LongHorizonPlan): number {
    return plan.levels.reduce((sum, level) => sum + level.objectives.length, 0);
  }

  /**
   * Canonicalize a description for conflict detection.
   */
  private canonicalizeDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  /**
   * Resolve a conflict between objectives with different outcomes.
   */
  private resolveConflict(
    objIds: string[],
    objectives: PlanningObjective[],
  ): string {
    const objs = objIds
      .map((id) => objectives.find((o) => o.id === id))
      .filter(Boolean) as PlanningObjective[];

    // Prefer completed over in_progress over failed
    const priorityOrder: PlanningObjective['status'][] = [
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
}
