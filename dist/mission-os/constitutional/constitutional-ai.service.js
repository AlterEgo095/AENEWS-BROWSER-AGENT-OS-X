"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ConstitutionalAiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstitutionalAiService = exports.ConstitutionalBlockError = exports.RuleEnforcement = exports.RuleSeverity = exports.RuleType = void 0;
const common_1 = require("@nestjs/common");
var RuleType;
(function (RuleType) {
    RuleType["PROHIBITION"] = "prohibition";
    RuleType["REQUIREMENT"] = "requirement";
    RuleType["CONSTRAINT"] = "constraint";
    RuleType["GUIDELINE"] = "guideline";
})(RuleType || (exports.RuleType = RuleType = {}));
var RuleSeverity;
(function (RuleSeverity) {
    RuleSeverity["CRITICAL"] = "critical";
    RuleSeverity["HIGH"] = "high";
    RuleSeverity["MEDIUM"] = "medium";
    RuleSeverity["LOW"] = "low";
})(RuleSeverity || (exports.RuleSeverity = RuleSeverity = {}));
var RuleEnforcement;
(function (RuleEnforcement) {
    RuleEnforcement["BLOCK"] = "block";
    RuleEnforcement["WARN"] = "warn";
    RuleEnforcement["LOG"] = "log";
})(RuleEnforcement || (exports.RuleEnforcement = RuleEnforcement = {}));
const MAX_VIOLATIONS = 10_000;
const MAX_AUDIT_LOG = 50_000;
class ConstitutionalBlockError extends Error {
    constructor(message, evaluationResult) {
        super(message);
        this.name = 'ConstitutionalBlockError';
        this.evaluationResult = evaluationResult;
    }
}
exports.ConstitutionalBlockError = ConstitutionalBlockError;
let ConstitutionalAiService = ConstitutionalAiService_1 = class ConstitutionalAiService {
    constructor() {
        this.logger = new common_1.Logger(ConstitutionalAiService_1.name);
        this.rules = new Map();
        this.violations = [];
        this.auditLog = [];
    }
    onModuleInit() {
        this.initialize();
        this.logger.log('ConstitutionalAiService initialised');
    }
    initialize() {
        this.logger.log('Loading default constitutional rules...');
        const now = new Date();
        const defaultRules = [
            {
                id: 'constitutional.no-unauthorized-deletion',
                name: 'No unauthorized deletion',
                description: 'Agents must not perform delete actions without explicit approval. ' +
                    'Deletion of resources, data, or configuration is a destructive operation ' +
                    'that requires human authorization.',
                ruleType: RuleType.PROHIBITION,
                severity: RuleSeverity.CRITICAL,
                enforcement: RuleEnforcement.BLOCK,
                conditions: [
                    { field: 'actionType', operator: 'eq', value: 'delete' },
                    { field: 'payload.approved', operator: 'neq', value: true },
                ],
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 'constitutional.no-production-deploy-without-validation',
                name: 'No production deploy without validation',
                description: 'Agents must not deploy to production environments without passing ' +
                    'validation checks. This prevents untested or unreviewed code from ' +
                    'reaching live users.',
                ruleType: RuleType.PROHIBITION,
                severity: RuleSeverity.CRITICAL,
                enforcement: RuleEnforcement.BLOCK,
                conditions: [
                    { field: 'actionType', operator: 'eq', value: 'deploy' },
                    { field: 'environment', operator: 'eq', value: 'production' },
                    { field: 'payload.validated', operator: 'neq', value: true },
                ],
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 'constitutional.no-secret-disclosure',
                name: 'No secret disclosure',
                description: 'Agents must not disclose, expose, or transmit secrets, API keys, ' +
                    'tokens, passwords, or any other sensitive credentials. This includes ' +
                    'logging, outputting, or sending them to external services.',
                ruleType: RuleType.PROHIBITION,
                severity: RuleSeverity.CRITICAL,
                enforcement: RuleEnforcement.BLOCK,
                conditions: [
                    {
                        field: 'resource',
                        operator: 'regex',
                        value: '(secret|key|token|password|credential|api.key|access.key|private.key)',
                    },
                ],
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 'constitutional.no-permission-bypass',
                name: 'No permission bypass',
                description: 'Agents must not attempt to bypass, circumvent, or escalate beyond ' +
                    'their assigned permission level. Any action that modifies the ' +
                    'permission system itself or attempts privilege escalation is blocked.',
                ruleType: RuleType.PROHIBITION,
                severity: RuleSeverity.CRITICAL,
                enforcement: RuleEnforcement.BLOCK,
                conditions: [
                    {
                        field: 'actionType',
                        operator: 'in',
                        value: [
                            'permission.bypass',
                            'privilege.escalation',
                            'role.escalation',
                            'sudo',
                            'admin.override',
                        ],
                    },
                ],
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 'constitutional.always-produce-logs',
                name: 'Always produce logs',
                description: 'Agents performing significant actions must produce audit logs. ' +
                    'If a log-producing action is executed without the logging flag, ' +
                    'a warning is issued to ensure traceability.',
                ruleType: RuleType.REQUIREMENT,
                severity: RuleSeverity.MEDIUM,
                enforcement: RuleEnforcement.WARN,
                conditions: [
                    {
                        field: 'actionType',
                        operator: 'in',
                        value: ['create', 'update', 'delete', 'deploy', 'execute', 'configure', 'modify'],
                    },
                    { field: 'payload.loggingEnabled', operator: 'neq', value: true },
                ],
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 'constitutional.no-ssh-without-approval',
                name: 'No SSH access without approval',
                description: 'Agents must not initiate SSH connections or remote shell access ' +
                    'without prior approval. Shell access is a high-risk operation ' +
                    'that can lead to uncontrolled system changes.',
                ruleType: RuleType.PROHIBITION,
                severity: RuleSeverity.HIGH,
                enforcement: RuleEnforcement.BLOCK,
                conditions: [
                    {
                        field: 'actionType',
                        operator: 'in',
                        value: ['ssh', 'remote.shell', 'shell.exec', 'terminal.access'],
                    },
                    { field: 'payload.approved', operator: 'neq', value: true },
                ],
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 'constitutional.no-payment-without-approval',
                name: 'No payment without approval',
                description: 'Agents must not initiate financial transactions, payments, or ' +
                    'charges without explicit human approval. This prevents accidental ' +
                    'or malicious financial operations.',
                ruleType: RuleType.PROHIBITION,
                severity: RuleSeverity.CRITICAL,
                enforcement: RuleEnforcement.BLOCK,
                conditions: [
                    {
                        field: 'actionType',
                        operator: 'in',
                        value: ['payment', 'charge', 'purchase', 'transfer', 'subscription', 'billing'],
                    },
                    { field: 'payload.approved', operator: 'neq', value: true },
                ],
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 'constitutional.resource-budget-constraint',
                name: 'Resource budget constraint',
                description: 'Agents must not exceed the configured resource budget limits. ' +
                    'This includes compute, storage, API calls, and cost constraints. ' +
                    'Actions that would exceed defined budgets are blocked.',
                ruleType: RuleType.CONSTRAINT,
                severity: RuleSeverity.HIGH,
                enforcement: RuleEnforcement.BLOCK,
                conditions: [
                    {
                        field: 'actionType',
                        operator: 'in',
                        value: ['provision', 'allocate', 'scale', 'consume', 'request'],
                    },
                    { field: 'payload.overBudget', operator: 'eq', value: true },
                ],
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 'constitutional.data-retention-policy',
                name: 'Data retention policy',
                description: 'Agents must comply with data retention policies. Actions that ' +
                    'involve data older than the retention period or that would extend ' +
                    'retention beyond policy limits generate a warning.',
                ruleType: RuleType.CONSTRAINT,
                severity: RuleSeverity.MEDIUM,
                enforcement: RuleEnforcement.WARN,
                conditions: [
                    {
                        field: 'actionType',
                        operator: 'in',
                        value: ['data.store', 'data.archive', 'data.retention', 'data.extend'],
                    },
                    { field: 'payload.exceedsRetentionPolicy', operator: 'eq', value: true },
                ],
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 'constitutional.audit-trail-required',
                name: 'Audit trail required',
                description: 'Critical actions must have an audit trail. Any critical-severity ' +
                    'action that does not specify an audit reference or correlation ID ' +
                    'is blocked to ensure full traceability.',
                ruleType: RuleType.REQUIREMENT,
                severity: RuleSeverity.HIGH,
                enforcement: RuleEnforcement.BLOCK,
                conditions: [
                    {
                        field: 'actionType',
                        operator: 'in',
                        value: [
                            'delete',
                            'deploy',
                            'permission.change',
                            'security.change',
                            'config.change',
                            'data.export',
                        ],
                    },
                    { field: 'payload.auditRef', operator: 'eq', value: null },
                ],
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
        ];
        for (const rule of defaultRules) {
            this.rules.set(rule.id, { ...rule });
        }
        this.logger.log(`Loaded ${defaultRules.length} default constitutional rules`);
    }
    addRule(rule) {
        if (!rule.id || !rule.name || !rule.description) {
            throw new Error('Constitutional rule must have id, name, and description');
        }
        if (!Object.values(RuleType).includes(rule.ruleType)) {
            throw new Error(`Invalid ruleType: ${rule.ruleType}`);
        }
        if (!Object.values(RuleSeverity).includes(rule.severity)) {
            throw new Error(`Invalid severity: ${rule.severity}`);
        }
        if (!Object.values(RuleEnforcement).includes(rule.enforcement)) {
            throw new Error(`Invalid enforcement: ${rule.enforcement}`);
        }
        if (this.rules.has(rule.id)) {
            throw new Error(`Constitutional rule with id "${rule.id}" already exists`);
        }
        const conflicts = this.findRuleConflicts(rule);
        if (conflicts.length > 0) {
            const conflictNames = conflicts.map((c) => c.name).join(', ');
            throw new Error(`Rule "${rule.name}" conflicts with existing rules: ${conflictNames}`);
        }
        const stored = {
            ...rule,
            createdAt: rule.createdAt ?? new Date(),
            updatedAt: new Date(),
            isActive: rule.isActive ?? true,
        };
        this.rules.set(stored.id, stored);
        const auditEntry = `[${new Date().toISOString()}] RULE_ADDED: "${stored.name}" (${stored.id}) type=${stored.ruleType} severity=${stored.severity} enforcement=${stored.enforcement}`;
        this.appendAuditLog(auditEntry);
        this.logger.log(`Constitutional rule added: "${stored.name}" (${stored.id})`);
        return { ...stored };
    }
    removeRule(ruleId) {
        const rule = this.rules.get(ruleId);
        if (!rule) {
            this.logger.warn(`Cannot deactivate rule — id "${ruleId}" not found`);
            return;
        }
        if (!rule.isActive) {
            this.logger.debug(`Rule "${rule.name}" (${ruleId}) is already inactive`);
            return;
        }
        rule.isActive = false;
        rule.updatedAt = new Date();
        const auditEntry = `[${new Date().toISOString()}] RULE_DEACTIVATED: "${rule.name}" (${rule.id})`;
        this.appendAuditLog(auditEntry);
        this.logger.warn(`Constitutional rule deactivated: "${rule.name}" (${ruleId})`);
    }
    updateRule(ruleId, updates) {
        const rule = this.rules.get(ruleId);
        if (!rule) {
            throw new Error(`Constitutional rule with id "${ruleId}" not found`);
        }
        const tentative = {
            ...rule,
            ...updates,
            updatedAt: new Date(),
        };
        const conflicts = this.findRuleConflicts(tentative, ruleId);
        if (conflicts.length > 0) {
            const conflictNames = conflicts.map((c) => c.name).join(', ');
            throw new Error(`Updated rule "${tentative.name}" conflicts with existing rules: ${conflictNames}`);
        }
        if (updates.conditions !== undefined)
            rule.conditions = [...updates.conditions];
        if (updates.enforcement !== undefined)
            rule.enforcement = updates.enforcement;
        if (updates.severity !== undefined)
            rule.severity = updates.severity;
        if (updates.description !== undefined)
            rule.description = updates.description;
        if (updates.name !== undefined)
            rule.name = updates.name;
        if (updates.ruleType !== undefined)
            rule.ruleType = updates.ruleType;
        rule.updatedAt = new Date();
        const auditEntry = `[${new Date().toISOString()}] RULE_UPDATED: "${rule.name}" (${rule.id}) fields=${Object.keys(updates).join(',')}`;
        this.appendAuditLog(auditEntry);
        this.logger.log(`Constitutional rule updated: "${rule.name}" (${ruleId}) — fields: ${Object.keys(updates).join(', ')}`);
        return { ...rule };
    }
    evaluate(actionContext) {
        const violations = [];
        const warnings = [];
        const auditEntries = [];
        let blocked = false;
        const timestamp = new Date();
        const evalEntry = `[${timestamp.toISOString()}] EVALUATION: agent=${actionContext.agentId} action="${actionContext.action}" type=${actionContext.actionType}` +
            (actionContext.resource ? ` resource=${actionContext.resource}` : '') +
            (actionContext.environment ? ` env=${actionContext.environment}` : '');
        auditEntries.push(evalEntry);
        this.appendAuditLog(evalEntry);
        for (const rule of this.rules.values()) {
            if (!rule.isActive)
                continue;
            const conditionResult = this.evaluateConditions(rule, actionContext);
            if (conditionResult.matched) {
                const violation = {
                    ruleId: rule.id,
                    ruleName: rule.name,
                    agentId: actionContext.agentId,
                    action: actionContext.action,
                    timestamp,
                    blocked: rule.enforcement === RuleEnforcement.BLOCK,
                    reason: conditionResult.reason,
                    severity: rule.severity,
                };
                switch (rule.enforcement) {
                    case RuleEnforcement.BLOCK: {
                        violations.push(violation);
                        blocked = true;
                        const blockEntry = `[${timestamp.toISOString()}] BLOCKED: rule="${rule.name}" agent=${actionContext.agentId} action="${actionContext.action}" reason="${conditionResult.reason}"`;
                        auditEntries.push(blockEntry);
                        this.appendAuditLog(blockEntry);
                        this.logger.warn(`BLOCKED by rule "${rule.name}": agent=${actionContext.agentId} action="${actionContext.action}" — ${conditionResult.reason}`);
                        break;
                    }
                    case RuleEnforcement.WARN: {
                        violations.push(violation);
                        const warningMsg = `Rule "${rule.name}" violated by agent=${actionContext.agentId} action="${actionContext.action}" — ${conditionResult.reason}`;
                        warnings.push(warningMsg);
                        const warnEntry = `[${timestamp.toISOString()}] WARNED: rule="${rule.name}" agent=${actionContext.agentId} action="${actionContext.action}" reason="${conditionResult.reason}"`;
                        auditEntries.push(warnEntry);
                        this.appendAuditLog(warnEntry);
                        this.logger.warn(warningMsg);
                        break;
                    }
                    case RuleEnforcement.LOG: {
                        violations.push(violation);
                        const logEntry = `[${timestamp.toISOString()}] LOGGED: rule="${rule.name}" agent=${actionContext.agentId} action="${actionContext.action}" reason="${conditionResult.reason}"`;
                        auditEntries.push(logEntry);
                        this.appendAuditLog(logEntry);
                        this.logger.log(`Rule "${rule.name}" condition matched: agent=${actionContext.agentId} action="${actionContext.action}"`);
                        break;
                    }
                }
            }
        }
        for (const v of violations) {
            this.recordViolation(v);
        }
        const result = {
            allowed: !blocked,
            violations,
            warnings,
            auditEntries,
        };
        const outcomeEntry = `[${timestamp.toISOString()}] OUTCOME: ${result.allowed ? 'ALLOWED' : 'BLOCKED'} agent=${actionContext.agentId} action="${actionContext.action}" violations=${violations.length} warnings=${warnings.length}`;
        auditEntries.push(outcomeEntry);
        this.appendAuditLog(outcomeEntry);
        return result;
    }
    getRules(filter) {
        let result = [...this.rules.values()];
        if (filter) {
            if (filter.ruleType !== undefined) {
                result = result.filter((r) => r.ruleType === filter.ruleType);
            }
            if (filter.severity !== undefined) {
                result = result.filter((r) => r.severity === filter.severity);
            }
            if (filter.isActive !== undefined) {
                result = result.filter((r) => r.isActive === filter.isActive);
            }
        }
        return result.map((r) => ({ ...r, conditions: r.conditions.map((c) => ({ ...c })) }));
    }
    getViolations(agentId, since) {
        let result = this.violations;
        if (agentId) {
            result = result.filter((v) => v.agentId === agentId);
        }
        if (since) {
            result = result.filter((v) => v.timestamp >= since);
        }
        return result.map((v) => ({ ...v }));
    }
    getRuleStats() {
        const allRules = [...this.rules.values()];
        const byType = {
            [RuleType.PROHIBITION]: 0,
            [RuleType.REQUIREMENT]: 0,
            [RuleType.CONSTRAINT]: 0,
            [RuleType.GUIDELINE]: 0,
        };
        const bySeverity = {
            [RuleSeverity.CRITICAL]: 0,
            [RuleSeverity.HIGH]: 0,
            [RuleSeverity.MEDIUM]: 0,
            [RuleSeverity.LOW]: 0,
        };
        const byEnforcement = {
            [RuleEnforcement.BLOCK]: 0,
            [RuleEnforcement.WARN]: 0,
            [RuleEnforcement.LOG]: 0,
        };
        let activeRules = 0;
        let inactiveRules = 0;
        for (const rule of allRules) {
            byType[rule.ruleType]++;
            bySeverity[rule.severity]++;
            byEnforcement[rule.enforcement]++;
            if (rule.isActive) {
                activeRules++;
            }
            else {
                inactiveRules++;
            }
        }
        const violationsBySeverity = {
            [RuleSeverity.CRITICAL]: 0,
            [RuleSeverity.HIGH]: 0,
            [RuleSeverity.MEDIUM]: 0,
            [RuleSeverity.LOW]: 0,
        };
        let violationsBlocked = 0;
        for (const v of this.violations) {
            violationsBySeverity[v.severity]++;
            if (v.blocked) {
                violationsBlocked++;
            }
        }
        return {
            totalRules: allRules.length,
            activeRules,
            inactiveRules,
            byType,
            bySeverity,
            byEnforcement,
            totalViolations: this.violations.length,
            violationsBySeverity,
            violationsBlocked,
        };
    }
    enforceBeforeExecution(agentId, action, payload) {
        const actionContext = {
            agentId,
            action,
            actionType: payload?.actionType ?? action,
            resource: payload?.resource,
            payload: payload ?? {},
            target: payload?.target,
            environment: payload?.environment,
        };
        const result = this.evaluate(actionContext);
        if (!result.allowed) {
            const violationSummary = result.violations
                .filter((v) => v.blocked)
                .map((v) => `"${v.ruleName}": ${v.reason}`)
                .join('; ');
            const message = `Action "${action}" by agent "${agentId}" blocked by constitutional rules: ${violationSummary}`;
            this.logger.error(message);
            throw new ConstitutionalBlockError(message, result);
        }
        return result;
    }
    evaluateConditions(rule, context) {
        if (rule.conditions.length === 0) {
            return { matched: false, reason: '' };
        }
        const matchDetails = [];
        for (const condition of rule.conditions) {
            const fieldValue = this.resolveFieldValue(condition.field, context);
            const result = this.evaluateOperator(fieldValue, condition.operator, condition.value);
            if (!result) {
                return { matched: false, reason: '' };
            }
            matchDetails.push(`${condition.field}(${JSON.stringify(fieldValue)}) ${condition.operator} ${JSON.stringify(condition.value)}`);
        }
        const reason = `Rule "${rule.name}" triggered: ${matchDetails.join(' AND ')}`;
        return { matched: true, reason };
    }
    resolveFieldValue(field, context) {
        const directFields = {
            agentId: context.agentId,
            action: context.action,
            actionType: context.actionType,
            resource: context.resource,
            payload: context.payload,
            target: context.target,
            environment: context.environment,
        };
        if (!field.includes('.')) {
            return directFields[field] ?? undefined;
        }
        const parts = field.split('.');
        let current = directFields[parts[0]] ?? undefined;
        for (let i = 1; i < parts.length; i++) {
            if (current === null || current === undefined) {
                return undefined;
            }
            if (typeof current === 'object') {
                current = current[parts[i]];
            }
            else {
                return undefined;
            }
        }
        return current;
    }
    evaluateOperator(fieldValue, operator, conditionValue) {
        switch (operator) {
            case 'eq': {
                if (fieldValue === undefined && conditionValue === null)
                    return true;
                if (fieldValue === null && conditionValue === null)
                    return true;
                if (fieldValue === undefined && conditionValue === undefined)
                    return true;
                return fieldValue === conditionValue;
            }
            case 'neq': {
                if (fieldValue === undefined && conditionValue === null)
                    return false;
                if (fieldValue === null && conditionValue === null)
                    return false;
                return fieldValue !== conditionValue;
            }
            case 'gt': {
                if (typeof fieldValue !== 'number' || typeof conditionValue !== 'number')
                    return false;
                return fieldValue > conditionValue;
            }
            case 'lt': {
                if (typeof fieldValue !== 'number' || typeof conditionValue !== 'number')
                    return false;
                return fieldValue < conditionValue;
            }
            case 'gte': {
                if (typeof fieldValue !== 'number' || typeof conditionValue !== 'number')
                    return false;
                return fieldValue >= conditionValue;
            }
            case 'lte': {
                if (typeof fieldValue !== 'number' || typeof conditionValue !== 'number')
                    return false;
                return fieldValue <= conditionValue;
            }
            case 'in': {
                if (!Array.isArray(conditionValue))
                    return false;
                return conditionValue.includes(fieldValue);
            }
            case 'contains': {
                if (typeof fieldValue !== 'string' || typeof conditionValue !== 'string')
                    return false;
                return fieldValue.toLowerCase().includes(conditionValue.toLowerCase());
            }
            case 'regex': {
                if (typeof fieldValue !== 'string' || typeof conditionValue !== 'string')
                    return false;
                try {
                    const regex = new RegExp(conditionValue, 'i');
                    return regex.test(fieldValue);
                }
                catch {
                    return false;
                }
            }
            default:
                return false;
        }
    }
    recordViolation(violation) {
        this.violations.push({ ...violation });
        if (this.violations.length > MAX_VIOLATIONS) {
            this.violations.splice(0, this.violations.length - MAX_VIOLATIONS);
        }
    }
    appendAuditLog(entry) {
        this.auditLog.push(entry);
        if (this.auditLog.length > MAX_AUDIT_LOG) {
            this.auditLog.splice(0, this.auditLog.length - MAX_AUDIT_LOG);
        }
    }
    findRuleConflicts(proposedRule, excludeId) {
        const conflicts = [];
        for (const existing of this.rules.values()) {
            if (excludeId && existing.id === excludeId)
                continue;
            if (!existing.isActive && proposedRule.isActive !== false)
                continue;
            if (existing.ruleType === proposedRule.ruleType &&
                existing.enforcement !== proposedRule.enforcement &&
                this.conditionsOverlap(existing.conditions, proposedRule.conditions)) {
                conflicts.push(existing);
            }
            if (existing.ruleType === RuleType.PROHIBITION &&
                proposedRule.ruleType === RuleType.REQUIREMENT &&
                this.conditionsOverlap(existing.conditions, proposedRule.conditions)) {
                conflicts.push(existing);
            }
            if (existing.ruleType === RuleType.REQUIREMENT &&
                proposedRule.ruleType === RuleType.PROHIBITION &&
                this.conditionsOverlap(existing.conditions, proposedRule.conditions)) {
                conflicts.push(existing);
            }
        }
        return conflicts;
    }
    conditionsOverlap(conditionsA, conditionsB) {
        const mapA = new Map();
        for (const c of conditionsA) {
            if (!mapA.has(c.field))
                mapA.set(c.field, []);
            mapA.get(c.field).push(c);
        }
        const mapB = new Map();
        for (const c of conditionsB) {
            if (!mapB.has(c.field))
                mapB.set(c.field, []);
            mapB.get(c.field).push(c);
        }
        for (const field of mapA.keys()) {
            if (!mapB.has(field))
                continue;
            const condsA = mapA.get(field);
            const condsB = mapB.get(field);
            let anyCompatible = false;
            for (const cA of condsA) {
                for (const cB of condsB) {
                    if (this.conditionsCompatible(cA, cB)) {
                        anyCompatible = true;
                        break;
                    }
                }
                if (anyCompatible)
                    break;
            }
            if (!anyCompatible && condsA.length > 0 && condsB.length > 0) {
                return false;
            }
        }
        return true;
    }
    conditionsCompatible(a, b) {
        if (a.operator === b.operator && a.value === b.value)
            return true;
        if (a.operator === 'eq' && b.operator === 'neq' && a.value === b.value)
            return false;
        if (a.operator === 'neq' && b.operator === 'eq' && a.value === b.value)
            return false;
        if (a.operator === 'eq' && b.operator === 'eq' && a.value !== b.value)
            return false;
        if (a.operator === 'eq' && b.operator === 'in') {
            return Array.isArray(b.value) && b.value.includes(a.value);
        }
        if (a.operator === 'in' && b.operator === 'eq') {
            return Array.isArray(a.value) && a.value.includes(b.value);
        }
        return true;
    }
};
exports.ConstitutionalAiService = ConstitutionalAiService;
exports.ConstitutionalAiService = ConstitutionalAiService = ConstitutionalAiService_1 = __decorate([
    (0, common_1.Injectable)()
], ConstitutionalAiService);
//# sourceMappingURL=constitutional-ai.service.js.map