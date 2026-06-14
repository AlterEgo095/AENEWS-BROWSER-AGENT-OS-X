"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_METADATA_KEY = void 0;
exports.Agent = Agent;
exports.getAgentMetadata = getAgentMetadata;
exports.isAgentClass = isAgentClass;
const common_1 = require("@nestjs/common");
exports.AGENT_METADATA_KEY = 'agent:metadata';
const DEFAULT_OPTIONS = {
    version: '1.0.0',
    description: '',
    capabilities: [],
    permissions: [],
    maxConcurrentTasks: 5,
    timeout: 30000,
    retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000,
        exponentialBackoff: true,
    },
};
function mergeOptionsToMetadata(options) {
    return {
        id: options.id,
        name: options.name,
        cluster: options.cluster,
        version: options.version || DEFAULT_OPTIONS.version,
        description: options.description || DEFAULT_OPTIONS.description,
        capabilities: options.capabilities || DEFAULT_OPTIONS.capabilities,
        permissions: options.permissions || DEFAULT_OPTIONS.permissions,
        maxConcurrentTasks: options.maxConcurrentTasks || DEFAULT_OPTIONS.maxConcurrentTasks,
        timeout: options.timeout || DEFAULT_OPTIONS.timeout,
        retryPolicy: {
            maxRetries: options.retryPolicy?.maxRetries ?? DEFAULT_OPTIONS.retryPolicy.maxRetries,
            backoffMs: options.retryPolicy?.backoffMs ?? DEFAULT_OPTIONS.retryPolicy.backoffMs,
            exponentialBackoff: options.retryPolicy?.exponentialBackoff ?? DEFAULT_OPTIONS.retryPolicy.exponentialBackoff,
        },
    };
}
function Agent(optionsOrConfig) {
    let metadata;
    if ('retryPolicy' in optionsOrConfig &&
        optionsOrConfig.retryPolicy &&
        'maxRetries' in optionsOrConfig.retryPolicy &&
        'backoffMs' in optionsOrConfig.retryPolicy &&
        'exponentialBackoff' in optionsOrConfig.retryPolicy) {
        const config = optionsOrConfig;
        metadata = {
            id: config.id,
            name: config.name,
            cluster: config.cluster,
            version: config.version,
            description: config.description,
            capabilities: config.capabilities,
            permissions: config.permissions,
            maxConcurrentTasks: config.maxConcurrentTasks,
            timeout: config.timeout,
            retryPolicy: config.retryPolicy,
        };
    }
    else {
        metadata = mergeOptionsToMetadata(optionsOrConfig);
    }
    return (target) => {
        (0, common_1.SetMetadata)(exports.AGENT_METADATA_KEY, metadata)(target);
        target.__agentMetadata = metadata;
    };
}
function getAgentMetadata(target) {
    return target.__agentMetadata;
}
function isAgentClass(target) {
    return !!(target.__agentMetadata || Reflect.getMetadata(exports.AGENT_METADATA_KEY, target));
}
//# sourceMappingURL=agent.decorator.js.map