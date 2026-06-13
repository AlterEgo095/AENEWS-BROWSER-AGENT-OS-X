"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessControlAgentService = exports.ACCESS_CONTROL_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.ACCESS_CONTROL_AGENT_CONFIG = {
    id: 'security-access-control',
    name: 'AccessControl',
    cluster: agent_interface_1.AgentCluster.SECURITY,
    version: '1.0.0',
    description: 'Manage role-based (RBAC) and attribute-based (ABAC) access control, permissions, role hierarchies, access auditing, and policy definitions.',
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
let AccessControlAgentService = class AccessControlAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.policies = new Map();
        this.roles = new Map();
        this.auditLog = [];
    }
    defineConfig() {
        return exports.ACCESS_CONTROL_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'grantAccess',
            description: 'Grant access permissions to a user or role',
            execute: async (params) => this.grantAccess(params),
        });
        this.registerTool({
            name: 'revokeAccess',
            description: 'Revoke access permissions from a user or role',
            execute: async (params) => this.revokeAccess(params),
        });
        this.registerTool({
            name: 'checkPermission',
            description: 'Check if a principal has a specific permission',
            execute: async (params) => this.checkAgentPermission(params),
        });
        this.registerTool({
            name: 'manageRole',
            description: 'Create, update, or delete roles and their hierarchies',
            execute: async (params) => this.manageRole(params),
        });
        this.registerTool({
            name: 'auditAccess',
            description: 'Audit access patterns and generate access reports',
            execute: async (params) => this.auditAccess(params),
        });
        this.registerTool({
            name: 'definePolicy',
            description: 'Define a new access control policy',
            execute: async (params) => this.definePolicy(params),
        });
        this.logger.log('AccessControl agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        try {
            let result;
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
                    return this.createAgentOutput(input.taskId, false, null, `Unknown access control action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`AccessControl execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.policies.clear();
        this.roles.clear();
        this.auditLog = [];
        this.logger.log('AccessControl agent destroyed, state cleared');
    }
    async grantAccess(params) {
        const { principal, resource, actions, conditions } = params;
        if (!principal || !resource || !actions?.length) {
            throw new Error('principal, resource, and actions are required');
        }
        const policyId = `policy-${this.generateId().substring(0, 12)}`;
        const policy = {
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
        this.logger.log(`Access granted: ${principal} → ${resource} (${actions.join(', ')}), policy ${policyId}`);
        return { granted: true, principal, resource, actions, policyId };
    }
    async revokeAccess(params) {
        const { principal, resource, actions, reason } = params;
        if (!principal || !resource) {
            throw new Error('principal and resource are required');
        }
        let policiesAffected = 0;
        for (const [policyId, policy] of this.policies) {
            if (policy.principals.includes(principal) &&
                policy.resources.includes(resource) &&
                policy.effect === 'allow') {
                if (actions && actions.length > 0) {
                    const remaining = policy.actions.filter((a) => !actions.includes(a));
                    if (remaining.length === 0) {
                        policy.active = false;
                        policiesAffected++;
                    }
                    else {
                        policy.actions = remaining;
                        policiesAffected++;
                    }
                }
                else {
                    policy.active = false;
                    policiesAffected++;
                }
            }
        }
        this.logger.log(`Access revoked: ${principal} → ${resource} (${policiesAffected} policies affected, reason: ${reason || 'N/A'})`);
        return { revoked: true, principal, policiesAffected };
    }
    async checkAgentPermission(params) {
        const { principal, resource, action, context } = params;
        if (!principal || !resource || !action) {
            throw new Error('principal, resource, and action are required');
        }
        const matchedAllowPolicies = [];
        const matchedDenyPolicies = [];
        for (const [policyId, policy] of this.policies) {
            if (!policy.active)
                continue;
            const principalMatch = policy.principals.some((p) => p === principal || p === '*');
            const resourceMatch = policy.resources.some((r) => resource.startsWith(r) || r === '*');
            const actionMatch = policy.actions.some((a) => a === action || a === '*');
            if (principalMatch && resourceMatch && actionMatch) {
                if (policy.effect === 'allow') {
                    matchedAllowPolicies.push(policyId);
                }
                else {
                    matchedDenyPolicies.push(policyId);
                }
            }
        }
        const allowed = matchedDenyPolicies.length === 0 && matchedAllowPolicies.length > 0;
        const reason = matchedDenyPolicies.length > 0
            ? `Denied by policies: ${matchedDenyPolicies.join(', ')}`
            : allowed
                ? `Allowed by policies: ${matchedAllowPolicies.join(', ')}`
                : 'No matching allow policy found';
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
        this.logger.log(`Permission check: ${principal} → ${action} on ${resource} = ${allowed ? 'ALLOWED' : 'DENIED'}`);
        return {
            allowed,
            reason,
            matchedPolicies: allowed ? matchedAllowPolicies : matchedDenyPolicies,
        };
    }
    async manageRole(params) {
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
                if (!role)
                    throw new Error(`Role "${roleName}" not found`);
                if (permissions)
                    role.permissions = permissions;
                if (parentRole !== undefined)
                    role.parentRole = parentRole;
                this.logger.log(`Role updated: ${roleName}`);
                return { success: true, roleName, operation };
            }
            case 'delete': {
                if (!this.roles.has(roleName))
                    throw new Error(`Role "${roleName}" not found`);
                this.roles.delete(roleName);
                this.logger.log(`Role deleted: ${roleName}`);
                return { success: true, roleName, operation };
            }
            case 'assign': {
                if (!userId)
                    throw new Error('userId is required for assign operation');
                const role = this.roles.get(roleName);
                if (!role)
                    throw new Error(`Role "${roleName}" not found`);
                role.members.add(userId);
                this.logger.log(`User ${userId} assigned to role ${roleName}`);
                return { success: true, roleName, operation };
            }
            case 'unassign': {
                if (!userId)
                    throw new Error('userId is required for unassign operation');
                const role = this.roles.get(roleName);
                if (!role)
                    throw new Error(`Role "${roleName}" not found`);
                role.members.delete(userId);
                this.logger.log(`User ${userId} unassigned from role ${roleName}`);
                return { success: true, roleName, operation };
            }
            default:
                throw new Error(`Unknown role operation: ${operation}`);
        }
    }
    async auditAccess(params) {
        const { principal, resource, timeRange = 'last 24h', includeDenied = true } = params;
        let filtered = [...this.auditLog];
        if (principal)
            filtered = filtered.filter((e) => e.principal === principal);
        if (resource)
            filtered = filtered.filter((e) => e.resource === resource);
        if (!includeDenied)
            filtered = filtered.filter((e) => e.allowed);
        const deniedCount = filtered.filter((e) => !e.allowed).length;
        const anomalies = [];
        const denialByPrincipal = {};
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
        this.logger.log(`Access audit: ${filtered.length} entries, ${deniedCount} denied, ${anomalies.length} anomalies`);
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
    async definePolicy(params) {
        const { name, description, effect, principals, resources, actions, conditions } = params;
        if (!name || !effect || !principals?.length || !resources?.length || !actions?.length) {
            throw new Error('name, effect, principals, resources, and actions are required');
        }
        if (effect !== 'allow' && effect !== 'deny') {
            throw new Error('effect must be "allow" or "deny"');
        }
        const policyId = `policy-${this.generateId().substring(0, 12)}`;
        const policy = {
            policyId,
            name,
            description: description || `Policy: ${name}`,
            effect: effect,
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
};
exports.AccessControlAgentService = AccessControlAgentService;
exports.AccessControlAgentService = AccessControlAgentService = __decorate([
    (0, common_1.Injectable)()
], AccessControlAgentService);
//# sourceMappingURL=access-control-agent.service.js.map