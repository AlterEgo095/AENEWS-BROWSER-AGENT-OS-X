/**
 * AENEWS Agent OS X - Security Gateway Service
 *
 * All prompts, terminal commands, API calls, and browser actions
 * MUST pass through this gateway. It enforces:
 *
 *   Input Validation  →  Sanitization  →  Policy Engine  →  Permission Engine  →  Execution
 *
 * Prevents: prompt injection, command injection, SQL injection,
 * XSS, CSRF, path traversal, and other security threats.
 */

import { Injectable, Logger } from '@nestjs/common';

// ─── Types ──────────────────────────────────────────────────────────

export interface SecurityCheckResult {
  allowed: boolean;
  sanitized: any;
  threats: SecurityThreat[];
  riskScore: number; // 0-100, 0 = safe
  policy: string;
  action: 'allow' | 'sanitize' | 'block' | 'quarantine';
}

export interface SecurityThreat {
  type: SecurityThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  detectedAt: Date;
  payload?: string;
}

export enum SecurityThreatType {
  PROMPT_INJECTION = 'prompt_injection',
  COMMAND_INJECTION = 'command_injection',
  SQL_INJECTION = 'sql_injection',
  XSS = 'xss',
  CSRF = 'csrf',
  PATH_TRAVERSAL = 'path_traversal',
  EXCESSIVE_PERMISSION = 'excessive_permission',
  SENSITIVE_DATA_EXPOSURE = 'sensitive_data_exposure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  defaultAction: 'allow' | 'block';
  priority: number;
  enabled: boolean;
}

export interface SecurityRule {
  id: string;
  type: 'pattern' | 'whitelist' | 'blacklist' | 'rate_limit' | 'permission_check';
  field: string;
  pattern?: string;
  values?: string[];
  maxRate?: number;
  windowMs?: number;
  action: 'allow' | 'block' | 'sanitize';
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  agentId: string;
  action: string;
  resource: string;
  result: 'allowed' | 'blocked' | 'sanitized';
  threats: SecurityThreat[];
  riskScore: number;
  policy: string;
  metadata: Record<string, any>;
}

@Injectable()
export class SecurityGatewayService {
  private readonly logger = new Logger(SecurityGatewayService.name);

  /** Registered security policies */
  private readonly policies: Map<string, SecurityPolicy> = new Map();

  /** Audit log (in-memory ring buffer with max size — persisted via SecurityAuditPersistenceService) */
  private readonly auditLog: AuditLogEntry[] = [];
  private readonly maxAuditLogSize = 10000;

  /** Rate limiting counters: Map<key, { count, windowStart }> */
  private readonly rateCounters: Map<string, { count: number; windowStart: number }> = new Map();

  /** Blacklisted patterns for injection detection */
  private readonly injectionPatterns: Array<{
    pattern: RegExp;
    type: SecurityThreatType;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [
    // Prompt injection patterns
    {
      pattern: /ignore\s+(previous|all|above)\s+(instructions|prompts|rules)/i,
      type: SecurityThreatType.PROMPT_INJECTION,
      severity: 'critical',
    },
    { pattern: /you\s+are\s+now\s+/i, type: SecurityThreatType.PROMPT_INJECTION, severity: 'high' },
    { pattern: /system\s*:\s*/i, type: SecurityThreatType.PROMPT_INJECTION, severity: 'high' },
    {
      pattern: /forget\s+(everything|all|previous)/i,
      type: SecurityThreatType.PROMPT_INJECTION,
      severity: 'high',
    },
    {
      pattern: /new\s+instructions?\s*:/i,
      type: SecurityThreatType.PROMPT_INJECTION,
      severity: 'medium',
    },
    {
      pattern: /disregard\s+(your|the)\s+(training|rules|guidelines)/i,
      type: SecurityThreatType.PROMPT_INJECTION,
      severity: 'critical',
    },
    {
      pattern: /act\s+as\s+(if\s+you\s+(are|were)|a\s+different)/i,
      type: SecurityThreatType.PROMPT_INJECTION,
      severity: 'high',
    },

    // Command injection patterns
    {
      pattern: /;\s*(rm|del|format|shutdown|reboot|kill|sudo)\b/i,
      type: SecurityThreatType.COMMAND_INJECTION,
      severity: 'critical',
    },
    { pattern: /\$\{.*\}/, type: SecurityThreatType.COMMAND_INJECTION, severity: 'high' },
    {
      pattern: /\|\s*(bash|sh|cmd|powershell)\b/i,
      type: SecurityThreatType.COMMAND_INJECTION,
      severity: 'critical',
    },
    { pattern: /`[^`]*`/, type: SecurityThreatType.COMMAND_INJECTION, severity: 'medium' },
    { pattern: /\bexec\s*\(/i, type: SecurityThreatType.COMMAND_INJECTION, severity: 'high' },

    // SQL injection patterns
    {
      pattern:
        /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b.*\b(FROM|INTO|TABLE|WHERE)\b)/i,
      type: SecurityThreatType.SQL_INJECTION,
      severity: 'critical',
    },
    {
      pattern: /'\s*(OR|AND)\s+'[^']*'\s*=\s*'/i,
      type: SecurityThreatType.SQL_INJECTION,
      severity: 'critical',
    },
    { pattern: /;\s*DROP\s+TABLE/i, type: SecurityThreatType.SQL_INJECTION, severity: 'critical' },
    { pattern: /--\s*$/m, type: SecurityThreatType.SQL_INJECTION, severity: 'medium' },

    // XSS patterns
    { pattern: /<script[^>]*>/i, type: SecurityThreatType.XSS, severity: 'critical' },
    { pattern: /on\w+\s*=\s*['"]/i, type: SecurityThreatType.XSS, severity: 'high' },
    { pattern: /javascript\s*:/i, type: SecurityThreatType.XSS, severity: 'high' },
    { pattern: /<iframe[^>]*>/i, type: SecurityThreatType.XSS, severity: 'high' },

    // Path traversal patterns
    { pattern: /\.\.[\/\\]/, type: SecurityThreatType.PATH_TRAVERSAL, severity: 'critical' },
    { pattern: /[\/\\]\.\.[\/\\]/, type: SecurityThreatType.PATH_TRAVERSAL, severity: 'critical' },
    { pattern: /%2e%2e%2f/i, type: SecurityThreatType.PATH_TRAVERSAL, severity: 'high' },
    { pattern: /%252e/i, type: SecurityThreatType.PATH_TRAVERSAL, severity: 'medium' },

    // Sensitive data exposure
    {
      pattern: /\b(password|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*['"][^'"]{8,}/i,
      type: SecurityThreatType.SENSITIVE_DATA_EXPOSURE,
      severity: 'critical',
    },
    {
      pattern: /\bAKIA[0-9A-Z]{16}\b/,
      type: SecurityThreatType.SENSITIVE_DATA_EXPOSURE,
      severity: 'critical',
    },
    {
      pattern: /\beyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b/,
      type: SecurityThreatType.SENSITIVE_DATA_EXPOSURE,
      severity: 'high',
    },
  ];

  constructor() {
    this.initializeDefaultPolicies();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MAIN GATEWAY METHOD
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Process an input through the security gateway.
   *
   * Flow: Input → Validation → Sanitization → Policy Engine → Permission → Result
   *
   * @param agentId - The agent making the request
   * @param action - The action being performed (e.g., 'execute', 'browse', 'api_call')
   * @param resource - The resource being accessed
   * @param input - The raw input to validate and sanitize
   * @param context - Additional context (permissions, metadata, etc.)
   */
  async process(
    agentId: string,
    action: string,
    resource: string,
    input: any,
    context?: { permissions?: string[]; metadata?: Record<string, any> },
  ): Promise<SecurityCheckResult> {
    const threats: SecurityThreat[] = [];
    let sanitized = input;
    let riskScore = 0;
    let policy = 'default';

    // Step 1: Input Validation
    const validationThreats = this.validateInput(input, action);
    threats.push(...validationThreats);

    // Step 2: Injection Detection & Sanitization
    const injectionThreats = this.detectInjection(input, action);
    threats.push(...injectionThreats);

    if (injectionThreats.length > 0) {
      sanitized = this.sanitize(input, injectionThreats);
    }

    // Step 3: Rate Limiting
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

    // Step 4: Policy Engine
    const policyResult = this.evaluatePolicies(agentId, action, resource, sanitized);
    policy = policyResult.policy;
    if (!policyResult.allowed) {
      riskScore += 40;
    }

    // Step 5: Permission Check
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

    // Calculate total risk score
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

    // Determine action
    let resultAction: SecurityCheckResult['action'];
    if (riskScore >= 70) resultAction = 'block';
    else if (riskScore >= 40) resultAction = 'quarantine';
    else if (riskScore >= 10) resultAction = 'sanitize';
    else resultAction = 'allow';

    // Block if any critical threat
    if (threats.some((t) => t.severity === 'critical')) {
      resultAction = 'block';
    }

    // Audit log (bounded ring buffer)
    this.auditLog.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date(),
      agentId,
      action,
      resource,
      result:
        resultAction === 'allow' ? 'allowed' : resultAction === 'block' ? 'blocked' : 'sanitized',
      threats,
      riskScore,
      policy,
      metadata: context?.metadata || {},
    });
    // Evict oldest entries to prevent unbounded memory growth
    if (this.auditLog.length > this.maxAuditLogSize) {
      this.auditLog.splice(0, this.auditLog.length - this.maxAuditLogSize);
    }

    const allowed = resultAction === 'allow' || resultAction === 'sanitize';

    if (!allowed) {
      this.logger.warn(
        `Security Gateway BLOCKED ${action} by ${agentId} on ${resource}: ` +
          `risk=${riskScore}, threats=${threats.length}, policy=${policy}`,
      );
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

  // ═══════════════════════════════════════════════════════════════════
  //  INPUT VALIDATION
  // ═══════════════════════════════════════════════════════════════════

  private validateInput(input: any, action: string): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    // Check for null/undefined
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

    // Check string length
    if (typeof input === 'string' && input.length > 100000) {
      threats.push({
        type: SecurityThreatType.SUSPICIOUS_PATTERN,
        severity: 'medium',
        description: `Input string exceeds maximum length: ${input.length} chars`,
        source: 'input_validation',
        detectedAt: new Date(),
      });
    }

    // Check for prototype pollution
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

  // ═══════════════════════════════════════════════════════════════════
  //  INJECTION DETECTION
  // ═══════════════════════════════════════════════════════════════════

  private detectInjection(input: any, action: string): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);

    if (!inputStr) return threats;

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

  // ═══════════════════════════════════════════════════════════════════
  //  SANITIZATION
  // ═══════════════════════════════════════════════════════════════════

  private sanitize(input: any, threats: SecurityThreat[]): any {
    if (typeof input !== 'string') return input;

    let sanitized = input;

    // Remove script tags
    sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '[REMOVED_SCRIPT]');

    // Remove event handlers
    sanitized = sanitized.replace(/\bon\w+\s*=\s*['"][^'"]*['"]/gi, '[REMOVED_EVENT]');

    // Remove JavaScript protocol
    sanitized = sanitized.replace(/javascript\s*:/gi, '[REMOVED_JS_PROTOCOL]');

    // Escape HTML entities
    sanitized = sanitized.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Remove path traversal
    sanitized = sanitized.replace(/\.\.[\/\\]/g, '[REMOVED_TRAVERSAL]');

    // Remove SQL injection patterns
    sanitized = sanitized.replace(/(\b(DROP|DELETE|TRUNCATE)\s+TABLE\b)/gi, '[REMOVED_SQL]');

    // Remove command injection
    sanitized = sanitized.replace(/[;&|`$]/g, '');

    return sanitized;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  RATE LIMITING
  // ═══════════════════════════════════════════════════════════════════

  private checkRateLimit(agentId: string, action: string): { allowed: boolean; count: number } {
    const key = `${agentId}:${action}`;
    const windowMs = 60000; // 1 minute window
    const maxRequests = 100; // Max 100 requests per minute per action

    const now = Date.now();
    const counter = this.rateCounters.get(key);

    if (!counter || now - counter.windowStart > windowMs) {
      this.rateCounters.set(key, { count: 1, windowStart: now });
      return { allowed: true, count: 1 };
    }

    counter.count++;
    return { allowed: counter.count <= maxRequests, count: counter.count };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  POLICY ENGINE
  // ═══════════════════════════════════════════════════════════════════

  private evaluatePolicies(
    agentId: string,
    action: string,
    resource: string,
    input: any,
  ): { allowed: boolean; policy: string } {
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

  private evaluateRule(
    rule: SecurityRule,
    agentId: string,
    action: string,
    resource: string,
    input: any,
  ): boolean {
    switch (rule.type) {
      case 'pattern':
        const targetValue =
          rule.field === 'action' ? action : rule.field === 'resource' ? resource : String(input);
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

  private checkPermissions(action: string, resource: string, permissions: string[]): boolean {
    if (permissions.includes('*')) return true;
    return permissions.includes(`${action}:${resource}`) || permissions.includes(`${action}:*`);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  POLICY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  registerPolicy(policy: SecurityPolicy): void {
    this.policies.set(policy.id, policy);
    this.logger.log(`Registered security policy: ${policy.id} (${policy.name})`);
  }

  unregisterPolicy(policyId: string): boolean {
    return this.policies.delete(policyId);
  }

  getPolicies(): SecurityPolicy[] {
    return Array.from(this.policies.values());
  }

  getAuditLog(limit?: number): AuditLogEntry[] {
    const entries = [...this.auditLog].reverse();
    return limit ? entries.slice(0, limit) : entries;
  }

  getAuditLogForAgent(agentId: string, limit?: number): AuditLogEntry[] {
    return this.auditLog
      .filter((e) => e.agentId === agentId)
      .reverse()
      .slice(0, limit || 100);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  DEFAULT POLICIES
  // ═══════════════════════════════════════════════════════════════════

  private initializeDefaultPolicies(): void {
    // Block dangerous shell commands
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

    // Prevent prompt injection
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

    // Path traversal prevention
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
}
