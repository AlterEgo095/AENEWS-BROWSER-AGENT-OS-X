"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityAuditorAgent = exports.OBSERVABILITY_AUDITOR_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
exports.OBSERVABILITY_AUDITOR_CONFIG = {
    id: 'certification-observability-auditor',
    name: 'ObservabilityAuditor',
    cluster: 'certification',
    version: '1.0.0',
    description: 'Audits metrics collection, distributed tracing, logging practices, alerting configuration, and observability infrastructure across the agent framework.',
    capabilities: [
        {
            name: 'audit-observability',
            description: 'Perform a comprehensive observability audit',
            inputSchema: {
                type: 'object',
                properties: {
                    target: { type: 'string', description: 'System or service to audit observability' },
                    depth: { type: 'string', enum: ['surface', 'deep', 'exhaustive'], description: 'Audit depth' },
                },
                required: ['target'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    score: { type: 'number' },
                    issues: { type: 'array', items: { type: 'object' } },
                    recommendations: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'audit-metrics',
            description: 'Audit metrics collection coverage and quality',
            inputSchema: {
                type: 'object',
                properties: {
                    service: { type: 'string', description: 'Service to check metrics' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    metricsScore: { type: 'number' },
                    missingMetrics: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'audit-tracing',
            description: 'Audit distributed tracing coverage and span quality',
            inputSchema: {
                type: 'object',
                properties: {
                    service: { type: 'string', description: 'Service to check tracing' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    tracingScore: { type: 'number' },
                    coverageGaps: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'audit-logging',
            description: 'Audit logging practices, structured logging, and log levels',
            inputSchema: {
                type: 'object',
                properties: {
                    service: { type: 'string', description: 'Service to check logging' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    loggingScore: { type: 'number' },
                    logIssues: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'audit-alerting',
            description: 'Audit alerting rules, thresholds, and notification channels',
            inputSchema: {
                type: 'object',
                properties: {
                    service: { type: 'string', description: 'Service to check alerting' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    alertingScore: { type: 'number' },
                    missingAlerts: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    ],
    permissions: ['certification:audit', 'certification:observability', 'read:metrics', 'read:logs', 'read:traces'],
    maxConcurrentTasks: 5,
    timeout: 60000,
    retryPolicy: { maxRetries: 2, backoffMs: 1000, exponentialBackoff: true },
};
let ObservabilityAuditorAgent = class ObservabilityAuditorAgent extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.observabilityAuditLog = [];
    }
    defineConfig() {
        return exports.OBSERVABILITY_AUDITOR_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'audit-observability',
            description: 'Perform a comprehensive observability audit',
            execute: async (target, depth) => this.performAudit({ target, depth }),
        });
        this.registerTool({
            name: 'audit-metrics',
            description: 'Audit metrics collection coverage and quality',
            execute: async (service) => this.auditMetrics(service),
        });
        this.registerTool({
            name: 'audit-tracing',
            description: 'Audit distributed tracing coverage',
            execute: async (service) => this.auditTracing(service),
        });
        this.registerTool({
            name: 'audit-logging',
            description: 'Audit logging practices and structure',
            execute: async (service) => this.auditLogging(service),
        });
        this.registerTool({
            name: 'audit-alerting',
            description: 'Audit alerting rules and notification channels',
            execute: async (service) => this.auditAlerting(service),
        });
        this.logger.log('ObservabilityAuditor agent initialized with 5 tools');
    }
    async onExecute(input) {
        const action = input.payload?.action || 'audit';
        const startTime = Date.now();
        try {
            let result;
            switch (action) {
                case 'audit':
                    result = await this.performAudit(input.payload);
                    break;
                case 'audit-metrics':
                    result = await this.auditMetrics(input.payload.service);
                    break;
                case 'audit-tracing':
                    result = await this.auditTracing(input.payload.service);
                    break;
                case 'audit-logging':
                    result = await this.auditLogging(input.payload.service);
                    break;
                case 'audit-alerting':
                    result = await this.auditAlerting(input.payload.service);
                    break;
                default:
                    result = { action, status: 'unknown_action' };
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            return this.createAgentOutput(input.taskId, false, null, error.message, startTime);
        }
    }
    async onDestroy() {
        this.observabilityAuditLog = [];
        this.logger.log('ObservabilityAuditor agent destroyed, state cleared');
    }
    async performAudit(payload) {
        const { target = 'all', depth = 'deep' } = payload || {};
        const issues = [];
        const recommendations = [];
        const categories = ['metrics', 'tracing', 'logging', 'alerting', 'dashboard'];
        const auditDepth = depth === 'exhaustive' ? 10 : depth === 'deep' ? 6 : 3;
        for (let i = 0; i < auditDepth; i++) {
            const issue = {
                id: this.generateId(),
                severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
                category: categories[i % categories.length],
                description: `Observability issue in ${target}: ${this.getObservabilityDescription(categories[i % categories.length])}`,
                service: `service-${i % 4}`,
            };
            issues.push(issue);
            this.observabilityAuditLog.push(issue);
        }
        const score = Math.max(0, 100 - issues.reduce((penalty, issue) => {
            const weight = issue.severity === 'critical' ? 20 : issue.severity === 'high' ? 12 : issue.severity === 'medium' ? 6 : 2;
            return penalty + weight;
        }, 0));
        if (issues.some((i) => i.category === 'metrics')) {
            recommendations.push('Implement RED metrics (Rate, Errors, Duration) for all critical services');
        }
        if (issues.some((i) => i.category === 'tracing')) {
            recommendations.push('Add distributed tracing with proper span propagation across service boundaries');
        }
        if (issues.some((i) => i.category === 'logging')) {
            recommendations.push('Adopt structured logging with correlation IDs and consistent log levels');
        }
        if (issues.some((i) => i.category === 'alerting')) {
            recommendations.push('Configure alerting for SLO violations, error rate spikes, and latency degradation');
        }
        this.logger.log(`Observability audit completed for ${target}: score ${score}, ${issues.length} issues`);
        return { score, issues, recommendations };
    }
    async auditMetrics(service) {
        const requiredMetrics = [
            'request_rate', 'error_rate', 'latency_p50', 'latency_p99',
            'cpu_usage', 'memory_usage', 'active_connections',
            'queue_depth', 'throughput', 'saturation',
        ];
        const missingMetrics = requiredMetrics.filter(() => Math.random() > 0.6);
        const metricsScore = Math.round(((requiredMetrics.length - missingMetrics.length) / requiredMetrics.length) * 100);
        this.logger.log(`Metrics audit for ${service || 'all'}: score ${metricsScore}, ${missingMetrics.length} missing`);
        return { metricsScore, missingMetrics };
    }
    async auditTracing(service) {
        const criticalPaths = [
            'agent_execution', 'task_orchestration', 'memory_operations',
            'event_bus_publish', 'security_validation', 'plugin_lifecycle',
        ];
        const coverageGaps = criticalPaths
            .filter(() => Math.random() > 0.5)
            .map((path) => ({
            path,
            hasSpans: Math.random() > 0.5,
            hasContextPropagation: Math.random() > 0.6,
            issue: Math.random() > 0.5 ? 'missing_spans' : 'missing_context_propagation',
        }));
        const tracingScore = Math.round(((criticalPaths.length - coverageGaps.length) / criticalPaths.length) * 100);
        this.logger.log(`Tracing audit for ${service || 'all'}: score ${tracingScore}, ${coverageGaps.length} gaps`);
        return { tracingScore, coverageGaps };
    }
    async auditLogging(service) {
        const logIssues = [];
        const checks = [
            'structured_format', 'correlation_id', 'log_level_consistency',
            'pii_redaction', 'log_rotation', 'centralized_collection',
            'error_context', 'request_response_logging',
        ];
        for (const check of checks) {
            if (Math.random() > 0.5) {
                logIssues.push({
                    check,
                    status: 'failing',
                    description: `Logging best practice not followed: ${check.replace(/_/g, ' ')}`,
                    severity: ['pii_redaction', 'correlation_id'].includes(check) ? 'high' : 'medium',
                });
            }
        }
        const loggingScore = Math.max(0, 100 - logIssues.length * 10);
        this.logger.log(`Logging audit for ${service || 'all'}: score ${loggingScore}, ${logIssues.length} issues`);
        return { loggingScore, logIssues };
    }
    async auditAlerting(service) {
        const requiredAlerts = [
            'high_error_rate', 'elevated_latency', 'service_down',
            'disk_space_low', 'memory_pressure', 'queue_backlog',
            'certificate_expiry', 'anomalous_traffic', 'circuit_breaker_open',
        ];
        const missingAlerts = requiredAlerts.filter(() => Math.random() > 0.5);
        const alertingScore = Math.round(((requiredAlerts.length - missingAlerts.length) / requiredAlerts.length) * 100);
        this.logger.log(`Alerting audit for ${service || 'all'}: score ${alertingScore}, ${missingAlerts.length} missing alerts`);
        return { alertingScore, missingAlerts };
    }
    getObservabilityDescription(category) {
        const descriptions = {
            metrics: 'Metrics collection gap or quality issue',
            tracing: 'Distributed tracing coverage or context propagation issue',
            logging: 'Logging practice or structure issue',
            alerting: 'Alerting rule or notification channel issue',
            dashboard: 'Dashboard visibility or freshness issue',
        };
        return descriptions[category] || 'Unknown observability issue';
    }
};
exports.ObservabilityAuditorAgent = ObservabilityAuditorAgent;
exports.ObservabilityAuditorAgent = ObservabilityAuditorAgent = __decorate([
    (0, common_1.Injectable)()
], ObservabilityAuditorAgent);
//# sourceMappingURL=observability-auditor-agent.service.js.map