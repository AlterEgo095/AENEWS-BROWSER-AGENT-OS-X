/**
 * AENEWS Agent OS X - Access Control Agent
 * Manages role-based access control (RBAC), attribute-based access control (ABAC),
 * permission management, role definitions, access auditing, and policy enforcement.
 */

import { Injectable, Inject } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
import { CertCapability } from '../../../software-factory/interfaces';

// ─── Agent Configuration ──────────────────────────────────────────

export const ACCESS_CONTROL_AGENT_CONFIG: AgentConfig = {
  id: 'security-access-control',
  name: 'AccessControl',
  cluster: AgentCluster.SECURITY,
  version: '1.0.0',
  description:
    'Manage role-based (RBAC) and attribute-based (ABAC) access control, permissions, role hierarchies, access auditing, and policy definitions.',
  capabilities: [
    {
      name: 'grantAccess',
      description: 'Grant access permissions to a user or role',
      inputSchema: {
        type: 'object',
        properties: {
          principal: { type: 'string', description: 'User or role to grant access to' },
          resource: { type: 'string', description: 'Resource to grant access to' },
          actions: { type: 'array', items: { type: 'string' }, description: 'Actions to permit' },
          conditions: { type: 'object', description: 'Conditions for access (ABAC)' },
        },
        required: ['principal', 'resource', 'actions'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          granted: { type: 'boolean' },
          principal: { type: 'string' },
          resource: { type: 'string' },
          actions: { type: 'array', items: { type: 'string' } },
          policyId: { type: 'string' },
        },
      },
    },
    {
      name: 'revokeAccess',
      description: 'Revoke access permissions from a user or role',
      inputSchema: {
        type: 'object',
        properties: {
          principal: { type: 'string', description: 'User or role to revoke access from' },
          resource: { type: 'string', description: 'Resource to revoke access from' },
          actions: { type: 'array', items: { type: 'string' }, description: 'Actions to revoke' },
          reason: { type: 'string', description: 'Reason for revocation' },
        },
        required: ['principal', 'resource'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          revoked: { type: 'boolean' },
          principal: { type: 'string' },
          policiesAffected: { type: 'number' },
        },
      },
    },
    {
      name: 'checkPermission',
      description: 'Check if a principal has a specific permission',
      inputSchema: {
        type: 'object',
        properties: {
          principal: { type: 'string', description: 'User or role to check' },
          resource: { type: 'string', description: 'Resource to check access to' },
          action: { type: 'string', description: 'Action to check' },
          context: { type: 'object', description: 'Context attributes for ABAC evaluation' },
        },
        required: ['principal', 'resource', 'action'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          allowed: { type: 'boolean' },
          reason: { type: 'string' },
          matchedPolicies: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'manageRole',
      description: 'Create, update, or delete roles and their hierarchies',
      inputSchema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['create', 'update', 'delete', 'assign', 'unassign'],
            description: 'Role operation',
          },
          roleName: { type: 'string', description: 'Name of the role' },
          permissions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Permissions for the role',
          },
          parentRole: { type: 'string', description: 'Parent role for hierarchy' },
          userId: { type: 'string', description: 'User ID for assign/unassign' },
        },
        required: ['operation', 'roleName'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          roleName: { type: 'string' },
          operation: { type: 'string' },
        },
      },
    },
    {
      name: 'auditAccess',
      description: 'Audit access patterns and generate access reports',
      inputSchema: {
        type: 'object',
        properties: {
          principal: { type: 'string', description: 'Filter by principal' },
          resource: { type: 'string', description: 'Filter by resource' },
          timeRange: { type: 'string', description: 'Time range for audit' },
          includeDenied: { type: 'boolean', description: 'Include denied access attempts' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          entries: { type: 'array', items: { type: 'object' } },
          totalEntries: { type: 'number' },
          deniedCount: { type: 'number' },
          anomalies: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    {
      name: 'definePolicy',
      description: 'Define a new access control policy',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Policy name' },
          description: { type: 'string', description: 'Policy description' },
          effect: { type: 'string', enum: ['allow', 'deny'], description: 'Policy effect' },
          principals: {
            type: 'array',
            items: { type: 'string' },
            description: 'Applicable principals',
          },
          resources: {
            type: 'array',
            items: { type: 'string' },
            description: 'Applicable resources',
          },
          actions: { type: 'array', items: { type: 'string' }, description: 'Applicable actions' },
          conditions: { type: 'object', description: 'Policy conditions (ABAC)' },
        },
        required: ['name', 'effect', 'principals', 'resources', 'actions'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          policyId: { type: 'string' },
          name: { type: 'string' },
          effect: { type: 'string' },
          active: { type: 'boolean' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:access',
    'write:access',
    'manage:roles',
    'define:policies',
    'audit:access',
  ],
  maxConcurrentTasks: 10,
  timeout: 15000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1000,
    exponentialBackoff: true,
  },
};

// ─── Internal Types ───────────────────────────────────────────────

interface Policy {
  policyId: string;
  name: string;
  description: string;
  effect: 'allow' | 'deny';
  principals: string[];
  resources: string[];
  actions: string[];
  conditions: Record<string, any>;
  active: boolean;
  createdAt: Date;
}

interface Role {
  name: string;
  permissions: string[];
  parentRole: string | null;
  members: Set<string>;
}

interface AccessAuditEntry {
  id: string;
  principal: string;
  resource: string;
  action: string;
  allowed: boolean;
  timestamp: Date;
  matchedPolicies: string[];
  reason: string;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class AccessControlAgentService extends BaseAgentService {
  private policies: Map<string, Policy> = new Map();

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }
  private roles: Map<string, Role> = new Map();
  private auditLog: AccessAuditEntry[] = [];

  protected defineConfig(): AgentConfig {
    return ACCESS_CONTROL_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'grantAccess',
      description: 'Grant access permissions to a user or role',
      execute: async (params: {
        principal: string;
        resource: string;
        actions: string[];
        conditions?: any;
      }) => this.grantAccess(params),
    });

    this.registerTool({
      name: 'revokeAccess',
      description: 'Revoke access permissions from a user or role',
      execute: async (params: {
        principal: string;
        resource: string;
        actions?: string[];
        reason?: string;
      }) => this.revokeAccess(params),
    });

    this.registerTool({
      name: 'checkPermission',
      description: 'Check if a principal has a specific permission',
      execute: async (params: {
        principal: string;
        resource: string;
        action: string;
        context?: any;
      }) => this.checkAgentPermission(params),
    });

    this.registerTool({
      name: 'manageRole',
      description: 'Create, update, or delete roles and their hierarchies',
      execute: async (params: {
        operation: string;
        roleName: string;
        permissions?: string[];
        parentRole?: string;
        userId?: string;
      }) => this.manageRole(params),
    });

    this.registerTool({
      name: 'auditAccess',
      description: 'Audit access patterns and generate access reports',
      execute: async (params: {
        principal?: string;
        resource?: string;
        timeRange?: string;
        includeDenied?: boolean;
      }) => this.auditAccess(params),
    });

    this.registerTool({
      name: 'definePolicy',
      description: 'Define a new access control policy',
      execute: async (params: {
        name: string;
        description?: string;
        effect: string;
        principals: string[];
        resources: string[];
        actions: string[];
        conditions?: any;
      }) => this.definePolicy(params),
    });

    this.logger.log('AccessControl agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    // Bridge delegation — use real connector if available
    if (this.bridge) {
      try {
        const result = await this.bridge.executeCapability(CertCapability.COMPLIANCE, {
          missionId: input.taskId,
          instruction: JSON.stringify(input.payload),
          workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
          parameters: input.payload,
        });
        return this.createAgentOutput(
          input.taskId,
          result.success,
          result.output,
          result.error,
          startTime,
        );
      } catch (error) {
        this.logger.warn(`Bridge failed, fallback: ${(error as Error).message}`);
      }
    }

    const { action, ...params } = input.payload;

    if (!action) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        'Missing required parameter: action',
        startTime,
      );
    }

    try {
      let result: any;

      switch (action) {
        case 'grantAccess':
          result = await this.grantAccess(params);
          break;
        case 'revokeAccess':
          result = await this.revokeAccess(params);
          break;
        case 'checkPermission':
          result = await this.checkAgentPermission(params);
          break;
        case 'manageRole':
          result = await this.manageRole(params);
          break;
        case 'auditAccess':
          result = await this.auditAccess(params);
          break;
        case 'definePolicy':
          result = await this.definePolicy(params);
          break;
        default:
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown access control action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`AccessControl execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.policies.clear();
    this.roles.clear();
    this.auditLog = [];
    this.logger.log('AccessControl agent destroyed, state cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async grantAccess(params: {
    principal: string;
    resource: string;
    actions: string[];
    conditions?: any;
  }): Promise<{
    granted: boolean;
    principal: string;
    resource: string;
    actions: string[];
    policyId: string;
  }> {
    const { principal, resource, actions, conditions } = params;

    if (!principal || !resource || !actions?.length) {
      throw new Error('principal, resource, and actions are required');
    }

    const policyId = `policy-${this.generateId().substring(0, 12)}`;

    const policy: Policy = {
      policyId,
      name: `Grant: ${principal} → ${resource}`,
      description: `Auto-generated grant for ${principal}`,
      effect: 'allow',
      principals: [principal],
      resources: [resource],
      actions,
      conditions: conditions || {},
      active: true,
      createdAt: new Date(),
    };

    this.policies.set(policyId, policy);

    this.logger.log(
      `Access granted: ${principal} → ${resource} (${actions.join(', ')}), policy ${policyId}`,
    );

    return { granted: true, principal, resource, actions, policyId };
  }

  private async revokeAccess(params: {
    principal: string;
    resource: string;
    actions?: string[];
    reason?: string;
  }): Promise<{ revoked: boolean; principal: string; policiesAffected: number }> {
    const { principal, resource, actions, reason } = params;

    if (!principal || !resource) {
      throw new Error('principal and resource are required');
    }

    let policiesAffected = 0;

    for (const [policyId, policy] of this.policies) {
      if (
        policy.principals.includes(principal) &&
        policy.resources.includes(resource) &&
        policy.effect === 'allow'
      ) {
        if (actions && actions.length > 0) {
          const remaining = policy.actions.filter((a) => !actions.includes(a));
          if (remaining.length === 0) {
            policy.active = false;
            policiesAffected++;
          } else {
            policy.actions = remaining;
            policiesAffected++;
          }
        } else {
          policy.active = false;
          policiesAffected++;
        }
      }
    }

    this.logger.log(
      `Access revoked: ${principal} → ${resource} (${policiesAffected} policies affected, reason: ${reason || 'N/A'})`,
    );

    return { revoked: true, principal, policiesAffected };
  }

  private async checkAgentPermission(params: {
    principal: string;
    resource: string;
    action: string;
    context?: any;
  }): Promise<{ allowed: boolean; reason: string; matchedPolicies: string[] }> {
    const { principal, resource, action, context } = params;

    if (!principal || !resource || !action) {
      throw new Error('principal, resource, and action are required');
    }

    const matchedAllowPolicies: string[] = [];
    const matchedDenyPolicies: string[] = [];

    for (const [policyId, policy] of this.policies) {
      if (!policy.active) continue;

      const principalMatch = policy.principals.some((p) => p === principal || p === '*');
      const resourceMatch = policy.resources.some((r) => resource.startsWith(r) || r === '*');
      const actionMatch = policy.actions.some((a) => a === action || a === '*');

      if (principalMatch && resourceMatch && actionMatch) {
        if (policy.effect === 'allow') {
          matchedAllowPolicies.push(policyId);
        } else {
          matchedDenyPolicies.push(policyId);
        }
      }
    }

    // Deny takes precedence
    const allowed = matchedDenyPolicies.length === 0 && matchedAllowPolicies.length > 0;
    const reason =
      matchedDenyPolicies.length > 0
        ? `Denied by policies: ${matchedDenyPolicies.join(', ')}`
        : allowed
          ? `Allowed by policies: ${matchedAllowPolicies.join(', ')}`
          : 'No matching allow policy found';

    // Record in audit log
    this.auditLog.push({
      id: this.generateId(),
      principal,
      resource,
      action,
      allowed,
      timestamp: new Date(),
      matchedPolicies: allowed ? matchedAllowPolicies : matchedDenyPolicies,
      reason,
    });

    this.logger.log(
      `Permission check: ${principal} → ${action} on ${resource} = ${allowed ? 'ALLOWED' : 'DENIED'}`,
    );

    return {
      allowed,
      reason,
      matchedPolicies: allowed ? matchedAllowPolicies : matchedDenyPolicies,
    };
  }

  private async manageRole(params: {
    operation: string;
    roleName: string;
    permissions?: string[];
    parentRole?: string;
    userId?: string;
  }): Promise<{ success: boolean; roleName: string; operation: string }> {
    const { operation, roleName, permissions, parentRole, userId } = params;

    switch (operation) {
      case 'create': {
        if (this.roles.has(roleName)) {
          throw new Error(`Role "${roleName}" already exists`);
        }
        this.roles.set(roleName, {
          name: roleName,
          permissions: permissions || [],
          parentRole: parentRole || null,
          members: new Set(),
        });
        this.logger.log(`Role created: ${roleName}`);
        return { success: true, roleName, operation };
      }
      case 'update': {
        const role = this.roles.get(roleName);
        if (!role) throw new Error(`Role "${roleName}" not found`);
        if (permissions) role.permissions = permissions;
        if (parentRole !== undefined) role.parentRole = parentRole;
        this.logger.log(`Role updated: ${roleName}`);
        return { success: true, roleName, operation };
      }
      case 'delete': {
        if (!this.roles.has(roleName)) throw new Error(`Role "${roleName}" not found`);
        this.roles.delete(roleName);
        this.logger.log(`Role deleted: ${roleName}`);
        return { success: true, roleName, operation };
      }
      case 'assign': {
        if (!userId) throw new Error('userId is required for assign operation');
        const role = this.roles.get(roleName);
        if (!role) throw new Error(`Role "${roleName}" not found`);
        role.members.add(userId);
        this.logger.log(`User ${userId} assigned to role ${roleName}`);
        return { success: true, roleName, operation };
      }
      case 'unassign': {
        if (!userId) throw new Error('userId is required for unassign operation');
        const role = this.roles.get(roleName);
        if (!role) throw new Error(`Role "${roleName}" not found`);
        role.members.delete(userId);
        this.logger.log(`User ${userId} unassigned from role ${roleName}`);
        return { success: true, roleName, operation };
      }
      default:
        throw new Error(`Unknown role operation: ${operation}`);
    }
  }

  private async auditAccess(params: {
    principal?: string;
    resource?: string;
    timeRange?: string;
    includeDenied?: boolean;
  }): Promise<{ entries: any[]; totalEntries: number; deniedCount: number; anomalies: any[] }> {
    const { principal, resource, timeRange = 'last 24h', includeDenied = true } = params;

    let filtered = [...this.auditLog];

    if (principal) filtered = filtered.filter((e) => e.principal === principal);
    if (resource) filtered = filtered.filter((e) => e.resource === resource);
    if (!includeDenied) filtered = filtered.filter((e) => e.allowed);

    const deniedCount = filtered.filter((e) => !e.allowed).length;

    // Detect anomalies (e.g., high denial rate for a principal)
    const anomalies: any[] = [];
    const denialByPrincipal: Record<string, number> = {};
    for (const entry of filtered) {
      if (!entry.allowed) {
        denialByPrincipal[entry.principal] = (denialByPrincipal[entry.principal] || 0) + 1;
      }
    }
    for (const [p, count] of Object.entries(denialByPrincipal)) {
      if (count > 5) {
        anomalies.push({ principal: p, deniedAttempts: count, type: 'high_denial_rate' });
      }
    }

    this.logger.log(
      `Access audit: ${filtered.length} entries, ${deniedCount} denied, ${anomalies.length} anomalies`,
    );

    return {
      entries: filtered.map((e) => ({
        id: e.id,
        principal: e.principal,
        resource: e.resource,
        action: e.action,
        allowed: e.allowed,
        timestamp: e.timestamp.toISOString(),
        reason: e.reason,
      })),
      totalEntries: filtered.length,
      deniedCount,
      anomalies,
    };
  }

  private async definePolicy(params: {
    name: string;
    description?: string;
    effect: string;
    principals: string[];
    resources: string[];
    actions: string[];
    conditions?: any;
  }): Promise<{ policyId: string; name: string; effect: string; active: boolean }> {
    const { name, description, effect, principals, resources, actions, conditions } = params;

    if (!name || !effect || !principals?.length || !resources?.length || !actions?.length) {
      throw new Error('name, effect, principals, resources, and actions are required');
    }

    if (effect !== 'allow' && effect !== 'deny') {
      throw new Error('effect must be "allow" or "deny"');
    }

    const policyId = `policy-${this.generateId().substring(0, 12)}`;

    const policy: Policy = {
      policyId,
      name,
      description: description || `Policy: ${name}`,
      effect: effect as 'allow' | 'deny',
      principals,
      resources,
      actions,
      conditions: conditions || {},
      active: true,
      createdAt: new Date(),
    };

    this.policies.set(policyId, policy);

    this.logger.log(`Policy defined: ${policyId} (${name}, effect: ${effect})`);

    return { policyId, name, effect, active: true };
  }
}
