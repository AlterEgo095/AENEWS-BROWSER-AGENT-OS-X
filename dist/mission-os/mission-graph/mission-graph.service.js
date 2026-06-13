"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MissionGraphService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionGraphService = exports.MissionTaskStatus = exports.TaskEdgeType = exports.MissionStatus = void 0;
const common_1 = require("@nestjs/common");
var MissionStatus;
(function (MissionStatus) {
    MissionStatus["DRAFT"] = "draft";
    MissionStatus["SIMULATING"] = "simulating";
    MissionStatus["APPROVED"] = "approved";
    MissionStatus["IN_PROGRESS"] = "in_progress";
    MissionStatus["PAUSED"] = "paused";
    MissionStatus["COMPLETED"] = "completed";
    MissionStatus["FAILED"] = "failed";
    MissionStatus["CANCELLED"] = "cancelled";
})(MissionStatus || (exports.MissionStatus = MissionStatus = {}));
var TaskEdgeType;
(function (TaskEdgeType) {
    TaskEdgeType["HARD_DEPENDENCY"] = "hard_dependency";
    TaskEdgeType["SOFT_DEPENDENCY"] = "soft_dependency";
    TaskEdgeType["RESOURCE_DEPENDENCY"] = "resource_dependency";
})(TaskEdgeType || (exports.TaskEdgeType = TaskEdgeType = {}));
var MissionTaskStatus;
(function (MissionTaskStatus) {
    MissionTaskStatus["PENDING"] = "pending";
    MissionTaskStatus["READY"] = "ready";
    MissionTaskStatus["RUNNING"] = "running";
    MissionTaskStatus["COMPLETED"] = "completed";
    MissionTaskStatus["FAILED"] = "failed";
    MissionTaskStatus["SKIPPED"] = "skipped";
    MissionTaskStatus["BLOCKED"] = "blocked";
})(MissionTaskStatus || (exports.MissionTaskStatus = MissionTaskStatus = {}));
let MissionGraphService = MissionGraphService_1 = class MissionGraphService {
    constructor() {
        this.logger = new common_1.Logger(MissionGraphService_1.name);
        this.missions = new Map();
        this.idCounter = 0;
    }
    createMission(name, description, createdBy, priority = 0) {
        const id = this.generateId('mission');
        const mission = {
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
    addObjective(missionId, objective) {
        const mission = this.getMissionOrThrow(missionId);
        if (mission.status !== MissionStatus.DRAFT &&
            mission.status !== MissionStatus.SIMULATING) {
            throw new Error(`Cannot add objective to mission ${missionId}: status is ${mission.status}`);
        }
        const fullObjective = {
            ...objective,
            missionId,
            subObjectives: [],
            taskIds: [],
            progress: 0,
        };
        mission.objectives.push(fullObjective);
        mission.updatedAt = new Date();
        this.logger.log(`Added objective "${objective.description}" (${objective.id}) to mission ${missionId}`);
        return fullObjective;
    }
    addSubObjective(missionId, parentObjectiveId, subObjective) {
        const mission = this.getMissionOrThrow(missionId);
        if (mission.status !== MissionStatus.DRAFT &&
            mission.status !== MissionStatus.SIMULATING) {
            throw new Error(`Cannot add sub-objective to mission ${missionId}: status is ${mission.status}`);
        }
        const parent = this.findObjectiveRecursive(mission.objectives, parentObjectiveId);
        if (!parent) {
            throw new Error(`Parent objective ${parentObjectiveId} not found in mission ${missionId}`);
        }
        const fullSubObjective = {
            ...subObjective,
            missionId,
            subObjectives: [],
            taskIds: [],
            progress: 0,
        };
        parent.subObjectives.push(fullSubObjective);
        mission.updatedAt = new Date();
        this.logger.log(`Added sub-objective "${subObjective.description}" (${subObjective.id}) ` +
            `under parent ${parentObjectiveId} in mission ${missionId}`);
        return fullSubObjective;
    }
    buildTaskGraph(missionId) {
        const mission = this.getMissionOrThrow(missionId);
        if (mission.objectives.length === 0) {
            throw new Error(`Cannot build task graph for mission ${missionId}: no objectives defined`);
        }
        const nodes = new Map();
        const edges = [];
        this.collectTaskNodesFromObjectives(mission.objectives, nodes);
        if (nodes.size === 0) {
            throw new Error(`Cannot build task graph for mission ${missionId}: no task nodes found in objectives`);
        }
        for (const node of Array.from(nodes.values())) {
            for (const depId of node.dependencies) {
                if (!nodes.has(depId)) {
                    this.logger.warn(`Node ${node.id} declares dependency on ${depId}, which does not exist in the graph. Skipping edge.`);
                    continue;
                }
                edges.push({
                    fromId: depId,
                    toId: node.id,
                    type: TaskEdgeType.HARD_DEPENDENCY,
                });
            }
        }
        const topoOrder = this.topologicalSort(nodes, edges);
        const criticalPath = this.computeCriticalPath(nodes, edges, topoOrder);
        const parallelGroups = this.computeParallelGroups(nodes, edges);
        const taskGraph = {
            nodes,
            edges,
            criticalPath,
            parallelGroups,
        };
        mission.taskGraph = taskGraph;
        mission.updatedAt = new Date();
        this.logger.log(`Built task graph for mission ${missionId}: ${nodes.size} nodes, ` +
            `${edges.length} edges, critical path length=${criticalPath.length}, ` +
            `${parallelGroups.length} parallel groups`);
        return taskGraph;
    }
    buildExecutionGraph(missionId) {
        const mission = this.getMissionOrThrow(missionId);
        if (!mission.taskGraph) {
            throw new Error(`Cannot build execution graph for mission ${missionId}: task graph not built yet`);
        }
        const { parallelGroups, nodes } = mission.taskGraph;
        for (const node of Array.from(nodes.values())) {
            node.status = MissionTaskStatus.PENDING;
            node.actualDurationMs = null;
            node.result = null;
            node.retryCount = 0;
        }
        const executionGraph = {
            executionOrder: parallelGroups,
            currentLevel: 0,
            completedNodes: new Set(),
            failedNodes: new Set(),
        };
        mission.executionGraph = executionGraph;
        mission.resultGraph = null;
        mission.updatedAt = new Date();
        if (mission.status === MissionStatus.DRAFT ||
            mission.status === MissionStatus.SIMULATING) {
            mission.status = MissionStatus.APPROVED;
            this.logger.log(`Mission ${missionId} status → APPROVED`);
        }
        if (parallelGroups.length > 0) {
            for (const nodeId of parallelGroups[0]) {
                const node = nodes.get(nodeId);
                if (node) {
                    node.status = MissionTaskStatus.READY;
                }
            }
        }
        this.logger.log(`Built execution graph for mission ${missionId}: ` +
            `${parallelGroups.length} levels, level 0 has ${parallelGroups[0]?.length ?? 0} nodes`);
        return executionGraph;
    }
    advanceExecution(missionId, completedNodeId, result) {
        const mission = this.getMissionOrThrow(missionId);
        if (!mission.taskGraph || !mission.executionGraph) {
            throw new Error(`Mission ${missionId} has no task graph or execution graph`);
        }
        if (mission.status !== MissionStatus.APPROVED && mission.status !== MissionStatus.IN_PROGRESS) {
            throw new Error(`Cannot advance execution for mission ${missionId}: status is ${mission.status}`);
        }
        const { taskGraph, executionGraph } = mission;
        const node = taskGraph.nodes.get(completedNodeId);
        if (!node) {
            throw new Error(`Node ${completedNodeId} not found in mission ${missionId}`);
        }
        if (node.status !== MissionTaskStatus.RUNNING && node.status !== MissionTaskStatus.READY) {
            this.logger.warn(`Node ${completedNodeId} is in status ${node.status}, expected RUNNING or READY. Completing anyway.`);
        }
        const executionStartTime = mission.startedAt ?? mission.createdAt;
        node.status = MissionTaskStatus.COMPLETED;
        node.result = result;
        node.actualDurationMs = Date.now() - executionStartTime.getTime();
        executionGraph.completedNodes.add(completedNodeId);
        if (mission.status === MissionStatus.APPROVED) {
            mission.status = MissionStatus.IN_PROGRESS;
            mission.startedAt = new Date();
            this.logger.log(`Mission ${missionId} status → IN_PROGRESS`);
        }
        mission.updatedAt = new Date();
        this.updateObjectiveProgress(missionId, node.objectiveId);
        const currentLevelNodes = executionGraph.executionOrder[executionGraph.currentLevel] ?? [];
        const allCurrentLevelComplete = currentLevelNodes.every((nid) => executionGraph.completedNodes.has(nid) || executionGraph.failedNodes.has(nid));
        if (!allCurrentLevelComplete) {
            this.logger.debug(`Node ${completedNodeId} completed. Level ${executionGraph.currentLevel} still in progress.`);
            return [];
        }
        const nextLevel = executionGraph.currentLevel + 1;
        const nextLevelNodes = executionGraph.executionOrder[nextLevel];
        if (!nextLevelNodes || nextLevelNodes.length === 0) {
            mission.status = MissionStatus.COMPLETED;
            mission.completedAt = new Date();
            mission.updatedAt = new Date();
            this.logger.log(`Mission ${missionId} status → COMPLETED`);
            this.buildResultGraph(missionId);
            return [];
        }
        executionGraph.currentLevel = nextLevel;
        const readyNodeIds = [];
        for (const nid of nextLevelNodes) {
            const nextNode = taskGraph.nodes.get(nid);
            if (!nextNode)
                continue;
            if (nextNode.status === MissionTaskStatus.PENDING ||
                nextNode.status === MissionTaskStatus.BLOCKED) {
                nextNode.status = MissionTaskStatus.READY;
            }
            if (nextNode.status === MissionTaskStatus.READY) {
                readyNodeIds.push(nid);
            }
        }
        this.logger.log(`Mission ${missionId} advanced to execution level ${nextLevel}: ` +
            `${readyNodeIds.length} nodes ready`);
        return readyNodeIds;
    }
    markNodeFailed(missionId, nodeId, error) {
        const mission = this.getMissionOrThrow(missionId);
        if (!mission.taskGraph) {
            throw new Error(`Mission ${missionId} has no task graph`);
        }
        const { taskGraph } = mission;
        const node = taskGraph.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found in mission ${missionId}`);
        }
        node.status = MissionTaskStatus.FAILED;
        node.result = error;
        node.actualDurationMs = Date.now() - (mission.startedAt?.getTime() ?? Date.now());
        if (mission.executionGraph) {
            mission.executionGraph.failedNodes.add(nodeId);
        }
        mission.updatedAt = new Date();
        this.logger.warn(`Node ${nodeId} failed in mission ${missionId}: ${JSON.stringify(error)}`);
        const dependentEdges = taskGraph.edges.filter((e) => e.fromId === nodeId);
        const cascadeQueue = [];
        for (const edge of dependentEdges) {
            const dependentNode = taskGraph.nodes.get(edge.toId);
            if (!dependentNode)
                continue;
            if (edge.type === TaskEdgeType.HARD_DEPENDENCY) {
                if (dependentNode.status !== MissionTaskStatus.COMPLETED &&
                    dependentNode.status !== MissionTaskStatus.FAILED &&
                    dependentNode.status !== MissionTaskStatus.SKIPPED) {
                    dependentNode.status = MissionTaskStatus.BLOCKED;
                    cascadeQueue.push(edge.toId);
                    this.logger.warn(`Node ${edge.toId} BLOCKED due to hard dependency failure on ${nodeId}`);
                }
            }
            else {
                this.logger.warn(`Node ${edge.toId} has ${edge.type} on failed node ${nodeId}. ` +
                    `Status remains ${dependentNode.status}.`);
            }
        }
        while (cascadeQueue.length > 0) {
            const blockedNodeId = cascadeQueue.shift();
            const blockedDeps = taskGraph.edges.filter((e) => e.fromId === blockedNodeId);
            for (const edge of blockedDeps) {
                const depNode = taskGraph.nodes.get(edge.toId);
                if (!depNode)
                    continue;
                if (edge.type === TaskEdgeType.HARD_DEPENDENCY &&
                    depNode.status !== MissionTaskStatus.COMPLETED &&
                    depNode.status !== MissionTaskStatus.FAILED &&
                    depNode.status !== MissionTaskStatus.SKIPPED &&
                    depNode.status !== MissionTaskStatus.BLOCKED) {
                    depNode.status = MissionTaskStatus.BLOCKED;
                    cascadeQueue.push(edge.toId);
                    this.logger.warn(`Node ${edge.toId} BLOCKED (cascaded from ${blockedNodeId})`);
                }
            }
        }
        this.updateObjectiveProgress(missionId, node.objectiveId);
        const allObjectivesFailed = mission.objectives.every((obj) => {
            const objProgress = this.calculateObjectiveProgress(obj, taskGraph);
            return objProgress >= 1 || this.isObjectiveFailed(obj, taskGraph);
        });
        const anyRootObjectiveFailed = mission.objectives.some((obj) => this.isObjectiveFailed(obj, taskGraph));
        if (anyRootObjectiveFailed) {
            mission.status = MissionStatus.FAILED;
            mission.completedAt = new Date();
            mission.updatedAt = new Date();
            this.logger.error(`Mission ${missionId} status → FAILED due to objective failure`);
        }
    }
    buildResultGraph(missionId) {
        const mission = this.getMissionOrThrow(missionId);
        if (!mission.taskGraph) {
            throw new Error(`Mission ${missionId} has no task graph`);
        }
        const { taskGraph } = mission;
        const results = new Map();
        let totalExecutionTimeMs = 0;
        let successCount = 0;
        let failCount = 0;
        for (const node of Array.from(taskGraph.nodes.values())) {
            if (node.status === MissionTaskStatus.COMPLETED || node.status === MissionTaskStatus.FAILED) {
                const taskResult = {
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
                }
                else {
                    failCount++;
                }
            }
        }
        let completedObjectives = 0;
        let failedObjectives = 0;
        for (const objective of mission.objectives) {
            const progress = this.calculateObjectiveProgress(objective, taskGraph);
            const isFailed = this.isObjectiveFailed(objective, taskGraph);
            if (progress >= 1) {
                completedObjectives++;
            }
            else if (isFailed) {
                failedObjectives++;
            }
        }
        const overallSuccess = mission.objectives.length > 0 && completedObjectives === mission.objectives.length;
        const resultGraph = {
            results,
            overallSuccess,
            totalExecutionTimeMs,
            completedObjectives,
            failedObjectives,
        };
        mission.resultGraph = resultGraph;
        mission.updatedAt = new Date();
        this.logger.log(`Built result graph for mission ${missionId}: ` +
            `overallSuccess=${overallSuccess}, ${successCount} tasks succeeded, ` +
            `${failCount} tasks failed, ${completedObjectives}/${mission.objectives.length} objectives completed`);
        return resultGraph;
    }
    getMission(missionId) {
        return this.missions.get(missionId) ?? null;
    }
    getMissionStatus(missionId) {
        const mission = this.getMissionOrThrow(missionId);
        let totalTasks = 0;
        let completedTasks = 0;
        let failedTasks = 0;
        if (mission.taskGraph) {
            for (const node of Array.from(mission.taskGraph.nodes.values())) {
                totalTasks++;
                if (node.status === MissionTaskStatus.COMPLETED)
                    completedTasks++;
                if (node.status === MissionTaskStatus.FAILED)
                    failedTasks++;
            }
        }
        const totalObjectives = mission.objectives.length;
        const completedObjectives = mission.objectives.filter((obj) => this.calculateObjectiveProgress(obj, mission.taskGraph) >= 1).length;
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
    getReadyNodes(missionId) {
        const mission = this.getMissionOrThrow(missionId);
        if (!mission.taskGraph) {
            return [];
        }
        const { nodes, edges } = mission.taskGraph;
        const readyNodes = [];
        for (const node of Array.from(nodes.values())) {
            if (node.status !== MissionTaskStatus.PENDING && node.status !== MissionTaskStatus.READY) {
                continue;
            }
            const incomingHardEdges = edges.filter((e) => e.toId === node.id && e.type === TaskEdgeType.HARD_DEPENDENCY);
            const allHardDepsMet = incomingHardEdges.every((e) => {
                const depNode = nodes.get(e.fromId);
                return depNode?.status === MissionTaskStatus.COMPLETED;
            });
            const incomingSoftEdges = edges.filter((e) => e.toId === node.id && e.type !== TaskEdgeType.HARD_DEPENDENCY);
            const allSoftDepsResolved = incomingSoftEdges.every((e) => {
                const depNode = nodes.get(e.fromId);
                return (depNode?.status === MissionTaskStatus.COMPLETED ||
                    depNode?.status === MissionTaskStatus.FAILED ||
                    depNode?.status === MissionTaskStatus.SKIPPED);
            });
            if (allHardDepsMet && allSoftDepsResolved) {
                if (node.status === MissionTaskStatus.PENDING) {
                    node.status = MissionTaskStatus.READY;
                }
                readyNodes.push(node);
            }
        }
        return readyNodes;
    }
    getCriticalPath(missionId) {
        const mission = this.getMissionOrThrow(missionId);
        if (!mission.taskGraph) {
            return [];
        }
        return mission.taskGraph.criticalPath;
    }
    updateObjectiveProgress(missionId, objectiveId) {
        const mission = this.getMissionOrThrow(missionId);
        const objective = this.findObjectiveRecursive(mission.objectives, objectiveId);
        if (!objective) {
            throw new Error(`Objective ${objectiveId} not found in mission ${missionId}`);
        }
        const progress = this.calculateObjectiveProgress(objective, mission.taskGraph);
        objective.progress = Math.round(progress * 1000) / 1000;
        if (objective.progress >= 1) {
            objective.status = MissionStatus.COMPLETED;
        }
        else if (this.isObjectiveFailed(objective, mission.taskGraph)) {
            objective.status = MissionStatus.FAILED;
        }
        else if (objective.progress > 0) {
            objective.status = MissionStatus.IN_PROGRESS;
        }
        mission.updatedAt = new Date();
        return objective.progress;
    }
    cancelMission(missionId) {
        const mission = this.getMissionOrThrow(missionId);
        if (mission.status === MissionStatus.COMPLETED ||
            mission.status === MissionStatus.CANCELLED) {
            throw new Error(`Cannot cancel mission ${missionId}: already ${mission.status}`);
        }
        if (mission.taskGraph) {
            for (const node of Array.from(mission.taskGraph.nodes.values())) {
                if (node.status === MissionTaskStatus.RUNNING ||
                    node.status === MissionTaskStatus.READY ||
                    node.status === MissionTaskStatus.PENDING) {
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
    getMissionStats() {
        const allMissions = Array.from(this.missions.values());
        const byStatus = {};
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
        const avgCompletionTimeMs = totalCompleted > 0 ? Math.round(totalCompletionTimeMs / totalCompleted) : null;
        return {
            totalMissions: allMissions.length,
            byStatus,
            avgCompletionTimeMs,
            totalCompleted,
            totalFailed,
        };
    }
    generateId(prefix) {
        this.idCounter++;
        return `${prefix}_${Date.now()}_${this.idCounter}`;
    }
    getMissionOrThrow(missionId) {
        const mission = this.missions.get(missionId);
        if (!mission) {
            throw new Error(`Mission ${missionId} not found`);
        }
        return mission;
    }
    findObjectiveRecursive(objectives, objectiveId) {
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
    collectTaskNodesFromObjectives(objectives, nodes) {
        for (const objective of objectives) {
            if (objective.taskIds.length === 0) {
                const nodeType = objective.subObjectives.length > 0 ? 'objective' : 'task';
                const node = {
                    id: objective.id,
                    type: nodeType,
                    objectiveId: objective.id,
                    agentId: objective.assignedAgents[0] ?? null,
                    capability: null,
                    description: objective.description,
                    dependencies: [],
                    estimatedDurationMs: 5000,
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
            if (objective.subObjectives.length > 0) {
                const parentTaskIds = objective.taskIds;
                for (const subObj of objective.subObjectives) {
                    this.collectTaskNodesFromObjectives([subObj], nodes);
                    for (const subTaskId of subObj.taskIds) {
                        const subNode = nodes.get(subTaskId);
                        if (subNode && parentTaskIds.length > 0) {
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
    topologicalSort(nodes, edges) {
        const inDegree = new Map();
        const adjacency = new Map();
        for (const nodeId of Array.from(nodes.keys())) {
            inDegree.set(nodeId, 0);
            adjacency.set(nodeId, []);
        }
        for (const edge of edges) {
            if (!adjacency.has(edge.fromId))
                adjacency.set(edge.fromId, []);
            adjacency.get(edge.fromId).push(edge.toId);
            inDegree.set(edge.toId, (inDegree.get(edge.toId) ?? 0) + 1);
        }
        const queue = [];
        for (const [nodeId, degree] of Array.from(inDegree.entries())) {
            if (degree === 0) {
                queue.push(nodeId);
            }
        }
        const sorted = [];
        while (queue.length > 0) {
            const current = queue.shift();
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
        if (sorted.length !== nodes.size) {
            this.logger.error(`Cycle detected in task graph! Sorted ${sorted.length}/${nodes.size} nodes.`);
        }
        return sorted;
    }
    computeCriticalPath(nodes, edges, topoOrder) {
        if (topoOrder.length === 0)
            return [];
        const dist = new Map();
        const predecessor = new Map();
        for (const nodeId of topoOrder) {
            dist.set(nodeId, 0);
            predecessor.set(nodeId, null);
        }
        const incomingEdges = new Map();
        for (const nodeId of Array.from(nodes.keys())) {
            incomingEdges.set(nodeId, []);
        }
        for (const edge of edges) {
            if (!incomingEdges.has(edge.toId))
                incomingEdges.set(edge.toId, []);
            incomingEdges.get(edge.toId).push(edge);
        }
        for (const nodeId of topoOrder) {
            const node = nodes.get(nodeId);
            if (!node)
                continue;
            const currentDist = dist.get(nodeId) ?? 0;
            const nodeDuration = node.estimatedDurationMs;
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
        let maxTotalDist = -1;
        let sinkNode = topoOrder[topoOrder.length - 1];
        for (const nodeId of topoOrder) {
            const node = nodes.get(nodeId);
            if (!node)
                continue;
            const totalDist = (dist.get(nodeId) ?? 0) + node.estimatedDurationMs;
            if (totalDist > maxTotalDist) {
                maxTotalDist = totalDist;
                sinkNode = nodeId;
            }
        }
        const path = [];
        let current = sinkNode;
        while (current !== null) {
            path.unshift(current);
            current = predecessor.get(current) ?? null;
        }
        return path;
    }
    computeParallelGroups(nodes, edges) {
        if (nodes.size === 0)
            return [];
        const level = new Map();
        const incomingEdges = new Map();
        for (const nodeId of Array.from(nodes.keys())) {
            incomingEdges.set(nodeId, []);
        }
        for (const edge of edges) {
            if (!incomingEdges.has(edge.toId))
                incomingEdges.set(edge.toId, []);
            incomingEdges.get(edge.toId).push(edge);
        }
        const topoOrder = this.topologicalSort(nodes, edges);
        for (const nodeId of topoOrder) {
            const incoming = incomingEdges.get(nodeId) ?? [];
            if (incoming.length === 0) {
                level.set(nodeId, 0);
            }
            else {
                const maxPredLevel = Math.max(...incoming.map((e) => level.get(e.fromId) ?? 0));
                level.set(nodeId, maxPredLevel + 1);
            }
        }
        const groups = new Map();
        for (const [nodeId, nodeLevel] of Array.from(level.entries())) {
            if (!groups.has(nodeLevel)) {
                groups.set(nodeLevel, []);
            }
            groups.get(nodeLevel).push(nodeId);
        }
        const sortedLevels = Array.from(groups.keys()).sort((a, b) => a - b);
        const parallelGroups = [];
        for (const lvl of sortedLevels) {
            const groupNodes = groups.get(lvl).sort((a, b) => {
                const nodeA = nodes.get(a);
                const nodeB = nodes.get(b);
                return (nodeB?.priority ?? 0) - (nodeA?.priority ?? 0);
            });
            parallelGroups.push(groupNodes);
        }
        return parallelGroups;
    }
    calculateObjectiveProgress(objective, taskGraph) {
        if (!taskGraph)
            return 0;
        const allTaskIds = this.getAllTaskIdsRecursive(objective);
        if (allTaskIds.length === 0)
            return 0;
        let completedCount = 0;
        for (const taskId of allTaskIds) {
            const node = taskGraph.nodes.get(taskId);
            if (node?.status === MissionTaskStatus.COMPLETED) {
                completedCount++;
            }
        }
        return completedCount / allTaskIds.length;
    }
    getAllTaskIdsRecursive(objective) {
        const ids = [...objective.taskIds];
        for (const subObj of objective.subObjectives) {
            ids.push(...this.getAllTaskIdsRecursive(subObj));
        }
        return ids;
    }
    isObjectiveFailed(objective, taskGraph) {
        if (!taskGraph)
            return false;
        const allTaskIds = this.getAllTaskIdsRecursive(objective);
        if (allTaskIds.length === 0)
            return false;
        let failedOrBlockedCount = 0;
        let completedCount = 0;
        for (const taskId of allTaskIds) {
            const node = taskGraph.nodes.get(taskId);
            if (!node)
                continue;
            if (node.status === MissionTaskStatus.COMPLETED) {
                completedCount++;
            }
            else if (node.status === MissionTaskStatus.FAILED ||
                node.status === MissionTaskStatus.BLOCKED) {
                failedOrBlockedCount++;
            }
        }
        return failedOrBlockedCount === allTaskIds.length && completedCount === 0;
    }
};
exports.MissionGraphService = MissionGraphService;
exports.MissionGraphService = MissionGraphService = MissionGraphService_1 = __decorate([
    (0, common_1.Injectable)()
], MissionGraphService);
//# sourceMappingURL=mission-graph.service.js.map