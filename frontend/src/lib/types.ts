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

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
