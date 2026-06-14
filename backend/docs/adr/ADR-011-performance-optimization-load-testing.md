# ADR-011: Performance Optimization & Load Testing (Phase 13)

## Status: Accepted

## Date: 2026-06-14

## Context

Phase 13 addresses performance gaps identified in the AENEWS Agent OS X platform after Phases 0-12. While the system had robust observability (Prometheus, OpenTelemetry) and security (Phase 12), it lacked:

1. **No database connection pooling** — TypeORM used default pool settings (no max, no idle timeout, no statement timeout)
2. **No database indexes** — All queries used sequential scans on large tables
3. **No slow query detection** — Database performance issues were invisible until they caused timeouts
4. **No response caching** — Every GET request hit the database, even for rarely-changing data
5. **No response compression** — JSON payloads sent uncompressed, wasting 60-80% bandwidth
6. **No performance profiling** — No way to identify CPU/memory/event-loop bottlenecks in production
7. **No connection pool monitoring** — Pool exhaustion and connection leaks went undetected
8. **No cursor pagination** — Large datasets used OFFSET which is O(n) for deep pages
9. **No load testing** — No baseline performance metrics, no stress testing, no capacity planning
10. **No performance alerting** — Prometheus scraped metrics but never alerted on performance degradation

## Decision

We implement a comprehensive 5-sprint performance optimization and load testing layer:

### Sprint 1: Database Performance

- **Connection pooling**: TypeORM configured with explicit pool size (20), min connections (5), idle timeout (30s), connection timeout (5s), statement timeout (30s)
- **Database indexes migration**: 32 composite and partial indexes covering all high-frequency query patterns:
  - Agent lookups: tenant+status, tenant+cluster+status, tenant+enabled, capabilities GIN, last_execution
  - Execution history: agent+started_at, tenant+status+started_at, recent_failures (partial), slow executions (partial)
  - Task queue: tenant+status+priority, scheduled (partial), agent+status, parent_task, retry_eligible (partial)
  - Missions: tenant+state, active+priority (partial), requester, deadline (partial), capabilities GIN
  - Events: type+namespace+time, tenant+time, severity (partial), source+time, payload GIN
  - Audit log: tenant+action+time, entity, user+time, retention
- **Slow query logger**: Records queries exceeding configurable threshold (500ms default), Prometheus metrics, REST API for querying

### Sprint 2: Caching & Response Optimization

- **Response cache interceptor**: HTTP-level caching for GET requests, LRU memory cache (5000 entries) + Redis distributed cache, per-tenant isolation, Cache-Control headers, X-Cache hit/miss headers, @CacheTTL decorator per route
- **Compression interceptor**: gzip compression for responses >1KB, configurable compression level (6 default), skips if compression ratio >95%, stats tracking
- **Cursor pagination utility**: Keyset pagination avoiding O(n) OFFSET, base64url cursor encoding, tie-breaking on non-unique columns, offset pagination helper for backwards compatibility

### Sprint 3: Connection & Resource Pooling

- **Connection pool monitoring**: Tracks PostgreSQL, Redis, Neo4j, HTTP agent pools, acquire/release lifecycle, timeout tracking, Prometheus gauges for active/idle/waiting connections, connection leak detection (acquired >> released)
- **Pool sizing recommendations**: Based on Little's Law (pool_size = avg_query_time * target_qps / safety_margin), automatic alerts at 75% and 90% utilization

### Sprint 4: Load Testing Infrastructure

- **k6 baseline load tests**: 5 test scenarios (smoke, load, stress, spike, soak), custom metrics for auth/agent/DB durations, thresholds (P95 < 500ms, P99 < 2s, error rate < 5%)
- **k6 database stress tests**: Concurrent read/write scenarios, filtered/aggregation query tests, join-heavy query tests, separate P95 thresholds for reads (200ms) and writes (1s)

### Sprint 5: Performance Monitoring & Profiling

- **Performance profiling service**: CPU, memory, event loop lag monitoring, span-based tracing (start/end/measure API), automatic recommendations (heap pressure, event loop blocking, memory leaks, span leaks), Prometheus gauges
- **Grafana performance dashboard**: 12-panel dashboard with HTTP latency, event loop, heap memory, slow queries, pool utilization, span duration, GC pauses
- **Performance alert rules**: 12 alerting rules across 5 groups (API, database, memory, event loop, agent pipeline)

## Consequences

### Positive

- **Database performance**: 32 indexes reduce query times by 10-100x for common patterns; connection pooling prevents exhaustion
- **API responsiveness**: Response caching eliminates redundant DB queries; compression reduces bandwidth 60-80%
- **Observability**: Slow query detection, pool monitoring, and profiling give full visibility into performance
- **Capacity planning**: k6 load tests provide baselines for scaling decisions
- **Proactive alerting**: 12 performance alerts catch degradation before users notice
- **Memory safety**: Leak detection and heap monitoring prevent OOM crashes

### Negative

- **Memory overhead**: Response cache (5000 entries), slow query log (1000 entries), profiling history add ~50MB
- **Index write overhead**: 32 indexes add ~10-20% write overhead (acceptable for read-heavy workload)
- **Compression CPU**: gzip adds ~1-5ms per response (net positive due to bandwidth savings)
- **k6 dependency**: Load testing requires k6 binary installation (not part of runtime)
- **Complexity**: 5 new services, 3 new interceptors, ~3000 lines of performance code

## Performance Architecture

```
Request Flow (Phase 13):
Client → nginx (SSL, gzip offload)
  → CompressionInterceptor (gzip for >1KB)
  → ResponseCacheInterceptor (memory + Redis cache for GET)
  → helmet.js → CORS → CorrelationId → IP Access
  → ThrottlerGuard → JwtAuthGuard → RolesGuard → TenantGuard
  → Controller → Service
  → TypeORM (connection pool: 5-20, statement timeout: 30s)
  → PostgreSQL (32 composite + partial indexes)
  → SlowQueryLogger (threshold: 500ms)
```

## New API Endpoints

- `GET /api/v1/performance/overview` — Full performance overview
- `GET /api/v1/performance/profiling/report` — Profiling report
- `GET /api/v1/performance/profiling/memory` — Memory stats
- `GET /api/v1/performance/profiling/spans` — Active spans
- `GET /api/v1/performance/slow-queries` — Recent slow queries
- `DELETE /api/v1/performance/slow-queries` — Clear slow query log
- `GET /api/v1/performance/pools` — Connection pool stats
- `GET /api/v1/performance/pools/recommendations` — Pool sizing recommendations
- `GET /api/v1/performance/cache/stats` — Cache statistics
- `POST /api/v1/performance/cache/invalidate` — Invalidate cache
- `DELETE /api/v1/performance/cache` — Flush all cache
- `GET /api/v1/performance/compression/stats` — Compression statistics

## New Prometheus Metrics

- `aenews_slow_queries_total` — Slow query counter by schema
- `aenews_slow_query_duration_seconds` — Slow query duration histogram
- `aenews_event_loop_lag_ms` — Event loop lag gauge
- `aenews_heap_used_bytes` — Heap memory gauge
- `aenews_active_profiling_spans` — Active spans gauge
- `aenews_span_duration_seconds` — Span duration histogram
- `aenews_pool_active_connections` — Active pool connections gauge
- `aenews_pool_idle_connections` — Idle pool connections gauge
- `aenews_pool_waiting_connections` — Waiting connections gauge
- `aenews_pool_acquired_total` — Pool acquisitions counter
- `aenews_pool_released_total` — Pool releases counter
- `aenews_pool_timeout_total` — Pool timeouts counter

## New Environment Variables

- `DB_POOL_SIZE` — PostgreSQL pool size (default: 20)
- `DB_POOL_MAX` — PostgreSQL max connections (default: 20)
- `DB_POOL_MIN` — PostgreSQL min connections (default: 5)
- `DB_POOL_IDLE_TIMEOUT` — Idle connection timeout ms (default: 30000)
- `DB_POOL_CONNECTION_TIMEOUT` — Connection timeout ms (default: 5000)
- `DB_STATEMENT_TIMEOUT` — Statement timeout ms (default: 30000)
- `PERF_SLOW_QUERY_ENABLED` — Enable slow query logging (default: true)
- `PERF_SLOW_QUERY_THRESHOLD_MS` — Slow query threshold ms (default: 500)
- `PERF_RESPONSE_CACHE_ENABLED` — Enable response caching (default: true)
- `PERF_RESPONSE_CACHE_TTL` — Cache TTL seconds (default: 30)
- `PERF_COMPRESSION_ENABLED` — Enable compression (default: true)
- `PERF_COMPRESSION_THRESHOLD` — Compression threshold bytes (default: 1024)
- `PERF_PROFILING_ENABLED` — Enable profiling (default: true)
- `PERF_POOL_MONITORING_ENABLED` — Enable pool monitoring (default: true)
