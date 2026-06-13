import { AgentCluster, AgentPermission } from './agent.interface';
export declare enum PermissionAction {
    READ = "read",
    WRITE = "write",
    EXECUTE = "execute",
    DELETE = "delete",
    MANAGE = "manage",
    ADMIN = "admin"
}
export declare enum PermissionResource {
    AGENT = "agent",
    TASK = "task",
    MEMORY = "memory",
    EVENT = "event",
    BROWSER = "browser",
    FILE_SYSTEM = "file_system",
    NETWORK = "network",
    DATABASE = "database",
    QUEUE = "queue",
    CLUSTER = "cluster",
    CONFIGURATION = "configuration",
    LOGS = "logs",
    METRICS = "metrics",
    CREDENTIALS = "credentials",
    API_KEY = "api_key"
}
export declare enum PermissionScope {
    SELF = "self",
    CLUSTER = "cluster",
    GLOBAL = "global"
}
export interface PermissionDefinition {
    id: string;
    action: PermissionAction;
    resource: PermissionResource;
    scope: PermissionScope;
    conditions?: PermissionCondition[];
    description: string;
}
export interface PermissionCondition {
    field: string;
    operator: ConditionOperator;
    value: any;
}
export declare enum ConditionOperator {
    EQUALS = "eq",
    NOT_EQUALS = "neq",
    IN = "in",
    NOT_IN = "nin",
    GREATER_THAN = "gt",
    LESS_THAN = "lt",
    GREATER_THAN_OR_EQUAL = "gte",
    LESS_THAN_OR_EQUAL = "lte",
    CONTAINS = "contains",
    STARTS_WITH = "starts_with",
    ENDS_WITH = "ends_with"
}
export interface PermissionCheckResult {
    granted: boolean;
    permission: PermissionDefinition;
    reason?: string;
    evaluatedAt: Date;
}
export interface PermissionSet {
    agentId: string;
    permissions: PermissionDefinition[];
    inheritedFrom?: string[];
    grantedAt: Date;
    expiresAt?: Date;
}
export interface RoleDefinition {
    id: string;
    name: string;
    description: string;
    cluster: AgentCluster;
    permissions: PermissionDefinition[];
    inheritsFrom?: string[];
}
export interface IPermissionEvaluator {
    hasPermission(agentId: string, action: PermissionAction, resource: PermissionResource, scope?: PermissionScope, context?: Record<string, any>): Promise<boolean>;
    getPermissions(agentId: string): Promise<PermissionSet>;
    grantPermission(agentId: string, permission: PermissionDefinition): Promise<void>;
    revokePermission(agentId: string, permissionId: string): Promise<void>;
    checkPermissions(agentId: string, checks: Array<{
        action: PermissionAction;
        resource: PermissionResource;
        scope?: PermissionScope;
    }>): Promise<PermissionCheckResult[]>;
}
export declare const DEFAULT_CLUSTER_PERMISSIONS: Record<AgentCluster, PermissionDefinition[]>;
export interface IAgentPermissionManager {
    grant(permission: AgentPermission): void;
    revoke(resource: string, action: string): void;
    hasPermission(resource: string, action: string): boolean;
    getAllPermissions(): AgentPermission[];
    checkPermissions(required: AgentPermission[]): boolean;
}
