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
import { TotpService } from '../security/services/totp.service';
import { EncryptionService } from '../security/services/encryption.service';

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  family: string;
}

/**
 * Result when login requires 2FA verification.
 * The client must submit the tempToken along with a TOTP code
 * to the /auth/login/2fa endpoint to complete authentication.
 */
export interface Login2faRequired {
  requires2FA: true;
  tempToken: string;
  message: string;
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
    private readonly totpService: TotpService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async register(
    dto: { email: string; password: string; firstName: string; lastName: string; tenantSlug?: string },
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    let tenant: Tenant;
    if (dto.tenantSlug) {
      const found = await this.tenantRepository.findOne({ where: { slug: dto.tenantSlug } });
      if (!found) throw new UnauthorizedException('Tenant not found');
      tenant = found;
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

  /**
   * Login with email and password.
   *
   * If the user has TOTP enabled, returns a short-lived temporary token
   * instead of the full login result. The client must then call
   * loginStep2() with the tempToken and a valid TOTP code.
   *
   * If the user does not have TOTP enabled, returns the full login result
   * immediately (backward compatible).
   */
  async login(
    dto: { email: string; password: string },
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<LoginResult | Login2faRequired> {
    const ip = metadata?.ip || 'unknown';

    // Check account lockout BEFORE attempting authentication
    const lockoutStatus = await this.accountLockout.isAccountLocked(dto.email);
    if (lockoutStatus.locked) {
      this.logger.warn(`Login attempt on LOCKED account: ${dto.email}`);
      this.securityMetrics.recordAuthFailure('account_locked', ip);
      await this.threatIntel.recordIpEvent(ip, 'auth_failure');
      throw new UnauthorizedException(
        `Account is temporarily locked. Try again after ${lockoutStatus.lockedUntil ? new Date(lockoutStatus.lockedUntil).toISOString() : 'later'}`,
      );
    }

    // Apply progressive delay if there are previous failed attempts
    const delay = await this.accountLockout.getProgressiveDelay(dto.email);
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
          `Account locked due to too many failed attempts. Try again after ${result.lockedUntil ? new Date(result.lockedUntil).toISOString() : 'later'}`,
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

    // ─── TOTP CHECK ───────────────────────────────────────────
    // If user has TOTP enabled, return a short-lived temp token
    // instead of the full login credentials
    if (user.totpEnabled && user.totpSecret) {
      this.logger.debug(`User ${user.id} has TOTP enabled — requiring 2FA step`);

      const tempToken = this.jwtService.sign(
        { sub: user.id, step: '2fa', tenantId: user.tenantId, role: user.role },
        { expiresIn: '5m' }, // Short-lived: 5 minutes
      );

      await this.eventService.emit({
        type: 'user.login.2fa_required',
        namespace: 'auth',
        payload: { userId: user.id, email: user.email },
        source: 'AuthService',
        tenantId: user.tenantId,
      });

      return {
        requires2FA: true,
        tempToken,
        message: 'Two-factor authentication required. Please provide your TOTP code.',
      };
    }

    // ─── STANDARD LOGIN (no 2FA) ─────────────────────────────
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
   * Complete the second step of the 2FA login flow.
   *
   * Validates the temporary token from step 1, verifies the TOTP code
   * (or backup code), and issues the real access + refresh tokens.
   *
   * @param tempToken - The short-lived JWT from login step 1
   * @param code - 6-digit TOTP code or 8-character backup code
   * @param metadata - Request metadata (IP, user agent)
   * @returns Full login result with access and refresh tokens
   *
   * @example
   * ```ts
   * const result = await authService.loginStep2(tempToken, '123456', { ip: '1.2.3.4' });
   * ```
   */
  async loginStep2(
    tempToken: string,
    code: string,
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<LoginResult> {
    // Verify the temporary token
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired temporary token. Please login again.');
    }

    // Validate the token is a 2FA step token
    if (payload.step !== '2fa') {
      throw new UnauthorizedException('Invalid token type. Expected 2FA step token.');
    }

    const userId = payload.sub;
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or account is disabled');
    }

    if (!user.totpEnabled || !user.totpSecret) {
      throw new UnauthorizedException('TOTP is not enabled for this account');
    }

    // Decrypt the TOTP secret and verify the code (totpSecret is guaranteed non-null after check above)
    const decryptedSecret = this.totpService.decryptSecret(user.totpSecret!);
    const isTotpValid = this.totpService.verifyToken(decryptedSecret, code);

    if (!isTotpValid) {
      // Try backup code
      const allBackupCodeHashes: string[] = user.totpBackupCodes
        ? JSON.parse(user.totpBackupCodes)
        : [];
      const usedBackupCodeHashes: string[] = user.totpUsedBackupCodes
        ? JSON.parse(user.totpUsedBackupCodes)
        : [];

      const backupResult = await this.totpService.validateBackupCode(
        usedBackupCodeHashes,
        allBackupCodeHashes,
        code,
      );

      if (!backupResult.valid) {
        this.securityMetrics.recordAuthFailure('invalid_2fa_code', metadata?.ip || 'unknown');

        await this.eventService.emit({
          type: 'user.login.2fa_failed',
          namespace: 'auth',
          payload: { userId: user.id, email: user.email, method: 'totp' },
          source: 'AuthService',
          tenantId: user.tenantId,
        });

        throw new UnauthorizedException('Invalid TOTP code or backup code');
      }

      // Backup code was valid — update used codes in database
      if (backupResult.usedBackupCodes) {
        await this.userRepository.update(userId, {
          totpUsedBackupCodes: JSON.stringify(backupResult.usedBackupCodes),
        });
      }

      this.logger.log(`User ${userId} authenticated via backup code during 2FA login`);

      await this.eventService.emit({
        type: 'user.login.2fa_backup',
        namespace: 'auth',
        payload: { userId: user.id, email: user.email },
        source: 'AuthService',
        tenantId: user.tenantId,
      });
    } else {
      this.logger.debug(`User ${userId} authenticated via TOTP code during 2FA login`);

      await this.eventService.emit({
        type: 'user.login.2fa_success',
        namespace: 'auth',
        payload: { userId: user.id, email: user.email },
        source: 'AuthService',
        tenantId: user.tenantId,
      });
    }

    // Issue the real access + refresh tokens
    const tokenPair = await this.refreshTokenService.generateTokenPair(
      user.id,
      user.tenantId,
      user.role,
      metadata,
    );

    this.securityMetrics.recordAuthSuccess('jwt_2fa');

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
    } catch (error: any) {
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

  async validateUser(payload: any): Promise<User | null> {
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
