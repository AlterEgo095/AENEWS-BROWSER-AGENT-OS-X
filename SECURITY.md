# AENEWS Agent OS X — Security Architecture

This document describes the security architecture, measures, and policies implemented in the AENEWS Agent OS X platform.

---

## Table of Contents

- [Authentication Architecture](#authentication-architecture)
- [Authorization Model](#authorization-model)
- [Security Measures Implemented](#security-measures-implemented)
- [Environment Variables for Security](#environment-variables-for-security)
- [Security Audit Results Summary](#security-audit-results-summary)
- [Reporting Vulnerabilities](#reporting-vulnerabilities)

---

## Authentication Architecture

### JWT + Passport Strategy

All API endpoints require authentication via JSON Web Tokens (JWT). The authentication flow uses `passport-jwt` with the `JwtAuthGuard` registered as a global `APP_GUARD`.

**Token Lifecycle:**

1. **Registration** (`POST /api/v1/auth/register`) — Creates a user with `tenant_admin` role and returns an access token + refresh token pair
2. **Login** (`POST /api/v1/auth/login`) — Validates credentials, enforces account lockout checks, returns a token pair
3. **Token Refresh** (`POST /api/v1/auth/refresh`) — Rotates the refresh token and returns a new access + refresh token pair
4. **Logout** (`POST /api/v1/auth/logout`) — Revokes the specific refresh token
5. **Logout All** (`DELETE /api/v1/auth/logout-all`) — Revokes all refresh tokens for the user

**Access Token:**
- Signed with `JWT_SECRET` (HS256 algorithm)
- Contains: `sub` (user ID), `email`, `role`, `tenantId`
- Default expiration: 24 hours (`JWT_EXPIRATION`)

**Refresh Token:**
- Family-based rotation — each refresh generates a new token in the same family
- Single-use — reuse of a previously-rotated token invalidates the entire family
- Configurable max families per user (default: 5)
- Reuse detection window: 5 minutes

**Public Endpoints:**
Only three endpoints are marked with `@Public()` and do not require authentication:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

All other endpoints require a valid JWT token. The `JwtAuthGuard` checks for the `@Public()` decorator via the `Reflector` and bypasses authentication only when explicitly set.

### Account Lockout

Failed login attempts are tracked per email address with progressive delays:

| Failed Attempts | Response |
|----------------|----------|
| 1–4 | Progressive delay (increases with each failure) |
| 5 | Account locked for 15 minutes (doubles with each subsequent lockout) |
| 5+ | Maximum lockout duration: 24 hours |

The lockout service:
- Resets the failure counter on successful login
- Supports manual unlock by administrators
- Tracks all locked accounts with statistics
- Records lockout events in the audit log

---

## Authorization Model

### Role-Based Access Control (RBAC)

The system defines four user roles:

| Role | Description | Typical Access |
|------|-------------|---------------|
| `super_admin` | Platform administrator | All endpoints, cross-tenant access, performance monitoring |
| `tenant_admin` | Organization administrator | Agent CRUD, mission management, orchestration, swarm |
| `operator` | Day-to-day operator | Agent execution, mission management, orchestration, swarm |
| `viewer` | Read-only access | View agents, tasks, events, statistics |

**Role Enforcement:**
- `RolesGuard` is registered as a global `APP_GUARD`
- Controllers specify required roles via `@Roles()` decorator
- The guard checks `req.user.role` against the required roles
- Insufficient permissions return `403 Forbidden` with a descriptive message

**Role-specific restrictions:**
- **Performance endpoints** (`/api/v1/performance/*`) — `super_admin` only
- **Orchestration endpoints** (`/api/v1/orchestration/*`) — `super_admin`, `tenant_admin`, `operator`
- **Intelligence endpoints** (`/api/v1/intelligence/*`) — `super_admin`, `tenant_admin`, `operator`
- **Swarm endpoints** (`/api/v1/swarm/*`) — `super_admin`, `tenant_admin`, `operator`
- **Cypher query endpoint** (`POST /api/v1/intelligence/graph/query`) — `super_admin` only
- **Agent CRUD** (`/api/v1/agents/*`) — `super_admin`, `tenant_admin`, `operator`
- **Agent read** (`GET /api/v1/agents`) — Includes `viewer` role

### Multi-Tenant Isolation

- `TenantGuard` is registered as a global `APP_GUARD`
- Enforces that users can only access data within their own tenant
- `TenantScoped` decorator marks controllers as tenant-aware
- Non-`super_admin` users have their `tenantId` injected from their JWT claims
- `super_admin` users can optionally specify a `tenantId` query parameter

### Mass Assignment Prevention

- `RegisterDto` does **not** accept a `role` field — new users are always created with `tenant_admin` role
- Global `ValidationPipe` uses `whitelist: true` (strips unknown properties) and `forbidNonWhitelisted: true` (rejects requests with extra properties)
- This prevents attackers from escalating privileges by including `role: "super_admin"` in registration requests

---

## Security Measures Implemented

### HTTP Security Headers (Helmet)

The application uses Helmet middleware with the following configurations:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Restrictive CSP | Prevents XSS by limiting resource sources |
| `Strict-Transport-Security` | max-age=63072000; includeSubDomains; preload | Forces HTTPS for 2 years |
| `X-Content-Type-Options` | nosniff | Prevents MIME type sniffing |
| `X-Frame-Options` | DENY | Prevents clickjacking |
| `X-XSS-Protection` | 1; mode=block | Browser XSS filter |
| `Referrer-Policy` | strict-origin-when-cross-origin | Limits referrer information leakage |
| `X-Powered-By` | (removed) | Hides server technology |

### CORS Security

- Explicit origin validation via `CorsSecurityMiddleware`
- Configurable allowlist via `SECURITY_CORS_ORIGINS` environment variable
- Subdomain pattern matching (e.g., `*.aenews.ai`)
- Dynamic origin management (add/remove at runtime)
- Credentials allowed for authenticated origins
- Production mode restricts to configured origins only

### Rate Limiting

**Global Rate Limiting:**
- `ThrottlerGuard` applies globally to all endpoints
- Default: 100 requests per minute per IP
- Configurable via `THROTTLE_TTL` and `THROTTLE_LIMIT`

**Per-Endpoint Rate Limiting:**
- `RateLimitGuard` with `@RateLimit()` decorator
- Different limits per domain (`llm`, `cluster`, `default`)
- Examples:
  - `/intelligence/graph/query`: 5 points per 60 seconds
  - `/orchestration/collaborate`: 10 points per 60 seconds
  - `/swarm/create`: 5 points per 60 seconds

### IP Access Control

- `IpAccessControlMiddleware` with CIDR-based matching
- Admin endpoint whitelist (`SECURITY_IP_ADMIN_WHITELIST`)
- Metrics endpoint whitelist (`SECURITY_IP_METRICS_WHITELIST`)
- Private IP bypass for internal services
- Supports IPv4 CIDR notation (e.g., `10.0.0.0/8`)

### Cypher Injection Prevention

The `IntelligenceController.executeGraphQuery()` method implements a strict allowlist:

**Blocked operations:**
- `DELETE`, `DETACH DELETE` — Data destruction
- `CREATE`, `MERGE` — Data modification
- `SET`, `REMOVE` — Property manipulation
- `DROP` — Schema destruction
- `CALL` — Stored procedure execution
- `FOREACH` — Iterative operations
- `LOAD CSV` — SSRF via file loading

**Allowed operations:**
- `MATCH`, `OPTIONAL MATCH` — Read-only graph traversal
- `RETURN`, `WITH`, `DISTINCT` — Projection
- `WHERE`, `ORDER BY`, `LIMIT`, `SKIP` — Filtering and pagination

**Additional protections:**
- Query must start with a safe keyword
- Maximum query length: 2000 characters
- Endpoint restricted to `super_admin` role only

### UUID Validation on Route Parameters

All `:id` route parameters use `ParseUUIDPipe`:
- Rejects non-UUID values with `400 Bad Request`
- Prevents path traversal (`../etc/passwd`)
- Prevents SQL injection (`1 OR 1=1`)
- Prevents XSS (`<script>alert(1)</script>`)

### Request Body Size Limit

- Maximum request body size: 10MB
- Applied to both JSON and URL-encoded payloads
- Prevents denial-of-service via large payloads

### Correlation IDs

- `CorrelationIdMiddleware` assigns a unique correlation ID to every request
- Included in all log entries for audit tracing
- Supports `X-Correlation-ID` header for request tracking across services

### Security Metrics & Monitoring

- `SecurityMetricsService` tracks:
  - Authentication successes/failures by type
  - Blocked requests by reason (injection, rate limit, etc.)
  - Threat detections by category and severity
  - Token rotation outcomes (success, reuse detected, expired)
  - Risk scores per endpoint
  - Circuit breaker states
- All metrics are anonymized (IP addresses are truncated)

### Threat Intelligence

- `ThreatIntelligenceService` maintains per-IP reputation scores
- Event types tracked: `auth_failure`, `threat`, `rate_abuse`
- Auto-blocking when IP reputation score exceeds threshold (default: 80)
- Brute force detection: 10+ auth failures from same IP
- Scanning detection: 20+ unique endpoint hits from same IP
- Manual IP block/unblock by administrators
- Alert system with acknowledgment workflow

### Audit Logging

- `SecurityAuditPersistenceService` batches and persists security events
- Configurable batch size (default: 50 events)
- Configurable flush interval (default: 10 seconds)
- 90-day retention policy
- All authentication events, authorization failures, and security events are logged

### Account Lockout

- Progressive delay increases with each failed login attempt
- Account locked after 5 consecutive failures
- Lockout duration doubles with each subsequent lockout (15 min → 30 min → 60 min → ...)
- Maximum lockout: 24 hours
- Successful login resets the failure counter
- Administrators can manually unlock accounts

### Refresh Token Security

- Family-based token rotation
- Single-use refresh tokens
- Reuse detection invalidates the entire token family
- Configurable max families per user (default: 5)
- Reuse window: 5 minutes
- Automatic cleanup of expired tokens
- Active session listing and management

---

## Environment Variables for Security

### Critical (Application will not start in production without these)

| Variable | Description | Production Requirement |
|----------|-------------|----------------------|
| `JWT_SECRET` | HMAC secret for JWT signing | **Required** — 64-byte hex string |
| `ENCRYPTION_KEY` | AES-256 key for data at rest | **Required** — exactly 32 characters |
| `APP_ENV` | Application environment | Must be `production` |

### Authentication & Sessions

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_EXPIRATION` | Access token lifetime | `24h` |
| `JWT_REFRESH_EXPIRATION` | Refresh token lifetime | `7d` |
| `SECURITY_LOCKOUT_MAX_ATTEMPTS` | Max failed logins before lockout | `5` |
| `SECURITY_LOCKOUT_BASE_DURATION_MIN` | Initial lockout duration | `15` |
| `SECURITY_LOCKOUT_MAX_DURATION_MIN` | Maximum lockout duration | `1440` (24h) |
| `SECURITY_LOCKOUT_MULTIPLIER` | Lockout duration multiplier | `2` |
| `SECURITY_LOCKOUT_RESET_AFTER_MIN` | Reset counter after success | `30` |
| `SECURITY_REFRESH_TOKEN_MAX_FAMILIES` | Max concurrent token families | `5` |
| `SECURITY_REFRESH_TOKEN_REUSE_WINDOW_MIN` | Reuse detection window | `5` |

### Network Security

| Variable | Description | Default |
|----------|-------------|---------|
| `SECURITY_CORS_ORIGINS` | Allowed CORS origins (comma-separated) | (empty) |
| `SECURITY_IP_ADMIN_WHITELIST` | CIDR allowlist for admin endpoints | (empty) |
| `SECURITY_IP_METRICS_WHITELIST` | CIDR allowlist for metrics endpoints | (empty) |
| `SECURITY_IP_INTERNAL_WHITELIST` | CIDR allowlist for internal services | (empty) |
| `SECURITY_IP_PRIVATE_BYPASS` | Allow private IPs to bypass IP checks | `true` |

### Threat Detection

| Variable | Description | Default |
|----------|-------------|---------|
| `SECURITY_THREAT_AUTO_BLOCK_SCORE` | IP reputation score for auto-block | `80` |
| `SECURITY_THREAT_BRUTE_FORCE_THRESHOLD` | Auth failures before brute force flag | `10` |
| `SECURITY_THREAT_SCANNING_THRESHOLD` | Unique endpoints before scanning flag | `20` |
| `SECURITY_THREAT_RATE_ABUSE_THRESHOLD` | Rate limit violations before flag | `5` |
| `SECURITY_THREAT_TRACKING_WINDOW_MIN` | Tracking window for threat events | `15` |

### Rate Limiting

| Variable | Description | Default |
|----------|-------------|---------|
| `THROTTLE_TTL` | Global rate limit window (ms) | `60000` |
| `THROTTLE_LIMIT` | Max requests per window per IP | `100` |

### WebSocket Security

| Variable | Description | Default |
|----------|-------------|---------|
| `SECURITY_WS_MAX_CONNECTIONS_PER_IP` | Max concurrent WebSocket connections per IP | `5` |
| `SECURITY_WS_RATE_LIMIT_PER_MIN` | Max WebSocket messages per minute | `60` |
| `SECURITY_WS_SANITIZE_EVENTS` | Sanitize WebSocket event payloads | `true` |

### Audit

| Variable | Description | Default |
|----------|-------------|---------|
| `SECURITY_AUDIT_BATCH_SIZE` | Events per batch flush | `50` |
| `SECURITY_AUDIT_FLUSH_INTERVAL_SEC` | Seconds between flushes | `10` |
| `SECURITY_AUDIT_RETENTION_DAYS` | Days to retain audit logs | `90` |

### Monitoring

| Variable | Description | Default |
|----------|-------------|---------|
| `SENTRY_DSN` | Sentry DSN for error tracking | (empty — disabled) |
| `OTEL_ENABLED` | Enable OpenTelemetry tracing | `true` |

---

## Security Audit Results Summary

The following security audit areas have been tested and verified:

### Authentication & Authorization ✅

| Test | Result | Details |
|------|--------|---------|
| All endpoints require authentication | ✅ Pass | `JwtAuthGuard` is global `APP_GUARD` |
| `@Public()` only on auth endpoints | ✅ Pass | register, login, refresh only |
| Role-based access control enforced | ✅ Pass | `RolesGuard` is global `APP_GUARD` |
| Performance endpoints restricted to `super_admin` | ✅ Pass | `@Roles(UserRole.SUPER_ADMIN)` |
| Tenant isolation enforced | ✅ Pass | `TenantGuard` is global `APP_GUARD` |
| No mass assignment on registration | ✅ Pass | `RegisterDto` has no `role` field + `forbidNonWhitelisted` |

### Input Validation ✅

| Test | Result | Details |
|------|--------|---------|
| UUID validation on route parameters | ✅ Pass | `ParseUUIDPipe` rejects non-UUID |
| Cypher injection blocked | ✅ Pass | Allowlist validates queries, blocks DELETE/CREATE/etc. |
| Path traversal blocked | ✅ Pass | UUID validation inherently prevents `../` |
| DTO whitelist enforcement | ✅ Pass | `whitelist: true` + `forbidNonWhitelisted: true` |
| Request body size limited | ✅ Pass | 10MB max |

### HTTP Security ✅

| Test | Result | Details |
|------|--------|---------|
| Helmet security headers | ✅ Pass | CSP, HSTS, X-Frame-Options, etc. |
| CORS origin validation | ✅ Pass | Explicit allowlist + subdomain patterns |
| Rate limiting | ✅ Pass | Global throttler + per-endpoint limits |
| No default secrets in production | ✅ Pass | Application refuses to start without `JWT_SECRET` and `ENCRYPTION_KEY` |

### Operational Security ✅

| Test | Result | Details |
|------|--------|---------|
| Account lockout after failed attempts | ✅ Pass | 5 attempts → 15 min lockout (progressive) |
| Refresh token rotation | ✅ Pass | Single-use tokens with family-based reuse detection |
| Correlation IDs | ✅ Pass | Every request gets a unique ID |
| Threat intelligence | ✅ Pass | IP reputation scoring + auto-blocking |
| Audit logging | ✅ Pass | Batched persistence with 90-day retention |

### Test Coverage

Security tests are organized in the following test suites:

| Test File | Tests | Focus |
|-----------|-------|-------|
| `test/phase12-security-hardening.e2e-spec.ts` | 25+ | Account lockout, refresh tokens, CORS, IP access, security metrics, threat intel |
| `test/security-remediation.e2e-spec.ts` | 20+ | Auth enforcement, Cypher injection, path traversal, mass assignment, UUID validation, role restrictions |
| `test/api-integrity.e2e-spec.ts` | 15+ | API routing correctness, double-prefix prevention, full workflow tests |

---

## Reporting Vulnerabilities

If you discover a security vulnerability in AENEWS Agent OS X, please report it responsibly:

1. **Do not** file a public GitHub issue for security vulnerabilities
2. Email security findings to the project maintainers
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)
4. We will acknowledge receipt within 48 hours and provide a timeline for remediation

### Security Response SLA

| Severity | Response Time | Remediation Target |
|----------|--------------|-------------------|
| Critical (RCE, data breach) | < 24 hours | < 72 hours |
| High (auth bypass, injection) | < 48 hours | < 7 days |
| Medium (info disclosure, DoS) | < 72 hours | < 14 days |
| Low (header missing, best practice) | < 7 days | Next release |

---

*Last updated: 2025-03-05*
