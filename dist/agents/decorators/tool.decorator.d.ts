import { ToolCategory, ToolSchema, ToolSchemaProperty } from '../interfaces/agent-tool.interface';
export declare const TOOL_METADATA_KEY = "agent:tool";
export declare const TOOLS_METADATA_KEY = "agent:tools";
export interface ToolMetadata {
    id: string;
    name: string;
    description: string;
    category: ToolCategory;
    version: string;
    inputSchema: ToolSchema;
    outputSchema: ToolSchema;
    requiredPermissions: string[];
    timeout: number;
    retryable: boolean;
    idempotent: boolean;
    methodName: string;
}
export interface ToolDecoratorOptions {
    id: string;
    name: string;
    description: string;
    category?: ToolCategory;
    version?: string;
    inputSchema?: Record<string, ToolSchemaProperty>;
    outputSchema?: Record<string, ToolSchemaProperty>;
    requiredPermissions?: string[];
    timeout?: number;
    retryable?: boolean;
    idempotent?: boolean;
}
export declare function Tool(options: ToolDecoratorOptions): MethodDecorator;
export declare function Tool(name: string, description: string): MethodDecorator;
export declare function getToolMetadata(target: Function): ToolMetadata[];
export declare function isToolMethod(target: any, propertyKey: string | symbol): boolean;
