/**
 * AENEWS Software Factory — Ephemeral Agent Pool Interface
 *
 * Agents are NOT permanent. They are:
 * 1. Instantiated on-demand based on mission requirements
 * 2. Execute their assigned tasks
 * 3. Destroyed after completion
 * 4. Their results are archived for reproducibility
 */

export enum AgentStatus {
  SPAWNING = 'SPAWNING',
  READY = 'READY',
  EXECUTING = 'EXECUTING',
  IDLE = 'IDLE',
  TERMINATING = 'TERMINATING',
  TERMINATED = 'TERMINATED',
  FAILED = 'FAILED',
}

export interface PooledAgent {
  id: string;
  role: string; // AgentRole as string
  missionId: string;
  status: AgentStatus;
  spawnedAt: Date;
  terminatedAt?: Date;
  tasksCompleted: number;
  tasksFailed: number;
  totalCostUsd: number;
  config: Record<string, any>;
}

export interface SpawnRequest {
  missionId: string;
  role: string;
  skills: string[];
  config?: Record<string, any>;
  maxLifetime?: number; // ms
  maxTasks?: number;
}

export interface SpawnResult {
  agentId: string;
  role: string;
  status: AgentStatus;
  ready: boolean;
}

export interface TerminateRequest {
  agentId: string;
  reason: 'mission_complete' | 'task_failed' | 'timeout' | 'budget_exceeded' | 'manual' | 'error';
  archiveResults: boolean;
}

export interface TerminateResult {
  agentId: string;
  terminated: boolean;
  finalStatus: AgentStatus;
  tasksCompleted: number;
  totalCostUsd: number;
  archivedPath?: string;
}

export interface PoolStatistics {
  totalSpawned: number;
  totalTerminated: number;
  currentlyActive: number;
  byRole: Record<string, number>;
  totalCostUsd: number;
  averageLifetimeMs: number;
  averageTasksPerAgent: number;
}

export interface PoolConstraints {
  maxConcurrentAgents: number;
  maxAgentsPerRole: number;
  maxTotalCostUsd: number;
  defaultAgentLifetimeMs: number;
  defaultMaxTasksPerAgent: number;
}
