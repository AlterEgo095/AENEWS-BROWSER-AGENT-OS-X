export declare enum AlertSeverity {
    INFO = "INFO",
    WARNING = "WARNING",
    ERROR = "ERROR",
    CRITICAL = "CRITICAL"
}
export declare enum MissionHealthStatus {
    HEALTHY = "HEALTHY",
    DEGRADED = "DEGRADED",
    UNHEALTHY = "UNHEALTHY",
    CRITICAL = "CRITICAL",
    UNKNOWN = "UNKNOWN"
}
export interface Alert {
    id: string;
    missionId: string;
    severity: AlertSeverity;
    message: string;
    timestamp: Date;
    acknowledged: boolean;
    metadata: Record<string, unknown>;
}
export interface PhaseProgress {
    phaseType: string;
    progress: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
    startedAt: Date | null;
    lastUpdatedAt: Date | null;
    estimatedCompletionAt: Date | null;
}
export interface MissionProgress {
    missionId: string;
    overallProgress: number;
    phases: PhaseProgress[];
    startedAt: Date | null;
    estimatedCompletionAt: Date | null;
    lastUpdatedAt: Date;
}
export interface MissionHealth {
    missionId: string;
    status: MissionHealthStatus;
    activeAlerts: number;
    totalAlerts: number;
    criticalAlerts: number;
    errorAlerts: number;
    lastAlertAt: Date | null;
    phaseFailureCount: number;
    monitoringSince: Date | null;
    uptimeMs: number;
}
export interface MonitorStats {
    totalMissionsMonitored: number;
    currentlyActive: number;
    totalAlertsRecorded: number;
    alertsBySeverity: Record<string, number>;
    averageMissionProgress: number;
    healthDistribution: Record<string, number>;
}
export declare class MissionMonitorService {
    private readonly logger;
    private readonly states;
    private alertIdCounter;
    startMonitoring(missionId: string): void;
    stopMonitoring(missionId: string): void;
    updateProgress(missionId: string, phaseType: string, progress: number): void;
    getProgress(missionId: string): MissionProgress;
    recordAlert(missionId: string, severity: AlertSeverity, message: string, metadata?: Record<string, unknown>): Alert;
    getAlerts(missionId: string, severity?: AlertSeverity): Alert[];
    acknowledgeAlert(missionId: string, alertId: string): boolean;
    getHealth(missionId: string): MissionHealth;
    getActiveMissions(): string[];
    getStats(): MonitorStats;
    recordPhaseFailure(missionId: string, phaseType: string, error: string): void;
    private getMonitorStateOrThrow;
    private reassessHealth;
}
