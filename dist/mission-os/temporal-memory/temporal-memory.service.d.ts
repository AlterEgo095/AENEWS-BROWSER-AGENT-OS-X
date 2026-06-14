export declare enum TimeGranularity {
    MOMENT = "moment",
    HOUR = "hour",
    DAY = "day",
    WEEK = "week",
    MONTH = "month",
    QUARTER = "quarter",
    YEAR = "year",
    PROJECT = "project",
    ARCHIVE = "archive"
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
    importance: number;
    accessCount: number;
    lastAccessedAt: Date;
    relatedEntries: string[];
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
    contentFilter?: string;
}
export interface TemporalBucket {
    granularity: TimeGranularity;
    period: string;
    startDate: Date;
    endDate: Date;
    entries: TemporalMemoryEntry[];
    summary: string;
    entryCount: number;
    averageImportance: number;
}
export interface TemporalTimeline {
    buckets: TemporalBucket[];
    totalEntries: number;
    timeRange: {
        from: Date;
        to: Date;
    };
    granularity: TimeGranularity;
}
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
export declare class TemporalMemoryService {
    private readonly logger;
    private readonly entries;
    private readonly buckets;
    private expiredCount;
    store(entry: Omit<TemporalMemoryEntry, 'id' | 'createdAt' | 'accessCount' | 'lastAccessedAt' | 'promotedFrom'>): TemporalMemoryEntry;
    retrieve(id: string): TemporalMemoryEntry | null;
    search(query: TemporalQuery): TemporalMemoryEntry[];
    summarize(from: Date, to: Date, granularity?: TimeGranularity): TemporalBucket;
    promote(entryId: string, toGranularity: TimeGranularity): TemporalMemoryEntry | null;
    archive(entryId: string): TemporalMemoryEntry | null;
    getTimeline(from: Date, to: Date, granularity: TimeGranularity): TemporalTimeline;
    getRecent(agentId?: string, limit?: number): TemporalMemoryEntry[];
    getByProject(project: string): TemporalMemoryEntry[];
    getByTag(tag: string, limit?: number): TemporalMemoryEntry[];
    getRelated(entryId: string, limit?: number): TemporalMemoryEntry[];
    autoPromote(): TemporalMemoryEntry[];
    expire(): number;
    getTemporalStats(): TemporalStats;
    getChronologicalContext(timestamp: Date, windowMs?: number): TemporalMemoryEntry[];
    private inferGranularity;
    private inferGranularityForRange;
    private computePeriodKey;
    private getISOWeekNumber;
    private getEntriesInRange;
    private computeAverageImportance;
    private generateBucketSummary;
    private getTopTags;
    private generateSummary;
    private analyseImportance;
    private clampImportance;
    private generateBucketSequence;
    private splitTimeRange;
    private invalidateBucketsForEntry;
}
export {};
