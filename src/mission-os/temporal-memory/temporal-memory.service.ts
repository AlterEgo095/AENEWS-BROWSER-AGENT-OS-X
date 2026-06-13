/**
 * AENEWS Agent OS X - Temporal Memory Service
 * Chronological memory system organized by time:
 *   Yesterday → Today → Week → Month → Project → Archive
 *
 * Provides time-bucketed storage, retrieval, promotion, and expiry of
 * agent memory entries. Designed for planning and context retrieval
 * across varying time granularities.
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

// ─── Type Definitions ──────────────────────────────────────────────

export enum TimeGranularity {
  MOMENT = 'moment', // Specific point in time
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  PROJECT = 'project', // Project-scoped
  ARCHIVE = 'archive', // Long-term archive
}

export interface TemporalMemoryEntry {
  id: string;
  agentId: string;
  content: any;
  summary: string;
  timestamp: Date;
  timeGranularity: TimeGranularity;
  project: string | null;
  tags: string[];
  importance: number; // 0-1
  accessCount: number;
  lastAccessedAt: Date;
  relatedEntries: string[]; // IDs of related entries
  expiresAt: Date | null;
  promotedFrom: TimeGranularity | null;
  createdAt: Date;
}

export interface TemporalQuery {
  from?: Date;
  to?: Date;
  granularity?: TimeGranularity;
  agentId?: string;
  project?: string;
  tags?: string[];
  importanceThreshold?: number;
  limit?: number;
  offset?: number;
  contentFilter?: string; // Text search in summary
}

export interface TemporalBucket {
  granularity: TimeGranularity;
  period: string; // e.g. "2024-01-15", "2024-W03", "2024-Q1"
  startDate: Date;
  endDate: Date;
  entries: TemporalMemoryEntry[];
  summary: string; // Auto-generated summary of the bucket
  entryCount: number;
  averageImportance: number;
}

export interface TemporalTimeline {
  buckets: TemporalBucket[];
  totalEntries: number;
  timeRange: { from: Date; to: Date };
  granularity: TimeGranularity;
}

// ─── Internal Types ────────────────────────────────────────────────

interface TemporalStats {
  totalEntries: number;
  byGranularity: Record<TimeGranularity, number>;
  byAgent: Record<string, number>;
  byProject: Record<string, number>;
  averageImportance: number;
  totalAccessCount: number;
  mostAccessedEntry: TemporalMemoryEntry | null;
  oldestEntry: TemporalMemoryEntry | null;
  newestEntry: TemporalMemoryEntry | null;
  promotedCount: number;
  archivedCount: number;
  expiredCount: number;
}

// ─── Constants ─────────────────────────────────────────────────────

/** Ordered granularity hierarchy for promotion logic. */
const GRANULARITY_HIERARCHY: TimeGranularity[] = [
  TimeGranularity.MOMENT,
  TimeGranularity.HOUR,
  TimeGranularity.DAY,
  TimeGranularity.WEEK,
  TimeGranularity.MONTH,
  TimeGranularity.QUARTER,
  TimeGranularity.YEAR,
  TimeGranularity.PROJECT,
  TimeGranularity.ARCHIVE,
];

const AUTO_PROMOTE_IMPORTANCE_THRESHOLD = 0.8;
const AUTO_PROMOTE_ACCESS_THRESHOLD = 5;

/** Default time-window for chronological context (1 hour). */
const DEFAULT_CONTEXT_WINDOW_MS = 60 * 60 * 1000;

// ─── Service ───────────────────────────────────────────────────────

@Injectable()
export class TemporalMemoryService {
  private readonly logger = new Logger(TemporalMemoryService.name);

  /** Primary store: entry id → entry */
  private readonly entries: Map<string, TemporalMemoryEntry> = new Map();

  /** Bucket cache: "granularity:period" → TemporalBucket */
  private readonly buckets: Map<string, TemporalBucket> = new Map();

  /** Running count of expired entries (for stats) */
  private expiredCount = 0;

  // ─── 1. store ───────────────────────────────────────────────────

  /**
   * Store a new temporal memory entry.
   * - Auto-determines granularity based on timestamp distance from now.
   * - Auto-generates summary if not provided.
   * - Sets importance based on content analysis if not provided.
   */
  store(
    entry: Omit<
      TemporalMemoryEntry,
      'id' | 'createdAt' | 'accessCount' | 'lastAccessedAt' | 'promotedFrom'
    >,
  ): TemporalMemoryEntry {
    const now = new Date();
    const id = uuidv4();

    // Determine granularity if not explicitly set to MOMENT
    const timestamp = entry.timestamp ?? now;
    const granularity = entry.timeGranularity ?? this.inferGranularity(timestamp);

    // Auto-generate summary if empty
    const summary =
      entry.summary && entry.summary.trim().length > 0
        ? entry.summary
        : this.generateSummary(entry.content);

    // Analyse importance if not provided
    const importance =
      entry.importance !== undefined && entry.importance !== null
        ? this.clampImportance(entry.importance)
        : this.analyseImportance(entry.content, entry.tags ?? []);

    const created: TemporalMemoryEntry = {
      id,
      agentId: entry.agentId,
      content: entry.content,
      summary,
      timestamp,
      timeGranularity: granularity,
      project: entry.project ?? null,
      tags: entry.tags ?? [],
      importance,
      accessCount: 0,
      lastAccessedAt: now,
      relatedEntries: entry.relatedEntries ?? [],
      expiresAt: entry.expiresAt ?? null,
      promotedFrom: null,
      createdAt: now,
    };

    this.entries.set(id, created);

    // Invalidate any cached bucket that would contain this entry
    this.invalidateBucketsForEntry(created);

    this.logger.debug(
      `Stored temporal entry ${id} — granularity=${granularity}, ` +
        `importance=${importance.toFixed(2)}, agent=${entry.agentId}`,
    );

    return created;
  }

  // ─── 2. retrieve ────────────────────────────────────────────────

  /**
   * Get a single entry by ID.
   * Increments accessCount and updates lastAccessedAt.
   */
  retrieve(id: string): TemporalMemoryEntry | null {
    const entry = this.entries.get(id);
    if (!entry) {
      this.logger.warn(`Temporal entry ${id} not found`);
      return null;
    }

    entry.accessCount += 1;
    entry.lastAccessedAt = new Date();

    return entry;
  }

  // ─── 3. search ──────────────────────────────────────────────────

  /**
   * Search entries by time range, granularity, agentId, project, tags,
   * importance. Supports pagination with limit/offset.
   * Sort: importance DESC, then timestamp DESC.
   */
  search(query: TemporalQuery): TemporalMemoryEntry[] {
    let results = Array.from(this.entries.values());

    // Time range filter
    if (query.from) {
      const from = query.from.getTime();
      results = results.filter((e) => e.timestamp.getTime() >= from);
    }
    if (query.to) {
      const to = query.to.getTime();
      results = results.filter((e) => e.timestamp.getTime() <= to);
    }

    // Granularity filter
    if (query.granularity) {
      results = results.filter((e) => e.timeGranularity === query.granularity);
    }

    // Agent filter
    if (query.agentId) {
      results = results.filter((e) => e.agentId === query.agentId);
    }

    // Project filter
    if (query.project) {
      results = results.filter((e) => e.project === query.project);
    }

    // Tags filter (entry must contain ALL specified tags)
    if (query.tags && query.tags.length > 0) {
      results = results.filter((e) => query.tags!.every((tag) => e.tags.includes(tag)));
    }

    // Importance threshold
    if (query.importanceThreshold !== undefined) {
      results = results.filter((e) => e.importance >= query.importanceThreshold!);
    }

    // Content text search in summary
    if (query.contentFilter && query.contentFilter.trim().length > 0) {
      const filterLower = query.contentFilter.toLowerCase();
      results = results.filter((e) => e.summary.toLowerCase().includes(filterLower));
    }

    // Sort: importance DESC, then timestamp DESC
    results.sort((a, b) => {
      const importanceDiff = b.importance - a.importance;
      if (Math.abs(importanceDiff) > 0.001) return importanceDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    // Pagination
    const offset = query.offset ?? 0;
    const limit = query.limit ?? results.length;
    return results.slice(offset, offset + limit);
  }

  // ─── 4. summarize ───────────────────────────────────────────────

  /**
   * Get or create a temporal summary bucket for a time range.
   * Aggregates entries, computes average importance, generates a summary.
   */
  summarize(from: Date, to: Date, granularity?: TimeGranularity): TemporalBucket {
    const effectiveGranularity = granularity ?? this.inferGranularityForRange(from, to);
    const period = this.computePeriodKey(from, effectiveGranularity);

    // Check cache
    const cacheKey = `${effectiveGranularity}:${period}`;
    const cached = this.buckets.get(cacheKey);
    if (cached) {
      // Refresh with current entries
      const freshEntries = this.getEntriesInRange(from, to, effectiveGranularity);
      cached.entries = freshEntries;
      cached.entryCount = freshEntries.length;
      cached.averageImportance = this.computeAverageImportance(freshEntries);
      cached.summary = this.generateBucketSummary(freshEntries, effectiveGranularity, period);
      return cached;
    }

    // Build bucket
    const entries = this.getEntriesInRange(from, to, effectiveGranularity);
    const bucket: TemporalBucket = {
      granularity: effectiveGranularity,
      period,
      startDate: from,
      endDate: to,
      entries,
      summary: this.generateBucketSummary(entries, effectiveGranularity, period),
      entryCount: entries.length,
      averageImportance: this.computeAverageImportance(entries),
    };

    this.buckets.set(cacheKey, bucket);
    return bucket;
  }

  // ─── 5. promote ─────────────────────────────────────────────────

  /**
   * Promote an entry to a higher granularity
   * (e.g., MOMENT → DAY → WEEK → MONTH → ARCHIVE).
   * The entry's promotedFrom tracks its origin granularity.
   * Promotion is only allowed to a higher level in the hierarchy.
   */
  promote(entryId: string, toGranularity: TimeGranularity): TemporalMemoryEntry | null {
    const entry = this.entries.get(entryId);
    if (!entry) {
      this.logger.warn(`Cannot promote: entry ${entryId} not found`);
      return null;
    }

    const currentIdx = GRANULARITY_HIERARCHY.indexOf(entry.timeGranularity);
    const targetIdx = GRANULARITY_HIERARCHY.indexOf(toGranularity);

    if (targetIdx <= currentIdx) {
      this.logger.warn(
        `Cannot promote entry ${entryId} from ${entry.timeGranularity} to ${toGranularity}: ` +
          `target must be higher in hierarchy`,
      );
      return null;
    }

    const previousGranularity = entry.timeGranularity;
    entry.promotedFrom = previousGranularity;
    entry.timeGranularity = toGranularity;

    // Promoted entries are important — bump importance slightly
    entry.importance = this.clampImportance(entry.importance + 0.05);

    // Remove expiry on promoted entries — they should persist
    entry.expiresAt = null;

    // Invalidate cached buckets
    this.invalidateBucketsForEntry(entry);

    this.logger.log(`Promoted entry ${entryId}: ${previousGranularity} → ${toGranularity}`);

    return entry;
  }

  // ─── 6. archive ─────────────────────────────────────────────────

  /**
   * Move an entry to ARCHIVE granularity.
   * Archive entries never expire.
   */
  archive(entryId: string): TemporalMemoryEntry | null {
    const entry = this.entries.get(entryId);
    if (!entry) {
      this.logger.warn(`Cannot archive: entry ${entryId} not found`);
      return null;
    }

    const previousGranularity = entry.timeGranularity;
    entry.promotedFrom = previousGranularity;
    entry.timeGranularity = TimeGranularity.ARCHIVE;
    entry.expiresAt = null; // Archive entries never expire

    // Invalidate cached buckets
    this.invalidateBucketsForEntry(entry);

    this.logger.log(`Archived entry ${entryId}: ${previousGranularity} → ARCHIVE`);

    return entry;
  }

  // ─── 7. getTimeline ─────────────────────────────────────────────

  /**
   * Get a temporal timeline — series of buckets for the time range
   * at the specified granularity.
   */
  getTimeline(from: Date, to: Date, granularity: TimeGranularity): TemporalTimeline {
    const buckets = this.generateBucketSequence(from, to, granularity);
    const allEntries = buckets.flatMap((b) => b.entries);

    return {
      buckets,
      totalEntries: allEntries.length,
      timeRange: { from, to },
      granularity,
    };
  }

  // ─── 8. getRecent ───────────────────────────────────────────────

  /**
   * Get most recent entries, optionally for a specific agent.
   * Sorted by timestamp DESC.
   */
  getRecent(agentId?: string, limit: number = 20): TemporalMemoryEntry[] {
    let results = Array.from(this.entries.values());

    if (agentId) {
      results = results.filter((e) => e.agentId === agentId);
    }

    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return results.slice(0, limit);
  }

  // ─── 9. getByProject ────────────────────────────────────────────

  /**
   * Get all entries for a project across all time.
   * Sorted by timestamp DESC.
   */
  getByProject(project: string): TemporalMemoryEntry[] {
    return Array.from(this.entries.values())
      .filter((e) => e.project === project)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // ─── 10. getByTag ───────────────────────────────────────────────

  /**
   * Get entries by tag.
   * Sorted by importance DESC, then timestamp DESC.
   */
  getByTag(tag: string, limit: number = 50): TemporalMemoryEntry[] {
    return Array.from(this.entries.values())
      .filter((e) => e.tags.includes(tag))
      .sort((a, b) => {
        const importanceDiff = b.importance - a.importance;
        if (Math.abs(importanceDiff) > 0.001) return importanceDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      })
      .slice(0, limit);
  }

  // ─── 11. getRelated ─────────────────────────────────────────────

  /**
   * Find entries related to a given entry via:
   *  1. Explicit relatedEntries links
   *  2. Shared tags
   *  3. Time proximity (within 1 hour by default)
   *
   * Returns results sorted by relevance (explicit links > shared tags > time proximity).
   */
  getRelated(entryId: string, limit: number = 10): TemporalMemoryEntry[] {
    const entry = this.entries.get(entryId);
    if (!entry) {
      this.logger.warn(`Cannot find related: entry ${entryId} not found`);
      return [];
    }

    const scored: Map<string, { entry: TemporalMemoryEntry; score: number }> = new Map();

    // 1. Explicit related entries — highest relevance
    for (const relatedId of entry.relatedEntries) {
      const related = this.entries.get(relatedId);
      if (related && related.id !== entryId) {
        scored.set(related.id, { entry: related, score: 100 });
      }
    }

    // 2. Shared tags
    for (const candidate of this.entries.values()) {
      if (candidate.id === entryId) continue;
      const sharedTags = candidate.tags.filter((t) => entry.tags.includes(t));
      if (sharedTags.length > 0) {
        const existing = scored.get(candidate.id);
        const tagScore = sharedTags.length * 10;
        if (existing) {
          existing.score += tagScore;
        } else {
          scored.set(candidate.id, { entry: candidate, score: tagScore });
        }
      }
    }

    // 3. Time proximity (within 1 hour)
    const proximityMs = 60 * 60 * 1000;
    for (const candidate of this.entries.values()) {
      if (candidate.id === entryId) continue;
      const timeDiff = Math.abs(candidate.timestamp.getTime() - entry.timestamp.getTime());
      if (timeDiff <= proximityMs) {
        const existing = scored.get(candidate.id);
        const proximityScore = Math.round(((proximityMs - timeDiff) / proximityMs) * 20);
        if (existing) {
          existing.score += proximityScore;
        } else {
          scored.set(candidate.id, { entry: candidate, score: proximityScore });
        }
      }
    }

    return Array.from(scored.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.entry);
  }

  // ─── 12. autoPromote ────────────────────────────────────────────

  /**
   * Automatic promotion: entries with high importance (>0.8) and
   * high access count (>5) get promoted to next granularity.
   * Run periodically.
   *
   * Returns the list of promoted entries.
   */
  autoPromote(): TemporalMemoryEntry[] {
    const promoted: TemporalMemoryEntry[] = [];

    for (const entry of this.entries.values()) {
      // Skip already-archived entries — they can't go higher
      if (entry.timeGranularity === TimeGranularity.ARCHIVE) continue;

      if (
        entry.importance >= AUTO_PROMOTE_IMPORTANCE_THRESHOLD &&
        entry.accessCount >= AUTO_PROMOTE_ACCESS_THRESHOLD
      ) {
        const currentIdx = GRANULARITY_HIERARCHY.indexOf(entry.timeGranularity);
        if (currentIdx < GRANULARITY_HIERARCHY.length - 1) {
          const nextGranularity = GRANULARITY_HIERARCHY[currentIdx + 1];
          const result = this.promote(entry.id, nextGranularity);
          if (result) {
            promoted.push(result);
          }
        }
      }
    }

    if (promoted.length > 0) {
      this.logger.log(
        `Auto-promoted ${promoted.length} temporal entr${promoted.length === 1 ? 'y' : 'ies'}`,
      );
    }

    return promoted;
  }

  // ─── 13. expire ─────────────────────────────────────────────────

  /**
   * Remove entries that have passed their expiresAt date.
   * ARCHIVE entries never expire.
   *
   * Returns the count of removed entries.
   */
  expire(): number {
    const now = new Date();
    let removed = 0;

    for (const [id, entry] of this.entries) {
      // ARCHIVE entries never expire
      if (entry.timeGranularity === TimeGranularity.ARCHIVE) continue;

      if (entry.expiresAt && entry.expiresAt.getTime() <= now.getTime()) {
        this.invalidateBucketsForEntry(entry);
        this.entries.delete(id);
        removed++;
        this.logger.debug(`Expired temporal entry ${id}`);
      }
    }

    this.expiredCount += removed;

    if (removed > 0) {
      this.logger.log(`Expired ${removed} temporal entr${removed === 1 ? 'y' : 'ies'}`);
    }

    return removed;
  }

  // ─── 14. getTemporalStats ───────────────────────────────────────

  /**
   * Statistics: total entries, by granularity, by agent, by project,
   * average importance, access patterns.
   */
  getTemporalStats(): TemporalStats {
    const allEntries = Array.from(this.entries.values());
    const total = allEntries.length;

    // By granularity
    const byGranularity: Record<TimeGranularity, number> = {} as any;
    for (const g of GRANULARITY_HIERARCHY) {
      byGranularity[g] = 0;
    }
    for (const entry of allEntries) {
      byGranularity[entry.timeGranularity] = (byGranularity[entry.timeGranularity] ?? 0) + 1;
    }

    // By agent
    const byAgent: Record<string, number> = {};
    for (const entry of allEntries) {
      byAgent[entry.agentId] = (byAgent[entry.agentId] ?? 0) + 1;
    }

    // By project
    const byProject: Record<string, number> = {};
    for (const entry of allEntries) {
      if (entry.project) {
        byProject[entry.project] = (byProject[entry.project] ?? 0) + 1;
      }
    }

    // Average importance
    const averageImportance =
      total > 0 ? allEntries.reduce((sum, e) => sum + e.importance, 0) / total : 0;

    // Total access count
    const totalAccessCount = allEntries.reduce((sum, e) => sum + e.accessCount, 0);

    // Most accessed entry
    const mostAccessedEntry =
      total > 0 ? allEntries.reduce((a, b) => (a.accessCount >= b.accessCount ? a : b)) : null;

    // Oldest and newest
    const sortedByTime = [...allEntries].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    const oldestEntry = sortedByTime[0] ?? null;
    const newestEntry = sortedByTime[sortedByTime.length - 1] ?? null;

    // Promoted count
    const promotedCount = allEntries.filter((e) => e.promotedFrom !== null).length;

    // Archived count
    const archivedCount = byGranularity[TimeGranularity.ARCHIVE] ?? 0;

    return {
      totalEntries: total,
      byGranularity,
      byAgent,
      byProject,
      averageImportance: Math.round(averageImportance * 1000) / 1000,
      totalAccessCount,
      mostAccessedEntry,
      oldestEntry,
      newestEntry,
      promotedCount,
      archivedCount,
      expiredCount: this.expiredCount,
    };
  }

  // ─── 15. getChronologicalContext ────────────────────────────────

  /**
   * Get entries around a specific timestamp within a time window.
   * Useful for understanding context at a point in time.
   *
   * Returns entries sorted by temporal distance from the target
   * timestamp (closest first).
   */
  getChronologicalContext(
    timestamp: Date,
    windowMs: number = DEFAULT_CONTEXT_WINDOW_MS,
  ): TemporalMemoryEntry[] {
    const target = timestamp.getTime();
    const halfWindow = windowMs / 2;
    const lower = target - halfWindow;
    const upper = target + halfWindow;

    const inRange = Array.from(this.entries.values()).filter((e) => {
      const t = e.timestamp.getTime();
      return t >= lower && t <= upper;
    });

    // Sort by distance from target (closest first)
    inRange.sort((a, b) => {
      const distA = Math.abs(a.timestamp.getTime() - target);
      const distB = Math.abs(b.timestamp.getTime() - target);
      return distA - distB;
    });

    return inRange;
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  /**
   * Infer granularity from a timestamp based on its distance from now.
   *
   * - < 1 hour ago → MOMENT
   * - < 1 day ago → HOUR
   * - < 1 week ago → DAY
   * - < 1 month ago → WEEK
   * - < 3 months ago → MONTH
   * - < 1 year ago → QUARTER
   * - ≥ 1 year ago → YEAR
   */
  private inferGranularity(timestamp: Date): TimeGranularity {
    const now = Date.now();
    const diffMs = now - timestamp.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) return TimeGranularity.MOMENT;
    if (diffHours < 24) return TimeGranularity.HOUR;
    if (diffHours < 24 * 7) return TimeGranularity.DAY;
    if (diffHours < 24 * 30) return TimeGranularity.WEEK;
    if (diffHours < 24 * 90) return TimeGranularity.MONTH;
    if (diffHours < 24 * 365) return TimeGranularity.QUARTER;
    return TimeGranularity.YEAR;
  }

  /**
   * Infer the most appropriate granularity for a date range.
   */
  private inferGranularityForRange(from: Date, to: Date): TimeGranularity {
    const diffMs = to.getTime() - from.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) return TimeGranularity.MOMENT;
    if (diffHours < 24) return TimeGranularity.HOUR;
    if (diffHours < 24 * 7) return TimeGranularity.DAY;
    if (diffHours < 24 * 30) return TimeGranularity.WEEK;
    if (diffHours < 24 * 90) return TimeGranularity.MONTH;
    if (diffHours < 24 * 365) return TimeGranularity.QUARTER;
    return TimeGranularity.YEAR;
  }

  /**
   * Compute a period key string for a given date and granularity.
   * e.g. "2024-01-15" for DAY, "2024-W03" for WEEK, "2024-Q1" for QUARTER
   */
  private computePeriodKey(date: Date, granularity: TimeGranularity): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    switch (granularity) {
      case TimeGranularity.MOMENT:
        return `${year}-${month}-${day}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      case TimeGranularity.HOUR:
        return `${year}-${month}-${day}T${String(d.getHours()).padStart(2, '0')}`;
      case TimeGranularity.DAY:
        return `${year}-${month}-${day}`;
      case TimeGranularity.WEEK: {
        const weekNum = this.getISOWeekNumber(d);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
      }
      case TimeGranularity.MONTH:
        return `${year}-${month}`;
      case TimeGranularity.QUARTER: {
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        return `${year}-Q${quarter}`;
      }
      case TimeGranularity.YEAR:
        return `${year}`;
      case TimeGranularity.PROJECT:
        return `project-${year}-${month}`;
      case TimeGranularity.ARCHIVE:
        return `archive-${year}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * Get the ISO week number for a date.
   */
  private getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Get entries that fall within a time range and optionally match a granularity.
   */
  private getEntriesInRange(
    from: Date,
    to: Date,
    granularity?: TimeGranularity,
  ): TemporalMemoryEntry[] {
    const fromMs = from.getTime();
    const toMs = to.getTime();

    return Array.from(this.entries.values()).filter((e) => {
      const t = e.timestamp.getTime();
      if (t < fromMs || t > toMs) return false;
      if (granularity && e.timeGranularity !== granularity) return false;
      return true;
    });
  }

  /**
   * Compute the average importance of a set of entries.
   */
  private computeAverageImportance(entries: TemporalMemoryEntry[]): number {
    if (entries.length === 0) return 0;
    const sum = entries.reduce((acc, e) => acc + e.importance, 0);
    return Math.round((sum / entries.length) * 1000) / 1000;
  }

  /**
   * Generate a summary for a bucket based on its entries.
   */
  private generateBucketSummary(
    entries: TemporalMemoryEntry[],
    granularity: TimeGranularity,
    period: string,
  ): string {
    if (entries.length === 0) {
      return `No entries for ${granularity} period ${period}`;
    }

    const agentSet = new Set(entries.map((e) => e.agentId));
    const topTags = this.getTopTags(entries, 5);
    const topImportance = entries.reduce(
      (best, e) => (e.importance > best.importance ? e : best),
      entries[0],
    );

    const parts: string[] = [];
    parts.push(`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`);
    parts.push(`across ${agentSet.size} agent${agentSet.size === 1 ? '' : 's'}`);

    if (topTags.length > 0) {
      parts.push(`tags: [${topTags.join(', ')}]`);
    }

    parts.push(`avg importance: ${this.computeAverageImportance(entries).toFixed(2)}`);
    parts.push(`top: "${topImportance.summary}"`);

    return `[${granularity}:${period}] ${parts.join('; ')}`;
  }

  /**
   * Get the most common tags from a set of entries.
   */
  private getTopTags(entries: TemporalMemoryEntry[], limit: number): string[] {
    const freq: Map<string, number> = new Map();
    for (const entry of entries) {
      for (const tag of entry.tags) {
        freq.set(tag, (freq.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  }

  /**
   * Generate a simple auto-summary from content.
   */
  private generateSummary(content: any): string {
    if (content === null || content === undefined) return 'Empty memory entry';
    if (typeof content === 'string') {
      return content.length > 120 ? content.substring(0, 117) + '...' : content;
    }
    if (typeof content === 'object') {
      const keys = Object.keys(content);
      if (keys.length === 0) return 'Empty object memory entry';
      const preview = keys.slice(0, 5).join(', ');
      return `Object with keys: ${preview}${keys.length > 5 ? '...' : ''}`;
    }
    return String(content);
  }

  /**
   * Analyse content and tags to produce a heuristic importance score (0-1).
   *
   * Factors:
   *  - Content length / richness
   *  - Number of tags
   *  - Presence of keywords suggesting critical information
   *  - Whether content is a structured object with many fields
   */
  private analyseImportance(content: any, tags: string[]): number {
    let score = 0.3; // baseline

    // Content richness
    if (typeof content === 'string') {
      if (content.length > 500) score += 0.15;
      else if (content.length > 200) score += 0.1;
      else if (content.length > 50) score += 0.05;
    } else if (typeof content === 'object' && content !== null) {
      const keys = Object.keys(content);
      if (keys.length > 10) score += 0.2;
      else if (keys.length > 5) score += 0.15;
      else if (keys.length > 2) score += 0.1;
    }

    // Tag richness
    if (tags.length >= 5) score += 0.15;
    else if (tags.length >= 3) score += 0.1;
    else if (tags.length >= 1) score += 0.05;

    // Critical keyword detection
    const criticalKeywords = [
      'critical',
      'urgent',
      'important',
      'blocker',
      'failure',
      'error',
      'deadline',
      'release',
      'production',
      'security',
      'decision',
      'milestone',
      'breaking',
    ];
    const contentStr =
      typeof content === 'string' ? content.toLowerCase() : JSON.stringify(content).toLowerCase();
    const tagStr = tags.join(' ').toLowerCase();
    const combined = `${contentStr} ${tagStr}`;

    const keywordHits = criticalKeywords.filter((kw) => combined.includes(kw));
    score += Math.min(keywordHits.length * 0.05, 0.25);

    return this.clampImportance(score);
  }

  /**
   * Clamp importance to the [0, 1] range.
   */
  private clampImportance(value: number): number {
    return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
  }

  /**
   * Generate a sequence of TemporalBuckets covering [from, to]
   * at the given granularity.
   */
  private generateBucketSequence(
    from: Date,
    to: Date,
    granularity: TimeGranularity,
  ): TemporalBucket[] {
    const buckets: TemporalBucket[] = [];

    const intervals = this.splitTimeRange(from, to, granularity);

    for (const interval of intervals) {
      const period = this.computePeriodKey(interval.start, granularity);
      const entries = this.getEntriesInRange(interval.start, interval.end, granularity);

      // Also include entries from sub-granularities that fall in this range
      const allGranularityEntries = this.getEntriesInRange(interval.start, interval.end);

      buckets.push({
        granularity,
        period,
        startDate: interval.start,
        endDate: interval.end,
        entries: allGranularityEntries,
        summary: this.generateBucketSummary(allGranularityEntries, granularity, period),
        entryCount: allGranularityEntries.length,
        averageImportance: this.computeAverageImportance(allGranularityEntries),
      });
    }

    return buckets;
  }

  /**
   * Split a time range into intervals for a given granularity.
   */
  private splitTimeRange(
    from: Date,
    to: Date,
    granularity: TimeGranularity,
  ): Array<{ start: Date; end: Date }> {
    const intervals: Array<{ start: Date; end: Date }> = [];
    const msPerHour = 1000 * 60 * 60;

    let stepMs: number;
    switch (granularity) {
      case TimeGranularity.MOMENT:
        stepMs = msPerHour / 2; // 30 minutes
        break;
      case TimeGranularity.HOUR:
        stepMs = msPerHour;
        break;
      case TimeGranularity.DAY:
        stepMs = msPerHour * 24;
        break;
      case TimeGranularity.WEEK:
        stepMs = msPerHour * 24 * 7;
        break;
      case TimeGranularity.MONTH:
        stepMs = msPerHour * 24 * 30;
        break;
      case TimeGranularity.QUARTER:
        stepMs = msPerHour * 24 * 90;
        break;
      case TimeGranularity.YEAR:
        stepMs = msPerHour * 24 * 365;
        break;
      case TimeGranularity.PROJECT:
        stepMs = msPerHour * 24 * 30; // group by month within project scope
        break;
      case TimeGranularity.ARCHIVE:
        stepMs = msPerHour * 24 * 365; // group by year
        break;
      default:
        stepMs = msPerHour * 24;
    }

    let current = new Date(from);
    while (current.getTime() < to.getTime()) {
      const next = new Date(Math.min(current.getTime() + stepMs, to.getTime()));
      intervals.push({ start: new Date(current), end: new Date(next) });
      current = next;
    }

    return intervals;
  }

  /**
   * Invalidate any cached buckets that would contain the given entry.
   * This is a conservative approach — invalidates all buckets whose
   * time range overlaps with the entry's timestamp.
   */
  private invalidateBucketsForEntry(entry: TemporalMemoryEntry): void {
    const keysToRemove: string[] = [];

    for (const [key, bucket] of this.buckets) {
      const entryTime = entry.timestamp.getTime();
      if (entryTime >= bucket.startDate.getTime() && entryTime <= bucket.endDate.getTime()) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.buckets.delete(key);
    }
  }
}
