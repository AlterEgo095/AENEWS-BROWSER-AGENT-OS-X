/**
 * JSON Schema type for tool parameter definitions.
 */
export interface ToolParameterSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

/**
 * Permission level required to invoke a tool.
 */
export type ToolPermission = 'public' | 'internal' | 'restricted';

/**
 * Configuration for the @Tool decorator.
 */
export interface ToolConfig {
  /** Human-readable tool name */
  name: string;
  /** Description of what the tool does */
  description: string;
  /** JSON schema for the tool's parameters */
  parameters?: ToolParameterSchema;
  /** Required permission level */
  permissions?: ToolPermission;
  /** Maximum execution time in milliseconds */
  timeout?: number;
  /** Whether the tool can be called concurrently */
  concurrent?: boolean;
}

/**
 * Metadata key for storing tool configurations on methods.
 */
export const TOOL_METADATA_KEY = 'tool:config';

/**
 * Metadata key for the set of tool method names on a class.
 */
export const TOOLS_REGISTRY_KEY = 'tools:registry';

/**
 * @Tool(config) — Method decorator that marks a method as a tool
 * with schema, permissions, and timeout metadata.
 *
 * Usage:
 *   @Tool({
 *     name: 'fetch-url',
 *     description: 'Fetches content from a URL',
 *     parameters: {
 *       type: 'object',
 *       properties: { url: { type: 'string' } },
 *       required: ['url'],
 *     },
 *     permissions: 'internal',
 *     timeout: 10_000,
 *   })
 *   async fetchUrl(params: { url: string }) { ... }
 */
export function Tool(config: ToolConfig): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const key = typeof propertyKey === 'string' ? propertyKey : propertyKey.toString();

    // Store tool config on the method
    Reflect.defineMetadata(TOOL_METADATA_KEY, config, target, key);

    // Also register the method name in the class-level tools registry
    const existingTools: string[] =
      Reflect.getMetadata(TOOLS_REGISTRY_KEY, target) || [];
    if (!existingTools.includes(key)) {
      existingTools.push(key);
    }
    Reflect.defineMetadata(TOOLS_REGISTRY_KEY, existingTools, target);
  };
}

/**
 * Retrieve the tool configuration for a specific method.
 */
export function getToolConfig(
  target: any,
  propertyKey: string,
): ToolConfig | undefined {
  return Reflect.getMetadata(TOOL_METADATA_KEY, target, propertyKey);
}

/**
 * Retrieve all tool method names registered on a class.
 */
export function getToolRegistry(target: any): string[] {
  return Reflect.getMetadata(TOOLS_REGISTRY_KEY, target) || [];
}
