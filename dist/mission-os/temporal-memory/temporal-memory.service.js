"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TemporalMemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemporalMemoryService = exports.TimeGranularity = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
var TimeGranularity;
(function (TimeGranularity) {
    TimeGranularity["MOMENT"] = "moment";
    TimeGranularity["HOUR"] = "hour";
    TimeGranularity["DAY"] = "day";
    TimeGranularity["WEEK"] = "week";
    TimeGranularity["MONTH"] = "month";
    TimeGranularity["QUARTER"] = "quarter";
    TimeGranularity["YEAR"] = "year";
    TimeGranularity["PROJECT"] = "project";
    TimeGranularity["ARCHIVE"] = "archive";
})(TimeGranularity || (exports.TimeGranularity = TimeGranularity = {}));
const GRANULARITY_HIERARCHY = [
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
const DEFAULT_CONTEXT_WINDOW_MS = 60 * 60 * 1000;
let TemporalMemoryService = TemporalMemoryService_1 = class TemporalMemoryService {
    constructor() {
        this.logger = new common_1.Logger(TemporalMemoryService_1.name);
        this.entries = new Map();
        this.buckets = new Map();
        this.expiredCount = 0;
    }
    store(entry) {
        const now = new Date();
        const id = (0, uuid_1.v4)();
        const timestamp = entry.timestamp ?? now;
        const granularity = entry.timeGranularity ?? this.inferGranularity(timestamp);
        const summary = entry.summary && entry.summary.trim().length > 0
            ? entry.summary
            : this.generateSummary(entry.content);
        const importance = entry.importance !== undefined && entry.importance !== null
            ? this.clampImportance(entry.importance)
            : this.analyseImportance(entry.content, entry.tags ?? []);
        const created = {
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
        this.invalidateBucketsForEntry(created);
        this.logger.debug(`Stored temporal entry ${id} — granularity=${granularity}, ` +
            `importance=${importance.toFixed(2)}, agent=${entry.agentId}`);
        return created;
    }
    retrieve(id) {
        const entry = this.entries.get(id);
        if (!entry) {
            this.logger.warn(`Temporal entry ${id} not found`);
            return null;
        }
        entry.accessCount += 1;
        entry.lastAccessedAt = new Date();
        return entry;
    }
    search(query) {
        let results = Array.from(this.entries.values());
        if (query.from) {
            const from = query.from.getTime();
            results = results.filter((e) => e.timestamp.getTime() >= from);
        }
        if (query.to) {
            const to = query.to.getTime();
            results = results.filter((e) => e.timestamp.getTime() <= to);
        }
        if (query.granularity) {
            results = results.filter((e) => e.timeGranularity === query.granularity);
        }
        if (query.agentId) {
            results = results.filter((e) => e.agentId === query.agentId);
        }
        if (query.project) {
            results = results.filter((e) => e.project === query.project);
        }
        if (query.tags && query.tags.length > 0) {
            results = results.filter((e) => query.tags.every((tag) => e.tags.includes(tag)));
        }
        if (query.importanceThreshold !== undefined) {
            results = results.filter((e) => e.importance >= query.importanceThreshold);
        }
        if (query.contentFilter && query.contentFilter.trim().length > 0) {
            const filterLower = query.contentFilter.toLowerCase();
            results = results.filter((e) => e.summary.toLowerCase().includes(filterLower));
        }
        results.sort((a, b) => {
            const importanceDiff = b.importance - a.importance;
            if (Math.abs(importanceDiff) > 0.001)
                return importanceDiff;
            return b.timestamp.getTime() - a.timestamp.getTime();
        });
        const offset = query.offset ?? 0;
        const limit = query.limit ?? results.length;
        return results.slice(offset, offset + limit);
    }
    summarize(from, to, granularity) {
        const effectiveGranularity = granularity ?? this.inferGranularityForRange(from, to);
        const period = this.computePeriodKey(from, effectiveGranularity);
        const cacheKey = `${effectiveGranularity}:${period}`;
        const cached = this.buckets.get(cacheKey);
        if (cached) {
            const freshEntries = this.getEntriesInRange(from, to, effectiveGranularity);
            cached.entries = freshEntries;
            cached.entryCount = freshEntries.length;
            cached.averageImportance = this.computeAverageImportance(freshEntries);
            cached.summary = this.generateBucketSummary(freshEntries, effectiveGranularity, period);
            return cached;
        }
        const entries = this.getEntriesInRange(from, to, effectiveGranularity);
        const bucket = {
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
    promote(entryId, toGranularity) {
        const entry = this.entries.get(entryId);
        if (!entry) {
            this.logger.warn(`Cannot promote: entry ${entryId} not found`);
            return null;
        }
        const currentIdx = GRANULARITY_HIERARCHY.indexOf(entry.timeGranularity);
        const targetIdx = GRANULARITY_HIERARCHY.indexOf(toGranularity);
        if (targetIdx <= currentIdx) {
            this.logger.warn(`Cannot promote entry ${entryId} from ${entry.timeGranularity} to ${toGranularity}: ` +
                `target must be higher in hierarchy`);
            return null;
        }
        const previousGranularity = entry.timeGranularity;
        entry.promotedFrom = previousGranularity;
        entry.timeGranularity = toGranularity;
        entry.importance = this.clampImportance(entry.importance + 0.05);
        entry.expiresAt = null;
        this.invalidateBucketsForEntry(entry);
        this.logger.log(`Promoted entry ${entryId}: ${previousGranularity} → ${toGranularity}`);
        return entry;
    }
    archive(entryId) {
        const entry = this.entries.get(entryId);
        if (!entry) {
            this.logger.warn(`Cannot archive: entry ${entryId} not found`);
            return null;
        }
        const previousGranularity = entry.timeGranularity;
        entry.promotedFrom = previousGranularity;
        entry.timeGranularity = TimeGranularity.ARCHIVE;
        entry.expiresAt = null;
        this.invalidateBucketsForEntry(entry);
        this.logger.log(`Archived entry ${entryId}: ${previousGranularity} → ARCHIVE`);
        return entry;
    }
    getTimeline(from, to, granularity) {
        const buckets = this.generateBucketSequence(from, to, granularity);
        const allEntries = buckets.flatMap((b) => b.entries);
        return {
            buckets,
            totalEntries: allEntries.length,
            timeRange: { from, to },
            granularity,
        };
    }
    getRecent(agentId, limit = 20) {
        let results = Array.from(this.entries.values());
        if (agentId) {
            results = results.filter((e) => e.agentId === agentId);
        }
        results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return results.slice(0, limit);
    }
    getByProject(project) {
        return Array.from(this.entries.values())
            .filter((e) => e.project === project)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    getByTag(tag, limit = 50) {
        return Array.from(this.entries.values())
            .filter((e) => e.tags.includes(tag))
            .sort((a, b) => {
            const importanceDiff = b.importance - a.importance;
            if (Math.abs(importanceDiff) > 0.001)
                return importanceDiff;
            return b.timestamp.getTime() - a.timestamp.getTime();
        })
            .slice(0, limit);
    }
    getRelated(entryId, limit = 10) {
        const entry = this.entries.get(entryId);
        if (!entry) {
            this.logger.warn(`Cannot find related: entry ${entryId} not found`);
            return [];
        }
        const scored = new Map();
        for (const relatedId of entry.relatedEntries) {
            const related = this.entries.get(relatedId);
            if (related && related.id !== entryId) {
                scored.set(related.id, { entry: related, score: 100 });
            }
        }
        for (const candidate of this.entries.values()) {
            if (candidate.id === entryId)
                continue;
            const sharedTags = candidate.tags.filter((t) => entry.tags.includes(t));
            if (sharedTags.length > 0) {
                const existing = scored.get(candidate.id);
                const tagScore = sharedTags.length * 10;
                if (existing) {
                    existing.score += tagScore;
                }
                else {
                    scored.set(candidate.id, { entry: candidate, score: tagScore });
                }
            }
        }
        const proximityMs = 60 * 60 * 1000;
        for (const candidate of this.entries.values()) {
            if (candidate.id === entryId)
                continue;
            const timeDiff = Math.abs(candidate.timestamp.getTime() - entry.timestamp.getTime());
            if (timeDiff <= proximityMs) {
                const existing = scored.get(candidate.id);
                const proximityScore = Math.round(((proximityMs - timeDiff) / proximityMs) * 20);
                if (existing) {
                    existing.score += proximityScore;
                }
                else {
                    scored.set(candidate.id, { entry: candidate, score: proximityScore });
                }
            }
        }
        return Array.from(scored.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((s) => s.entry);
    }
    autoPromote() {
        const promoted = [];
        for (const entry of this.entries.values()) {
            if (entry.timeGranularity === TimeGranularity.ARCHIVE)
                continue;
            if (entry.importance >= AUTO_PROMOTE_IMPORTANCE_THRESHOLD &&
                entry.accessCount >= AUTO_PROMOTE_ACCESS_THRESHOLD) {
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
            this.logger.log(`Auto-promoted ${promoted.length} temporal entr${promoted.length === 1 ? 'y' : 'ies'}`);
        }
        return promoted;
    }
    expire() {
        const now = new Date();
        let removed = 0;
        for (const [id, entry] of this.entries) {
            if (entry.timeGranularity === TimeGranularity.ARCHIVE)
                continue;
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
    getTemporalStats() {
        const allEntries = Array.from(this.entries.values());
        const total = allEntries.length;
        const byGranularity = {};
        for (const g of GRANULARITY_HIERARCHY) {
            byGranularity[g] = 0;
        }
        for (const entry of allEntries) {
            byGranularity[entry.timeGranularity] = (byGranularity[entry.timeGranularity] ?? 0) + 1;
        }
        const byAgent = {};
        for (const entry of allEntries) {
            byAgent[entry.agentId] = (byAgent[entry.agentId] ?? 0) + 1;
        }
        const byProject = {};
        for (const entry of allEntries) {
            if (entry.project) {
                byProject[entry.project] = (byProject[entry.project] ?? 0) + 1;
            }
        }
        const averageImportance = total > 0 ? allEntries.reduce((sum, e) => sum + e.importance, 0) / total : 0;
        const totalAccessCount = allEntries.reduce((sum, e) => sum + e.accessCount, 0);
        const mostAccessedEntry = total > 0 ? allEntries.reduce((a, b) => (a.accessCount >= b.accessCount ? a : b)) : null;
        const sortedByTime = [...allEntries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const oldestEntry = sortedByTime[0] ?? null;
        const newestEntry = sortedByTime[sortedByTime.length - 1] ?? null;
        const promotedCount = allEntries.filter((e) => e.promotedFrom !== null).length;
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
    getChronologicalContext(timestamp, windowMs = DEFAULT_CONTEXT_WINDOW_MS) {
        const target = timestamp.getTime();
        const halfWindow = windowMs / 2;
        const lower = target - halfWindow;
        const upper = target + halfWindow;
        const inRange = Array.from(this.entries.values()).filter((e) => {
            const t = e.timestamp.getTime();
            return t >= lower && t <= upper;
        });
        inRange.sort((a, b) => {
            const distA = Math.abs(a.timestamp.getTime() - target);
            const distB = Math.abs(b.timestamp.getTime() - target);
            return distA - distB;
        });
        return inRange;
    }
    inferGranularity(timestamp) {
        const now = Date.now();
        const diffMs = now - timestamp.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours < 1)
            return TimeGranularity.MOMENT;
        if (diffHours < 24)
            return TimeGranularity.HOUR;
        if (diffHours < 24 * 7)
            return TimeGranularity.DAY;
        if (diffHours < 24 * 30)
            return TimeGranularity.WEEK;
        if (diffHours < 24 * 90)
            return TimeGranularity.MONTH;
        if (diffHours < 24 * 365)
            return TimeGranularity.QUARTER;
        return TimeGranularity.YEAR;
    }
    inferGranularityForRange(from, to) {
        const diffMs = to.getTime() - from.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours < 1)
            return TimeGranularity.MOMENT;
        if (diffHours < 24)
            return TimeGranularity.HOUR;
        if (diffHours < 24 * 7)
            return TimeGranularity.DAY;
        if (diffHours < 24 * 30)
            return TimeGranularity.WEEK;
        if (diffHours < 24 * 90)
            return TimeGranularity.MONTH;
        if (diffHours < 24 * 365)
            return TimeGranularity.QUARTER;
        return TimeGranularity.YEAR;
    }
    computePeriodKey(date, granularity) {
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
    getISOWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    }
    getEntriesInRange(from, to, granularity) {
        const fromMs = from.getTime();
        const toMs = to.getTime();
        return Array.from(this.entries.values()).filter((e) => {
            const t = e.timestamp.getTime();
            if (t < fromMs || t > toMs)
                return false;
            if (granularity && e.timeGranularity !== granularity)
                return false;
            return true;
        });
    }
    computeAverageImportance(entries) {
        if (entries.length === 0)
            return 0;
        const sum = entries.reduce((acc, e) => acc + e.importance, 0);
        return Math.round((sum / entries.length) * 1000) / 1000;
    }
    generateBucketSummary(entries, granularity, period) {
        if (entries.length === 0) {
            return `No entries for ${granularity} period ${period}`;
        }
        const agentSet = new Set(entries.map((e) => e.agentId));
        const topTags = this.getTopTags(entries, 5);
        const topImportance = entries.reduce((best, e) => (e.importance > best.importance ? e : best), entries[0]);
        const parts = [];
        parts.push(`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`);
        parts.push(`across ${agentSet.size} agent${agentSet.size === 1 ? '' : 's'}`);
        if (topTags.length > 0) {
            parts.push(`tags: [${topTags.join(', ')}]`);
        }
        parts.push(`avg importance: ${this.computeAverageImportance(entries).toFixed(2)}`);
        parts.push(`top: "${topImportance.summary}"`);
        return `[${granularity}:${period}] ${parts.join('; ')}`;
    }
    getTopTags(entries, limit) {
        const freq = new Map();
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
    generateSummary(content) {
        if (content === null || content === undefined)
            return 'Empty memory entry';
        if (typeof content === 'string') {
            return content.length > 120 ? content.substring(0, 117) + '...' : content;
        }
        if (typeof content === 'object') {
            const keys = Object.keys(content);
            if (keys.length === 0)
                return 'Empty object memory entry';
            const preview = keys.slice(0, 5).join(', ');
            return `Object with keys: ${preview}${keys.length > 5 ? '...' : ''}`;
        }
        return String(content);
    }
    analyseImportance(content, tags) {
        let score = 0.3;
        if (typeof content === 'string') {
            if (content.length > 500)
                score += 0.15;
            else if (content.length > 200)
                score += 0.1;
            else if (content.length > 50)
                score += 0.05;
        }
        else if (typeof content === 'object' && content !== null) {
            const keys = Object.keys(content);
            if (keys.length > 10)
                score += 0.2;
            else if (keys.length > 5)
                score += 0.15;
            else if (keys.length > 2)
                score += 0.1;
        }
        if (tags.length >= 5)
            score += 0.15;
        else if (tags.length >= 3)
            score += 0.1;
        else if (tags.length >= 1)
            score += 0.05;
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
        const contentStr = typeof content === 'string' ? content.toLowerCase() : JSON.stringify(content).toLowerCase();
        const tagStr = tags.join(' ').toLowerCase();
        const combined = `${contentStr} ${tagStr}`;
        const keywordHits = criticalKeywords.filter((kw) => combined.includes(kw));
        score += Math.min(keywordHits.length * 0.05, 0.25);
        return this.clampImportance(score);
    }
    clampImportance(value) {
        return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
    }
    generateBucketSequence(from, to, granularity) {
        const buckets = [];
        const intervals = this.splitTimeRange(from, to, granularity);
        for (const interval of intervals) {
            const period = this.computePeriodKey(interval.start, granularity);
            const entries = this.getEntriesInRange(interval.start, interval.end, granularity);
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
    splitTimeRange(from, to, granularity) {
        const intervals = [];
        const msPerHour = 1000 * 60 * 60;
        let stepMs;
        switch (granularity) {
            case TimeGranularity.MOMENT:
                stepMs = msPerHour / 2;
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
                stepMs = msPerHour * 24 * 30;
                break;
            case TimeGranularity.ARCHIVE:
                stepMs = msPerHour * 24 * 365;
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
    invalidateBucketsForEntry(entry) {
        const keysToRemove = [];
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
};
exports.TemporalMemoryService = TemporalMemoryService;
exports.TemporalMemoryService = TemporalMemoryService = TemporalMemoryService_1 = __decorate([
    (0, common_1.Injectable)()
], TemporalMemoryService);
//# sourceMappingURL=temporal-memory.service.js.map