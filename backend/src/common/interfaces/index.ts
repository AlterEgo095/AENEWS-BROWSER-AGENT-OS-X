export interface IAgent {
  id: string;
  name: string;
  cluster: string;
  status: string;
  config: Record<string, any>;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAgentExecution {
  agentId: string;
  taskId: string;
  input: any;
  output?: any;
  status: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface IEvent {
  id: string;
  type: string;
  namespace: string;
  payload: any;
  source: string;
  tenantId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  config: Record<string, any>;
  hooks: string[];
  tenantId?: string;
}

export interface ITask {
  id: string;
  type: string;
  agentId: string;
  tenantId: string;
  status: string;
  priority: number;
  input: any;
  output?: any;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface ITenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  config: Record<string, any>;
  quotas: ITenantQuotas;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITenantQuotas {
  maxAgents: number;
  maxTasks: number;
  maxStorage: number; // MB
  maxConcurrentExecutions: number;
}

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  TENANT_ADMIN = 'tenant_admin',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  meta?: {
    timestamp: string;
    requestId: string;
  };
}
