import { CapabilityId, CapabilityPack } from './capability.interface';
export declare enum GraphNodeType {
    RESEARCH = "RESEARCH",
    BUILD = "BUILD",
    TEST = "TEST",
    CERTIFY = "CERTIFY",
    DELIVER = "DELIVER"
}
export interface GraphNode {
    id: string;
    label: string;
    type: GraphNodeType;
    capabilities: CapabilityId[];
    packs: CapabilityPack[];
    status: GraphNodeStatus;
    assignedWorkerId?: string;
    result?: GraphNodeResult;
    retryCount: number;
    maxRetries: number;
}
export declare enum GraphNodeStatus {
    PENDING = "PENDING",
    READY = "READY",
    RUNNING = "RUNNING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    SKIPPED = "SKIPPED"
}
export interface GraphNodeResult {
    success: boolean;
    output: any;
    artifacts: string[];
    durationMs: number;
    costUsd: number;
    error?: string;
}
export interface GraphEdge {
    from: string;
    to: string;
    type: EdgeType;
}
export declare enum EdgeType {
    DEPENDS_ON = "DEPENDS_ON",
    RECOMMENDED = "RECOMMENDED",
    PARALLEL = "PARALLEL"
}
export interface ExecutionGraph {
    id: string;
    missionId: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    createdAt: Date;
    status: GraphStatus;
    entryNodes: string[];
    exitNodes: string[];
}
export declare enum GraphStatus {
    DRAFT = "DRAFT",
    READY = "READY",
    RUNNING = "RUNNING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    PARTIAL = "PARTIAL"
}
export interface ExecutionPlan {
    graph: ExecutionGraph;
    phases: ExecutionPhase[];
    totalEstimatedCostUsd: number;
    totalEstimatedDurationMs: number;
    workersNeeded: number;
    maxParallelWorkers: number;
    packsRequired: CapabilityPack[];
}
export interface ExecutionPhase {
    id: string;
    name: string;
    nodeIds: string[];
    parallel: boolean;
    estimatedDurationMs: number;
    estimatedCostUsd: number;
}
export interface GraphBuildOptions {
    maxParallelism: number;
    maxRetriesPerNode: number;
    costBudgetUsd: number;
    timeBudgetMs: number;
    skipOptional: boolean;
}
export declare const DEFAULT_GRAPH_OPTIONS: GraphBuildOptions;
