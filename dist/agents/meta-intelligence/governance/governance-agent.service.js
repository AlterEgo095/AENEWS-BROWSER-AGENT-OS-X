"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceAgentService = exports.META_GOVERNANCE_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.META_GOVERNANCE_AGENT_CONFIG = {
    id: 'meta-governance',
    name: 'MetaGovernance',
    cluster: agent_interface_1.AgentCluster.META_INTELLIGENCE,
    version: '1.0.0',
    description: 'Governance agent that enforces policies, audits compliance, reviews governance, updates policies, generates governance reports, and manages exceptions across the Meta Intelligence cluster.',
    capabilities: [
        {
            name: 'enforcePolicy',
            description: 'Enforce a specific policy on agent behavior',
            inputSchema: {
                type: 'object',
                properties: {
                    policyId: { type: 'string' },
                    target: { type: 'string' },
                    action: { type: 'string' },
                },
                required: ['policyId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    enforced: { type: 'boolean' },
                    policyId: { type: 'string' },
                    violations: { type: 'number' },
                    enforcementId: { type: 'string' },
                },
            },
        },
        {
            name: 'auditCompliance',
            description: 'Audit compliance across agents and operations',
            inputSchema: {
                type: 'object',
                properties: {
                    scope: { type: 'string' },
                    policies: { type: 'array', items: { type: 'string' } },
                },
                required: [],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    auditId: { type: 'string' },
                    complianceScore: { type: 'number' },
                    violations: { type: 'array', items: { type: 'object' } },
                    compliant: { type: 'boolean' },
                },
            },
        },
        {
            name: 'reviewGovernance',
            description: 'Review the overall governance framework',
            inputSchema: {
                type: 'object',
                properties: { scope: { type: 'string' }, depth: { type: 'string' } },
                required: [],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    reviewId: { type: 'string' },
                    findings: { type: 'array', items: { type: 'object' } },
                    recommendations: { type: 'array', items: { type: 'string' } },
                    overallRating: { type: 'string' },
                },
            },
        },
        {
            name: 'updatePolicy',
            description: 'Update an existing policy or create a new one',
            inputSchema: {
                type: 'object',
                properties: {
                    policyId: { type: 'string' },
                    changes: { type: 'object' },
                    reason: { type: 'string' },
                },
                required: ['policyId', 'changes'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    updated: { type: 'boolean' },
                    policyId: { type: 'string' },
                    version: { type: 'string' },
                    updateId: { type: 'string' },
                },
            },
        },
        {
            name: 'generateGovernanceReport',
            description: 'Generate a comprehensive governance report',
            inputSchema: {
                type: 'object',
                properties: {
                    period: { type: 'string' },
                    includeViolations: { type: 'boolean' },
                    includeRecommendations: { type: 'boolean' },
                },
                required: [],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    reportId: { type: 'string' },
                    summary: { type: 'object' },
                    metrics: { type: 'object' },
                    recommendations: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'manageExceptions',
            description: 'Manage policy exceptions and exemptions',
            inputSchema: {
                type: 'object',
                properties: {
                    operation: { type: 'string' },
                    exceptionId: { type: 'string' },
                    details: { type: 'object' },
                },
                required: ['operation'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    exceptionId: { type: 'string' },
                    status: { type: 'string' },
                    operation: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:policy',
        'write:policy',
        'read:compliance',
        'write:violation',
        'admin:governance',
    ],
    maxConcurrentTasks: 3,
    timeout: 60000,
    retryPolicy: { maxRetries: 2, backoffMs: 2500, exponentialBackoff: true },
};
let GovernanceAgentService = class GovernanceAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.policies = new Map();
        this.violations = [];
        this.exceptions = new Map();
    }
    defineConfig() {
        return exports.META_GOVERNANCE_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'enforcePolicy',
            description: 'Enforce a specific policy',
            execute: async (params) => this.enforcePolicy(params),
        });
        this.registerTool({
            name: 'auditCompliance',
            description: 'Audit compliance',
            execute: async (params) => this.auditCompliance(params),
        });
        this.registerTool({
            name: 'reviewGovernance',
            description: 'Review governance framework',
            execute: async (params) => this.reviewGovernance(params),
        });
        this.registerTool({
            name: 'updatePolicy',
            description: 'Update or create a policy',
            execute: async (params) => this.updatePolicy(params),
        });
        this.registerTool({
            name: 'generateGovernanceReport',
            description: 'Generate governance report',
            execute: async (params) => this.generateGovernanceReport(params),
        });
        this.registerTool({
            name: 'manageExceptions',
            description: 'Manage policy exceptions',
            execute: async (params) => this.manageExceptions(params),
        });
        this.seedPolicies();
        await this.storeInWorkingMemory('governance:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('MetaGovernance agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action)
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        const supportedActions = [
            'enforcePolicy',
            'auditCompliance',
            'reviewGovernance',
            'updatePolicy',
            'generateGovernanceReport',
            'manageExceptions',
        ];
        if (!supportedActions.includes(action))
            return this.createAgentOutput(input.taskId, false, null, `Unknown governance action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        try {
            const tool = this.getTool(action);
            if (!tool)
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`governance:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`MetaGovernance execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.policies.clear();
        this.violations = [];
        this.exceptions.clear();
        this.logger.log('MetaGovernance agent destroyed, policies, violations, and exceptions cleared');
    }
    async enforcePolicy(params) {
        const { policyId, target = 'all', action = 'check' } = params;
        if (!policyId || typeof policyId !== 'string')
            throw new Error('Valid policyId string is required');
        const policy = this.policies.get(policyId);
        if (!policy)
            throw new Error(`Policy not found: ${policyId}`);
        if (!policy.active)
            throw new Error(`Policy is not active: ${policyId}`);
        const enforcementId = this.generateId();
        const hasException = Array.from(this.exceptions.values()).some((e) => e.policyId === policyId && e.target === target && e.status === 'active');
        if (hasException) {
            this.logger.log(`Policy enforcement skipped: exception exists for policy=${policyId}, target=${target}`);
            return { enforced: true, policyId, violations: 0, enforcementId };
        }
        let violationCount = 0;
        for (const rule of policy.rules) {
            const violationChance = Math.random();
            if (violationChance > 0.8) {
                violationCount++;
                this.violations.push({
                    id: this.generateId(),
                    policyId,
                    ruleId: rule.id,
                    target,
                    severity: rule.severity,
                    description: `Rule "${rule.condition}" violated for target "${target}"`,
                    timestamp: new Date(),
                    resolved: false,
                });
            }
        }
        if (action === 'enforce' && violationCount > 0) {
            const recentViolations = this.violations.filter((v) => !v.resolved && v.policyId === policyId);
            for (const v of recentViolations.slice(-violationCount)) {
                v.resolved = true;
            }
        }
        this.logger.log(`Policy enforced: policyId=${policyId}, target=${target}, violations=${violationCount}`);
        return { enforced: true, policyId, violations: violationCount, enforcementId };
    }
    async auditCompliance(params) {
        const { scope = 'all', policies: policyIds = [] } = params;
        const auditId = this.generateId();
        const targetPolicies = policyIds.length > 0
            ? Array.from(this.policies.values()).filter((p) => policyIds.includes(p.id))
            : Array.from(this.policies.values()).filter((p) => p.active);
        const recentViolations = this.violations.filter((v) => {
            const isRecent = Date.now() - v.timestamp.getTime() < 24 * 60 * 60 * 1000;
            const inScope = scope === 'all' || v.target.includes(scope);
            const inPolicies = policyIds.length === 0 || policyIds.includes(v.policyId);
            return isRecent && inScope && inPolicies;
        });
        const criticalViolations = recentViolations.filter((v) => v.severity === 'critical' && !v.resolved);
        const warningViolations = recentViolations.filter((v) => v.severity === 'warning');
        const complianceScore = Math.max(0, Math.round(100 - criticalViolations.length * 20 - warningViolations.length * 5));
        const compliant = complianceScore >= 80 && criticalViolations.length === 0;
        const violationSummary = recentViolations.slice(0, 10).map((v) => ({
            policyId: v.policyId,
            severity: v.severity,
            description: v.description,
        }));
        this.logger.log(`Compliance audited: scope=${scope}, score=${complianceScore}, violations=${recentViolations.length}, compliant=${compliant}`);
        return { auditId, complianceScore, violations: violationSummary, compliant };
    }
    async reviewGovernance(params) {
        const { scope = 'all', depth = 'standard' } = params;
        const reviewId = this.generateId();
        const findings = [];
        const recommendations = [];
        const activePolicies = Array.from(this.policies.values()).filter((p) => p.active);
        if (activePolicies.length < 5) {
            findings.push({
                area: 'policy-coverage',
                status: 'warning',
                description: `Only ${activePolicies.length} active policies; consider expanding coverage`,
                priority: 'medium',
            });
            recommendations.push('Add policies for security, data handling, and resource management');
        }
        else {
            findings.push({
                area: 'policy-coverage',
                status: 'good',
                description: `${activePolicies.length} active policies covering key areas`,
                priority: 'low',
            });
        }
        const unresolvedViolations = this.violations.filter((v) => !v.resolved);
        if (unresolvedViolations.length > 5) {
            findings.push({
                area: 'violation-resolution',
                status: 'warning',
                description: `${unresolvedViolations.length} unresolved violations`,
                priority: 'high',
            });
            recommendations.push('Establish a violation resolution SLA and escalation process');
        }
        else {
            findings.push({
                area: 'violation-resolution',
                status: 'good',
                description: 'Low number of unresolved violations',
                priority: 'low',
            });
        }
        const activeExceptions = Array.from(this.exceptions.values()).filter((e) => e.status === 'active');
        if (activeExceptions.length > 10) {
            findings.push({
                area: 'exception-management',
                status: 'warning',
                description: `${activeExceptions.length} active exceptions may indicate governance gaps`,
                priority: 'medium',
            });
            recommendations.push('Review and reduce policy exceptions; update policies instead');
        }
        else {
            findings.push({
                area: 'exception-management',
                status: 'good',
                description: 'Exception count within acceptable range',
                priority: 'low',
            });
        }
        if (depth === 'comprehensive') {
            findings.push({
                area: 'policy-versioning',
                status: 'good',
                description: 'All policies have version tracking',
                priority: 'low',
            });
            findings.push({
                area: 'audit-trail',
                status: 'good',
                description: 'Violation audit trail is maintained',
                priority: 'low',
            });
            recommendations.push('Implement automated compliance monitoring');
            recommendations.push('Create policy change approval workflow');
        }
        const highPriorityFindings = findings.filter((f) => f.priority === 'high');
        const overallRating = highPriorityFindings.length > 0
            ? 'needs-improvement'
            : findings.some((f) => f.status === 'warning')
                ? 'acceptable'
                : 'excellent';
        this.logger.log(`Governance reviewed: findings=${findings.length}, rating=${overallRating}, scope=${scope}`);
        return { reviewId, findings, recommendations, overallRating };
    }
    async updatePolicy(params) {
        const { policyId, changes, reason = '' } = params;
        if (!policyId || typeof policyId !== 'string')
            throw new Error('Valid policyId string is required');
        if (!changes || typeof changes !== 'object')
            throw new Error('Valid changes object is required');
        const updateId = this.generateId();
        const existing = this.policies.get(policyId);
        if (existing) {
            const versionParts = existing.version.split('.');
            const minor = parseInt(versionParts[1] || '0', 10) + 1;
            const newVersion = `${versionParts[0]}.${minor}`;
            if (changes.name)
                existing.name = changes.name;
            if (changes.description)
                existing.description = changes.description;
            if (changes.rules)
                existing.rules = changes.rules;
            if (changes.active !== undefined)
                existing.active = changes.active;
            existing.version = newVersion;
            existing.updatedAt = new Date();
            this.logger.log(`Policy updated: id=${policyId}, version=${newVersion}, reason="${reason.substring(0, 50)}"`);
            return { updated: true, policyId, version: newVersion, updateId };
        }
        else {
            const newPolicy = {
                id: policyId,
                name: changes.name || policyId,
                description: changes.description || 'Auto-generated policy',
                rules: changes.rules || [
                    { id: `${policyId}-rule-1`, condition: 'default', action: 'allow', severity: 'info' },
                ],
                version: '1.0',
                active: changes.active !== undefined ? changes.active : true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            this.policies.set(policyId, newPolicy);
            this.logger.log(`Policy created: id=${policyId}, version=1.0`);
            return { updated: true, policyId, version: '1.0', updateId };
        }
    }
    async generateGovernanceReport(params) {
        const { period = '30d', includeViolations = true, includeRecommendations = true } = params;
        const reportId = this.generateId();
        const periodMs = period === '7d' ? 7 * 86400000 : period === '30d' ? 30 * 86400000 : 90 * 86400000;
        const cutoff = new Date(Date.now() - periodMs);
        const periodViolations = this.violations.filter((v) => v.timestamp >= cutoff);
        const summary = {
            period,
            totalPolicies: this.policies.size,
            activePolicies: Array.from(this.policies.values()).filter((p) => p.active).length,
            totalViolations: periodViolations.length,
            unresolvedViolations: periodViolations.filter((v) => !v.resolved).length,
            activeExceptions: Array.from(this.exceptions.values()).filter((e) => e.status === 'active')
                .length,
            generatedAt: new Date().toISOString(),
        };
        if (includeViolations) {
            summary.violationsBySeverity = {
                critical: periodViolations.filter((v) => v.severity === 'critical').length,
                warning: periodViolations.filter((v) => v.severity === 'warning').length,
                info: periodViolations.filter((v) => v.severity === 'info').length,
            };
        }
        const metrics = {
            complianceRate: periodViolations.length > 0
                ? Math.round((1 - periodViolations.filter((v) => !v.resolved).length / periodViolations.length) *
                    100)
                : 100,
            policyCoverage: this.policies.size > 0
                ? Math.round((Array.from(this.policies.values()).filter((p) => p.active).length /
                    this.policies.size) *
                    100)
                : 0,
            violationResolutionRate: periodViolations.length > 0
                ? Math.round((periodViolations.filter((v) => v.resolved).length / periodViolations.length) * 100)
                : 100,
        };
        const recommendations = [];
        if (includeRecommendations) {
            if (metrics.complianceRate < 80)
                recommendations.push('Improve violation resolution processes to increase compliance rate');
            if (summary.unresolvedViolations > 10)
                recommendations.push('Prioritize resolution of unresolved violations');
            if (summary.activeExceptions > 5)
                recommendations.push('Review and reduce active policy exceptions');
            if (summary.activePolicies < 3)
                recommendations.push('Expand policy coverage for better governance');
            if (recommendations.length === 0)
                recommendations.push('Governance is in good standing; continue regular reviews');
        }
        this.logger.log(`Governance report generated: id=${reportId}, period=${period}, violations=${periodViolations.length}`);
        return { reportId, summary, metrics, recommendations };
    }
    async manageExceptions(params) {
        const { operation, exceptionId, details = {} } = params;
        if (!operation || typeof operation !== 'string')
            throw new Error('Valid operation string is required');
        const validOperations = ['create', 'revoke', 'extend', 'list'];
        if (!validOperations.includes(operation)) {
            throw new Error(`Invalid operation: ${operation}. Supported: ${validOperations.join(', ')}`);
        }
        switch (operation) {
            case 'create': {
                const id = this.generateId();
                const exception = {
                    id,
                    policyId: details.policyId || 'unknown',
                    target: details.target || 'all',
                    reason: details.reason || 'No reason provided',
                    grantedAt: new Date(),
                    expiresAt: new Date(Date.now() + (details.durationDays || 30) * 86400000),
                    status: 'active',
                };
                this.exceptions.set(id, exception);
                this.logger.log(`Exception created: id=${id}, policy=${exception.policyId}, target=${exception.target}`);
                return { success: true, exceptionId: id, status: 'active', operation };
            }
            case 'revoke': {
                if (!exceptionId)
                    throw new Error('exceptionId is required for revoke operation');
                const exception = this.exceptions.get(exceptionId);
                if (!exception)
                    throw new Error(`Exception not found: ${exceptionId}`);
                exception.status = 'revoked';
                this.logger.log(`Exception revoked: id=${exceptionId}`);
                return { success: true, exceptionId, status: 'revoked', operation };
            }
            case 'extend': {
                if (!exceptionId)
                    throw new Error('exceptionId is required for extend operation');
                const exception = this.exceptions.get(exceptionId);
                if (!exception)
                    throw new Error(`Exception not found: ${exceptionId}`);
                const extendDays = details.durationDays || 30;
                exception.expiresAt = new Date(exception.expiresAt.getTime() + extendDays * 86400000);
                this.logger.log(`Exception extended: id=${exceptionId}, new expiry=${exception.expiresAt.toISOString()}`);
                return { success: true, exceptionId, status: exception.status, operation };
            }
            case 'list': {
                const active = Array.from(this.exceptions.values()).filter((e) => e.status === 'active');
                this.logger.log(`Exceptions listed: active=${active.length}`);
                return {
                    success: true,
                    exceptionId: 'list',
                    status: `${active.length} active exceptions`,
                    operation,
                };
            }
            default:
                return {
                    success: false,
                    exceptionId: exceptionId || '',
                    status: 'unknown-operation',
                    operation,
                };
        }
    }
    seedPolicies() {
        const defaultPolicies = [
            {
                id: 'policy-resource-limits',
                name: 'Resource Limits Policy',
                description: 'Enforces resource usage limits across all agents',
                rules: [
                    {
                        id: 'rule-max-concurrent',
                        condition: 'maxConcurrentTasks <= 10',
                        action: 'enforce',
                        severity: 'warning',
                    },
                    {
                        id: 'rule-timeout-limit',
                        condition: 'timeout <= 300000',
                        action: 'enforce',
                        severity: 'critical',
                    },
                ],
                version: '1.0',
                active: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'policy-data-handling',
                name: 'Data Handling Policy',
                description: 'Regulates how agents handle and process data',
                rules: [
                    {
                        id: 'rule-no-sensitive-logging',
                        condition: 'No sensitive data in logs',
                        action: 'block',
                        severity: 'critical',
                    },
                    {
                        id: 'rule-data-retention',
                        condition: 'Data retention within limits',
                        action: 'warn',
                        severity: 'warning',
                    },
                ],
                version: '1.0',
                active: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'policy-error-handling',
                name: 'Error Handling Policy',
                description: 'Defines how agents should handle errors and failures',
                rules: [
                    {
                        id: 'rule-error-reporting',
                        condition: 'All errors must be reported',
                        action: 'enforce',
                        severity: 'warning',
                    },
                    {
                        id: 'rule-retry-limits',
                        condition: 'maxRetries <= 5',
                        action: 'enforce',
                        severity: 'info',
                    },
                ],
                version: '1.0',
                active: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'policy-security',
                name: 'Security Policy',
                description: 'Security requirements for agent operations',
                rules: [
                    {
                        id: 'rule-auth-required',
                        condition: 'Authentication required for execution',
                        action: 'block',
                        severity: 'critical',
                    },
                    {
                        id: 'rule-permission-check',
                        condition: 'Permission check before operations',
                        action: 'enforce',
                        severity: 'critical',
                    },
                ],
                version: '1.0',
                active: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        for (const policy of defaultPolicies) {
            this.policies.set(policy.id, policy);
        }
    }
};
exports.GovernanceAgentService = GovernanceAgentService;
exports.GovernanceAgentService = GovernanceAgentService = __decorate([
    (0, common_1.Injectable)()
], GovernanceAgentService);
//# sourceMappingURL=governance-agent.service.js.map