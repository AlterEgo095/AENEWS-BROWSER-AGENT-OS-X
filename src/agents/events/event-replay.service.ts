/**
 * AENEWS Agent OS X - Event Replay Service
 * Enables replaying historical events for debugging, recovery, and testing.
 * Supports time-range replay, agent-specific replay, filtering, and rate limiting.
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IEventReplayService,
  EventReplayRequest,
  EventReplayResult,
  AgentEvent,
  AgentEventType,
} from '../interfaces/agent-event.interface';
import { EventStoreService } from './event-store.service';
import { EventBusService } from './event-bus.service';

// ─── Replay State ─────────────────────────────────────────────────
interface ReplayState {
  id: string;
  request: EventReplayRequest;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result: EventReplayResult | null;
  startedAt: Date;
  completedAt?: Date;
  progress: number;
  processedCount: number;
}

// ─── Rate Limiter ─────────────────────────────────────────────────
interface RateLimiterConfig {
  eventsPerSecond: number;
  burstSize: number;
}

const DEFAULT_RATE_LIMITER: RateLimiterConfig = {
  eventsPerSecond: 100,
  burstSize: 50,
};

// ─── Replay Filter ────────────────────────────────────────────────
export interface ReplayFilter {
  eventTypes?: AgentEventType[];
  sourceAgentId?: string;
  targetAgentId?: string;
  minPriority?: number;
  customFilter?: (event: AgentEvent) => boolean;
}

@Injectable()
export class EventReplayService implements IEventReplayService {
  private readonly logger = new Logger(EventReplayService.name);
  private readonly activeReplays: Map<string, ReplayState> = new Map();
  private readonly rateLimiterConfig: RateLimiterConfig = { ...DEFAULT_RATE_LIMITER };
  private lastReplayTimestamp = 0;
  private tokenBucket = DEFAULT_RATE_LIMITER.burstSize;

  constructor(
    private readonly eventStore: EventStoreService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Replay events matching the request criteria.
   * Implements rate limiting to prevent overwhelming the system.
   */
  async replay(request: EventReplayRequest): Promise<EventReplayResult> {
    const replayId = uuidv4();
    const startTime = Date.now();

    this.logger.log(
      `Starting event replay ${replayId} from ${request.fromTimestamp} to ${request.toTimestamp}`,
    );

    const state: ReplayState = {
      id: replayId,
      request,
      status: 'running',
      result: null,
      startedAt: new Date(),
      progress: 0,
      processedCount: 0,
    };

    this.activeReplays.set(replayId, state);

    try {
      // Query historical events
      const events = await this.eventStore.query({
        eventTypes: request.eventTypes,
        sourceAgentId: request.sourceAgentId,
        fromTimestamp: request.fromTimestamp,
        toTimestamp: request.toTimestamp,
        limit: request.maxEvents || 1000,
      });

      const totalEvents = events.length;
      let replayedCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      // Replay each event with rate limiting
      for (let i = 0; i < events.length; i++) {
        // Check if replay was cancelled
        if (state.status === 'cancelled') {
          this.logger.log(`Replay ${replayId} was cancelled`);
          break;
        }

        const entry = events[i];

        try {
          // Skip already-processed events
          if (entry.status === 'completed') {
            skippedCount++;
            continue;
          }

          // Apply rate limiting
          await this.rateLimit();

          // Re-publish the event
          await this.eventBus.publish({
            type: entry.event.type,
            sourceAgentId: entry.event.sourceAgentId,
            targetAgentId: request.targetSubscriberId || entry.event.targetAgentId,
            cluster: entry.event.cluster,
            payload: entry.event.payload,
            priority: entry.event.priority,
            correlationId: entry.event.correlationId,
            causationId: entry.event.id,
            metadata: {
              ...entry.event.metadata,
              isReplay: true,
              replayId,
              originalEventId: entry.event.id,
              originalTimestamp: entry.event.timestamp,
            },
          });

          // Mark as processed
          await this.eventStore.markProcessed(entry.id);

          replayedCount++;
          state.processedCount = replayedCount;
          state.progress = Math.round(((i + 1) / totalEvents) * 100);
        } catch (error) {
          failedCount++;
          this.logger.warn(
            `Failed to replay event ${entry.event.id}: ${(error as Error).message}`,
          );
          await this.eventStore.markFailed(entry.id, (error as Error).message);
        }
      }

      const result: EventReplayResult = {
        replayedCount,
        failedCount,
        skippedCount,
        durationMs: Date.now() - startTime,
      };

      state.status = 'completed';
      state.result = result;
      state.completedAt = new Date();
      state.progress = 100;

      this.logger.log(
        `Event replay ${replayId} completed: ${replayedCount} replayed, ` +
        `${failedCount} failed, ${skippedCount} skipped in ${result.durationMs}ms`,
      );

      return result;
    } catch (error) {
      state.status = 'failed';
      state.completedAt = new Date();

      const result: EventReplayResult = {
        replayedCount: state.processedCount,
        failedCount: 0,
        skippedCount: 0,
        durationMs: Date.now() - startTime,
      };

      state.result = result;

      this.logger.error(
        `Event replay ${replayId} failed: ${(error as Error).message}`,
      );

      return result;
    } finally {
      // Keep completed replays for a while for status queries
      setTimeout(() => {
        this.activeReplays.delete(replayId);
      }, 300000); // Remove after 5 minutes
    }
  }

  /**
   * Replay events for a specific agent.
   */
  async replayForAgent(
    agentId: string,
    fromTimestamp: Date,
    toTimestamp: Date,
    options?: {
      eventTypes?: AgentEventType[];
      maxEvents?: number;
      targetSubscriberId?: string;
    },
  ): Promise<EventReplayResult> {
    return this.replay({
      sourceAgentId: agentId,
      fromTimestamp,
      toTimestamp,
      eventTypes: options?.eventTypes,
      maxEvents: options?.maxEvents || 500,
      targetSubscriberId: options?.targetSubscriberId || agentId,
    });
  }

  /**
   * Replay events with custom filtering.
   */
  async replayWithFilter(
    fromTimestamp: Date,
    toTimestamp: Date,
    filter: ReplayFilter,
    options?: {
      maxEvents?: number;
      targetSubscriberId?: string;
    },
  ): Promise<EventReplayResult> {
    const replayId = uuidv4();
    const startTime = Date.now();

    this.logger.log(`Starting filtered event replay ${replayId}`);

    const state: ReplayState = {
      id: replayId,
      request: {
        fromTimestamp,
        toTimestamp,
        targetSubscriberId: options?.targetSubscriberId || 'replay-subscriber',
      },
      status: 'running',
      result: null,
      startedAt: new Date(),
      progress: 0,
      processedCount: 0,
    };

    this.activeReplays.set(replayId, state);

    try {
      // Query historical events
      const events = await this.eventStore.query({
        eventTypes: filter.eventTypes,
        sourceAgentId: filter.sourceAgentId,
        fromTimestamp,
        toTimestamp,
        limit: options?.maxEvents || 1000,
      });

      let replayedCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < events.length; i++) {
        const entry = events[i];

        // Apply custom filter
        if (filter.customFilter && !filter.customFilter(entry.event)) {
          skippedCount++;
          continue;
        }

        // Apply priority filter
        if (filter.minPriority !== undefined && entry.event.priority < filter.minPriority) {
          skippedCount++;
          continue;
        }

        try {
          await this.rateLimit();

          await this.eventBus.publish({
            type: entry.event.type,
            sourceAgentId: entry.event.sourceAgentId,
            targetAgentId: options?.targetSubscriberId || entry.event.targetAgentId,
            cluster: entry.event.cluster,
            payload: entry.event.payload,
            priority: entry.event.priority,
            correlationId: entry.event.correlationId,
            causationId: entry.event.id,
            metadata: {
              ...entry.event.metadata,
              isReplay: true,
              replayId,
              filteredReplay: true,
              originalEventId: entry.event.id,
              originalTimestamp: entry.event.timestamp,
            },
          });

          await this.eventStore.markProcessed(entry.id);
          replayedCount++;
          state.processedCount = replayedCount;
          state.progress = Math.round(((i + 1) / events.length) * 100);
        } catch (error) {
          failedCount++;
          await this.eventStore.markFailed(entry.id, (error as Error).message);
        }
      }

      const result: EventReplayResult = {
        replayedCount,
        failedCount,
        skippedCount,
        durationMs: Date.now() - startTime,
      };

      state.status = 'completed';
      state.result = result;
      state.completedAt = new Date();

      return result;
    } catch (error) {
      state.status = 'failed';

      const result: EventReplayResult = {
        replayedCount: state.processedCount,
        failedCount: 0,
        skippedCount: 0,
        durationMs: Date.now() - startTime,
      };

      state.result = result;
      return result;
    } finally {
      setTimeout(() => {
        this.activeReplays.delete(replayId);
      }, 300000);
    }
  }

  /**
   * Get the status of a replay operation.
   */
  async getReplayStatus(replayId: string): Promise<EventReplayResult | null> {
    const state = this.activeReplays.get(replayId);
    return state?.result || null;
  }

  /**
   * Get detailed replay state including progress.
   */
  getReplayState(replayId: string): ReplayState | null {
    return this.activeReplays.get(replayId) || null;
  }

  /**
   * Cancel an active replay.
   */
  cancelReplay(replayId: string): boolean {
    const state = this.activeReplays.get(replayId);
    if (!state || state.status !== 'running') return false;

    state.status = 'cancelled';
    state.completedAt = new Date();
    this.logger.log(`Replay ${replayId} cancelled`);
    return true;
  }

  /**
   * Get all active replays.
   */
  getActiveReplays(): Array<{
    id: string;
    status: string;
    startedAt: Date;
    progress: number;
    processedCount: number;
  }> {
    return Array.from(this.activeReplays.values()).map((state) => ({
      id: state.id,
      status: state.status,
      startedAt: state.startedAt,
      progress: state.progress,
      processedCount: state.processedCount,
    }));
  }

  /**
   * Set rate limiter configuration.
   */
  setRateLimiterConfig(config: Partial<RateLimiterConfig>): void {
    if (config.eventsPerSecond !== undefined) {
      this.rateLimiterConfig.eventsPerSecond = config.eventsPerSecond;
    }
    if (config.burstSize !== undefined) {
      this.rateLimiterConfig.burstSize = config.burstSize;
      this.tokenBucket = config.burstSize;
    }
    this.logger.log(
      `Rate limiter configured: ${this.rateLimiterConfig.eventsPerSecond} events/sec, ` +
      `burst: ${this.rateLimiterConfig.burstSize}`,
    );
  }

  // ─── Private Methods ──────────────────────────────────────────────

  /**
   * Token bucket rate limiter.
   * Ensures events are replayed at a controlled rate.
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastEvent = now - this.lastReplayTimestamp;
    const intervalMs = 1000 / this.rateLimiterConfig.eventsPerSecond;

    // Refill tokens based on elapsed time
    const tokensToAdd = Math.floor(
      timeSinceLastEvent / intervalMs,
    );
    if (tokensToAdd > 0) {
      this.tokenBucket = Math.min(
        this.tokenBucket + tokensToAdd,
        this.rateLimiterConfig.burstSize,
      );
      this.lastReplayTimestamp = now;
    }

    // If we have tokens, consume one
    if (this.tokenBucket > 0) {
      this.tokenBucket--;
      return;
    }

    // Otherwise, wait until we can proceed
    const waitMs = intervalMs - timeSinceLastEvent;
    if (waitMs > 0) {
      await this.sleep(waitMs);
    }

    this.lastReplayTimestamp = Date.now();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
