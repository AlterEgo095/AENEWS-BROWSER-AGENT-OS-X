/**
 * AENEWS Agent OS X - Event Store Service
 * Persists all events for audit, replay, and recovery capabilities.
 * Provides indexing by agentId, type, timestamp for efficient querying,
 * statistics, and event count tracking.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IEventStoreService,
  AgentEvent,
  AgentEventType,
  EventStoreEntry,
  EventProcessingStatus,
} from '../interfaces/agent-event.interface';

// ─── In-Memory Store ──────────────────────────────────────────────
interface EventRecord {
  entry: EventStoreEntry;
  event: AgentEvent;
}

// ─── Event Statistics ──────────────────────────────────────────────
export interface EventStoreStatistics {
  totalEvents: number;
  byStatus: Record<EventProcessingStatus, number>;
  byType: Record<string, number>;
  byAgentId: Record<string, number>;
  oldestEvent?: Date;
  newestEvent?: Date;
  totalPayloadSizeBytes: number;
  eventsPerMinute: number;
  avgProcessingTimeMs: number;
}

@Injectable()
export class EventStoreService implements IEventStoreService, OnModuleInit {
  private readonly logger = new Logger(EventStoreService.name);
  private readonly records: Map<string, EventRecord> = new Map();
  private readonly typeIndex: Map<AgentEventType, Set<string>> = new Map();
  private readonly sourceIndex: Map<string, Set<string>> = new Map();
  private readonly targetIndex: Map<string, Set<string>> = new Map();
  private readonly correlationIndex: Map<string, Set<string>> = new Map();
  private readonly timeIndex: Array<{ timestamp: number; id: string }> = [];
  private maxStoreSize = 100000;
  private initializedAt: Date = new Date();
  private totalProcessingTimeMs = 0;
  private processedCount = 0;

  async onModuleInit(): Promise<void> {
    this.initializedAt = new Date();
    this.logger.log('Event Store initialized');
  }

  /**
   * Store an event with full indexing.
   */
  async store(event: AgentEvent): Promise<EventStoreEntry> {
    const entry: EventStoreEntry = {
      id: uuidv4(),
      event,
      storedAt: new Date(),
      processingAttempts: 0,
      status: EventProcessingStatus.PENDING,
    };

    const record: EventRecord = { entry, event };

    this.records.set(entry.id, record);

    // Update type index
    if (!this.typeIndex.has(event.type)) {
      this.typeIndex.set(event.type, new Set());
    }
    this.typeIndex.get(event.type)!.add(entry.id);

    // Update source agent index
    if (!this.sourceIndex.has(event.sourceAgentId)) {
      this.sourceIndex.set(event.sourceAgentId, new Set());
    }
    this.sourceIndex.get(event.sourceAgentId)!.add(entry.id);

    // Update target agent index
    if (event.targetAgentId) {
      if (!this.targetIndex.has(event.targetAgentId)) {
        this.targetIndex.set(event.targetAgentId, new Set());
      }
      this.targetIndex.get(event.targetAgentId)!.add(entry.id);
    }

    // Update correlation ID index
    if (event.correlationId) {
      if (!this.correlationIndex.has(event.correlationId)) {
        this.correlationIndex.set(event.correlationId, new Set());
      }
      this.correlationIndex.get(event.correlationId)!.add(entry.id);
    }

    // Update time index (keep sorted)
    const timeEntry = {
      timestamp: event.timestamp.getTime(),
      id: entry.id,
    };
    this.insertIntoTimeIndex(timeEntry);

    // Enforce max store size
    if (this.records.size > this.maxStoreSize) {
      this.evictOldest();
    }

    return entry;
  }

  /**
   * Get an event store entry by ID.
   */
  async getEvent(id: string): Promise<EventStoreEntry | null> {
    const record = this.records.get(id);
    return record ? { ...record.entry } : null;
  }

  /**
   * Get a raw event by store entry ID.
   */
  getRawEvent(entryId: string): AgentEvent | null {
    const record = this.records.get(entryId);
    return record ? { ...record.event } : null;
  }

  /**
   * Query events with filters, supporting type, agent, time range, and correlation ID.
   */
  async query(filter: {
    eventTypes?: AgentEventType[];
    sourceAgentId?: string;
    targetAgentId?: string;
    correlationId?: string;
    fromTimestamp?: Date;
    toTimestamp?: Date;
    limit?: number;
    offset?: number;
  }): Promise<EventStoreEntry[]> {
    let candidateIds: Set<string> = new Set();

    // Apply type filter
    if (filter.eventTypes && filter.eventTypes.length > 0) {
      for (const type of filter.eventTypes) {
        const typeIds = this.typeIndex.get(type);
        if (typeIds) {
          for (const id of typeIds) {
            candidateIds.add(id);
          }
        }
      }
    } else {
      candidateIds = new Set(this.records.keys());
    }

    // Apply source agent filter
    if (filter.sourceAgentId) {
      const sourceIds = this.sourceIndex.get(filter.sourceAgentId);
      if (sourceIds) {
        candidateIds = new Set(Array.from(candidateIds).filter((id) => sourceIds.has(id)));
      } else {
        return [];
      }
    }

    // Apply target agent filter
    if (filter.targetAgentId) {
      const targetIds = this.targetIndex.get(filter.targetAgentId);
      if (targetIds) {
        candidateIds = new Set(Array.from(candidateIds).filter((id) => targetIds.has(id)));
      } else {
        return [];
      }
    }

    // Apply correlation ID filter
    if (filter.correlationId) {
      const correlationIds = this.correlationIndex.get(filter.correlationId);
      if (correlationIds) {
        candidateIds = new Set(Array.from(candidateIds).filter((id) => correlationIds.has(id)));
      } else {
        return [];
      }
    }

    // Collect matching records
    const results: EventStoreEntry[] = [];

    for (const id of candidateIds) {
      const record = this.records.get(id);
      if (!record) continue;

      const event = record.event;

      // Apply time filters
      if (filter.fromTimestamp && event.timestamp < filter.fromTimestamp) {
        continue;
      }
      if (filter.toTimestamp && event.timestamp > filter.toTimestamp) {
        continue;
      }

      results.push({ ...record.entry });
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.event.timestamp.getTime() - a.event.timestamp.getTime());

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;

    return results.slice(offset, offset + limit);
  }

  /**
   * Query events by agent ID (convenience method).
   */
  async queryByAgent(
    agentId: string,
    options?: {
      eventTypes?: AgentEventType[];
      fromTimestamp?: Date;
      toTimestamp?: Date;
      limit?: number;
    },
  ): Promise<EventStoreEntry[]> {
    return this.query({
      sourceAgentId: agentId,
      eventTypes: options?.eventTypes,
      fromTimestamp: options?.fromTimestamp,
      toTimestamp: options?.toTimestamp,
      limit: options?.limit || 100,
    });
  }

  /**
   * Query events by type (convenience method).
   */
  async queryByType(
    eventType: AgentEventType,
    options?: {
      sourceAgentId?: string;
      fromTimestamp?: Date;
      toTimestamp?: Date;
      limit?: number;
    },
  ): Promise<EventStoreEntry[]> {
    return this.query({
      eventTypes: [eventType],
      sourceAgentId: options?.sourceAgentId,
      fromTimestamp: options?.fromTimestamp,
      toTimestamp: options?.toTimestamp,
      limit: options?.limit || 100,
    });
  }

  /**
   * Query events by time range (convenience method).
   */
  async queryByTimeRange(from: Date, to: Date, limit?: number): Promise<EventStoreEntry[]> {
    return this.query({
      fromTimestamp: from,
      toTimestamp: to,
      limit: limit || 1000,
    });
  }

  /**
   * Mark an event as processed.
   */
  async markProcessed(id: string): Promise<void> {
    const record = this.records.get(id);
    if (!record) return;

    const processingTime = Date.now() - record.entry.storedAt.getTime();
    record.entry.status = EventProcessingStatus.COMPLETED;
    record.entry.processedAt = new Date();
    record.entry.processingAttempts++;

    this.totalProcessingTimeMs += processingTime;
    this.processedCount++;
  }

  /**
   * Mark an event as failed.
   */
  async markFailed(id: string, error: string): Promise<void> {
    const record = this.records.get(id);
    if (!record) return;

    record.entry.status = EventProcessingStatus.FAILED;
    record.entry.processingAttempts++;
  }

  /**
   * Get total event count.
   */
  getCount(): number {
    return this.records.size;
  }

  /**
   * Get event count by type.
   */
  getCountByType(eventType: AgentEventType): number {
    const ids = this.typeIndex.get(eventType);
    return ids ? ids.size : 0;
  }

  /**
   * Get event count by agent.
   */
  getCountByAgent(agentId: string): number {
    const ids = this.sourceIndex.get(agentId);
    return ids ? ids.size : 0;
  }

  /**
   * Get event count in time range.
   */
  getCountByTimeRange(from: Date, to: Date): number {
    let count = 0;
    for (const record of this.records.values()) {
      const ts = record.event.timestamp;
      if (ts >= from && ts <= to) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get comprehensive event store statistics.
   */
  getStatistics(): EventStoreStatistics {
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byAgentId: Record<string, number> = {};

    for (const status of Object.values(EventProcessingStatus)) {
      byStatus[status] = 0;
    }

    let oldestTimestamp = Infinity;
    let newestTimestamp = -Infinity;
    let totalPayloadSize = 0;

    for (const record of this.records.values()) {
      byStatus[record.entry.status] = (byStatus[record.entry.status] || 0) + 1;
      byType[record.event.type] = (byType[record.event.type] || 0) + 1;
      byAgentId[record.event.sourceAgentId] = (byAgentId[record.event.sourceAgentId] || 0) + 1;

      const ts = record.event.timestamp.getTime();
      if (ts < oldestTimestamp) oldestTimestamp = ts;
      if (ts > newestTimestamp) newestTimestamp = ts;

      totalPayloadSize += JSON.stringify(record.event.payload).length;
    }

    const uptimeMs = Date.now() - this.initializedAt.getTime();
    const eventsPerMinute =
      uptimeMs > 0 ? Math.round((this.records.size / uptimeMs) * 60000 * 100) / 100 : 0;

    const avgProcessingTimeMs =
      this.processedCount > 0 ? Math.round(this.totalProcessingTimeMs / this.processedCount) : 0;

    return {
      totalEvents: this.records.size,
      byStatus: byStatus as Record<EventProcessingStatus, number>,
      byType,
      byAgentId,
      oldestEvent: oldestTimestamp < Infinity ? new Date(oldestTimestamp) : undefined,
      newestEvent: newestTimestamp > -Infinity ? new Date(newestTimestamp) : undefined,
      totalPayloadSizeBytes: totalPayloadSize,
      eventsPerMinute,
      avgProcessingTimeMs,
    };
  }

  /**
   * Get basic stats (backwards compatible).
   */
  getStats(): {
    totalEvents: number;
    byStatus: Record<EventProcessingStatus, number>;
    byType: Record<string, number>;
    oldestEvent?: Date;
    newestEvent?: Date;
  } {
    const stats = this.getStatistics();
    return {
      totalEvents: stats.totalEvents,
      byStatus: stats.byStatus,
      byType: stats.byType,
      oldestEvent: stats.oldestEvent,
      newestEvent: stats.newestEvent,
    };
  }

  /**
   * Clear all events from the store.
   */
  clear(): number {
    const count = this.records.size;
    this.records.clear();
    this.typeIndex.clear();
    this.sourceIndex.clear();
    this.targetIndex.clear();
    this.correlationIndex.clear();
    this.timeIndex.length = 0;
    this.totalProcessingTimeMs = 0;
    this.processedCount = 0;
    this.logger.log(`Cleared ${count} events from store`);
    return count;
  }

  // ─── Private Methods ──────────────────────────────────────────────

  /**
   * Insert into time index while maintaining sorted order.
   */
  private insertIntoTimeIndex(entry: { timestamp: number; id: string }): void {
    // Binary search for insertion point
    let low = 0;
    let high = this.timeIndex.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.timeIndex[mid].timestamp < entry.timestamp) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    this.timeIndex.splice(low, 0, entry);
  }

  /**
   * Evict oldest entries when store exceeds max size.
   */
  private evictOldest(): void {
    // Remove oldest 10% of entries
    const toRemove = Math.floor(this.maxStoreSize * 0.1);

    for (let i = 0; i < toRemove && this.timeIndex.length > 0; i++) {
      const oldest = this.timeIndex[0];
      this.removeEntry(oldest.id);
    }

    this.logger.debug?.(`Evicted ${toRemove} oldest events`);
  }

  private removeEntry(id: string): void {
    const record = this.records.get(id);
    if (!record) return;

    // Remove from type index
    const typeSet = this.typeIndex.get(record.event.type);
    if (typeSet) {
      typeSet.delete(id);
      if (typeSet.size === 0) this.typeIndex.delete(record.event.type);
    }

    // Remove from source index
    const sourceSet = this.sourceIndex.get(record.event.sourceAgentId);
    if (sourceSet) {
      sourceSet.delete(id);
      if (sourceSet.size === 0) this.sourceIndex.delete(record.event.sourceAgentId);
    }

    // Remove from target index
    if (record.event.targetAgentId) {
      const targetSet = this.targetIndex.get(record.event.targetAgentId);
      if (targetSet) {
        targetSet.delete(id);
        if (targetSet.size === 0) this.targetIndex.delete(record.event.targetAgentId);
      }
    }

    // Remove from correlation index
    if (record.event.correlationId) {
      const corrSet = this.correlationIndex.get(record.event.correlationId);
      if (corrSet) {
        corrSet.delete(id);
        if (corrSet.size === 0) this.correlationIndex.delete(record.event.correlationId);
      }
    }

    this.records.delete(id);

    // Remove from time index (binary search since it's sorted)
    const timeIdx = this.timeIndex.findIndex((t) => t.id === id);
    if (timeIdx >= 0) {
      this.timeIndex.splice(timeIdx, 1);
    }
  }
}
