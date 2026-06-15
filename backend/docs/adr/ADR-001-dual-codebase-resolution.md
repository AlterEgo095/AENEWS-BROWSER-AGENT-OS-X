# ADR-001: Dual Codebase Resolution

## Status

Accepted

## Context

The AENEWS Agent OS X project contains two parallel agent implementation directories:

1. **`src/agents/`** (root level) — Extended agent framework that provides the richer `BaseAgentService` pattern with memory, events, decorators, tools, and LLM-powered agents. This directory was created as part of the Software Factory integration and contains 80+ agents following a service-oriented pattern with dependency injection, tool decorators, and full lifecycle management.

2. **`backend/src/clusters/`** — NestJS-integrated agent implementations organized by functional cluster (browser, coding, security, self-evolution, etc.). These agents extend the simpler `BaseAgent` abstract class and are registered directly into the NestJS DI container via cluster modules.

This dual codebase creates ambiguity about where agent logic should live, how agents are discovered, and which pattern new agents should follow.

## Decision

We resolve the dual codebase as follows:

- **`backend/src/clusters/` is the source of truth** for all agent implementations within the NestJS backend. All production agents live here, organized by their functional cluster.
- **`src/agents/`** provides extended framework patterns, decorators, and the richer `BaseAgentService` abstraction. It serves as a reference implementation and may be used by the Software Factory runtime for agents that need the full decorator/tool chain.
- **Agent logic lives in backend clusters** with LLM and Bridge services injected via the `setServices()` method on `BaseAgent`. This allows agents to gracefully degrade when services are unavailable (e.g., no LLM API keys → simulation mode).
- **The `AgentFrameworkModule`** bridges both registries — it imports the backend's `AgentModule` (which provides `AgentRegistryService`) and exposes the extended framework services (memory, event bus, bridge, orchestrator, sandbox).

### Agent Registration Flow

```
Cluster Module (onModuleInit)
  → Create agent instances (new AgentClass())
  → agent.setServices({ llmService, bridgeService, eventBus })
  → agent.setSandboxService(sandboxService)  // for self-evolution agents
  → registry.register(agent)
```

## Consequences

### Positive

- **Single source of truth**: All agent implementations in one location (`backend/src/clusters/`), reducing confusion about where to add or modify agents.
- **NestJS-native**: Agents participate in the NestJS module system, making dependency injection, lifecycle hooks, and testing straightforward.
- **Graceful degradation**: The `setServices()` pattern allows agents to work without LLM/Bridge in simulation mode, and with real services when configured.
- **Progressive enhancement**: The extended framework patterns from `src/agents/` can be adopted incrementally without disrupting existing cluster agents.

### Negative

- **Two BaseAgent patterns exist**: `BaseAgent` (simple, in `backend/`) vs. `BaseAgentService` (rich, in `src/`). Developers must understand which to extend.
- **Bridge complexity**: The `AgentFrameworkModule` must bridge both registries, which adds a layer of indirection.
- **Migration path**: Agents currently in `src/agents/` that need NestJS integration must be migrated to `backend/src/clusters/`.

### Mitigation

- New agents should always be created in `backend/src/clusters/` extending `BaseAgent`.
- The `@Agent()` and `@Tool()` decorators from the extended framework can be used on `BaseAgent` subclasses but are not required.
- Documentation and code generation templates should default to the cluster pattern.
