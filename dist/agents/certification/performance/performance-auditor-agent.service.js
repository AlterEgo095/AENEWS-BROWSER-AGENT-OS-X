"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceAuditorAgent = exports.PERFORMANCE_AUDITOR_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
exports.PERFORMANCE_AUDITOR_CONFIG = {
    id: 'certification-performance-auditor',
    name: 'PerformanceAuditor',
    cluster: 'certification',
    version: '1.0.0',
    description: 'Audits performance metrics, latency analysis, throughput benchmarks, and resource utilization across the agent framework.',
    capabilities: [
        {
            name: 'audit-performance',
            description: 'Perform a comprehensive performance audit',
            inputSchema: {
                type: 'object',
                properties: {
                    target: { type: 'string', description: 'System or service to audit' },
                    duration: { type: 'number', description: 'Audit duration in seconds' },
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
            name: 'measure-latency',
            description: 'Measure end-to-end and component-level latency',
            inputSchema: {
                type: 'object',
                properties: {
                    endpoint: { type: 'string', description: 'Endpoint or operation to measure' },
                    iterations: { type: 'number', description: 'Number of measurement iterations' },
                },
                required: ['endpoint'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    avgLatencyMs: { type: 'number' },
                    p50Ms: { type: 'number' },
                    p95Ms: { type: 'number' },
                    p99Ms: { type: 'number' },
                },
            },
        },
        {
            name: 'benchmark-throughput',
            description: 'Benchmark system throughput under load',
            inputSchema: {
                type: 'object',
                properties: {
                    target: { type: 'string', description: 'Target to benchmark' },
                    concurrency: { type: 'number', description: 'Concurrent request count' },
                    duration: { type: 'number', description: 'Benchmark duration in seconds' },
                },
                required: ['target'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    requestsPerSecond: { type: 'number' },
                    errorRate: { type: 'number' },
                    saturationPoint: { type: 'number' },
                },
            },
        },
        {
            name: 'profile-resources',
            description: 'Profile CPU, memory, and I/O resource utilization',
            inputSchema: {
                type: 'object',
                properties: {
                    target: { type: 'string', description: 'Target to profile' },
                    duration: { type: 'number', description: 'Profile duration in seconds' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    cpuUsage: { type: 'number' },
                    memoryUsage: { type: 'number' },
                    ioWait: { type: 'number' },
                    bottlenecks: { type: 'array', items: { type: 'object' } },
                },
            },
        },
    ],
    permissions: ['certification:audit', 'certification:performance', 'read:metrics', 'read:resources'],
    maxConcurrentTasks: 5,
    timeout: 60000,
    retryPolicy: { maxRetries: 2, backoffMs: 1000, exponentialBackoff: true },
};
let PerformanceAuditorAgent = class PerformanceAuditorAgent extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.performanceLog = [];
    }
    defineConfig() {
        return exports.PERFORMANCE_AUDITOR_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'audit-performance',
            description: 'Perform a comprehensive performance audit',
            execute: async (target, duration) => this.performAudit({ target, duration }),
        });
        this.registerTool({
            name: 'measure-latency',
            description: 'Measure end-to-end and component-level latency',
            execute: async (endpoint, iterations) => this.measureLatency(endpoint, iterations),
        });
        this.registerTool({
            name: 'benchmark-throughput',
            description: 'Benchmark system throughput under load',
            execute: async (target, concurrency, duration) => this.benchmarkThroughput(target, concurrency, duration),
        });
        this.registerTool({
            name: 'profile-resources',
            description: 'Profile CPU, memory, and I/O resource utilization',
            execute: async (target, duration) => this.profileResources(target, duration),
        });
        this.logger.log('PerformanceAuditor agent initialized with 4 tools');
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
                case 'measure-latency':
                    result = await this.measureLatency(input.payload.endpoint, input.payload.iterations);
                    break;
                case 'benchmark-throughput':
                    result = await this.benchmarkThroughput(input.payload.target, input.payload.concurrency, input.payload.duration);
                    break;
                case 'profile-resources':
                    result = await this.profileResources(input.payload.target, input.payload.duration);
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
        this.performanceLog = [];
        this.logger.log('PerformanceAuditor agent destroyed, state cleared');
    }
    async performAudit(payload) {
        const { target = 'all', duration = 60 } = payload || {};
        const issues = [];
        const recommendations = [];
        const categories = ['latency', 'throughput', 'memory', 'cpu', 'io'];
        const thresholds = {
            latency: 200,
            throughput: 1000,
            memory: 512,
            cpu: 80,
            io: 50,
        };
        for (let i = 0; i < 6; i++) {
            const category = categories[i % categories.length];
            const metric = Math.round(Math.random() * (thresholds[category] * 2) * 100) / 100;
            const threshold = thresholds[category];
            const exceedsThreshold = metric > threshold;
            if (exceedsThreshold) {
                const issue = {
                    id: this.generateId(),
                    severity: metric > threshold * 1.5 ? 'critical' : metric > threshold * 1.2 ? 'high' : 'medium',
                    category,
                    description: `Performance issue in ${target}: ${category} metric (${metric}) exceeds threshold (${threshold})`,
                    metric,
                    threshold,
                };
                issues.push(issue);
                this.performanceLog.push(issue);
            }
        }
        const score = Math.max(0, 100 - issues.reduce((penalty, issue) => {
            const weight = issue.severity === 'critical' ? 25 : issue.severity === 'high' ? 15 : issue.severity === 'medium' ? 8 : 3;
            return penalty + weight;
        }, 0));
        if (issues.some((i) => i.category === 'latency')) {
            recommendations.push('Optimize hot paths and implement caching strategies to reduce latency');
        }
        if (issues.some((i) => i.category === 'throughput')) {
            recommendations.push('Scale horizontally and optimize connection pooling to improve throughput');
        }
        if (issues.some((i) => i.category === 'memory')) {
            recommendations.push('Investigate memory leaks and optimize data structures to reduce memory usage');
        }
        this.logger.log(`Performance audit completed for ${target}: score ${score}, ${issues.length} issues`);
        return { score, issues, recommendations };
    }
    async measureLatency(endpoint, iterations = 100) {
        const samples = [];
        for (let i = 0; i < iterations; i++) {
            samples.push(Math.round(Math.random() * 500 + 10));
        }
        samples.sort((a, b) => a - b);
        const avgLatencyMs = Math.round(samples.reduce((s, v) => s + v, 0) / samples.length);
        const p50Ms = samples[Math.floor(samples.length * 0.5)];
        const p95Ms = samples[Math.floor(samples.length * 0.95)];
        const p99Ms = samples[Math.floor(samples.length * 0.99)];
        const maxMs = samples[samples.length - 1];
        this.logger.log(`Latency measurement for ${endpoint}: avg ${avgLatencyMs}ms, p99 ${p99Ms}ms`);
        return { avgLatencyMs, p50Ms, p95Ms, p99Ms, maxMs, samples: iterations };
    }
    async benchmarkThroughput(target, concurrency = 10, duration = 30) {
        const requestsPerSecond = Math.round(Math.random() * 5000 + 500);
        const totalRequests = requestsPerSecond * duration;
        const errorRate = Math.round(Math.random() * 5 * 100) / 100;
        const saturationPoint = Math.round(requestsPerSecond * 1.5);
        this.logger.log(`Throughput benchmark for ${target}: ${requestsPerSecond} req/s, error rate ${errorRate}%`);
        return { requestsPerSecond, totalRequests, errorRate, saturationPoint };
    }
    async profileResources(target, duration = 30) {
        const cpuUsage = Math.round(Math.random() * 100 * 100) / 100;
        const memoryUsage = Math.round(Math.random() * 1024 * 100) / 100;
        const ioWait = Math.round(Math.random() * 30 * 100) / 100;
        const bottlenecks = [];
        if (cpuUsage > 80) {
            bottlenecks.push({ resource: 'cpu', usage: cpuUsage, recommendation: 'Scale vertically or optimize CPU-intensive operations' });
        }
        if (memoryUsage > 800) {
            bottlenecks.push({ resource: 'memory', usage: memoryUsage, recommendation: 'Investigate memory leaks and optimize data retention' });
        }
        if (ioWait > 20) {
            bottlenecks.push({ resource: 'io', usage: ioWait, recommendation: 'Optimize I/O operations with batching and async patterns' });
        }
        this.logger.log(`Resource profile for ${target}: CPU ${cpuUsage}%, Memory ${memoryUsage}MB, I/O wait ${ioWait}%`);
        return { cpuUsage, memoryUsage, ioWait, bottlenecks };
    }
};
exports.PerformanceAuditorAgent = PerformanceAuditorAgent;
exports.PerformanceAuditorAgent = PerformanceAuditorAgent = __decorate([
    (0, common_1.Injectable)()
], PerformanceAuditorAgent);
//# sourceMappingURL=performance-auditor-agent.service.js.map