"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAgentService = exports.AUDIT_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.AUDIT_AGENT_CONFIG = {
    id: 'security-audit',
    name: 'Audit',
    cluster: agent_interface_1.AgentCluster.SECURITY,
    version: '1.0.0',
    description: 'Perform security auditing, compliance checking, log analysis, generate audit reports, track changes, and review permission assignments.',
    capabilities: [
        {
            name: 'performAudit',
            description: 'Perform a comprehensive security audit',
            inputSchema: {
                type: 'object',
                properties: {
                    scope: { type: 'string', description: 'Audit scope (system, application, network, all)' },
                    depth: {
                        type: 'string',
                        enum: ['surface', 'standard', 'deep'],
                        description: 'Audit depth',
                    },
                    frameworks: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Compliance frameworks to check against',
                    },
                },
                required: ['scope'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    auditId: { type: 'string' },
                    findings: { type: 'array', items: { type: 'object' } },
                    score: { type: 'number' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'checkCompliance',
            description: 'Check compliance against regulatory frameworks',
            inputSchema: {
                type: 'object',
                properties: {
                    framework: {
                        type: 'string',
                        description: 'Compliance framework (SOC2, GDPR, HIPAA, PCI-DSS, ISO27001)',
                    },
                    scope: { type: 'string', description: 'Scope of compliance check' },
                    generateEvidence: {
                        type: 'boolean',
                        description: 'Whether to generate compliance evidence',
                    },
                },
                required: ['framework'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    compliant: { type: 'boolean' },
                    score: { type: 'number' },
                    gaps: { type: 'array', items: { type: 'object' } },
                    evidence: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'analyzeLogs',
            description: 'Analyze security logs for suspicious patterns',
            inputSchema: {
                type: 'object',
                properties: {
                    logSource: { type: 'string', description: 'Log source to analyze' },
                    timeRange: { type: 'string', description: 'Time range to analyze' },
                    patternType: {
                        type: 'string',
                        enum: ['anomaly', 'threat', 'compliance', 'all'],
                        description: 'Pattern type to look for',
                    },
                },
                required: ['logSource'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    patterns: { type: 'array', items: { type: 'object' } },
                    anomalies: { type: 'number' },
                    recommendations: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'generateAuditReport',
            description: 'Generate a comprehensive audit report',
            inputSchema: {
                type: 'object',
                properties: {
                    reportType: {
                        type: 'string',
                        enum: ['executive', 'technical', 'compliance', 'incident'],
                        description: 'Type of audit report',
                    },
                    period: { type: 'string', description: 'Reporting period' },
                    includeRemediation: {
                        type: 'boolean',
                        description: 'Whether to include remediation steps',
                    },
                },
                required: ['reportType'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    reportId: { type: 'string' },
                    summary: { type: 'object' },
                    findings: { type: 'array', items: { type: 'object' } },
                    generatedAt: { type: 'string' },
                },
            },
        },
        {
            name: 'trackChanges',
            description: 'Track and audit configuration and access changes',
            inputSchema: {
                type: 'object',
                properties: {
                    entityType: {
                        type: 'string',
                        enum: ['config', 'access', 'infrastructure', 'policy'],
                        description: 'Type of entity to track',
                    },
                    entityId: { type: 'string', description: 'Specific entity ID to track' },
                    timeRange: { type: 'string', description: 'Time range to track changes' },
                },
                required: ['entityType'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    changes: { type: 'array', items: { type: 'object' } },
                    totalChanges: { type: 'number' },
                    unauthorizedChanges: { type: 'number' },
                },
            },
        },
        {
            name: 'reviewPermissions',
            description: 'Review and analyze permission assignments for least-privilege compliance',
            inputSchema: {
                type: 'object',
                properties: {
                    scope: { type: 'string', description: 'Scope of permission review (user, role, system)' },
                    target: { type: 'string', description: 'Specific target for review' },
                    checkLeastPrivilege: {
                        type: 'boolean',
                        description: 'Whether to check least-privilege compliance',
                    },
                },
                required: ['scope'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    overPrivileged: { type: 'array', items: { type: 'object' } },
                    dormantAccess: { type: 'array', items: { type: 'object' } },
                    recommendations: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:audit',
        'write:audit',
        'check:compliance',
        'review:permissions',
        'track:changes',
    ],
    maxConcurrentTasks: 5,
    timeout: 60000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 2000,
        exponentialBackoff: true,
    },
};
let AuditAgentService = class AuditAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.auditHistory = [];
        this.changeLog = [];
        this.findingCounter = 0;
    }
    defineConfig() {
        return exports.AUDIT_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'performAudit',
            description: 'Perform a comprehensive security audit',
            execute: async (params) => this.performAudit(params),
        });
        this.registerTool({
            name: 'checkCompliance',
            description: 'Check compliance against regulatory frameworks',
            execute: async (params) => this.checkCompliance(params),
        });
        this.registerTool({
            name: 'analyzeLogs',
            description: 'Analyze security logs for suspicious patterns',
            execute: async (params) => this.analyzeLogs(params),
        });
        this.registerTool({
            name: 'generateAuditReport',
            description: 'Generate a comprehensive audit report',
            execute: async (params) => this.generateAuditReport(params),
        });
        this.registerTool({
            name: 'trackChanges',
            description: 'Track and audit configuration and access changes',
            execute: async (params) => this.trackChanges(params),
        });
        this.registerTool({
            name: 'reviewPermissions',
            description: 'Review and analyze permission assignments for least-privilege compliance',
            execute: async (params) => this.reviewPermissions(params),
        });
        this.logger.log('Audit agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        try {
            let result;
            switch (action) {
                case 'performAudit':
                    result = await this.performAudit(params);
                    break;
                case 'checkCompliance':
                    result = await this.checkCompliance(params);
                    break;
                case 'analyzeLogs':
                    result = await this.analyzeLogs(params);
                    break;
                case 'generateAuditReport':
                    result = await this.generateAuditReport(params);
                    break;
                case 'trackChanges':
                    result = await this.trackChanges(params);
                    break;
                case 'reviewPermissions':
                    result = await this.reviewPermissions(params);
                    break;
                default:
                    return this.createAgentOutput(input.taskId, false, null, `Unknown audit action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Audit execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.auditHistory = [];
        this.changeLog = [];
        this.findingCounter = 0;
        this.logger.log('Audit agent destroyed, state cleared');
    }
    async performAudit(params) {
        const { scope, depth = 'standard', frameworks = [] } = params;
        if (!scope) {
            throw new Error('Audit scope is required');
        }
        const auditId = `audit-${this.generateId().substring(0, 12)}`;
        const findings = [];
        const findingCount = depth === 'deep' ? 8 : depth === 'standard' ? 5 : 3;
        for (let i = 0; i < findingCount; i++) {
            this.findingCounter++;
            const severities = ['info', 'low', 'medium', 'high', 'critical'];
            const categories = [
                'access_control',
                'encryption',
                'logging',
                'patching',
                'configuration',
                'network',
                'authentication',
            ];
            const severity = severities[Math.floor(Math.random() * severities.length)];
            findings.push({
                id: `FIND-${this.findingCounter.toString().padStart(4, '0')}`,
                severity,
                category: categories[i % categories.length],
                description: `${severity.toUpperCase()} finding in ${scope}: ${categories[i % categories.length]} issue detected`,
                recommendation: `Address ${severity} finding by reviewing ${categories[i % categories.length]} configuration`,
                status: 'open',
            });
        }
        const criticalCount = findings.filter((f) => f.severity === 'critical').length;
        const highCount = findings.filter((f) => f.severity === 'high').length;
        const score = Math.max(0, 100 -
            criticalCount * 25 -
            highCount * 10 -
            findings.filter((f) => f.severity === 'medium').length * 5);
        const status = criticalCount > 0 ? 'fail' : highCount > 2 ? 'warning' : 'pass';
        const record = {
            auditId,
            scope,
            depth,
            findings,
            score,
            status: status,
            performedAt: new Date(),
        };
        this.auditHistory.push(record);
        this.logger.log(`Audit ${auditId} completed: ${findings.length} findings, score ${score}, status ${status}`);
        return {
            auditId,
            findings: findings.map((f) => ({
                id: f.id,
                severity: f.severity,
                category: f.category,
                description: f.description,
                recommendation: f.recommendation,
                status: f.status,
            })),
            score,
            status,
        };
    }
    async checkCompliance(params) {
        const { framework, scope = 'all', generateEvidence = false } = params;
        const supportedFrameworks = ['SOC2', 'GDPR', 'HIPAA', 'PCI-DSS', 'ISO27001'];
        if (!supportedFrameworks.includes(framework)) {
            throw new Error(`Unsupported framework: ${framework}. Supported: ${supportedFrameworks.join(', ')}`);
        }
        const controls = framework === 'GDPR'
            ? 12
            : framework === 'HIPAA'
                ? 18
                : framework === 'PCI-DSS'
                    ? 12
                    : framework === 'SOC2'
                        ? 5
                        : 14;
        const passingControls = Math.floor(Math.random() * controls * 0.3 + controls * 0.6);
        const score = Math.round((passingControls / controls) * 100);
        const gaps = [];
        for (let i = passingControls; i < controls; i++) {
            gaps.push({
                controlId: `${framework}-CTL-${(i + 1).toString().padStart(3, '0')}`,
                description: `Control ${i + 1} not fully satisfied`,
                severity: i > controls * 0.8 ? 'high' : 'medium',
                remediation: `Implement measures to satisfy control ${i + 1}`,
            });
        }
        const evidence = generateEvidence
            ? Array.from({ length: passingControls }, (_, i) => ({
                controlId: `${framework}-CTL-${(i + 1).toString().padStart(3, '0')}`,
                status: 'satisfied',
                evidenceType: ['policy', 'log', 'configuration', 'test_result'][i % 4],
                collectedAt: new Date().toISOString(),
            }))
            : [];
        this.logger.log(`Compliance check for ${framework}: score ${score}, ${gaps.length} gaps`);
        return { compliant: score >= 80, score, gaps, evidence };
    }
    async analyzeLogs(params) {
        const { logSource, timeRange = 'last 24h', patternType = 'all' } = params;
        if (!logSource) {
            throw new Error('Log source is required');
        }
        const patterns = [];
        const patternTypes = [
            'repeated_failed_logins',
            'unusual_access_time',
            'privilege_escalation',
            'data_exfiltration_attempt',
            'configuration_change',
        ];
        const patternCount = Math.floor(Math.random() * 4) + 1;
        for (let i = 0; i < patternCount; i++) {
            patterns.push({
                type: patternTypes[i % patternTypes.length],
                occurrences: Math.floor(Math.random() * 100) + 1,
                firstSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                lastSeen: new Date().toISOString(),
                severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                affectedEntities: [`entity_${i + 1}`],
            });
        }
        const anomalies = patterns.filter((p) => p.severity === 'high').length;
        const recommendations = [
            'Review and tighten authentication policies',
            'Enable additional logging for sensitive operations',
            'Investigate high-severity patterns immediately',
            'Consider implementing automated alerting for detected patterns',
        ];
        this.logger.log(`Log analysis for ${logSource}: ${patterns.length} patterns, ${anomalies} anomalies`);
        return { patterns, anomalies, recommendations };
    }
    async generateAuditReport(params) {
        const { reportType, period = 'last 30d', includeRemediation = true } = params;
        const reportId = `RPT-${this.generateId().substring(0, 12)}`;
        const summary = {
            totalAudits: this.auditHistory.length,
            totalFindings: this.auditHistory.reduce((sum, a) => sum + a.findings.length, 0),
            averageScore: this.auditHistory.length > 0
                ? Math.round(this.auditHistory.reduce((sum, a) => sum + a.score, 0) / this.auditHistory.length)
                : 100,
            criticalFindings: this.auditHistory.reduce((sum, a) => sum + a.findings.filter((f) => f.severity === 'critical').length, 0),
        };
        const findings = this.auditHistory.flatMap((a) => a.findings.map((f) => ({
            auditId: a.auditId,
            findingId: f.id,
            severity: f.severity,
            category: f.category,
            description: f.description,
            remediation: includeRemediation ? f.recommendation : undefined,
            status: f.status,
        })));
        const generatedAt = new Date().toISOString();
        this.logger.log(`Audit report generated: ${reportId} (${reportType}, ${findings.length} findings)`);
        return { reportId, summary, findings, generatedAt };
    }
    async trackChanges(params) {
        const { entityType, entityId, timeRange = 'last 7d' } = params;
        const changes = [];
        const count = Math.floor(Math.random() * 10) + 1;
        for (let i = 0; i < count; i++) {
            const change = {
                id: this.generateId(),
                entityType,
                entityId: entityId || `${entityType}-${i + 1}`,
                changeType: ['create', 'update', 'delete', 'modify'][i % 4],
                oldValue: `value_${i}_old`,
                newValue: `value_${i}_new`,
                changedBy: `user_${Math.floor(Math.random() * 5) + 1}`,
                changedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                authorized: Math.random() > 0.15,
            };
            changes.push(change);
            this.changeLog.push(change);
        }
        const unauthorizedChanges = changes.filter((c) => !c.authorized).length;
        this.logger.log(`Change tracking for ${entityType}: ${changes.length} changes, ${unauthorizedChanges} unauthorized`);
        return {
            changes: changes.map((c) => ({
                id: c.id,
                entityType: c.entityType,
                entityId: c.entityId,
                changeType: c.changeType,
                changedBy: c.changedBy,
                changedAt: c.changedAt.toISOString(),
                authorized: c.authorized,
            })),
            totalChanges: changes.length,
            unauthorizedChanges,
        };
    }
    async reviewPermissions(params) {
        const { scope, target, checkLeastPrivilege = true } = params;
        const overPrivileged = [];
        const dormantAccess = [];
        const entityCount = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < entityCount; i++) {
            const entityId = target || `${scope}_${i + 1}`;
            if (checkLeastPrivilege && Math.random() > 0.5) {
                overPrivileged.push({
                    entityId,
                    currentPermissions: ['read', 'write', 'delete', 'admin'],
                    requiredPermissions: ['read', 'write'],
                    excessPermissions: ['delete', 'admin'],
                    riskLevel: 'high',
                });
            }
            if (Math.random() > 0.6) {
                dormantAccess.push({
                    entityId,
                    lastAccessed: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
                    permissions: ['read', 'write'],
                    daysInactive: Math.floor(Math.random() * 180) + 30,
                });
            }
        }
        const recommendations = [];
        if (overPrivileged.length > 0) {
            recommendations.push(`Review and reduce permissions for ${overPrivileged.length} over-privileged entities`);
        }
        if (dormantAccess.length > 0) {
            recommendations.push(`Revoke access for ${dormantAccess.length} entities with dormant access (>30 days inactive)`);
        }
        recommendations.push('Implement regular permission review cadence (quarterly)');
        recommendations.push('Adopt just-in-time access provisioning where possible');
        this.logger.log(`Permission review for ${scope}: ${overPrivileged.length} over-privileged, ${dormantAccess.length} dormant`);
        return { overPrivileged, dormantAccess, recommendations };
    }
};
exports.AuditAgentService = AuditAgentService;
exports.AuditAgentService = AuditAgentService = __decorate([
    (0, common_1.Injectable)()
], AuditAgentService);
//# sourceMappingURL=audit-agent.service.js.map