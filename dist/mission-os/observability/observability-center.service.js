"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ObservabilityCenterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityCenterService = void 0;
const common_1 = require("@nestjs/common");
const MAX_METRICS = 100_000;
const MAX_LOGS = 50_000;
const MAX_TRACES = 20_000;
const MAX_ALERTS = 5_000;
const MAX_EQI_TREND = 100;
const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;
let ObservabilityCenterService = ObservabilityCenterService_1 = class ObservabilityCenterService {
    constructor() {
        this.logger = new common_1.Logger(ObservabilityCenterService_1.name);
        this.metricsBuffer = [];
        this.logBuffer = [];
        this.traceBuffer = [];
        this.alerts = [];
        this.agentStates = new Map();
        this.infraStates = new Map();
        this.eqiState = {
            currentScore: 0,
            trend: [],
            byDomain: {},
            lastCertificationAt: null,
            certificationLevel: 'uncertified',
        };
        this.browserState = {
            activeSessions: 0,
            totalSessions: 0,
            avgPageLoadMs: 0,
            errorRate: 0,
            byType: {},
        };
        this.memoryState = {
            workingMemory: { entries: 0, sizeBytes: 0 },
            sessionMemory: { entries: 0, sizeBytes: 0, activeSessions: 0 },
            longTermMemory: { entries: 0, sizeBytes: 0 },
            knowledgeGraph: { nodes: 0, edges: 0 },
            vectorSearch: { indexed: 0, queries: 0, avgLatencyMs: 0 },
            totalSizeBytes: 0,
        };
        this.alertCounter = 0;
        this.startTime = Date.now();
    }
    onModuleInit() {
        this.logger.log('ObservabilityCenterService initialised — single pane of glass online');
    }
    getSnapshot() {
        const now = new Date();
        const system = this.computeSystemHealth(now);
        const agents = this.computeAgentObservability();
        const infrastructure = this.computeInfrastructureObservability();
        return {
            timestamp: now,
            system,
            agents,
            memory: { ...this.memoryState },
            browser: { ...this.browserState },
            infrastructure,
            eqi: {
                ...this.eqiState,
                trend: [...this.eqiState.trend],
                byDomain: { ...this.eqiState.byDomain },
            },
            alerts: this.alerts
                .filter((a) => a.resolvedAt === null)
                .map((a) => ({ ...a, metadata: { ...a.metadata } })),
        };
    }
    recordMetric(metric) {
        this.metricsBuffer.push({
            ...metric,
            labels: { ...metric.labels },
            timestamp: metric.timestamp ?? new Date(),
        });
        if (this.metricsBuffer.length > MAX_METRICS) {
            this.metricsBuffer.splice(0, this.metricsBuffer.length - MAX_METRICS);
        }
    }
    recordLog(entry) {
        this.logBuffer.push({
            ...entry,
            metadata: { ...entry.metadata },
            timestamp: entry.timestamp ?? new Date(),
        });
        if (this.logBuffer.length > MAX_LOGS) {
            this.logBuffer.splice(0, this.logBuffer.length - MAX_LOGS);
        }
    }
    recordTrace(trace) {
        this.traceBuffer.push({
            ...trace,
            spans: trace.spans.map((s) => ({
                ...s,
                metadata: { ...s.metadata },
            })),
            startTime: trace.startTime ?? new Date(),
        });
        if (this.traceBuffer.length > MAX_TRACES) {
            this.traceBuffer.splice(0, this.traceBuffer.length - MAX_TRACES);
        }
    }
    createAlert(severity, source, message, metadata) {
        const alert = {
            id: `alert-${++this.alertCounter}`,
            severity,
            source,
            message,
            timestamp: new Date(),
            acknowledged: false,
            resolvedAt: null,
            metadata: metadata ?? {},
        };
        this.alerts.push(alert);
        if (this.alerts.length > MAX_ALERTS) {
            this.alerts.splice(0, this.alerts.length - MAX_ALERTS);
        }
        this.logger.warn(`Alert created [${severity}] from ${source}: ${message}`);
        return { ...alert, metadata: { ...alert.metadata } };
    }
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find((a) => a.id === alertId);
        if (!alert) {
            this.logger.debug(`Cannot acknowledge alert — id "${alertId}" not found`);
            return;
        }
        if (alert.acknowledged) {
            this.logger.debug(`Alert "${alertId}" is already acknowledged`);
            return;
        }
        alert.acknowledged = true;
        this.logger.log(`Alert acknowledged: ${alertId}`);
    }
    resolveAlert(alertId) {
        const alert = this.alerts.find((a) => a.id === alertId);
        if (!alert) {
            this.logger.debug(`Cannot resolve alert — id "${alertId}" not found`);
            return;
        }
        if (alert.resolvedAt !== null) {
            this.logger.debug(`Alert "${alertId}" is already resolved`);
            return;
        }
        alert.resolvedAt = new Date();
        this.logger.log(`Alert resolved: ${alertId}`);
    }
    getMetrics(name, from, to) {
        let result = this.metricsBuffer;
        if (name) {
            result = result.filter((m) => m.name === name);
        }
        if (from) {
            result = result.filter((m) => m.timestamp >= from);
        }
        if (to) {
            result = result.filter((m) => m.timestamp <= to);
        }
        return result.map((m) => ({ ...m, labels: { ...m.labels } }));
    }
    getLogs(filter) {
        let result = this.logBuffer;
        if (filter) {
            if (filter.level) {
                result = result.filter((l) => l.level === filter.level);
            }
            if (filter.source) {
                result = result.filter((l) => l.source === filter.source);
            }
            if (filter.correlationId) {
                result = result.filter((l) => l.correlationId === filter.correlationId);
            }
            if (filter.from) {
                result = result.filter((l) => l.timestamp >= filter.from);
            }
            if (filter.to) {
                result = result.filter((l) => l.timestamp <= filter.to);
            }
        }
        const limited = filter?.limit ? result.slice(-filter.limit) : result;
        return limited.map((l) => ({ ...l, metadata: { ...l.metadata } }));
    }
    getTraces(operation, correlationId) {
        let result = this.traceBuffer;
        if (operation) {
            result = result.filter((t) => t.operation === operation);
        }
        if (correlationId) {
            result = result.filter((t) => t.correlationId === correlationId);
        }
        return result.map((t) => ({
            ...t,
            spans: t.spans.map((s) => ({ ...s, metadata: { ...s.metadata } })),
        }));
    }
    getAlerts(severity, acknowledged) {
        let result = this.alerts;
        if (severity) {
            result = result.filter((a) => a.severity === severity);
        }
        if (acknowledged !== undefined) {
            result = result.filter((a) => a.acknowledged === acknowledged);
        }
        return result.map((a) => ({ ...a, metadata: { ...a.metadata } }));
    }
    getDashboard() {
        const now = new Date();
        const snapshot = this.getSnapshot();
        const keyMetrics = this.computeDashboardKeyMetrics(snapshot);
        const alertSummary = {
            info: 0,
            warning: 0,
            error: 0,
            critical: 0,
        };
        for (const alert of this.alerts) {
            if (alert.resolvedAt === null) {
                alertSummary[alert.severity]++;
            }
        }
        let healthy = 0;
        let degraded = 0;
        let failed = 0;
        for (const state of this.agentStates.values()) {
            if (state.healthy) {
                healthy++;
            }
            else if (state.status === 'failed') {
                failed++;
            }
            else {
                degraded++;
            }
        }
        const redisState = this.infraStates.get('redis') ?? {};
        const rabbitmqState = this.infraStates.get('rabbitmq') ?? {};
        const postgresqlState = this.infraStates.get('postgresql') ?? {};
        const cpuState = this.infraStates.get('cpu') ?? {};
        const memState = this.infraStates.get('system-memory') ?? {};
        const cpuHistory = this.extractChartHistory('system.cpu.percent', 60);
        const memoryHistory = this.extractChartHistory('system.memory.percent', 60);
        const requestRate = this.extractChartHistory('system.requests.per_sec', 60);
        const eqiTrend = this.eqiState.trend.map((score, i) => ({
            timestamp: new Date(now.getTime() - (this.eqiState.trend.length - i) * 60_000),
            value: score,
        }));
        const criticalAlerts = this.alerts.filter((a) => a.resolvedAt === null && a.severity === 'critical');
        return {
            generatedAt: now,
            summary: {
                systemHealthy: snapshot.system.cpuPercent < 90 && snapshot.system.memoryPercent < 90,
                activeAgents: snapshot.agents.activeAgents,
                totalAgents: snapshot.agents.totalAgents,
                activeAlerts: this.alerts.filter((a) => a.resolvedAt === null).length,
                criticalAlerts: criticalAlerts.length,
                eqiScore: snapshot.eqi.currentScore,
                infrastructureConnected: (redisState.connected ?? true) &&
                    (rabbitmqState.connected ?? true) &&
                    (postgresqlState.connected ?? true),
            },
            keyMetrics,
            alertSummary,
            agentHealth: { healthy, degraded, failed },
            infrastructure: {
                redisConnected: redisState.connected ?? true,
                rabbitmqConnected: rabbitmqState.connected ?? true,
                postgresqlConnected: postgresqlState.connected ?? true,
                cpuUsagePercent: cpuState.usagePercent ?? snapshot.system.cpuPercent,
                memoryUsagePercent: memState.percent ?? snapshot.system.memoryPercent,
            },
            charts: {
                cpuHistory,
                memoryHistory,
                requestRate,
                eqiTrend,
            },
            recentAlerts: this.alerts
                .filter((a) => a.resolvedAt === null)
                .slice(-10)
                .map((a) => ({ ...a, metadata: { ...a.metadata } })),
        };
    }
    updateAgentMetrics(agentId, metrics) {
        const existing = this.agentStates.get(agentId);
        const updated = {
            agentId,
            cluster: metrics.cluster ?? existing?.cluster ?? 'default',
            status: metrics.status ?? existing?.status ?? 'idle',
            healthy: metrics.healthy ?? existing?.healthy ?? true,
            tasksCompleted: metrics.tasksCompleted ?? existing?.tasksCompleted ?? 0,
            tasksFailed: metrics.tasksFailed ?? existing?.tasksFailed ?? 0,
            lastExecutionTimeMs: metrics.lastExecutionTimeMs ?? existing?.lastExecutionTimeMs ?? 0,
            circuitBreakerOpen: metrics.circuitBreakerOpen ?? existing?.circuitBreakerOpen ?? false,
            updatedAt: new Date(),
        };
        this.agentStates.set(agentId, updated);
    }
    updateInfrastructureMetrics(component, metrics) {
        this.infraStates.set(component, { ...metrics });
        if (typeof metrics.usagePercent === 'number') {
            this.recordMetric({
                name: `infra.${component}.usage_percent`,
                value: metrics.usagePercent,
                unit: 'percent',
                timestamp: new Date(),
                labels: { component },
            });
        }
        if (typeof metrics.connected === 'boolean' && !metrics.connected) {
            this.createAlert('error', `infrastructure.${component}`, `${component} connection lost`, { component, metrics });
        }
    }
    updateEqiScore(score, domains) {
        const trend = [...this.eqiState.trend, score];
        if (trend.length > MAX_EQI_TREND) {
            trend.splice(0, trend.length - MAX_EQI_TREND);
        }
        let certificationLevel = 'uncertified';
        if (score >= 95)
            certificationLevel = 'platinum';
        else if (score >= 85)
            certificationLevel = 'gold';
        else if (score >= 70)
            certificationLevel = 'silver';
        else if (score >= 50)
            certificationLevel = 'bronze';
        this.eqiState = {
            currentScore: score,
            trend,
            byDomain: { ...domains },
            lastCertificationAt: certificationLevel !== 'uncertified' ? new Date() : this.eqiState.lastCertificationAt,
            certificationLevel,
        };
        this.recordMetric({
            name: 'eqi.score',
            value: score,
            unit: 'score',
            timestamp: new Date(),
            labels: { certificationLevel },
        });
        if (this.eqiState.trend.length >= 2) {
            const prev = this.eqiState.trend[this.eqiState.trend.length - 2];
            if (prev - score >= 10) {
                this.createAlert('warning', 'eqi', `EQI score dropped by ${(prev - score).toFixed(1)} points (from ${prev} to ${score})`, { previousScore: prev, currentScore: score });
            }
        }
    }
    getHealthStatus() {
        const issues = [];
        const snapshot = this.getSnapshot();
        if (snapshot.system.cpuPercent > 90) {
            issues.push(`CPU usage critical: ${snapshot.system.cpuPercent.toFixed(1)}%`);
        }
        if (snapshot.system.memoryPercent > 90) {
            issues.push(`Memory usage critical: ${snapshot.system.memoryPercent.toFixed(1)}%`);
        }
        if (snapshot.system.diskPercent > 95) {
            issues.push(`Disk usage critical: ${snapshot.system.diskPercent.toFixed(1)}%`);
        }
        if (!snapshot.infrastructure.redis.connected) {
            issues.push('Redis is not connected');
        }
        if (!snapshot.infrastructure.rabbitmq.connected) {
            issues.push('RabbitMQ is not connected');
        }
        if (!snapshot.infrastructure.postgresql.connected) {
            issues.push('PostgreSQL is not connected');
        }
        if (snapshot.infrastructure.cpu.usagePercent > 90) {
            issues.push(`Infrastructure CPU critical: ${snapshot.infrastructure.cpu.usagePercent.toFixed(1)}%`);
        }
        if (snapshot.infrastructure.gpu.available && snapshot.infrastructure.gpu.utilizationPercent > 95) {
            issues.push(`GPU utilization critical: ${snapshot.infrastructure.gpu.utilizationPercent.toFixed(1)}%`);
        }
        if (snapshot.agents.circuitBreakersOpen > 0) {
            issues.push(`${snapshot.agents.circuitBreakersOpen} circuit breaker(s) open`);
        }
        if (snapshot.agents.totalAgents > 0 && snapshot.agents.healthyAgents === 0) {
            issues.push('No healthy agents');
        }
        const criticalAlerts = this.alerts.filter((a) => a.resolvedAt === null && a.severity === 'critical' && !a.acknowledged);
        if (criticalAlerts.length > 0) {
            issues.push(`${criticalAlerts.length} unacknowledged critical alert(s)`);
        }
        if (snapshot.eqi.currentScore > 0 && snapshot.eqi.currentScore < 50) {
            issues.push(`EQI score below threshold: ${snapshot.eqi.currentScore}`);
        }
        if (snapshot.browser.errorRate > 0.5) {
            issues.push(`Browser error rate high: ${(snapshot.browser.errorRate * 100).toFixed(1)}%`);
        }
        return {
            healthy: issues.length === 0,
            issues,
        };
    }
    getMetricTimeSeries(name, from, to, intervalMs) {
        if (intervalMs <= 0) {
            throw new Error('intervalMs must be positive');
        }
        const relevant = this.metricsBuffer.filter((m) => m.name === name && m.timestamp >= from && m.timestamp <= to);
        if (relevant.length === 0) {
            return [];
        }
        const buckets = [];
        const bucketStart = from.getTime();
        const bucketEnd = to.getTime();
        for (let t = bucketStart; t < bucketEnd; t += intervalMs) {
            const bucketTimestamp = new Date(t);
            const bucketEndMs = t + intervalMs;
            const inBucket = relevant.filter((m) => m.timestamp.getTime() >= t && m.timestamp.getTime() < bucketEndMs);
            if (inBucket.length > 0) {
                const values = inBucket.map((m) => m.value);
                buckets.push({
                    timestamp: bucketTimestamp,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    avg: values.reduce((s, v) => s + v, 0) / values.length,
                    sum: values.reduce((s, v) => s + v, 0),
                    count: values.length,
                });
            }
        }
        return buckets;
    }
    cleanup(retentionMs) {
        const retention = retentionMs ?? DEFAULT_RETENTION_MS;
        const cutoff = new Date(Date.now() - retention);
        const metricsBefore = this.metricsBuffer.length;
        const logsBefore = this.logBuffer.length;
        const tracesBefore = this.traceBuffer.length;
        const alertsBefore = this.alerts.length;
        let writeIdx = 0;
        for (let i = 0; i < this.metricsBuffer.length; i++) {
            if (this.metricsBuffer[i].timestamp >= cutoff) {
                this.metricsBuffer[writeIdx++] = this.metricsBuffer[i];
            }
        }
        this.metricsBuffer.length = writeIdx;
        writeIdx = 0;
        for (let i = 0; i < this.logBuffer.length; i++) {
            if (this.logBuffer[i].timestamp >= cutoff) {
                this.logBuffer[writeIdx++] = this.logBuffer[i];
            }
        }
        this.logBuffer.length = writeIdx;
        writeIdx = 0;
        for (let i = 0; i < this.traceBuffer.length; i++) {
            if (this.traceBuffer[i].startTime >= cutoff) {
                this.traceBuffer[writeIdx++] = this.traceBuffer[i];
            }
        }
        this.traceBuffer.length = writeIdx;
        writeIdx = 0;
        for (let i = 0; i < this.alerts.length; i++) {
            const alert = this.alerts[i];
            if (alert.resolvedAt === null) {
                this.alerts[writeIdx++] = alert;
            }
            else if (alert.resolvedAt >= cutoff) {
                this.alerts[writeIdx++] = alert;
            }
        }
        this.alerts.length = writeIdx;
        const agentCutoff = new Date(Date.now() - retention);
        for (const [agentId, state] of this.agentStates.entries()) {
            if (state.updatedAt < agentCutoff) {
                this.agentStates.delete(agentId);
            }
        }
        const result = {
            metricsRemoved: metricsBefore - this.metricsBuffer.length,
            logsRemoved: logsBefore - this.logBuffer.length,
            tracesRemoved: tracesBefore - this.traceBuffer.length,
            alertsRemoved: alertsBefore - this.alerts.length,
        };
        this.logger.log(`Cleanup complete: removed ${result.metricsRemoved} metrics, ` +
            `${result.logsRemoved} logs, ${result.tracesRemoved} traces, ` +
            `${result.alertsRemoved} alerts (retention=${retention}ms)`);
        return result;
    }
    updateBrowserState(state) {
        this.browserState = {
            ...this.browserState,
            ...state,
            byType: state.byType ?? this.browserState.byType,
        };
    }
    updateMemoryState(state) {
        this.memoryState = {
            ...this.memoryState,
            ...state,
            workingMemory: state.workingMemory ?? this.memoryState.workingMemory,
            sessionMemory: state.sessionMemory ?? this.memoryState.sessionMemory,
            longTermMemory: state.longTermMemory ?? this.memoryState.longTermMemory,
            knowledgeGraph: state.knowledgeGraph ?? this.memoryState.knowledgeGraph,
            vectorSearch: state.vectorSearch ?? this.memoryState.vectorSearch,
        };
    }
    computeSystemHealth(now) {
        const cpuMetrics = this.metricsBuffer.filter((m) => m.name === 'system.cpu.percent');
        const cpuPercent = cpuMetrics.length > 0
            ? cpuMetrics[cpuMetrics.length - 1].value
            : process.cpuUsage?.().user
                ? (process.cpuUsage().user / 1_000_000) * 100
                : 0;
        const memMetrics = this.metricsBuffer.filter((m) => m.name === 'system.memory.percent');
        let memoryPercent = 0;
        if (memMetrics.length > 0) {
            memoryPercent = memMetrics[memMetrics.length - 1].value;
        }
        else if (typeof process.memoryUsage === 'function') {
            const mem = process.memoryUsage();
            memoryPercent = (mem.heapUsed / mem.heapTotal) * 100;
        }
        const diskState = this.infraStates.get('disk') ?? {};
        const diskPercent = diskState.percent ?? 0;
        return {
            cpuPercent: Math.min(100, Math.max(0, cpuPercent)),
            memoryPercent: Math.min(100, Math.max(0, memoryPercent)),
            diskPercent: Math.min(100, Math.max(0, diskPercent)),
            uptime: now.getTime() - this.startTime,
            nodeVersion: process.version,
            activeHandles: process._getActiveHandles?.()?.length ?? 0,
            activeRequests: process._getActiveRequests?.()?.length ?? 0,
        };
    }
    computeAgentObservability() {
        const states = [...this.agentStates.values()];
        const byCluster = {};
        const byStatus = {};
        let activeAgents = 0;
        let healthyAgents = 0;
        let totalTasksCompleted = 0;
        let totalTasksFailed = 0;
        let totalExecTimeMs = 0;
        let execTimeCount = 0;
        let circuitBreakersOpen = 0;
        for (const state of states) {
            if (!byCluster[state.cluster]) {
                byCluster[state.cluster] = { total: 0, active: 0, healthy: 0 };
            }
            byCluster[state.cluster].total++;
            if (state.status === 'active' || state.status === 'running') {
                byCluster[state.cluster].active++;
                activeAgents++;
            }
            if (state.healthy) {
                byCluster[state.cluster].healthy++;
                healthyAgents++;
            }
            byStatus[state.status] = (byStatus[state.status] ?? 0) + 1;
            totalTasksCompleted += state.tasksCompleted;
            totalTasksFailed += state.tasksFailed;
            if (state.lastExecutionTimeMs > 0) {
                totalExecTimeMs += state.lastExecutionTimeMs;
                execTimeCount++;
            }
            if (state.circuitBreakerOpen) {
                circuitBreakersOpen++;
            }
        }
        return {
            totalAgents: states.length,
            activeAgents,
            healthyAgents,
            byCluster,
            byStatus,
            totalTasksCompleted,
            totalTasksFailed,
            avgExecutionTimeMs: execTimeCount > 0 ? totalExecTimeMs / execTimeCount : 0,
            circuitBreakersOpen,
        };
    }
    computeInfrastructureObservability() {
        const redis = this.infraStates.get('redis') ?? {};
        const rabbitmq = this.infraStates.get('rabbitmq') ?? {};
        const postgresql = this.infraStates.get('postgresql') ?? {};
        const cpu = this.infraStates.get('cpu') ?? {};
        const gpu = this.infraStates.get('gpu') ?? {};
        return {
            redis: {
                connected: redis.connected ?? false,
                memoryUsedMb: redis.memoryUsedMb ?? 0,
                commandsPerSec: redis.commandsPerSec ?? 0,
                keys: redis.keys ?? 0,
            },
            rabbitmq: {
                connected: rabbitmq.connected ?? false,
                queues: rabbitmq.queues ?? 0,
                messages: rabbitmq.messages ?? 0,
                consumers: rabbitmq.consumers ?? 0,
            },
            postgresql: {
                connected: postgresql.connected ?? false,
                activeConnections: postgresql.activeConnections ?? 0,
                queriesPerSec: postgresql.queriesPerSec ?? 0,
                sizeMb: postgresql.sizeMb ?? 0,
            },
            cpu: {
                cores: cpu.cores ?? 0,
                usagePercent: cpu.usagePercent ?? 0,
                loadAvg: Array.isArray(cpu.loadAvg) ? [...cpu.loadAvg] : [],
            },
            gpu: {
                available: gpu.available ?? false,
                memoryUsedMb: gpu.memoryUsedMb ?? 0,
                memoryTotalMb: gpu.memoryTotalMb ?? 0,
                utilizationPercent: gpu.utilizationPercent ?? 0,
            },
        };
    }
    computeDashboardKeyMetrics(snapshot) {
        const metrics = [];
        metrics.push({
            name: 'CPU Usage',
            value: Math.round(snapshot.system.cpuPercent * 10) / 10,
            unit: '%',
            trend: this.detectTrend('system.cpu.percent'),
        });
        metrics.push({
            name: 'Memory Usage',
            value: Math.round(snapshot.system.memoryPercent * 10) / 10,
            unit: '%',
            trend: this.detectTrend('system.memory.percent'),
        });
        metrics.push({
            name: 'Active Agents',
            value: snapshot.agents.activeAgents,
            unit: 'agents',
            trend: 'stable',
        });
        metrics.push({
            name: 'EQI Score',
            value: snapshot.eqi.currentScore,
            unit: 'score',
            trend: this.detectEqiTrend(),
        });
        metrics.push({
            name: 'Redis Commands/sec',
            value: snapshot.infrastructure.redis.commandsPerSec,
            unit: 'cmd/s',
            trend: this.detectTrend('infra.redis.usage_percent'),
        });
        metrics.push({
            name: 'PostgreSQL Queries/sec',
            value: snapshot.infrastructure.postgresql.queriesPerSec,
            unit: 'qps',
            trend: this.detectTrend('infra.postgresql.usage_percent'),
        });
        metrics.push({
            name: 'Browser Error Rate',
            value: Math.round(snapshot.browser.errorRate * 1000) / 10,
            unit: '%',
            trend: this.detectTrend('browser.error_rate'),
        });
        return metrics;
    }
    detectTrend(metricName) {
        const points = this.metricsBuffer.filter((m) => m.name === metricName).slice(-2);
        if (points.length < 2)
            return 'stable';
        const diff = points[1].value - points[0].value;
        const threshold = Math.max(Math.abs(points[0].value) * 0.01, 0.1);
        if (diff > threshold)
            return 'up';
        if (diff < -threshold)
            return 'down';
        return 'stable';
    }
    detectEqiTrend() {
        const trend = this.eqiState.trend;
        if (trend.length < 2)
            return 'stable';
        const latest = trend[trend.length - 1];
        const previous = trend[trend.length - 2];
        const diff = latest - previous;
        if (diff > 2)
            return 'up';
        if (diff < -2)
            return 'down';
        return 'stable';
    }
    extractChartHistory(metricName, maxPoints) {
        const points = this.metricsBuffer
            .filter((m) => m.name === metricName)
            .slice(-maxPoints);
        return points.map((m) => ({ timestamp: m.timestamp, value: m.value }));
    }
};
exports.ObservabilityCenterService = ObservabilityCenterService;
exports.ObservabilityCenterService = ObservabilityCenterService = ObservabilityCenterService_1 = __decorate([
    (0, common_1.Injectable)()
], ObservabilityCenterService);
//# sourceMappingURL=observability-center.service.js.map