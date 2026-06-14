# AENEWS Agent OS X

**Enterprise Autonomous Agent Platform — 14 Clusters, 100+ Agents, LLM-Powered**

## Overview

AENEWS Agent OS X is an enterprise-grade autonomous agent platform built with a microservices architecture. It features **14 clusters with 100+ specialized agents**, LLM-powered intelligence, self-healing, self-evolution, and a complete Software Factory with real connector infrastructure.

## Architecture

### Tech Stack
| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 11 + TypeScript (strict) |
| **Frontend** | Next.js 16 + React 19 + Tailwind CSS 4 + Zustand |
| **Databases** | PostgreSQL 16 (TypeORM), Redis 7 (BullMQ/cache), Neo4j 5 (knowledge graph), Qdrant (vector search) |
| **Messaging** | RabbitMQ 3 + Bull queues (3 queues) |
| **Storage** | MinIO (S3-compatible object storage) |
| **AI/LLM** | z-ai-web-dev-sdk (LLM integration), Playwright (browser automation) |
| **Infrastructure** | Docker Compose, Kubernetes-ready |
| **Observability** | OpenTelemetry, Winston logging, health checks |

### 14 Clusters (100+ Agents)

| Cluster | Agents | Description |
|---------|--------|-------------|
| Browser | 17 | Web automation, scraping, testing, captcha, sessions |
| Computer | 7 | System operations, file management, terminal |
| Coding | 8 | Code generation, review, deployment, debugging |
| Office | 6 | Document processing, email, calendar |
| Marketing | 8 | Content creation, SEO, ads, analytics |
| Business | 8 | Strategy, finance, CRM, HR |
| Infrastructure | 8 | DevOps, monitoring, scaling, CI/CD |
| Security | 6 | Threat detection, compliance, forensics |
| Meta Intelligence | 13 | Orchestration, learning, reasoning, self-healing |
| LLM Intelligence | 6 | LLM-powered planner, critic, judge, decomposer, repair, validator |
| Intelligent Orchestration | 4 | Mission orchestrator AI, dynamic scheduler, resource negotiator, priority arbiter |
| Watchdog / Self-Healing | 3 | Error analyzer, auto-fixer, circuit breaker manager |
| Self-Evolution | 5 | Metric analyzer, weakness detector, refactor proposer, patch generator, auto-certifier |
| Certification | 13 | Architecture, security, performance, memory, plugin, browser, orchestrator, documentation, test, regression, compliance, observability, AI quality auditors |

### Software Factory
- **64 capabilities** across 6 connector packs (Development, Browser, Certification, Delivery, Office, Business)
- **Mission Runtime Engine** — the execution motor for real mission processing
- **Mission Success Rate (MSR)** tracking with targets (70% MVP / 95% Enterprise)
- **100 reference missions** for validation
- **Quality Gate** with auto-repair and auto-recovery

### 10 Governance Principles
1. Plugin First
2. Event Driven
3. Cloud Native
4. Multi Tenant
5. Zero Trust
6. Security By Design
7. AI Native
8. Agent Native
9. Memory Native
10. API First

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm 10+

### Quick Start

```bash
# 1. Start infrastructure services
cd docker
docker-compose up -d

# 2. Install backend dependencies
cd ../backend
npm install

# 3. Configure environment
cp ../.env.example ../.env
# Edit .env with your settings

# 4. Start development server
npm run start:dev
```

### API Documentation
Once running, access Swagger docs at: `http://localhost:3000/docs`

### Software Factory API
The Software Factory exposes a comprehensive REST API at `/api/factory/`:
- `POST /api/factory/run` — Execute a mission
- `GET /api/factory/capabilities` — List all 64 capabilities
- `GET /api/factory/metrics/msr` — Mission Success Rate
- `GET /api/factory/connectors` — Connector status
- `GET /api/factory/reference-missions` — 100 validation missions

## Project Structure

```
aenews-agent-os-x/
├── backend/                     # NestJS backend (main app)
│   └── src/
│       ├── config/             # Configuration & env validation
│       ├── common/             # Shared: filters, guards, interceptors, DTOs
│       ├── modules/            # Core modules
│       │   ├── health/         # Health checks (Terminus)
│       │   ├── auth/           # JWT auth (passport-jwt)
│       │   ├── user/           # User CRUD
│       │   ├── tenant/         # Multi-tenant management
│       │   ├── agent/          # Agent CRUD, registry, lifecycle
│       │   ├── task/           # Task management
│       │   ├── event/          # 3-channel event bus
│       │   ├── plugin/         # Plugin system
│       │   ├── redis/          # Redis service
│       │   ├── neo4j/          # Neo4j graph DB service
│       │   ├── qdrant/         # Vector search service
│       │   ├── minio/          # Object storage service
│       │   ├── rabbitmq/       # Message broker service
│       │   └── agent-framework/ # Unified framework bridge (Phase 4)
│       └── clusters/           # 14 agent clusters
│           ├── browser/        # 17 agents
│           ├── computer/       # 7 agents
│           ├── coding/         # 8 agents
│           ├── office/         # 6 agents
│           ├── marketing/      # 8 agents
│           ├── business/       # 8 agents
│           ├── infrastructure/ # 8 agents
│           ├── security/       # 6 agents
│           ├── meta-intelligence/ # 13 agents
│           ├── llm-intelligence/ # 6 agents (Phase 2)
│           ├── intelligent-orchestration/ # 4 agents (Phase 2)
│           ├── watchdog/       # 3 agents (Phase 2)
│           ├── self-evolution/ # 5 agents (Phase 2)
│           └── certification/  # 13 agents (Phase 2)
├── src/                         # Extended agent framework
│   ├── agents/                 # Full agent framework (BaseAgentService pattern)
│   │   ├── base/               # BaseAgentService (lifecycle, events, memory, tools)
│   │   ├── decorators/         # @Agent, @Tool, @OnAgentEvent, @RequirePermission
│   │   ├── registry/           # Agent registry with stats/findBestAgent
│   │   ├── memory/             # 5-tier memory + RAG
│   │   ├── events/             # Event bus, store, dead-letter queue, replay
│   │   ├── communication/      # Inter-agent comms, RabbitMQ broker
│   │   ├── health/             # Agent health, metrics, circuit breaker
│   │   ├── orchestrator/       # 7-step pipeline (decompose→deliver)
│   │   ├── bridge/             # Agent→Connector bridge
│   │   ├── browser/            # 17 browser agents (extended)
│   │   ├── computer/           # 7 computer agents (extended)
│   │   ├── coding/             # 8 coding agents (extended)
│   │   ├── office/             # 6 office agents (extended)
│   │   ├── marketing/          # 8 marketing agents (extended)
│   │   ├── business/           # 8 business agents (extended)
│   │   ├── infrastructure/     # 8 infrastructure agents (extended)
│   │   ├── security/           # 5 security agents (extended)
│   │   ├── meta-intelligence/  # 10 meta-intelligence agents (extended)
│   │   ├── certification/      # 13 certification auditors
│   │   ├── llm-intelligence/   # 6 LLM-powered agents
│   │   ├── intelligent-orchestration/ # 4 intelligent orchestration agents
│   │   ├── watchdog/           # 3 watchdog/self-healing agents
│   │   └── self-evolution/     # 5 self-evolution agents
│   └── software-factory/       # Mission execution engine
│       ├── connectors/         # 6 real connectors + ConnectorRegistry
│       ├── runtime/            # Mission runtime engine, batch runner, metrics
│       ├── kernel/             # 10 permanent kernel services
│       ├── teams/              # Execution, planning, certification teams
│       └── ...                 # Worker factory, execution graph, delivery
├── frontend/                    # Next.js 16 frontend
│   └── src/
│       ├── app/                # Pages: Dashboard, Agents, Tasks, Events, Login
│       ├── components/         # UI components (AppShell, Sidebar, Header)
│       ├── lib/                # API client, types, utils
│       └── store/              # Zustand auth store
├── docker/                      # Infrastructure
│   ├── docker-compose.yml      # Dev: PostgreSQL, Redis, Neo4j, Qdrant, RabbitMQ, MinIO
│   ├── docker-compose.prod.yml # Production stack
│   ├── Dockerfile              # Multi-stage build
│   ├── init-db.sql             # Full DB schema (8 tables, 14 cluster types)
│   └── init-minio.sh           # MinIO bucket initialization
└── .env.example                # Environment template

```

## Implementation Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Project Scaffold & Foundation | ✅ Complete |
| 1 | Core Infrastructure (entities, DB) | ✅ Complete |
| 2 | Agent Core Framework | ✅ Complete |
| 3 | Event System & Messaging | ✅ Complete |
| 4 | Plugin Architecture | ✅ Complete |
| 5 | Multi-Tenancy & Auth | ✅ Complete |
| 6 | Browser Cluster | ✅ Complete |
| 7 | Computer Cluster | ✅ Complete |
| 8 | Coding Cluster | ✅ Complete |
| 9 | Office Cluster | ✅ Complete |
| 10 | Marketing Cluster | ✅ Complete |
| 11 | Business Cluster | ✅ Complete |
| 12 | Infrastructure Cluster | ✅ Complete |
| 13 | Security Cluster | ✅ Complete |
| 14 | Meta Intelligence | ✅ Complete |
| 15 | Frontend Dashboard | ✅ Complete |

### Sprint Milestones

| Sprint | Description | Status |
|--------|-------------|--------|
| Sprint 1 | Runtime Stable: Pipeline executes real missions end-to-end (MSR: 100%) | ✅ |
| Sprint 1 Phase 2 | Metrics, MSR tracking, Batch Runner, 100 Reference Missions | ✅ |
| Sprint 2 | Real Connectors: 64 capabilities → real tools (LLM, Playwright, Shell, Git, Docker) | ✅ |
| Sprint 2 Optimization | BrowserPool, LLMHelper caching, parallel execution | ✅ |
| Sprint 3 | Pipeline Unification + Quality Gate (auto-repair, auto-recovery) | ✅ |
| Phase 1 (Bridge) | Agent→Connector Bridge: 80+ agents connected to real connectors | ✅ |
| Phase 2 (Intelligence) | 13 new LLM-powered agents + 5 orchestrator services upgraded | ✅ |
| Phase 3 (Integration) | Cross-module bridge, WebSocket gateway, Bull queue processors | ✅ |
| Phase 4 (Unification) | All 14 clusters imported, 5 new ClusterTypes, framework bridge, .env, README update | ✅ |

## Testing

```bash
# Run unit tests
cd backend
npm run test

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:cov
```

## License

Proprietary - All rights reserved.
