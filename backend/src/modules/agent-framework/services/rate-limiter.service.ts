import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';

// ─── Rate Limit Types ────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Maximum number of points (requests) allowed */
  points: number;
  /** Duration window in seconds */
  duration: number;
  /** Block duration in seconds when limit is exceeded */
  blockDuration: number;
}

export interface RateLimitResult {
  /** Whether the request was allowed */
  allowed: boolean;
  /** Remaining points in the current window */
  remaining: number;
  /** Total points allowed */
  limit: number;
  /** Seconds until the limit resets */
  resetInSeconds: number;
  /** Seconds until the block expires (0 if not blocked) */
  retryAfter: number;
}

export interface RateLimitBlockEvent {
  key: string;
  config: RateLimitConfig;
  remaining: number;
  retryAfter: number;
  timestamp: Date;
}

// ─── In-Memory Bucket ────────────────────────────────────────────────

interface RateBucket {
  points: number;
  expiresAt: number;
  blockedUntil: number;
}

// ─── Pre-Configured Limits ───────────────────────────────────────────

const PRE_CONFIGURED_LIMITS: Record<string, RateLimitConfig> = {
  'cluster:default':   { points: 100, duration: 60, blockDuration: 60 },
  'agent:default':     { points: 30,  duration: 60, blockDuration: 30 },
  'llm:default':       { points: 20,  duration: 60, blockDuration: 120 },
  'tenant:default':    { points: 500, duration: 60, blockDuration: 60 },
  'user:default':      { points: 100, duration: 60, blockDuration: 30 },
};

// ─── Service ──────────────────────────────────────────────────────────

/**
 * RateLimiterService — fine-grained rate limiting beyond the global ThrottlerGuard.
 *
 * Features:
 *   - In-memory bucket-based rate limiting (always available)
 *   - Redis-backed distributed rate limiting (when Redis is available)
 *   - Pre-configured limits per domain (cluster, agent, LLM, tenant, user)
 *   - Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 *   - Event emission when limits are exceeded
 *   - Configurable via environment variables
 */
@Injectable()
export class RateLimiterService implements OnModuleInit {
  private readonly logger = new Logger(RateLimiterService.name);

  /** In-memory buckets (fallback when Redis is unavailable) */
  private readonly buckets = new Map<string, RateBucket>();

  /** Per-key rate limit configurations */
  private readonly configs = new Map<string, RateLimitConfig>();

  /** Redis client for distributed rate limiting (optional) */
  private redis: Redis | null = null;

  /** Whether Redis is available for rate limiting */
  private redisAvailable = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly emitter: EventEmitter2,
  ) {
    this.loadPreConfiguredLimits();
  }

  async onModuleInit(): Promise<void> {
    await this.initializeRedis();
    this.logger.log(
      `Rate Limiter initialized — mode: ${this.redisAvailable ? 'Redis' : 'in-memory'}, ` +
        `pre-configured limits: ${this.configs.size}`,
    );
  }

  // ─── Redis Initialization ───────────────────────────────────────

  private async initializeRedis(): Promise<void> {
    try {
      const host = this.configService.get<string>('redis.host', 'localhost');
      const port = this.configService.get<number>('redis.port', 6379);
      const password = this.configService.get<string>('redis.password') || undefined;
      const db = this.configService.get<number>('redis.db', 0);

      this.redis = new Redis({
        host,
        port,
        password,
        db,
        connectTimeout: 5000,
        commandTimeout: 3000,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis retry limit reached — falling back to in-memory rate limiting');
            return null; // stop retrying
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });

      await this.redis.connect();
      await this.redis.ping();

      this.redisAvailable = true;
      this.logger.log('Redis connected for distributed rate limiting');
    } catch (error: any) {
      this.logger.warn(
        `Redis not available for rate limiting — using in-memory fallback: ${error.message}`,
      );
      this.redisAvailable = false;
      this.redis = null;
    }
  }

  // ─── Public API ─────────────────────────────────────────────────

  /**
   * Consume rate limit points for a given key.
   * Returns the rate limit result including remaining capacity.
   *
   * @param key     Rate limit key (e.g., "cluster:browser", "llm:openai", "tenant:123")
   * @param points  Number of points to consume (default: 1)
   */
  async consume(key: string, points: number = 1): Promise<RateLimitResult> {
    const config = this.getEffectiveConfig(key);
    const now = Date.now();
    const nowSeconds = Math.floor(now / 1000);

    if (this.redisAvailable && this.redis) {
      return this.consumeRedis(key, points, config, nowSeconds);
    }

    return this.consumeInMemory(key, points, config, now);
  }

  /**
   * Check remaining capacity without consuming points.
   */
  async getRemaining(key: string): Promise<RateLimitResult> {
    const config = this.getEffectiveConfig(key);
    const now = Date.now();
    const nowSeconds = Math.floor(now / 1000);

    if (this.redisAvailable && this.redis) {
      return this.getRemainingRedis(key, config, nowSeconds);
    }

    return this.getRemainingInMemory(key, config, now);
  }

  /**
   * Set or update the rate limit configuration for a key.
   */
  setLimit(key: string, config: RateLimitConfig): void {
    this.configs.set(key, config);
    this.logger.debug(`Rate limit configured for "${key}": ${config.points} req/${config.duration}s`);
  }

  /**
   * Get all currently blocked keys (for monitoring).
   */
  getBlockedKeys(): Array<{ key: string; retryAfter: number }> {
    const now = Date.now();
    const result: Array<{ key: string; retryAfter: number }> = [];

    for (const [key, bucket] of this.buckets) {
      if (bucket.blockedUntil > now) {
        result.push({
          key,
          retryAfter: Math.ceil((bucket.blockedUntil - now) / 1000),
        });
      }
    }

    return result;
  }

  /**
   * Get all configured rate limits (for monitoring).
   */
  getAllConfigs(): Map<string, RateLimitConfig> {
    return new Map(this.configs);
  }

  /**
   * Clear rate limit state for a specific key (admin action).
   */
  async resetKey(key: string): Promise<void> {
    this.buckets.delete(key);

    if (this.redisAvailable && this.redis) {
      try {
        await this.redis.del(`ratelimit:${key}`);
        await this.redis.del(`ratelimit:block:${key}`);
      } catch {
        // Ignore Redis errors — in-memory state is already cleared
      }
    }
  }

  // ─── In-Memory Implementation ───────────────────────────────────

  private consumeInMemory(
    key: string,
    points: number,
    config: RateLimitConfig,
    now: number,
  ): RateLimitResult {
    let bucket = this.buckets.get(key);

    if (!bucket || bucket.expiresAt <= now) {
      // Create or reset the bucket
      bucket = {
        points: config.points,
        expiresAt: now + config.duration * 1000,
        blockedUntil: 0,
      };
    }

    // Check if currently blocked
    if (bucket.blockedUntil > now) {
      const retryAfter = Math.ceil((bucket.blockedUntil - now) / 1000);
      this.emitBlockEvent(key, config, 0, retryAfter);
      return {
        allowed: false,
        remaining: 0,
        limit: config.points,
        resetInSeconds: Math.ceil((bucket.expiresAt - now) / 1000),
        retryAfter,
      };
    }

    // Consume points
    bucket.points -= points;

    const resetInSeconds = Math.ceil((bucket.expiresAt - now) / 1000);

    if (bucket.points < 0) {
      // Limit exceeded — block
      bucket.blockedUntil = now + config.blockDuration * 1000;
      this.buckets.set(key, bucket);

      const retryAfter = config.blockDuration;
      this.emitBlockEvent(key, config, 0, retryAfter);

      return {
        allowed: false,
        remaining: 0,
        limit: config.points,
        resetInSeconds,
        retryAfter,
      };
    }

    this.buckets.set(key, bucket);

    return {
      allowed: true,
      remaining: bucket.points,
      limit: config.points,
      resetInSeconds,
      retryAfter: 0,
    };
  }

  private getRemainingInMemory(
    key: string,
    config: RateLimitConfig,
    now: number,
  ): RateLimitResult {
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.expiresAt <= now) {
      return {
        allowed: true,
        remaining: config.points,
        limit: config.points,
        resetInSeconds: config.duration,
        retryAfter: 0,
      };
    }

    const resetInSeconds = Math.ceil((bucket.expiresAt - now) / 1000);

    if (bucket.blockedUntil > now) {
      const retryAfter = Math.ceil((bucket.blockedUntil - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        limit: config.points,
        resetInSeconds,
        retryAfter,
      };
    }

    return {
      allowed: bucket.points > 0,
      remaining: Math.max(0, bucket.points),
      limit: config.points,
      resetInSeconds,
      retryAfter: 0,
    };
  }

  // ─── Redis Implementation ───────────────────────────────────────

  private async consumeRedis(
    key: string,
    points: number,
    config: RateLimitConfig,
    nowSeconds: number,
  ): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;
    const blockKey = `ratelimit:block:${key}`;

    try {
      // Check if currently blocked
      const blockExpiry = await this.redis!.get(blockKey);
      if (blockExpiry) {
        const blockedUntil = parseInt(blockExpiry, 10);
        if (blockedUntil > nowSeconds) {
          const retryAfter = blockedUntil - nowSeconds;
          this.emitBlockEvent(key, config, 0, retryAfter);
          return {
            allowed: false,
            remaining: 0,
            limit: config.points,
            resetInSeconds: config.duration,
            retryAfter,
          };
        }
      }

      // Use Redis MULTI for atomic operations
      const pipeline = this.redis!.pipeline();
      pipeline.incrby(redisKey, points);

      // Set expiry on first use (within the same pipeline)
      pipeline.ttl(redisKey);
      pipeline.pttl(blockKey);

      const results = await pipeline.exec();

      if (!results) {
        // Fallback to in-memory on pipeline error
        return this.consumeInMemory(key, points, config, Date.now());
      }

      const consumed = results[0][1] as number;
      const ttl = results[1][1] as number;

      // Set TTL if key is new
      if (ttl === -1) {
        await this.redis!.expire(redisKey, config.duration);
      }

      const resetInSeconds = ttl > 0 ? ttl : config.duration;
      const remaining = Math.max(0, config.points - consumed);

      if (consumed > config.points) {
        // Limit exceeded — set block
        const blockedUntil = nowSeconds + config.blockDuration;
        await this.redis!.setex(blockKey, config.blockDuration, String(blockedUntil));

        const retryAfter = config.blockDuration;
        this.emitBlockEvent(key, config, 0, retryAfter);

        return {
          allowed: false,
          remaining: 0,
          limit: config.points,
          resetInSeconds,
          retryAfter,
        };
      }

      return {
        allowed: true,
        remaining,
        limit: config.points,
        resetInSeconds,
        retryAfter: 0,
      };
    } catch (error: any) {
      this.logger.warn(`Redis rate limit error — falling back to in-memory: ${error.message}`);
      return this.consumeInMemory(key, points, config, Date.now());
    }
  }

  private async getRemainingRedis(
    key: string,
    config: RateLimitConfig,
    nowSeconds: number,
  ): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;
    const blockKey = `ratelimit:block:${key}`;

    try {
      const [consumed, ttl, blockExpiry] = await Promise.all([
        this.redis!.get(redisKey),
        this.redis!.ttl(redisKey),
        this.redis!.get(blockKey),
      ]);

      const consumedPoints = parseInt(consumed || '0', 10);

      // Check if blocked
      if (blockExpiry) {
        const blockedUntil = parseInt(blockExpiry, 10);
        if (blockedUntil > nowSeconds) {
          const retryAfter = blockedUntil - nowSeconds;
          return {
            allowed: false,
            remaining: 0,
            limit: config.points,
            resetInSeconds: ttl > 0 ? ttl : config.duration,
            retryAfter,
          };
        }
      }

      const remaining = Math.max(0, config.points - consumedPoints);
      const resetInSeconds = ttl > 0 ? ttl : config.duration;

      return {
        allowed: remaining > 0,
        remaining,
        limit: config.points,
        resetInSeconds,
        retryAfter: 0,
      };
    } catch (error: any) {
      this.logger.warn(`Redis rate limit check error — falling back to in-memory: ${error.message}`);
      return this.getRemainingInMemory(key, config, Date.now());
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────

  /**
   * Get the effective rate limit config for a key.
   * Looks up exact key match first, then falls back to domain default,
   * then falls back to a generic default.
   */
  private getEffectiveConfig(key: string): RateLimitConfig {
    // Exact match
    const exact = this.configs.get(key);
    if (exact) return exact;

    // Domain default (e.g., "cluster:browser" → "cluster:default")
    const colonIndex = key.indexOf(':');
    if (colonIndex !== -1) {
      const domain = key.substring(0, colonIndex);
      const domainDefault = this.configs.get(`${domain}:default`);
      if (domainDefault) return domainDefault;
    }

    // Generic default
    return { points: 100, duration: 60, blockDuration: 30 };
  }

  /**
   * Load pre-configured rate limits from constants and environment variables.
   */
  private loadPreConfiguredLimits(): void {
    // Load from pre-configured defaults
    for (const [key, config] of Object.entries(PRE_CONFIGURED_LIMITS)) {
      this.configs.set(key, { ...config });
    }

    // Override from environment variables
    const envOverrides: Record<string, { points: string; duration: string; blockDuration: string }> = {
      'cluster:default': {
        points: 'RATE_LIMIT_CLUSTER_POINTS',
        duration: 'RATE_LIMIT_CLUSTER_DURATION',
        blockDuration: 'RATE_LIMIT_CLUSTER_BLOCK_DURATION',
      },
      'agent:default': {
        points: 'RATE_LIMIT_AGENT_POINTS',
        duration: 'RATE_LIMIT_AGENT_DURATION',
        blockDuration: 'RATE_LIMIT_AGENT_BLOCK_DURATION',
      },
      'llm:default': {
        points: 'RATE_LIMIT_LLM_POINTS',
        duration: 'RATE_LIMIT_LLM_DURATION',
        blockDuration: 'RATE_LIMIT_LLM_BLOCK_DURATION',
      },
      'tenant:default': {
        points: 'RATE_LIMIT_TENANT_POINTS',
        duration: 'RATE_LIMIT_TENANT_DURATION',
        blockDuration: 'RATE_LIMIT_TENANT_BLOCK_DURATION',
      },
      'user:default': {
        points: 'RATE_LIMIT_USER_POINTS',
        duration: 'RATE_LIMIT_USER_DURATION',
        blockDuration: 'RATE_LIMIT_USER_BLOCK_DURATION',
      },
    };

    for (const [key, envKeys] of Object.entries(envOverrides)) {
      const existing = this.configs.get(key);
      if (!existing) continue;

      const points = this.configService.get<number>(envKeys.points);
      const duration = this.configService.get<number>(envKeys.duration);
      const blockDuration = this.configService.get<number>(envKeys.blockDuration);

      if (points !== undefined) existing.points = points;
      if (duration !== undefined) existing.duration = duration;
      if (blockDuration !== undefined) existing.blockDuration = blockDuration;
    }
  }

  private emitBlockEvent(
    key: string,
    config: RateLimitConfig,
    remaining: number,
    retryAfter: number,
  ): void {
    const event: RateLimitBlockEvent = {
      key,
      config,
      remaining,
      retryAfter,
      timestamp: new Date(),
    };

    try {
      this.emitter.emit('rateLimit.blocked', event);
      this.emitter.emit(`rateLimit.blocked.${key}`, event);
    } catch {
      // Never let event emission failures affect rate limiting
    }

    this.logger.warn(
      `Rate limit exceeded for "${key}": ${config.points} req/${config.duration}s — ` +
        `blocked for ${retryAfter}s`,
    );
  }
}
