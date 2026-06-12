/**
 * AENEWS Agent OS X - Mission Graph Service
 *
 * Transforms missions from flat task lists into rich hierarchical graphs:
 *   Mission → Objectives → Sub-Objectives → Task Graph → Dependency Graph
 *   → Execution Graph → Result Graph
 *
 * The task graph uses topological sorting for dependency resolution, longest-path
 * analysis for critical-path computation, and level-based grouping for parallel
 * execution scheduling.
 */

import { Injectable, Logger } from '@nestjs/common';

// ─── Enums ───────────────────────────────────────────────────────────────

export enum MissionStatus {
  DRAFT = 'draft',
  SIMULATING = 'simulating',
  APPROVED = 'approved',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskEdgeType {
  HARD_DEPENDENCY = 'hard_dependency',
  SOFT_DEPENDENCY = 'soft_dependency',
  RESOURCE_DEPENDENCY = 'resource_dependency',
}

export enum MissionTaskStatus {
  PENDING = 'pending',
  READY = 'ready',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  BLOCKED = 'blocked',
}

// ─── Interfaces ──────────────────────────────────────────────────────────

export interface MissionTaskNode {
  id: string;
  type: 'objective' | 'sub_objective' | 'task';
  objectiveId: string;
  agentId: string | null;
  capability: string | null;
  description: string;
  dependencies: string[];
  estimatedDurationMs: number;
  actualDurationMs: number | null;
  status: MissionTaskStatus;
  priority: number;
  payload: any;
  result: any;
  retryCount: number;
  maxRetries: number;
}

export interface MissionTaskEdge {
  fromId: string;
  toId: string;
  type: TaskEdgeType;
  metadata?: Record<string, any>;
}

export interface MissionTaskGraph {
  nodes: Map<string, MissionTaskNode>;
  edges: MissionTaskEdge[];
  criticalPath: string[];
  parallelGroups: string[][];
}

export interface MissionObjective {
  id: string;
  missionId: string;
  description: string;
  status: MissionStatus;
  subObjectives: MissionObjective[];
  assignedAgents: string[];
  taskIds: string[];
  progress: number;
  priority: number;
}

export interface MissionDefinition {
  id: string;
  name: string;
  description: string;
  status: MissionStatus;
  objectives: MissionObjective[];
  taskGraph: MissionTaskGraph | null;
  executionGraph: ExecutionGraph | null;
  resultGraph: ResultGraph | null;
  priority: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  metadata: Record<string, any>;
}

export interface ExecutionGraph {
  executionOrder: string[][]; // Each inner array = parallel group
  currentLevel: number;
  completedNodes: Set<string>;
  failedNodes: Set<string>;
}

export interface ResultGraph {
  results: Map<string, MissionTaskResult>;
  overallSuccess: boolean;
  totalExecutionTimeMs: number;
  completedObjectives: number;
  failedObjectives: number;
}

export interface MissionTaskResult {
  nodeId: string;
  success: boolean;
  result: any;
  executionTimeMs: number;
  agentId: string;
  timestamp: Date;
}

// ─── Internal helper types ───────────────────────────────────────────────

interface MissionStatusSummary {
  missionId: string;
  name: string;
  status: MissionStatus;
  totalObjectives: number;
  completedObjectives: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  overallProgress: number;
  currentExecutionLevel: number | null;
  totalExecutionLevels: number | null;
  criticalPathLength: number | null;
}

interface MissionGlobalStats {
  totalMissions: number;
  byStatus: Record<string, number>;
  avgCompletionTimeMs: number | null;
  totalCompleted: number;
  totalFailed: number;
}

// ─── Service ─────────────────────────────────────────────────────────────

@Injectable()
export class MissionGraphService {
  private readonly logger = new Logger(MissionGraphService.name);
  private readonly missions: Map<string, MissionDefinition> = new Map();

  /** Auto-incrementing counter for generating unique IDs. */
  private idCounter = 0;

  // ─── 1. createMission ──────────────────────────────────────────────

  /**
   * Create a new mission in DRAFT status.
   * Objectives, task graph, execution graph, and result graph start empty/null.
   */
  createMission(
    name: string,
    description: string,
    createdBy: string,
    priority: number = 0,
  ): MissionDefinition {
    const id = this.generateId('mission');

    const mission: MissionDefinition = {
      id,
      name,
      description,
      status: MissionStatus.DRAFT,
      objectives: [],
      taskGraph: null,
      executionGraph: null,
      resultGraph: null,
      priority,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      completedAt: null,
      metadata: {},
    };

    this.missions.set(id, mission);
    this.logger.log(`Created mission "${name}" (${id}) with priority ${priority}`);
    return mission;
  }

  // ─── 2. addObjective ───────────────────────────────────────────────

  /**
   * Add a top-level objective to a mission.
   * Validates that the mission exists and is in a mutable status (DRAFT or SIMULATING).
   */
  addObjective(
    missionId: string,
    objective: Omit<MissionObjective, 'missionId' | 'subObjectives' | 'taskIds' | 'progress'>,
  ): MissionObjective {
    const mission = this.getMissionOrThrow(missionId);

    if (
      mission.status !== MissionStatus.DRAFT &&
      mission.status !== MissionStatus.SIMULATING
    ) {
      throw new Error(
        `Cannot add objective to mission ${missionId}: status is ${mission.status}`,
      );
    }

    const fullObjective: MissionObjective = {
      ...objective,
      missionId,
      subObjectives: [],
      taskIds: [],
      progress: 0,
    };

    mission.objectives.push(fullObjective);
    mission.updatedAt = new Date();

    this.logger.log(
      `Added objective "${objective.description}" (${objective.id}) to mission ${missionId}`,
    );
    return fullObjective;
  }

  // ─── 3. addSubObjective ────────────────────────────────────────────

  /**
   * Add a nested sub-objective under a parent objective.
   * Recursively searches the objective tree for the parent.
   */
  addSubObjective(
    missionId: string,
    parentObjectiveId: string,
    subObjective: Omit<MissionObjective, 'missionId' | 'subObjectives' | 'taskIds' | 'progress'>,
  ): MissionObjective {
    const mission = this.getMissionOrThrow(missionId);

    if (
      mission.status !== MissionStatus.DRAFT &&
      mission.status !== MissionStatus.SIMULATING
    ) {
      throw new Error(
        `Cannot add sub-objective to mission ${missionId}: status is ${mission.status}`,
      );
    }

    const parent = this.findObjectiveRecursive(mission.objectives, parentObjectiveId);
    if (!parent) {
      throw new Error(
        `Parent objective ${parentObjectiveId} not found in mission ${missionId}`,
      );
    }

    const fullSubObjective: MissionObjective = {
      ...subObjective,
      missionId,
      subObjectives: [],
      taskIds: [],
      progress: 0,
    };

    parent.subObjectives.push(fullSubObjective);
    mission.updatedAt = new Date();

    this.logger.log(
      `Added sub-objective "${subObjective.description}" (${subObjective.id}) ` +
        `under parent ${parentObjectiveId} in mission ${missionId}`,
    );
    return fullSubObjective;
  }

  // ─── 4. buildTaskGraph ─────────────────────────────────────────────

  /**
   * THE CORE METHOD. Converts the mission's objectives into a full task graph.
   *
   * For each objective (and sub-objective), creates task nodes. Builds edges
   * based on the dependency declarations on each node. Then:
   *   1. Topological sort for ordering.
   *   2. Longest-path calculation for critical path.
   *   3. Level-based grouping for parallel execution.
   *
   * Returns the fully constructed MissionTaskGraph and attaches it to the mission.
   */
  buildTaskGraph(missionId: string): MissionTaskGraph {
    const mission = this.getMissionOrThrow(missionId);

    if (mission.objectives.length === 0) {
      throw new Error(
        `Cannot build task graph for mission ${missionId}: no objectives defined`,
      );
    }

    const nodes = new Map<string, MissionTaskNode>();
    const edges: MissionTaskEdge[] = [];

    // --- Step 1: Collect all task nodes from objectives ---
    this.collectTaskNodesFromObjectives(mission.objectives, nodes);

    if (nodes.size === 0) {
      throw new Error(
        `Cannot build task graph for mission ${missionId}: no task nodes found in objectives`,
      );
    }

    // --- Step 2: Build edges from dependencies declared on each node ---
    for (const node of Array.from(nodes.values())) {
      for (const depId of node.dependencies) {
        if (!nodes.has(depId)) {
          this.logger.warn(
            `Node ${node.id} declares dependency on ${depId}, which does not exist in the graph. Skipping edge.`,
          );
          continue;
        }
        edges.push({
          fromId: depId,
          toId: node.id,
          type: TaskEdgeType.HARD_DEPENDENCY,
        });
      }
    }

    // --- Step 3: Topological sort ---
    const topoOrder = this.topologicalSort(nodes, edges);

    // --- Step 4: Compute longest path (critical path) ---
    const criticalPath = this.computeCriticalPath(nodes, edges, topoOrder);

    // --- Step 5: Compute parallel groups (nodes at same topological level) ---
    const parallelGroups = this.computeParallelGroups(nodes, edges);

    const taskGraph: MissionTaskGraph = {
      nodes,
      edges,
      criticalPath,
      parallelGroups,
    };

    mission.taskGraph = taskGraph;
    mission.updatedAt = new Date();

    this.logger.log(
      `Built task graph for mission ${missionId}: ${nodes.size} nodes, ` +
        `${edges.length} edges, critical path length=${criticalPath.length}, ` +
        `${parallelGroups.length} parallel groups`,
    );

    return taskGraph;
  }

  // ─── 5. buildExecutionGraph ────────────────────────────────────────

  /**
   * Creates the execution graph from the task graph's parallel groups.
   * Each level in executionOrder represents nodes that can run concurrently.
   * Initial state: level 0, no completed/failed nodes.
   *
   * Also transitions the mission to APPROVED status if it was in DRAFT/SIMULATING.
   */
  buildExecutionGraph(missionId: string): ExecutionGraph {
    const mission = this.getMissionOrThrow(missionId);

    if (!mission.taskGraph) {
      throw new Error(
        `Cannot build execution graph for mission ${missionId}: task graph not built yet`,
      );
    }

    const { parallelGroups, nodes } = mission.taskGraph;

    // Initialise all node statuses: PENDING for nodes with no dependencies, otherwise PENDING
    // (will be promoted to READY by getReadyNodes logic)
    for (const node of Array.from(nodes.values())) {
      node.status = MissionTaskStatus.PENDING;
      node.actualDurationMs = null;
      node.result = null;
      node.retryCount = 0;
    }

    const executionGraph: ExecutionGraph = {
      executionOrder: parallelGroups,
      currentLevel: 0,
      completedNodes: new Set<string>(),
      failedNodes: new Set<string>(),
    };

    mission.executionGraph = executionGraph;
    mission.resultGraph = null; // Reset any previous result graph
    mission.updatedAt = new Date();

    // Transition status if appropriate
    if (
      mission.status === MissionStatus.DRAFT ||
      mission.status === MissionStatus.SIMULATING
    ) {
      mission.status = MissionStatus.APPROVED;
      this.logger.log(`Mission ${missionId} status → APPROVED`);
    }

    // Mark first-level nodes as READY
    if (parallelGroups.length > 0) {
      for (const nodeId of parallelGroups[0]) {
        const node = nodes.get(nodeId);
        if (node) {
          node.status = MissionTaskStatus.READY;
        }
      }
    }

    this.logger.log(
      `Built execution graph for mission ${missionId}: ` +
        `${parallelGroups.length} levels, level 0 has ${parallelGroups[0]?.length ?? 0} nodes`,
    );

    return executionGraph;
  }

  // ─── 6. advanceExecution ───────────────────────────────────────────

  /**
   * Mark a node as completed with the given result, then advance the execution
   * graph if all nodes at the current level are done. Returns the next batch
   * of node IDs that should be executed.
   *
   * If the entire mission is complete, builds the result graph automatically.
   */
  advanceExecution(
    missionId: string,
    completedNodeId: string,
    result: any,
  ): string[] {
    const mission = this.getMissionOrThrow(missionId);

    if (!mission.taskGraph || !mission.executionGraph) {
      throw new Error(
        `Mission ${missionId} has no task graph or execution graph`,
      );
    }

    if (mission.status !== MissionStatus.APPROVED && mission.status !== MissionStatus.IN_PROGRESS) {
      throw new Error(
        `Cannot advance execution for mission ${missionId}: status is ${mission.status}`,
      );
    }

    const { taskGraph, executionGraph } = mission;
    const node = taskGraph.nodes.get(completedNodeId);

    if (!node) {
      throw new Error(`Node ${completedNodeId} not found in mission ${missionId}`);
    }

    if (node.status !== MissionTaskStatus.RUNNING && node.status !== MissionTaskStatus.READY) {
      this.logger.warn(
        `Node ${completedNodeId} is in status ${node.status}, expected RUNNING or READY. Completing anyway.`,
      );
    }

    // Mark node complete
    const executionStartTime = mission.startedAt ?? mission.createdAt;
    node.status = MissionTaskStatus.COMPLETED;
    node.result = result;
    node.actualDurationMs = Date.now() - executionStartTime.getTime();

    executionGraph.completedNodes.add(completedNodeId);

    // Transition to IN_PROGRESS on first completion
    if (mission.status === MissionStatus.APPROVED) {
      mission.status = MissionStatus.IN_PROGRESS;
      mission.startedAt = new Date();
      this.logger.log(`Mission ${missionId} status → IN_PROGRESS`);
    }

    mission.updatedAt = new Date();

    // Update objective progress
    this.updateObjectiveProgress(missionId, node.objectiveId);

    // Check if current level is fully complete
    const currentLevelNodes = executionGraph.executionOrder[executionGraph.currentLevel] ?? [];
    const allCurrentLevelComplete = currentLevelNodes.every((nid) =>
      executionGraph.completedNodes.has(nid) || executionGraph.failedNodes.has(nid),
    );

    if (!allCurrentLevelComplete) {
      // More nodes remain at current level; return empty (others still running)
      this.logger.debug(
        `Node ${completedNodeId} completed. Level ${executionGraph.currentLevel} still in progress.`,
      );
      return [];
    }

    // Current level is done — advance to next level
    const nextLevel = executionGraph.currentLevel + 1;
    const nextLevelNodes = executionGraph.executionOrder[nextLevel];

    if (!nextLevelNodes || nextLevelNodes.length === 0) {
      // Mission is fully complete
      mission.status = MissionStatus.COMPLETED;
      mission.completedAt = new Date();
      mission.updatedAt = new Date();

      this.logger.log(`Mission ${missionId} status → COMPLETED`);

      // Auto-build result graph
      this.buildResultGraph(missionId);

      return [];
    }

    // Advance to next level: mark nodes as READY
    executionGraph.currentLevel = nextLevel;

    const readyNodeIds: string[] = [];
    for (const nid of nextLevelNodes) {
      const nextNode = taskGraph.nodes.get(nid);
      if (!nextNode) continue;

      // Only mark as READY if not already completed/failed/skipped/blocked
      if (
        nextNode.status === MissionTaskStatus.PENDING ||
        nextNode.status === MissionTaskStatus.BLOCKED
      ) {
        nextNode.status = MissionTaskStatus.READY;
      }

      if (nextNode.status === MissionTaskStatus.READY) {
        readyNodeIds.push(nid);
      }
    }

    this.logger.log(
      `Mission ${missionId} advanced to execution level ${nextLevel}: ` +
        `${readyNodeIds.length} nodes ready`,
    );

    return readyNodeIds;
  }

  // ─── 7. markNodeFailed ─────────────────────────────────────────────

  /**
   * Mark a node as failed and determine impact on dependent nodes.
   *
   * Cascade rules:
   *   - HARD_DEPENDENCY: Dependent nodes are marked BLOCKED (they cannot proceed).
   *   - SOFT_DEPENDENCY: Dependent nodes receive a warning but remain PENDING/READY.
   *   - RESOURCE_DEPENDENCY: Dependent nodes receive a warning; status unchanged.
   *
   * Updates objective progress. If all tasks under an objective have failed/blocked,
   * the objective status becomes FAILED.
   */
  markNodeFailed(missionId: string, nodeId: string, error: any): void {
    const mission = this.getMissionOrThrow(missionId);

    if (!mission.taskGraph) {
      throw new Error(`Mission ${missionId} has no task graph`);
    }

    const { taskGraph } = mission;
    const node = taskGraph.nodes.get(nodeId);

    if (!node) {
      throw new Error(`Node ${nodeId} not found in mission ${missionId}`);
    }

    // Mark the node as failed
    node.status = MissionTaskStatus.FAILED;
    node.result = error;
    node.actualDurationMs = Date.now() - (mission.startedAt?.getTime() ?? Date.now());

    if (mission.executionGraph) {
      mission.executionGraph.failedNodes.add(nodeId);
    }

    mission.updatedAt = new Date();

    this.logger.warn(
      `Node ${nodeId} failed in mission ${missionId}: ${JSON.stringify(error)}`,
    );

    // --- Cascade failure to dependent nodes ---
    const dependentEdges = taskGraph.edges.filter((e) => e.fromId === nodeId);
    const cascadeQueue: string[] = [];

    for (const edge of dependentEdges) {
      const dependentNode = taskGraph.nodes.get(edge.toId);
      if (!dependentNode) continue;

      if (edge.type === TaskEdgeType.HARD_DEPENDENCY) {
        // Hard dependency: block the dependent node
        if (
          dependentNode.status !== MissionTaskStatus.COMPLETED &&
          dependentNode.status !== MissionTaskStatus.FAILED &&
          dependentNode.status !== MissionTaskStatus.SKIPPED
        ) {
          dependentNode.status = MissionTaskStatus.BLOCKED;
          cascadeQueue.push(edge.toId);
          this.logger.warn(
            `Node ${edge.toId} BLOCKED due to hard dependency failure on ${nodeId}`,
          );
        }
      } else {
        // Soft / resource dependency: warn but don't block
        this.logger.warn(
          `Node ${edge.toId} has ${edge.type} on failed node ${nodeId}. ` +
            `Status remains ${dependentNode.status}.`,
        );
      }
    }

    // Recursively cascade blocked nodes
    while (cascadeQueue.length > 0) {
      const blockedNodeId = cascadeQueue.shift()!;
      const blockedDeps = taskGraph.edges.filter((e) => e.fromId === blockedNodeId);

      for (const edge of blockedDeps) {
        const depNode = taskGraph.nodes.get(edge.toId);
        if (!depNode) continue;

        if (
          edge.type === TaskEdgeType.HARD_DEPENDENCY &&
          depNode.status !== MissionTaskStatus.COMPLETED &&
          depNode.status !== MissionTaskStatus.FAILED &&
          depNode.status !== MissionTaskStatus.SKIPPED &&
          depNode.status !== MissionTaskStatus.BLOCKED
        ) {
          depNode.status = MissionTaskStatus.BLOCKED;
          cascadeQueue.push(edge.toId);
          this.logger.warn(
            `Node ${edge.toId} BLOCKED (cascaded from ${blockedNodeId})`,
          );
        }
      }
    }

    // Update objective progress
    this.updateObjectiveProgress(missionId, node.objectiveId);

    // Check if the mission should be marked as FAILED
    const allObjectivesFailed = mission.objectives.every((obj) => {
      const objProgress = this.calculateObjectiveProgress(obj, taskGraph);
      return objProgress >= 1 || this.isObjectiveFailed(obj, taskGraph);
    });

    const anyRootObjectiveFailed = mission.objectives.some((obj) =>
      this.isObjectiveFailed(obj, taskGraph),
    );

    // If any root objective is completely failed, mark the mission as FAILED
    if (anyRootObjectiveFailed) {
      mission.status = MissionStatus.FAILED;
      mission.completedAt = new Date();
      mission.updatedAt = new Date();
      this.logger.error(
        `Mission ${missionId} status → FAILED due to objective failure`,
      );
    }
  }

  // ─── 8. buildResultGraph ───────────────────────────────────────────

  /**
   * After mission completion (or at any point), build the result graph
   * aggregating all task results. Computes overall success, total timing,
   * and objective completion counts.
   */
  buildResultGraph(missionId: string): ResultGraph {
    const mission = this.getMissionOrThrow(missionId);

    if (!mission.taskGraph) {
      throw new Error(`Mission ${missionId} has no task graph`);
    }

    const { taskGraph } = mission;
    const results = new Map<string, MissionTaskResult>();

    let totalExecutionTimeMs = 0;
    let successCount = 0;
    let failCount = 0;

    for (const node of Array.from(taskGraph.nodes.values())) {
      if (node.status === MissionTaskStatus.COMPLETED || node.status === MissionTaskStatus.FAILED) {
        const taskResult: MissionTaskResult = {
          nodeId: node.id,
          success: node.status === MissionTaskStatus.COMPLETED,
          result: node.result,
          executionTimeMs: node.actualDurationMs ?? 0,
          agentId: node.agentId ?? 'unknown',
          timestamp: new Date(),
        };
        results.set(node.id, taskResult);

        totalExecutionTimeMs += node.actualDurationMs ?? 0;

        if (node.status === MissionTaskStatus.COMPLETED) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }

    // Compute objective-level outcomes
    let completedObjectives = 0;
    let failedObjectives = 0;

    for (const objective of mission.objectives) {
      const progress = this.calculateObjectiveProgress(objective, taskGraph);
      const isFailed = this.isObjectiveFailed(objective, taskGraph);

      if (progress >= 1) {
        completedObjectives++;
      } else if (isFailed) {
        failedObjectives++;
      }
    }

    // Overall success: all root objectives are completed (progress >= 1)
    const overallSuccess = mission.objectives.length > 0 && completedObjectives === mission.objectives.length;

    const resultGraph: ResultGraph = {
      results,
      overallSuccess,
      totalExecutionTimeMs,
      completedObjectives,
      failedObjectives,
    };

    mission.resultGraph = resultGraph;
    mission.updatedAt = new Date();

    this.logger.log(
      `Built result graph for mission ${missionId}: ` +
        `overallSuccess=${overallSuccess}, ${successCount} tasks succeeded, ` +
        `${failCount} tasks failed, ${completedObjectives}/${mission.objectives.length} objectives completed`,
    );

    return resultGraph;
  }

  // ─── 9. getMission ─────────────────────────────────────────────────

  /**
   * Get the full mission definition by ID, or null if not found.
   */
  getMission(missionId: string): MissionDefinition | null {
    return this.missions.get(missionId) ?? null;
  }

  // ─── 10. getMissionStatus ──────────────────────────────────────────

  /**
   * Get a summary of the current mission status including progress metrics.
   */
  getMissionStatus(missionId: string): MissionStatusSummary {
    const mission = this.getMissionOrThrow(missionId);

    let totalTasks = 0;
    let completedTasks = 0;
    let failedTasks = 0;

    if (mission.taskGraph) {
      for (const node of Array.from(mission.taskGraph.nodes.values())) {
        totalTasks++;
        if (node.status === MissionTaskStatus.COMPLETED) completedTasks++;
        if (node.status === MissionTaskStatus.FAILED) failedTasks++;
      }
    }

    const totalObjectives = mission.objectives.length;
    const completedObjectives = mission.objectives.filter(
      (obj) => this.calculateObjectiveProgress(obj, mission.taskGraph) >= 1,
    ).length;

    const overallProgress = totalTasks > 0 ? completedTasks / totalTasks : 0;

    return {
      missionId: mission.id,
      name: mission.name,
      status: mission.status,
      totalObjectives,
      completedObjectives,
      totalTasks,
      completedTasks,
      failedTasks,
      overallProgress: Math.round(overallProgress * 1000) / 1000,
      currentExecutionLevel: mission.executionGraph?.currentLevel ?? null,
      totalExecutionLevels: mission.executionGraph?.executionOrder.length ?? null,
      criticalPathLength: mission.taskGraph?.criticalPath.length ?? null,
    };
  }

  // ─── 11. getReadyNodes ─────────────────────────────────────────────

  /**
   * Get nodes that are ready for execution:
   * all of their dependencies are completed, and they are not yet started.
   */
  getReadyNodes(missionId: string): MissionTaskNode[] {
    const mission = this.getMissionOrThrow(missionId);

    if (!mission.taskGraph) {
      return [];
    }

    const { nodes, edges } = mission.taskGraph;
    const readyNodes: MissionTaskNode[] = [];

    for (const node of Array.from(nodes.values())) {
      if (node.status !== MissionTaskStatus.PENDING && node.status !== MissionTaskStatus.READY) {
        continue;
      }

      // Check all hard dependencies are completed
      const incomingHardEdges = edges.filter(
        (e) => e.toId === node.id && e.type === TaskEdgeType.HARD_DEPENDENCY,
      );

      const allHardDepsMet = incomingHardEdges.every((e) => {
        const depNode = nodes.get(e.fromId);
        return depNode?.status === MissionTaskStatus.COMPLETED;
      });

      // Check soft/resource dependencies: at least completed or failed (not blocked/pending)
      const incomingSoftEdges = edges.filter(
        (e) => e.toId === node.id && e.type !== TaskEdgeType.HARD_DEPENDENCY,
      );

      const allSoftDepsResolved = incomingSoftEdges.every((e) => {
        const depNode = nodes.get(e.fromId);
        return (
          depNode?.status === MissionTaskStatus.COMPLETED ||
          depNode?.status === MissionTaskStatus.FAILED ||
          depNode?.status === MissionTaskStatus.SKIPPED
        );
      });

      if (allHardDepsMet && allSoftDepsResolved) {
        // Promote PENDING → READY
        if (node.status === MissionTaskStatus.PENDING) {
          node.status = MissionTaskStatus.READY;
        }
        readyNodes.push(node);
      }
    }

    return readyNodes;
  }

  // ─── 12. getCriticalPath ───────────────────────────────────────────

  /**
   * Get the critical path through the task graph.
   * The critical path is the longest path (by estimated duration) from
   * a source node to a sink node.
   */
  getCriticalPath(missionId: string): string[] {
    const mission = this.getMissionOrThrow(missionId);

    if (!mission.taskGraph) {
      return [];
    }

    return mission.taskGraph.criticalPath;
  }

  // ─── 13. updateObjectiveProgress ───────────────────────────────────

  /**
   * Recalculate objective progress based on task completion within the
   * task graph. Progress = completed tasks / total tasks for the objective.
   * Recursively updates sub-objectives.
   */
  updateObjectiveProgress(missionId: string, objectiveId: string): number {
    const mission = this.getMissionOrThrow(missionId);

    const objective = this.findObjectiveRecursive(mission.objectives, objectiveId);
    if (!objective) {
      throw new Error(
        `Objective ${objectiveId} not found in mission ${missionId}`,
      );
    }

    const progress = this.calculateObjectiveProgress(
      objective,
      mission.taskGraph,
    );

    objective.progress = Math.round(progress * 1000) / 1000;

    // Update objective status based on progress
    if (objective.progress >= 1) {
      objective.status = MissionStatus.COMPLETED;
    } else if (this.isObjectiveFailed(objective, mission.taskGraph)) {
      objective.status = MissionStatus.FAILED;
    } else if (objective.progress > 0) {
      objective.status = MissionStatus.IN_PROGRESS;
    }

    mission.updatedAt = new Date();

    return objective.progress;
  }

  // ─── 14. cancelMission ─────────────────────────────────────────────

  /**
   * Cancel the mission and mark all running/ready tasks as SKIPPED.
   * Transition the mission to CANCELLED status.
   */
  cancelMission(missionId: string): MissionDefinition {
    const mission = this.getMissionOrThrow(missionId);

    if (
      mission.status === MissionStatus.COMPLETED ||
      mission.status === MissionStatus.CANCELLED
    ) {
      throw new Error(
        `Cannot cancel mission ${missionId}: already ${mission.status}`,
      );
    }

    // Mark all running/ready/pending nodes as SKIPPED
    if (mission.taskGraph) {
      for (const node of Array.from(mission.taskGraph.nodes.values())) {
        if (
          node.status === MissionTaskStatus.RUNNING ||
          node.status === MissionTaskStatus.READY ||
          node.status === MissionTaskStatus.PENDING
        ) {
          node.status = MissionTaskStatus.SKIPPED;
        }
      }
    }

    mission.status = MissionStatus.CANCELLED;
    mission.completedAt = new Date();
    mission.updatedAt = new Date();

    this.logger.log(`Mission ${missionId} status → CANCELLED`);
    return mission;
  }

  // ─── 15. getMissionStats ───────────────────────────────────────────

  /**
   * Global statistics across all missions:
   *   total count, count by status, average completion time.
   */
  getMissionStats(): MissionGlobalStats {
    const allMissions = Array.from(this.missions.values());
    const byStatus: Record<string, number> = {};

    for (const status of Object.values(MissionStatus)) {
      byStatus[status] = 0;
    }

    let totalCompletionTimeMs = 0;
    let totalCompleted = 0;
    let totalFailed = 0;

    for (const mission of allMissions) {
      byStatus[mission.status] = (byStatus[mission.status] ?? 0) + 1;

      if (mission.status === MissionStatus.COMPLETED && mission.startedAt && mission.completedAt) {
        totalCompletionTimeMs += mission.completedAt.getTime() - mission.startedAt.getTime();
        totalCompleted++;
      }

      if (mission.status === MissionStatus.FAILED) {
        totalFailed++;
      }
    }

    const avgCompletionTimeMs =
      totalCompleted > 0 ? Math.round(totalCompletionTimeMs / totalCompleted) : null;

    return {
      totalMissions: allMissions.length,
      byStatus,
      avgCompletionTimeMs,
      totalCompleted,
      totalFailed,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────

  /**
   * Generate a unique ID with a given prefix.
   */
  private generateId(prefix: string): string {
    this.idCounter++;
    return `${prefix}_${Date.now()}_${this.idCounter}`;
  }

  /**
   * Get a mission or throw an error if not found.
   */
  private getMissionOrThrow(missionId: string): MissionDefinition {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }
    return mission;
  }

  /**
   * Recursively search for an objective by ID in the objective tree.
   */
  private findObjectiveRecursive(
    objectives: MissionObjective[],
    objectiveId: string,
  ): MissionObjective | null {
    for (const obj of objectives) {
      if (obj.id === objectiveId) {
        return obj;
      }
      const found = this.findObjectiveRecursive(obj.subObjectives, objectiveId);
      if (found) {
        return found;
      }
    }
    return null;
  }

  /**
   * Collect all task nodes from the objective tree.
   * For each objective/sub-objective, if it has taskIds, we look for matching
   * MissionTaskNode entries. If there are no taskIds, we create a synthetic
   * task node for the objective itself.
   */
  private collectTaskNodesFromObjectives(
    objectives: MissionObjective[],
    nodes: Map<string, MissionTaskNode>,
  ): void {
    for (const objective of objectives) {
      // Create a synthetic node for the objective itself if no explicit tasks
      if (objective.taskIds.length === 0) {
        const nodeType: MissionTaskNode['type'] =
          objective.subObjectives.length > 0 ? 'objective' : 'task';

        const node: MissionTaskNode = {
          id: objective.id,
          type: nodeType,
          objectiveId: objective.id,
          agentId: objective.assignedAgents[0] ?? null,
          capability: null,
          description: objective.description,
          dependencies: [],
          estimatedDurationMs: 5000, // Default estimate
          actualDurationMs: null,
          status: MissionTaskStatus.PENDING,
          priority: objective.priority,
          payload: {},
          result: null,
          retryCount: 0,
          maxRetries: 3,
        };

        nodes.set(node.id, node);
        objective.taskIds.push(node.id);
      }

      // Add inter-objective dependencies: sub-objectives depend on their parent's tasks
      if (objective.subObjectives.length > 0) {
        const parentTaskIds = objective.taskIds;

        for (const subObj of objective.subObjectives) {
          this.collectTaskNodesFromObjectives([subObj], nodes);

          // Sub-objective tasks depend on parent objective tasks
          for (const subTaskId of subObj.taskIds) {
            const subNode = nodes.get(subTaskId);
            if (subNode && parentTaskIds.length > 0) {
              // Depend on the last parent task (sequential dependency)
              const lastParentTaskId = parentTaskIds[parentTaskIds.length - 1];
              if (!subNode.dependencies.includes(lastParentTaskId)) {
                subNode.dependencies.push(lastParentTaskId);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Topological sort using Kahn's algorithm.
   * Returns an array of node IDs in topological order.
   */
  private topologicalSort(
    nodes: Map<string, MissionTaskNode>,
    edges: MissionTaskEdge[],
  ): string[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    // Initialise
    for (const nodeId of Array.from(nodes.keys())) {
      inDegree.set(nodeId, 0);
      adjacency.set(nodeId, []);
    }

    // Build adjacency list and in-degree counts
    for (const edge of edges) {
      if (!adjacency.has(edge.fromId)) adjacency.set(edge.fromId, []);
      adjacency.get(edge.fromId)!.push(edge.toId);
      inDegree.set(edge.toId, (inDegree.get(edge.toId) ?? 0) + 1);
    }

    // Start with nodes that have no incoming edges
    const queue: string[] = [];
    for (const [nodeId, degree] of Array.from(inDegree.entries())) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const sorted: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      const neighbours = adjacency.get(current) ?? [];
      for (const neighbour of neighbours) {
        const newDegree = (inDegree.get(neighbour) ?? 1) - 1;
        inDegree.set(neighbour, newDegree);
        if (newDegree === 0) {
          queue.push(neighbour);
        }
      }
    }

    // Cycle detection
    if (sorted.length !== nodes.size) {
      this.logger.error(
        `Cycle detected in task graph! Sorted ${sorted.length}/${nodes.size} nodes.`,
      );
      // Return partial sort — the algorithm still works for the nodes it could sort
    }

    return sorted;
  }

  /**
   * Compute the critical path using the longest-path algorithm on a DAG.
   *
   * For each node in topological order, we compute the longest distance from
   * any source node. The critical path is the sequence of nodes that forms
   * this longest path, ending at the sink node with the maximum distance.
   */
  private computeCriticalPath(
    nodes: Map<string, MissionTaskNode>,
    edges: MissionTaskEdge[],
    topoOrder: string[],
  ): string[] {
    if (topoOrder.length === 0) return [];

    // Distance map: longest distance to reach each node
    const dist = new Map<string, number>();
    // Predecessor map: for reconstructing the path
    const predecessor = new Map<string, string | null>();

    for (const nodeId of topoOrder) {
      dist.set(nodeId, 0);
      predecessor.set(nodeId, null);
    }

    // Build reverse adjacency: for each node, what edges point TO it
    const incomingEdges = new Map<string, MissionTaskEdge[]>();
    for (const nodeId of Array.from(nodes.keys())) {
      incomingEdges.set(nodeId, []);
    }
    for (const edge of edges) {
      if (!incomingEdges.has(edge.toId)) incomingEdges.set(edge.toId, []);
      incomingEdges.get(edge.toId)!.push(edge);
    }

    // Relax edges in topological order
    for (const nodeId of topoOrder) {
      const node = nodes.get(nodeId);
      if (!node) continue;

      const currentDist = dist.get(nodeId) ?? 0;
      const nodeDuration = node.estimatedDurationMs;

      // Look at all outgoing edges from this node
      const outgoingEdges = edges.filter((e) => e.fromId === nodeId);
      for (const edge of outgoingEdges) {
        const targetDist = dist.get(edge.toId) ?? 0;
        const newDist = currentDist + nodeDuration;

        if (newDist > targetDist) {
          dist.set(edge.toId, newDist);
          predecessor.set(edge.toId, nodeId);
        }
      }
    }

    // Find the sink node (node with maximum distance + its own duration)
    let maxTotalDist = -1;
    let sinkNode = topoOrder[topoOrder.length - 1];

    for (const nodeId of topoOrder) {
      const node = nodes.get(nodeId);
      if (!node) continue;

      const totalDist = (dist.get(nodeId) ?? 0) + node.estimatedDurationMs;
      if (totalDist > maxTotalDist) {
        maxTotalDist = totalDist;
        sinkNode = nodeId;
      }
    }

    // Reconstruct path from source to sink
    const path: string[] = [];
    let current: string | null = sinkNode;

    while (current !== null) {
      path.unshift(current);
      current = predecessor.get(current) ?? null;
    }

    return path;
  }

  /**
   * Compute parallel groups: nodes that can execute at the same topological level.
   *
   * Nodes at the same level have no dependencies between them (within the level)
   * and all their dependencies are in earlier levels.
   */
  private computeParallelGroups(
    nodes: Map<string, MissionTaskNode>,
    edges: MissionTaskEdge[],
  ): string[][] {
    if (nodes.size === 0) return [];

    // Compute the topological level (depth) for each node
    const level = new Map<string, number>();

    // Build incoming edge map
    const incomingEdges = new Map<string, MissionTaskEdge[]>();
    for (const nodeId of Array.from(nodes.keys())) {
      incomingEdges.set(nodeId, []);
    }
    for (const edge of edges) {
      if (!incomingEdges.has(edge.toId)) incomingEdges.set(edge.toId, []);
      incomingEdges.get(edge.toId)!.push(edge);
    }

    // Compute levels using dynamic programming on topological order
    const topoOrder = this.topologicalSort(nodes, edges);

    for (const nodeId of topoOrder) {
      const incoming = incomingEdges.get(nodeId) ?? [];
      if (incoming.length === 0) {
        level.set(nodeId, 0);
      } else {
        const maxPredLevel = Math.max(
          ...incoming.map((e) => level.get(e.fromId) ?? 0),
        );
        level.set(nodeId, maxPredLevel + 1);
      }
    }

    // Group nodes by level
    const groups = new Map<number, string[]>();
    for (const [nodeId, nodeLevel] of Array.from(level.entries())) {
      if (!groups.has(nodeLevel)) {
        groups.set(nodeLevel, []);
      }
      groups.get(nodeLevel)!.push(nodeId);
    }

    // Sort groups by level and sort nodes within each group by priority (descending)
    const sortedLevels = Array.from(groups.keys()).sort((a, b) => a - b);
    const parallelGroups: string[][] = [];

    for (const lvl of sortedLevels) {
      const groupNodes = groups.get(lvl)!.sort((a, b) => {
        const nodeA = nodes.get(a);
        const nodeB = nodes.get(b);
        return (nodeB?.priority ?? 0) - (nodeA?.priority ?? 0);
      });
      parallelGroups.push(groupNodes);
    }

    return parallelGroups;
  }

  /**
   * Calculate the progress of an objective (0 to 1) based on task completion.
   * Recursively includes sub-objective progress.
   */
  private calculateObjectiveProgress(
    objective: MissionObjective,
    taskGraph: MissionTaskGraph | null,
  ): number {
    if (!taskGraph) return 0;

    // Collect all task IDs for this objective and its sub-objectives
    const allTaskIds = this.getAllTaskIdsRecursive(objective);

    if (allTaskIds.length === 0) return 0;

    let completedCount = 0;
    for (const taskId of allTaskIds) {
      const node = taskGraph.nodes.get(taskId);
      if (node?.status === MissionTaskStatus.COMPLETED) {
        completedCount++;
      }
    }

    return completedCount / allTaskIds.length;
  }

  /**
   * Recursively collect all task IDs from an objective and its sub-objectives.
   */
  private getAllTaskIdsRecursive(objective: MissionObjective): string[] {
    const ids = [...objective.taskIds];

    for (const subObj of objective.subObjectives) {
      ids.push(...this.getAllTaskIdsRecursive(subObj));
    }

    return ids;
  }

  /**
   * Determine if an objective has failed (all its tasks are either FAILED or BLOCKED,
   * and none are COMPLETED).
   */
  private isObjectiveFailed(
    objective: MissionObjective,
    taskGraph: MissionTaskGraph | null,
  ): boolean {
    if (!taskGraph) return false;

    const allTaskIds = this.getAllTaskIdsRecursive(objective);
    if (allTaskIds.length === 0) return false;

    let failedOrBlockedCount = 0;
    let completedCount = 0;

    for (const taskId of allTaskIds) {
      const node = taskGraph.nodes.get(taskId);
      if (!node) continue;

      if (node.status === MissionTaskStatus.COMPLETED) {
        completedCount++;
      } else if (
        node.status === MissionTaskStatus.FAILED ||
        node.status === MissionTaskStatus.BLOCKED
      ) {
        failedOrBlockedCount++;
      }
    }

    // Objective is failed if all tasks are in terminal failure states and none completed
    return failedOrBlockedCount === allTaskIds.length && completedCount === 0;
  }
}
