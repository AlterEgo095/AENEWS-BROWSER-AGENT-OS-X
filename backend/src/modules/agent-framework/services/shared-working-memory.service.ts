/**
 * AENEWS Agent OS X — Shared Working Memory Service
 *
 * Phase 10 — Shared context store for multi-agent collaboration sessions.
 *
 * Architecture:
 *   Redis-backed with namespaced keys per collaboration session.
 *   Each session has:
 *     - shared workspace: visible to all agents
 *     - agent-specific scratchpads: private to each agent
 *     - blackboard: results area for final outputs
 *
 * Conflict Resolution:
 *   Last-writer-wins with version vectors for concurrent writes.
 *   Optional merge function for structured data.
 *
 * Scoping:
 *   - session-scoped: auto-deleted on collaboration end
 *   - mission-scoped: persists across collaborations within a mission
 *   - persistent: never auto-deleted
 *
 * Access Patterns:
 *   Agents read/write through namespaced keys.
 *   Subscription model for real-time updates.
 */

import { Injectable, Logger } from '@nestjs/common';
import { AgentMemoryService, MemoryTier } from './agent-memory.service';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';

// ─── Memory Types ─────────────────────────────────────────────────

export type DataScope = 'session' | 'mission' | 'persistent';

export interface WorkingMemoryEntry {
  key: string;
  value: any;
  scope: DataScope;
  sessionId: string;
  agentId: string;
  version: number;
  timestamp: number;
  ttlSeconds?: number;
  metadata?: Record<string, any>;
}

export interface WorkingMemorySession {
  sessionId: string;
  missionId?: string;
  agents: string[];
  sharedKeys: string[];
  blackboardKeys: string[];
  createdAt: number;
  lastActivityAt: number;
  scope: DataScope;
}

export interface MemoryConflict {
  key: string;
  sessionId: string;
  existingValue: any;
  existingVersion: number;
  newValue: any;
  newVersion: number;
  conflictingAgentIds: string[];
  resolvedBy: 'last_writer_wins' | 'merge' | 'manual';
  resolvedValue?: any;
}

export interface MemorySubscription {
  id: string;
  sessionId: string;
  agentId: string;
  keyPattern: string;
  callback: (entry: WorkingMemoryEntry) => void;
}

export interface SharedWorkingMemoryStats {
  totalSessions: number;
  totalEntries: number;
  totalConflicts: number;
  conflictsResolved: number;
  averageEntriesPerSession: number;
  scopeDistribution: Record<DataScope, number>;
  memoryUsageBytes: number;
}

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class SharedWorkingMemoryService {
  private readonly logger = new Logger(SharedWorkingMemoryService.name);

  /** Active sessions by ID */
  private readonly sessions = new Map<string, WorkingMemorySession>();

  /** Working memory entries by session ID -> key -> entry */
  private readonly entries = new Map<string, Map<string, WorkingMemoryEntry>>();

  /** Agent scratchpads by session ID -> agent ID -> key -> entry */
  private readonly scratchpads = new Map<string, Map<string, Map<string, WorkingMemoryEntry>>>();

  /** Version vectors for conflict detection */
  private readonly versionVectors = new Map<string, Map<string, number[]>>();

  /** Conflict log */
  private readonly conflicts: MemoryConflict[] = [];

  /** Subscriptions by session ID */
  private readonly subscriptions = new Map<string, MemorySubscription[]>();

  constructor(
    private readonly memoryService: AgentMemoryService,
    private readonly eventBus: AgentEventBusService,
  ) {}

  // ─── Session Management ───────────────────────────────────────

  /**
   * Create a new working memory session.
   */
  async createSession(
    sessionId: string,
    agentIds: string[],
    missionId?: string,
    scope: DataScope = 'session',
  ): Promise<WorkingMemorySession> {
    const session: WorkingMemorySession = {
      sessionId,
      missionId,
      agents: agentIds,
      sharedKeys: [],
      blackboardKeys: [],
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      scope,
    };

    this.sessions.set(sessionId, session);
    this.entries.set(sessionId, new Map());
    this.scratchpads.set(sessionId, new Map());
    this.versionVectors.set(sessionId, new Map());

    // Initialize scratchpad for each agent
    for (const agentId of agentIds) {
      this.scratchpads.get(sessionId)!.set(agentId, new Map());
    }

    this.logger.log(`Working memory session ${sessionId} created with ${agentIds.length} agents`);

    await this.eventBus.publish({
      type: AgentEventType.CUSTOM,
      source: 'SharedWorkingMemoryService',
      data: { event: 'session.created', sessionId, agentCount: agentIds.length, scope },
      timestamp: new Date(),
    });

    return session;
  }

  /**
   * Close a working memory session.
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // If session-scoped, clear all data
    if (session.scope === 'session') {
      this.entries.delete(sessionId);
      this.scratchpads.delete(sessionId);
      this.versionVectors.delete(sessionId);
    }

    // If mission-scoped or persistent, archive to long-term memory
    if (session.scope === 'mission' || session.scope === 'persistent') {
      const sessionEntries = this.entries.get(sessionId);
      if (sessionEntries) {
        for (const [key, entry] of sessionEntries) {
          await this.memoryService.store(
            `working_memory:${sessionId}:${key}`,
            JSON.stringify(entry),
            MemoryTier.LONG_TERM,
            session.scope === 'persistent' ? 0 : 86400 * 7, // 7 days for mission-scoped
          );
        }
      }
    }

    this.sessions.delete(sessionId);
    this.subscriptions.delete(sessionId);

    this.logger.log(`Working memory session ${sessionId} closed`);

    await this.eventBus.publish({
      type: AgentEventType.CUSTOM,
      source: 'SharedWorkingMemoryService',
      data: { event: 'session.closed', sessionId },
      timestamp: new Date(),
    });
  }

  // ─── Shared Workspace Operations ──────────────────────────────

  /**
   * Write to the shared workspace.
   */
  async writeShared(
    sessionId: string,
    key: string,
    value: any,
    agentId: string,
    metadata?: Record<string, any>,
  ): Promise<WorkingMemoryEntry> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const sessionEntries = this.entries.get(sessionId)!;
    const existing = sessionEntries.get(key);

    // Check for conflicts
    if (existing && existing.agentId !== agentId) {
      await this.handleConflict(sessionId, key, existing, value, agentId);
    }

    const newVersion = (existing?.version || 0) + 1;

    const entry: WorkingMemoryEntry = {
      key,
      value,
      scope: session.scope,
      sessionId,
      agentId,
      version: newVersion,
      timestamp: Date.now(),
      metadata,
    };

    sessionEntries.set(key, entry);
    session.lastActivityAt = Date.now();

    if (!session.sharedKeys.includes(key)) {
      session.sharedKeys.push(key);
    }

    // Update version vector
    this.updateVersionVector(sessionId, key, agentId, newVersion);

    // Notify subscribers
    await this.notifySubscribers(sessionId, entry);

    // Persist to Redis
    try {
      await this.memoryService.store(
        `working_memory:shared:${sessionId}:${key}`,
        JSON.stringify(entry),
        MemoryTier.SHORT_TERM,
        session.scope === 'session' ? 3600 : 86400,
      );
    } catch (error) {
      this.logger.warn(`Failed to persist shared entry ${key}: ${error.message}`);
    }

    return entry;
  }

  /**
   * Read from the shared workspace.
   */
  async readShared(sessionId: string, key: string): Promise<WorkingMemoryEntry | undefined> {
    const sessionEntries = this.entries.get(sessionId);
    if (!sessionEntries) return undefined;

    // Try in-memory first
    const entry = sessionEntries.get(key);
    if (entry) return entry;

    // Try Redis
    try {
      const stored = await this.memoryService.retrieve(
        `working_memory:shared:${sessionId}:${key}`,
        MemoryTier.SHORT_TERM,
      );
      if (stored) {
        const parsed: WorkingMemoryEntry = JSON.parse(stored);
        sessionEntries.set(key, parsed);
        return parsed;
      }
    } catch {
      // Redis unavailable
    }

    return undefined;
  }

  /**
   * Read all shared entries for a session.
   */
  async readAllShared(sessionId: string): Promise<WorkingMemoryEntry[]> {
    const sessionEntries = this.entries.get(sessionId);
    if (!sessionEntries) return [];

    return Array.from(sessionEntries.values());
  }

  // ─── Scratchpad Operations ────────────────────────────────────

  /**
   * Write to an agent's private scratchpad.
   */
  async writeScratchpad(
    sessionId: string,
    agentId: string,
    key: string,
    value: any,
    metadata?: Record<string, any>,
  ): Promise<WorkingMemoryEntry> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const agentScratchpads = this.scratchpads.get(sessionId);
    if (!agentScratchpads) {
      throw new Error(`Scratchpads not found for session ${sessionId}`);
    }

    if (!agentScratchpads.has(agentId)) {
      agentScratchpads.set(agentId, new Map());
    }

    const pad = agentScratchpads.get(agentId)!;
    const existing = pad.get(key);
    const newVersion = (existing?.version || 0) + 1;

    const entry: WorkingMemoryEntry = {
      key,
      value,
      scope: session.scope,
      sessionId,
      agentId,
      version: newVersion,
      timestamp: Date.now(),
      metadata,
    };

    pad.set(key, entry);
    session.lastActivityAt = Date.now();

    return entry;
  }

  /**
   * Read from an agent's scratchpad.
   */
  async readScratchpad(
    sessionId: string,
    agentId: string,
    key: string,
  ): Promise<WorkingMemoryEntry | undefined> {
    const agentScratchpads = this.scratchpads.get(sessionId);
    if (!agentScratchpads) return undefined;

    const pad = agentScratchpads.get(agentId);
    if (!pad) return undefined;

    return pad.get(key);
  }

  /**
   * Read all scratchpad entries for an agent.
   */
  async readAgentScratchpad(sessionId: string, agentId: string): Promise<WorkingMemoryEntry[]> {
    const agentScratchpads = this.scratchpads.get(sessionId);
    if (!agentScratchpads) return [];

    const pad = agentScratchpads.get(agentId);
    if (!pad) return [];

    return Array.from(pad.values());
  }

  // ─── Blackboard Operations ────────────────────────────────────

  /**
   * Post a result to the blackboard.
   */
  async postToBlackboard(
    sessionId: string,
    key: string,
    value: any,
    agentId: string,
  ): Promise<WorkingMemoryEntry> {
    const entry = await this.writeShared(sessionId, `blackboard:${key}`, value, agentId);

    const session = this.sessions.get(sessionId);
    if (session && !session.blackboardKeys.includes(key)) {
      session.blackboardKeys.push(key);
    }

    await this.eventBus.publish({
      type: AgentEventType.CUSTOM,
      source: 'SharedWorkingMemoryService',
      data: { event: 'blackboard.posted', sessionId, key, agentId },
      timestamp: new Date(),
    });

    return entry;
  }

  /**
   * Read all blackboard entries.
   */
  async readBlackboard(sessionId: string): Promise<WorkingMemoryEntry[]> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const results: WorkingMemoryEntry[] = [];
    for (const key of session.blackboardKeys) {
      const entry = await this.readShared(sessionId, `blackboard:${key}`);
      if (entry) results.push(entry);
    }
    return results;
  }

  // ─── Subscription Model ───────────────────────────────────────

  /**
   * Subscribe to updates on a key pattern.
   */
  subscribe(
    sessionId: string,
    agentId: string,
    keyPattern: string,
    callback: (entry: WorkingMemoryEntry) => void,
  ): string {
    const subId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const subscription: MemorySubscription = {
      id: subId,
      sessionId,
      agentId,
      keyPattern,
      callback,
    };

    if (!this.subscriptions.has(sessionId)) {
      this.subscriptions.set(sessionId, []);
    }
    this.subscriptions.get(sessionId)!.push(subscription);

    return subId;
  }

  /**
   * Unsubscribe from updates.
   */
  unsubscribe(subscriptionId: string): void {
    for (const [, subs] of this.subscriptions) {
      const idx = subs.findIndex(s => s.id === subscriptionId);
      if (idx >= 0) {
        subs.splice(idx, 1);
        break;
      }
    }
  }

  /**
   * Notify subscribers of a new entry.
   */
  private async notifySubscribers(sessionId: string, entry: WorkingMemoryEntry): Promise<void> {
    const subs = this.subscriptions.get(sessionId) || [];
    for (const sub of subs) {
      // Check if key matches pattern
      const pattern = sub.keyPattern.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(entry.key)) {
        try {
          sub.callback(entry);
        } catch (error) {
          this.logger.warn(`Subscription callback failed for ${sub.id}: ${error.message}`);
        }
      }
    }
  }

  // ─── Conflict Resolution ──────────────────────────────────────

  /**
   * Handle a write conflict.
   */
  private async handleConflict(
    sessionId: string,
    key: string,
    existing: WorkingMemoryEntry,
    newValue: any,
    newAgentId: string,
  ): Promise<void> {
    const conflict: MemoryConflict = {
      key,
      sessionId,
      existingValue: existing.value,
      existingVersion: existing.version,
      newValue,
      newVersion: existing.version + 1,
      conflictingAgentIds: [existing.agentId, newAgentId],
      resolvedBy: 'last_writer_wins',
      resolvedValue: newValue,
    };

    this.conflicts.push(conflict);

    // Last-writer-wins by default
    // (The new value will overwrite the existing one in writeShared)

    this.logger.debug(`Conflict on ${key} in session ${sessionId}: ${existing.agentId} vs ${newAgentId} — resolved by last-writer-wins`);

    await this.eventBus.publish({
      type: AgentEventType.CUSTOM,
      source: 'SharedWorkingMemoryService',
      data: { event: 'conflict.resolved', sessionId, key, strategy: 'last_writer_wins' },
      timestamp: new Date(),
    });
  }

  /**
   * Update the version vector for a key.
   */
  private updateVersionVector(
    sessionId: string,
    key: string,
    agentId: string,
    version: number,
  ): void {
    const sessionVectors = this.versionVectors.get(sessionId);
    if (!sessionVectors) return;

    const keyVector = sessionVectors.get(key) || [];
    // Ensure vector is long enough
    while (keyVector.length <= version) {
      keyVector.push(0);
    }
    keyVector[version] = (keyVector[version] || 0) + 1;
    sessionVectors.set(key, keyVector);
  }

  // ─── Query Operations ─────────────────────────────────────────

  getSession(sessionId: string): WorkingMemorySession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): WorkingMemorySession[] {
    return Array.from(this.sessions.values());
  }

  getConflicts(sessionId?: string): MemoryConflict[] {
    if (sessionId) {
      return this.conflicts.filter(c => c.sessionId === sessionId);
    }
    return [...this.conflicts];
  }

  getStats(): SharedWorkingMemoryStats {
    let totalEntries = 0;
    let totalMemoryBytes = 0;
    const scopeDist: Record<DataScope, number> = { session: 0, mission: 0, persistent: 0 };

    for (const [, sessionEntries] of this.entries) {
      totalEntries += sessionEntries.size;
      for (const [, entry] of sessionEntries) {
        totalMemoryBytes += JSON.stringify(entry).length;
        scopeDist[entry.scope]++;
      }
    }

    for (const [, agentScratchpads] of this.scratchpads) {
      for (const [, pad] of agentScratchpads) {
        totalEntries += pad.size;
        for (const [, entry] of pad) {
          totalMemoryBytes += JSON.stringify(entry).length;
          scopeDist[entry.scope]++;
        }
      }
    }

    return {
      totalSessions: this.sessions.size,
      totalEntries,
      totalConflicts: this.conflicts.length,
      conflictsResolved: this.conflicts.filter(c => c.resolvedBy !== 'manual').length,
      averageEntriesPerSession: this.sessions.size > 0 ? totalEntries / this.sessions.size : 0,
      scopeDistribution: scopeDist,
      memoryUsageBytes: totalMemoryBytes,
    };
  }

  /**
   * Delete a shared key.
   */
  async deleteShared(sessionId: string, key: string): Promise<boolean> {
    const sessionEntries = this.entries.get(sessionId);
    if (!sessionEntries) return false;

    const deleted = sessionEntries.delete(key);

    const session = this.sessions.get(sessionId);
    if (session) {
      session.sharedKeys = session.sharedKeys.filter(k => k !== key);
      session.blackboardKeys = session.blackboardKeys.filter(k => `blackboard:${k}` !== key);
    }

    return deleted;
  }
}
