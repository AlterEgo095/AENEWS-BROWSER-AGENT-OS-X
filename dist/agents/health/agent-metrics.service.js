"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AgentMetricsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentMetricsService = exports.MetricType = void 0;
const common_1 = require("@nestjs/common");
const agent_interface_1 = require("../interfaces/agent.interface");
const agent_registry_service_1 = require("../registry/agent-registry.service");
var MetricType;
(function (MetricType) {
    MetricType["COUNTER"] = "counter";
    MetricType["GAUGE"] = "gauge";
    MetricType["HISTOGRAM"] = "histogram";
    MetricType["TIMER"] = "timer";
})(MetricType || (exports.MetricType = MetricType = {}));
let AgentMetricsService = AgentMetricsService_1 = class AgentMetricsService {
    constructor(agentRegistry) {
        this.agentRegistry = agentRegistry;
        this.logger = new common_1.Logger(AgentMetricsService_1.name);
        this.metricsCollectionInterval = null;
        this.agentExecutionTimes = new Map();
        this.agentMemoryUsage = new Map();
        this.agentCpuUsage = new Map();
        this.counters = new Map();
        this.gauges = new Map();
        this.timeSeries = new Map();
    }
    onModuleInit() {
        this.startMetricsCollection();
        this.logger.log('Agent Metrics service initialized');
    }
    onModuleDestroy() {
        this.stopMetricsCollection();
    }
    recordExecution(agentId, executionTimeMs, success, metrics) {
        this.incrementCounter(`agent:${agentId}:total_executions`);
        if (success) {
            this.incrementCounter(`agent:${agentId}:successful_executions`);
        }
        else {
            this.incrementCounter(`agent:${agentId}:failed_executions`);
        }
        const times = this.agentExecutionTimes.get(agentId) || [];
        times.push(executionTimeMs);
        if (times.length > 1000)
            times.shift();
        this.agentExecutionTimes.set(agentId, times);
        if (metrics?.memoryUsedMb) {
            const memoryUsage = this.agentMemoryUsage.get(agentId) || [];
            memoryUsage.push(metrics.memoryUsedMb);
            if (memoryUsage.length > 1000)
                memoryUsage.shift();
            this.agentMemoryUsage.set(agentId, memoryUsage);
        }
        if (metrics?.cpuUsagePercent) {
            const cpuUsage = this.agentCpuUsage.get(agentId) || [];
            cpuUsage.push(metrics.cpuUsagePercent);
            if (cpuUsage.length > 1000)
                cpuUsage.shift();
            this.agentCpuUsage.set(agentId, cpuUsage);
        }
        this.addTimeSeriesPoint(`agent:${agentId}:execution_time`, executionTimeMs, {
            agentId,
            status: success ? 'success' : 'failure',
        });
        if (metrics?.memoryUsedMb) {
            this.addTimeSeriesPoint(`agent:${agentId}:memory_usage`, metrics.memoryUsedMb, { agentId });
        }
        if (metrics?.cpuUsagePercent) {
            this.addTimeSeriesPoint(`agent:${agentId}:cpu_usage`, metrics.cpuUsagePercent, { agentId });
        }
    }
    getAgentMetrics(agentId) {
        const agent = this.agentRegistry.getAgent(agentId);
        const state = agent?.getState();
        const config = agent?.getConfig();
        const totalExecutions = this.getCounter(`agent:${agentId}:total_executions`);
        const successfulExecutions = this.getCounter(`agent:${agentId}:successful_executions`);
        const failedExecutions = this.getCounter(`agent:${agentId}:failed_executions`);
        const executionTimes = this.agentExecutionTimes.get(agentId) || [];
        const memoryUsage = this.agentMemoryUsage.get(agentId) || [];
        const cpuUsage = this.agentCpuUsage.get(agentId) || [];
        const avgExecTime = executionTimes.length > 0
            ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
            : 0;
        const sortedTimes = [...executionTimes].sort((a, b) => a - b);
        const totalCpuUsage = cpuUsage.length > 0 ? cpuUsage.reduce((a, b) => a + b, 0) : 0;
        const errorRate = totalExecutions > 0 ? failedExecutions / totalExecutions : 0;
        return {
            agentId,
            cluster: config?.cluster || 'unknown',
            totalExecutions,
            successfulExecutions,
            failedExecutions,
            averageExecutionTimeMs: Math.round(avgExecTime),
            maxExecutionTimeMs: sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0,
            minExecutionTimeMs: sortedTimes.length > 0 ? sortedTimes[0] : 0,
            averageMemoryUsedMb: memoryUsage.length > 0
                ? Math.round((memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length) * 100) / 100
                : 0,
            peakMemoryUsedMb: memoryUsage.length > 0 ? Math.max(...memoryUsage) : 0,
            totalCpuUsage: Math.round(totalCpuUsage * 100) / 100,
            uptimeMs: state?.health.uptimeMs || 0,
            successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
            errorRate,
            throughputPerMinute: this.calculateThroughput(agentId),
            lastExecutionAt: executionTimes.length > 0 ? new Date() : null,
            p50ExecutionTimeMs: this.percentile(sortedTimes, 50),
            p95ExecutionTimeMs: this.percentile(sortedTimes, 95),
            p99ExecutionTimeMs: this.percentile(sortedTimes, 99),
        };
    }
    getClusterMetrics(cluster) {
        const agents = this.agentRegistry.getByCluster(cluster);
        let totalExecutions = 0;
        let successfulExecutions = 0;
        let failedExecutions = 0;
        let totalExecTime = 0;
        let totalMemory = 0;
        let execCount = 0;
        let activeAgents = 0;
        for (const agent of agents) {
            const id = agent.getConfig().id;
            const agentMetrics = this.getAgentMetrics(id);
            totalExecutions += agentMetrics.totalExecutions;
            successfulExecutions += agentMetrics.successfulExecutions;
            failedExecutions += agentMetrics.failedExecutions;
            totalExecTime += agentMetrics.averageExecutionTimeMs * agentMetrics.totalExecutions;
            totalMemory += agentMetrics.averageMemoryUsedMb;
            if (agentMetrics.totalExecutions > 0)
                execCount++;
            if (agent.getStatus() === agent_interface_1.AgentStatus.RUNNING) {
                activeAgents++;
            }
        }
        const errorRate = totalExecutions > 0 ? failedExecutions / totalExecutions : 0;
        return {
            cluster,
            totalAgents: agents.length,
            activeAgents,
            totalExecutions,
            successfulExecutions,
            failedExecutions,
            averageExecutionTimeMs: execCount > 0 ? Math.round(totalExecTime / totalExecutions) : 0,
            errorRate,
            throughputPerMinute: this.calculateClusterThroughput(cluster),
            totalMemoryUsedMb: Math.round(totalMemory * 100) / 100,
        };
    }
    getSystemMetrics() {
        const agents = this.agentRegistry.getAllAgents();
        const states = agents.map((a) => a.getState());
        const activeAgents = states.filter((s) => s.status === agent_interface_1.AgentStatus.RUNNING).length;
        const idleAgents = states.filter((s) => s.status === agent_interface_1.AgentStatus.IDLE).length;
        const errorAgents = states.filter((s) => s.status === agent_interface_1.AgentStatus.ERROR).length;
        let totalExecutions = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;
        let totalExecTime = 0;
        let totalMemory = 0;
        let totalCpu = 0;
        let execCount = 0;
        for (const agent of agents) {
            const id = agent.getConfig().id;
            const agentMetrics = this.getAgentMetrics(id);
            totalExecutions += agentMetrics.totalExecutions;
            totalSuccessful += agentMetrics.successfulExecutions;
            totalFailed += agentMetrics.failedExecutions;
            totalExecTime += agentMetrics.averageExecutionTimeMs * agentMetrics.totalExecutions;
            totalMemory += agentMetrics.averageMemoryUsedMb;
            totalCpu += agentMetrics.totalCpuUsage;
            if (agentMetrics.totalExecutions > 0)
                execCount++;
        }
        const clusterMetrics = {};
        for (const cluster of Object.values(agent_interface_1.AgentCluster)) {
            clusterMetrics[cluster] = this.getClusterMetrics(cluster);
        }
        return {
            totalAgents: agents.length,
            activeAgents,
            idleAgents,
            errorAgents,
            totalExecutions,
            totalSuccessfulExecutions: totalSuccessful,
            totalFailedExecutions: totalFailed,
            overallSuccessRate: totalExecutions > 0 ? totalSuccessful / totalExecutions : 0,
            overallErrorRate: totalExecutions > 0 ? totalFailed / totalExecutions : 0,
            averageExecutionTimeMs: execCount > 0 ? Math.round(totalExecTime / totalExecutions) : 0,
            totalMemoryUsedMb: Math.round(totalMemory * 100) / 100,
            totalCpuUsagePercent: Math.round(totalCpu * 100) / 100,
            systemThroughputPerMinute: this.calculateSystemThroughput(),
            clusterMetrics,
            timestamp: new Date(),
        };
    }
    getTimeSeries(name, limit) {
        const data = this.timeSeries.get(name) || [];
        return limit ? data.slice(-limit) : data;
    }
    getMetricNames() {
        return Array.from(this.timeSeries.keys());
    }
    setGauge(name, value, labels) {
        this.gauges.set(name, value);
        this.addTimeSeriesPoint(name, value, labels || {});
    }
    incrementCounter(name, value) {
        const current = this.counters.get(name) || 0;
        this.counters.set(name, current + (value || 1));
    }
    getCounter(name) {
        return this.counters.get(name) || 0;
    }
    getGauge(name) {
        return this.gauges.get(name) || 0;
    }
    getErrorRate(agentId) {
        const total = this.getCounter(`agent:${agentId}:total_executions`);
        const failed = this.getCounter(`agent:${agentId}:failed_executions`);
        return total > 0 ? failed / total : 0;
    }
    getSuccessRate(agentId) {
        const total = this.getCounter(`agent:${agentId}:total_executions`);
        const successful = this.getCounter(`agent:${agentId}:successful_executions`);
        return total > 0 ? successful / total : 0;
    }
    addTimeSeriesPoint(name, value, labels) {
        if (!this.timeSeries.has(name)) {
            this.timeSeries.set(name, []);
        }
        const series = this.timeSeries.get(name);
        series.push({
            timestamp: new Date(),
            value,
            labels,
        });
        if (series.length > AgentMetricsService_1.MAX_DATA_POINTS) {
            series.shift();
        }
    }
    percentile(sortedArray, p) {
        if (sortedArray.length === 0)
            return 0;
        const index = Math.ceil((p / 100) * sortedArray.length) - 1;
        return sortedArray[Math.max(0, index)];
    }
    calculateThroughput(agentId) {
        const series = this.timeSeries.get(`agent:${agentId}:execution_time`);
        if (!series || series.length < 2)
            return 0;
        const oneMinuteAgo = Date.now() - 60000;
        const recentPoints = series.filter((p) => p.timestamp.getTime() > oneMinuteAgo);
        return recentPoints.length;
    }
    calculateClusterThroughput(cluster) {
        const agents = this.agentRegistry.getByCluster(cluster);
        let total = 0;
        for (const agent of agents) {
            total += this.calculateThroughput(agent.getConfig().id);
        }
        return total;
    }
    calculateSystemThroughput() {
        let total = 0;
        for (const agent of this.agentRegistry.getAllAgents()) {
            total += this.calculateThroughput(agent.getConfig().id);
        }
        return total;
    }
    collectAgentMetrics() {
        for (const agent of this.agentRegistry.getAllAgents()) {
            const config = agent.getConfig();
            const state = agent.getState();
            const statusValue = {
                [agent_interface_1.AgentStatus.IDLE]: 0,
                [agent_interface_1.AgentStatus.INITIALIZING]: 1,
                [agent_interface_1.AgentStatus.RUNNING]: 2,
                [agent_interface_1.AgentStatus.PAUSED]: 3,
                [agent_interface_1.AgentStatus.ERROR]: 4,
                [agent_interface_1.AgentStatus.STOPPED]: 5,
                [agent_interface_1.AgentStatus.MAINTENANCE]: 6,
            }[state.status] ?? -1;
            this.setGauge(`agent:${config.id}:status`, statusValue, {
                agentId: config.id,
                cluster: config.cluster,
            });
            this.setGauge(`agent:${config.id}:current_tasks`, state.currentTasks.length, {
                agentId: config.id,
            });
            this.setGauge(`agent:${config.id}:uptime_ms`, state.health.uptimeMs, { agentId: config.id });
            const processMemory = process.memoryUsage();
            this.setGauge(`agent:${config.id}:process_memory_mb`, Math.round((processMemory.heapUsed / 1024 / 1024) * 100) / 100, { agentId: config.id });
            const processCpu = process.cpuUsage();
            const cpuPercent = (processCpu.user + processCpu.system) / 1000;
            this.setGauge(`agent:${config.id}:cpu_estimate_ms`, Math.round(cpuPercent * 100) / 100, {
                agentId: config.id,
            });
        }
    }
    startMetricsCollection() {
        this.metricsCollectionInterval = setInterval(() => {
            this.collectAgentMetrics();
        }, AgentMetricsService_1.COLLECTION_INTERVAL_MS);
    }
    stopMetricsCollection() {
        if (this.metricsCollectionInterval) {
            clearInterval(this.metricsCollectionInterval);
            this.metricsCollectionInterval = null;
        }
    }
};
exports.AgentMetricsService = AgentMetricsService;
AgentMetricsService.MAX_DATA_POINTS = 1440;
AgentMetricsService.COLLECTION_INTERVAL_MS = 60000;
exports.AgentMetricsService = AgentMetricsService = AgentMetricsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], AgentMetricsService);
//# sourceMappingURL=agent-metrics.service.js.map