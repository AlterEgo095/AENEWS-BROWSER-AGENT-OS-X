# Task 2-a: Core Agent Framework Interface Files

## Summary
Created and enhanced all core agent framework interface files in `/home/z/my-project/src/agents/interfaces/`. The existing files already contained comprehensive type definitions, so the user-requested types were merged in as additions, preserving all existing code and backward compatibility.

## Files Modified

### 1. `agent.interface.ts`
**New types added:**
- `RetryPolicy` — type alias for `AgentRetryPolicy`
- `AgentHealth` — type alias for `AgentHealthState`
- `AgentTool` — lightweight tool interface with `name`, `description`, `execute()`
- `AgentPermission` — resource/action permission pair
- `SimpleAgentEvent` — lightweight event shape (distinct from comprehensive `AgentEvent<T>` in event interface)
- `DecompositionResult` — subtask decomposition with dependencies and execution order
- `PlanStep` — single step in an execution plan
- `ExecutionPlan` — ordered plan with parallelism flag
- `CritiqueResult` — critique scoring with issues/suggestions
- `ValidationResult` — validation outcome with errors/warnings

**Changed:**
- `AgentInput.priority` type changed from `number` to `TaskPriority` for stronger typing

**Preserved:** All existing types (`AgentStatus`, `AgentCluster`, `AgentConfig`, `AgentError`, `TaskDefinition`, `OrchestrationPlan`, etc.)

### 2. `agent-lifecycle.interface.ts`
**New types added:**
- `IAgentLifecycleController` — direct lifecycle control interface with `initialize()`, `start()`, `execute()`, `pause()`, `resume()`, `stop()`, `destroy()`, `getStatus()`, `getState()`, `healthCheck()`

**Preserved:** Existing `IAgentLifecycle` (hook management), `LifecyclePhase`, `LifecycleContext`, `VALID_TRANSITIONS`, etc.

### 3. `agent-permission.interface.ts`
**New types added:**
- `IAgentPermissionManager` — simplified permission manager with `grant()`, `revoke()`, `hasPermission()`, `getAllPermissions()`, `checkPermissions()`
- Imported `AgentPermission` from `agent.interface.ts`

**Preserved:** Existing `IPermissionEvaluator`, `PermissionDefinition`, `RoleDefinition`, `DEFAULT_CLUSTER_PERMISSIONS`, etc.

### 4. `agent-memory.interface.ts`
**New types added:**
- `KnowledgeRelation` — simple knowledge graph relation (distinct from `KnowledgeRelationship`)
- `SimpleVectorSearchResult` — lightweight vector search result `{id, score, payload}`
- `IAgentMemory` — unified memory interface combining all tier operations: `store()`, `retrieve()`, `delete()`, `search()`, `addKnowledgeNode()`, `addKnowledgeRelation()`, `queryKnowledge()`, `getConversationContext()`, `clearTier()`

**Preserved:** All existing interfaces (`IMemoryService`, `IWorkingMemoryService`, `IKnowledgeGraphService`, `IVectorSearchService`, `IRAGService`, etc.)

### 5. `agent-event.interface.ts`
**New types added:**
- `IAgentEventBus` — simplified event bus with `publish()`, `subscribe()`, `unsubscribe()`, `getEventHistory()`, `replayEvents()`

**Preserved:** All existing types (`AgentEvent<T>`, `IEventBusService`, `IEventStoreService`, `IDeadLetterQueueService`, etc.)

### 6. `agent-tool.interface.ts`
**New types added:**
- `IAgentToolRegistry` — simplified tool registry with `register()`, `unregister()`, `get()`, `getAll()`, `execute()`
- Imported `AgentTool` from `agent.interface.ts`

**Preserved:** All existing types (`IToolRegistry`, `ToolDefinition`, `ToolHandler`, etc.)

### 7. `index.ts` (NEW)
Barrel file exporting all interfaces, enums, types, and constants from all 6 interface modules. Handles naming conflicts by using distinct export names (e.g., `SimpleAgentEvent` vs `AgentEvent`, `SimpleVectorSearchResult` vs `VectorSearchResult`).

## Design Decisions
1. **Merge over replace**: The existing files had richer, production-grade type definitions. Rather than replacing them with the simpler user-specified versions, the user's types were added as supplementary exports.
2. **Alias pattern**: Where the user's type was identical but differently named (e.g., `RetryPolicy` vs `AgentRetryPolicy`), type aliases were created for compatibility.
3. **Naming conflict avoidance**: The user's `AgentEvent` conflicted with the existing generic `AgentEvent<T>` in the event interface, so it was named `SimpleAgentEvent` in `agent.interface.ts`. The comprehensive `AgentEvent<T>` remains the primary event type.
4. **Interface coexistence**: Where the user's interface served a different purpose (e.g., `IAgentLifecycleController` vs `IAgentLifecycle`), both are preserved side by side.
