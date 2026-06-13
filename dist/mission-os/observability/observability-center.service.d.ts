import { OnModuleInit } from '@nestjs/common';
export interface ObservabilitySnapshot {
    timestamp: Date;
    system: SystemHealth;
    agents: AgentObservability;
    memory: MemoryObservability;
    browser: BrowserObservability;
    infrastructure: InfrastructureObservability;
    eqi: EqiObservability;
    alerts: Alert[];
}
export interface SystemHealth {
    cpuPercent: number;
    memoryPercent: number;
    diskPercent: number;
    uptime: number;
    nodeVersion: string;
    activeHandles: number;
    activeRequests: number;
}
export interface AgentObservability {
    totalAgents: number;
    activeAgents: number;
    healthyAgents: number;
    byCluster: Record<string, {
        total: number;
        active: number;
        healthy: number;
    }>;
    byStatus: Record<string, number>;
    totalTasksCompleted: number;
    totalTasksFailed: number;
    avgExecutionTimeMs: number;
    circuitBreakersOpen: number;
}
export interface MemoryObservability {
    workingMemory: {
        entries: number;
        sizeBytes: number;
    };
    sessionMemory: {
        entries: number;
        sizeBytes: number;
        activeSessions: number;
    };
    longTermMemory: {
        entries: number;
        sizeBytes: number;
    };
    knowledgeGraph: {
        nodes: number;
        edges: number;
    };
    vectorSearch: {
        indexed: number;
        queries: number;
        avgLatencyMs: number;
    };
    totalSizeBytes: number;
}
export interface BrowserObservability {
    activeSessions: number;
    totalSessions: number;
    avgPageLoadMs: number;
    errorRate: number;
    byType: Record<string, {
        count: number;
        status: string;
    }>;
}
export interface InfrastructureObservability {
    redis: {
        connected: boolean;
        memoryUsedMb: number;
        commandsPerSec: number;
        keys: number;
    };
    rabbitmq: {
        connected: boolean;
        queues: number;
        messages: number;
        consumers: number;
    };
    postgresql: {
        connected: boolean;
        activeConnections: number;
        queriesPerSec: number;
        sizeMb: number;
    };
    cpu: {
        cores: number;
        usagePercent: number;
        loadAvg: number[];
    };
    gpu: {
        available: boolean;
        memoryUsedMb: number;
        memoryTotalMb: number;
        utilizationPercent: number;
    };
}
export interface EqiObservability {
    currentScore: number;
    trend: number[];
    byDomain: Record<string, number>;
    lastCertificationAt: Date | null;
    certificationLevel: string;
}
export interface Alert {
    id: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    source: string;
    message: string;
    timestamp: Date;
    acknowledged: boolean;
    resolvedAt: Date | null;
    metadata: Record<string, any>;
}
export interface ObservabilityMetric {
    name: string;
    value: number;
    unit: string;
    timestamp: Date;
    labels: Record<string, string>;
}
export interface ObservabilityLogEntry {
    id: string;
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    source: string;
    message: string;
    timestamp: Date;
    metadata: Record<string, any>;
    correlationId: string | null;
}
export interface ObservabilityTrace {
    id: string;
    operation: string;
    startTime: Date;
    durationMs: number;
    status: 'ok' | 'error';
    spans: TraceSpan[];
    correlationId: string;
}
export interface TraceSpan {
    id: string;
    operation: string;
    startTime: Date;
    durationMs: number;
    status: 'ok' | 'error';
    agentId: string | null;
    metadata: Record<string, any>;
}
interface LogFilter {
    level?: ObservabilityLogEntry['level'];
    source?: string;
    correlationId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
}
interface Dashboard {
    generatedAt: Date;
    summary: {
        systemHealthy: boolean;
        activeAgents: number;
        totalAgents: number;
        activeAlerts: number;
        criticalAlerts: number;
        eqiScore: number;
        infrastructureConnected: boolean;
    };
    keyMetrics: Array<{
        name: string;
        value: number;
        unit: string;
        trend: 'up' | 'down' | 'stable';
    }>;
    alertSummary: Record<Alert['severity'], number>;
    agentHealth: {
        healthy: number;
        degraded: number;
        failed: number;
    };
    infrastructure: {
        redisConnected: boolean;
        rabbitmqConnected: boolean;
        postgresqlConnected: boolean;
        cpuUsagePercent: number;
        memoryUsagePercent: number;
    };
    charts: {
        cpuHistory: Array<{
            timestamp: Date;
            value: number;
        }>;
        memoryHistory: Array<{
            timestamp: Date;
            value: number;
        }>;
        requestRate: Array<{
            timestamp: Date;
            value: number;
        }>;
        eqiTrend: Array<{
            timestamp: Date;
            value: number;
        }>;
    };
    recentAlerts: Alert[];
}
interface TimeSeriesBucket {
    timestamp: Date;
    min: number;
    max: number;
    avg: number;
    sum: number;
    count: number;
}
export declare class ObservabilityCenterService implements OnModuleInit {
    private readonly logger;
    private readonly metricsBuffer;
    private readonly logBuffer;
    private readonly traceBuffer;
    private readonly alerts;
    private readonly agentStates;
    private readonly infraStates;
    private eqiState;
    private browserState;
    private memoryState;
    private alertCounter;
    private readonly startTime;
    onModuleInit(): void;
    getSnapshot(): ObservabilitySnapshot;
    recordMetric(metric: ObservabilityMetric): void;
    recordLog(entry: ObservabilityLogEntry): void;
    recordTrace(trace: ObservabilityTrace): void;
    createAlert(severity: Alert['severity'], source: string, message: string, metadata?: Record<string, any>): Alert;
    acknowledgeAlert(alertId: string): void;
    resolveAlert(alertId: string): void;
    getMetrics(name?: string, from?: Date, to?: Date): ObservabilityMetric[];
    getLogs(filter?: LogFilter): ObservabilityLogEntry[];
    getTraces(operation?: string, correlationId?: string): ObservabilityTrace[];
    getAlerts(severity?: Alert['severity'], acknowledged?: boolean): Alert[];
    getDashboard(): Dashboard;
    updateAgentMetrics(agentId: string, metrics: {
        cluster?: string;
        status?: string;
        healthy?: boolean;
        tasksCompleted?: number;
        tasksFailed?: number;
        lastExecutionTimeMs?: number;
        circuitBreakerOpen?: boolean;
    }): void;
    updateInfrastructureMetrics(component: string, metrics: Record<string, any>): void;
    updateEqiScore(score: number, domains: Record<string, number>): void;
    getHealthStatus(): {
        healthy: boolean;
        issues: string[];
    };
    getMetricTimeSeries(name: string, from: Date, to: Date, intervalMs: number): TimeSeriesBucket[];
    cleanup(retentionMs?: number): {
        metricsRemoved: number;
        logsRemoved: number;
        tracesRemoved: number;
        alertsRemoved: number;
    };
    updateBrowserState(state: Partial<BrowserObservability>): void;
    updateMemoryState(state: Partial<MemoryObservability>): void;
    private computeSystemHealth;
    private computeAgentObservability;
    private computeInfrastructureObservability;
    private computeDashboardKeyMetrics;
    private detectTrend;
    private detectEqiTrend;
    private extractChartHistory;
}
export {};
