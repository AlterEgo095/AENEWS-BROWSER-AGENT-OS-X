import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AgentMetrics, AgentCluster } from '../interfaces/agent.interface';
import { AgentRegistryService } from '../registry/agent-registry.service';
export declare enum MetricType {
    COUNTER = "counter",
    GAUGE = "gauge",
    HISTOGRAM = "histogram",
    TIMER = "timer"
}
export interface MetricDataPoint {
    timestamp: Date;
    value: number;
    labels: Record<string, string>;
}
export interface MetricSeries {
    name: string;
    type: MetricType;
    description: string;
    unit: string;
    dataPoints: MetricDataPoint[];
}
export interface AgentMetricsSummary {
    agentId: string;
    cluster: string;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTimeMs: number;
    maxExecutionTimeMs: number;
    minExecutionTimeMs: number;
    averageMemoryUsedMb: number;
    peakMemoryUsedMb: number;
    totalCpuUsage: number;
    uptimeMs: number;
    successRate: number;
    errorRate: number;
    throughputPerMinute: number;
    lastExecutionAt: Date | null;
    p50ExecutionTimeMs: number;
    p95ExecutionTimeMs: number;
    p99ExecutionTimeMs: number;
}
export interface ClusterMetricsSummary {
    cluster: AgentCluster;
    totalAgents: number;
    activeAgents: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTimeMs: number;
    errorRate: number;
    throughputPerMinute: number;
    totalMemoryUsedMb: number;
}
export interface SystemMetricsSummary {
    totalAgents: number;
    activeAgents: number;
    idleAgents: number;
    errorAgents: number;
    totalExecutions: number;
    totalSuccessfulExecutions: number;
    totalFailedExecutions: number;
    overallSuccessRate: number;
    overallErrorRate: number;
    averageExecutionTimeMs: number;
    totalMemoryUsedMb: number;
    totalCpuUsagePercent: number;
    systemThroughputPerMinute: number;
    clusterMetrics: Record<string, ClusterMetricsSummary>;
    timestamp: Date;
}
export declare class AgentMetricsService implements OnModuleInit, OnModuleDestroy {
    private readonly agentRegistry;
    private readonly logger;
    private metricsCollectionInterval;
    private readonly agentExecutionTimes;
    private readonly agentMemoryUsage;
    private readonly agentCpuUsage;
    private readonly counters;
    private readonly gauges;
    private readonly timeSeries;
    private static readonly MAX_DATA_POINTS;
    private static readonly COLLECTION_INTERVAL_MS;
    constructor(agentRegistry: AgentRegistryService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    recordExecution(agentId: string, executionTimeMs: number, success: boolean, metrics?: AgentMetrics): void;
    getAgentMetrics(agentId: string): AgentMetricsSummary;
    getClusterMetrics(cluster: AgentCluster): ClusterMetricsSummary;
    getSystemMetrics(): SystemMetricsSummary;
    getTimeSeries(name: string, limit?: number): MetricDataPoint[];
    getMetricNames(): string[];
    setGauge(name: string, value: number, labels?: Record<string, string>): void;
    incrementCounter(name: string, value?: number): void;
    getCounter(name: string): number;
    getGauge(name: string): number;
    getErrorRate(agentId: string): number;
    getSuccessRate(agentId: string): number;
    private addTimeSeriesPoint;
    private percentile;
    private calculateThroughput;
    private calculateClusterThroughput;
    private calculateSystemThroughput;
    private collectAgentMetrics;
    private startMetricsCollection;
    private stopMetricsCollection;
}
