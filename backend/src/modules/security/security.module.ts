/**
 * AENEWS Agent OS X — Security Module (Phase 12)
 *
 * Provides comprehensive security hardening services:
 *
 *   - AccountLockoutService: Brute-force protection with exponential backoff
 *   - RefreshTokenService: JWT refresh token rotation with theft detection
 *   - SecurityAuditPersistenceService: Database-backed audit logging
 *   - CorsSecurityMiddleware: Explicit CORS origin validation
 *   - CorrelationIdMiddleware: Request correlation tracking
 *   - IpAccessControlMiddleware: IP-based endpoint access control
 *   - SecurityController: REST API for security management
 *   - SecurityMetricsService: Security-specific Prometheus metrics
 *   - ThreatIntelligenceService: IP reputation and threat detection
 *   - SentryIntegrationService: Error tracking via Sentry
 */

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuditLog } from '../tenant/entities/audit-log.entity';
import { User } from '../user/entities/user.entity';
import { AccountLockoutService } from './services/account-lockout.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { SecurityAuditPersistenceService } from './services/security-audit-persistence.service';
import { CorsSecurityMiddleware } from './middleware/cors-security.middleware';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { IpAccessControlMiddleware } from './middleware/ip-access-control.middleware';
import { SecurityController } from './controllers/security.controller';
import { SecurityMetricsService } from '../security-monitoring/services/security-metrics.service';
import { ThreatIntelligenceService } from '../security-monitoring/services/threat-intelligence.service';
import { SentryIntegrationService } from '../security-monitoring/services/sentry-integration.service';
import { AuthModule } from '../auth/auth.module';
import { EventModule } from '../event/event.module';
import { TenantModule } from '../tenant/tenant.module';

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
    RefreshTokenService,
    SecurityAuditPersistenceService,
    CorsSecurityMiddleware,
    CorrelationIdMiddleware,
    IpAccessControlMiddleware,
    SecurityMetricsService,
    ThreatIntelligenceService,
    SentryIntegrationService,
  ],
  exports: [
    AccountLockoutService,
    RefreshTokenService,
    SecurityAuditPersistenceService,
    CorsSecurityMiddleware,
    CorrelationIdMiddleware,
    IpAccessControlMiddleware,
    SecurityMetricsService,
    ThreatIntelligenceService,
    SentryIntegrationService,
  ],
})
export class SecurityModule {}
