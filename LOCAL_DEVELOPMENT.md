# AENEWS Agent OS X — Local Development Guide

This guide walks you through setting up and running the AENEWS Agent OS X platform
on your local machine for development and testing.

---

## Prerequisites

| Tool         | Version     | Installation                                          |
|--------------|-------------|-------------------------------------------------------|
| Node.js      | ≥ 20.x     | https://nodejs.org/ or `nvm install 20`              |
| Bun          | ≥ 1.x      | https://bun.sh/                                       |
| Docker       | ≥ 24.x     | https://docs.docker.com/get-docker/                   |
| Docker Compose | ≥ 2.20   | Included with Docker Desktop                          |
| Git          | ≥ 2.40      | https://git-scm.com/                                  |

### Optional (for production-like testing)

| Tool         | Purpose     |
|--------------|-------------|
| OpenSSL      | Generating self-signed SSL certificates for nginx    |
| k6           | Load testing the API                                 |

---

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/aenews-agent-os-x.git
cd aenews-agent-os-x
```

### 2. Configure Environment Variables

```bash
# Copy the root-level environment template
cp .env.example .env

# Copy the backend environment template
cp backend/.env.example backend/.env
```

Edit both `.env` files and fill in the required values:

| Variable              | Description                                      | Required |
|-----------------------|--------------------------------------------------|----------|
| `POSTGRES_PASSWORD`   | PostgreSQL password                              | Yes      |
| `REDIS_PASSWORD`      | Redis password                                   | Yes      |
| `NEO4J_PASSWORD`      | Neo4j password                                   | Yes      |
| `RABBITMQ_PASSWORD`   | RabbitMQ password                                | Yes      |
| `MINIO_ACCESS_KEY`    | MinIO access key                                 | Yes      |
| `MINIO_SECRET_KEY`    | MinIO secret key                                 | Yes      |
| `JWT_SECRET`          | JWT signing secret (64-byte hex)                 | Yes      |
| `ENCRYPTION_KEY`      | AES-256 key (32 chars)                           | Yes      |
| `OPENAI_API_KEY`      | OpenAI API key for LLM features                  | No*      |
| `ANTHROPIC_API_KEY`   | Anthropic API key for fallback LLM               | No*      |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password                       | Yes†     |

*\* At least one LLM API key is required for agent execution features.*
*† Required only when running the monitoring stack.*

#### Quick Secret Generation

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ENCRYPTION_KEY (must be exactly 32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex').slice(0,32))"

# Simple passwords for local dev
openssl rand -base64 32
```

#### Environment Variable Reference

Key configuration sections:

- **Application**: `APP_ENV`, `APP_PORT`, `API_PREFIX`
- **CORS**: `CORS_ORIGINS` — comma-separated allowed origins (localhost auto-allowed in dev)
- **Rate Limiting**: `RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_MS`
- **LLM Cache**: `LLM_CACHE_TTL_MS` (default 300000 = 5min), `LLM_CACHE_MAX_SIZE` (default 1000)
- **Dead Host Cooldown**: `DEAD_HOST_COOLDOWN_MS` (default 20000 = 20s)
- **Performance**: `PERF_*` variables for compression, caching, profiling, pool monitoring

### 3. Start Infrastructure Services

```bash
# Start all infrastructure (PostgreSQL, Redis, RabbitMQ, Neo4j, Qdrant, MinIO)
docker compose up -d

# Verify all services are healthy
docker compose ps
```

All services should show `healthy` status. If not, check logs:

```bash
docker compose logs <service-name>
```

### 4. Install Backend Dependencies

```bash
cd backend
bun install
```

### 5. Initialize the Database

```bash
# Auto-sync entities (development only — use migrations in production)
# Ensure DB_SYNCHRONIZE=true in your .env for first run
bun run start:dev
```

The application will automatically create all tables on first startup when
`DB_SYNCHRONIZE=true`. For production, set `DB_SYNCHRONIZE=false` and run
migrations:

```bash
bun run migration:run
```

### 6. Start the Backend

```bash
# Development mode with hot-reload
cd backend
bun run start:dev

# Or with watch mode
bun run start:dev --watch
```

The API will be available at `http://localhost:3000/api/v1`.

Swagger documentation: `http://localhost:3000/docs`

### 7. (Optional) Start the Monitoring Stack

```bash
# Start Prometheus, Grafana, Loki, Jaeger, Alertmanager
cd docker
docker compose -f docker-compose.monitoring.yml up -d
```

| Service       | URL                              |
|---------------|----------------------------------|
| Grafana       | http://localhost:3002            |
| Prometheus    | http://localhost:9090            |
| Jaeger UI     | http://localhost:16686           |
| Alertmanager  | http://localhost:9093            |
| Loki          | http://localhost:3100            |

---

## Running Tests

### Unit Tests

```bash
cd backend
bun run test
```

### End-to-End Tests

```bash
cd backend
bun run test:e2e
```

### Test Coverage

```bash
cd backend
bun run test:cov
```

---

## Common Development Tasks

### Database Migrations

```bash
# Generate a migration from entity changes
bun run migration:generate -n MigrationName

# Run pending migrations
bun run migration:run

# Revert the last migration
bun run migration:revert
```

### Docker Compose Commands

```bash
# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes all data)
docker compose down -v

# View logs for a specific service
docker compose logs -f postgres

# Restart a single service
docker compose restart redis
```

### Monitoring Stack Commands

```bash
# Start monitoring
docker compose -f docker/docker-compose.monitoring.yml up -d

# Stop monitoring
docker compose -f docker/docker-compose.monitoring.yml down

# View Prometheus targets
open http://localhost:9090/targets
```

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│   Nginx      │────▶│   Backend API    │
│  (Next.js)   │     │  (Reverse    │     │   (NestJS)       │
│              │     │   Proxy)     │     │                  │
└──────────────┘     └──────────────┘     └────────┬─────────┘
                                                   │
                      ┌────────────────────────────┼──────────────────┐
                      │                            │                  │
               ┌──────▼──────┐  ┌──────────┐  ┌───▼────┐  ┌────────┐
               │ PostgreSQL  │  │  Redis   │  │ Neo4j  │  │ Qdrant │
               │  (Primary   │  │ (Cache + │  │ (Graph │  │(Vector)│
               │    DB)      │  │  Queue)  │  │   DB)  │  │        │
               └─────────────┘  └──────────┘  └────────┘  └────────┘
                                                   │
                      ┌────────────────────────────┼────────────┐
                      │                            │            │
               ┌──────▼──────┐  ┌──────────┐  ┌───▼────┐
               │  RabbitMQ   │  │  MinIO   │  │Monitoring│
               │  (Message   │  │ (Object  │  │  Stack   │
               │   Broker)   │  │ Storage) │  │(Prom+Graf│
               └─────────────┘  └──────────┘  └──────────┘
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find the process using a port
lsof -i :3000
kill -9 <PID>
```

### Database Connection Refused

1. Ensure PostgreSQL is running: `docker compose ps postgres`
2. Check the health status: `docker compose logs postgres`
3. Verify `DB_HOST`, `DB_PORT`, `DB_PASSWORD` in `.env`

### Redis Connection Issues

1. Ensure Redis is running: `docker compose ps redis`
2. If using a password, verify `REDIS_PASSWORD` matches
3. Test connection: `docker compose exec redis redis-cli -a <password> ping`

### LLM Provider Errors

1. Verify at least one API key is set (`OPENAI_API_KEY` or `ANTHROPIC_API_KEY`)
2. Check the circuit breaker state: `GET /api/v1/llm/providers`
3. If providers are in cooldown, wait for `DEAD_HOST_COOLDOWN_MS` (default: 20s)

### Docker Compose Validation

```bash
docker compose config
```

This will validate and display the resolved compose configuration.
