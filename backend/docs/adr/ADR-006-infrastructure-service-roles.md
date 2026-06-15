# ADR-006: Infrastructure Service Roles

## Status

Accepted

## Context

The AENEWS Agent OS X project deploys six infrastructure services, each serving a specific role in the agent platform. Understanding each service's role, responsibilities, and interaction patterns is critical for architectural decisions, capacity planning, and operational troubleshooting.

The six services are:

1. **PostgreSQL** — Primary persistence
2. **Redis** — Cache + Bull queues
3. **Neo4j** — Knowledge graph
4. **Qdrant** — Vector search
5. **RabbitMQ** — Inter-agent communication
6. **MinIO** — Object storage

## Decision

### PostgreSQL — Primary Persistence

**Role**: Source of truth for all structured data.

**Stores:**
- Agent entities (identity, status, configuration)
- Execution records (results, duration, errors)
- Mission entities and contracts
- Task entities
- User and tenant entities
- Plugin entities
- Event entities
- Audit logs

**Characteristics:**
- ACID transactions for data integrity
- TypeORM integration with entity auto-loading
- Supports multi-tenancy via tenant isolation middleware
- Connection pooling via NestJS TypeORM module

**Interaction pattern:**
```
Agent → AgentService → TypeORM → PostgreSQL
Mission → MissionService → TypeORM → PostgreSQL
```

### Redis — Cache + Bull Queues

**Role**: Dual-purpose — caching layer and job queue backend.

**Cache stores:**
- Agent health status (frequently accessed)
- LLM response cache (avoid redundant API calls)
- Feature flag values (fast lookup)
- Session data (JWT blacklisting)
- Agent registry snapshot (reduce DB queries)

**Bull queues (job scheduling):**
- Mission execution queue
- Agent task dispatch queue
- Metric collection (repeatable job)
- Certification run scheduling
- Patch application with retry

**Characteristics:**
- Sub-millisecond read latency for cached data
- Bull provides retry, delay, priority, and concurrency
- Cache TTL of 300s by default (configurable)
- Shared Redis instance for both cache and queue

**Interaction pattern:**
```
Cache:  Service → CacheModule → Redis
Queue:  Producer → BullModule → Redis → Worker
```

### Neo4j — Knowledge Graph

**Role**: Graph database for relationship-heavy queries.

**Stores:**
- Agent relationship graph (which agents collaborate, depend on each other)
- Capability maps (which agents can handle which tasks)
- Cluster hierarchy (agents → clusters → super-clusters)
- Dependency graphs (service → agent → connector dependencies)
- Impact analysis (if agent X changes, what is affected?)

**Characteristics:**
- Cypher query language for graph traversal
- Optimized for relationship queries (multi-hop traversals)
- Complements PostgreSQL for relationship-heavy queries
- Optional — system works without Neo4j (degrades to flat queries)

**Interaction pattern:**
```
AgentRegistry → Neo4jService → Neo4j
Impact Analysis → Cypher Query → Neo4j
```

### Qdrant — Vector Search

**Role**: Vector similarity search for RAG and semantic operations.

**Stores:**
- Agent prompt embeddings (find similar prompts)
- Code snippet embeddings (find similar code patterns)
- Document embeddings (RAG retrieval)
- Execution result embeddings (find similar past results)
- Semantic memory (agent long-term memory vectorized)

**Characteristics:**
- High-performance vector similarity search (ANN)
- Supports filtering with vector search
- gRPC and REST API
- Optional — system works without Qdrant (degrades to keyword search)

**Interaction pattern:**
```
AgentMemory → QdrantService → Qdrant
RAG Pipeline → Embedding → Qdrant → Similarity Search
```

### RabbitMQ — Inter-Agent Communication

**Role**: Message broker for pub/sub, event streaming, and inter-agent messaging.

**Handles:**
- Agent event broadcasting (fanout exchange)
- Self-evolution loop events (topic exchange with routing keys)
- Cross-cluster notifications (direct exchange)
- Mission status streaming (to WebSocket gateway)
- Audit event streaming (to observability pipeline)
- Dead letter queue for failed messages

**Characteristics:**
- AMQP 0-9-1 protocol
- Exchanges: fanout (broadcast), topic (routing), direct (point-to-point)
- Durable queues for message persistence
- Consumer groups for load distribution
- Dead letter exchange for error handling

**Interaction pattern:**
```
Agent → AgentEventBus → RabbitMQ → Consumers
Self-Evolution → Event Exchange → Certification Auditors
```

### MinIO — Object Storage

**Role**: S3-compatible object storage for binary data and generated artifacts.

**Stores:**
- Generated documents (reports, summaries)
- Screenshots and visual artifacts
- Code patch files (unified diffs)
- Agent export/import packages
- Log archives
- Dataset files for agent training/testing

**Characteristics:**
- S3-compatible API
- Bucket-based organization
- Presigned URLs for temporary access
- Versioning support for artifact history
- Optional — system works without MinIO (artifacts stored in memory/DB)

**Interaction pattern:**
```
PatchGenerator → MinIOService → MinIO (store patch file)
Report Generator → MinIOService → MinIO (store report)
```

## Consequences

### Positive

- **Clear separation of concerns**: Each service has a well-defined role, reducing overlap.
- **Optional services**: Neo4j, Qdrant, and MinIO are optional — the system degrades gracefully when they're unavailable.
- **Scalable**: Each service can be scaled independently based on load.
- **Polyglot persistence**: Right data store for each data type (relational, graph, vector, object, cache, queue).

### Negative

- **Infrastructure complexity**: Six services must be deployed, configured, monitored, and maintained.
- **Data consistency**: No cross-service transactions — eventual consistency between services.
- **Operational cost**: Running six infrastructure services requires significant resources.
- **Learning curve**: Developers must understand the role and API of each service.

### Mitigation

- Docker Compose / Kubernetes manifests provide all six services with sensible defaults.
- Health checks in the HealthModule verify connectivity to all services.
- Each service module degrades gracefully when its backend is unavailable.
- Infrastructure monitoring dashboard tracks health, latency, and capacity for all services.
