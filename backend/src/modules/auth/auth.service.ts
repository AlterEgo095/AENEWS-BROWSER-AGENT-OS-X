import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../user/entities/user.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { EventService } from '../event/event.service';
import { AccountLockoutService } from '../security/services/account-lockout.service';
import { RefreshTokenService, TokenPair } from '../security/services/refresh-token.service';
import { SecurityMetricsService } from '../security-monitoring/services/security-metrics.service';
import { ThreatIntelligenceService } from '../security-monitoring/services/threat-intelligence.service';

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  family: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly jwtService: JwtService,
    private readonly eventService: EventService,
    private readonly accountLockout: AccountLockoutService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly securityMetrics: SecurityMetricsService,
    private readonly threatIntel: ThreatIntelligenceService,
  ) {}

  async register(
    dto: { email: string; password: string; firstName: string; lastName: string; tenantSlug?: string },
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    let tenant: Tenant;
    if (dto.tenantSlug) {
      tenant = await this.tenantRepository.findOne({ where: { slug: dto.tenantSlug } });
      if (!tenant) throw new UnauthorizedException('Tenant not found');
    } else {
      tenant = this.tenantRepository.create({
        name: `${dto.firstName}'s Organization`,
        slug: `${dto.firstName.toLowerCase()}-${Date.now()}`,
        plan: 'free',
      });
      tenant = await this.tenantRepository.save(tenant);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.TENANT_ADMIN,
      tenantId: tenant.id,
    });
    const saved = await this.userRepository.save(user);

    // Generate token pair with refresh token
    const tokenPair = await this.refreshTokenService.generateTokenPair(
      saved.id,
      saved.tenantId,
      saved.role,
      metadata,
    );

    await this.eventService.emit({
      type: 'user.registered',
      namespace: 'auth',
      payload: { userId: saved.id, email: saved.email, tenantId: saved.tenantId },
      source: 'AuthService',
      tenantId: saved.tenantId,
    });

    this.securityMetrics.recordAuthSuccess('register');

    return {
      user: saved,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      family: tokenPair.family,
    };
  }

  async login(
    dto: { email: string; password: string },
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const ip = metadata?.ip || 'unknown';

    // Check account lockout BEFORE attempting authentication
    const lockoutStatus = this.accountLockout.isAccountLocked(dto.email);
    if (lockoutStatus.locked) {
      this.logger.warn(`Login attempt on LOCKED account: ${dto.email}`);
      this.securityMetrics.recordAuthFailure('account_locked', ip);
      await this.threatIntel.recordIpEvent(ip, 'auth_failure');
      throw new UnauthorizedException(
        `Account is temporarily locked. Try again after ${new Date(lockoutStatus.lockedUntil).toISOString()}`,
      );
    }

    // Apply progressive delay if there are previous failed attempts
    const delay = this.accountLockout.getProgressiveDelay(dto.email);
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      // Record failed attempt even for non-existent accounts (prevents enumeration)
      await this.accountLockout.recordFailedAttempt(dto.email, ip);
      this.securityMetrics.recordAuthFailure('user_not_found', ip);
      await this.threatIntel.recordIpEvent(ip, 'auth_failure');
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      // Record failed attempt — may trigger lockout
      const result = await this.accountLockout.recordFailedAttempt(dto.email, ip);
      this.securityMetrics.recordAuthFailure('invalid_password', ip);
      await this.threatIntel.recordIpEvent(ip, 'auth_failure');

      if (result.locked) {
        throw new UnauthorizedException(
          `Account locked due to too many failed attempts. Try again after ${new Date(result.lockedUntil).toISOString()}`,
        );
      }

      throw new UnauthorizedException(
        `Invalid credentials. ${result.remainingAttempts} attempts remaining before lockout.`,
      );
    }

    if (!user.isActive) {
      this.securityMetrics.recordAuthFailure('account_disabled', ip);
      throw new UnauthorizedException('Account is disabled');
    }

    // Successful login — reset lockout counter
    await this.accountLockout.recordSuccessfulLogin(dto.email, ip);

    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    // Generate token pair with refresh token
    const tokenPair = await this.refreshTokenService.generateTokenPair(
      user.id,
      user.tenantId,
      user.role,
      metadata,
    );

    await this.eventService.emit({
      type: 'user.login',
      namespace: 'auth',
      payload: { userId: user.id, email: user.email },
      source: 'AuthService',
      tenantId: user.tenantId,
    });

    this.securityMetrics.recordAuthSuccess('jwt');

    return {
      user,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      family: tokenPair.family,
    };
  }

  /**
   * Refresh an access token using a refresh token.
   */
  async refreshAccessToken(
    refreshToken: string,
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<TokenPair> {
    try {
      const result = await this.refreshTokenService.rotateRefreshToken(refreshToken, metadata);
      this.securityMetrics.recordTokenRotation('success');
      return result;
    } catch (error) {
      if (error.message?.includes('reuse')) {
        this.securityMetrics.recordTokenRotation('reuse_detected');
      } else if (error.message?.includes('expired')) {
        this.securityMetrics.recordTokenRotation('expired');
      }
      throw error;
    }
  }

  /**
   * Logout from current session (revoke refresh token).
   */
  async logout(refreshToken: string): Promise<boolean> {
    return this.refreshTokenService.revokeToken(refreshToken);
  }

  /**
   * Logout from all devices.
   */
  async logoutAll(userId: string): Promise<number> {
    return this.refreshTokenService.revokeAllUserTokens(userId);
  }

  async validateUser(payload: any): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) return null;
    return user;
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    return this.jwtService.sign(payload);
  }
}
