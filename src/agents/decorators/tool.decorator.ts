/**
 * AENEWS Agent OS X - @Tool() Decorator
 * Marks a method as an agent tool with schema metadata.
 * Supports both simplified (name + description) and full options.
 */

import { SetMetadata } from '@nestjs/common';
import {
  ToolCategory,
  ToolSchema,
  ToolSchemaProperty,
} from '../interfaces/agent-tool.interface';

// ─── Tool Metadata Key ────────────────────────────────────────────
export const TOOL_METADATA_KEY = 'agent:tool';
export const TOOLS_METADATA_KEY = 'agent:tools';

// ─── Tool Metadata ────────────────────────────────────────────────
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

// ─── Tool Decorator Options ───────────────────────────────────────
export interface ToolDecoratorOptions {
  /** Unique tool identifier */
  id: string;

  /** Human-readable tool name */
  name: string;

  /** Tool description */
  description: string;

  /** Tool category */
  category?: ToolCategory;

  /** Semantic version */
  version?: string;

  /** Input parameter schema */
  inputSchema?: Record<string, ToolSchemaProperty>;

  /** Output schema */
  outputSchema?: Record<string, ToolSchemaProperty>;

  /** Required permissions to use this tool */
  requiredPermissions?: string[];

  /** Execution timeout in ms */
  timeout?: number;

  /** Whether the tool can be retried on failure */
  retryable?: boolean;

  /** Whether the tool is idempotent */
  idempotent?: boolean;
}

/**
 * Build ToolMetadata from options.
 */
function buildToolMetadata(options: ToolDecoratorOptions, methodName: string): ToolMetadata {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    category: options.category || ToolCategory.UTILITY,
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

/**
 * @Tool() decorator
 *
 * Marks a method as an agent tool. The method becomes callable through
 * the tool registry with proper schema validation and permission checks.
 *
 * Supports two calling conventions:
 *
 * 1. Full options object:
 * @example
 * ```typescript
 * @Tool({
 *   id: 'navigate-url',
 *   name: 'Navigate URL',
 *   description: 'Navigate the browser to a given URL',
 *   category: ToolCategory.BROWSER,
 *   inputSchema: {
 *     url: { type: 'string', description: 'Target URL' },
 *   },
 * })
 * async navigateToUrl(params: { url: string }, context: ToolExecutionContext) {
 *   // Implementation
 * }
 * ```
 *
 * 2. Simplified (name + description):
 * @example
 * ```typescript
 * @Tool('navigate-url', 'Navigate the browser to a given URL')
 * async navigateToUrl(params: { url: string }) {
 *   // Implementation
 * }
 * ```
 */
export function Tool(options: ToolDecoratorOptions): MethodDecorator;
export function Tool(name: string, description: string): MethodDecorator;
export function Tool(optionsOrName: ToolDecoratorOptions | string, description?: string): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const methodName = typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey;

    let metadata: ToolMetadata;

    if (typeof optionsOrName === 'string') {
      // Simplified signature: Tool(name, description)
      metadata = buildToolMetadata(
        {
          id: optionsOrName,
          name: optionsOrName,
          description: description || '',
        },
        methodName,
      );
    } else {
      // Full options signature: Tool(options)
      metadata = buildToolMetadata(optionsOrName, methodName);
    }

    // Set tool-specific metadata
    SetMetadata(TOOL_METADATA_KEY, metadata)(target, propertyKey, descriptor);

    // Accumulate tools on the class
    const existingTools: ToolMetadata[] =
      Reflect.getMetadata(TOOLS_METADATA_KEY, target.constructor) || [];

    existingTools.push(metadata);
    Reflect.defineMetadata(TOOLS_METADATA_KEY, existingTools, target.constructor);

    // Also store on the constructor for easy access
    if (!(target.constructor as any).__toolMethods) {
      (target.constructor as any).__toolMethods = [];
    }
    (target.constructor as any).__toolMethods.push(metadata);

    return descriptor;
  };
}

/**
 * Helper to extract all tool metadata from a class.
 */
export function getToolMetadata(target: Function): ToolMetadata[] {
  return (target as any).__toolMethods || Reflect.getMetadata(TOOLS_METADATA_KEY, target) || [];
}

/**
 * Helper to check if a method is decorated with @Tool().
 */
export function isToolMethod(target: any, propertyKey: string | symbol): boolean {
  const methodName = typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey;
  const tools = getToolMetadata(target.constructor || target);
  return tools.some((t) => t.methodName === methodName);
}
