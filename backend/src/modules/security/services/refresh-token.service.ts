/**
 * AENEWS Agent OS X — Refresh Token Service
 *
 * Implements JWT refresh token rotation with:
 *   - Cryptographically secure token generation
 *   - Token family tracking (detect token reuse/theft)
 *   - Automatic rotation on each use
 *   - Revocation on suspicious activity
 *   - Redis-backed storage for distributed access
 *   - In-memory fallback when Redis is unavailable
 */

import { Injectable, Logger, Optional, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import Redis from 'ioredis';
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

/** Redis key prefixes */
const TOKEN_PREFIX = 'refresh_token:';
const USER_FAMILIES_PREFIX = 'refresh_user_families:';
const FAMILY_TOKENS_PREFIX = 'refresh_family_tokens:';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  /** In-memory token store (fallback when Redis unavailable) */
  private readonly fallbackTokenStore: Map<string, RefreshTokenEntry> = new Map();

  /** In-memory user families (fallback when Redis unavailable) */
  private readonly fallbackUserFamilies: Map<string, Set<string>> = new Map();

  /** Whether Redis is currently available */
  private redisAvailable = true;

  private readonly config: RefreshTokenConfig;

  constructor(
    private readonly jwtService: JwtService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly eventService?: EventService,
  ) {
    this.config = {
      refreshTokenExpiry: this.configService?.get<string>('jwt.refreshExpiration') ?? '7d',
      maxFamiliesPerUser: this.configService?.get<number>('security.refreshToken.maxFamilies') ?? 5,
      reuseDetectionWindowMs: (this.configService?.get<number>('security.refreshToken.reuseWindowMin') ?? 5) * 60 * 1000,
    };

    this.checkRedisConnection();

    this.logger.log(`RefreshTokenService initialized: expiry=${this.config.refreshTokenExpiry}, maxFamilies=${this.config.maxFamiliesPerUser}, redis=${this.redisAvailable}`);
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
      { expiresIn: (this.configService?.get<string>('jwt.expiration') ?? '24h') as any },
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

    await this.storeTokenEntry(entry);
    await this.addToUserFamily(userId, family);

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
    const entry = await this.getTokenEntry(oldRefreshToken);

    // Token not found
    if (!entry) {
      this.logger.warn(`Refresh token not found — possible reuse attack`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Token expired
    if (Date.now() > entry.expiresAt) {
      await this.revokeToken(oldRefreshToken);
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
    await this.storeTokenEntry(entry);

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

    await this.storeTokenEntry(newEntry);

    // Generate new access token
    const accessToken = this.jwtService.sign(
      { sub: entry.userId, tenantId: entry.tenantId, role: entry.role, family: entry.family },
      { expiresIn: (this.configService?.get<string>('jwt.expiration') ?? '24h') as any },
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
  async revokeToken(token: string): Promise<boolean> {
    const entry = await this.getTokenEntry(token);
    if (!entry) return false;
    entry.isRevoked = true;
    await this.storeTokenEntry(entry);
    return true;
  }

  /**
   * Revoke all tokens for a user (logout from all devices).
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    let revokedCount = 0;

    if (this.redisAvailable) {
      try {
        // Get all families for the user
        const familyIds = await this.getUserFamilies(userId);

        for (const familyId of familyIds) {
          // Get all tokens in this family and revoke them
          const tokenKeys = await this.getFamilyTokens(familyId);
          for (const tokenKey of tokenKeys) {
            const entry = await this.getTokenEntry(tokenKey);
            if (entry && !entry.isRevoked) {
              entry.isRevoked = true;
              await this.storeTokenEntry(entry);
              revokedCount++;
            }
          }
        }

        // Clear user families from Redis
        await this.redis.del(`${USER_FAMILIES_PREFIX}${userId}`);
      } catch (error) {
        this.handleRedisError('revokeAllUserTokens', error);
        return this.revokeAllUserTokensFallback(userId);
      }
    } else {
      return this.revokeAllUserTokensFallback(userId);
    }

    this.logger.log(`Revoked ${revokedCount} tokens for user ${userId}`);

    return revokedCount;
  }

  /**
   * Revoke an entire token family (used when theft is detected).
   */
  private async revokeEntireFamily(family: string, userId: string, reason: string): Promise<void> {
    let revokedCount = 0;

    if (this.redisAvailable) {
      try {
        const tokenKeys = await this.getFamilyTokens(family);

        for (const tokenKey of tokenKeys) {
          const entry = await this.getTokenEntry(tokenKey);
          if (entry) {
            entry.isRevoked = true;
            await this.storeTokenEntry(entry);
            revokedCount++;
          }
        }
      } catch (error) {
        this.handleRedisError('revokeEntireFamily', error);
        // Fallback: revoke from in-memory store
        for (const [, entry] of this.fallbackTokenStore.entries()) {
          if (entry.family === family) {
            entry.isRevoked = true;
            this.fallbackTokenStore.set(entry.token, entry);
            revokedCount++;
          }
        }
      }
    } else {
      for (const [, entry] of this.fallbackTokenStore.entries()) {
        if (entry.family === family) {
          entry.isRevoked = true;
          this.fallbackTokenStore.set(entry.token, entry);
          revokedCount++;
        }
      }
    }

    await this.removeFromUserFamily(userId, family);

    this.logger.error(`REVOKED ENTIRE FAMILY ${family}: ${revokedCount} tokens, reason=${reason}`);

    await this.emitSecurityEvent('token.family_revoked', userId, 'system', {
      family,
      reason,
      revokedCount,
    });
  }

  /**
   * Revoke an entire token family by family ID (public API for admin use).
   * Used by SecurityController for admin-initiated family revocation.
   */
  async revokeTokenFamily(family: string, revokedBy: string): Promise<{ family: string; revokedCount: number }> {
    let revokedCount = 0;
    let userId = '';

    if (this.redisAvailable) {
      try {
        const tokenKeys = await this.getFamilyTokens(family);

        for (const tokenKey of tokenKeys) {
          const entry = await this.getTokenEntry(tokenKey);
          if (entry) {
            if (!userId) userId = entry.userId;
            entry.isRevoked = true;
            await this.storeTokenEntry(entry);
            revokedCount++;
          }
        }
      } catch (error) {
        this.handleRedisError('revokeTokenFamily', error);
        // Fallback
        for (const [, entry] of this.fallbackTokenStore.entries()) {
          if (entry.family === family) {
            if (!userId) userId = entry.userId;
            entry.isRevoked = true;
            this.fallbackTokenStore.set(entry.token, entry);
            revokedCount++;
          }
        }
      }
    } else {
      for (const [, entry] of this.fallbackTokenStore.entries()) {
        if (entry.family === family) {
          if (!userId) userId = entry.userId;
          entry.isRevoked = true;
          this.fallbackTokenStore.set(entry.token, entry);
          revokedCount++;
        }
      }
    }

    if (userId) {
      await this.removeFromUserFamily(userId, family);
    }

    this.logger.warn(`Token family ${family} revoked by admin ${revokedBy}: ${revokedCount} tokens revoked`);

    await this.emitSecurityEvent('token.family_revoked', userId || 'unknown', 'admin', {
      family,
      reason: 'admin_revocation',
      revokedBy,
      revokedCount,
    });

    return { family, revokedCount };
  }

  /**
   * Validate a refresh token without rotating it.
   */
  async validateRefreshToken(token: string): Promise<RefreshTokenEntry | null> {
    const entry = await this.getTokenEntry(token);
    if (!entry) return null;
    if (entry.isRevoked) return null;
    if (Date.now() > entry.expiresAt) return null;
    return entry;
  }

  /**
   * Get active sessions for a user.
   */
  async getActiveSessions(userId: string): Promise<Array<{ family: string; createdAt: number; ipAddress?: string; userAgent?: string }>> {
    const sessions: Array<{ family: string; createdAt: number; ipAddress?: string; userAgent?: string }> = [];
    const seenFamilies = new Set<string>();

    if (this.redisAvailable) {
      try {
        const familyIds = await this.getUserFamilies(userId);

        for (const familyId of familyIds) {
          const tokenKeys = await this.getFamilyTokens(familyId);
          for (const tokenKey of tokenKeys) {
            const entry = await this.getTokenEntry(tokenKey);
            if (entry && !entry.isRevoked && !seenFamilies.has(entry.family)) {
              seenFamilies.add(entry.family);
              sessions.push({
                family: entry.family,
                createdAt: entry.createdAt,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
              });
            }
          }
        }
      } catch (error) {
        this.handleRedisError('getActiveSessions', error);
        return this.getActiveSessionsFallback(userId);
      }
    } else {
      return this.getActiveSessionsFallback(userId);
    }

    return sessions;
  }

  /**
   * Clean up expired tokens (run periodically).
   */
  async cleanupExpiredTokens(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    if (this.redisAvailable) {
      try {
        // Scan for all refresh token keys
        const stream = this.redis.scanStream({
          match: `${TOKEN_PREFIX}*`,
          count: 100,
        });

        const tokensToDelete: string[] = [];

        await new Promise<void>((resolve, reject) => {
          stream.on('data', (keys: string[]) => {
            for (const key of keys) {
              tokensToDelete.push(key);
            }
          });
          stream.on('end', resolve);
          stream.on('error', reject);
        });

        // Check each token for expiration
        for (const key of tokensToDelete) {
          const raw = await this.redis.get(key);
          if (!raw) continue;
          try {
            const entry: RefreshTokenEntry = JSON.parse(raw);
            if (entry.expiresAt < now || entry.isRevoked) {
              // Only clean up revoked tokens older than 24h and expired tokens
              if (entry.isRevoked && (now - entry.createdAt) < 24 * 60 * 60 * 1000) {
                continue; // Keep recently revoked tokens for reuse detection
              }
              await this.redis.del(key);
              // Also remove from family tokens set
              await this.redis.srem(`${FAMILY_TOKENS_PREFIX}${entry.family}`, entry.token);
              cleaned++;
            }
          } catch {
            // Malformed entry, clean it up
            await this.redis.del(key);
            cleaned++;
          }
        }
      } catch (error) {
        this.handleRedisError('cleanupExpiredTokens', error);
        return this.cleanupExpiredTokensFallback();
      }
    } else {
      return this.cleanupExpiredTokensFallback();
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired/revoked tokens`);
    }

    return cleaned;
  }

  // ─── Redis Access Methods ────────────────────────────────────────

  private async storeTokenEntry(entry: RefreshTokenEntry): Promise<void> {
    const key = `${TOKEN_PREFIX}${entry.token}`;
    const familyKey = `${FAMILY_TOKENS_PREFIX}${entry.family}`;
    const ttlSeconds = Math.max(1, Math.ceil((entry.expiresAt - Date.now()) / 1000) + 86400); // TTL = expiry + 24h buffer for reuse detection

    if (this.redisAvailable) {
      try {
        const pipeline = this.redis.pipeline();
        pipeline.set(key, JSON.stringify(entry), 'EX', ttlSeconds);
        pipeline.sadd(familyKey, entry.token);
        pipeline.expire(familyKey, ttlSeconds);
        await pipeline.exec();
      } catch (error) {
        this.handleRedisError('storeTokenEntry', error);
        // Fallback to in-memory
        this.fallbackTokenStore.set(entry.token, entry);
      }
    } else {
      this.fallbackTokenStore.set(entry.token, entry);
    }
  }

  private async getTokenEntry(token: string): Promise<RefreshTokenEntry | null> {
    if (this.redisAvailable) {
      try {
        const raw = await this.redis.get(`${TOKEN_PREFIX}${token}`);
        if (!raw) return null;
        return JSON.parse(raw) as RefreshTokenEntry;
      } catch (error) {
        this.handleRedisError('getTokenEntry', error);
        return this.fallbackTokenStore.get(token) ?? null;
      }
    } else {
      return this.fallbackTokenStore.get(token) ?? null;
    }
  }

  private async getUserFamilies(userId: string): Promise<string[]> {
    if (this.redisAvailable) {
      try {
        return await this.redis.smembers(`${USER_FAMILIES_PREFIX}${userId}`);
      } catch (error) {
        this.handleRedisError('getUserFamilies', error);
        return Array.from(this.fallbackUserFamilies.get(userId) ?? []);
      }
    } else {
      return Array.from(this.fallbackUserFamilies.get(userId) ?? []);
    }
  }

  private async getFamilyTokens(familyId: string): Promise<string[]> {
    if (this.redisAvailable) {
      try {
        return await this.redis.smembers(`${FAMILY_TOKENS_PREFIX}${familyId}`);
      } catch (error) {
        this.handleRedisError('getFamilyTokens', error);
        // Fallback: scan in-memory store
        const tokens: string[] = [];
        for (const [token, entry] of this.fallbackTokenStore.entries()) {
          if (entry.family === familyId) {
            tokens.push(token);
          }
        }
        return tokens;
      }
    } else {
      const tokens: string[] = [];
      for (const [token, entry] of this.fallbackTokenStore.entries()) {
        if (entry.family === familyId) {
          tokens.push(token);
        }
      }
      return tokens;
    }
  }

  private async addToUserFamily(userId: string, family: string): Promise<void> {
    if (this.redisAvailable) {
      try {
        await this.redis.sadd(`${USER_FAMILIES_PREFIX}${userId}`, family);
      } catch (error) {
        this.handleRedisError('addToUserFamily', error);
        this.addToUserFamilyFallback(userId, family);
      }
    } else {
      this.addToUserFamilyFallback(userId, family);
    }
  }

  private async removeFromUserFamily(userId: string, family: string): Promise<void> {
    if (this.redisAvailable) {
      try {
        await this.redis.srem(`${USER_FAMILIES_PREFIX}${userId}`, family);
      } catch (error) {
        this.handleRedisError('removeFromUserFamily', error);
        this.removeFromUserFamilyFallback(userId, family);
      }
    } else {
      this.removeFromUserFamilyFallback(userId, family);
    }
  }

  // ─── Fallback Methods (In-Memory) ────────────────────────────────

  private addToUserFamilyFallback(userId: string, family: string): void {
    let families = this.fallbackUserFamilies.get(userId);
    if (!families) {
      families = new Set();
      this.fallbackUserFamilies.set(userId, families);
    }
    families.add(family);
  }

  private removeFromUserFamilyFallback(userId: string, family: string): void {
    const families = this.fallbackUserFamilies.get(userId);
    if (families) {
      families.delete(family);
    }
  }

  private async revokeAllUserTokensFallback(userId: string): Promise<number> {
    let revokedCount = 0;
    for (const [, entry] of this.fallbackTokenStore.entries()) {
      if (entry.userId === userId && !entry.isRevoked) {
        entry.isRevoked = true;
        this.fallbackTokenStore.set(entry.token, entry);
        revokedCount++;
      }
    }
    this.fallbackUserFamilies.delete(userId);
    this.logger.log(`Revoked ${revokedCount} tokens for user ${userId} (fallback)`);
    return revokedCount;
  }

  private getActiveSessionsFallback(userId: string): Array<{ family: string; createdAt: number; ipAddress?: string; userAgent?: string }> {
    const sessions: Array<{ family: string; createdAt: number; ipAddress?: string; userAgent?: string }> = [];
    const seenFamilies = new Set<string>();

    for (const [, entry] of this.fallbackTokenStore.entries()) {
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

  private cleanupExpiredTokensFallback(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, entry] of this.fallbackTokenStore.entries()) {
      if (entry.expiresAt < now || entry.isRevoked) {
        if (entry.isRevoked && (now - entry.createdAt) < 24 * 60 * 60 * 1000) {
          continue;
        }
        this.fallbackTokenStore.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired/revoked tokens (fallback)`);
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
    const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return now + value * (multipliers[unit] || 86400000);
  }

  private async enforceMaxFamilies(userId: string, newFamily: string): Promise<void> {
    const familyIds = await this.getUserFamilies(userId);
    if (!familyIds || familyIds.length < this.config.maxFamiliesPerUser) return;

    // Evict the oldest family
    let oldestFamily: string | null = null;
    let oldestTime = Infinity;

    for (const family of familyIds) {
      const tokenKeys = await this.getFamilyTokens(family);
      for (const tokenKey of tokenKeys) {
        const entry = await this.getTokenEntry(tokenKey);
        if (entry && entry.createdAt < oldestTime) {
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

  // ─── Redis Health / Error Handling ────────────────────────────

  private async checkRedisConnection(): Promise<void> {
    try {
      await this.redis.ping();
      this.redisAvailable = true;
    } catch {
      this.redisAvailable = false;
      this.logger.warn('Redis unavailable — RefreshTokenService falling back to in-memory store');
    }
  }

  private handleRedisError(operation: string, error: any): void {
    if (this.redisAvailable) {
      this.redisAvailable = false;
      this.logger.error(`Redis error during ${operation}: ${error?.message ?? error}. Falling back to in-memory store.`);
      // Schedule a reconnection check
      this.scheduleRedisReconnect();
    }
  }

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private scheduleRedisReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.redis.ping();
        this.redisAvailable = true;
        this.logger.log('Redis connection restored — RefreshTokenService back to Redis mode');
      } catch {
        // Still down, schedule another check
        this.scheduleRedisReconnect();
      }
    }, 5000);
  }
}
