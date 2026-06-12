/**
 * AENEWS Agent OS X - Constitutional AI Service
 * The Constitutional AI Layer defines permanent rules that ALL agents must respect.
 * Rules like: never delete without authorization, never deploy to production
 * without validation, never disclose secrets, never bypass permissions,
 * always produce logs.
 *
 * This service is the ultimate enforcement mechanism — no agent action proceeds
 * without passing constitutional evaluation first.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// ─── Type Definitions ──────────────────────────────────────────────

export enum RuleType {
  PROHIBITION = 'prohibition', // Must NOT do
  REQUIREMENT = 'requirement', // Must DO
  CONSTRAINT = 'constraint', // Must stay within bounds
  GUIDELINE = 'guideline', // Should follow
}

export enum RuleSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum RuleEnforcement {
  BLOCK = 'block', // Prevent execution entirely
  WARN = 'warn', // Allow but log warning
  LOG = 'log', // Just log
}

export interface ConstitutionalRule {
  id: string;
  name: string;
  description: string;
  ruleType: RuleType;
  severity: RuleSeverity;
  enforcement: RuleEnforcement;
  conditions: RuleCondition[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleCondition {
  field: string; // e.g. 'action.type', 'resource', 'payload.size'
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'regex';
  value: any;
}

export interface ConstitutionalViolation {
  ruleId: string;
  ruleName: string;
  agentId: string;
  action: string;
  timestamp: Date;
  blocked: boolean;
  reason: string;
  severity: RuleSeverity;
}

export interface ActionContext {
  agentId: string;
  action: string;
  actionType: string;
  resource?: string;
  payload?: any;
  target?: string;
  environment?: string;
}

export interface EvaluationResult {
  allowed: boolean;
  violations: ConstitutionalViolation[];
  warnings: string[];
  auditEntries: string[];
}

export interface RuleFilter {
  ruleType?: RuleType;
  severity?: RuleSeverity;
  isActive?: boolean;
}

export interface RuleStats {
  totalRules: number;
  activeRules: number;
  inactiveRules: number;
  byType: Record<RuleType, number>;
  bySeverity: Record<RuleSeverity, number>;
  byEnforcement: Record<RuleEnforcement, number>;
  totalViolations: number;
  violationsBySeverity: Record<RuleSeverity, number>;
  violationsBlocked: number;
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_VIOLATIONS = 10_000;
const MAX_AUDIT_LOG = 50_000;

// ─── Custom Error ───────────────────────────────────────────────────

export class ConstitutionalBlockError extends Error {
  public readonly evaluationResult: EvaluationResult;

  constructor(message: string, evaluationResult: EvaluationResult) {
    super(message);
    this.name = 'ConstitutionalBlockError';
    this.evaluationResult = evaluationResult;
  }
}

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class ConstitutionalAiService implements OnModuleInit {
  private readonly logger = new Logger(ConstitutionalAiService.name);

  /** rule id → rule */
  private readonly rules: Map<string, ConstitutionalRule> = new Map();

  /** Violation history (bounded) */
  private readonly violations: ConstitutionalViolation[] = [];

  /** Audit log entries (bounded) */
  private readonly auditLog: string[] = [];

  // ─── Lifecycle ────────────────────────────────────────────────────

  onModuleInit(): void {
    this.initialize();
    this.logger.log('ConstitutionalAiService initialised');
  }

  // ─── 1. initialize ────────────────────────────────────────────────

  /**
   * Load the default constitutional rules. These are the immutable
   * guardrails that protect the system from the most dangerous agent
   * behaviours. Called automatically on module init.
   */
  initialize(): void {
    this.logger.log('Loading default constitutional rules...');

    const now = new Date();

    const defaultRules: ConstitutionalRule[] = [
      {
        id: 'constitutional.no-unauthorized-deletion',
        name: 'No unauthorized deletion',
        description:
          'Agents must not perform delete actions without explicit approval. ' +
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
        description:
          'Agents must not deploy to production environments without passing ' +
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
        description:
          'Agents must not disclose, expose, or transmit secrets, API keys, ' +
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
        description:
          'Agents must not attempt to bypass, circumvent, or escalate beyond ' +
          'their assigned permission level. Any action that modifies the ' +
          'permission system itself or attempts privilege escalation is blocked.',
        ruleType: RuleType.PROHIBITION,
        severity: RuleSeverity.CRITICAL,
        enforcement: RuleEnforcement.BLOCK,
        conditions: [
          {
            field: 'actionType',
            operator: 'in',
            value: ['permission.bypass', 'privilege.escalation', 'role.escalation', 'sudo', 'admin.override'],
          },
        ],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'constitutional.always-produce-logs',
        name: 'Always produce logs',
        description:
          'Agents performing significant actions must produce audit logs. ' +
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
        description:
          'Agents must not initiate SSH connections or remote shell access ' +
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
        description:
          'Agents must not initiate financial transactions, payments, or ' +
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
        description:
          'Agents must not exceed the configured resource budget limits. ' +
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
        description:
          'Agents must comply with data retention policies. Actions that ' +
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
        description:
          'Critical actions must have an audit trail. Any critical-severity ' +
          'action that does not specify an audit reference or correlation ID ' +
          'is blocked to ensure full traceability.',
        ruleType: RuleType.REQUIREMENT,
        severity: RuleSeverity.HIGH,
        enforcement: RuleEnforcement.BLOCK,
        conditions: [
          {
            field: 'actionType',
            operator: 'in',
            value: ['delete', 'deploy', 'permission.change', 'security.change', 'config.change', 'data.export'],
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

  // ─── 2. addRule ───────────────────────────────────────────────────

  /**
   * Add a new constitutional rule. Validates that:
   *  - No rule with the same ID already exists
   *  - The rule does not conflict with existing rules
   *  - Required fields are present
   *
   * Returns the added rule or throws on validation failure.
   */
  addRule(rule: ConstitutionalRule): ConstitutionalRule {
    // Validate required fields
    if (!rule.id || !rule.name || !rule.description) {
      throw new Error(
        'Constitutional rule must have id, name, and description',
      );
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

    // Check for duplicate ID
    if (this.rules.has(rule.id)) {
      throw new Error(
        `Constitutional rule with id "${rule.id}" already exists`,
      );
    }

    // Validate no conflicts with existing rules
    const conflicts = this.findRuleConflicts(rule);
    if (conflicts.length > 0) {
      const conflictNames = conflicts.map((c) => c.name).join(', ');
      throw new Error(
        `Rule "${rule.name}" conflicts with existing rules: ${conflictNames}`,
      );
    }

    const stored: ConstitutionalRule = {
      ...rule,
      createdAt: rule.createdAt ?? new Date(),
      updatedAt: new Date(),
      isActive: rule.isActive ?? true,
    };

    this.rules.set(stored.id, stored);

    const auditEntry = `[${new Date().toISOString()}] RULE_ADDED: "${stored.name}" (${stored.id}) type=${stored.ruleType} severity=${stored.severity} enforcement=${stored.enforcement}`;
    this.appendAuditLog(auditEntry);

    this.logger.log(
      `Constitutional rule added: "${stored.name}" (${stored.id})`,
    );

    return { ...stored };
  }

  // ─── 3. removeRule ────────────────────────────────────────────────

  /**
   * Deactivate a rule by ID. Rules are never truly deleted for audit
   * purposes — they are simply marked as inactive so they no longer
   * participate in evaluations but remain in the historical record.
   */
  removeRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      this.logger.warn(
        `Cannot deactivate rule — id "${ruleId}" not found`,
      );
      return;
    }

    if (!rule.isActive) {
      this.logger.debug(
        `Rule "${rule.name}" (${ruleId}) is already inactive`,
      );
      return;
    }

    rule.isActive = false;
    rule.updatedAt = new Date();

    const auditEntry = `[${new Date().toISOString()}] RULE_DEACTIVATED: "${rule.name}" (${rule.id})`;
    this.appendAuditLog(auditEntry);

    this.logger.warn(
      `Constitutional rule deactivated: "${rule.name}" (${ruleId})`,
    );
  }

  // ─── 4. updateRule ────────────────────────────────────────────────

  /**
   * Update rule conditions or enforcement. Validates that the updated
   * rule does not conflict with other existing rules.
   */
  updateRule(
    ruleId: string,
    updates: Partial<Pick<ConstitutionalRule, 'conditions' | 'enforcement' | 'severity' | 'description' | 'name' | 'ruleType'>>,
  ): ConstitutionalRule {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Constitutional rule with id "${ruleId}" not found`);
    }

    // Build a tentative updated rule for conflict checking
    const tentative: ConstitutionalRule = {
      ...rule,
      ...updates,
      updatedAt: new Date(),
    };

    // Validate no conflicts with OTHER rules (exclude self)
    const conflicts = this.findRuleConflicts(tentative, ruleId);
    if (conflicts.length > 0) {
      const conflictNames = conflicts.map((c) => c.name).join(', ');
      throw new Error(
        `Updated rule "${tentative.name}" conflicts with existing rules: ${conflictNames}`,
      );
    }

    // Apply updates
    if (updates.conditions !== undefined) rule.conditions = [...updates.conditions];
    if (updates.enforcement !== undefined) rule.enforcement = updates.enforcement;
    if (updates.severity !== undefined) rule.severity = updates.severity;
    if (updates.description !== undefined) rule.description = updates.description;
    if (updates.name !== undefined) rule.name = updates.name;
    if (updates.ruleType !== undefined) rule.ruleType = updates.ruleType;
    rule.updatedAt = new Date();

    const auditEntry = `[${new Date().toISOString()}] RULE_UPDATED: "${rule.name}" (${rule.id}) fields=${Object.keys(updates).join(',')}`;
    this.appendAuditLog(auditEntry);

    this.logger.log(
      `Constitutional rule updated: "${rule.name}" (${ruleId}) — fields: ${Object.keys(updates).join(', ')}`,
    );

    return { ...rule };
  }

  // ─── 5. evaluate ──────────────────────────────────────────────────

  /**
   * THE CORE METHOD. Evaluate ALL active rules against the action context.
   *
   * For each rule, check if its conditions match the action context.
   * - If any BLOCK rule is violated → allowed = false
   * - Violations are collected for each matched rule
   * - Warnings are collected for WARN rules
   * - Audit entries are produced for every evaluation
   *
   * Returns EvaluationResult with the complete assessment.
   */
  evaluate(actionContext: ActionContext): EvaluationResult {
    const violations: ConstitutionalViolation[] = [];
    const warnings: string[] = [];
    const auditEntries: string[] = [];
    let blocked = false;

    const timestamp = new Date();

    // Audit the evaluation itself
    const evalEntry =
      `[${timestamp.toISOString()}] EVALUATION: agent=${actionContext.agentId} action="${actionContext.action}" type=${actionContext.actionType}` +
      (actionContext.resource ? ` resource=${actionContext.resource}` : '') +
      (actionContext.environment ? ` env=${actionContext.environment}` : '');
    auditEntries.push(evalEntry);
    this.appendAuditLog(evalEntry);

    // Evaluate each active rule
    for (const rule of this.rules.values()) {
      if (!rule.isActive) continue;

      const conditionResult = this.evaluateConditions(rule, actionContext);

      if (conditionResult.matched) {
        const violation: ConstitutionalViolation = {
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

            const blockEntry =
              `[${timestamp.toISOString()}] BLOCKED: rule="${rule.name}" agent=${actionContext.agentId} action="${actionContext.action}" reason="${conditionResult.reason}"`;
            auditEntries.push(blockEntry);
            this.appendAuditLog(blockEntry);

            this.logger.warn(
              `BLOCKED by rule "${rule.name}": agent=${actionContext.agentId} action="${actionContext.action}" — ${conditionResult.reason}`,
            );
            break;
          }
          case RuleEnforcement.WARN: {
            violations.push(violation);

            const warningMsg =
              `Rule "${rule.name}" violated by agent=${actionContext.agentId} action="${actionContext.action}" — ${conditionResult.reason}`;
            warnings.push(warningMsg);

            const warnEntry =
              `[${timestamp.toISOString()}] WARNED: rule="${rule.name}" agent=${actionContext.agentId} action="${actionContext.action}" reason="${conditionResult.reason}"`;
            auditEntries.push(warnEntry);
            this.appendAuditLog(warnEntry);

            this.logger.warn(warningMsg);
            break;
          }
          case RuleEnforcement.LOG: {
            violations.push(violation);

            const logEntry =
              `[${timestamp.toISOString()}] LOGGED: rule="${rule.name}" agent=${actionContext.agentId} action="${actionContext.action}" reason="${conditionResult.reason}"`;
            auditEntries.push(logEntry);
            this.appendAuditLog(logEntry);

            this.logger.log(
              `Rule "${rule.name}" condition matched: agent=${actionContext.agentId} action="${actionContext.action}"`,
            );
            break;
          }
        }
      }
    }

    // Record violations for audit history
    for (const v of violations) {
      this.recordViolation(v);
    }

    const result: EvaluationResult = {
      allowed: !blocked,
      violations,
      warnings,
      auditEntries,
    };

    // Final audit entry summarising the outcome
    const outcomeEntry =
      `[${timestamp.toISOString()}] OUTCOME: ${result.allowed ? 'ALLOWED' : 'BLOCKED'} agent=${actionContext.agentId} action="${actionContext.action}" violations=${violations.length} warnings=${warnings.length}`;
    auditEntries.push(outcomeEntry);
    this.appendAuditLog(outcomeEntry);

    return result;
  }

  // ─── 6. getRules ──────────────────────────────────────────────────

  /**
   * Get rules, optionally filtered by type, severity, or active status.
   * Returns copies (not references) to prevent external mutation.
   */
  getRules(filter?: RuleFilter): ConstitutionalRule[] {
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

  // ─── 7. getViolations ─────────────────────────────────────────────

  /**
   * Get violation history for audit. Optionally filtered by agent ID
   * and/or a "since" timestamp.
   */
  getViolations(agentId?: string, since?: Date): ConstitutionalViolation[] {
    let result = this.violations;

    if (agentId) {
      result = result.filter((v) => v.agentId === agentId);
    }

    if (since) {
      result = result.filter((v) => v.timestamp >= since);
    }

    return result.map((v) => ({ ...v }));
  }

  // ─── 8. getRuleStats ──────────────────────────────────────────────

  /**
   * Return statistics about the constitutional rule system:
   * total rules, by type, by severity, violation counts.
   */
  getRuleStats(): RuleStats {
    const allRules = [...this.rules.values()];

    const byType: Record<RuleType, number> = {
      [RuleType.PROHIBITION]: 0,
      [RuleType.REQUIREMENT]: 0,
      [RuleType.CONSTRAINT]: 0,
      [RuleType.GUIDELINE]: 0,
    };

    const bySeverity: Record<RuleSeverity, number> = {
      [RuleSeverity.CRITICAL]: 0,
      [RuleSeverity.HIGH]: 0,
      [RuleSeverity.MEDIUM]: 0,
      [RuleSeverity.LOW]: 0,
    };

    const byEnforcement: Record<RuleEnforcement, number> = {
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
      } else {
        inactiveRules++;
      }
    }

    const violationsBySeverity: Record<RuleSeverity, number> = {
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

  // ─── 9. enforceBeforeExecution ─────────────────────────────────────

  /**
   * Convenience method that calls evaluate() and throws a
   * ConstitutionalBlockError if the action is blocked.
   * Returns the EvaluationResult otherwise.
   *
   * This is the primary method agents should call before executing
   * any action.
   */
  enforceBeforeExecution(
    agentId: string,
    action: string,
    payload?: any,
  ): EvaluationResult {
    const actionContext: ActionContext = {
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

      const message =
        `Action "${action}" by agent "${agentId}" blocked by constitutional rules: ${violationSummary}`;

      this.logger.error(message);

      throw new ConstitutionalBlockError(message, result);
    }

    return result;
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Evaluate all conditions of a rule against an action context.
   * Returns { matched, reason }.
   *
   * Conditions are AND-combined: ALL conditions must match for the
   * rule to be considered violated. This is the standard constitutional
   * interpretation — a prohibition with multiple conditions only fires
   * when every condition is true.
   */
  private evaluateConditions(
    rule: ConstitutionalRule,
    context: ActionContext,
  ): { matched: boolean; reason: string } {
    if (rule.conditions.length === 0) {
      // A rule with no conditions never matches (safety: don't block everything)
      return { matched: false, reason: '' };
    }

    const matchDetails: string[] = [];

    for (const condition of rule.conditions) {
      const fieldValue = this.resolveFieldValue(condition.field, context);
      const result = this.evaluateOperator(fieldValue, condition.operator, condition.value);

      if (!result) {
        // Condition did not match → rule is not violated
        return { matched: false, reason: '' };
      }

      matchDetails.push(
        `${condition.field}(${JSON.stringify(fieldValue)}) ${condition.operator} ${JSON.stringify(condition.value)}`,
      );
    }

    // All conditions matched
    const reason =
      `Rule "${rule.name}" triggered: ${matchDetails.join(' AND ')}`;

    return { matched: true, reason };
  }

  /**
   * Resolve a dotted field path against the action context.
   * Supports nested paths like "payload.size", "action.type".
   * Also supports direct top-level fields of ActionContext.
   */
  private resolveFieldValue(field: string, context: ActionContext): any {
    // Handle direct ActionContext fields
    const directFields: Record<string, any> = {
      agentId: context.agentId,
      action: context.action,
      actionType: context.actionType,
      resource: context.resource,
      payload: context.payload,
      target: context.target,
      environment: context.environment,
    };

    // If no dot, look up directly
    if (!field.includes('.')) {
      return directFields[field] ?? undefined;
    }

    // Dotted path — resolve step by step
    const parts = field.split('.');
    let current: any = directFields[parts[0]] ?? undefined;

    for (let i = 1; i < parts.length; i++) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = current[parts[i]];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Evaluate a single condition operator against the resolved field value.
   */
  private evaluateOperator(
    fieldValue: any,
    operator: RuleCondition['operator'],
    conditionValue: any,
  ): boolean {
    switch (operator) {
      case 'eq': {
        // Both null/undefined should match
        if (fieldValue === undefined && conditionValue === null) return true;
        if (fieldValue === null && conditionValue === null) return true;
        if (fieldValue === undefined && conditionValue === undefined) return true;
        return fieldValue === conditionValue;
      }
      case 'neq': {
        if (fieldValue === undefined && conditionValue === null) return false;
        if (fieldValue === null && conditionValue === null) return false;
        return fieldValue !== conditionValue;
      }
      case 'gt': {
        if (typeof fieldValue !== 'number' || typeof conditionValue !== 'number') return false;
        return fieldValue > conditionValue;
      }
      case 'lt': {
        if (typeof fieldValue !== 'number' || typeof conditionValue !== 'number') return false;
        return fieldValue < conditionValue;
      }
      case 'gte': {
        if (typeof fieldValue !== 'number' || typeof conditionValue !== 'number') return false;
        return fieldValue >= conditionValue;
      }
      case 'lte': {
        if (typeof fieldValue !== 'number' || typeof conditionValue !== 'number') return false;
        return fieldValue <= conditionValue;
      }
      case 'in': {
        if (!Array.isArray(conditionValue)) return false;
        return conditionValue.includes(fieldValue);
      }
      case 'contains': {
        if (typeof fieldValue !== 'string' || typeof conditionValue !== 'string') return false;
        return fieldValue.toLowerCase().includes(conditionValue.toLowerCase());
      }
      case 'regex': {
        if (typeof fieldValue !== 'string' || typeof conditionValue !== 'string') return false;
        try {
          const regex = new RegExp(conditionValue, 'i');
          return regex.test(fieldValue);
        } catch {
          // Invalid regex — don't match
          return false;
        }
      }
      default:
        return false;
    }
  }

  /**
   * Record a violation in the bounded violation history.
   */
  private recordViolation(violation: ConstitutionalViolation): void {
    this.violations.push({ ...violation });

    // Bound the violation history
    if (this.violations.length > MAX_VIOLATIONS) {
      this.violations.splice(0, this.violations.length - MAX_VIOLATIONS);
    }
  }

  /**
   * Append an entry to the bounded audit log.
   */
  private appendAuditLog(entry: string): void {
    this.auditLog.push(entry);

    // Bound the audit log
    if (this.auditLog.length > MAX_AUDIT_LOG) {
      this.auditLog.splice(0, this.auditLog.length - MAX_AUDIT_LOG);
    }
  }

  /**
   * Find rules that conflict with a proposed rule.
   *
   * Two rules conflict if:
   *  - Same type, same severity, and overlapping conditions that would
   *    create contradictory enforcement (e.g., one BLOCKs and one
   *    allows the same action).
   *  - Same ID (handled by the caller for addRule).
   *
   * The excludeId parameter allows self-exclusion during updates.
   */
  private findRuleConflicts(
    proposedRule: ConstitutionalRule,
    excludeId?: string,
  ): ConstitutionalRule[] {
    const conflicts: ConstitutionalRule[] = [];

    for (const existing of this.rules.values()) {
      // Skip self (for updates)
      if (excludeId && existing.id === excludeId) continue;
      // Skip inactive rules
      if (!existing.isActive && proposedRule.isActive !== false) continue;

      // Conflict: same type + same conditions + different enforcement
      // (would create ambiguous behaviour)
      if (
        existing.ruleType === proposedRule.ruleType &&
        existing.enforcement !== proposedRule.enforcement &&
        this.conditionsOverlap(existing.conditions, proposedRule.conditions)
      ) {
        conflicts.push(existing);
      }

      // Conflict: PROHIBITION and REQUIREMENT with the same target
      // (e.g., "must not do X" vs "must do X")
      if (
        existing.ruleType === RuleType.PROHIBITION &&
        proposedRule.ruleType === RuleType.REQUIREMENT &&
        this.conditionsOverlap(existing.conditions, proposedRule.conditions)
      ) {
        conflicts.push(existing);
      }

      if (
        existing.ruleType === RuleType.REQUIREMENT &&
        proposedRule.ruleType === RuleType.PROHIBITION &&
        this.conditionsOverlap(existing.conditions, proposedRule.conditions)
      ) {
        conflicts.push(existing);
      }
    }

    return conflicts;
  }

  /**
   * Check if two sets of conditions could ever match the same action.
   * This is a conservative approximation — if any condition in set A
   * directly contradicts a condition in set B on the same field, they
   * don't overlap. Otherwise, assume they might overlap.
   */
  private conditionsOverlap(
    conditionsA: RuleCondition[],
    conditionsB: RuleCondition[],
  ): boolean {
    // Build a map of field → condition for each set
    const mapA = new Map<string, RuleCondition[]>();
    for (const c of conditionsA) {
      if (!mapA.has(c.field)) mapA.set(c.field, []);
      mapA.get(c.field)!.push(c);
    }

    const mapB = new Map<string, RuleCondition[]>();
    for (const c of conditionsB) {
      if (!mapB.has(c.field)) mapB.set(c.field, []);
      mapB.get(c.field)!.push(c);
    }

    // Check shared fields for contradictions
    for (const field of mapA.keys()) {
      if (!mapB.has(field)) continue;

      const condsA = mapA.get(field)!;
      const condsB = mapB.get(field)!;

      // Check if any pair of conditions on the same field could both be true
      let anyCompatible = false;

      for (const cA of condsA) {
        for (const cB of condsB) {
          if (this.conditionsCompatible(cA, cB)) {
            anyCompatible = true;
            break;
          }
        }
        if (anyCompatible) break;
      }

      // If no pair on a shared field is compatible, there's no overlap
      if (!anyCompatible && condsA.length > 0 && condsB.length > 0) {
        return false;
      }
    }

    // If we didn't find a definitive contradiction, assume overlap is possible
    return true;
  }

  /**
   * Check if two conditions on the same field could both be true
   * for some value. This is a heuristic — we handle the most common
   * cases (eq/eq, eq/neq, eq/in, etc.) and default to true for
   * anything we can't definitively rule out.
   */
  private conditionsCompatible(a: RuleCondition, b: RuleCondition): boolean {
    // Same operator, same value → always compatible
    if (a.operator === b.operator && a.value === b.value) return true;

    // eq vs neq with same value → never compatible
    if (a.operator === 'eq' && b.operator === 'neq' && a.value === b.value) return false;
    if (a.operator === 'neq' && b.operator === 'eq' && a.value === b.value) return false;

    // eq vs eq with different values → never compatible
    if (a.operator === 'eq' && b.operator === 'eq' && a.value !== b.value) return false;

    // eq vs in → compatible if eq value is in the in-array
    if (a.operator === 'eq' && b.operator === 'in') {
      return Array.isArray(b.value) && b.value.includes(a.value);
    }
    if (a.operator === 'in' && b.operator === 'eq') {
      return Array.isArray(a.value) && a.value.includes(b.value);
    }

    // Default: assume compatible
    return true;
  }
}
