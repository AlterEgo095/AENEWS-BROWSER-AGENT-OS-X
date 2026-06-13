/**
 * AENEWS Software Factory — Worker Interface
 * 
 * Workers are ephemeral. They:
 * 1. Are created by the Worker Factory for a specific mission
 * 2. Receive injected capabilities from the Capability Registry
 * 3. Execute their assigned graph nodes
 * 4. Are destroyed after completion
 * 
 * A single Worker can hold multiple capabilities.
 * Example: Worker #1 receives [architecture, frontend] capabilities.
 */

import { CapabilityId, CapabilityExecutionResult, CapabilityDefinition } from './capability.interface';

// ─── Worker Lifecycle ────────────────────────────────────────

export enum WorkerStatus {
  SPAWNING = 'SPAWNING',
  READY = 'READY',
  EXECUTING = 'EXECUTING',
  IDLE = 'IDLE',
  TERMINATING = 'TERMINATING',
  TERMINATED = 'TERMINATED',
  FAILED = 'FAILED',
}

// ─── Worker Profile ──────────────────────────────────────────

export interface WorkerProfile {
  id: string;
  missionId: string;
  capabilities: CapabilityId[];
  capabilityDefinitions: CapabilityDefinition[];
  status: WorkerStatus;
  spawnedAt: Date;
  terminatedAt?: Date;
  tasksCompleted: number;
  tasksFailed: number;
  totalCostUsd: number;
  totalDurationMs: number;
  maxLifetimeMs: number;
  maxTasks: number;
  assignedNodeIds: string[];  // which graph nodes this worker handles
  results: CapabilityExecutionResult[];
}

// ─── Worker Factory Request ──────────────────────────────────

export interface WorkerSpawnRequest {
  missionId: string;
  capabilities: CapabilityId[];     // capabilities to inject
  assignedNodeIds: string[];        // graph nodes this worker will execute
  maxLifetimeMs?: number;
  maxTasks?: number;
}

export interface WorkerSpawnResult {
  workerId: string;
  capabilities: CapabilityId[];
  status: WorkerStatus;
  ready: boolean;
}

// ─── Worker Termination ──────────────────────────────────────

export interface WorkerTerminateRequest {
  workerId: string;
  reason: 'mission_complete' | 'failed' | 'timeout' | 'manual' | 'budget_exceeded';
  archiveResults: boolean;
}

export interface WorkerTerminateResult {
  workerId: string;
  terminated: boolean;
  finalStatus: WorkerStatus;
  tasksCompleted: number;
  tasksFailed: number;
  totalCostUsd: number;
  totalDurationMs: number;
  results: CapabilityExecutionResult[];
  archivedPath?: string;
}

// ─── Worker Execution ────────────────────────────────────────

export interface WorkerExecutionRequest {
  workerId: string;
  nodeId: string;
  input: any;
  timeoutMs?: number;
}

export interface WorkerExecutionResult {
  workerId: string;
  nodeId: string;
  success: boolean;
  output: any;
  artifacts: string[];
  durationMs: number;
  costUsd: number;
  error?: string;
}

// ─── Worker Pool Statistics ──────────────────────────────────

export interface WorkerPoolStatistics {
  totalSpawned: number;
  totalTerminated: number;
  currentlyActive: number;
  byCapability: Record<string, number>;
  totalCostUsd: number;
  averageLifetimeMs: number;
  averageTasksPerWorker: number;
  missionsServed: number;
}

// ─── Worker Pool Constraints ─────────────────────────────────

export interface WorkerPoolConstraints {
  maxConcurrentWorkers: number;      // default: 25
  maxWorkersPerCapability: number;   // default: 5
  maxTotalCostUsd: number;           // default: 500
  defaultLifetimeMs: number;         // default: 4h
  defaultMaxTasksPerWorker: number;  // default: 50
}

export const DEFAULT_WORKER_CONSTRAINTS: WorkerPoolConstraints = {
  maxConcurrentWorkers: 25,
  maxWorkersPerCapability: 5,
  maxTotalCostUsd: 500,
  defaultLifetimeMs: 4 * 60 * 60 * 1000,
  defaultMaxTasksPerWorker: 50,
};
