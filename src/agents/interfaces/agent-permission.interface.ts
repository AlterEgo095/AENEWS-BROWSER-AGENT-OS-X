/**
 * AENEWS Agent OS X - Agent Permission Interface
 * Defines the permission system for controlling agent capabilities and access.
 */

import { AgentCluster, AgentPermission } from './agent.interface';

// ─── Permission Actions ──────────────────────────────────────────
export enum PermissionAction {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  DELETE = 'delete',
  MANAGE = 'manage',
  ADMIN = 'admin',
}

// ─── Permission Resources ────────────────────────────────────────
export enum PermissionResource {
  AGENT = 'agent',
  TASK = 'task',
  MEMORY = 'memory',
  EVENT = 'event',
  BROWSER = 'browser',
  FILE_SYSTEM = 'file_system',
  NETWORK = 'network',
  DATABASE = 'database',
  QUEUE = 'queue',
  CLUSTER = 'cluster',
  CONFIGURATION = 'configuration',
  LOGS = 'logs',
  METRICS = 'metrics',
  CREDENTIALS = 'credentials',
  API_KEY = 'api_key',
}

// ─── Permission Scope ────────────────────────────────────────────
export enum PermissionScope {
  SELF = 'self',
  CLUSTER = 'cluster',
  GLOBAL = 'global',
}

// ─── Permission Definition ───────────────────────────────────────
export interface PermissionDefinition {
  id: string;
  action: PermissionAction;
  resource: PermissionResource;
  scope: PermissionScope;
  conditions?: PermissionCondition[];
  description: string;
}

// ─── Permission Condition ────────────────────────────────────────
export interface PermissionCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

export enum ConditionOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  IN = 'in',
  NOT_IN = 'nin',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN_OR_EQUAL = 'lte',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
}

// ─── Permission Check Result ─────────────────────────────────────
export interface PermissionCheckResult {
  granted: boolean;
  permission: PermissionDefinition;
  reason?: string;
  evaluatedAt: Date;
}

// ─── Permission Set ──────────────────────────────────────────────
export interface PermissionSet {
  agentId: string;
  permissions: PermissionDefinition[];
  inheritedFrom?: string[];
  grantedAt: Date;
  expiresAt?: Date;
}

// ─── Role Definition ─────────────────────────────────────────────
export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  cluster: AgentCluster;
  permissions: PermissionDefinition[];
  inheritsFrom?: string[];
}

// ─── Permission Evaluator ────────────────────────────────────────
export interface IPermissionEvaluator {
  /**
   * Check if an agent has a specific permission.
   */
  hasPermission(
    agentId: string,
    action: PermissionAction,
    resource: PermissionResource,
    scope?: PermissionScope,
    context?: Record<string, any>,
  ): Promise<boolean>;

  /**
   * Get all permissions for an agent.
   */
  getPermissions(agentId: string): Promise<PermissionSet>;

  /**
   * Grant a permission to an agent.
   */
  grantPermission(agentId: string, permission: PermissionDefinition): Promise<void>;

  /**
   * Revoke a permission from an agent.
   */
  revokePermission(agentId: string, permissionId: string): Promise<void>;

  /**
   * Check permissions in bulk.
   */
  checkPermissions(
    agentId: string,
    checks: Array<{
      action: PermissionAction;
      resource: PermissionResource;
      scope?: PermissionScope;
    }>,
  ): Promise<PermissionCheckResult[]>;
}

// ─── Default Cluster Permissions ─────────────────────────────────
export const DEFAULT_CLUSTER_PERMISSIONS: Record<AgentCluster, PermissionDefinition[]> = {
  [AgentCluster.BROWSER]: [
    {
      id: 'browser:execute:browser',
      action: PermissionAction.EXECUTE,
      resource: PermissionResource.BROWSER,
      scope: PermissionScope.CLUSTER,
      description: 'Execute browser automation tasks',
    },
    {
      id: 'browser:read:network',
      action: PermissionAction.READ,
      resource: PermissionResource.NETWORK,
      scope: PermissionScope.CLUSTER,
      description: 'Read network requests from browser sessions',
    },
    {
      id: 'browser:read:memory',
      action: PermissionAction.READ,
      resource: PermissionResource.MEMORY,
      scope: PermissionScope.SELF,
      description: 'Read from own memory store',
    },
  ],
  [AgentCluster.COMPUTER]: [
    {
      id: 'computer:execute:file_system',
      action: PermissionAction.EXECUTE,
      resource: PermissionResource.FILE_SYSTEM,
      scope: PermissionScope.CLUSTER,
      description: 'Execute file system operations',
    },
    {
      id: 'computer:read:network',
      action: PermissionAction.READ,
      resource: PermissionResource.NETWORK,
      scope: PermissionScope.CLUSTER,
      description: 'Read network information',
    },
    {
      id: 'computer:write:file_system',
      action: PermissionAction.WRITE,
      resource: PermissionResource.FILE_SYSTEM,
      scope: PermissionScope.CLUSTER,
      description: 'Write to file system',
    },
  ],
  [AgentCluster.CODING]: [
    {
      id: 'coding:execute:file_system',
      action: PermissionAction.EXECUTE,
      resource: PermissionResource.FILE_SYSTEM,
      scope: PermissionScope.CLUSTER,
      description: 'Execute code and file operations',
    },
    {
      id: 'coding:write:file_system',
      action: PermissionAction.WRITE,
      resource: PermissionResource.FILE_SYSTEM,
      scope: PermissionScope.CLUSTER,
      description: 'Write code files',
    },
    {
      id: 'coding:read:agent',
      action: PermissionAction.READ,
      resource: PermissionResource.AGENT,
      scope: PermissionScope.CLUSTER,
      description: 'Read agent information',
    },
  ],
  [AgentCluster.OFFICE]: [
    {
      id: 'office:execute:task',
      action: PermissionAction.EXECUTE,
      resource: PermissionResource.TASK,
      scope: PermissionScope.CLUSTER,
      description: 'Execute office automation tasks',
    },
    {
      id: 'office:write:file_system',
      action: PermissionAction.WRITE,
      resource: PermissionResource.FILE_SYSTEM,
      scope: PermissionScope.CLUSTER,
      description: 'Write office documents',
    },
  ],
  [AgentCluster.MARKETING]: [
    {
      id: 'marketing:execute:network',
      action: PermissionAction.EXECUTE,
      resource: PermissionResource.NETWORK,
      scope: PermissionScope.CLUSTER,
      description: 'Execute marketing network requests',
    },
    {
      id: 'marketing:write:task',
      action: PermissionAction.WRITE,
      resource: PermissionResource.TASK,
      scope: PermissionScope.CLUSTER,
      description: 'Create marketing tasks',
    },
  ],
  [AgentCluster.BUSINESS]: [
    {
      id: 'business:read:database',
      action: PermissionAction.READ,
      resource: PermissionResource.DATABASE,
      scope: PermissionScope.CLUSTER,
      description: 'Read business data',
    },
    {
      id: 'business:execute:task',
      action: PermissionAction.EXECUTE,
      resource: PermissionResource.TASK,
      scope: PermissionScope.CLUSTER,
      description: 'Execute business tasks',
    },
  ],
  [AgentCluster.INFRASTRUCTURE]: [
    {
      id: 'infra:manage:cluster',
      action: PermissionAction.MANAGE,
      resource: PermissionResource.CLUSTER,
      scope: PermissionScope.GLOBAL,
      description: 'Manage cluster infrastructure',
    },
    {
      id: 'infra:admin:configuration',
      action: PermissionAction.ADMIN,
      resource: PermissionResource.CONFIGURATION,
      scope: PermissionScope.GLOBAL,
      description: 'Administer system configuration',
    },
  ],
  [AgentCluster.SECURITY]: [
    {
      id: 'security:read:credentials',
      action: PermissionAction.READ,
      resource: PermissionResource.CREDENTIALS,
      scope: PermissionScope.GLOBAL,
      description: 'Read security credentials',
    },
    {
      id: 'security:manage:agent',
      action: PermissionAction.MANAGE,
      resource: PermissionResource.AGENT,
      scope: PermissionScope.GLOBAL,
      description: 'Manage agent security policies',
    },
  ],
  [AgentCluster.META_INTELLIGENCE]: [
    {
      id: 'meta:admin:agent',
      action: PermissionAction.ADMIN,
      resource: PermissionResource.AGENT,
      scope: PermissionScope.GLOBAL,
      description: 'Full admin access to all agents',
    },
    {
      id: 'meta:manage:task',
      action: PermissionAction.MANAGE,
      resource: PermissionResource.TASK,
      scope: PermissionScope.GLOBAL,
      description: 'Manage all tasks across clusters',
    },
  ],
};

// ─── Agent Permission Manager Interface ──────────────────────────
// Simplified permission manager for resource/action-based access control.
export interface IAgentPermissionManager {
  grant(permission: AgentPermission): void;
  revoke(resource: string, action: string): void;
  hasPermission(resource: string, action: string): boolean;
  getAllPermissions(): AgentPermission[];
  checkPermissions(required: AgentPermission[]): boolean;
}
