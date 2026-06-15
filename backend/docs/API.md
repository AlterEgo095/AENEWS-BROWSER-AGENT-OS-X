# AENEWS Agent OS X — API Reference

> Auto-generated from NestJS controller definitions.
> Base path: `/api/v1` (configured in `main.ts` via `setGlobalPrefix`).

---

## Table of Contents

- [Authentication](#authentication)
- [Agents](#agents)
- [Tasks](#tasks)
- [Missions (Software Factory)](#missions-software-factory)
- [Events](#events)
- [Orchestration](#orchestration)
- [Intelligence](#intelligence)
- [Swarm Intelligence](#swarm-intelligence)
- [Security](#security)
- [Performance](#performance)
- [Health](#health)
- [Connectors](#connectors)
- [Plugins](#plugins)
- [Tenants](#tenants)
- [Users](#users)
- [Metrics (Observability)](#metrics-observability)
- [System](#system)

---

## Authentication

All endpoints except those marked **Public** require a valid JWT Bearer token in the `Authorization` header. Role-based access control (RBAC) is enforced via `@Roles()` decorators. Multi-tenancy is enforced via the `TenantGuard` and `@TenantScoped()` decorator.

### Roles

| Role | Description |
|------|-------------|
| `super_admin` | Full system access across all tenants |
| `tenant_admin` | Admin access within their own tenant |
| `operator` | Can create/modify resources within their tenant |
| `viewer` | Read-only access within their tenant |

---

## Auth

Controller: `AuthController` | Tag: `Authentication` | Base: `/auth`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/auth/register` | Public | — | Register a new user |
| POST | `/auth/login` | Public | — | Login with email and password |
| POST | `/auth/refresh` | Public | — | Refresh access token using refresh token |
| POST | `/auth/logout` | Bearer | Any authenticated | Logout from current session |
| DELETE | `/auth/logout-all` | Bearer | Any authenticated | Logout from all devices |

---

## Agents

Controller: `AgentController` | Tag: `Agents` | Base: `/agents`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/agents` | Bearer | `super_admin`, `tenant_admin`, `operator` | Create a new agent |
| GET | `/agents` | Bearer | `super_admin`, `tenant_admin`, `operator`, `viewer` | List all agents with optional filters (`tenantId`, `cluster`) |
| GET | `/agents/stats` | Bearer | `super_admin`, `tenant_admin`, `operator`, `viewer` | Get cluster statistics |
| GET | `/agents/:id` | Bearer | `super_admin`, `tenant_admin`, `operator`, `viewer` | Get agent by ID |
| PUT | `/agents/:id` | Bearer | `super_admin`, `tenant_admin`, `operator` | Update agent |
| DELETE | `/agents/:id` | Bearer | `super_admin`, `tenant_admin`, `operator` | Delete agent |
| POST | `/agents/:id/execute` | Bearer | `super_admin`, `tenant_admin`, `operator` | Execute an agent with the given context |
| GET | `/agents/:id/executions` | Bearer | `super_admin`, `tenant_admin`, `operator`, `viewer` | Get agent execution history |

### Agent Cluster Types

| Cluster | Enum Value | Agent Count | Description |
|---------|-----------|-------------|-------------|
| Browser | `browser` | 17 | Web automation, scraping, form filling, screenshots |
| Computer | `computer` | 7 | Filesystem, terminal, processes, system monitoring |
| Coding | `coding` | 8 | Code generation, review, debugging, deployment |
| Office | `office` | 6 | Email, calendar, documents, spreadsheets |
| Marketing | `marketing` | 8 | SEO, analytics, content creation, social media |
| Business | `business` | 8 | Strategy, finance, CRM, HR, legal |
| Infrastructure | `infrastructure` | 8 | Container management, scaling, monitoring, CI/CD |
| Security | `security` | 6 | Threat detection, encryption, access control, compliance |
| Meta Intelligence | `meta-intelligence` | 13 | Reasoning, learning, adaptation, knowledge synthesis |
| LLM Intelligence | `llm-intelligence` | 6 | LLM validation, planning, repair, criticism, decomposition |
| Intelligent Orchestration | `intelligent-orchestration` | 4 | Dynamic scheduling, mission orchestration AI, priority arbitration |
| Watchdog | `watchdog` | 3 | Error analysis, circuit breakers, auto-fixing |
| Self Evolution | `self-evolution` | 5 | Weakness detection, patch generation, metric analysis |
| Certification | `certification` | 13 | Architecture, security, performance, compliance auditing |

---

## Tasks

Controller: `TaskController` | Tag: `Tasks` | Base: `/tasks`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/tasks` | Bearer | `super_admin`, `tenant_admin`, `operator` | Create a new task |
| GET | `/tasks` | Bearer | `super_admin`, `tenant_admin`, `operator`, `viewer` | List all tasks with optional filters (`tenantId`, `status`) |
| GET | `/tasks/:id` | Bearer | `super_admin`, `tenant_admin`, `operator`, `viewer` | Get task by ID |
| PUT | `/tasks/:id/cancel` | Bearer | `super_admin`, `tenant_admin`, `operator` | Cancel a task |

### Task Status Values

`pending` | `running` | `completed` | `failed` | `cancelled` | `retrying`

---

## Missions (Software Factory)

Controller: `SoftwareFactoryController` | Tag: `Software Factory — Missions` | Base: `/missions`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/missions` | Bearer | Default | List all missions with pagination and optional state/priority filter |
| POST | `/missions` | Bearer | Default | Create a new mission |
| GET | `/missions/:id` | Bearer | Default | Get mission details by ID |
| PUT | `/missions/:id` | Bearer | Default | Update mission |
| DELETE | `/missions/:id` | Bearer | Default | Cancel/delete mission (soft-delete via state change) |
| POST | `/missions/:id/start` | Bearer | Default | Start mission execution |
| POST | `/missions/:id/pause` | Bearer | Default | Pause mission execution |
| POST | `/missions/:id/resume` | Bearer | Default | Resume paused mission |
| GET | `/missions/:id/progress` | Bearer | Default | Get mission progress |
| POST | `/missions/:id/contracts` | Bearer | Default | Create contract for mission |
| GET | `/missions/:id/contracts` | Bearer | Default | List contracts for mission |
| PUT | `/missions/:id/contracts/:contractId` | Bearer | Default | Update contract |

### Mission States

`DRAFT` → `PLANNED` → `RESEARCH` → `BUILDING` → `TESTING` → `AUDITING` → `CERTIFYING` → `DELIVERING` → `COMPLETED`

Failed states: `FAILED`, `CANCELLED`, `ARCHIVED`

### Mission Priorities

`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

---

## Events

Controller: `EventController` | Tag: `Events` | Base: `/events`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/events` | Bearer | `super_admin`, `tenant_admin`, `operator` | Emit a new event |
| GET | `/events` | Bearer | `super_admin`, `tenant_admin`, `operator`, `viewer` | List events with optional filters (`namespace`, `type`, `tenantId`, `severity`) |
| GET | `/events/:id` | Bearer | `super_admin`, `tenant_admin`, `operator`, `viewer` | Get event by ID |

### Event Severity Values

`info` | `warning` | `error` | `critical`

---

## Orchestration

Controller: `OrchestrationController` | Tag: `Orchestration` | Base: `/orchestration`

All endpoints require Bearer auth + `super_admin`, `tenant_admin`, or `operator` role. Rate limiting is applied per domain.

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/orchestration/collaborate` | Bearer | `super_admin`, `tenant_admin`, `operator` | Start a multi-agent collaboration session |
| GET | `/orchestration/collaborate/:id` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get collaboration status |
| DELETE | `/orchestration/collaborate/:id` | Bearer | `super_admin`, `tenant_admin`, `operator` | Cancel a collaboration |
| POST | `/orchestration/decompose` | Bearer | `super_admin`, `tenant_admin`, `operator` | Decompose a mission into subtasks |
| POST | `/orchestration/coordinate` | Bearer | `super_admin`, `tenant_admin`, `operator` | Coordinate tasks across clusters |
| GET | `/orchestration/cluster-health` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get cluster health status |
| GET | `/orchestration/connectors` | Bearer | `super_admin`, `tenant_admin`, `operator` | List all unified connectors |
| GET | `/orchestration/connectors/health` | Bearer | `super_admin`, `tenant_admin`, `operator` | Check health of all connectors |
| POST | `/orchestration/connectors/execute` | Bearer | `super_admin`, `tenant_admin`, `operator` | Execute action via a connector |
| GET | `/orchestration/statistics` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get orchestration statistics |
| GET | `/orchestration/history` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get orchestration history (filtered by `type`) |

---

## Intelligence

Controller: `IntelligenceController` | Tag: `Intelligence` | Base: `/intelligence`

All endpoints require Bearer auth + `super_admin`, `tenant_admin`, or `operator` role.

### Knowledge Graph

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/intelligence/graph/stats` | Bearer | Default | Get knowledge graph statistics |
| GET | `/intelligence/graph/agents/:id` | Bearer | Default | Get agent knowledge profile |
| GET | `/intelligence/graph/expertise` | Bearer | Default | Get expertise ranking by cluster |
| GET | `/intelligence/graph/recommendations` | Bearer | Default | Get strategy recommendations |
| POST | `/intelligence/graph/query` | Bearer | `super_admin` only | Execute a read-only Cypher query |

### Learning Engine

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/intelligence/learning/feedback` | Bearer | Default | Submit learning feedback |
| GET | `/intelligence/learning/strategy/:agentId` | Bearer | Default | Get best strategy for an agent |
| GET | `/intelligence/learning/predict/:agentId` | Bearer | Default | Predict failure probability for an agent |
| POST | `/intelligence/learning/transfer` | Bearer | Default | Transfer learning between agents |
| GET | `/intelligence/learning/insights` | Bearer | Default | Get learning insights (filtered by `type`, `minConfidence`) |
| GET | `/intelligence/learning/profile/:agentId` | Bearer | Default | Get learning profile for an agent |
| GET | `/intelligence/learning/stats` | Bearer | Default | Get learning engine statistics |

### Pattern Mining

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/intelligence/patterns/mine` | Bearer | Default | Mine patterns from execution data |
| GET | `/intelligence/patterns` | Bearer | Default | Get discovered patterns (filtered by `category`, `minConfidence`) |
| POST | `/intelligence/patterns/predict` | Bearer | Default | Predict outcome based on patterns |
| GET | `/intelligence/patterns/correlations` | Bearer | Default | Analyze pattern correlations |
| GET | `/intelligence/patterns/stats` | Bearer | Default | Get pattern mining statistics |

### Adaptive Strategy

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/intelligence/adaptive/config` | Bearer | Default | Get current adaptive configuration |
| POST | `/intelligence/adaptive/parameters` | Bearer | Default | Get adaptive parameters for a context |
| POST | `/intelligence/adaptive/adapt` | Bearer | Default | Run adaptation cycle |
| POST | `/intelligence/adaptive/pin/:param` | Bearer | Default | Pin a parameter (prevent auto-adaptation) |
| DELETE | `/intelligence/adaptive/pin/:param` | Bearer | Default | Unpin a parameter |
| POST | `/intelligence/adaptive/reset` | Bearer | Default | Emergency reset all adaptations |
| GET | `/intelligence/adaptive/history` | Bearer | Default | Get adaptation history |
| GET | `/intelligence/adaptive/stats` | Bearer | Default | Get adaptive strategy statistics |

### Experience Replay

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/intelligence/experience/record` | Bearer | Default | Record an experience |
| POST | `/intelligence/experience/replay/:id` | Bearer | Default | Replay an experience for analysis |
| POST | `/intelligence/experience/what-if` | Bearer | Default | What-if analysis on an experience |
| GET | `/intelligence/experience/similar` | Bearer | Default | Find similar experiences |
| GET | `/intelligence/experience/stats` | Bearer | Default | Get experience replay statistics |

### Feedback

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/intelligence/feedback` | Bearer | Default | Submit feedback |
| POST | `/intelligence/feedback/bulk` | Bearer | Default | Submit bulk feedback |
| GET | `/intelligence/feedback/mission/:id` | Bearer | Default | Get aggregated feedback for a mission |
| GET | `/intelligence/feedback/summary` | Bearer | Default | Get feedback summary (filtered by `cluster`) |
| GET | `/intelligence/feedback/trends` | Bearer | Default | Get feedback trends (filtered by `metric`, `period`) |
| GET | `/intelligence/feedback/actions` | Bearer | Default | Get action items from feedback |
| GET | `/intelligence/feedback/stats` | Bearer | Default | Get feedback statistics |

---

## Swarm Intelligence

Controller: `SwarmController` | Tag: `Swarm Intelligence` | Base: `/swarm`

All endpoints require Bearer auth + `super_admin`, `tenant_admin`, or `operator` role.

### Swarm Management

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/swarm/create` | Bearer | `super_admin`, `tenant_admin`, `operator` | Create a new swarm |
| POST | `/swarm/:id/execute` | Bearer | `super_admin`, `tenant_admin`, `operator` | Execute a swarm |
| POST | `/swarm/:id/terminate` | Bearer | `super_admin`, `tenant_admin`, `operator` | Terminate a running swarm |
| GET | `/swarm/:id` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get swarm details |
| GET | `/swarm/:id/metrics` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get swarm metrics |
| GET | `/swarm/:id/result` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get swarm result |
| GET | `/swarm/:id/pheromones` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get pheromone trail |
| GET | `/swarm/:id/emergent` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get emergent behaviors |
| GET | `/swarm/list` | Bearer | `super_admin`, `tenant_admin`, `operator` | List all swarms |
| GET | `/swarm/stats` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get swarm statistics |

### Consensus

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/swarm/consensus/initiate` | Bearer | `super_admin`, `tenant_admin`, `operator` | Initiate a consensus protocol |
| POST | `/swarm/consensus/:id/run` | Bearer | `super_admin`, `tenant_admin`, `operator` | Run a consensus round |
| GET | `/swarm/consensus/:id/result` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get consensus result |
| GET | `/swarm/consensus/:id/dissent` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get dissent records |
| GET | `/swarm/consensus/list` | Bearer | `super_admin`, `tenant_admin`, `operator` | List all consensus sessions |
| GET | `/swarm/consensus/stats` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get consensus statistics |

### Persistence

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/swarm/persistence/checkpoint` | Bearer | `super_admin`, `tenant_admin`, `operator` | Create collaboration checkpoint |
| GET | `/swarm/persistence/active` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get active collaborations |
| GET | `/swarm/persistence/history` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get collaboration history |
| GET | `/swarm/persistence/stats` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get persistence statistics |
| POST | `/swarm/persistence/recover` | Bearer | `super_admin`, `tenant_admin`, `operator` | Trigger crash recovery |

### Working Memory

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/swarm/working-memory/session` | Bearer | `super_admin`, `tenant_admin`, `operator` | Create working memory session |
| POST | `/swarm/working-memory/:id/write` | Bearer | `super_admin`, `tenant_admin`, `operator` | Write to working memory |
| GET | `/swarm/working-memory/:id/read` | Bearer | `super_admin`, `tenant_admin`, `operator` | Read from working memory (optional `key` query param) |
| POST | `/swarm/working-memory/:id/blackboard` | Bearer | `super_admin`, `tenant_admin`, `operator` | Post to blackboard |
| GET | `/swarm/working-memory/:id/blackboard` | Bearer | `super_admin`, `tenant_admin`, `operator` | Read blackboard |
| DELETE | `/swarm/working-memory/:id` | Bearer | `super_admin`, `tenant_admin`, `operator` | Close working memory session |
| GET | `/swarm/working-memory/stats` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get working memory statistics |

### Feedback Loop

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/swarm/feedback/cycle` | Bearer | `super_admin`, `tenant_admin`, `operator` | Run feedback cycle |
| GET | `/swarm/feedback/parameters` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get feedback parameters |
| GET | `/swarm/feedback/history` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get feedback history |
| POST | `/swarm/feedback/rollback/:param` | Bearer | `super_admin`, `tenant_admin`, `operator` | Rollback a feedback parameter |
| GET | `/swarm/feedback/stats` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get feedback statistics |

### Topology

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/swarm/topology/create` | Bearer | `super_admin`, `tenant_admin`, `operator` | Create agent topology |
| POST | `/swarm/topology/:id/add-node` | Bearer | `super_admin`, `tenant_admin`, `operator` | Add node to topology |
| POST | `/swarm/topology/:id/remove-node` | Bearer | `super_admin`, `tenant_admin`, `operator` | Remove node from topology |
| POST | `/swarm/topology/:id/isolate/:agentId` | Bearer | `super_admin`, `tenant_admin`, `operator` | Isolate a node in the topology |
| POST | `/swarm/topology/:id/restore/:agentId` | Bearer | `super_admin`, `tenant_admin`, `operator` | Restore an isolated node |
| POST | `/swarm/topology/:id/retype` | Bearer | `super_admin`, `tenant_admin`, `operator` | Change topology type |
| GET | `/swarm/topology/:id/metrics` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get topology metrics |
| GET | `/swarm/topology/list` | Bearer | `super_admin`, `tenant_admin`, `operator` | List all topologies |

### DAG Orchestration

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/swarm/dag/execute` | Bearer | `super_admin`, `tenant_admin`, `operator` | Execute a DAG of agent tasks |
| GET | `/swarm/dag/:id/result` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get DAG execution result |
| GET | `/swarm/dag/:id/trace` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get DAG execution trace |
| GET | `/swarm/dag/stats` | Bearer | `super_admin`, `tenant_admin`, `operator` | Get DAG statistics |

---

## Security

Controller: `SecurityController` | Tag: `Security` | Base: `/security`

All endpoints require Bearer auth.

### Prompt Injection Guard

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/security/scan-prompt` | Bearer | `super_admin`, `tenant_admin` | Scan a prompt input for injection attacks |

### SSRF Protection

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/security/validate-url` | Bearer | `super_admin`, `tenant_admin` | Validate a URL for SSRF risks |

### Encryption

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/security/encrypt` | Bearer | `super_admin` | Encrypt a plaintext string using AES-256-GCM |
| POST | `/security/decrypt` | Bearer | `super_admin` | Decrypt an AES-256-GCM encrypted string |
| POST | `/security/generate-api-key` | Bearer | `super_admin` | Generate a new secure random API key |

### Account Lockout

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/security/lockout/stats` | Bearer | `super_admin`, `tenant_admin` | Get account lockout statistics |
| GET | `/security/lockout/check/:email` | Bearer | `super_admin`, `tenant_admin` | Check if an account is locked |
| POST | `/security/lockout/unlock/:email` | Bearer | `super_admin`, `tenant_admin` | Unlock a locked account |

### Audit

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/security/audit` | Bearer | `super_admin`, `tenant_admin` | Query security audit log (filterable by `startDate`, `endDate`, `action`, `userId`) |
| GET | `/security/audit/stats` | Bearer | `super_admin`, `tenant_admin` | Get security audit statistics |

### IP Access Control

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/security/threats/ip-reputations` | Bearer | `super_admin` | Get all IP reputations |
| GET | `/security/threats/ip/:ip` | Bearer | `super_admin`, `tenant_admin` | Get reputation for a specific IP |
| POST | `/security/threats/ip/:ip/block` | Bearer | `super_admin` | Manually block an IP |
| POST | `/security/threats/ip/:ip/unblock` | Bearer | `super_admin` | Manually unblock an IP |

### Token Management

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/security/tokens/sessions` | Bearer | Any authenticated | Get active sessions for current user |
| DELETE | `/security/tokens/revoke-all` | Bearer | Any authenticated | Revoke all tokens (logout from all devices) |
| DELETE | `/security/tokens/revoke/:family` | Bearer | `super_admin` | Revoke a token family (admin only) |

### CORS Management

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/security/cors/config` | Bearer | `super_admin` | Get current CORS configuration |
| POST | `/security/cors/origins` | Bearer | `super_admin` | Add a CORS origin |
| DELETE | `/security/cors/origins/:origin` | Bearer | `super_admin` | Remove a CORS origin |

### Threat Intelligence

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/security/threats/alerts` | Bearer | `super_admin`, `tenant_admin` | Get recent threat alerts |
| POST | `/security/threats/alerts/:id/acknowledge` | Bearer | `super_admin`, `tenant_admin` | Acknowledge a threat alert |

---

## Performance

Controller: `PerformanceController` | Base: `/performance`

All endpoints require Bearer auth + `super_admin` role.

### Overview

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/performance/overview` | Bearer | `super_admin` | Comprehensive performance overview (all subsystems) |

### Profiling

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/performance/profiling/report` | Bearer | `super_admin` | Detailed performance profiling report |
| GET | `/performance/profiling/memory` | Bearer | `super_admin` | Memory statistics with heap details |
| GET | `/performance/profiling/spans` | Bearer | `super_admin` | Active profiling spans |

### Memory

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/performance/profiling/memory` | Bearer | `super_admin` | Memory statistics with heap details |

### Connection Pools

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/performance/pools` | Bearer | `super_admin` | Connection pool statistics and health |
| GET | `/performance/pools/recommendations` | Bearer | `super_admin` | Pool sizing recommendations |

### Slow Queries

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/performance/slow-queries` | Bearer | `super_admin` | Recent slow queries (filterable by `limit`, `minDurationMs`, `schema`) |
| DELETE | `/performance/slow-queries` | Bearer | `super_admin` | Clear slow query log |

### Cache

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/performance/cache/stats` | Bearer | `super_admin` | Response cache statistics |
| POST | `/performance/cache/invalidate` | Bearer | `super_admin` | Invalidate cache entries matching pattern |
| DELETE | `/performance/cache` | Bearer | `super_admin` | Flush all cached entries |

### Recommendations

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/performance/pools/recommendations` | Bearer | `super_admin` | Pool sizing recommendations |

---

## Health

Controller: `HealthController` | Tag: `Health` | Base: `/health`

All endpoints are **Public** (no authentication required).

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/health` | Public | — | Full health check (database, Redis, memory, disk, agent system) |
| GET | `/health/ready` | Public | — | Readiness probe (database, Redis, agent system) — excludes memory/disk |
| GET | `/health/live` | Public | — | Liveness probe (process memory only) — ultra-lightweight |

---

## Connectors

Controller: `ConnectorHealthController` | Tag: `Connectors` | Base: `/connectors`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/connectors/health` | Default | Default | Get health status of all connectors |
| GET | `/connectors/health/:name` | Default | Default | Get health status of a specific connector |
| GET | `/connectors/status` | Default | Default | Get connector status summary (real vs simulation) |
| POST | `/connectors/health/check` | Default | Default | Trigger an immediate health check for all connectors |

### Software Factory Connectors

Controller: `ConnectorController` | Tag: `Software Factory — Connectors` | Base: `/connectors`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/connectors` | Bearer | Default | List available connectors |
| POST | `/connectors/:name/execute` | Bearer | Default | Execute action via connector |

### Available Connectors

| Connector | Module | Mode | Description |
|-----------|--------|------|-------------|
| `browser` | `BrowserConnectorModule` | Real (Playwright) | Browser automation with pool management |
| `coding` | `CodingConnectorModule` | Real (GitHub/Git/Filesystem) | Code management and analysis |
| `office` | `OfficeConnectorModule` | Real (docx, xlsx, email) | Document and email generation |
| `infrastructure` | `InfrastructureConnectorModule` | Real (Docker, system) | Container and system management |
| `security` | `SecurityConnectorModule` | Real (auth, encryption) | Security operations |

---

## Plugins

Controller: `PluginController` | Tag: `Plugins` | Base: `/plugins`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/plugins` | Bearer | `super_admin`, `tenant_admin` | Register a new plugin |
| GET | `/plugins` | Bearer | `super_admin`, `tenant_admin`, `operator`, `viewer` | List all plugins |
| GET | `/plugins/loaded` | Bearer | `super_admin`, `tenant_admin`, `operator`, `viewer` | List loaded plugins in memory |
| GET | `/plugins/:id` | Bearer | `super_admin`, `tenant_admin`, `operator`, `viewer` | Get plugin by ID |
| PUT | `/plugins/:id` | Bearer | `super_admin`, `tenant_admin` | Update plugin |
| PUT | `/plugins/:id/enable` | Bearer | `super_admin`, `tenant_admin` | Enable plugin |
| PUT | `/plugins/:id/disable` | Bearer | `super_admin`, `tenant_admin` | Disable plugin |
| DELETE | `/plugins/:id` | Bearer | `super_admin`, `tenant_admin` | Delete plugin |

---

## Tenants

Controller: `TenantController` | Tag: `Tenants` | Base: `/tenants`

All endpoints require Bearer auth + `super_admin` role.

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/tenants` | Bearer | `super_admin` | Create a new tenant |
| GET | `/tenants` | Bearer | `super_admin` | List all tenants |
| GET | `/tenants/:id` | Bearer | `super_admin` | Get tenant by ID |
| PUT | `/tenants/:id` | Bearer | `super_admin` | Update tenant |
| PUT | `/tenants/:id/activate` | Bearer | `super_admin` | Activate tenant |
| PUT | `/tenants/:id/deactivate` | Bearer | `super_admin` | Deactivate tenant |
| PUT | `/tenants/:id/quotas` | Bearer | `super_admin` | Update tenant quotas |

---

## Users

Controller: `UserController` | Tag: `Users` | Base: `/users`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/users` | Bearer | `super_admin`, `tenant_admin`, `operator`, `viewer` | List users |
| GET | `/users/:id` | Bearer | `super_admin`, `tenant_admin`, `operator`, `viewer` | Get user by ID |
| PUT | `/users/:id` | Bearer | `super_admin`, `tenant_admin` | Update user |
| PUT | `/users/:id/password` | Bearer | `super_admin`, `tenant_admin` | Update password |
| PUT | `/users/:id/activate` | Bearer | `super_admin`, `tenant_admin` | Activate user |
| PUT | `/users/:id/deactivate` | Bearer | `super_admin`, `tenant_admin` | Deactivate user |

---

## Metrics (Observability)

Controller: `MetricsController` | Base: `/metrics`

All endpoints are **Public** (no authentication required) for Prometheus scraper access.

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/metrics` | Public | — | Prometheus scrape endpoint (text/plain) |
| GET | `/metrics/json` | Public | — | JSON metrics for dashboards |

---

## System

Controller: `AppController` | Tag: `System` | Base: `/`

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/` | Public | — | Get system info |
| GET | `/version` | Public | — | Get API version |

---

## Common Query Parameters

The following query parameters are used across multiple endpoints:

### Pagination

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |

### Tenant Isolation

| Parameter | Type | Description |
|-----------|------|-------------|
| `tenantId` | UUID | Filter by tenant (super_admin only; other roles auto-filter) |

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful deletion) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 503 | Service Unavailable (health check failure) |

---

## WebSocket Events

The system also exposes real-time events via Socket.IO at the `/` gateway path.

### Event Namespaces

- `agent.*` — Agent lifecycle events
- `task.*` — Task state changes
- `mission.*` — Mission progress updates
- `swarm.*` — Swarm execution events
- `orchestration.*` — Orchestration notifications
