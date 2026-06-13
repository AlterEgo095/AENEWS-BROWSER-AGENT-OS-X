import { AgentTool } from './agent.interface';
export declare enum ToolStatus {
    AVAILABLE = "available",
    BUSY = "busy",
    ERROR = "error",
    DISABLED = "disabled",
    MAINTENANCE = "maintenance"
}
export declare enum ToolCategory {
    BROWSER = "browser",
    FILE_SYSTEM = "file_system",
    NETWORK = "network",
    DATABASE = "database",
    AI = "ai",
    COMMUNICATION = "communication",
    COMPUTATION = "computation",
    DATA_PROCESSING = "data_processing",
    SECURITY = "security",
    MONITORING = "monitoring",
    UTILITY = "utility"
}
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
export interface ToolRateLimit {
    maxCallsPerMinute: number;
    maxCallsPerHour: number;
    maxConcurrentCalls: number;
}
export interface ToolExecutionContext {
    agentId: string;
    taskId: string;
    correlationId: string;
    sessionId?: string;
    timeout: number;
    metadata: Record<string, any>;
}
export interface ToolInput {
    toolId: string;
    parameters: Record<string, any>;
    context: ToolExecutionContext;
}
export interface ToolOutput<T = any> {
    toolId: string;
    success: boolean;
    result: T;
    error?: ToolError;
    executionTimeMs: number;
    metadata: Record<string, any>;
}
export interface ToolError {
    code: string;
    message: string;
    details?: Record<string, any>;
    retryable: boolean;
}
export interface ToolRegistration {
    definition: ToolDefinition;
    handler: ToolHandler;
    registeredAt: Date;
    registeredBy: string;
}
export type ToolHandler = (parameters: Record<string, any>, context: ToolExecutionContext) => Promise<ToolOutput> | ToolOutput;
export interface ToolValidationResult {
    valid: boolean;
    errors: ToolValidationError[];
}
export interface ToolValidationError {
    path: string;
    message: string;
    value?: any;
}
export interface ToolUsageMetrics {
    toolId: string;
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageExecutionTimeMs: number;
    lastUsedAt: Date;
    currentConcurrentCalls: number;
}
export interface IToolRegistry {
    register(definition: ToolDefinition, handler: ToolHandler): Promise<void>;
    unregister(toolId: string): Promise<boolean>;
    getDefinition(toolId: string): ToolDefinition | null;
    listTools(category?: ToolCategory): ToolDefinition[];
    execute(input: ToolInput): Promise<ToolOutput>;
    validateInput(toolId: string, parameters: Record<string, any>): ToolValidationResult;
    getMetrics(toolId: string): ToolUsageMetrics;
    checkPermission(agentId: string, toolId: string): boolean;
}
export interface IAgentToolRegistry {
    register(tool: AgentTool): void;
    unregister(name: string): void;
    get(name: string): AgentTool | undefined;
    getAll(): AgentTool[];
    execute(name: string, ...args: any[]): Promise<any>;
}
