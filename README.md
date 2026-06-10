# 🏛️ AENEWS Agent OS X

**Enterprise Autonomous Browser Agent Platform**

## Overview

AENEWS Agent OS X is an enterprise-grade autonomous browser agent platform built with a microservices architecture. It features 9 clusters with 70+ specialized agents, strict governance principles, and zero-trust security.

## Architecture

### Tech Stack
- **Backend**: NestJS + TypeScript
- **Frontend**: Next.js + React + TailwindCSS (Phase 15)
- **Databases**: PostgreSQL, Redis, Neo4j, Qdrant
- **Messaging**: RabbitMQ / BullMQ
- **Storage**: MinIO (S3-compatible)
- **Infrastructure**: Docker + Kubernetes

### 9 Clusters (70+ Agents)
| Cluster | Agents | Description |
|---------|--------|-------------|
| Browser | 17 | Web automation, scraping, testing |
| Computer | 7 | System operations, file management |
| Coding | 8 | Code generation, review, deployment |
| Office | 6 | Document processing, email, calendar |
| Marketing | 8 | Content creation, SEO, analytics |
| Business | 8 | Strategy, finance, operations |
| Infrastructure | 8 | DevOps, monitoring, scaling |
| Security | 6 | Threat detection, compliance, audit |
| Meta Intelligence | 13 | Orchestration, learning, optimization |

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
# Start infrastructure services
cd docker
docker-compose up -d

# Install backend dependencies
cd ../backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run start:dev
```

### API Documentation
Once running, access Swagger docs at: `http://localhost:3000/docs`

## Project Structure

```
aenews-agent-os-x/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── config/         # Configuration & validation
│   │   ├── common/         # Shared utilities, guards, interceptors
│   │   ├── modules/        # Core modules (health, auth, tenant, etc.)
│   │   └── clusters/       # Agent cluster implementations
│   └── test/               # E2E tests
├── docker/                  # Docker infrastructure
│   ├── docker-compose.yml  # Development stack
│   ├── docker-compose.prod.yml # Production stack
│   ├── Dockerfile          # Multi-stage build
│   └── init-db.sql         # Database initialization
├── frontend/                # Next.js frontend (Phase 15)
└── docs/                    # Documentation
```

## Implementation Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Project Scaffold & Foundation | ✅ |
| 1 | Core Infrastructure | ⏳ |
| 2 | Agent Core Framework | ⏳ |
| 3 | Event System & Messaging | ⏳ |
| 4 | Plugin Architecture | ⏳ |
| 5 | Multi-Tenancy & Auth | ⏳ |
| 6 | Browser Cluster | ⏳ |
| 7 | Computer Cluster | ⏳ |
| 8 | Coding Cluster | ⏳ |
| 9 | Office Cluster | ⏳ |
| 10 | Marketing Cluster | ⏳ |
| 11 | Business Cluster | ⏳ |
| 12 | Infrastructure Cluster | ⏳ |
| 13 | Security Cluster | ⏳ |
| 14 | Meta Intelligence | ⏳ |
| 15 | Frontend Dashboard | ⏳ |

## License

Proprietary - All rights reserved.
