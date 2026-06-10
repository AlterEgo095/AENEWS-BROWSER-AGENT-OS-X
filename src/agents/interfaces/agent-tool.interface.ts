/**
 * AENEWS Agent OS X - Agent Tool Interface
 * Defines the tool system that agents can use to interact with external systems.
 */

import { AgentTool } from './agent.interface';

// ─── Tool Status ─────────────────────────────────────────────────
export enum ToolStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  ERROR = 'error',
  DISABLED = 'disabled',
  MAINTENANCE = 'maintenance',
}

// ─── Tool Category ───────────────────────────────────────────────
export enum ToolCategory {
  BROWSER = 'browser',
  FILE_SYSTEM = 'file_system',
  NETWORK = 'network',
  DATABASE = 'database',
  AI = 'ai',
  COMMUNICATION = 'communication',
  COMPUTATION = 'computation',
  DATA_PROCESSING = 'data_processing',
  SECURITY = 'security',
  MONITORING = 'monitoring',
  UTILITY = 'utility',
}

// ─── Tool Definition ─────────────────────────────────────────────
export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  version: string;
  inputSchema: ToolSchema;
  outputSchema: ToolSchema;
  requiredPermissions: string[];
  rateLimit?: ToolRateLimit;
  timeout: number;
  retryable: boolean;
  idempotent: boolean;
}

// ─── Tool Schema ─────────────────────────────────────────────────
export interface ToolSchema {
  type: 'object';
  properties: Record<string, ToolSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  description?: string;
  default?: any;
  enum?: any[];
  items?: ToolSchemaProperty;
  properties?: Record<string, ToolSchemaProperty>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}

// ─── Tool Rate Limit ─────────────────────────────────────────────
export interface ToolRateLimit {
  maxCallsPerMinute: number;
  maxCallsPerHour: number;
  maxConcurrentCalls: number;
}

// ─── Tool Execution Context ──────────────────────────────────────
export interface ToolExecutionContext {
  agentId: string;
  taskId: string;
  correlationId: string;
  sessionId?: string;
  timeout: number;
  metadata: Record<string, any>;
}

// ─── Tool Input ──────────────────────────────────────────────────
export interface ToolInput {
  toolId: string;
  parameters: Record<string, any>;
  context: ToolExecutionContext;
}

// ─── Tool Output ─────────────────────────────────────────────────
export interface ToolOutput<T = any> {
  toolId: string;
  success: boolean;
  result: T;
  error?: ToolError;
  executionTimeMs: number;
  metadata: Record<string, any>;
}

// ─── Tool Error ──────────────────────────────────────────────────
export interface ToolError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
}

// ─── Tool Registration ───────────────────────────────────────────
export interface ToolRegistration {
  definition: ToolDefinition;
  handler: ToolHandler;
  registeredAt: Date;
  registeredBy: string;
}

// ─── Tool Handler ────────────────────────────────────────────────
export type ToolHandler = (
  parameters: Record<string, any>,
  context: ToolExecutionContext,
) => Promise<ToolOutput> | ToolOutput;

// ─── Tool Validation Result ──────────────────────────────────────
export interface ToolValidationResult {
  valid: boolean;
  errors: ToolValidationError[];
}

export interface ToolValidationError {
  path: string;
  message: string;
  value?: any;
}

// ─── Tool Usage Metrics ──────────────────────────────────────────
export interface ToolUsageMetrics {
  toolId: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageExecutionTimeMs: number;
  lastUsedAt: Date;
  currentConcurrentCalls: number;
}

// ─── IToolRegistry ───────────────────────────────────────────────
export interface IToolRegistry {
  /**
   * Register a tool with its handler.
   */
  register(definition: ToolDefinition, handler: ToolHandler): Promise<void>;

  /**
   * Unregister a tool.
   */
  unregister(toolId: string): Promise<boolean>;

  /**
   * Get a tool's definition.
   */
  getDefinition(toolId: string): ToolDefinition | null;

  /**
   * List all registered tools, optionally filtered by category.
   */
  listTools(category?: ToolCategory): ToolDefinition[];

  /**
   * Execute a tool.
   */
  execute(input: ToolInput): Promise<ToolOutput>;

  /**
   * Validate tool input against schema.
   */
  validateInput(toolId: string, parameters: Record<string, any>): ToolValidationResult;

  /**
   * Get usage metrics for a tool.
   */
  getMetrics(toolId: string): ToolUsageMetrics;

  /**
   * Check if an agent has permission to use a tool.
   */
  checkPermission(agentId: string, toolId: string): boolean;
}

// ─── Agent Tool Registry Interface ───────────────────────────────
// Simplified tool registry for name-based tool registration and execution.
// Uses AgentTool from agent.interface.ts for lightweight tool definitions.
export interface IAgentToolRegistry {
  register(tool: AgentTool): void;
  unregister(name: string): void;
  get(name: string): AgentTool | undefined;
  getAll(): AgentTool[];
  execute(name: string, ...args: any[]): Promise<any>;
}
