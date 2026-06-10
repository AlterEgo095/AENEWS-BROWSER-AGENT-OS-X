# Phase 2 - Agent Core Framework

## Task ID
Phase 2 - Agent Core Framework

## Agent
Code Agent

## Summary
Created the complete Agent Core Framework for the AENEWS Agent OS X platform, consisting of 9 production-ready files that implement the agent abstraction layer, registry, lifecycle management, orchestration service, REST APIs, and module definitions.

## Files Created

### 1. `src/modules/agent/agent.abstract.ts`
- Abstract `BaseAgent` class that all 70+ agents will extend
- Defines `AgentContext` and `AgentResult` interfaces
- Implements lifecycle hooks: `onInitialize`, `onStart`, `execute`, `onStop`, `onPause`, `onResume`, `onError`
- `wrapExecution` method provides timing, error handling, and status management
- `getStatus()` and `getInfo()` for introspection
- Abstract members: `name`, `cluster`, `capabilities`, `version`, `description`

### 2. `src/modules/agent/registry/agent-registry.service.ts`
- `AgentRegistryService` — central in-memory registry for all agent instances
- Key format: `{cluster}:{name}` for uniqueness across clusters
- Methods: `register`, `unregister`, `get`, `getByCluster`, `getAll`, `executeAgent`, `getClusterStats`, `getRegistrySize`
- Per-cluster statistics: total, idle, running, error counts
- Validates agent exists and is not already running before execution

### 3. `src/modules/agent/lifecycle/agent-lifecycle.service.ts`
- `AgentLifecycleService` — manages agent lifecycle transitions
- Methods: `initializeAgent`, `startAgent`, `stopAgent`, `pauseAgent`, `resumeAgent`, `restartAgent`
- Bulk operations: `initializeAll`, `stopAll` (failure-tolerant, logs errors)
- Delegates to `AgentRegistryService` for agent lookup

### 4. `src/modules/agent/agent.service.ts`
- `AgentService` — main orchestration service connecting database and in-memory registry
- CRUD operations for agents: `create`, `findAll`, `findOne`, `update`, `remove`
- `executeAgent`: validates agent exists and is enabled, delegates to registry, records Execution entity, updates agent status
- `getClusterStats`: returns per-cluster statistics from registry
- `getAgentExecutions`: paginated execution history
- Uses `NotFoundException` for missing agents
- Records failed executions in the database even on unhandled errors

### 5. `src/modules/agent/agent.controller.ts`
- REST API controller at `/agents` route
- Endpoints: POST /, GET /, GET /stats, GET /:id, PUT /:id, DELETE /:id, POST /:id/execute, GET /:id/executions
- DTOs with class-validator: `CreateAgentDto`, `UpdateAgentDto`, `ExecuteAgentDto`
- Swagger annotations with `@ApiTags` and `@ApiOperation`

### 6. `src/modules/agent/agent.module.ts`
- NestJS module wiring: imports TypeOrmModule for Agent, Execution, Task entities
- Provides and exports: `AgentService`, `AgentRegistryService`, `AgentLifecycleService`
- Controllers: `AgentController`

### 7. `src/modules/task/task.service.ts`
- `TaskService` — task management service
- CRUD: `create` (defaults to PENDING), `findAll` (priority DESC + created ASC), `findOne`
- `updateStatus`: auto-sets startedAt/completedAt based on transition
- `incrementRetry`: increments retry count, auto-transitions to FAILED when maxRetries exceeded
- `cancel`: sets CANCELLED status with completedAt

### 8. `src/modules/task/task.controller.ts`
- REST API controller at `/tasks` route
- Endpoints: POST /, GET /, GET /:id, PUT /:id/cancel
- `CreateTaskDto` with class-validator: type, tenantId, optional agentId, priority, input, maxRetries, scheduledAt

### 9. `src/modules/task/task.module.ts`
- NestJS module: imports TypeOrmModule for Task entity
- Provides and exports `TaskService`

## Files Modified

### `src/app.module.ts`
- Added imports for `AgentModule` and `TaskModule`
- Added both modules to the `imports` array

## Key Design Decisions

1. **wrapExecution visibility**: Changed from `protected` to `public` to allow `AgentRegistryService` to call it externally — this is the canonical entry point for executing agents through the registry.

2. **NotFoundException**: Used NestJS `NotFoundException` in services for database lookups, enabling proper HTTP 404 responses via the framework.

3. **Execution recording on all paths**: Even unhandled errors during agent execution are recorded as `Execution` entities with `AgentStatus.ERROR`, ensuring complete audit trail.

4. **Disabled agent handling**: `executeAgent` returns an `AgentResult` with `success: false` rather than throwing when an agent is disabled, allowing callers to handle it gracefully.

5. **DTO validation**: All controller DTOs use `class-validator` decorators matching the global `ValidationPipe` configuration (whitelist + forbidNonWhitelisted).

## Verification
- TypeScript compilation: 0 errors (`tsc --noEmit --skipLibCheck` passes)
- All 9 new files created
- `app.module.ts` updated with new module imports
