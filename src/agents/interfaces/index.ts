/**
 * AENEWS Agent OS X - Interface Barrel Exports
 * Re-exports all interfaces, enums, and types from the agent framework.
 */

// ─── Core Agent Interface ────────────────────────────────────────
export {
  // Enums
  AgentStatus,
  AgentCluster,
  TaskPriority,
  TaskStatus,
  AgentErrorCode,

  // Interfaces
  AgentCapability,
  AgentRetryPolicy,
  RetryPolicy,
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentMetrics,
  AgentHealthState,
  AgentHealth,
  AgentState,
  AgentTool,
  AgentPermission,
  SimpleAgentEvent,
  DecompositionResult,
  PlanStep,
  ExecutionPlan,
  CritiqueResult,
  ValidationResult,
  TaskDefinition,
  OrchestrationPlan,
  OrchestrationStep,
  StepDependency,

  // Classes
  AgentError,
} from './agent.interface';

// ─── Agent Lifecycle Interface ───────────────────────────────────
export {
  // Enums
  LifecyclePhase,

  // Interfaces
  LifecycleContext,
  LifecycleHookResult,
  LifecycleTransitionRule,
  IAgentLifecycleController,
  IAgentLifecycle,

  // Types
  LifecycleHook,

  // Constants
  VALID_TRANSITIONS,
} from './agent-lifecycle.interface';

// ─── Agent Permission Interface ──────────────────────────────────
export {
  // Enums
  PermissionAction,
  PermissionResource,
  PermissionScope,
  ConditionOperator,

  // Interfaces
  PermissionDefinition,
  PermissionCondition,
  PermissionCheckResult,
  PermissionSet,
  RoleDefinition,
  IPermissionEvaluator,
  IAgentPermissionManager,

  // Constants
  DEFAULT_CLUSTER_PERMISSIONS,
} from './agent-permission.interface';

// ─── Agent Memory Interface ─────────────────────────────────────
export {
  // Enums
  MemoryTier,
  MemoryEncoding,

  // Interfaces
  MemoryEntry,
  MemoryMetadata,
  MemoryQuery,
  MemoryQueryResult,
  MemoryStoreOptions,
  WorkingMemoryEntry,
  SessionMemoryEntry,
  LongTermMemoryEntry,
  KnowledgeNode,
  KnowledgeRelationship,
  KnowledgeRelation,
  KnowledgeGraphQuery,
  KnowledgeGraphResult,
  VectorSearchEntry,
  VectorSearchQuery,
  VectorSearchResult,
  SimpleVectorSearchResult,
  RAGQuery,
  RAGResult,
  IMemoryService,
  MemoryStats,
  IWorkingMemoryService,
  ISessionMemoryService,
  ILongTermMemoryService,
  IKnowledgeGraphService,
  IVectorSearchService,
  IRAGService,
  IAgentMemory,
} from './agent-memory.interface';

// ─── Agent Event Interface ──────────────────────────────────────
export {
  // Enums
  AgentEventType,
  EventPriority,
  EventProcessingStatus,

  // Interfaces
  AgentEvent,
  AgentStatusChangedPayload,
  AgentHealthChangedPayload,
  TaskCreatedPayload,
  TaskCompletedPayload,
  TaskProgressPayload,
  OrchestrationStartedPayload,
  OrchestrationCompletedPayload,
  AgentErrorPayload,
  SystemAlertPayload,
  CircuitBreakerPayload,
  EventSubscription,
  EventFilter,
  EventStoreEntry,
  DeadLetterEntry,
  EventReplayRequest,
  EventReplayResult,
  IEventBusService,
  IEventStoreService,
  IDeadLetterQueueService,
  DeadLetterQueueStats,
  IEventReplayService,
  IAgentEventBus,

  // Types
  EventHandler,
} from './agent-event.interface';

// ─── Agent Tool Interface ───────────────────────────────────────
export {
  // Enums
  ToolStatus,
  ToolCategory,

  // Interfaces
  ToolDefinition,
  ToolSchema,
  ToolSchemaProperty,
  ToolRateLimit,
  ToolExecutionContext,
  ToolInput,
  ToolOutput,
  ToolError,
  ToolRegistration,
  ToolValidationResult,
  ToolValidationError,
  ToolUsageMetrics,
  IToolRegistry,
  IAgentToolRegistry,

  // Types
  ToolHandler,
} from './agent-tool.interface';
