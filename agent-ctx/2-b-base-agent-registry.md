# Task 2-b: Base Agent Class, Decorators, and Registry

## Task Summary
Created the base agent class, decorators, and registry in `/home/z/my-project/src/agents/`. All files are complete, compilable TypeScript/NestJS code that is consistent with the existing interfaces defined in task 2-a.

## Files Created/Modified

### 1. `src/agents/base/base-agent.service.ts` (Enhanced)
**Key enhancements over the original:**
- Added `tools: Map<string, AgentTool>` property for tool management
- Added `registerTool(tool: AgentTool)` method
- Added `unregisterTool(name: string)` method
- Added `getTool(name: string)` method
- Added `getAllTools()` method
- Added `executeTool(name: string, ...args)` method
- Added `executeWithRetry<T>(fn: () => Promise<T>): Promise<T>` - generic retry with exponential backoff
- Added `withTimeout<T>(promise: Promise<T>, ms: number): Promise<T>` - generic timeout wrapper
- Added `initializeState(): AgentState` - private state initialization method
- Added `healthCheck(): Promise<boolean>` - public health check method (delegates to performHealthCheck)
- Added `hasPermissionForResource(resource: string, action: string): boolean` - non-throwing permission check
- Enhanced `checkPermission` to accept both `PermissionAction|PermissionResource` enums and string arguments
- Enhanced `emitEvent` to accept both `AgentEventType` and arbitrary `string` event types
- Kept all existing functionality: circuit breaker, lifecycle hooks, memory integration, correlation ID tracking

### 2. `src/agents/base/base-agent.module.ts` (Updated)
- Made the module `@Global()` for easier access across the application
- Added `EventBusService` and `MemoryService` to exports for direct injection

### 3. `src/agents/decorators/agent.decorator.ts` (Enhanced)
- Added function overload: `Agent(config: AgentConfig)` - supports direct AgentConfig objects
- Added `isAgentClass(target: Function)` helper to check if a class has agent metadata
- Existing `Agent(options: AgentDecoratorOptions)` and `getAgentMetadata()` preserved

### 4. `src/agents/decorators/tool.decorator.ts` (Enhanced)
- Added function overload: `Tool(name: string, description: string)` - simplified signature
- Added `isToolMethod(target, propertyKey)` helper to check if a method is a tool
- Existing `Tool(options: ToolDecoratorOptions)` and `getToolMetadata()` preserved

### 5. `src/agents/decorators/permission.decorator.ts` (Enhanced)
- Added function overload: `RequirePermission(resource: string, action: string)` - simplified signature
- Made `PermissionRequirement.action` and `resource` accept both enum and string types
- Existing full options and array overloads preserved
- `RequireAllPermissions` and `RequireAnyPermission` shorthand decorators preserved

### 6. `src/agents/decorators/event.decorator.ts` (Enhanced)
- Added function overload: `OnAgentEvent(eventType: string)` - simplified signature
- `OnAgentEventOptions.eventType` now accepts `AgentEventType | string` for custom events
- Added `OnOrchestrationCompleted()` shorthand decorator
- Added `OnCircuitBreakerOpened()` shorthand decorator
- All existing shorthand decorators preserved

### 7. `src/agents/decorators/index.ts` (New)
- Barrel export file that re-exports all decorators, metadata interfaces, and helpers
- Exports: `Agent`, `Tool`, `RequirePermission`, `OnAgentEvent` and all shorthand decorators
- Exports: all metadata keys, interfaces, and helper functions

### 8. `src/agents/registry/agent-registry.service.ts` (Enhanced)
**New methods matching the task spec:**
- `get(agentId: string): BaseAgentService | undefined` - primary lookup (returns undefined)
- `getByCluster(cluster: AgentCluster): BaseAgentService[]` - primary cluster lookup
- `getByCapability(capabilityName: string): BaseAgentService[]` - primary capability lookup
- `getAll(): BaseAgentService[]` - get all agents
- `getAllStates(): AgentState[]` - get all agent states
- `findBestAgent(capability: string, priority?: TaskPriority): BaseAgentService | undefined` - intelligent agent selection
- `initializeAll(): Promise<void>` - batch initialization of all agents
- `healthCheckAll(): Promise<Map<string, boolean>>` - batch health checking
- `getStats()` - returns `{ total, byCluster, healthy }` matching spec
- `getExtendedStats()` - returns more detailed statistics

**Backward-compatible aliases:**
- `getAgent()` → `get()` (returns null instead of undefined)
- `getAgentsByCluster()` → `getByCluster()`
- `getAgentsByCapability()` → `getByCapability()`
- `getAllAgents()` → `getAll()`
- `getAllAgentStates()` → `getAllStates()`

### 9. `src/agents/registry/agent-registry.module.ts` (Updated)
- Made the module `@Global()` for easier access across the application
- All existing functionality preserved

## Architecture Decisions

1. **Backward Compatibility**: All existing method signatures are preserved with aliases where the new spec differs. This ensures no breakage of existing code that depends on the old API.

2. **Function Overloads**: Decorators support both simplified (task spec) and full (existing) signatures using TypeScript function overloads, providing a clean API for both simple and complex use cases.

3. **Generic Utilities**: `executeWithRetry<T>` and `withTimeout<T>` are generic utility methods that can be used for any promise-based operation, not just agent task execution.

4. **Tool Management**: Tools are stored as a `Map<string, AgentTool>` directly on the base agent, allowing agents to register and use tools without requiring a separate tool registry service.

5. **Permission Checking**: The `checkPermission` method now supports both enum-based (`PermissionAction`, `PermissionResource`) and string-based arguments, making it flexible for both programmatic and decorator-based usage.

6. **Registry Statistics**: The `getStats()` return type matches the task spec (`{ total, byCluster, healthy }`) while `getExtendedStats()` provides the more detailed statistics from the original implementation.
