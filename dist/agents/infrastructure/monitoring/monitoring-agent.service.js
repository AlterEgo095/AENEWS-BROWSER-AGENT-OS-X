"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringAgentService = exports.MONITORING_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.MONITORING_AGENT_CONFIG = {
    id: 'infrastructure-monitoring',
    name: 'Monitoring',
    cluster: agent_interface_1.AgentCluster.INFRASTRUCTURE,
    version: '1.0.0',
    description: 'Infrastructure monitoring, alerting, and dashboards. Collects and queries metrics, manages alerts, generates dashboards, and performs service health checks across the infrastructure.',
    capabilities: [
        {
            name: 'getMetrics',
            description: 'Get infrastructure metrics for a service or resource',
            inputSchema: {
                type: 'object',
                properties: {
                    service: { type: 'string', description: 'Service name' },
                    metricType: { type: 'string', enum: ['cpu', 'memory', 'disk', 'network', 'latency', 'error_rate', 'throughput', 'all'], default: 'all' },
                    timeRange: { type: 'string', enum: ['5m', '15m', '1h', '6h', '24h', '7d'], default: '1h' },
                    granularity: { type: 'string', enum: ['1m', '5m', '15m', '1h'], default: '5m' },
                },
                required: ['service'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    service: { type: 'string' },
                    metrics: { type: 'object' },
                    dataPoints: { type: 'number' },
                },
            },
        },
        {
            name: 'createAlert',
            description: 'Create a monitoring alert rule',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    service: { type: 'string' },
                    metric: { type: 'string' },
                    condition: { type: 'string', enum: ['greater_than', 'less_than', 'equals', 'not_equals'] },
                    threshold: { type: 'number' },
                    duration: { type: 'string', description: 'Condition must persist for this duration (e.g., "5m")' },
                    severity: { type: 'string', enum: ['info', 'warning', 'critical'], default: 'warning' },
                    channels: { type: 'array', items: { type: 'string' } },
                },
                required: ['name', 'service', 'metric', 'condition', 'threshold'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    alertId: { type: 'string' },
                    name: { type: 'string' },
                    created: { type: 'boolean' },
                },
            },
        },
        {
            name: 'listAlerts',
            description: 'List monitoring alerts, optionally filtered by service or status',
            inputSchema: {
                type: 'object',
                properties: {
                    service: { type: 'string' },
                    status: { type: 'string', enum: ['active', 'acknowledged', 'resolved', 'all'], default: 'all' },
                    severity: { type: 'string', enum: ['info', 'warning', 'critical', 'all'], default: 'all' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    alerts: { type: 'array' },
                    total: { type: 'number' },
                },
            },
        },
        {
            name: 'acknowledgeAlert',
            description: 'Acknowledge an active alert',
            inputSchema: {
                type: 'object',
                properties: {
                    alertId: { type: 'string' },
                    acknowledgedBy: { type: 'string' },
                    note: { type: 'string' },
                },
                required: ['alertId', 'acknowledgedBy'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    alertId: { type: 'string' },
                    acknowledged: { type: 'boolean' },
                    acknowledgedBy: { type: 'string' },
                },
            },
        },
        {
            name: 'generateDashboard',
            description: 'Generate a monitoring dashboard configuration for a service',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    services: { type: 'array', items: { type: 'string' } },
                    metrics: { type: 'array', items: { type: 'string' } },
                    timeRange: { type: 'string', enum: ['1h', '6h', '24h', '7d'], default: '24h' },
                    refreshInterval: { type: 'string', enum: ['10s', '30s', '1m', '5m'], default: '1m' },
                },
                required: ['name', 'services'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    dashboardId: { type: 'string' },
                    name: { type: 'string' },
                    panels: { type: 'array' },
                },
            },
        },
        {
            name: 'checkServiceHealth',
            description: 'Check the health of a service or group of services',
            inputSchema: {
                type: 'object',
                properties: {
                    services: { type: 'array', items: { type: 'string' } },
                    checks: { type: 'array', items: { type: 'string', enum: ['http', 'tcp', 'dns', 'certificate'] }, default: ['http'] },
                },
                required: ['services'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    results: { type: 'array' },
                    healthyCount: { type: 'number' },
                    unhealthyCount: { type: 'number' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:metrics',
        'write:alerts',
        'read:alerts',
        'manage:dashboards',
        'check:health',
    ],
    maxConcurrentTasks: 5,
    timeout: 60000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1500,
        exponentialBackoff: true,
    },
};
let MonitoringAgentService = class MonitoringAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.alerts = new Map();
        this.dashboards = new Map();
        this.alertCounter = 0;
        this.dashboardCounter = 0;
    }
    defineConfig() {
        return exports.MONITORING_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'getMetrics',
            description: 'Get infrastructure metrics for a service',
            execute: async (params) => this.getMetrics(params),
        });
        this.registerTool({
            name: 'createAlert',
            description: 'Create a monitoring alert rule',
            execute: async (params) => this.createAlert(params),
        });
        this.registerTool({
            name: 'listAlerts',
            description: 'List monitoring alerts',
            execute: async (params) => this.listAlerts(params),
        });
        this.registerTool({
            name: 'acknowledgeAlert',
            description: 'Acknowledge an active alert',
            execute: async (params) => this.acknowledgeAlert(params),
        });
        this.registerTool({
            name: 'generateDashboard',
            description: 'Generate a monitoring dashboard',
            execute: async (params) => this.generateDashboard(params),
        });
        this.registerTool({
            name: 'checkServiceHealth',
            description: 'Check the health of services',
            execute: async (params) => this.checkServiceHealth(params),
        });
        this.seedInitialAlerts();
        await this.storeInWorkingMemory('monitoring:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Monitoring agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'getMetrics', 'createAlert', 'listAlerts', 'acknowledgeAlert',
            'generateDashboard', 'checkServiceHealth',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown monitoring action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`monitoring:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Monitoring execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.alerts.clear();
        this.dashboards.clear();
        this.alertCounter = 0;
        this.dashboardCounter = 0;
        this.logger.log('Monitoring agent destroyed, state cleared');
    }
    async getMetrics(params) {
        const { service, metricType = 'all', timeRange = '1h', granularity = '5m' } = params;
        if (!service || typeof service !== 'string') {
            throw new Error('Service name is required');
        }
        const validTypes = ['cpu', 'memory', 'disk', 'network', 'latency', 'error_rate', 'throughput', 'all'];
        if (!validTypes.includes(metricType)) {
            throw new Error(`Invalid metric type: ${metricType}. Valid: ${validTypes.join(', ')}`);
        }
        const types = metricType === 'all'
            ? ['cpu', 'memory', 'disk', 'network', 'latency', 'error_rate', 'throughput']
            : [metricType];
        const dataPointCount = this.calculateDataPointCount(timeRange, granularity);
        const metrics = types.map((type) => this.generateMetricSet(service, type, dataPointCount));
        const totalDataPoints = metrics.reduce((sum, m) => sum + m.dataPoints.length, 0);
        this.logger.log(`getMetrics: ${service}, ${metricType}, ${timeRange} → ${metrics.length} metrics, ${totalDataPoints} data points`);
        return { service, timeRange, granularity, metrics, totalDataPoints };
    }
    async createAlert(params) {
        const { name, service, metric, condition, threshold, duration = '5m', severity = 'warning', channels = ['email', 'slack'], } = params;
        if (!name || typeof name !== 'string') {
            throw new Error('Alert name is required');
        }
        if (!service || typeof service !== 'string') {
            throw new Error('Service name is required');
        }
        if (!metric || typeof metric !== 'string') {
            throw new Error('Metric name is required');
        }
        const validConditions = ['greater_than', 'less_than', 'equals', 'not_equals'];
        if (!validConditions.includes(condition)) {
            throw new Error(`Invalid condition: ${condition}. Valid: ${validConditions.join(', ')}`);
        }
        const validSeverities = ['info', 'warning', 'critical'];
        if (!validSeverities.includes(severity)) {
            throw new Error(`Invalid severity: ${severity}. Valid: ${validSeverities.join(', ')}`);
        }
        this.alertCounter++;
        const alertId = `alert-${this.alertCounter}-${Date.now()}`;
        const alert = {
            id: alertId,
            name,
            service,
            metric,
            condition,
            threshold,
            duration,
            severity: severity,
            status: 'active',
            channels,
            createdAt: new Date(),
            firedAt: new Date(),
        };
        this.alerts.set(alertId, alert);
        this.logger.log(`Created alert: ${name} [${alertId}], ${service}.${metric} ${condition} ${threshold}`);
        return {
            alertId,
            name,
            service,
            metric,
            condition,
            threshold,
            severity,
            created: true,
        };
    }
    async listAlerts(params) {
        const { service, status = 'all', severity = 'all' } = params;
        let records = Array.from(this.alerts.values());
        if (service) {
            records = records.filter((a) => a.service === service);
        }
        if (status !== 'all') {
            records = records.filter((a) => a.status === status);
        }
        if (severity !== 'all') {
            records = records.filter((a) => a.severity === severity);
        }
        const mapped = records.map((a) => ({
            id: a.id,
            name: a.name,
            service: a.service,
            metric: a.metric,
            condition: a.condition,
            threshold: a.threshold,
            severity: a.severity,
            status: a.status,
            createdAt: a.createdAt.toISOString(),
            firedAt: a.firedAt?.toISOString(),
            acknowledgedBy: a.acknowledgedBy,
        }));
        const activeCount = records.filter((a) => a.status === 'active').length;
        const acknowledgedCount = records.filter((a) => a.status === 'acknowledged').length;
        this.logger.log(`listAlerts: ${mapped.length} alerts, ${activeCount} active, ${acknowledgedCount} acknowledged`);
        return { alerts: mapped, total: mapped.length, activeCount, acknowledgedCount };
    }
    async acknowledgeAlert(params) {
        const { alertId, acknowledgedBy, note } = params;
        if (!alertId || typeof alertId !== 'string') {
            throw new Error('Alert ID is required');
        }
        if (!acknowledgedBy || typeof acknowledgedBy !== 'string') {
            throw new Error('Acknowledger name is required');
        }
        const alert = this.alerts.get(alertId);
        if (!alert) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        if (alert.status !== 'active') {
            throw new Error(`Alert ${alertId} is not active (current status: ${alert.status})`);
        }
        alert.status = 'acknowledged';
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date();
        alert.note = note;
        this.logger.log(`Acknowledged alert ${alertId} by ${acknowledgedBy}`);
        return {
            alertId,
            acknowledged: true,
            acknowledgedBy,
            acknowledgedAt: alert.acknowledgedAt.toISOString(),
            note,
        };
    }
    async generateDashboard(params) {
        const { name, services, metrics = ['cpu', 'memory', 'latency', 'error_rate'], timeRange = '24h', refreshInterval = '1m', } = params;
        if (!name || typeof name !== 'string') {
            throw new Error('Dashboard name is required');
        }
        if (!services || !Array.isArray(services) || services.length === 0) {
            throw new Error('At least one service is required');
        }
        this.dashboardCounter++;
        const dashboardId = `dashboard-${this.dashboardCounter}-${Date.now()}`;
        const panels = [];
        let panelIndex = 0;
        for (const service of services) {
            for (const metric of metrics) {
                panelIndex++;
                panels.push({
                    id: `panel-${panelIndex}`,
                    title: `${service} - ${metric}`,
                    service,
                    metric,
                    visualization: metric === 'error_rate' ? 'stat' : metric === 'latency' ? 'graph' : 'timeseries',
                    timeRange,
                    refreshInterval,
                });
            }
        }
        this.dashboards.set(dashboardId, { id: dashboardId, name, panels, createdAt: new Date() });
        this.logger.log(`Generated dashboard: ${name} [${dashboardId}], ${services.length} services, ${panels.length} panels`);
        return {
            dashboardId,
            name,
            services,
            timeRange,
            refreshInterval,
            panels,
            createdAt: new Date().toISOString(),
        };
    }
    async checkServiceHealth(params) {
        const { services, checks = ['http'] } = params;
        if (!services || !Array.isArray(services) || services.length === 0) {
            throw new Error('At least one service is required');
        }
        const validChecks = ['http', 'tcp', 'dns', 'certificate'];
        for (const check of checks) {
            if (!validChecks.includes(check)) {
                throw new Error(`Invalid check type: ${check}. Valid: ${validChecks.join(', ')}`);
            }
        }
        const results = services.map((service) => {
            const serviceChecks = checks.map((checkType) => {
                const isHealthy = Math.random() > 0.12;
                const latencyMs = Math.floor(Math.random() * 200) + 5;
                let details = '';
                switch (checkType) {
                    case 'http':
                        details = isHealthy
                            ? `HTTP 200 OK from https://${service}.example.com/health (${latencyMs}ms)`
                            : `HTTP 503 Service Unavailable from https://${service}.example.com/health (${latencyMs}ms)`;
                        break;
                    case 'tcp':
                        details = isHealthy
                            ? `TCP connection to ${service}:8080 successful (${latencyMs}ms)`
                            : `TCP connection to ${service}:8080 refused`;
                        break;
                    case 'dns':
                        details = isHealthy
                            ? `DNS resolution for ${service}.example.com: 10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
                            : `DNS resolution failed for ${service}.example.com`;
                        break;
                    case 'certificate':
                        const daysLeft = Math.floor(Math.random() * 365) + 1;
                        details = isHealthy
                            ? `Certificate valid for ${daysLeft} days (expires ${new Date(Date.now() + daysLeft * 86400000).toISOString().split('T')[0]})`
                            : 'Certificate expired or invalid';
                        break;
                }
                return {
                    type: checkType,
                    status: isHealthy ? 'pass' : 'fail',
                    latencyMs,
                    details,
                };
            });
            const healthy = serviceChecks.every((c) => c.status === 'pass');
            return {
                service,
                healthy,
                checks: serviceChecks,
                checkedAt: new Date().toISOString(),
            };
        });
        const healthyCount = results.filter((r) => r.healthy).length;
        const unhealthyCount = results.filter((r) => !r.healthy).length;
        this.logger.log(`Health check: ${services.length} services, ${healthyCount} healthy, ${unhealthyCount} unhealthy`);
        return {
            results,
            healthyCount,
            unhealthyCount,
            checkedAt: new Date().toISOString(),
        };
    }
    calculateDataPointCount(timeRange, granularity) {
        const rangeMs = { '5m': 300000, '15m': 900000, '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000 };
        const granMs = { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000 };
        const range = rangeMs[timeRange] || 3600000;
        const gran = granMs[granularity] || 300000;
        return Math.min(Math.floor(range / gran), 200);
    }
    generateMetricSet(service, metricType, dataPointCount) {
        const ranges = {
            cpu: { min: 5, max: 95, unit: 'percent' },
            memory: { min: 20, max: 90, unit: 'percent' },
            disk: { min: 10, max: 85, unit: 'percent' },
            network: { min: 100, max: 10000, unit: 'KB/s' },
            latency: { min: 1, max: 500, unit: 'ms' },
            error_rate: { min: 0, max: 5, unit: 'percent' },
            throughput: { min: 50, max: 5000, unit: 'req/s' },
        };
        const range = ranges[metricType] || { min: 0, max: 100, unit: 'unknown' };
        const baseValue = range.min + Math.random() * (range.max - range.min) * 0.5;
        const dataPoints = [];
        let currentValue = baseValue;
        for (let i = 0; i < dataPointCount; i++) {
            const delta = (Math.random() - 0.5) * (range.max - range.min) * 0.1;
            currentValue = Math.max(range.min, Math.min(range.max, currentValue + delta));
            dataPoints.push({
                timestamp: new Date(Date.now() - (dataPointCount - i) * 300000).toISOString(),
                value: Math.round(currentValue * 100) / 100,
            });
        }
        const values = dataPoints.map((dp) => dp.value);
        const current = values[values.length - 1] || 0;
        const average = values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : 0;
        const min = values.length > 0 ? Math.round(Math.min(...values) * 100) / 100 : 0;
        const max = values.length > 0 ? Math.round(Math.max(...values) * 100) / 100 : 0;
        return { metricType, unit: range.unit, current, average, min, max, dataPoints };
    }
    seedInitialAlerts() {
        const seedData = [
            { name: 'High CPU Usage', service: 'api-gateway', metric: 'cpu', condition: 'greater_than', threshold: 80, severity: 'warning' },
            { name: 'Memory Pressure', service: 'worker-service', metric: 'memory', condition: 'greater_than', threshold: 90, severity: 'critical' },
            { name: 'High Error Rate', service: 'auth-service', metric: 'error_rate', condition: 'greater_than', threshold: 5, severity: 'critical' },
        ];
        for (const data of seedData) {
            this.alertCounter++;
            const alertId = `alert-seed-${this.alertCounter}`;
            this.alerts.set(alertId, {
                id: alertId,
                name: data.name,
                service: data.service,
                metric: data.metric,
                condition: data.condition,
                threshold: data.threshold,
                duration: '5m',
                severity: data.severity,
                status: 'active',
                channels: ['email', 'slack'],
                createdAt: new Date(Date.now() - Math.random() * 3600000),
                firedAt: new Date(Date.now() - Math.random() * 1800000),
            });
        }
    }
};
exports.MonitoringAgentService = MonitoringAgentService;
exports.MonitoringAgentService = MonitoringAgentService = __decorate([
    (0, common_1.Injectable)()
], MonitoringAgentService);
//# sourceMappingURL=monitoring-agent.service.js.map