# Orchestrator Bridge Upgrade - Task Record

## Task: Upgrade orchestrator services to use LLM via AgentConnectorBridge

### Files Modified

1. **`src/agents/orchestrator/task-decomposer.service.ts`**
   - Added `Optional, Inject` imports from `@nestjs/common`
   - Added `AgentConnectorBridge` import from `../bridge`
   - Injected bridge in constructor as `@Optional() @Inject(AgentConnectorBridge)`
   - Added `llmDecompose(input: AgentInput): Promise<TaskDefinition[]>` method
   - Modified `decompose()` to try LLM first when bridge available, with fallback to rule-based

2. **`src/agents/orchestrator/task-planner.service.ts`**
   - Added `Optional, Inject` imports from `@nestjs/common`
   - Added `AgentConnectorBridge` import from `../bridge`
   - Added `ExecutionPlan` to interface imports
   - Injected bridge in constructor as `@Optional() @Inject(AgentConnectorBridge)`
   - Added `llmPlan(input: AgentInput, subtasks: TaskDefinition[]): Promise<ExecutionPlan | null>` method

3. **`src/agents/orchestrator/task-critic.service.ts`**
   - Added `Optional, Inject` imports from `@nestjs/common`
   - Added `AgentConnectorBridge` import from `../bridge`
   - Injected bridge in constructor as `@Optional() @Inject(AgentConnectorBridge)`
   - Added `llmCritique(results: StepExecutionResult[], request: OrchestrationRequest): Promise<CritiqueResult | null>` method
   - Modified `critique()` to try LLM first when bridge available, with fallback to rule-based

4. **`src/agents/orchestrator/task-validator.service.ts`**
   - Added `Optional, Inject` imports from `@nestjs/common`
   - Added `AgentConnectorBridge` import from `../bridge`
   - Injected bridge in constructor as `@Optional() @Inject(AgentConnectorBridge)`
   - Added `llmValidate(results: any, requirements: any): Promise<ValidationResult | null>` method

5. **`src/agents/orchestrator/task-repair.service.ts`**
   - Added `Optional, Inject` imports from `@nestjs/common`
   - Added `AgentConnectorBridge` import from `../bridge`
   - Injected bridge in constructor as `@Optional() @Inject(AgentConnectorBridge)`
   - Added `llmRepair(results: StepExecutionResult[], critique: CritiqueResult, request: OrchestrationRequest): Promise<RepairResult | null>` method
   - Modified `repair()` to try LLM first when bridge available, with fallback to rule-based

6. **`src/agents/orchestrator/orchestrator.module.ts`**
   - Added `AgentConnectorBridgeModule` import from `../bridge`
   - Added `AgentConnectorBridgeModule` to imports array

### Design Decisions

- All bridge injections use `@Optional()` so services work in test environments without the bridge
- All bridge references check `if (this.bridge)` before calling LLM methods
- LLM methods are always tried first when bridge is available, with graceful fallback to rule-based logic
- Original method signatures are unchanged — all existing rule-based logic preserved
- LLM prompts follow the exact specifications from the task requirements
- `any` types used in LLM response parsing are intentional for dynamic JSON handling
