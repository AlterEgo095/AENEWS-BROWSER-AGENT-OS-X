// Agent Types
export enum ClusterType {
  BROWSER = 'browser',
  COMPUTER = 'computer',
  CODING = 'coding',
  OFFICE = 'office',
  MARKETING = 'marketing',
  BUSINESS = 'business',
  INFRASTRUCTURE = 'infrastructure',
  SECURITY = 'security',
  META_INTELLIGENCE = 'meta-intelligence',
  // Phase 2 — Intelligence Clusters
  LLM_INTELLIGENCE = 'llm-intelligence',
  INTELLIGENT_ORCHESTRATION = 'intelligent-orchestration',
  WATCHDOG = 'watchdog',
  SELF_EVOLUTION = 'self-evolution',
  CERTIFICATION = 'certification',
}

export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped',
  COMPLETED = 'completed',
}

export interface Agent {
  id: string;
  name: string;
  cluster: ClusterType;
  status: AgentStatus;
  config: Record<string, unknown>;
  capabilities: string[];
  tenantId: string;
  version: string;
  description: string | null;
  isEnabled: boolean;
  lastExecutionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClusterStats {
  cluster: ClusterType;
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  errorAgents: number;
  agents: Agent[];
}

// Task Types
export enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

export interface Task {
  id: string;
  type: string;
  agentId: string | null;
  tenantId: string;
  status: TaskStatus;
  priority: number;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  parentTaskId: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Event Types
export enum EventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface Event {
  id: string;
  type: string;
  namespace: string;
  payload: Record<string, unknown>;
  source: string;
  severity: EventSeverity;
  tenantId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// Health Types
export interface HealthCheckResult {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, HealthCheckDetail>;
  error?: Record<string, HealthCheckDetail>;
  details?: Record<string, HealthCheckDetail>;
}

export interface HealthCheckDetail {
  status: string;
  [key: string]: unknown;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantSlug?: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

// Mission Types
export enum MissionState {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  RESEARCH = 'RESEARCH',
  BUILDING = 'BUILDING',
  TESTING = 'TESTING',
  AUDITING = 'AUDITING',
  CERTIFYING = 'CERTIFYING',
  DELIVERING = 'DELIVERING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum MissionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  state: MissionState;
  priority: MissionPriority;
  progress: number;
  objectives: any[];
  constraints: string[];
  requiredCapabilities: string[];
  result: any;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Phase 8 — Intelligent Orchestration Types
export type CollaborationPattern =
  | 'delegation'
  | 'handoff'
  | 'parallel'
  | 'pipeline'
  | 'consensus'
  | 'swarm';

export interface CollaborationResult {
  id: string;
  pattern: CollaborationPattern;
  description: string;
  objectives: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  participants: string[];
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DecompositionResult {
  id: string;
  missionId: string | null;
  description: string;
  objectives: string[];
  subTasks: DecomposedTask[];
  strategy: string;
  estimatedDuration: string | null;
  createdAt: string;
}

export interface DecomposedTask {
  id: string;
  title: string;
  description: string;
  cluster: ClusterType;
  priority: MissionPriority;
  dependencies: string[];
  estimatedEffort: string;
  status: 'pending' | 'assigned' | 'running' | 'completed';
}

export interface CoordinationResult {
  id: string;
  taskIds: string[];
  strategy: string;
  status: 'pending' | 'coordinating' | 'completed' | 'failed';
  assignments: TaskAssignment[];
  timeline: CoordinationTimeline | null;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAssignment {
  taskId: string;
  agentId: string;
  cluster: ClusterType;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface CoordinationTimeline {
  phases: CoordinationPhase[];
  estimatedTotalDuration: string;
}

export interface CoordinationPhase {
  name: string;
  taskIds: string[];
  startAfter: string | null;
  estimatedDuration: string;
}

export interface UnifiedConnectorInfo {
  id: string;
  name: string;
  type: string;
  mode: 'active' | 'passive' | 'hybrid';
  status: 'connected' | 'disconnected' | 'error' | 'initializing';
  health: number; // 0-100
  capabilities: string[];
  lastActivityAt: string | null;
  metadata: Record<string, unknown>;
  hitRate: number; // percentage
  totalExecutions: number;
  successRate: number; // percentage
}

export interface ClusterHealthInfo {
  cluster: ClusterType;
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  health: number; // 0-100
  activeAgents: number;
  totalAgents: number;
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgResponseTime: number; // ms
  lastCheckedAt: string;
}

export interface OrchestrationStatistics {
  totalCollaborations: number;
  activeCollaborations: number;
  totalDecompositions: number;
  totalCoordinations: number;
  avgDecompositionTime: number; // ms
  avgCoordinationTime: number; // ms
  connectorStats: ConnectorStat[];
  patternUsage: Record<CollaborationPattern, number>;
}

export interface ConnectorStat {
  connectorId: string;
  connectorName: string;
  hitRate: number;
  totalExecutions: number;
  successRate: number;
  avgResponseTime: number;
}

export interface OrchestrationHistoryItem {
  id: string;
  type: 'collaboration' | 'decomposition' | 'coordination';
  description: string;
  status: string;
  pattern?: CollaborationPattern;
  createdAt: string;
  completedAt: string | null;
}
