/**
 * AENEWS Agent OS X - Session Memory Service
 * Session-scoped memory backed by Redis for cross-request persistence.
 * Falls back to in-memory Map when Redis is not available.
 * Supports session namespacing, TTL management, and batch operations.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ISessionMemoryService,
  SessionMemoryEntry,
} from '../interfaces/agent-memory.interface';

@Injectable()
export class SessionMemoryService implements ISessionMemoryService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionMemoryService.name);
  private redisClient: any = null;
  private readonly store: Map<string, SessionMemoryEntry> = new Map();
  private cleanupInterval: NodeJS.Timer | null = null;
  private static readonly DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private static readonly CLEANUP_INTERVAL_MS = 120000; // 2 minutes
  private static readonly KEY_PREFIX = 'aenews:session:';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeRedis();
    this.startCleanupTimer();
    this.logger.log('Session Memory service initialized');
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval as any);
    }
    this.store.clear();
    if (this.redisClient) {
      try {
        this.redisClient.disconnect();
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Initialize Redis client (graceful fallback to in-memory if unavailable).
   */
  private async initializeRedis(): Promise<void> {
    try {
      const redis = await import('ioredis');
      const url = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');

      this.redisClient = new redis.default(url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 5) return null; // Stop retrying
          return Math.min(times * 200, 5000);
        },
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Connected to Redis for session memory');
      });

      this.redisClient.on('error', (err: Error) => {
        this.logger.warn(`Redis session memory error: ${err.message}`);
      });

      // Verify connection
      await this.redisClient.ping();
    } catch (error) {
      this.logger.warn(
        `Redis not available, using in-memory session store: ${(error as Error).message}`,
      );
      this.redisClient = null;
    }
  }

  /**
   * Store a value in session memory.
   */
  async set<T>(
    agentId: string,
    sessionId: string,
    key: string,
    value: T,
    ttlMs?: number,
  ): Promise<void> {
    const composedKey = this.composeKey(agentId, sessionId, key);
    const now = new Date();
    const effectiveTtl = ttlMs || SessionMemoryService.DEFAULT_TTL_MS;

    const entry: SessionMemoryEntry<T> = {
      key,
      value,
      sessionId,
      agentId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + effectiveTtl),
      metadata: {},
    };

    // Store in Redis if available
    if (this.redisClient) {
      try {
        const serialized = JSON.stringify(entry);
        await this.redisClient.setex(
          `${SessionMemoryService.KEY_PREFIX}${composedKey}`,
          Math.ceil(effectiveTtl / 1000),
          serialized,
        );
      } catch (error) {
        this.logger.warn(`Redis session set failed, using in-memory: ${(error as Error).message}`);
      }
    }

    // Always store in-memory as well for fast reads
    this.store.set(composedKey, entry as SessionMemoryEntry);

    this.logger.debug?.(`Set session memory: ${composedKey}`);
  }

  /**
   * Retrieve a value from session memory.
   */
  async get<T>(agentId: string, sessionId: string, key: string): Promise<T | null> {
    const composedKey = this.composeKey(agentId, sessionId, key);

    // Try in-memory first
    const entry = this.store.get(composedKey) as SessionMemoryEntry<T> | undefined;

    if (entry) {
      // Check expiration
      if (entry.expiresAt && new Date() > entry.expiresAt) {
        this.store.delete(composedKey);
        return null;
      }
      return entry.value;
    }

    // Fallback to Redis
    if (this.redisClient) {
      try {
        const serialized = await this.redisClient.get(`${SessionMemoryService.KEY_PREFIX}${composedKey}`);
        if (serialized) {
          const redisEntry = JSON.parse(serialized) as SessionMemoryEntry<T>;
          // Cache back to in-memory
          this.store.set(composedKey, redisEntry as SessionMemoryEntry);
          return redisEntry.value;
        }
      } catch (error) {
        this.logger.warn(`Redis session get failed: ${(error as Error).message}`);
      }
    }

    return null;
  }

  /**
   * Delete a value from session memory.
   */
  async delete(agentId: string, sessionId: string, key: string): Promise<boolean> {
    const composedKey = this.composeKey(agentId, sessionId, key);

    if (this.redisClient) {
      try {
        await this.redisClient.del(`${SessionMemoryService.KEY_PREFIX}${composedKey}`);
      } catch (error) {
        this.logger.warn(`Redis session delete failed: ${(error as Error).message}`);
      }
    }

    return this.store.delete(composedKey);
  }

  /**
   * Get all keys for a specific agent session.
   */
  async getSessionKeys(agentId: string, sessionId: string): Promise<string[]> {
    const prefix = `${agentId}:${sessionId}:`;
    const keys: string[] = [];
    const now = new Date();

    for (const [composedKey, entry] of this.store) {
      if (composedKey.startsWith(prefix)) {
        if (!entry.expiresAt || now <= entry.expiresAt) {
          keys.push(entry.key);
        }
      }
    }

    return keys;
  }

  /**
   * Clear all session memory for a specific agent session.
   */
  async clearSession(agentId: string, sessionId: string): Promise<number> {
    const prefix = `${agentId}:${sessionId}:`;
    let count = 0;

    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;

        if (this.redisClient) {
          try {
            await this.redisClient.del(`${SessionMemoryService.KEY_PREFIX}${key}`);
          } catch {
            // Ignore
          }
        }
      }
    }

    return count;
  }

  /**
   * Get all sessions for an agent.
   */
  async getAgentSessions(agentId: string): Promise<string[]> {
    const sessions = new Set<string>();

    for (const [, entry] of this.store) {
      if (entry.agentId === agentId) {
        sessions.add(entry.sessionId);
      }
    }

    return Array.from(sessions);
  }

  // ─── Batch Operations ──────────────────────────────────────────────

  /**
   * Set multiple key-value pairs in a single session atomically.
   */
  async setBatch(
    agentId: string,
    sessionId: string,
    entries: Array<{ key: string; value: any; ttlMs?: number }>,
  ): Promise<void> {
    for (const entry of entries) {
      await this.set(agentId, sessionId, entry.key, entry.value, entry.ttlMs);
    }
  }

  /**
   * Get multiple values from a session in a single operation.
   */
  async getBatch<T>(
    agentId: string,
    sessionId: string,
    keys: string[],
  ): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    for (const key of keys) {
      results.set(key, await this.get<T>(agentId, sessionId, key));
    }
    return results;
  }

  /**
   * Get the full session context (all key-value pairs for a session).
   */
  async getSessionContext<T>(
    agentId: string,
    sessionId: string,
  ): Promise<Map<string, T>> {
    const keys = await this.getSessionKeys(agentId, sessionId);
    const context = new Map<string, T>();

    for (const key of keys) {
      const value = await this.get<T>(agentId, sessionId, key);
      if (value !== null) {
        context.set(key, value);
      }
    }

    return context;
  }

  // ─── TTL Management ────────────────────────────────────────────────

  /**
   * Extend the TTL of a session memory entry.
   */
  async extendTtl(
    agentId: string,
    sessionId: string,
    key: string,
    additionalMs: number,
  ): Promise<boolean> {
    const composedKey = this.composeKey(agentId, sessionId, key);
    const entry = this.store.get(composedKey);

    if (!entry) return false;

    if (entry.expiresAt) {
      entry.expiresAt = new Date(entry.expiresAt.getTime() + additionalMs);
    } else {
      entry.expiresAt = new Date(Date.now() + additionalMs);
    }

    if (this.redisClient) {
      try {
        const remainingTtl = await this.redisClient.ttl(`${SessionMemoryService.KEY_PREFIX}${composedKey}`);
        if (remainingTtl > 0) {
          await this.redisClient.expire(
            `${SessionMemoryService.KEY_PREFIX}${composedKey}`,
            remainingTtl + Math.ceil(additionalMs / 1000),
          );
        }
      } catch {
        // Ignore
      }
    }

    return true;
  }

  /**
   * Extend the TTL of all entries in a session.
   */
  async extendSessionTtl(
    agentId: string,
    sessionId: string,
    additionalMs: number,
  ): Promise<number> {
    const keys = await this.getSessionKeys(agentId, sessionId);
    let extended = 0;

    for (const key of keys) {
      const success = await this.extendTtl(agentId, sessionId, key, additionalMs);
      if (success) extended++;
    }

    return extended;
  }

  // ─── Cleanup ───────────────────────────────────────────────────────

  /**
   * Clean up expired session memory entries.
   */
  cleanup(): number {
    let cleanedCount = 0;
    const now = new Date();

    for (const [key, entry] of this.store) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.store.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug?.(`Cleaned up ${cleanedCount} expired session memory entries`);
    }

    return cleanedCount;
  }

  /**
   * Get session memory statistics.
   */
  getStats(): {
    totalSessions: number;
    totalEntries: number;
    totalSizeBytes: number;
    connectedToRedis: boolean;
  } {
    const sessions = new Set<string>();
    let totalSizeBytes = 0;

    for (const [, entry] of this.store) {
      sessions.add(entry.sessionId);
      try {
        totalSizeBytes += JSON.stringify(entry.value).length * 2;
      } catch {
        totalSizeBytes += 1024;
      }
    }

    return {
      totalSessions: sessions.size,
      totalEntries: this.store.size,
      totalSizeBytes,
      connectedToRedis: this.redisClient !== null,
    };
  }

  // ─── Private Methods ─────────────────────────────────────────────

  private composeKey(agentId: string, sessionId: string, key: string): string {
    return `${agentId}:${sessionId}:${key}`;
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, SessionMemoryService.CLEANUP_INTERVAL_MS);
  }
}
