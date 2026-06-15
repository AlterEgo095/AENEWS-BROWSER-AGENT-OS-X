/**
 * AENEWS Agent OS X — Collaboration Persistence Service
 *
 * Phase 10 — Database-backed collaboration state with crash recovery.
 *
 * Storage:
 *   - Redis for active collaborations (fast access)
 *   - In-memory fallback when Redis is unavailable
 *   - PostgreSQL for historical collaboration records (via AgentMemoryService)
 *
 * Recovery:
 *   - On startup, scans for active collaborations and re-attaches handlers
 *   - Crashed collaborations are marked for manual review
 *
 * Checkpoints:
 *   - Collaboration state is checkpointed every 30 seconds
 *   - Checkpoint after each phase transition
 *
 * Query API:
 *   - Historical collaboration search, statistics, and pattern analysis
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';
import { CollaborationState } from '../entities/collaboration-state.entity';

// ─── Persistence Types ────────────────────────────────────────────

export type CollaborationPhase =
  | 'created'
  | 'assigning'
  | 'executing'
  | 'collecting'
  | 'merging'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'crashed';

export interface CollaborationCheckpoint {
  collaborationId: string;
  phase: CollaborationPhase;
  agentIds: string[];
  assignedAgents: string[];
  results: any[];
  errors: string[];
  startedAt: number;
  lastCheckpointAt: number;
  parentMissionId?: string;
  pattern: string;
  metadata: Record<string, any>;
}

export interface CollaborationHistoryRecord {
  id: string;
  collaborationId: string;
  pattern: string;
  phase: CollaborationPhase;
  agentCount: number;
  durationMs: number;
  successRate: number;
  startedAt: number;
  completedAt: number;
  parentMissionId?: string;
  metadata: Record<string, any>;
}

export interface RecoveryReport {
  totalActive: number;
  recovered: number;
  crashed: number;
  recoveredIds: string[];
  crashedIds: string[];
}

export interface PersistenceStats {
  totalCollaborations: number;
  activeCollaborations: number;
  completedCollaborations: number;
  failedCollaborations: number;
  crashedCollaborations: number;
  averageDurationMs: number;
  averageAgentCount: number;
  patternDistribution: Record<string, number>;
  checkpointSizeBytes: number;
}

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class CollaborationPersistenceService {
  private readonly logger = new Logger(CollaborationPersistenceService.name);

  /** Active collaboration checkpoints (in-memory + Redis) */
  private readonly activeCheckpoints = new Map<string, CollaborationCheckpoint>();

  /** Historical records */
  private readonly history = new Map<string, CollaborationHistoryRecord>();

  /** Checkpoint interval handle */
  private checkpointInterval?: ReturnType<typeof setInterval>;

  /** Whether the service has been initialized */
  private initialized = false;

  constructor(
    private readonly memoryService: AgentMemoryService,
    private readonly eventBus: AgentEventBusService,
    @Optional() @InjectRepository(CollaborationState) private readonly stateRepo?: Repository<CollaborationState>,
  ) {
    this.initialize();
  }

  // ─── Initialization & Recovery ────────────────────────────────

  /**
   * Initialize the persistence service and attempt crash recovery.
   * Loads active collaborations from DB into L1 in-memory cache.
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load active collaborations from DB into L1 cache
      if (this.stateRepo) {
        const activeStates = await this.stateRepo.find({
          where: [
            { phase: 'created' },
            { phase: 'assigning' },
            { phase: 'executing' },
            { phase: 'collecting' },
            { phase: 'merging' },
          ],
        });

        for (const state of activeStates) {
          const checkpoint = this.entityToCheckpoint(state);
          this.activeCheckpoints.set(state.collaborationId, checkpoint);
        }

        // Load history from DB
        const historyStates = await this.stateRepo.find({
          where: [
            { phase: 'completed' },
            { phase: 'failed' },
            { phase: 'timeout' },
            { phase: 'crashed' },
          ],
          order: { updatedAt: 'DESC' },
          take: 500,
        });

        for (const state of historyStates) {
          const record = this.entityToHistoryRecord(state);
          this.history.set(record.id, record);
        }

        this.logger.log(`Loaded ${activeStates.length} active + ${historyStates.length} historical collaborations from DB`);
      }

      // Attempt to recover active collaborations from Redis
      const recoveryReport = await this.recoverFromCrash();
      this.logger.log(`Persistence initialized. Recovery: ${recoveryReport.recovered} recovered, ${recoveryReport.crashed} crashed`);

      // Start periodic checkpointing
      this.checkpointInterval = setInterval(
        () => this.checkpointAll(),
        30000, // 30 seconds
      );

      this.initialized = true;
    } catch (error) {
      this.logger.error(`Persistence initialization failed: ${error.message}`);
      // Continue with in-memory only
      this.initialized = true;
    }
  }

  /**
   * Recover active collaborations from a crash.
   */
  async recoverFromCrash(): Promise<RecoveryReport> {
    const report: RecoveryReport = {
      totalActive: 0,
      recovered: 0,
      crashed: 0,
      recoveredIds: [],
      crashedIds: [],
    };

    try {
      // Retrieve all active collaboration keys from Redis
      const keysJson = await this.memoryService.retrieve(
        'persistence:active_collaboration_keys',
        MemoryTier.SHORT_TERM,
      );

      if (!keysJson) return report;

      const keys: string[] = JSON.parse(keysJson);

      for (const key of keys) {
        report.totalActive++;
        try {
          const checkpointJson = await this.memoryService.retrieve(
            `persistence:checkpoint:${key}`,
            MemoryTier.SHORT_TERM,
          );

          if (!checkpointJson) {
            // No checkpoint found — collaboration is crashed
            report.crashed++;
            report.crashedIds.push(key);
            await this.markAsCrashed(key);
            continue;
          }

          const checkpoint: CollaborationCheckpoint = JSON.parse(checkpointJson);

          // Check if the collaboration was in a terminal state
          if (['completed', 'failed', 'timeout'].includes(checkpoint.phase)) {
            // Already terminal — just move to history
            await this.moveToHistory(checkpoint);
            continue;
          }

          // Attempt recovery
          const recovered = await this.recoverCollaboration(checkpoint);
          if (recovered) {
            report.recovered++;
            report.recoveredIds.push(key);
          } else {
            report.crashed++;
            report.crashedIds.push(key);
            await this.markAsCrashed(key);
          }
        } catch (error) {
          this.logger.warn(`Failed to recover collaboration ${key}: ${error.message}`);
          report.crashed++;
          report.crashedIds.push(key);
          await this.markAsCrashed(key);
        }
      }
    } catch (error) {
      this.logger.warn(`Crash recovery scan failed: ${error.message}`);
    }

    await this.eventBus.publish({
      type: AgentEventType.CUSTOM,
      source: 'CollaborationPersistenceService',
      data: { event: 'recovery.completed', report },
      timestamp: new Date(),
    });

    return report;
  }

  /**
   * Attempt to recover a single collaboration.
   */
  private async recoverCollaboration(checkpoint: CollaborationCheckpoint): Promise<boolean> {
    try {
      // Re-attach checkpoint to active state
      this.activeCheckpoints.set(checkpoint.collaborationId, checkpoint);

      this.logger.log(`Recovered collaboration ${checkpoint.collaborationId} at phase ${checkpoint.phase}`);

      await this.eventBus.publish({
        type: AgentEventType.CUSTOM,
        source: 'CollaborationPersistenceService',
        data: { event: 'collaboration.recovered', collaborationId: checkpoint.collaborationId, phase: checkpoint.phase },
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to recover collaboration ${checkpoint.collaborationId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Mark a collaboration as crashed.
   */
  private async markAsCrashed(collaborationId: string): Promise<void> {
    const crashedCheckpoint: CollaborationCheckpoint = {
      collaborationId,
      phase: 'crashed',
      agentIds: [],
      assignedAgents: [],
      results: [],
      errors: ['Crash detected — no checkpoint available'],
      startedAt: Date.now(),
      lastCheckpointAt: Date.now(),
      pattern: 'unknown',
      metadata: { crashed: true },
    };

    this.activeCheckpoints.set(collaborationId, crashedCheckpoint);

    await this.eventBus.publish({
      type: AgentEventType.CUSTOM,
      source: 'CollaborationPersistenceService',
      data: { event: 'collaboration.crashed', collaborationId },
      timestamp: new Date(),
    });
  }

  // ─── Checkpoint Operations ────────────────────────────────────

  /**
   * Create a checkpoint for a collaboration.
   * Persists to L1 (in-memory), Redis, and L2 (PostgreSQL via TypeORM).
   */
  async checkpoint(checkpoint: CollaborationCheckpoint): Promise<void> {
    checkpoint.lastCheckpointAt = Date.now();

    // Store in L1 memory
    this.activeCheckpoints.set(checkpoint.collaborationId, checkpoint);

    // Persist to L2 database (PostgreSQL via TypeORM)
    if (this.stateRepo) {
      try {
        await this.stateRepo.save({
          collaborationId: checkpoint.collaborationId,
          phase: checkpoint.phase,
          agentIds: checkpoint.agentIds,
          assignedAgents: checkpoint.assignedAgents,
          results: checkpoint.results,
          errors: checkpoint.errors,
          startedAt: checkpoint.startedAt,
          lastCheckpointAt: checkpoint.lastCheckpointAt,
          parentMissionId: checkpoint.parentMissionId ?? null,
          pattern: checkpoint.pattern,
          metadata: checkpoint.metadata,
        });
      } catch (error) {
        this.logger.warn(`Failed to persist checkpoint to DB for ${checkpoint.collaborationId}: ${error.message}`);
      }
    }

    // Persist to Redis
    try {
      await this.memoryService.store(
        `persistence:checkpoint:${checkpoint.collaborationId}`,
        JSON.stringify(checkpoint),
        MemoryTier.SHORT_TERM,
        3600, // 1 hour TTL
      );

      // Update active keys list
      const keysJson = await this.memoryService.retrieve(
        'persistence:active_collaboration_keys',
        MemoryTier.SHORT_TERM,
      );
      const keys: string[] = keysJson ? JSON.parse(keysJson) : [];
      if (!keys.includes(checkpoint.collaborationId)) {
        keys.push(checkpoint.collaborationId);
        await this.memoryService.store(
          'persistence:active_collaboration_keys',
          JSON.stringify(keys),
          MemoryTier.SHORT_TERM,
          3600,
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to persist checkpoint for ${checkpoint.collaborationId}: ${error.message}`);
    }
  }

  /**
   * Checkpoint all active collaborations.
   */
  private async checkpointAll(): Promise<void> {
    for (const [id, checkpoint] of this.activeCheckpoints) {
      // Skip terminal states
      if (['completed', 'failed', 'timeout', 'crashed'].includes(checkpoint.phase)) {
        continue;
      }

      await this.checkpoint(checkpoint);
    }
  }

  // ─── Lifecycle Operations ─────────────────────────────────────

  /**
   * Record the start of a collaboration.
   */
  async recordStart(
    collaborationId: string,
    pattern: string,
    agentIds: string[],
    parentMissionId?: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    const checkpoint: CollaborationCheckpoint = {
      collaborationId,
      phase: 'created',
      agentIds,
      assignedAgents: [],
      results: [],
      errors: [],
      startedAt: Date.now(),
      lastCheckpointAt: Date.now(),
      parentMissionId,
      pattern,
      metadata,
    };

    await this.checkpoint(checkpoint);

    this.logger.log(`Recorded start of collaboration ${collaborationId} (${pattern})`);
  }

  /**
   * Update the phase of a collaboration.
   */
  async updatePhase(collaborationId: string, phase: CollaborationPhase): Promise<void> {
    const checkpoint = this.activeCheckpoints.get(collaborationId);
    if (!checkpoint) {
      this.logger.warn(`Cannot update phase — collaboration ${collaborationId} not found`);
      return;
    }

    checkpoint.phase = phase;
    await this.checkpoint(checkpoint);

    // If terminal, move to history
    if (['completed', 'failed', 'timeout'].includes(phase)) {
      await this.moveToHistory(checkpoint);
    }
  }

  /**
   * Add a result to a collaboration.
   */
  async addResult(collaborationId: string, result: any): Promise<void> {
    const checkpoint = this.activeCheckpoints.get(collaborationId);
    if (!checkpoint) return;

    checkpoint.results.push(result);
    await this.checkpoint(checkpoint);
  }

  /**
   * Add an error to a collaboration.
   */
  async addError(collaborationId: string, error: string): Promise<void> {
    const checkpoint = this.activeCheckpoints.get(collaborationId);
    if (!checkpoint) return;

    checkpoint.errors.push(error);
    await this.checkpoint(checkpoint);
  }

  /**
   * Complete a collaboration and move to history.
   */
  async completeCollaboration(
    collaborationId: string,
    successRate: number = 1.0,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    const checkpoint = this.activeCheckpoints.get(collaborationId);
    if (!checkpoint) return;

    checkpoint.phase = 'completed';
    checkpoint.metadata = { ...checkpoint.metadata, ...metadata, successRate };
    await this.checkpoint(checkpoint);
    await this.moveToHistory(checkpoint);

    this.logger.log(`Completed collaboration ${collaborationId} with success rate ${successRate}`);
  }

  /**
   * Move a completed collaboration to history.
   * Persists the terminal state to DB.
   */
  private async moveToHistory(checkpoint: CollaborationCheckpoint): Promise<void> {
    const record: CollaborationHistoryRecord = {
      id: `history-${checkpoint.collaborationId}`,
      collaborationId: checkpoint.collaborationId,
      pattern: checkpoint.pattern,
      phase: checkpoint.phase,
      agentCount: checkpoint.agentIds.length,
      durationMs: Date.now() - checkpoint.startedAt,
      successRate: checkpoint.metadata?.successRate ?? 0,
      startedAt: checkpoint.startedAt,
      completedAt: Date.now(),
      parentMissionId: checkpoint.parentMissionId,
      metadata: checkpoint.metadata,
    };

    this.history.set(record.id, record);

    // Persist terminal state to DB
    if (this.stateRepo) {
      try {
        await this.stateRepo.save({
          collaborationId: checkpoint.collaborationId,
          phase: checkpoint.phase,
          agentIds: checkpoint.agentIds,
          assignedAgents: checkpoint.assignedAgents,
          results: checkpoint.results,
          errors: checkpoint.errors,
          startedAt: checkpoint.startedAt,
          lastCheckpointAt: Date.now(),
          parentMissionId: checkpoint.parentMissionId ?? null,
          pattern: checkpoint.pattern,
          metadata: { ...checkpoint.metadata, successRate: checkpoint.metadata?.successRate ?? 0, durationMs: record.durationMs, completedAt: record.completedAt },
        });
      } catch (error) {
        this.logger.warn(`Failed to persist history to DB for ${checkpoint.collaborationId}: ${error.message}`);
      }
    }

    // Store in long-term memory (Redis)
    try {
      await this.memoryService.store(
        `persistence:history:${record.id}`,
        JSON.stringify(record),
        MemoryTier.LONG_TERM,
        86400 * 30, // 30 days TTL
      );

      // Remove from active keys
      const keysJson = await this.memoryService.retrieve(
        'persistence:active_collaboration_keys',
        MemoryTier.SHORT_TERM,
      );
      if (keysJson) {
        const keys: string[] = JSON.parse(keysJson);
        const updated = keys.filter(k => k !== checkpoint.collaborationId);
        await this.memoryService.store(
          'persistence:active_collaboration_keys',
          JSON.stringify(updated),
          MemoryTier.SHORT_TERM,
          3600,
        );
      }
    } catch (error) {
      this.logger.warn(`Failed to persist history for ${checkpoint.collaborationId}: ${error.message}`);
    }

    // Remove from active checkpoints
    this.activeCheckpoints.delete(checkpoint.collaborationId);
  }

  // ─── Query Operations ─────────────────────────────────────────

  /**
   * Get a checkpoint for a collaboration.
   */
  getCheckpoint(collaborationId: string): CollaborationCheckpoint | undefined {
    return this.activeCheckpoints.get(collaborationId);
  }

  /**
   * Get all active collaborations.
   */
  getActiveCollaborations(): CollaborationCheckpoint[] {
    return Array.from(this.activeCheckpoints.values())
      .filter(c => !['completed', 'failed', 'timeout', 'crashed'].includes(c.phase));
  }

  /**
   * Get collaboration history.
   */
  getHistory(limit: number = 50, pattern?: string): CollaborationHistoryRecord[] {
    let records = Array.from(this.history.values());

    if (pattern) {
      records = records.filter(r => r.pattern === pattern);
    }

    return records
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, limit);
  }

  /**
   * Search collaboration history.
   */
  searchHistory(query: {
    pattern?: string;
    minDurationMs?: number;
    maxDurationMs?: number;
    minSuccessRate?: number;
    parentMissionId?: string;
    startDate?: number;
    endDate?: number;
  }): CollaborationHistoryRecord[] {
    let records = Array.from(this.history.values());

    if (query.pattern) records = records.filter(r => r.pattern === query.pattern);
    if (query.minDurationMs) records = records.filter(r => r.durationMs >= query.minDurationMs!);
    if (query.maxDurationMs) records = records.filter(r => r.durationMs <= query.maxDurationMs!);
    if (query.minSuccessRate) records = records.filter(r => r.successRate >= query.minSuccessRate!);
    if (query.parentMissionId) records = records.filter(r => r.parentMissionId === query.parentMissionId);
    if (query.startDate) records = records.filter(r => r.startedAt >= query.startDate!);
    if (query.endDate) records = records.filter(r => r.completedAt <= query.endDate!);

    return records.sort((a, b) => b.completedAt - a.completedAt);
  }

  /**
   * Get persistence statistics.
   */
  getStats(): PersistenceStats {
    const activeRecords = this.getActiveCollaborations();
    const allHistory = Array.from(this.history.values());

    const completed = allHistory.filter(r => r.phase === 'completed');
    const failed = allHistory.filter(r => r.phase === 'failed');
    const crashed = allHistory.filter(r => r.phase === 'crashed');

    const avgDuration = completed.length > 0
      ? completed.reduce((sum, r) => sum + r.durationMs, 0) / completed.length
      : 0;

    const avgAgents = allHistory.length > 0
      ? allHistory.reduce((sum, r) => sum + r.agentCount, 0) / allHistory.length
      : 0;

    const patternDist: Record<string, number> = {};
    for (const record of allHistory) {
      patternDist[record.pattern] = (patternDist[record.pattern] || 0) + 1;
    }

    const checkpointSize = Array.from(this.activeCheckpoints.values())
      .reduce((sum, c) => sum + JSON.stringify(c).length, 0);

    return {
      totalCollaborations: allHistory.length + activeRecords.length,
      activeCollaborations: activeRecords.length,
      completedCollaborations: completed.length,
      failedCollaborations: failed.length,
      crashedCollaborations: crashed.length,
      averageDurationMs: avgDuration,
      averageAgentCount: avgAgents,
      patternDistribution: patternDist,
      checkpointSizeBytes: checkpointSize,
    };
  }

  /**
   * Cleanup on module destroy.
   */
  onModuleDestroy(): void {
    if (this.checkpointInterval) {
      clearInterval(this.checkpointInterval);
    }

    // Final checkpoint
    this.checkpointAll();
    this.logger.log('Persistence service destroyed — final checkpoint saved');
  }

  // ─── DB Entity Conversion Helpers ────────────────────────────────

  private entityToCheckpoint(entity: CollaborationState): CollaborationCheckpoint {
    return {
      collaborationId: entity.collaborationId,
      phase: entity.phase as CollaborationPhase,
      agentIds: entity.agentIds,
      assignedAgents: entity.assignedAgents,
      results: entity.results,
      errors: entity.errors,
      startedAt: Number(entity.startedAt),
      lastCheckpointAt: Number(entity.lastCheckpointAt),
      parentMissionId: entity.parentMissionId ?? undefined,
      pattern: entity.pattern,
      metadata: entity.metadata,
    };
  }

  private entityToHistoryRecord(entity: CollaborationState): CollaborationHistoryRecord {
    const completedAt = entity.metadata?.completedAt ?? Number(entity.lastCheckpointAt);
    const durationMs = entity.metadata?.durationMs ?? (completedAt - Number(entity.startedAt));
    return {
      id: `history-${entity.collaborationId}`,
      collaborationId: entity.collaborationId,
      pattern: entity.pattern,
      phase: entity.phase as CollaborationPhase,
      agentCount: entity.agentIds.length,
      durationMs,
      successRate: entity.metadata?.successRate ?? 0,
      startedAt: Number(entity.startedAt),
      completedAt,
      parentMissionId: entity.parentMissionId ?? undefined,
      metadata: entity.metadata,
    };
  }
}
