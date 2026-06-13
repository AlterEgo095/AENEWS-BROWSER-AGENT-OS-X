/**
 * AENEWS Software Factory — Execution Graph Interface
 *
 * The Execution Graph is a DAG (Directed Acyclic Graph) that represents
 * the mission execution plan. Nodes are tasks, edges are dependencies.
 *
 * Mission → Planner → Execution Graph → Capability Resolver → Worker Factory
 */

import { CapabilityId, CapabilityPack } from './capability.interface';

// ─── Graph Node (a task to execute) ─────────────────────────

export enum GraphNodeType {
  RESEARCH = 'RESEARCH',
  BUILD = 'BUILD',
  TEST = 'TEST',
  CERTIFY = 'CERTIFY',
  DELIVER = 'DELIVER',
}

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  capabilities: CapabilityId[]; // capabilities this node requires
  packs: CapabilityPack[]; // which packs are needed
  status: GraphNodeStatus;
  assignedWorkerId?: string; // which worker executes this node
  result?: GraphNodeResult;
  retryCount: number;
  maxRetries: number;
}

export enum GraphNodeStatus {
  PENDING = 'PENDING',
  READY = 'READY', // all dependencies satisfied
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export interface GraphNodeResult {
  success: boolean;
  output: any;
  artifacts: string[];
  durationMs: number;
  costUsd: number;
  error?: string;
}

// ─── Graph Edge (dependency) ─────────────────────────────────

export interface GraphEdge {
  from: string; // source node ID
  to: string; // target node ID
  type: EdgeType;
}

export enum EdgeType {
  DEPENDS_ON = 'DEPENDS_ON', // hard dependency: must complete before
  RECOMMENDED = 'RECOMMENDED', // soft dependency: preferred order
  PARALLEL = 'PARALLEL', // can run in parallel, but grouped
}

// ─── Execution Graph ─────────────────────────────────────────

export interface ExecutionGraph {
  id: string;
  missionId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  createdAt: Date;
  status: GraphStatus;
  entryNodes: string[]; // node IDs with no incoming edges (can start immediately)
  exitNodes: string[]; // node IDs with no outgoing edges (terminal nodes)
}

export enum GraphStatus {
  DRAFT = 'DRAFT',
  READY = 'READY',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

// ─── Graph Execution Plan ────────────────────────────────────

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
  parallel: boolean; // can nodes in this phase run in parallel?
  estimatedDurationMs: number;
  estimatedCostUsd: number;
}

// ─── Graph Builder Options ───────────────────────────────────

export interface GraphBuildOptions {
  maxParallelism: number; // max concurrent workers (default: 25)
  maxRetriesPerNode: number; // default: 2
  costBudgetUsd: number; // max budget for the entire graph
  timeBudgetMs: number; // max time for the entire graph
  skipOptional: boolean; // skip recommended (non-hard) dependencies
}

export const DEFAULT_GRAPH_OPTIONS: GraphBuildOptions = {
  maxParallelism: 25,
  maxRetriesPerNode: 2,
  costBudgetUsd: 100,
  timeBudgetMs: 48 * 60 * 60 * 1000, // 48h
  skipOptional: false,
};
