/**
 * AENEWS Agent OS X — Security Module (Phase 6)
 *
 * Provides comprehensive security hardening services:
 *
 *   - AccountLockoutService: Brute-force protection with exponential backoff
 *   - RefreshTokenService: JWT refresh token rotation with theft detection
 *   - SecurityAuditPersistenceService: Database-backed audit logging
 *   - PromptInjectionGuardService: GUARD_OPEN/GUARD_CLOSE prompt injection detection & sanitization
 *   - SsrfProtectionService: SSRF URL validation with DNS rebinding detection
 *   - CorsSecurityMiddleware: Explicit CORS origin validation
 *   - CorrelationIdMiddleware: Request correlation tracking
 *   - IpAccessControlMiddleware: IP-based endpoint access control (whitelist)
 *   - IpBlacklistMiddleware: IP-based blocking (blacklist)
 *   - RequestSizeLimitMiddleware: Request body size enforcement
 *   - SecurityHeadersMiddleware: Helmet-style defense-in-depth headers
 *   - SecurityController: REST API for security management
 *   - SecurityMetricsService: Security-specific Prometheus metrics
 *   - ThreatIntelligenceService: IP reputation and threat detection
 *   - EncryptionService: AES-256-GCM encryption at rest with HKDF key derivation
 *   - SentryIntegrationService: Error tracking via Sentry
 *   - TotpService: RFC 6238 compliant TOTP two-factor authentication
 */

import { Module, Global, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuditLog } from '../tenant/entities/audit-log.entity';
import { User } from '../user/entities/user.entity';
import { AccountLockoutService } from './services/account-lockout.service';
import { SecurityGatewayService } from './services/security-gateway.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { SecurityAuditPersistenceService } from './services/security-audit-persistence.service';
import { PromptInjectionGuardService } from './services/prompt-injection-guard.service';
import { SsrfProtectionService } from './services/ssrf-protection.service';
import { EncryptionService } from './services/encryption.service';
import { TotpService } from './services/totp.service';
import { CorsSecurityMiddleware } from './middleware/cors-security.middleware';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { IpAccessControlMiddleware } from './middleware/ip-access-control.middleware';
import { IpBlacklistMiddleware } from './middleware/ip-blacklist.middleware';
import { RequestSizeLimitMiddleware } from './middleware/request-size-limit.middleware';
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';
import { SecurityController } from './controllers/security.controller';
import { SecurityMetricsService } from '../security-monitoring/services/security-metrics.service';
import { ThreatIntelligenceService } from '../security-monitoring/services/threat-intelligence.service';
import { SentryIntegrationService } from '../security-monitoring/services/sentry-integration.service';
import { AuthModule } from '../auth/auth.module';
import { EventModule } from '../event/event.module';
import { TenantModule } from '../tenant/tenant.module';
import { RateLimitMiddleware } from './guards/rate-limit.guard';
import { AuthRateLimitMiddleware } from './guards/auth-rate-limit.guard';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, User]),
    AuthModule,
    EventModule,
    TenantModule,
  ],
  controllers: [SecurityController],
  providers: [
    AccountLockoutService,
    SecurityGatewayService,
    RefreshTokenService,
    SecurityAuditPersistenceService,
    PromptInjectionGuardService,
    SsrfProtectionService,
    CorsSecurityMiddleware,
    CorrelationIdMiddleware,
    IpAccessControlMiddleware,
    IpBlacklistMiddleware,
    RequestSizeLimitMiddleware,
    SecurityHeadersMiddleware,
    SecurityMetricsService,
    ThreatIntelligenceService,
    SentryIntegrationService,
    EncryptionService,
    TotpService,
  ],
  exports: [
    AccountLockoutService,
    SecurityGatewayService,
    RefreshTokenService,
    SecurityAuditPersistenceService,
    PromptInjectionGuardService,
    SsrfProtectionService,
    CorsSecurityMiddleware,
    CorrelationIdMiddleware,
    IpAccessControlMiddleware,
    IpBlacklistMiddleware,
    RequestSizeLimitMiddleware,
    SecurityHeadersMiddleware,
    SecurityMetricsService,
    ThreatIntelligenceService,
    SentryIntegrationService,
    EncryptionService,
    TotpService,
  ],
})
export class SecurityModule {
  /**
   * Configure security middleware.
   *
   * Order matters (outermost first):
   *   1. SecurityHeadersMiddleware: Defense-in-depth security headers
   *   2. CorrelationIdMiddleware: Request correlation tracking
   *   3. IpBlacklistMiddleware: Block blacklisted IPs
   *   4. IpAccessControlMiddleware: IP-based endpoint access control
   *   5. RequestSizeLimitMiddleware: Request body size limits
   *   6. AuthRateLimitMiddleware: 5 req/min on auth endpoints
   *   7. RateLimitMiddleware: 100 req/min on all other API routes
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityHeadersMiddleware)
      .forRoutes('*')
      .apply(CorrelationIdMiddleware)
      .forRoutes('*')
      .apply(IpBlacklistMiddleware)
      .forRoutes('*')
      .apply(IpAccessControlMiddleware)
      .forRoutes('*')
      .apply(RequestSizeLimitMiddleware)
      .forRoutes('*')
      .apply(AuthRateLimitMiddleware)
      .forRoutes('auth/login', 'auth/register', 'auth/refresh', 'auth/login/2fa')
      .apply(RateLimitMiddleware)
      .forRoutes('*');
  }
}
