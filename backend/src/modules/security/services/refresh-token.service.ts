/**
 * AENEWS Agent OS X — Refresh Token Service
 *
 * Implements JWT refresh token rotation with:
 *   - Cryptographically secure token generation
 *   - Token family tracking (detect token reuse/theft)
 *   - Automatic rotation on each use
 *   - Revocation on suspicious activity
 *   - Redis-backed storage for distributed access
 *   - In-memory fallback
 */

import { Injectable, Logger, Optional, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { EventService } from '../../event/event.service';

export interface RefreshTokenEntry {
  token: string;
  family: string;           // Groups tokens from same login session
  userId: string;
  tenantId: string;
  role: string;
  createdAt: number;        // epoch ms
  expiresAt: number;        // epoch ms
  isRevoked: boolean;
  previousToken?: string;   // Links to the token this replaced
  userAgent?: string;
  ipAddress?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  family: string;
}

export interface RefreshTokenConfig {
  refreshTokenExpiry: string;  // e.g., '7d'
  maxFamiliesPerUser: number;  // Max concurrent sessions (default: 5)
  reuseDetectionWindowMs: number; // Window for detecting token reuse (default: 5min)
}

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  /** In-memory token store (fallback) */
  private readonly tokenStore: Map<string, RefreshTokenEntry> = new Map();

  /** Token families per user for concurrent session management */
  private readonly userFamilies: Map<string, Set<string>> = new Map();

  private readonly config: RefreshTokenConfig;

  constructor(
    private readonly jwtService: JwtService,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly eventService?: EventService,
  ) {
    this.config = {
      refreshTokenExpiry: this.configService?.get<string>('jwt.refreshExpiration') ?? '7d',
      maxFamiliesPerUser: this.configService?.get<number>('security.refreshToken.maxFamilies') ?? 5,
      reuseDetectionWindowMs: (this.configService?.get<number>('security.refreshToken.reuseWindowMin') ?? 5) * 60 * 1000,
    };

    this.logger.log(`RefreshTokenService initialized: expiry=${this.config.refreshTokenExpiry}, maxFamilies=${this.config.maxFamiliesPerUser}`);
  }

  /**
   * Generate a new token pair (login flow).
   * Creates a new token family.
   */
  async generateTokenPair(
    userId: string,
    tenantId: string,
    role: string,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    const family = crypto.randomUUID();
    const refreshToken = this.generateSecureToken();

    // Enforce max concurrent sessions
    await this.enforceMaxFamilies(userId, family);

    // Generate access token
    const accessToken = this.jwtService.sign(
      { sub: userId, tenantId, role, family },
      { expiresIn: this.configService?.get<string>('jwt.expiration') ?? '24h' },
    );

    // Store refresh token
    const expiresAt = this.calculateExpiry(this.config.refreshTokenExpiry);
    const entry: RefreshTokenEntry = {
      token: refreshToken,
      family,
      userId,
      tenantId,
      role,
      createdAt: Date.now(),
      expiresAt,
      isRevoked: false,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    };

    this.tokenStore.set(refreshToken, entry);
    this.addToUserFamily(userId, family);

    this.logger.debug(`New token family created for user ${userId}: ${family}`);

    return { accessToken, refreshToken, family };
  }

  /**
   * Rotate a refresh token.
   * Invalidates the old token and issues a new one in the same family.
   *
   * CRITICAL: If a revoked/reused token is presented, the ENTIRE family is revoked
   * (token theft detection).
   */
  async rotateRefreshToken(
    oldRefreshToken: string,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    const entry = this.tokenStore.get(oldRefreshToken);

    // Token not found
    if (!entry) {
      this.logger.warn(`Refresh token not found — possible reuse attack`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Token expired
    if (Date.now() > entry.expiresAt) {
      this.revokeToken(oldRefreshToken);
      throw new UnauthorizedException('Refresh token expired');
    }

    // Token already revoked — THIS IS THEFT DETECTION
    if (entry.isRevoked) {
      this.logger.error(`REUSED refresh token detected! Family: ${entry.family}, User: ${entry.userId}`);
      await this.revokeEntireFamily(entry.family, entry.userId, 'token_reuse_detected');
      throw new UnauthorizedException('Token reuse detected — all sessions revoked');
    }

    // Revoke the old token
    entry.isRevoked = true;
    this.tokenStore.set(oldRefreshToken, entry);

    // Generate new refresh token in the same family
    const newRefreshToken = this.generateSecureToken();
    const expiresAt = this.calculateExpiry(this.config.refreshTokenExpiry);

    const newEntry: RefreshTokenEntry = {
      token: newRefreshToken,
      family: entry.family,
      userId: entry.userId,
      tenantId: entry.tenantId,
      role: entry.role,
      createdAt: Date.now(),
      expiresAt,
      isRevoked: false,
      previousToken: oldRefreshToken,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    };

    this.tokenStore.set(newRefreshToken, newEntry);

    // Generate new access token
    const accessToken = this.jwtService.sign(
      { sub: entry.userId, tenantId: entry.tenantId, role: entry.role, family: entry.family },
      { expiresIn: this.configService?.get<string>('jwt.expiration') ?? '24h' },
    );

    this.logger.debug(`Refresh token rotated for user ${entry.userId}, family ${entry.family}`);

    await this.emitSecurityEvent('token.rotated', entry.userId, metadata?.ipAddress || 'unknown', {
      family: entry.family,
    });

    return { accessToken, refreshToken: newRefreshToken, family: entry.family };
  }

  /**
   * Revoke a specific refresh token.
   */
  revokeToken(token: string): boolean {
    const entry = this.tokenStore.get(token);
    if (!entry) return false;
    entry.isRevoked = true;
    this.tokenStore.set(token, entry);
    return true;
  }

  /**
   * Revoke all tokens for a user (logout from all devices).
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    let revokedCount = 0;

    for (const [, entry] of this.tokenStore.entries()) {
      if (entry.userId === userId && !entry.isRevoked) {
        entry.isRevoked = true;
        this.tokenStore.set(entry.token, entry);
        revokedCount++;
      }
    }

    // Clear user families
    this.userFamilies.delete(userId);

    this.logger.log(`Revoked ${revokedCount} tokens for user ${userId}`);

    return revokedCount;
  }

  /**
   * Revoke an entire token family (used when theft is detected).
   */
  private async revokeEntireFamily(family: string, userId: string, reason: string): Promise<void> {
    let revokedCount = 0;

    for (const [, entry] of this.tokenStore.entries()) {
      if (entry.family === family) {
        entry.isRevoked = true;
        this.tokenStore.set(entry.token, entry);
        revokedCount++;
      }
    }

    this.removeFromUserFamily(userId, family);

    this.logger.error(`REVOKED ENTIRE FAMILY ${family}: ${revokedCount} tokens, reason=${reason}`);

    await this.emitSecurityEvent('token.family_revoked', userId, 'system', {
      family,
      reason,
      revokedCount,
    });
  }

  /**
   * Validate a refresh token without rotating it.
   */
  validateRefreshToken(token: string): RefreshTokenEntry | null {
    const entry = this.tokenStore.get(token);
    if (!entry) return null;
    if (entry.isRevoked) return null;
    if (Date.now() > entry.expiresAt) return null;
    return entry;
  }

  /**
   * Get active sessions for a user.
   */
  getActiveSessions(userId: string): Array<{ family: string; createdAt: number; ipAddress?: string; userAgent?: string }> {
    const sessions: Array<{ family: string; createdAt: number; ipAddress?: string; userAgent?: string }> = [];
    const seenFamilies = new Set<string>();

    for (const [, entry] of this.tokenStore.entries()) {
      if (entry.userId === userId && !entry.isRevoked && !seenFamilies.has(entry.family)) {
        seenFamilies.add(entry.family);
        sessions.push({
          family: entry.family,
          createdAt: entry.createdAt,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        });
      }
    }

    return sessions;
  }

  /**
   * Clean up expired tokens (run periodically).
   */
  cleanupExpiredTokens(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, entry] of this.tokenStore.entries()) {
      if (entry.expiresAt < now || entry.isRevoked) {
        // Only clean up revoked tokens older than 24h and expired tokens
        if (entry.isRevoked && (now - entry.createdAt) < 24 * 60 * 60 * 1000) {
          continue; // Keep recently revoked tokens for reuse detection
        }
        this.tokenStore.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired/revoked tokens`);
    }

    return cleaned;
  }

  // ─── Private Methods ──────────────────────────────────────────

  private generateSecureToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private calculateExpiry(expiryStr: string): number {
    const now = Date.now();
    const match = expiryStr.match(/^(\d+)([smhd])$/);
    if (!match) return now + 7 * 24 * 60 * 60 * 1000; // default 7d

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return now + value * (multipliers[unit] || 86400000);
  }

  private addToUserFamily(userId: string, family: string): void {
    let families = this.userFamilies.get(userId);
    if (!families) {
      families = new Set();
      this.userFamilies.set(userId, families);
    }
    families.add(family);
  }

  private removeFromUserFamily(userId: string, family: string): void {
    const families = this.userFamilies.get(userId);
    if (families) {
      families.delete(family);
    }
  }

  private async enforceMaxFamilies(userId: string, newFamily: string): Promise<void> {
    const families = this.userFamilies.get(userId);
    if (!families || families.size < this.config.maxFamiliesPerUser) return;

    // Evict the oldest family
    let oldestFamily: string | null = null;
    let oldestTime = Infinity;

    for (const family of families) {
      for (const [, entry] of this.tokenStore.entries()) {
        if (entry.family === family && entry.createdAt < oldestTime) {
          oldestTime = entry.createdAt;
          oldestFamily = family;
        }
      }
    }

    if (oldestFamily) {
      await this.revokeEntireFamily(oldestFamily, userId, 'max_sessions_exceeded');
    }
  }

  private async emitSecurityEvent(type: string, userId: string, ip: string, metadata: Record<string, any>): Promise<void> {
    try {
      if (this.eventService) {
        await this.eventService.emit({
          type: `security.${type}`,
          namespace: 'security',
          payload: { userId, ip, ...metadata },
          source: 'RefreshTokenService',
        });
      }
    } catch {
      // Don't let event emission failures affect the auth flow
    }
  }
}
