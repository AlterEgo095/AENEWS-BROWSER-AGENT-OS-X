# AENEWS Agent OS X

**Multi-Phase Intelligent Agent System Built with NestJS 11 & Next.js 16**

> Enterprise autonomous agent platform featuring 14 clusters, 100+ specialized agents, LLM-powered intelligence, self-healing, self-evolution, and a complete Software Factory with real connector infrastructure.

---

## Project Status

| Aspect | Status |
|--------|--------|
| **Backend** | ✅ Active — NestJS 11, TypeScript 5 strict, PostgreSQL 16 |
| **Frontend** | ✅ Active — Next.js 16, React 19, Tailwind CSS 4, Zustand |
| **Security** | ✅ Hardened — JWT auth, RBAC, tenant isolation, encryption at rest |
| **Performance** | ✅ Optimized — Response caching, connection pooling, slow query logging |
| **Testing** | ✅ 11 E2E test suites covering all phases |
| **API Docs** | ✅ Swagger UI + [API Reference](backend/docs/API.md) |
| **Security Docs** | ✅ [THREAT_MODEL.md](THREAT_MODEL.md) | [SECURITY.md](SECURITY.md) |

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Infrastructure Stack](#infrastructure-stack)
- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Development Commands](#development-commands)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Security Documentation](#security-documentation)
- [Security Hardening](#security-hardening)
- [Current Limitations](#current-limitations)
- [Phase Roadmap](#phase-roadmap)
- [Testing](#testing)
- [License](#license)

---

## Architecture Overview

AENEWS Agent OS X is a **monorepo** consisting of:

- **Single NestJS 11 Backend** (`backend/`) — All API routes, business logic, agent clusters, and real-time WebSocket events
- **Next.js 16 Frontend** (`frontend/`) — Dashboard and management UI with React 19, Tailwind CSS 4, and Zustand state management

The backend is built as a layered multi-agent system with three primary planes: **Agent Clusters**, the **Agent Framework**, and the **Software Factory** — all backed by a shared infrastructure layer.

```
┌──────────────────────────────────────────────────┐
│                Next.js 16 Frontend               │
│   Dashboard │ Agents │ Tasks │ Missions │ Swarm   │
└────────────────────┬─────────────────────────────┘
                     │ REST + WebSocket
┌────────────────────▼─────────────────────────────┐
│                NestJS 11 Backend                  │
│  ┌─────────────────────────────────────────────┐ │
│  │ 14 Agent Clusters (100+ agents)             │ │
│  │  Agent Framework │ Software Factory          │ │
│  │  Security │ Performance │ Observability       │ │
│  └─────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────┐ │
│  │ PostgreSQL │ Redis │ Neo4j │ Qdrant │ MinIO │ │
│  │ RabbitMQ   │ Bull Queues │ OpenTelemetry     │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Cluster Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AENEWS Agent OS X                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─── 14 Agent Clusters ────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │  │
│  │  │ Browser  │ │ Computer │ │  Coding  │ │     Office     │  │  │
│  │  │ 17 agents│ │ 7 agents │ │ 8 agents │ │   6 agents     │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────┐ ┌──────────┐  │  │
│  │  │Marketing │ │ Business │ │ Infrastructure │ │ Security │  │  │
│  │  │ 8 agents │ │ 8 agents │ │   8 agents     │ │ 6 agents │  │  │
│  │  └──────────┘ └──────────┘ └────────────────┘ └──────────┘  │  │
│  │  ┌────────────────┐ ┌──────────────┐ ┌──────────────────┐   │  │
│  │  │     Meta       │ │    LLM       │ │  Intelligent     │   │  │
│  │  │ Intelligence   │ │ Intelligence │ │  Orchestration   │   │  │
│  │  │  13 agents     │ │  6 agents    │ │   4 agents       │   │  │
│  │  └────────────────┘ └──────────────┘ └──────────────────┘   │  │
│  │  ┌────────────┐ ┌──────────────┐ ┌──────────────────┐      │  │
│  │  │  Watchdog  │ │Self-Evolution│ │  Certification   │      │  │
│  │  │ 3 agents   │ │  5 agents    │ │   13 agents      │      │  │
│  │  └────────────┘ └──────────────┘ └──────────────────┘      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── Agent Framework ──────────────────────────────────────────┐  │
│  │  Memory (5-tier + RAG) │ Events (3-channel bus + replay)    │  │
│  │  Orchestrator (7-step) │ Communication (inter-agent + MQ)   │  │
│  │  Health & Metrics      │ Bridge (Agent → Connector)         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── Software Factory ─────────────────────────────────────────┐  │
│  │  Mission Runtime Engine  │  6 Connector Packs (64 caps)      │  │
│  │  Execution Teams         │  Quality Gate + Auto-Repair       │  │
│  │  MSR Tracking (70–95%)   │  100 Reference Missions           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─── Infrastructure ───────────────────────────────────────────┐  │
│  │  PostgreSQL 16 │ Redis 7 │ Neo4j 5 │ Qdrant │ MinIO         │  │
│  │  RabbitMQ 3    │ Bull Queues (3)    │ Docker Compose         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 14 Agent Clusters

| # | Cluster | Agents | Description |
|---|---------|--------|-------------|
| 1 | **Browser** | 17 | Web automation, scraping, testing, captcha, sessions |
| 2 | **Computer** | 7 | System operations, file management, terminal |
| 3 | **Coding** | 8 | Code generation, review, deployment, debugging |
| 4 | **Office** | 6 | Document processing, email, calendar |
| 5 | **Marketing** | 8 | Content creation, SEO, ads, analytics |
| 6 | **Business** | 8 | Strategy, finance, CRM, HR |
| 7 | **Infrastructure** | 8 | DevOps, monitoring, scaling, CI/CD |
| 8 | **Security** | 6 | Threat detection, compliance, forensics |
| 9 | **Meta Intelligence** | 13 | Orchestration, learning, reasoning, self-healing |
| 10 | **LLM Intelligence** | 6 | LLM-powered planner, critic, judge, decomposer, repair, validator |
| 11 | **Intelligent Orchestration** | 4 | Mission orchestrator AI, dynamic scheduler, resource negotiator, priority arbiter |
| 12 | **Watchdog / Self-Healing** | 3 | Error analyzer, auto-fixer, circuit breaker manager |
| 13 | **Self-Evolution** | 5 | Metric analyzer, weakness detector, refactor proposer, patch generator, auto-certifier |
| 14 | **Certification** | 13 | Architecture, security, performance, memory, plugin, browser, orchestrator, documentation, test, regression, compliance, observability, AI quality auditors |

### 10 Governance Principles

1. **Plugin First** — Extensible via plugins, not forks
2. **Event Driven** — All communication through events
3. **Cloud Native** — Containerized, Kubernetes-ready
4. **Multi Tenant** — Strict tenant isolation
5. **Zero Trust** — Never trust, always verify
6. **Security By Design** — Security at every layer
7. **AI Native** — LLM intelligence built in
8. **Agent Native** — Agent-first architecture
9. **Memory Native** — Persistent memory across sessions
10. **API First** — Everything is an API

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|--------|
| NestJS | 11 | Core application framework |
| TypeScript | 5 (strict) | Type-safe development |
| TypeORM | 1.0 | PostgreSQL ORM & migrations |
| PostgreSQL | 16 | Relational data, entities, audit |
| Redis | 7 | Caching, job queues, sessions |
| Neo4j | 5 | Knowledge graph, agent relationships |
| Qdrant | v1.7 | Vector similarity search, RAG |
| MinIO | S3-compatible | Object storage (artifacts, logs, uploads) |
| RabbitMQ | 3.12 | Inter-agent messaging, event broker |
| Bull | 3 queues | Task, event, mission job processing |
| OpenAI SDK | 6.x | LLM integration (GPT-4, GPT-4o) |
| Anthropic SDK | 0.104+ | LLM integration (Claude) |
| Playwright | 1.60 | Browser automation & testing |
| Passport.js | JWT strategy | Authentication |
| Swagger | @nestjs/swagger | API documentation |
| OpenTelemetry | SDK + exporters | Tracing, metrics, Prometheus |
| Sentry | @sentry/node | Error tracking & alerting |
| Helmet | 8.x | HTTP security headers |

### Frontend

| Technology | Version | Purpose |
|-----------|---------|--------|
| Next.js | 16 | React framework (App Router) |
| React | 19 | UI library |
| Tailwind CSS | 4 | Utility-first styling |
| Zustand | 5 | Client state management |
| TanStack Query | 5 | Server state management |
| shadcn/ui | New York | Component library |
| Socket.IO | 4.x | Real-time WebSocket events |

### Infrastructure

| Technology | Purpose |
|-----------|--------|
| Docker Compose | Local dev & production orchestration |
| Nginx | Reverse proxy, SSL termination |
| Prometheus + Grafana | Monitoring dashboards |
| Loki + Promtail | Log aggregation |
| Alertmanager | Alert routing & notifications |

---

## Quick Start

### Prerequisites

- **Node.js** 20+
- **Docker** & Docker Compose v2
- **npm** 10+ (or bun)

### 1. Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, Neo4j, Qdrant, RabbitMQ, MinIO
cd docker
docker-compose up -d

# Verify all services are healthy
docker-compose ps
```

Service ports (default):

| Service | Port | URL |
|---------|------|-----|
| PostgreSQL | 5432 | `localhost:5432` |
| Redis | 6379 | `localhost:6379` |
| Neo4j HTTP | 7474 | `http://localhost:7474` |
| Neo4j Bolt | 7687 | `bolt://localhost:7687` |
| Qdrant REST | 6333 | `http://localhost:6333` |
| Qdrant gRPC | 6334 | `localhost:6334` |
| RabbitMQ AMQP | 5672 | `localhost:5672` |
| RabbitMQ Management | 15672 | `http://localhost:15672` |
| MinIO API | 9000 | `http://localhost:9000` |
| MinIO Console | 9001 | `http://localhost:9001` |

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set **all [REQUIRED] variables** — especially:

```bash
DB_PASSWORD=<your-postgres-password>
NEO4J_PASSWORD=<your-neo4j-password>
RABBITMQ_PASSWORD=<your-rabbitmq-password>
MINIO_ACCESS_KEY=<your-minio-access-key>
MINIO_SECRET_KEY=<your-minio-secret-key>
JWT_SECRET=<generate-a-64-byte-hex-string>
ENCRYPTION_KEY=<generate-a-32-char-string>
```

> **Tip:** Generate secrets with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # JWT_SECRET
> node -e "console.log(require('crypto').randomBytes(32).toString('hex').slice(0,32))"  # ENCRYPTION_KEY
> ```

### 3. Install Dependencies & Start

```bash
cd backend
npm install
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`.

### 4. (Optional) Initialize MinIO Buckets

```bash
cd docker
chmod +x init-minio.sh
./init-minio.sh
```

This creates the required buckets: `agent-artifacts`, `agent-logs`, `agent-models`, `agent-configs`, `tenant-uploads`, `task-results`, `event-archives`, `plugin-assets`.

---

## Environment Setup

All environment variables are defined in `backend/.env.example`. Copy it to `backend/.env` and customize:

```bash
cp backend/.env.example backend/.env
```

### Required Variables

These variables **must** be set — the application validates them on startup and will fail if missing:

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_PASSWORD` | PostgreSQL password | `your-strong-password` |
| `NEO4J_PASSWORD` | Neo4j password | `your-neo4j-password` |
| `RABBITMQ_PASSWORD` | RabbitMQ password | `your-rabbitmq-password` |
| `MINIO_ACCESS_KEY` | MinIO access key | `aenews_minio` |
| `MINIO_SECRET_KEY` | MinIO secret key | `your-minio-secret` |
| `JWT_SECRET` | JWT signing secret (random) | `a1b2c3...` (64-byte hex) |
| `ENCRYPTION_KEY` | AES-256 key (exactly 32 chars) | `abcdef1234567890abcdef1234567890` |

> **Security Warning:** The application will **refuse to start** in production if `JWT_SECRET` or `ENCRYPTION_KEY` are not set. There are no default secrets. See [SECURITY.md](./SECURITY.md) for details.

---

## Development Commands

### Backend (NestJS)

```bash
cd backend

# Install dependencies
npm install

# Start in development mode (watch)
npm run start:dev

# Start in debug mode
npm run start:debug

# Build for production
npm run build

# Start production build
npm run start:prod

# Lint code
npm run lint

# Format code
npm run format
```

### Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production build
npm run start
```

### Docker

```bash
cd docker

# Start all infrastructure services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (full reset)
docker-compose down -v

# Start production stack
docker-compose -f docker-compose.prod.yml up -d
```

---

## Project Structure

```
aenews-agent-os-x/
├── backend/                          # NestJS backend (main application)
│   ├── src/
│   │   ├── config/                   # Configuration & env validation (Joi)
│   │   ├── common/                   # Shared: filters, guards, interceptors, DTOs
│   │   ├── modules/                  # Core feature modules
│   │   │   ├── health/               # Health checks (Terminus)
│   │   │   ├── auth/                 # JWT auth (passport-jwt)
│   │   │   ├── user/                 # User CRUD
│   │   │   ├── tenant/               # Multi-tenant management
│   │   │   ├── agent/                # Agent CRUD, registry, lifecycle
│   │   │   ├── task/                 # Task management
│   │   │   ├── event/                # 3-channel event bus
│   │   │   ├── plugin/               # Plugin system
│   │   │   ├── redis/                # Redis service
│   │   │   ├── neo4j/                # Neo4j graph DB service
│   │   │   ├── qdrant/               # Vector search service
│   │   │   ├── minio/                # Object storage service
│   │   │   ├── rabbitmq/             # Message broker service
│   │   │   ├── agent-framework/      # Unified framework bridge
│   │   │   ├── software-factory/     # Mission runtime engine
│   │   │   ├── security/             # Security hardening (Phase 12)
│   │   │   ├── security-monitoring/  # Threat intel, Sentry, metrics
│   │   │   └── performance/          # Profiling, caching, pools (Phase 13)
│   │   └── clusters/                 # 14 agent clusters
│   │       ├── browser/              # 17 agents
│   │       ├── computer/             # 7 agents
│   │       ├── coding/               # 8 agents
│   │       ├── office/               # 6 agents
│   │       ├── marketing/            # 8 agents
│   │       ├── business/             # 8 agents
│   │       ├── infrastructure/       # 8 agents
│   │       ├── security/             # 6 agents
│   │       ├── meta-intelligence/    # 13 agents
│   │       ├── llm-intelligence/     # 6 agents
│   │       ├── intelligent-orchestration/ # 4 agents
│   │       ├── watchdog/             # 3 agents
│   │       ├── self-evolution/       # 5 agents
│   │       └── certification/        # 13 agents
│   ├── test/                         # E2E and unit tests
│   ├── .env.example                  # Environment variable template
│   └── package.json
│
├── frontend/                         # Next.js 16 frontend
│   └── src/
│       ├── app/                      # Pages: Dashboard, Agents, Tasks, Events, Login
│       ├── components/               # UI components (AppShell, Sidebar, Header)
│       ├── lib/                      # API client, types, utils
│       └── store/                    # Zustand auth store
│
├── docker/                           # Infrastructure
│   ├── docker-compose.yml            # Dev: PostgreSQL, Redis, Neo4j, Qdrant, RabbitMQ, MinIO
│   ├── docker-compose.prod.yml       # Production stack with resource limits
│   ├── docker-compose.monitoring.yml # Prometheus, Grafana, Loki, Alertmanager
│   ├── Dockerfile                    # Multi-stage build
│   ├── init-db.sql                   # Full DB schema (8 tables, 14 cluster types, indexes)
│   └── init-minio.sh                 # MinIO bucket initialization
│
├── .env.example                      # Root-level env template
├── SECURITY.md                       # Security architecture and policies
├── DEPLOY.md                         # Deployment runbook
├── README.md                         # This file
└── worklog.md                        # Development work log
```

---

## API Documentation

### Interactive Docs (Swagger UI)

Once the backend is running, access the interactive Swagger documentation:

```
http://localhost:3000/docs
```

### Full API Reference

See [backend/docs/API.md](backend/docs/API.md) for a comprehensive endpoint reference organized by module:

- **Auth** — Register, login, refresh, logout, logout-all
- **Agents** — CRUD, execute, stats, executions, by cluster
- **Tasks** — CRUD, cancel, by status
- **Missions** — CRUD, lifecycle (start/pause/resume), progress, contracts
- **Events** — Emit, list, by namespace/type/severity
- **Orchestration** — Collaborate, decompose, coordinate, connectors, statistics
- **Intelligence** — Knowledge graph, learning engine, pattern mining, adaptive strategy, experience replay, feedback
- **Swarm** — Create/execute/terminate, consensus, persistence, working memory, feedback loop, topology, DAG
- **Security** — Scan prompt, validate URL, encrypt/decrypt, generate API key, audit logs, IP control, lockout, CORS
- **Performance** — Overview, profiling, memory, pools, slow queries, cache, compression
- **Health** — Health, ready, live probes
- **Connectors** — List, health check, execute actions
- **Plugins** — CRUD, enable/disable, loaded plugins
- **Tenants** — CRUD, activate/deactivate, quotas
- **Users** — CRUD, password update, activate/deactivate
- **Metrics** — Prometheus scrape, JSON metrics

### Core API Endpoints (Quick Reference)

All endpoints are prefixed with `/api/v1/`. Authentication is required unless marked `@Public()`.

| Path | Controller | Auth | Description |
|------|-----------|------|-------------|
| `/api/v1/auth/*` | AuthController | Public (register/login/refresh) | User registration, login, token refresh |
| `/api/v1/agents/*` | AgentController | JWT + Roles | Agent CRUD, execution, stats |
| `/api/v1/orchestration/*` | OrchestrationController | JWT + Roles + RateLimit | Multi-agent collaboration, decomposition, coordination |
| `/api/v1/intelligence/*` | IntelligenceController | JWT + Roles + RateLimit | Knowledge graph, learning, patterns, adaptive strategy |
| `/api/v1/swarm/*` | SwarmController | JWT + Roles + RateLimit | Swarm intelligence, consensus, working memory, topology |
| `/api/v1/performance/*` | PerformanceController | JWT + SUPER_ADMIN only | Profiling, slow queries, cache, pool monitoring |
| `/api/v1/health` | HealthController | Public | Service health checks |
| `/api/v1/missions/*` | SoftwareFactoryController | JWT + Roles | Mission lifecycle, contracts |
| `/api/v1/connectors/*` | ConnectorController | JWT + Roles | Connector list, execute actions |
| `/api/v1/security/*` | SecurityController | JWT + Roles | Security scanning, encryption, audit |
| `/api/v1/plugins/*` | PluginController | JWT + Roles | Plugin management |
| `/api/v1/tenants/*` | TenantController | JWT + SUPER_ADMIN | Multi-tenant management |
| `/api/v1/users/*` | UserController | JWT + Roles | User management |
| `/api/v1/metrics` | MetricsController | Public | Prometheus metrics scrape |

---

## Security Documentation

| Document | Description |
|----------|-------------|
| [THREAT_MODEL.md](./THREAT_MODEL.md) | Threat model, attack vectors, and mitigations |
| [SECURITY.md](./SECURITY.md) | Security architecture, policies, and hardening details |
| [backend/docs/API.md](backend/docs/API.md) | API endpoint security (auth requirements, roles per endpoint) |

---

## Security Hardening

The application implements comprehensive security measures across all layers. Auth guards are applied **globally** — every endpoint requires JWT authentication unless explicitly marked with `@Public()`.

### Authentication

- **JWT + Passport** — All API endpoints require a valid JWT token
- **Global Guards** — `JwtAuthGuard`, `RolesGuard`, `TenantGuard`, and `ThrottlerGuard` are registered as `APP_GUARD` and apply to every controller automatically
- **@Public() Decorator** — Only `auth/register`, `auth/login`, and `auth/refresh` are publicly accessible
- **Refresh Token Rotation** — Refresh tokens are single-use and rotated on each use; reuse detection invalidates the entire token family
- **Account Lockout** — Progressive lockout after 5 failed login attempts with exponential backoff

### Authorization

- **Role-Based Access Control** — 4 roles: `super_admin`, `tenant_admin`, `operator`, `viewer`
- **Tenant Isolation** — `TenantGuard` ensures users can only access data within their tenant
- **No Mass Assignment** — `RegisterDto` does not accept a `role` field; `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` strips extra properties

### Input Validation

- **Global ValidationPipe** — Strict DTO validation with `whitelist` and `forbidNonWhitelisted`
- **UUID Validation** — `ParseUUIDPipe` on all `:id` route parameters rejects non-UUID values
- **Cypher Injection Prevention** — `IntelligenceController.executeGraphQuery()` validates queries against a dangerous-operation allowlist (only `MATCH`, `RETURN`, `WHERE`, `ORDER BY`, `LIMIT` allowed)
- **Path Traversal** — UUID validation on route parameters inherently blocks `../` traversal

### HTTP Security

- **Helmet** — CSP, HSTS (2-year max-age), XSS filter, no-sniff, frame deny, referrer policy
- **CORS** — Explicit origin validation with configurable allowlist and subdomain pattern matching
- **Rate Limiting** — Global throttler (100 req/min per IP) plus per-endpoint rate limiting via `@RateLimit()`
- **IP Access Control** — CIDR-based allowlists for admin and metrics endpoints
- **Request Size Limit** — 10MB max body size

### Monitoring & Threat Detection

- **Security Metrics** — Real-time tracking of auth failures, blocked requests, threat detections, risk scores
- **Threat Intelligence** — IP reputation scoring with auto-blocking at threshold (score ≥ 80)
- **Brute Force Detection** — Automatic flagging after 10 auth failures from a single IP
- **Correlation IDs** — Every request gets a unique correlation ID for audit tracing
- **Audit Logging** — Batched audit log persistence with 90-day retention

For the complete security architecture, see [SECURITY.md](./SECURITY.md).

---

## Current Limitations

The following limitations are acknowledged and represent areas requiring external dependencies or further development:

### External Service Dependencies

- **Computer Cluster Agents** — Terminal, File System, Process Manager, and Screen Capture agents require **OS-level access** to the host machine. In Docker deployments, these agents operate in simulation mode unless the Docker socket and host filesystem are explicitly mounted.
- **Browser Cluster Agents** — Real browser automation requires **Playwright** with browser binaries installed. The system falls back to simulation mode when Playwright is unavailable.
- **LLM Intelligence** — All LLM-powered agents require an **OpenAI or Anthropic API key**. Without valid API keys, LLM-dependent features (planner, critic, judge, etc.) operate in simulation mode.
- **Neo4j Knowledge Graph** — The intelligence endpoints require a running **Neo4j instance**. Without Neo4j, knowledge graph queries return empty results.
- **Qdrant Vector Search** — Vector similarity search and RAG pipelines require **Qdrant**. Without Qdrant, the memory service returns empty search results.

### Feature Maturity

- **Self-Evolution Cluster** — The auto-certifier and patch generator agents are in **beta**. They propose changes but do not auto-apply them to production code without explicit human approval.
- **Swarm Intelligence** — Emergent behavior detection is **experimental** and may produce false positives under high concurrency.
- **Software Factory MSR** — Mission Success Rate tracking is based on simulation runs. Real-world MSR will vary based on LLM quality and connector reliability.
- **Multi-Tenant Isolation** — Tenant isolation is enforced at the application level. Database-level row security is planned but not yet implemented.

### Scaling

- **Single-Instance Backend** — The current deployment model runs the NestJS backend as a single instance. Horizontal scaling requires session affinity or shared session storage.
- **No Database Sharding** — All tenants share the same PostgreSQL database. Sharding for large multi-tenant deployments is not yet supported.

---

## Phase Roadmap

### Phase 0 — Foundation

Project scaffold, NestJS configuration, Docker Compose infrastructure, env validation, DB schema (8 tables, 3 schemas: `agent`, `tenant`, `audit`), health checks.

### Phase 1 — Core & Clusters

Core feature modules (auth, user, tenant, agent, task, event, plugin), 9 original agent clusters (browser, computer, coding, office, marketing, business, infrastructure, security, meta-intelligence), Agent Framework bridge connecting 80+ agents to real connectors, Software Factory with mission runtime engine.

### Phase 2 — Intelligence

5 new intelligence clusters (LLM Intelligence, Intelligent Orchestration, Watchdog, Self-Evolution, Certification), 13 LLM-powered agents, upgraded orchestrator services with AI-driven scheduling.

### Phase 3 — Integration

Cross-module bridge unification, WebSocket gateway for real-time events, Bull queue processors (task, event, mission), full end-to-end pipeline.

### Phase 4 — Unification

All 14 clusters imported into app module, 5 new `ClusterType` enum values, framework bridge connecting NestJS clusters to BaseAgentService agents, `.env.example`, README update, production readiness.

### Phase 12 — Security Hardening

Account lockout with progressive delays, refresh token rotation with family-based reuse detection, CORS security middleware with dynamic origin management, IP access control with CIDR matching, security metrics and threat intelligence, correlation ID middleware, Sentry integration, security audit persistence.

### Phase 13 — Performance Optimization

Slow query logger, response caching (Redis + LRU), gzip compression, connection pool monitoring, performance profiling with span tracking, cursor-based pagination.

### Completed Milestones

| Milestone | Status |
|-----------|--------|
| Runtime Stable: Pipeline executes real missions end-to-end | ✅ |
| Metrics, MSR tracking, Batch Runner, 100 Reference Missions | ✅ |
| Real Connectors: 64 capabilities → real tools (LLM, Playwright, Shell, Git, Docker) | ✅ |
| BrowserPool, LLMHelper caching, parallel execution | ✅ |
| Pipeline Unification + Quality Gate (auto-repair, auto-recovery) | ✅ |
| Agent→Connector Bridge: 80+ agents connected to real connectors | ✅ |
| 13 new LLM-powered agents + 5 orchestrator services upgraded | ✅ |
| Cross-module bridge, WebSocket gateway, Bull queue processors | ✅ |
| All 14 clusters imported, framework bridge, production config | ✅ |
| Security hardening: auth guards on all endpoints, Cypher injection prevention, UUID validation, mass assignment prevention | ✅ |
| Performance optimization: caching, compression, pool monitoring, profiling | ✅ |

---

## Testing

```bash
cd backend

# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run with coverage report
npm run test:cov
```

### Test Suites

| Test File | Scope |
|-----------|-------|
| `backend/test/app.e2e-spec.ts` | Application bootstrap, module creation, agent registry |
| `backend/test/agent-framework.e2e-spec.ts` | Memory, event bus, communication, health, bridge services |
| `backend/test/agent-registry.e2e-spec.ts` | Agent registration and lookup |
| `backend/test/agent-clusters.e2e-spec.ts` | Cluster module integration |
| `backend/test/mission-pipeline.e2e-spec.ts` | End-to-end mission execution |
| `backend/test/phase8-orchestration.e2e-spec.ts` | Orchestration services and controller |
| `backend/test/phase10-swarm-intelligence.e2e-spec.ts` | Swarm intelligence services |
| `backend/test/phase12-security-hardening.e2e-spec.ts` | Account lockout, refresh tokens, CORS, IP access, threat intel |
| `backend/test/phase13-performance-optimization.e2e-spec.ts` | Caching, compression, pool monitoring, profiling |
| `backend/test/security-remediation.e2e-spec.ts` | Auth enforcement, Cypher injection, path traversal, mass assignment, UUID validation, role restrictions |
| `backend/test/api-integrity.e2e-spec.ts` | API routing correctness, double-prefix prevention, full workflow tests |

---

## License

Proprietary — All rights reserved.
