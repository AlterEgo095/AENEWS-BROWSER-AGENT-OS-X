export interface MissionMetric {
    missionId: string;
    instruction: string;
    category: MissionCategory;
    success: boolean;
    certified: boolean;
    qualityScore: number;
    artifactCount: number;
    totalSizeBytes: number;
    durationMs: number;
    costUsd: number;
    retries: number;
    errors: string[];
    phases: PhaseMetric[];
    timestamp: string;
}
export interface PhaseMetric {
    name: string;
    durationMs: number;
    success: boolean;
}
export declare enum MissionCategory {
    WEB_APP = "web_app",
    LANDING_PAGE = "landing_page",
    API = "api",
    SAAS = "saas",
    ECOMMERCE = "ecommerce",
    AUTOMATION = "automation",
    DOCUMENT = "document",
    AUDIT = "audit",
    DEPLOYMENT = "deployment",
    CHATBOT = "chatbot",
    PORTFOLIO = "portfolio",
    TOOL = "tool",
    OTHER = "other"
}
export interface AggregateMetrics {
    totalMissions: number;
    successes: number;
    certified: number;
    msr: number;
    certificationRate: number;
    avgDurationMs: number;
    avgCostUsd: number;
    avgQualityScore: number;
    totalRetries: number;
    p50DurationMs: number;
    p95DurationMs: number;
    p99DurationMs: number;
    byCategory: Record<string, CategoryMetrics>;
    recentTrend: TrendMetrics;
    targetMsr: number;
    msrGap: number;
}
export interface CategoryMetrics {
    total: number;
    successes: number;
    certified: number;
    msr: number;
    avgDurationMs: number;
    avgCostUsd: number;
    avgQualityScore: number;
}
export interface TrendMetrics {
    last10Msr: number;
    last25Msr: number;
    last50Msr: number;
    improving: boolean;
}
export interface MsrTarget {
    label: string;
    target: number;
}
export declare const MSR_TARGETS: MsrTarget[];
export declare class MissionMetricsService {
    private readonly logger;
    private readonly metrics;
    private readonly metricsFile;
    private loaded;
    constructor();
    record(metric: Omit<MissionMetric, 'timestamp'>): void;
    getMSR(): number;
    getCertificationRate(): number;
    getCurrentMsrTarget(): MsrTarget;
    getAggregate(): AggregateMetrics;
    private getCategoryBreakdown;
    private getTrend;
    getRecent(count?: number): MissionMetric[];
    getByCategory(category: MissionCategory): MissionMetric[];
    getFailures(): MissionMetric[];
    getSlowest(count?: number): MissionMetric[];
    getLowestQuality(count?: number): MissionMetric[];
    getTotalCount(): number;
    getAllMetrics(): MissionMetric[];
    private persistToDisk;
    private loadFromDisk;
    static classifyMission(instruction: string): MissionCategory;
}
