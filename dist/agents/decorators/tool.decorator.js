"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOLS_METADATA_KEY = exports.TOOL_METADATA_KEY = void 0;
exports.Tool = Tool;
exports.getToolMetadata = getToolMetadata;
exports.isToolMethod = isToolMethod;
const common_1 = require("@nestjs/common");
const agent_tool_interface_1 = require("../interfaces/agent-tool.interface");
exports.TOOL_METADATA_KEY = 'agent:tool';
exports.TOOLS_METADATA_KEY = 'agent:tools';
function buildToolMetadata(options, methodName) {
    return {
        id: options.id,
        name: options.name,
        description: options.description,
        category: options.category || agent_tool_interface_1.ToolCategory.UTILITY,
        version: options.version || '1.0.0',
        inputSchema: {
            type: 'object',
            properties: options.inputSchema || {},
            required: Object.entries(options.inputSchema || {})
                .filter(([, prop]) => prop.required)
                .map(([key]) => key),
            additionalProperties: false,
        },
        outputSchema: {
            type: 'object',
            properties: options.outputSchema || {},
            additionalProperties: true,
        },
        requiredPermissions: options.requiredPermissions || [],
        timeout: options.timeout || 30000,
        retryable: options.retryable ?? true,
        idempotent: options.idempotent ?? false,
        methodName,
    };
}
function Tool(optionsOrName, description) {
    return (target, propertyKey, descriptor) => {
        const methodName = typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey;
        let metadata;
        if (typeof optionsOrName === 'string') {
            metadata = buildToolMetadata({
                id: optionsOrName,
                name: optionsOrName,
                description: description || '',
            }, methodName);
        }
        else {
            metadata = buildToolMetadata(optionsOrName, methodName);
        }
        (0, common_1.SetMetadata)(exports.TOOL_METADATA_KEY, metadata)(target, propertyKey, descriptor);
        const existingTools = Reflect.getMetadata(exports.TOOLS_METADATA_KEY, target.constructor) || [];
        existingTools.push(metadata);
        Reflect.defineMetadata(exports.TOOLS_METADATA_KEY, existingTools, target.constructor);
        if (!target.constructor.__toolMethods) {
            target.constructor.__toolMethods = [];
        }
        target.constructor.__toolMethods.push(metadata);
        return descriptor;
    };
}
function getToolMetadata(target) {
    return target.__toolMethods || Reflect.getMetadata(exports.TOOLS_METADATA_KEY, target) || [];
}
function isToolMethod(target, propertyKey) {
    const methodName = typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey;
    const tools = getToolMetadata(target.constructor || target);
    return tools.some((t) => t.methodName === methodName);
}
//# sourceMappingURL=tool.decorator.js.map