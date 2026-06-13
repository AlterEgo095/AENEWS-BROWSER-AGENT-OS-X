/**
 * AENEWS Agent OS X - Event Processing Queue
 *
 * Bull queue processor for heavy event processing tasks.
 * Handles event replay, batch notifications, and observability aggregation.
 *
 * Queue: "event:queue"
 * Concurrency: 5
 */

import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EventBusService } from '../agents/events/event-bus.service';
import { RealtimeGateway, RealtimeEventType } from '../realtime/realtime.gateway';

// ─── Job Types ─────────────────────────────────────────────────────
export enum EventJobType {
  REPLAY_EVENTS = 'replay_events',
  BATCH_NOTIFY = 'batch_notify',
  AGGREGATE_METRICS = 'aggregate_metrics',
  PROCESS_DLQ = 'process_dlq',
}

// ─── Job Data ──────────────────────────────────────────────────────
export interface EventJobData {
  type: EventJobType;
  payload: any;
}

@Processor('event:queue')
export class EventQueueProcessor {
  private readonly logger = new Logger(EventQueueProcessor.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Process({ name: 'process' })
  async processEventJob(job: Job<EventJobData>): Promise<any> {
    const { type, payload } = job.data;

    switch (type) {
      case EventJobType.REPLAY_EVENTS:
        return this.handleReplayEvents(job, payload);

      case EventJobType.BATCH_NOTIFY:
        return this.handleBatchNotify(job, payload);

      case EventJobType.AGGREGATE_METRICS:
        return this.handleAggregateMetrics(job, payload);

      case EventJobType.PROCESS_DLQ:
        return this.handleProcessDLQ(job);

      default:
        this.logger.warn(`Unknown event job type: ${type}`);
        return { success: false, error: `Unknown job type: ${type}` };
    }
  }

  // ─── Handlers ───────────────────────────────────────────────────

  private async handleReplayEvents(job: Job, payload: {
    fromTimestamp: string;
    toTimestamp: string;
    targetRoom?: string;
  }): Promise<{ replayed: number }> {
    await job.progress(10);

    const fromTimestamp = new Date(payload.fromTimestamp);
    const toTimestamp = new Date(payload.toTimestamp);
    let replayed = 0;

    for await (const event of this.eventBus.replayEvents(fromTimestamp, toTimestamp)) {
      this.realtimeGateway.pushSystemEvent(RealtimeEventType.SYSTEM_ALERT, {
        replay: true,
        event,
      });
      replayed++;
    }

    await job.progress(100);
    this.logger.log(`Replayed ${replayed} events from ${fromTimestamp} to ${toTimestamp}`);
    return { replayed };
  }

  private async handleBatchNotify(job: Job, payload: {
    room: string;
    event: string;
    data: any;
  }): Promise<{ notified: boolean }> {
    await job.progress(50);
    this.realtimeGateway.pushSystemEvent(RealtimeEventType.SYSTEM_ALERT, payload.data);
    await job.progress(100);
    return { notified: true };
  }

  private async handleAggregateMetrics(job: Job, _payload: any): Promise<{
    eventBusStats: any;
    deadLetterCount: number;
  }> {
    await job.progress(50);
    const stats = this.eventBus.getStats();
    await job.progress(100);
    return {
      eventBusStats: stats,
      deadLetterCount: stats.deadLetterCount,
    };
  }

  private async handleProcessDLQ(job: Job): Promise<{
    retried: number;
    purged: number;
  }> {
    await job.progress(30);

    const dlq = this.eventBus.getDeadLetterQueue();
    let retried = 0;

    // Retry all retryable entries
    for (const entry of dlq) {
      if (entry.canRetry) {
        try {
          await this.eventBus.retryDeadLetter(entry.id);
          retried++;
        } catch {
          // Skip entries that fail retry
        }
      }
    }

    await job.progress(100);
    return { retried, purged: 0 };
  }

  @OnQueueActive()
  onActive(job: Job): void {
    this.logger.debug(`Event job ${job.id} started (type: ${job.data.type})`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job): void {
    this.logger.debug(`Event job ${job.id} completed`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.error(`Event job ${job.id} failed: ${error.message}`);
  }
}
