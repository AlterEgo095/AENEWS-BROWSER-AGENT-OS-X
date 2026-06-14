# ADR-010: Security Hardening & Monitoring (Phase 12)

## Status: Accepted

## Date: 2026-06-14

## Context

Phase 12 addresses critical security gaps identified in the AENEWS Agent OS X platform after Phases 0-11. The system had robust agent-level security (SecurityGateway, Constitutional AI) but was weak at the HTTP/infrastructure level. The following critical gaps were identified:

1. **No helmet.js** — HTTP security headers relied solely on nginx
2. **Wildcard CORS** (`cors: true`) — any origin could make API requests
3. **No account lockout** — vulnerable to brute-force attacks
4. **No refresh token rotation** — long-lived JWT tokens without rotation or theft detection
5. **In-memory-only audit log** — SecurityGateway audit entries lost on restart
6. **Default/fallback secrets** — JWT and encryption keys had hardcoded defaults
7. **No IP access control** — admin/metrics endpoints accessible from any IP
8. **No correlation IDs** — no request tracing across services
9. **No security-specific metrics** — no Prometheus counters for security events
10. **No threat intelligence** — no IP reputation scoring or anomaly detection
11. **No alerting** — Prometheus scraped but never alerted on security events
12. **No CI/CD security scanning** — no dependency auditing, SAST, or container scanning
13. **No Sentry integration** — SENTRY_DSN configured but never used
14. **WebSocket security gaps** — no rate limiting, no input sanitization, wildcard CORS

## Decision

We implement a comprehensive 5-sprint security hardening and monitoring layer:

### Sprint 1: HTTP Security Hardening

- **helmet.js**: Configured with strict CSP, HSTS (2-year max-age + preload), X-Frame-Options deny, XSS filter
- **CORS**: Replaced `cors: true` with `CorsSecurityMiddleware` supporting explicit origin whitelist, regex patterns (*.aenews.ai), and dynamic origin management
- **Request size limiting**: 10MB max body size at Express level (nginx also has 50MB limit)
- **Trust proxy**: `app.enableTrustProxy()` for proper IP forwarding behind nginx
- **Account lockout**: `AccountLockoutService` with exponential backoff (15min base → 24h max), 5 attempts before lockout, progressive delay between attempts
- **Refresh token rotation**: `RefreshTokenService` with token family tracking, reuse detection (revokes entire family on reuse), max 5 concurrent sessions, cryptographic 64-byte tokens

### Sprint 2: Secrets & Configuration Hardening

- **Fail-fast secrets**: JWT secret and encryption key now return `undefined` in production if not set (causing startup failure), with dev-only fallbacks that log warnings
- **Audit persistence**: `SecurityAuditPersistenceService` with batched writes to the existing AuditLog entity, 5-minute sync from SecurityGateway, 90-day retention with daily cleanup
- **IP access control**: `IpAccessControlMiddleware` with CIDR notation support, separate whitelists for admin/metrics/internal, private network auto-bypass
- **Correlation IDs**: `CorrelationIdMiddleware` assigning UUID v4 to every request, propagating X-Correlation-ID and X-Request-ID headers

### Sprint 3: CI/CD Security Pipeline

- **security-scan.yml**: GitHub Actions workflow with 5 parallel scanning jobs:
  - npm audit (production deps, fails on critical/high)
  - Gitleaks (secret detection in git history)
  - Semgrep (SAST with security-audit, secrets, OWASP top 10, NestJS rulesets)
  - Trivy (container + filesystem scanning)
  - License compliance check
- **Security gate**: Aggregates all scan results and fails the pipeline if critical issues are found

### Sprint 4: Security Monitoring & Alerting

- **SecurityMetricsService**: 10 security-specific Prometheus metrics (blocked_requests, threat_detections, auth_failures, token_rotations, account_lockouts, input_sanitized, risk_score_histogram, circuit_breaker_state, suspicious_ips, auth_success)
- **Alertmanager**: Configured with Slack integration, severity-based routing (critical → Slack + PagerDuty, warning → Slack), inhibition rules
- **Security alert rules**: 14 Prometheus alerting rules across 6 groups (auth, token, threat, circuit_breaker, input, risk_score)
- **Grafana security dashboard**: 12-panel dashboard with threat detection, authentication, circuit breakers, input security visualizations
- **Sentry integration**: `SentryIntegrationService` with dynamic import, user context, breadcrumbs, performance transactions, PII scrubbing
- **ThreatIntelligenceService**: IP reputation scoring (0-100), behavioral anomaly detection, auto-blocking at score ≥80, threat flags (10 types), alert management

### Sprint 5: WebSocket & Advanced Hardening

- **WS connection rate limiting**: Max 5 connections per IP, max 10 connection attempts per minute
- **WS event rate limiting**: Max 60 events per minute per client
- **WS input sanitization**: All incoming events routed through SecurityGatewayService for injection detection
- **WS output sanitization**: Automatic redaction of sensitive fields (password, token, secret, apiKey, etc.) in broadcast payloads
- **WS CORS**: Explicit origin validation (regex patterns) replacing wildcard
- **WS payload size limit**: 1MB max per event
- **Log aggregation**: Loki + Promtail for centralized Docker log collection, 7-day retention

## Consequences

### Positive

- **Defense-in-depth**: Security at every layer (nginx → helmet → app middleware → guards → services)
- **Brute-force resistant**: Account lockout with exponential backoff prevents password attacks
- **Token theft detection**: Refresh token rotation with family tracking catches token reuse
- **Real-time threat detection**: IP reputation scoring with auto-blocking
- **Observable security**: 10+ Prometheus metrics, 14 alert rules, dedicated Grafana dashboard
- **Proactive scanning**: CI/CD pipeline catches vulnerabilities before deployment
- **Audit compliance**: 90-day persisted audit trail with query API
- **Request tracing**: Correlation IDs across all services

### Negative

- **Complexity increase**: 10 new services, 4 new middleware, ~4000 lines of security code
- **Memory overhead**: In-memory threat intelligence and token stores (mitigated by cleanup cron jobs)
- **Latency**: Progressive delay on failed auth adds 1-16 seconds to suspicious login attempts
- **False positives**: Auto-blocking IPs at score 80 may block legitimate users behind shared IPs
- **Sentry dependency**: Optional but adds network latency when enabled

## Security Architecture Diagram

```
Request Flow (Phase 12):
Client → nginx (SSL, rate limit, headers)
  → helmet.js (CSP, HSTS, XSS)
  → CORS (explicit origin check)
  → CorrelationIdMiddleware (X-Correlation-ID)
  → IpAccessControlMiddleware (admin/metrics whitelist)
  → ThrottlerGuard (global rate limit)
  → JwtAuthGuard (authentication)
  → RolesGuard (authorization)
  → TenantGuard (multi-tenancy)
  → Controller → Service → SecurityGateway (agent-level)
```

## New API Endpoints

- `POST /api/v1/auth/refresh` — Refresh token rotation
- `POST /api/v1/auth/logout` — Revoke refresh token
- `DELETE /api/v1/auth/logout-all` — Revoke all user tokens
- `GET /api/v1/security/lockout/stats` — Lockout statistics
- `POST /api/v1/security/lockout/unlock/:email` — Unlock account
- `GET /api/v1/security/tokens/sessions` — Active sessions
- `DELETE /api/v1/security/tokens/revoke-all` — Revoke all tokens
- `GET /api/v1/security/cors/config` — CORS configuration
- `POST /api/v1/security/cors/origins` — Add CORS origin
- `GET /api/v1/security/threats/alerts` — Threat alerts
- `GET /api/v1/security/threats/ip/:ip` — IP reputation
- `POST /api/v1/security/threats/ip/:ip/block` — Block IP
- `GET /api/v1/security/audit` — Audit log query
- `GET /api/v1/security/audit/stats` — Audit statistics
