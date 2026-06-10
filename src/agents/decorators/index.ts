/**
 * AENEWS Agent OS X - Decorators Barrel Exports
 * Re-exports all decorator functions, metadata interfaces, and helpers.
 */

// ─── Agent Decorator ──────────────────────────────────────────────
export {
  // Constants
  AGENT_METADATA_KEY,

  // Interfaces (re-exported as types)
  AgentMetadata,
  AgentDecoratorOptions,

  // Decorator
  Agent,

  // Helpers
  getAgentMetadata,
  isAgentClass,
} from './agent.decorator';

// ─── Tool Decorator ───────────────────────────────────────────────
export {
  // Constants
  TOOL_METADATA_KEY,
  TOOLS_METADATA_KEY,

  // Interfaces (re-exported as types)
  ToolMetadata,
  ToolDecoratorOptions,

  // Decorator
  Tool,

  // Helpers
  getToolMetadata,
  isToolMethod,
} from './tool.decorator';

// ─── Permission Decorator ─────────────────────────────────────────
export {
  // Constants
  PERMISSION_METADATA_KEY,
  PERMISSIONS_METADATA_KEY,

  // Interfaces (re-exported as types)
  PermissionRequirement,
  RequirePermissionOptions,

  // Decorator
  RequirePermission,

  // Helpers
  getPermissionRequirements,

  // Shorthand decorators
  RequireAllPermissions,
  RequireAnyPermission,
} from './permission.decorator';

// ─── Event Decorator ──────────────────────────────────────────────
export {
  // Constants
  EVENT_HANDLER_METADATA_KEY,
  EVENT_HANDLERS_METADATA_KEY,

  // Interfaces (re-exported as types)
  EventHandlerMetadata,
  OnAgentEventOptions,

  // Decorator
  OnAgentEvent,

  // Helpers
  getEventHandlerMetadata,

  // Shorthand decorators
  OnAgentStarted,
  OnTaskCompleted,
  OnTaskFailed,
  OnAgentError,
  OnSystemAlert,
  OnOrchestrationCompleted,
  OnCircuitBreakerOpened,
} from './event.decorator';
