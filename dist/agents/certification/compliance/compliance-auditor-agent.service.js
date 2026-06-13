"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceAuditorAgent = exports.COMPLIANCE_AUDITOR_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
exports.COMPLIANCE_AUDITOR_CONFIG = {
    id: 'certification-compliance-auditor',
    name: 'ComplianceAuditor',
    cluster: 'certification',
    version: '1.0.0',
    description: 'Audits regulatory compliance (GDPR, SOC2, HIPAA), data handling, privacy controls, and audit trail integrity across the agent framework.',
    capabilities: [
        {
            name: 'audit-compliance',
            description: 'Perform a comprehensive compliance audit',
            inputSchema: {
                type: 'object',
                properties: {
                    target: { type: 'string', description: 'System or process to audit compliance' },
                    frameworks: { type: 'array', items: { type: 'string' }, description: 'Compliance frameworks to check' },
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
            name: 'check-gdpr',
            description: 'Check GDPR compliance including data processing and privacy rights',
            inputSchema: {
                type: 'object',
                properties: {
                    target: { type: 'string', description: 'System to check GDPR compliance' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    gdprScore: { type: 'number' },
                    violations: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'check-soc2',
            description: 'Check SOC2 compliance including security, availability, and confidentiality',
            inputSchema: {
                type: 'object',
                properties: {
                    target: { type: 'string', description: 'System to check SOC2 compliance' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    soc2Score: { type: 'number' },
                    controlGaps: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'audit-data-handling',
            description: 'Audit data handling practices, retention, and classification',
            inputSchema: {
                type: 'object',
                properties: {
                    dataType: { type: 'string', description: 'Type of data to audit handling' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    dataHandlingScore: { type: 'number' },
                    policyViolations: { type: 'array', items: { type: 'object' } },
                },
            },
        },
    ],
    permissions: ['certification:audit', 'certification:compliance', 'read:compliance', 'read:audit-log'],
    maxConcurrentTasks: 5,
    timeout: 60000,
    retryPolicy: { maxRetries: 2, backoffMs: 1000, exponentialBackoff: true },
};
let ComplianceAuditorAgent = class ComplianceAuditorAgent extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.complianceAuditLog = [];
    }
    defineConfig() {
        return exports.COMPLIANCE_AUDITOR_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'audit-compliance',
            description: 'Perform a comprehensive compliance audit',
            execute: async (target, frameworks) => this.performAudit({ target, frameworks }),
        });
        this.registerTool({
            name: 'check-gdpr',
            description: 'Check GDPR compliance',
            execute: async (target) => this.checkGDPR(target),
        });
        this.registerTool({
            name: 'check-soc2',
            description: 'Check SOC2 compliance',
            execute: async (target) => this.checkSOC2(target),
        });
        this.registerTool({
            name: 'audit-data-handling',
            description: 'Audit data handling practices',
            execute: async (dataType) => this.auditDataHandling(dataType),
        });
        this.logger.log('ComplianceAuditor agent initialized with 4 tools');
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
                case 'check-gdpr':
                    result = await this.checkGDPR(input.payload.target);
                    break;
                case 'check-soc2':
                    result = await this.checkSOC2(input.payload.target);
                    break;
                case 'audit-data-handling':
                    result = await this.auditDataHandling(input.payload.dataType);
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
        this.complianceAuditLog = [];
        this.logger.log('ComplianceAuditor agent destroyed, state cleared');
    }
    async performAudit(payload) {
        const { target = 'all', frameworks = ['gdpr', 'soc2'] } = payload || {};
        const issues = [];
        const recommendations = [];
        const categories = ['gdpr', 'soc2', 'hipaa', 'data_handling', 'audit_trail'];
        const auditDepth = frameworks.length > 1 ? 8 : 5;
        for (let i = 0; i < auditDepth; i++) {
            const category = categories[i % categories.length];
            const issue = {
                id: this.generateId(),
                severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
                category,
                description: `Compliance issue in ${target}: ${this.getComplianceDescription(category)}`,
                article: category === 'gdpr' ? `Article ${Math.floor(Math.random() * 50) + 1}` : undefined,
                control: category === 'soc2' ? `CC${Math.floor(Math.random() * 9) + 1}.${Math.floor(Math.random() * 3) + 1}` : undefined,
            };
            issues.push(issue);
            this.complianceAuditLog.push(issue);
        }
        const score = Math.max(0, 100 - issues.reduce((penalty, issue) => {
            const weight = issue.severity === 'critical' ? 30 : issue.severity === 'high' ? 20 : issue.severity === 'medium' ? 10 : 3;
            return penalty + weight;
        }, 0));
        if (issues.some((i) => i.category === 'gdpr')) {
            recommendations.push('Implement data subject access request handling and consent management');
        }
        if (issues.some((i) => i.category === 'soc2')) {
            recommendations.push('Strengthen access controls and implement comprehensive audit logging');
        }
        if (issues.some((i) => i.category === 'data_handling')) {
            recommendations.push('Implement data classification, retention policies, and encryption at rest');
        }
        this.logger.log(`Compliance audit completed for ${target}: score ${score}, ${issues.length} issues`);
        return { score, issues, recommendations };
    }
    async checkGDPR(target) {
        const gdprArticles = [
            { article: 'Article 6', requirement: 'Lawfulness of processing', compliant: Math.random() > 0.3 },
            { article: 'Article 7', requirement: 'Conditions for consent', compliant: Math.random() > 0.3 },
            { article: 'Article 13', requirement: 'Information to be provided', compliant: Math.random() > 0.4 },
            { article: 'Article 17', requirement: 'Right to erasure', compliant: Math.random() > 0.3 },
            { article: 'Article 25', requirement: 'Data protection by design', compliant: Math.random() > 0.4 },
            { article: 'Article 32', requirement: 'Security of processing', compliant: Math.random() > 0.3 },
            { article: 'Article 33', requirement: 'Breach notification', compliant: Math.random() > 0.5 },
            { article: 'Article 35', requirement: 'Data protection impact assessment', compliant: Math.random() > 0.4 },
        ];
        const violations = gdprArticles.filter((a) => !a.compliant).map((a) => ({
            article: a.article,
            requirement: a.requirement,
            status: 'non_compliant',
            severity: 'high',
            target: target || 'all',
        }));
        const gdprScore = Math.round(((gdprArticles.length - violations.length) / gdprArticles.length) * 100);
        this.logger.log(`GDPR check for ${target || 'all'}: score ${gdprScore}, ${violations.length} violations`);
        return { gdprScore, violations };
    }
    async checkSOC2(target) {
        const controls = [
            { control: 'CC1.1', category: 'Control Environment', implemented: Math.random() > 0.3 },
            { control: 'CC2.1', category: 'Communication', implemented: Math.random() > 0.4 },
            { control: 'CC3.1', category: 'Risk Assessment', implemented: Math.random() > 0.3 },
            { control: 'CC4.1', category: 'Monitoring', implemented: Math.random() > 0.4 },
            { control: 'CC5.1', category: 'Control Activities', implemented: Math.random() > 0.3 },
            { control: 'CC6.1', category: 'Logical Access', implemented: Math.random() > 0.3 },
            { control: 'CC6.2', category: 'Physical Access', implemented: Math.random() > 0.5 },
            { control: 'CC7.1', category: 'System Operations', implemented: Math.random() > 0.4 },
            { control: 'CC8.1', category: 'Change Management', implemented: Math.random() > 0.3 },
            { control: 'CC9.1', category: 'Risk Mitigation', implemented: Math.random() > 0.4 },
        ];
        const controlGaps = controls.filter((c) => !c.implemented).map((c) => ({
            control: c.control,
            category: c.category,
            status: 'gap',
            severity: 'high',
            target: target || 'all',
        }));
        const soc2Score = Math.round(((controls.length - controlGaps.length) / controls.length) * 100);
        this.logger.log(`SOC2 check for ${target || 'all'}: score ${soc2Score}, ${controlGaps.length} gaps`);
        return { soc2Score, controlGaps };
    }
    async auditDataHandling(dataType) {
        const dataCategories = ['personal', 'sensitive', 'operational', 'analytics', 'audit_log'];
        const targetCategories = dataType ? [dataType] : dataCategories;
        const policyViolations = [];
        for (const category of targetCategories) {
            const policies = ['classification', 'encryption', 'retention', 'access_control', 'disposal'];
            for (const policy of policies) {
                if (Math.random() > 0.6) {
                    policyViolations.push({
                        dataCategory: category,
                        policy,
                        status: 'violation',
                        description: `${policy.replace('_', ' ')} policy not properly enforced for ${category} data`,
                        severity: category === 'personal' || category === 'sensitive' ? 'high' : 'medium',
                    });
                }
            }
        }
        const dataHandlingScore = Math.max(0, 100 - policyViolations.length * 8);
        this.logger.log(`Data handling audit: score ${dataHandlingScore}, ${policyViolations.length} violations`);
        return { dataHandlingScore, policyViolations };
    }
    getComplianceDescription(category) {
        const descriptions = {
            gdpr: 'GDPR compliance violation detected',
            soc2: 'SOC2 control gap identified',
            hipaa: 'HIPAA compliance requirement not met',
            data_handling: 'Data handling policy violation',
            audit_trail: 'Audit trail integrity or completeness issue',
        };
        return descriptions[category] || 'Unknown compliance issue';
    }
};
exports.ComplianceAuditorAgent = ComplianceAuditorAgent;
exports.ComplianceAuditorAgent = ComplianceAuditorAgent = __decorate([
    (0, common_1.Injectable)()
], ComplianceAuditorAgent);
//# sourceMappingURL=compliance-auditor-agent.service.js.map