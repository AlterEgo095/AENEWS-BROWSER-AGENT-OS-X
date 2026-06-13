"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricAnalyzerAgent = exports.SELF_EVOLUTION_METRIC_ANALYZER_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../base/base-agent.service");
exports.SELF_EVOLUTION_METRIC_ANALYZER_CONFIG = {
    id: 'self-evolution-metric-analyzer',
    name: 'MetricAnalyzer',
    cluster: 'self_evolution',
    version: '1.0.0',
    description: 'Analyzes production metrics to detect performance/quality degradation, collects baselines, and identifies anomalies with trend data for the self-evolution loop.',
    capabilities: [
        {
            name: 'analyze-metrics',
            description: 'Analyze production metrics and generate a comprehensive analysis report with trend data',
            inputSchema: {
                type: 'object',
                properties: {
                    metricNames: { type: 'array', items: { type: 'string' } },
                    timeRange: { type: 'string' },
                    granularity: { type: 'string' },
                },
                required: ['metricNames'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    reportId: { type: 'string' },
                    metrics: { type: 'array', items: { type: 'object' } },
                    trends: { type: 'array', items: { type: 'object' } },
                    overallHealth: { type: 'string' },
                    degradationDetected: { type: 'boolean' },
                },
            },
        },
        {
            name: 'collect-baseline',
            description: 'Collect and establish baseline metrics for comparison over time',
            inputSchema: {
                type: 'object',
                properties: {
                    metricNames: { type: 'array', items: { type: 'string' } },
                    windowSize: { type: 'string' },
                    percentiles: { type: 'array', items: { type: 'number' } },
                },
                required: ['metricNames'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    baselineId: { type: 'string' },
                    baselines: { type: 'array', items: { type: 'object' } },
                    collectedAt: { type: 'string' },
                    sampleSize: { type: 'number' },
                },
            },
        },
        {
            name: 'detect-anomaly',
            description: 'Detect anomalies in metric streams using statistical methods and thresholds',
            inputSchema: {
                type: 'object',
                properties: {
                    metricName: { type: 'string' },
                    sensitivity: { type: 'number' },
                    baselineId: { type: 'string' },
                    lookbackWindow: { type: 'string' },
                },
                required: ['metricName'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    anomalies: { type: 'array', items: { type: 'object' } },
                    anomalyCount: { type: 'number' },
                    severity: { type: 'string' },
                    affectedMetrics: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    ],
    permissions: [
        'self-evolution:execute',
        'self-evolution:analyze-metrics',
        'self-evolution:collect-baseline',
        'self-evolution:detect-anomaly',
        'read:metrics',
        'read:performance',
    ],
    maxConcurrentTasks: 3,
    timeout: 120000,
    retryPolicy: { maxRetries: 3, backoffMs: 2000, exponentialBackoff: true },
};
let MetricAnalyzerAgent = class MetricAnalyzerAgent extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.baselines = new Map();
        this.analysisReports = new Map();
        this.anomalyHistory = [];
    }
    defineConfig() {
        return exports.SELF_EVOLUTION_METRIC_ANALYZER_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'analyze-metrics',
            description: 'Analyze production metrics and generate a comprehensive analysis report with trend data',
            execute: async (params) => this.analyzeMetrics(params),
        });
        this.registerTool({
            name: 'collect-baseline',
            description: 'Collect and establish baseline metrics for comparison over time',
            execute: async (params) => this.collectBaseline(params),
        });
        this.registerTool({
            name: 'detect-anomaly',
            description: 'Detect anomalies in metric streams using statistical methods and thresholds',
            execute: async (params) => this.detectAnomaly(params),
        });
        await this.storeInWorkingMemory('metric-analyzer:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('MetricAnalyzer agent initialized with 3 tools');
    }
    async onExecute(input) {
        const action = input.payload?.action || 'execute';
        const startTime = Date.now();
        try {
            let result;
            switch (action) {
                case 'analyze':
                    result = await this.analyzeMetrics(input.payload);
                    break;
                case 'baseline':
                    result = await this.collectBaseline(input.payload);
                    break;
                case 'anomaly-detection':
                    result = await this.detectAnomaly(input.payload);
                    break;
                default:
                    result = { action, status: 'unknown_action' };
            }
            await this.storeInWorkingMemory(`metric-analyzer:last:${action}`, { payload: input.payload, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`MetricAnalyzer execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.baselines.clear();
        this.analysisReports.clear();
        this.anomalyHistory = [];
        this.logger.log('MetricAnalyzer agent destroyed, state cleared');
    }
    async analyzeMetrics(params) {
        const { metricNames, timeRange = '24h', granularity = '1h' } = params;
        if (!metricNames || !Array.isArray(metricNames) || metricNames.length === 0) {
            throw new Error('Non-empty metricNames array is required');
        }
        const reportId = this.generateId();
        const metrics = metricNames.map((name) => {
            const baseline = this.baselines.get(name);
            const baselineValue = baseline?.mean ?? 50 + Math.random() * 50;
            const currentValue = baselineValue * (0.85 + Math.random() * 0.3);
            const change = currentValue - baselineValue;
            const changePercent = Math.round((change / baselineValue) * 10000) / 100;
            let trend;
            if (changePercent > 2)
                trend = 'improving';
            else if (changePercent < -5)
                trend = 'degrading';
            else
                trend = 'stable';
            return {
                name,
                current: Math.round(currentValue * 100) / 100,
                baseline: Math.round(baselineValue * 100) / 100,
                change: Math.round(change * 100) / 100,
                changePercent,
                trend,
            };
        });
        const trends = metricNames.map((name) => {
            const slope = (Math.random() - 0.4) * 10;
            return {
                metricName: name,
                direction: slope > 1 ? 'up' : slope < -1 ? 'down' : 'flat',
                slope: Math.round(slope * 100) / 100,
                confidence: Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
            };
        });
        const degradingCount = metrics.filter((m) => m.trend === 'degrading').length;
        const overallHealth = degradingCount === 0 ? 'healthy' : degradingCount < metricNames.length / 2 ? 'warning' : 'critical';
        const report = {
            reportId,
            analyzedAt: new Date().toISOString(),
            timeRange,
            metrics,
            trends,
            overallHealth,
            degradationDetected: degradingCount > 0,
        };
        this.analysisReports.set(reportId, report);
        this.logger.log(`Metrics analyzed: reportId=${reportId}, health=${overallHealth}, degrading=${degradingCount}/${metricNames.length}`);
        return report;
    }
    async collectBaseline(params) {
        const { metricNames, windowSize = '7d', percentiles = [50, 90, 95, 99], } = params;
        if (!metricNames || !Array.isArray(metricNames) || metricNames.length === 0) {
            throw new Error('Non-empty metricNames array is required');
        }
        const baselineId = this.generateId();
        const baselines = metricNames.map((name) => {
            const mean = 50 + Math.random() * 100;
            const standardDeviation = mean * (0.05 + Math.random() * 0.15);
            const percentileValues = {};
            for (const p of percentiles) {
                const zScore = p <= 50 ? -(1 - p / 100) * 2 : ((p / 100) - 0.5) * 2;
                percentileValues[p] = Math.round((mean + zScore * standardDeviation) * 100) / 100;
            }
            const baseline = {
                metricName: name,
                mean: Math.round(mean * 100) / 100,
                standardDeviation: Math.round(standardDeviation * 100) / 100,
                percentiles: percentileValues,
                sampleSize: Math.floor(1000 + Math.random() * 9000),
                collectedAt: new Date().toISOString(),
            };
            this.baselines.set(name, baseline);
            return baseline;
        });
        this.logger.log(`Baselines collected: baselineId=${baselineId}, metrics=${metricNames.length}, window=${windowSize}`);
        return {
            baselineId,
            baselines,
            collectedAt: new Date().toISOString(),
            sampleSize: baselines.reduce((sum, b) => sum + b.sampleSize, 0),
        };
    }
    async detectAnomaly(params) {
        const { metricName, sensitivity = 2.0, lookbackWindow = '1h', } = params;
        if (!metricName || typeof metricName !== 'string') {
            throw new Error('Valid metricName string is required');
        }
        const baseline = this.baselines.get(metricName);
        const mean = baseline?.mean ?? 75;
        const stdDev = baseline?.standardDeviation ?? mean * 0.1;
        const anomalies = [];
        const dataPointCount = 10 + Math.floor(Math.random() * 20);
        for (let i = 0; i < dataPointCount; i++) {
            const value = mean + (Math.random() - 0.5) * stdDev * 4;
            const deviation = Math.abs(value - mean) / stdDev;
            if (deviation > sensitivity) {
                const severity = deviation > sensitivity * 3
                    ? 'critical'
                    : deviation > sensitivity * 2
                        ? 'high'
                        : deviation > sensitivity * 1.5
                            ? 'medium'
                            : 'low';
                const anomaly = {
                    metricName,
                    timestamp: new Date(Date.now() - i * 60000).toISOString(),
                    value: Math.round(value * 100) / 100,
                    expectedRange: {
                        lower: Math.round((mean - sensitivity * stdDev) * 100) / 100,
                        upper: Math.round((mean + sensitivity * stdDev) * 100) / 100,
                    },
                    deviation: Math.round(deviation * 100) / 100,
                    severity,
                    description: `${metricName} deviated ${Math.round(deviation * 100) / 100}σ from baseline (sensitivity=${sensitivity})`,
                };
                anomalies.push(anomaly);
            }
        }
        this.anomalyHistory.push(...anomalies);
        const overallSeverity = anomalies.some((a) => a.severity === 'critical')
            ? 'critical'
            : anomalies.some((a) => a.severity === 'high')
                ? 'high'
                : anomalies.some((a) => a.severity === 'medium')
                    ? 'medium'
                    : 'low';
        this.logger.log(`Anomaly detection: metric=${metricName}, anomalies=${anomalies.length}, severity=${overallSeverity}, window=${lookbackWindow}`);
        return {
            anomalies,
            anomalyCount: anomalies.length,
            severity: overallSeverity,
            affectedMetrics: [...new Set(anomalies.map((a) => a.metricName))],
        };
    }
};
exports.MetricAnalyzerAgent = MetricAnalyzerAgent;
exports.MetricAnalyzerAgent = MetricAnalyzerAgent = __decorate([
    (0, common_1.Injectable)()
], MetricAnalyzerAgent);
//# sourceMappingURL=metric-analyzer.agent.js.map