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
var SecurityGatewayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityGatewayService = exports.SecurityThreatType = void 0;
const common_1 = require("@nestjs/common");
var SecurityThreatType;
(function (SecurityThreatType) {
    SecurityThreatType["PROMPT_INJECTION"] = "prompt_injection";
    SecurityThreatType["COMMAND_INJECTION"] = "command_injection";
    SecurityThreatType["SQL_INJECTION"] = "sql_injection";
    SecurityThreatType["XSS"] = "xss";
    SecurityThreatType["CSRF"] = "csrf";
    SecurityThreatType["PATH_TRAVERSAL"] = "path_traversal";
    SecurityThreatType["EXCESSIVE_PERMISSION"] = "excessive_permission";
    SecurityThreatType["SENSITIVE_DATA_EXPOSURE"] = "sensitive_data_exposure";
    SecurityThreatType["RATE_LIMIT_EXCEEDED"] = "rate_limit_exceeded";
    SecurityThreatType["SUSPICIOUS_PATTERN"] = "suspicious_pattern";
})(SecurityThreatType || (exports.SecurityThreatType = SecurityThreatType = {}));
let SecurityGatewayService = SecurityGatewayService_1 = class SecurityGatewayService {
    constructor() {
        this.logger = new common_1.Logger(SecurityGatewayService_1.name);
        this.policies = new Map();
        this.auditLog = [];
        this.rateCounters = new Map();
        this.injectionPatterns = [
            { pattern: /ignore\s+(previous|all|above)\s+(instructions|prompts|rules)/i, type: SecurityThreatType.PROMPT_INJECTION, severity: 'critical' },
            { pattern: /you\s+are\s+now\s+/i, type: SecurityThreatType.PROMPT_INJECTION, severity: 'high' },
            { pattern: /system\s*:\s*/i, type: SecurityThreatType.PROMPT_INJECTION, severity: 'high' },
            { pattern: /forget\s+(everything|all|previous)/i, type: SecurityThreatType.PROMPT_INJECTION, severity: 'high' },
            { pattern: /new\s+instructions?\s*:/i, type: SecurityThreatType.PROMPT_INJECTION, severity: 'medium' },
            { pattern: /disregard\s+(your|the)\s+(training|rules|guidelines)/i, type: SecurityThreatType.PROMPT_INJECTION, severity: 'critical' },
            { pattern: /act\s+as\s+(if\s+you\s+(are|were)|a\s+different)/i, type: SecurityThreatType.PROMPT_INJECTION, severity: 'high' },
            { pattern: /;\s*(rm|del|format|shutdown|reboot|kill|sudo)\b/i, type: SecurityThreatType.COMMAND_INJECTION, severity: 'critical' },
            { pattern: /\$\{.*\}/, type: SecurityThreatType.COMMAND_INJECTION, severity: 'high' },
            { pattern: /\|\s*(bash|sh|cmd|powershell)\b/i, type: SecurityThreatType.COMMAND_INJECTION, severity: 'critical' },
            { pattern: /`[^`]*`/, type: SecurityThreatType.COMMAND_INJECTION, severity: 'medium' },
            { pattern: /\bexec\s*\(/i, type: SecurityThreatType.COMMAND_INJECTION, severity: 'high' },
            { pattern: /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b.*\b(FROM|INTO|TABLE|WHERE)\b)/i, type: SecurityThreatType.SQL_INJECTION, severity: 'critical' },
            { pattern: /'\s*(OR|AND)\s+'[^']*'\s*=\s*'/i, type: SecurityThreatType.SQL_INJECTION, severity: 'critical' },
            { pattern: /;\s*DROP\s+TABLE/i, type: SecurityThreatType.SQL_INJECTION, severity: 'critical' },
            { pattern: /--\s*$/m, type: SecurityThreatType.SQL_INJECTION, severity: 'medium' },
            { pattern: /<script[^>]*>/i, type: SecurityThreatType.XSS, severity: 'critical' },
            { pattern: /on\w+\s*=\s*['"]/i, type: SecurityThreatType.XSS, severity: 'high' },
            { pattern: /javascript\s*:/i, type: SecurityThreatType.XSS, severity: 'high' },
            { pattern: /<iframe[^>]*>/i, type: SecurityThreatType.XSS, severity: 'high' },
            { pattern: /\.\.[\/\\]/, type: SecurityThreatType.PATH_TRAVERSAL, severity: 'critical' },
            { pattern: /[\/\\]\.\.[\/\\]/, type: SecurityThreatType.PATH_TRAVERSAL, severity: 'critical' },
            { pattern: /%2e%2e%2f/i, type: SecurityThreatType.PATH_TRAVERSAL, severity: 'high' },
            { pattern: /%252e/i, type: SecurityThreatType.PATH_TRAVERSAL, severity: 'medium' },
            { pattern: /\b(password|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*['"][^'"]{8,}/i, type: SecurityThreatType.SENSITIVE_DATA_EXPOSURE, severity: 'critical' },
            { pattern: /\bAKIA[0-9A-Z]{16}\b/, type: SecurityThreatType.SENSITIVE_DATA_EXPOSURE, severity: 'critical' },
            { pattern: /\beyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b/, type: SecurityThreatType.SENSITIVE_DATA_EXPOSURE, severity: 'high' },
        ];
        this.initializeDefaultPolicies();
    }
    async process(agentId, action, resource, input, context) {
        const threats = [];
        let sanitized = input;
        let riskScore = 0;
        let policy = 'default';
        const validationThreats = this.validateInput(input, action);
        threats.push(...validationThreats);
        const injectionThreats = this.detectInjection(input, action);
        threats.push(...injectionThreats);
        if (injectionThreats.length > 0) {
            sanitized = this.sanitize(input, injectionThreats);
        }
        const rateLimitResult = this.checkRateLimit(agentId, action);
        if (!rateLimitResult.allowed) {
            threats.push({
                type: SecurityThreatType.RATE_LIMIT_EXCEEDED,
                severity: 'medium',
                description: `Rate limit exceeded for ${action}: ${rateLimitResult.count} calls in window`,
                source: agentId,
                detectedAt: new Date(),
            });
        }
        const policyResult = this.evaluatePolicies(agentId, action, resource, sanitized);
        policy = policyResult.policy;
        if (!policyResult.allowed) {
            riskScore += 40;
        }
        if (context?.permissions) {
            const permResult = this.checkPermissions(action, resource, context.permissions);
            if (!permResult) {
                threats.push({
                    type: SecurityThreatType.EXCESSIVE_PERMISSION,
                    severity: 'high',
                    description: `Agent ${agentId} lacks permission for ${action} on ${resource}`,
                    source: agentId,
                    detectedAt: new Date(),
                });
                riskScore += 30;
            }
        }
        for (const threat of threats) {
            switch (threat.severity) {
                case 'critical':
                    riskScore += 30;
                    break;
                case 'high':
                    riskScore += 20;
                    break;
                case 'medium':
                    riskScore += 10;
                    break;
                case 'low':
                    riskScore += 5;
                    break;
            }
        }
        riskScore = Math.min(100, riskScore);
        let resultAction;
        if (riskScore >= 70)
            resultAction = 'block';
        else if (riskScore >= 40)
            resultAction = 'quarantine';
        else if (riskScore >= 10)
            resultAction = 'sanitize';
        else
            resultAction = 'allow';
        if (threats.some((t) => t.severity === 'critical')) {
            resultAction = 'block';
        }
        this.auditLog.push({
            id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            timestamp: new Date(),
            agentId,
            action,
            resource,
            result: resultAction === 'allow' ? 'allowed' : resultAction === 'block' ? 'blocked' : 'sanitized',
            threats,
            riskScore,
            policy,
            metadata: context?.metadata || {},
        });
        const allowed = resultAction === 'allow' || resultAction === 'sanitize';
        if (!allowed) {
            this.logger.warn(`Security Gateway BLOCKED ${action} by ${agentId} on ${resource}: ` +
                `risk=${riskScore}, threats=${threats.length}, policy=${policy}`);
        }
        return {
            allowed,
            sanitized,
            threats,
            riskScore,
            policy,
            action: resultAction,
        };
    }
    validateInput(input, action) {
        const threats = [];
        if (input === null || input === undefined) {
            threats.push({
                type: SecurityThreatType.SUSPICIOUS_PATTERN,
                severity: 'low',
                description: 'Null or undefined input detected',
                source: 'input_validation',
                detectedAt: new Date(),
            });
            return threats;
        }
        if (typeof input === 'string' && input.length > 100000) {
            threats.push({
                type: SecurityThreatType.SUSPICIOUS_PATTERN,
                severity: 'medium',
                description: `Input string exceeds maximum length: ${input.length} chars`,
                source: 'input_validation',
                detectedAt: new Date(),
            });
        }
        if (typeof input === 'object' && input !== null) {
            const dangerous = ['__proto__', 'constructor', 'prototype'];
            for (const key of dangerous) {
                if (key in input) {
                    threats.push({
                        type: SecurityThreatType.SUSPICIOUS_PATTERN,
                        severity: 'critical',
                        description: `Prototype pollution attempt detected: ${key}`,
                        source: 'input_validation',
                        detectedAt: new Date(),
                    });
                }
            }
        }
        return threats;
    }
    detectInjection(input, action) {
        const threats = [];
        const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
        if (!inputStr)
            return threats;
        for (const { pattern, type, severity } of this.injectionPatterns) {
            if (pattern.test(inputStr)) {
                threats.push({
                    type,
                    severity,
                    description: `${type} pattern detected: ${pattern.source}`,
                    source: `injection_detector:${action}`,
                    detectedAt: new Date(),
                    payload: inputStr.substring(0, 200),
                });
            }
        }
        return threats;
    }
    sanitize(input, threats) {
        if (typeof input !== 'string')
            return input;
        let sanitized = input;
        sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '[REMOVED_SCRIPT]');
        sanitized = sanitized.replace(/\bon\w+\s*=\s*['"][^'"]*['"]/gi, '[REMOVED_EVENT]');
        sanitized = sanitized.replace(/javascript\s*:/gi, '[REMOVED_JS_PROTOCOL]');
        sanitized = sanitized.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        sanitized = sanitized.replace(/\.\.[\/\\]/g, '[REMOVED_TRAVERSAL]');
        sanitized = sanitized.replace(/(\b(DROP|DELETE|TRUNCATE)\s+TABLE\b)/gi, '[REMOVED_SQL]');
        sanitized = sanitized.replace(/[;&|`$]/g, '');
        return sanitized;
    }
    checkRateLimit(agentId, action) {
        const key = `${agentId}:${action}`;
        const windowMs = 60000;
        const maxRequests = 100;
        const now = Date.now();
        const counter = this.rateCounters.get(key);
        if (!counter || now - counter.windowStart > windowMs) {
            this.rateCounters.set(key, { count: 1, windowStart: now });
            return { allowed: true, count: 1 };
        }
        counter.count++;
        return { allowed: counter.count <= maxRequests, count: counter.count };
    }
    evaluatePolicies(agentId, action, resource, input) {
        const sortedPolicies = Array.from(this.policies.values())
            .filter((p) => p.enabled)
            .sort((a, b) => b.priority - a.priority);
        for (const policy of sortedPolicies) {
            for (const rule of policy.rules) {
                const match = this.evaluateRule(rule, agentId, action, resource, input);
                if (match) {
                    return { allowed: rule.action === 'allow', policy: policy.id };
                }
            }
        }
        return { allowed: true, policy: 'default' };
    }
    evaluateRule(rule, agentId, action, resource, input) {
        switch (rule.type) {
            case 'pattern':
                const targetValue = rule.field === 'action' ? action : rule.field === 'resource' ? resource : String(input);
                return rule.pattern ? new RegExp(rule.pattern).test(targetValue) : false;
            case 'blacklist':
                const blacklistTarget = rule.field === 'action' ? action : resource;
                return rule.values?.includes(blacklistTarget) || false;
            case 'whitelist':
                const whitelistTarget = rule.field === 'action' ? action : resource;
                return !(rule.values?.includes(whitelistTarget) || false);
            case 'rate_limit':
                return !this.checkRateLimit(agentId, action).allowed;
            case 'permission_check':
                return rule.values?.includes(action) || false;
            default:
                return false;
        }
    }
    checkPermissions(action, resource, permissions) {
        if (permissions.includes('*'))
            return true;
        return permissions.includes(`${action}:${resource}`) || permissions.includes(`${action}:*`);
    }
    registerPolicy(policy) {
        this.policies.set(policy.id, policy);
        this.logger.log(`Registered security policy: ${policy.id} (${policy.name})`);
    }
    unregisterPolicy(policyId) {
        return this.policies.delete(policyId);
    }
    getPolicies() {
        return Array.from(this.policies.values());
    }
    getAuditLog(limit) {
        const entries = [...this.auditLog].reverse();
        return limit ? entries.slice(0, limit) : entries;
    }
    getAuditLogForAgent(agentId, limit) {
        return this.auditLog
            .filter((e) => e.agentId === agentId)
            .reverse()
            .slice(0, limit || 100);
    }
    initializeDefaultPolicies() {
        this.registerPolicy({
            id: 'block-dangerous-commands',
            name: 'Block Dangerous Shell Commands',
            description: 'Prevents execution of destructive system commands',
            defaultAction: 'block',
            priority: 100,
            enabled: true,
            rules: [
                {
                    id: 'block-rm-rf',
                    type: 'pattern',
                    field: 'input',
                    pattern: '\\brm\\s+-rf\\b',
                    action: 'block',
                },
                {
                    id: 'block-sudo',
                    type: 'pattern',
                    field: 'input',
                    pattern: '\\bsudo\\b',
                    action: 'block',
                },
                {
                    id: 'block-format',
                    type: 'pattern',
                    field: 'input',
                    pattern: '\\bformat\\s+[a-zA-Z]:',
                    action: 'block',
                },
            ],
        });
        this.registerPolicy({
            id: 'prevent-prompt-injection',
            name: 'Prevent Prompt Injection',
            description: 'Blocks common prompt injection patterns',
            defaultAction: 'block',
            priority: 90,
            enabled: true,
            rules: [
                {
                    id: 'block-ignore-previous',
                    type: 'pattern',
                    field: 'input',
                    pattern: 'ignore\\s+(previous|all|above)\\s+(instructions|prompts)',
                    action: 'block',
                },
                {
                    id: 'block-system-override',
                    type: 'pattern',
                    field: 'input',
                    pattern: 'you\\s+are\\s+now',
                    action: 'block',
                },
            ],
        });
        this.registerPolicy({
            id: 'prevent-path-traversal',
            name: 'Prevent Path Traversal',
            description: 'Blocks path traversal attempts',
            defaultAction: 'block',
            priority: 95,
            enabled: true,
            rules: [
                {
                    id: 'block-dot-dot-slash',
                    type: 'pattern',
                    field: 'resource',
                    pattern: '\\.\\.[/\\\\]',
                    action: 'block',
                },
            ],
        });
    }
};
exports.SecurityGatewayService = SecurityGatewayService;
exports.SecurityGatewayService = SecurityGatewayService = SecurityGatewayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SecurityGatewayService);
//# sourceMappingURL=security-gateway.service.js.map