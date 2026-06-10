/**
 * AENEWS Agent OS X - Core Agent Interfaces
 * Defines the fundamental types and contracts for the agent framework.
 */

// ─── Agent Status ────────────────────────────────────────────────
export enum AgentStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped',
  MAINTENANCE = 'maintenance',
}

// ─── Agent Cluster ───────────────────────────────────────────────
export enum AgentCluster {
  BROWSER = 'browser',
  COMPUTER = 'computer',
  CODING = 'coding',
  OFFICE = 'office',
  MARKETING = 'marketing',
  BUSINESS = 'business',
  INFRASTRUCTURE = 'infrastructure',
  SECURITY = 'security',
  META_INTELLIGENCE = 'meta_intelligence',
}

// ─── Agent Capability ────────────────────────────────────────────
export interface AgentCapability {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
}

// ─── Agent Config ────────────────────────────────────────────────
export interface AgentConfig {
  id: string;
  name: string;
  cluster: AgentCluster;
  version: string;
  description: string;
  capabilities: AgentCapability[];
  permissions: string[];
  maxConcurrentTasks: number;
  timeout: number;
  retryPolicy: AgentRetryPolicy;
}

export interface AgentRetryPolicy {
  maxRetries: number;
  backoffMs: number;
  exponentialBackoff: boolean;
}

// ─── Agent Input / Output ────────────────────────────────────────
export interface AgentInput {
  taskId: string;
  payload: any;
  context?: Record<string, any>;
  parentTaskId?: string;
  priority?: TaskPriority;
}

export interface AgentOutput {
  taskId: string;
  success: boolean;
  result: any;
  error?: string;
  metrics: AgentMetrics;
  timestamp: Date;
}

// ─── Agent Metrics ───────────────────────────────────────────────
export interface AgentMetrics {
  executionTimeMs: number;
  memoryUsedMb: number;
  cpuUsagePercent: number;
  tokensUsed?: number;
  apiCalls?: number;
}

// ─── Agent State ─────────────────────────────────────────────────
export interface AgentState {
  config: AgentConfig;
  status: AgentStatus;
  currentTasks: string[];
  completedTasks: number;
  failedTasks: number;
  lastActivity: Date;
  health: AgentHealthState;
}

export interface AgentHealthState {
  isHealthy: boolean;
  lastHealthCheck: Date;
  consecutiveFailures: number;
  uptimeMs: number;
}

// ─── Agent Error ─────────────────────────────────────────────────
export class AgentError extends Error {
  constructor(
    message: string,
    public readonly code: AgentErrorCode,
    public readonly agentId: string,
    public readonly taskId?: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export enum AgentErrorCode {
  INITIALIZATION_FAILED = 'AGENT_INITIALIZATION_FAILED',
  EXECUTION_FAILED = 'AGENT_EXECUTION_FAILED',
  TIMEOUT = 'AGENT_TIMEOUT',
  PERMISSION_DENIED = 'AGENT_PERMISSION_DENIED',
  INVALID_INPUT = 'AGENT_INVALID_INPUT',
  NOT_FOUND = 'AGENT_NOT_FOUND',
  ALREADY_RUNNING = 'AGENT_ALREADY_RUNNING',
  NOT_RUNNING = 'AGENT_NOT_RUNNING',
  PAUSE_FAILED = 'AGENT_PAUSE_FAILED',
  RESUME_FAILED = 'AGENT_RESUME_FAILED',
  STOP_FAILED = 'AGENT_STOP_FAILED',
  DESTROY_FAILED = 'AGENT_DESTROY_FAILED',
  HEALTH_CHECK_FAILED = 'AGENT_HEALTH_CHECK_FAILED',
  MAX_CONCURRENT_TASKS = 'AGENT_MAX_CONCURRENT_TASKS',
  RETRY_EXHAUSTED = 'AGENT_RETRY_EXHAUSTED',
  CIRCUIT_BREAKER_OPEN = 'AGENT_CIRCUIT_BREAKER_OPEN',
  COMMUNICATION_FAILED = 'AGENT_COMMUNICATION_FAILED',
  MEMORY_ERROR = 'AGENT_MEMORY_ERROR',
}

// ─── Task Priority ───────────────────────────────────────────────
export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

// ─── Retry Policy (alias for AgentRetryPolicy) ──────────────────
export type RetryPolicy = AgentRetryPolicy;

// ─── Agent Health (alias for AgentHealthState) ──────────────────
export type AgentHealth = AgentHealthState;

// ─── Agent Tool ──────────────────────────────────────────────────
export interface AgentTool {
  name: string;
  description: string;
  execute: (...args: any[]) => Promise<any>;
}

// ─── Agent Permission ────────────────────────────────────────────
export interface AgentPermission {
  resource: string;
  actions: string[];
}

// ─── Agent Event (simple event shape for agent.event.interface.ts AgentEvent) ──
// NOTE: The comprehensive AgentEvent<T> is defined in agent-event.interface.ts.
// This simpler shape is available for lightweight event scenarios.
export interface SimpleAgentEvent {
  id: string;
  agentId: string;
  type: string;
  data: any;
  timestamp: Date;
  correlationId?: string;
}

// ─── Decomposition Result ────────────────────────────────────────
export interface DecompositionResult {
  subtasks: TaskDefinition[];
  dependencies: Map<string, string[]>;
  executionOrder: string[][];
}

// ─── Plan Step ───────────────────────────────────────────────────
export interface PlanStep {
  taskId: string;
  agentId: string;
  dependsOn: string[];
  estimatedDurationMs: number;
  retryCount: number;
}

// ─── Execution Plan ──────────────────────────────────────────────
export interface ExecutionPlan {
  steps: PlanStep[];
  totalEstimatedDurationMs: number;
  parallelizable: boolean;
}

// ─── Critique Result ─────────────────────────────────────────────
export interface CritiqueResult {
  passed: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

// ─── Validation Result ───────────────────────────────────────────
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Task Status ─────────────────────────────────────────────────
export enum TaskStatus {
  PENDING = 'pending',
  DECOMPOSING = 'decomposing',
  PLANNING = 'planning',
  EXECUTING = 'executing',
  CRITIQUING = 'critiquing',
  REPAIRING = 'repairing',
  VALIDATING = 'validating',
  DELIVERING = 'delivering',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// ─── Task Definition ─────────────────────────────────────────────
export interface TaskDefinition {
  id: string;
  parentId?: string;
  agentId?: string;
  cluster?: AgentCluster;
  status: TaskStatus;
  priority: TaskPriority;
  input: AgentInput;
  output?: AgentOutput;
  subtasks: string[];
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  correlationId: string;
  metadata: Record<string, any>;
}

// ─── Orchestration Plan ──────────────────────────────────────────
export interface OrchestrationPlan {
  id: string;
  taskId: string;
  steps: OrchestrationStep[];
  dependencies: StepDependency[];
  createdAt: Date;
  estimatedDurationMs: number;
}

export interface OrchestrationStep {
  id: string;
  order: number;
  agentId?: string;
  cluster?: AgentCluster;
  capability?: string;
  input: AgentInput;
  status: TaskStatus;
  output?: AgentOutput;
  retryCount: number;
}

export interface StepDependency {
  stepId: string;
  dependsOnStepIds: string[];
}
