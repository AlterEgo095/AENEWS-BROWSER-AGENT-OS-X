# ADR-003: Message Queue Architecture — Bull vs RabbitMQ

## Status

Accepted

## Context

The AENEWS Agent OS X infrastructure includes two message queuing systems:

1. **Bull** — Redis-based job queue integrated via `@nestjs/bull`. Used for task scheduling, retry logic, delayed execution, and rate limiting.
2. **RabbitMQ** — AMQP-based message broker integrated via a custom `RabbitMQModule`. Used for inter-agent communication, event fanout, and pub/sub messaging.

Having two queuing systems raises questions about overlap, complexity, and when to use each.

## Decision

We adopt a **complementary strategy** where each system serves a distinct role:

### Bull (Redis-based) — Task/Job Queues

Bull is the right choice for **point-to-point, task-oriented workloads** that require:

| Feature | Bull Support |
|---|---|
| Job scheduling (delayed, repeatable) | ✅ Native |
| Retry with exponential backoff | ✅ Native |
| Priority queues | ✅ Native |
| Concurrency control | ✅ Native |
| Job progress tracking | ✅ Native |
| Rate limiting | ✅ Native |
| Persistence (Redis-backed) | ✅ Native |

**Use cases in AENEWS:**
- Mission execution jobs (queue a mission for processing)
- Agent task dispatch (queue an agent execution)
- Scheduled metric collection (repeatable jobs)
- Certification run scheduling (delayed jobs)
- Patch application with retry (failed job retry)

### RabbitMQ — Inter-Agent Communication

RabbitMQ is the right choice for **fanout, routing, and event streaming** workloads that require:

| Feature | RabbitMQ Support |
|---|---|
| Pub/sub (fanout exchanges) | ✅ Native |
| Topic-based routing | ✅ Native |
| Message durability | ✅ Native |
| Consumer groups | ✅ Native |
| Dead letter queues | ✅ Native |
| Multi-consumer patterns | ✅ Native |
| Cross-service communication | ✅ Native |

**Use cases in AENEWS:**
- Agent event broadcasting (agent completed, agent failed)
- Self-evolution loop events (weakness detected, patch proposed, certification result)
- Cross-cluster notifications (security alert → certification trigger)
- Mission status updates (real-time streaming to WebSocket gateway)
- Audit event streaming (all agent actions published for observability)

### Decision Matrix

| Use Case | System | Reason |
|---|---|---|
| Queue an agent execution | Bull | Point-to-point, needs retry and scheduling |
| Broadcast agent completion | RabbitMQ | Fanout to multiple consumers |
| Schedule periodic metric collection | Bull | Repeatable job support |
| Stream audit events | RabbitMQ | Multiple consumers, durable |
| Retry failed patch application | Bull | Built-in retry with backoff |
| Notify certification cluster | RabbitMQ | Topic routing to relevant auditors |

## Consequences

### Positive

- **Right tool for the job**: Each system is used for what it does best, avoiding workarounds.
- **Redis serves dual purpose**: Redis is already needed for caching; Bull adds queuing at no additional infrastructure cost.
- **Decoupled communication**: RabbitMQ enables true pub/sub between agents without tight coupling.
- **Scalability**: Both systems scale independently — Bull workers can be scaled for throughput, RabbitMQ consumers for fanout breadth.

### Negative

- **Two systems to operate**: DevOps must manage both Redis and RabbitMQ infrastructure.
- **Operational complexity**: Monitoring, alerting, and debugging must cover two queuing systems.
- **Potential for confusion**: Developers may be unsure which system to use for new features.

### Mitigation

- This ADR provides clear guidance on when to use each system.
- Shared helper methods in `AgentCommunicationService` abstract the choice for common patterns.
- Bull is always used for "send a task to one worker"; RabbitMQ for "notify many listeners."
- Infrastructure dashboards should monitor both Redis queue depth and RabbitMQ queue depth.
