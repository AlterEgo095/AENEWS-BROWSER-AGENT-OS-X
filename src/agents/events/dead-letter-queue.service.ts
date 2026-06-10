/**
 * AENEWS Agent OS X - Dead Letter Queue Service
 * Handles events that failed processing, enabling retry with exponential
 * backoff, max retry limits, purge capabilities, and queue statistics.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IDeadLetterQueueService,
  DeadLetterEntry,
  DeadLetterQueueStats,
  AgentEvent,
} from '../interfaces/agent-event.interface';
import { EventBusService } from './event-bus.service';

// ─── Retry Configuration ──────────────────────────────────────────
interface RetryConfig {
  maxRetryAttempts: number;
  baseRetryIntervalMs: number;
  maxRetryIntervalMs: number;
  exponentialBackoff: boolean;
  jitterMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetryAttempts: 5,
  baseRetryIntervalMs: 60000,    // 1 minute base
  maxRetryIntervalMs: 3600000,   // 1 hour max
  exponentialBackoff: true,
  jitterMs: 5000,                // 5 seconds jitter
};

@Injectable()
export class DeadLetterQueueService implements IDeadLetterQueueService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeadLetterQueueService.name);
  private readonly queue: Map<string, DeadLetterEntry> = new Map();
  private readonly retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG };
  private readonly repairHistory: Map<string, Array<{
    timestamp: Date;
    success: boolean;
    error?: string;
  }>> = new Map();
  private retryInterval: NodeJS.Timer | null = null;
  private static readonly MAX_QUEUE_SIZE = 10000;
  private static readonly PURGE_BATCH_SIZE = 100;

  async onModuleInit(): Promise<void> {
    this.startRetryTimer();
    this.logger.log('Dead Letter Queue initialized');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.retryInterval) {
      clearInterval(this.retryInterval as any);
      this.retryInterval = null;
    }
    this.logger.log('Dead Letter Queue destroyed');
  }

  /**
   * Add a failed event to the dead letter queue.
   * Determines retryability based on failure count and config.
   */
  async add(entry: Omit<DeadLetterEntry, 'id'>): Promise<DeadLetterEntry> {
    const id = uuidv4();

    const deadLetterEntry: DeadLetterEntry = {
      ...entry,
      id,
    };

    // Determine if the event can be retried
    deadLetterEntry.canRetry = entry.failureCount < this.retryConfig.maxRetryAttempts;

    // Set next retry time if retryable
    if (deadLetterEntry.canRetry) {
      const backoffMs = this.calculateRetryBackoff(entry.failureCount);
      deadLetterEntry.nextRetryAt = new Date(Date.now() + backoffMs);
    }

    this.queue.set(id, deadLetterEntry);

    // Initialize repair history
    this.repairHistory.set(id, []);

    // Enforce max queue size
    if (this.queue.size > DeadLetterQueueService.MAX_QUEUE_SIZE) {
      this.evictOldest();
    }

    this.logger.warn(
      `Added event to dead letter queue: ${entry.originalEvent.type} ` +
      `(failure: ${entry.failureCount}, canRetry: ${deadLetterEntry.canRetry})`,
    );

    return deadLetterEntry;
  }

  /**
   * Get a dead letter entry by ID.
   */
  async get(id: string): Promise<DeadLetterEntry | null> {
    return this.queue.get(id) || null;
  }

  /**
   * Get all dead letter entries (for event bus integration).
   */
  getAll(): DeadLetterEntry[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get total count of dead letter entries.
   */
  getCount(): number {
    return this.queue.size;
  }

  /**
   * Get entries that are ready for retry.
   */
  async getPending(limit?: number): Promise<DeadLetterEntry[]> {
    const now = new Date();
    const pending: DeadLetterEntry[] = [];

    for (const entry of this.queue.values()) {
      if (
        entry.canRetry &&
        entry.nextRetryAt &&
        now >= entry.nextRetryAt
      ) {
        pending.push(entry);
      }
    }

    // Sort by next retry time (earliest first)
    pending.sort((a, b) => {
      const aTime = a.nextRetryAt?.getTime() ?? Infinity;
      const bTime = b.nextRetryAt?.getTime() ?? Infinity;
      return aTime - bTime;
    });

    return pending.slice(0, limit || 50);
  }

  /**
   * Retry a dead letter entry.
   * Re-publishes the original event through the event bus.
   */
  async retry(id: string): Promise<boolean> {
    const entry = this.queue.get(id);
    if (!entry) return false;

    if (!entry.canRetry) {
      this.logger.warn(`Dead letter entry ${id} cannot be retried (max attempts reached)`);
      return false;
    }

    try {
      // Re-publish the original event via the event bus
      // We import dynamically to avoid circular dependency issues
      // The event bus will be injected directly
      await this.republishEvent(entry.originalEvent);

      // Record success in repair history
      this.recordRepairAttempt(id, true);

      // Remove from queue on successful retry
      this.queue.delete(id);
      this.repairHistory.delete(id);

      this.logger.log(
        `Successfully retried dead letter entry ${id} for event ${entry.originalEvent.type}`,
      );

      return true;
    } catch (error) {
      // Update failure count and schedule next retry
      entry.failureCount++;
      entry.lastFailedAt = new Date();
      entry.canRetry = entry.failureCount < this.retryConfig.maxRetryAttempts;

      if (entry.canRetry) {
        const backoffMs = this.calculateRetryBackoff(entry.failureCount);
        entry.nextRetryAt = new Date(Date.now() + backoffMs);
      } else {
        entry.nextRetryAt = undefined;
        this.logger.error(
          `Dead letter entry ${id} has exceeded max retry attempts (${this.retryConfig.maxRetryAttempts})`,
        );
      }

      // Record failure in repair history
      this.recordRepairAttempt(id, false, (error as Error).message);

      this.logger.error(
        `Retry failed for dead letter entry ${id} (attempt ${entry.failureCount}): ${(error as Error).message}`,
      );

      return false;
    }
  }

  /**
   * Discard a dead letter entry permanently.
   */
  async discard(id: string): Promise<boolean> {
    const deleted = this.queue.delete(id);
    this.repairHistory.delete(id);

    if (deleted) {
      this.logger.warn(`Discarded dead letter entry ${id}`);
    }

    return deleted;
  }

  /**
   * Get dead letter queue statistics.
   */
  async getStats(): Promise<DeadLetterQueueStats> {
    let pendingRetry = 0;
    let permanentlyFailed = 0;
    let oldestEntry: Date | undefined;

    for (const entry of this.queue.values()) {
      if (entry.canRetry) {
        pendingRetry++;
      } else {
        permanentlyFailed++;
      }

      if (!oldestEntry || entry.lastFailedAt < oldestEntry) {
        oldestEntry = entry.lastFailedAt;
      }
    }

    return {
      totalEntries: this.queue.size,
      pendingRetry,
      permanentlyFailed,
      oldestEntry,
    };
  }

  /**
   * Get repair history for a specific entry.
   */
  getRepairHistory(entryId: string): Array<{
    timestamp: Date;
    success: boolean;
    error?: string;
  }> {
    return this.repairHistory.get(entryId) || [];
  }

  /**
   * Get entries that have permanently failed (cannot retry).
   */
  getPermanentlyFailed(): DeadLetterEntry[] {
    return Array.from(this.queue.values()).filter((entry) => !entry.canRetry);
  }

  /**
   * Get entries for a specific event type.
   */
  getByEventType(eventType: string): DeadLetterEntry[] {
    return Array.from(this.queue.values()).filter(
      (entry) => entry.originalEvent.type === eventType,
    );
  }

  /**
   * Purge all entries from the dead letter queue.
   */
  purge(): void {
    const count = this.queue.size;
    this.queue.clear();
    this.repairHistory.clear();
    this.logger.log(`Purged ${count} entries from dead letter queue`);
  }

  /**
   * Purge entries older than the specified date.
   */
  purgeOlderThan(date: Date): number {
    let purgedCount = 0;

    for (const [id, entry] of this.queue) {
      if (entry.lastFailedAt < date) {
        this.queue.delete(id);
        this.repairHistory.delete(id);
        purgedCount++;
      }
    }

    this.logger.log(`Purged ${purgedCount} entries older than ${date.toISOString()}`);
    return purgedCount;
  }

  /**
   * Purge permanently failed entries.
   */
  purgePermanentlyFailed(): number {
    let purgedCount = 0;

    for (const [id, entry] of this.queue) {
      if (!entry.canRetry) {
        this.queue.delete(id);
        this.repairHistory.delete(id);
        purgedCount++;
      }
    }

    this.logger.log(`Purged ${purgedCount} permanently failed entries`);
    return purgedCount;
  }

  // ─── Private Methods ──────────────────────────────────────────────

  /**
   * Re-publish an event. Uses a lazy reference to the EventBusService
   * to avoid circular dependency issues at construction time.
   */
  private eventBusRef: EventBusService | null = null;

  setEventBus(eventBus: EventBusService): void {
    this.eventBusRef = eventBus;
  }

  private async republishEvent(event: AgentEvent): Promise<void> {
    if (this.eventBusRef) {
      // Use the injected event bus directly
      await this.eventBusRef.publishEvent(event);
    } else {
      // Fallback: create a new event based on the original
      this.logger.warn(
        'EventBus reference not set, cannot republish event directly. ' +
        'Ensure DeadLetterQueueService.setEventBus() is called during initialization.',
      );
      throw new Error('EventBus reference not available for republishing');
    }
  }

  /**
   * Calculate retry backoff with exponential backoff, max cap, and jitter.
   */
  private calculateRetryBackoff(failureCount: number): number {
    let backoffMs: number;

    if (this.retryConfig.exponentialBackoff) {
      // Exponential backoff: base * 2^(failureCount-1)
      backoffMs = this.retryConfig.baseRetryIntervalMs * Math.pow(2, failureCount - 1);

      // Cap at max interval
      backoffMs = Math.min(backoffMs, this.retryConfig.maxRetryIntervalMs);
    } else {
      backoffMs = this.retryConfig.baseRetryIntervalMs;
    }

    // Add jitter to prevent thundering herd
    if (this.retryConfig.jitterMs > 0) {
      const jitter = Math.random() * this.retryConfig.jitterMs;
      backoffMs += jitter;
    }

    return backoffMs;
  }

  /**
   * Record a repair attempt in the history.
   */
  private recordRepairAttempt(entryId: string, success: boolean, error?: string): void {
    let history = this.repairHistory.get(entryId);
    if (!history) {
      history = [];
      this.repairHistory.set(entryId, history);
    }

    history.push({
      timestamp: new Date(),
      success,
      error,
    });

    // Limit history size
    if (history.length > 50) {
      history.shift();
    }
  }

  /**
   * Start the automatic retry timer.
   */
  private startRetryTimer(): void {
    this.retryInterval = setInterval(async () => {
      await this.processRetries();
    }, this.retryConfig.baseRetryIntervalMs);
  }

  /**
   * Process automatic retries for pending entries.
   */
  private async processRetries(): Promise<void> {
    const pending = await this.getPending(DeadLetterQueueService.PURGE_BATCH_SIZE);

    for (const entry of pending) {
      try {
        await this.retry(entry.id);
      } catch (error) {
        this.logger.error(
          `Auto-retry failed for ${entry.id}: ${(error as Error).message}`,
        );
      }
    }

    // Auto-purge permanently failed entries that are older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 86400000);
    this.purgeOlderThan(twentyFourHoursAgo);
  }

  /**
   * Evict oldest entry when queue exceeds max size.
   */
  private evictOldest(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, entry] of this.queue) {
      if (entry.lastFailedAt.getTime() < oldestTime) {
        oldestTime = entry.lastFailedAt.getTime();
        oldestId = id;
      }
    }

    if (oldestId) {
      this.queue.delete(oldestId);
      this.repairHistory.delete(oldestId);
      this.logger.warn(`Evicted oldest dead letter entry ${oldestId}`);
    }
  }
}
