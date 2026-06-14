"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CLUSTER_PERMISSIONS = exports.ConditionOperator = exports.PermissionScope = exports.PermissionResource = exports.PermissionAction = void 0;
const agent_interface_1 = require("./agent.interface");
var PermissionAction;
(function (PermissionAction) {
    PermissionAction["READ"] = "read";
    PermissionAction["WRITE"] = "write";
    PermissionAction["EXECUTE"] = "execute";
    PermissionAction["DELETE"] = "delete";
    PermissionAction["MANAGE"] = "manage";
    PermissionAction["ADMIN"] = "admin";
})(PermissionAction || (exports.PermissionAction = PermissionAction = {}));
var PermissionResource;
(function (PermissionResource) {
    PermissionResource["AGENT"] = "agent";
    PermissionResource["TASK"] = "task";
    PermissionResource["MEMORY"] = "memory";
    PermissionResource["EVENT"] = "event";
    PermissionResource["BROWSER"] = "browser";
    PermissionResource["FILE_SYSTEM"] = "file_system";
    PermissionResource["NETWORK"] = "network";
    PermissionResource["DATABASE"] = "database";
    PermissionResource["QUEUE"] = "queue";
    PermissionResource["CLUSTER"] = "cluster";
    PermissionResource["CONFIGURATION"] = "configuration";
    PermissionResource["LOGS"] = "logs";
    PermissionResource["METRICS"] = "metrics";
    PermissionResource["CREDENTIALS"] = "credentials";
    PermissionResource["API_KEY"] = "api_key";
})(PermissionResource || (exports.PermissionResource = PermissionResource = {}));
var PermissionScope;
(function (PermissionScope) {
    PermissionScope["SELF"] = "self";
    PermissionScope["CLUSTER"] = "cluster";
    PermissionScope["GLOBAL"] = "global";
})(PermissionScope || (exports.PermissionScope = PermissionScope = {}));
var ConditionOperator;
(function (ConditionOperator) {
    ConditionOperator["EQUALS"] = "eq";
    ConditionOperator["NOT_EQUALS"] = "neq";
    ConditionOperator["IN"] = "in";
    ConditionOperator["NOT_IN"] = "nin";
    ConditionOperator["GREATER_THAN"] = "gt";
    ConditionOperator["LESS_THAN"] = "lt";
    ConditionOperator["GREATER_THAN_OR_EQUAL"] = "gte";
    ConditionOperator["LESS_THAN_OR_EQUAL"] = "lte";
    ConditionOperator["CONTAINS"] = "contains";
    ConditionOperator["STARTS_WITH"] = "starts_with";
    ConditionOperator["ENDS_WITH"] = "ends_with";
})(ConditionOperator || (exports.ConditionOperator = ConditionOperator = {}));
exports.DEFAULT_CLUSTER_PERMISSIONS = {
    [agent_interface_1.AgentCluster.BROWSER]: [
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
    [agent_interface_1.AgentCluster.COMPUTER]: [
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
    [agent_interface_1.AgentCluster.CODING]: [
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
    [agent_interface_1.AgentCluster.OFFICE]: [
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
    [agent_interface_1.AgentCluster.MARKETING]: [
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
    [agent_interface_1.AgentCluster.BUSINESS]: [
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
    [agent_interface_1.AgentCluster.INFRASTRUCTURE]: [
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
    [agent_interface_1.AgentCluster.SECURITY]: [
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
    [agent_interface_1.AgentCluster.META_INTELLIGENCE]: [
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
//# sourceMappingURL=agent-permission.interface.js.map