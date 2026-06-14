import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  HUMAN_APPROVAL_KEY,
  HumanApprovalOptions,
  getHumanApprovalMetadata,
} from '../decorators/human-approval.decorator';

/**
 * Audit entry for every action that the HumanApprovalGuard evaluates.
 */
export interface ApprovalAuditEntry {
  /** ISO-8601 timestamp of the evaluation */
  timestamp: string;
  /** The handler or class name that was checked */
  target: string;
  /** Whether the action was allowed or blocked */
  decision: 'allowed' | 'blocked';
  /** Reason for the decision */
  reason: string;
  /** Metadata from the @RequiresHumanApproval() decorator (if any) */
  approvalOptions?: HumanApprovalOptions;
  /** Optional correlation / request ID */
  correlationId?: string;
}

/**
 * Actions that ALWAYS require human approval — these modify persistent state.
 */
const APPROVAL_REQUIRED_ACTIONS = [
  'generate-patch',
  'apply-patch',
  'test-patch',
  'validate-patch',
  'propose-refactor',
  'analyze-impact',
  'estimate-effort',
  'generate-plan',
  'approve-merge',
  'reject-merge',
  'run-certification',
  'verify-eqi',
] as const;

/**
 * Actions that do NOT require approval — these are read-only or
 * observational and cannot alter system state.
 */
const APPROVAL_EXEMPT_ACTIONS = [
  'analyze-metrics',
  'collect-baseline',
  'detect-anomaly',
  'generate-report',
  'detect-weaknesses',
  'assess-impact',
  'prioritize-weaknesses',
  'generate-improvement-plan',
] as const;

/**
 * HumanApprovalGuard — prevents self-evolution agents from making persistent
 * changes without explicit human approval.
 *
 * ## How it works
 *
 * 1. **Decorator-driven**: If a handler or class is annotated with
 *    `@RequiresHumanApproval()`, the guard checks whether the current request
 *    carries an `x-human-approval` header or an `approved: true` flag in the
 *    request body. If neither is present, the action is **blocked**.
 *
 * 2. **Action-based**: Even without the decorator, if the request body
 *    contains an `action` field that matches a known mutating action
 *    (e.g. `generate-patch`, `apply-patch`), the guard will enforce approval.
 *    Read-only actions (e.g. `analyze-metrics`, `detect-anomaly`) are exempt.
 *
 * 3. **Audit trail**: Every evaluation — whether allowed or blocked — is
 *    logged to an in-memory audit trail for later review.
 *
 * 4. **Graceful degradation**: If the guard is disabled via configuration,
 *    it still logs warnings for actions that *would* have been blocked.
 *    Safety mechanisms work even when the guard is not actively enforcing.
 */
@Injectable()
export class HumanApprovalGuard implements CanActivate {
  private readonly logger = new Logger(HumanApprovalGuard.name);

  /** In-memory audit trail of all approval evaluations. */
  private readonly auditLog: ApprovalAuditEntry[] = [];

  /** Whether the guard is actively enforcing (vs. logging-only). */
  private enabled = true;

  constructor(private readonly reflector: Reflector) {}

  /**
   * Enable or disable the guard.
   * When disabled, the guard still logs warnings but does not block actions.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.logger.warn(
      `HumanApprovalGuard ${enabled ? 'ENABLED' : 'DISABLED'} — ${
        enabled
          ? 'blocking unapproved actions'
          : 'logging only, actions will proceed'
      }`,
    );
  }

  /**
   * Returns whether the guard is currently enforcing.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Returns the full audit trail.
   */
  getAuditLog(): ApprovalAuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Clears the audit trail.
   */
  clearAuditLog(): void {
    this.auditLog.length = 0;
  }

  // ── CanActivate Implementation ──────────────────────────────────────

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const targetName = handler?.name || context.getClass()?.name || 'unknown';

    // 1. Check @RequiresHumanApproval() decorator on handler or class
    const approvalOptions = this.reflector.getAllAndOverride<HumanApprovalOptions>(
      HUMAN_APPROVAL_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. Determine the action from the request body
    const request = context.switchToHttp().getRequest();
    const action: string | undefined =
      request?.body?.action || request?.body?.config?.action;

    // 3. Determine if this action requires approval
    const requiresApproval = this.determineIfApprovalRequired(
      approvalOptions,
      action,
    );

    if (!requiresApproval) {
      // No approval needed — allow
      this.recordAudit({
        timestamp: new Date().toISOString(),
        target: targetName,
        decision: 'allowed',
        reason: 'Action does not require human approval',
        approvalOptions,
        correlationId: request?.headers?.['x-correlation-id'],
      });
      return true;
    }

    // 4. Check for explicit human approval in the request
    const hasApproval =
      request?.headers?.['x-human-approval'] === 'true' ||
      request?.body?.approved === true ||
      request?.query?.['human-approval'] === 'true';

    if (hasApproval) {
      this.recordAudit({
        timestamp: new Date().toISOString(),
        target: targetName,
        decision: 'allowed',
        reason: 'Explicit human approval provided',
        approvalOptions,
        correlationId: request?.headers?.['x-correlation-id'],
      });
      return true;
    }

    // 5. Block or warn depending on enabled state
    const blockReason = this.buildBlockReason(approvalOptions, action);

    if (this.enabled) {
      this.recordAudit({
        timestamp: new Date().toISOString(),
        target: targetName,
        decision: 'blocked',
        reason: blockReason,
        approvalOptions,
        correlationId: request?.headers?.['x-correlation-id'],
      });

      this.logger.warn(
        `BLOCKED: ${targetName} — ${blockReason}`,
      );

      throw new ForbiddenException(
        `Human approval required: ${blockReason}. ` +
          `Provide 'x-human-approval: true' header or 'approved: true' in the request body.`,
      );
    }

    // Guard is disabled — log warning but allow
    this.logger.warn(
      `WARNING (guard disabled): ${targetName} would have been blocked — ${blockReason}`,
    );

    this.recordAudit({
      timestamp: new Date().toISOString(),
      target: targetName,
      decision: 'allowed',
      reason: `Guard disabled — would have blocked: ${blockReason}`,
      approvalOptions,
      correlationId: request?.headers?.['x-correlation-id'],
    });

    return true;
  }

  // ── Programmatic Check (for non-HTTP agent execution) ─────────────

  /**
   * Programmatic check for whether an action requires human approval.
   * Used by SandboxService and agents that execute outside the HTTP pipeline.
   *
   * @param agentClass  The agent class (to check decorator metadata)
   * @param action      The action being performed
   * @param approved    Whether explicit approval has been granted
   * @returns Whether the action should proceed
   */
  checkApproval(
    agentClass: any,
    action: string,
    approved: boolean = false,
  ): { allowed: boolean; reason: string } {
    // Check decorator on agent class
    const approvalOptions = getHumanApprovalMetadata(agentClass);

    const requiresApproval = this.determineIfApprovalRequired(
      approvalOptions,
      action,
    );

    if (!requiresApproval) {
      return {
        allowed: true,
        reason: 'Action does not require human approval',
      };
    }

    if (approved) {
      this.recordAudit({
        timestamp: new Date().toISOString(),
        target: agentClass?.name || agentClass?.constructor?.name || 'unknown',
        decision: 'allowed',
        reason: 'Explicit human approval provided (programmatic)',
        approvalOptions,
      });
      return { allowed: true, reason: 'Approved' };
    }

    const blockReason = this.buildBlockReason(approvalOptions, action);

    if (this.enabled) {
      this.recordAudit({
        timestamp: new Date().toISOString(),
        target: agentClass?.name || agentClass?.constructor?.name || 'unknown',
        decision: 'blocked',
        reason: blockReason,
        approvalOptions,
      });

      return { allowed: false, reason: blockReason };
    }

    // Guard disabled — warn but allow
    this.logger.warn(
      `WARNING (guard disabled): Action "${action}" would have been blocked — ${blockReason}`,
    );

    this.recordAudit({
      timestamp: new Date().toISOString(),
      target: agentClass?.name || agentClass?.constructor?.name || 'unknown',
      decision: 'allowed',
      reason: `Guard disabled — would have blocked: ${blockReason}`,
      approvalOptions,
    });

    return { allowed: true, reason: `Guard disabled: ${blockReason}` };
  }

  // ── Internal Helpers ───────────────────────────────────────────────

  private determineIfApprovalRequired(
    options: HumanApprovalOptions | undefined,
    action: string | undefined,
  ): boolean {
    // If @RequiresHumanApproval() is present, always require approval
    if (options) {
      return true;
    }

    // If the action is in the explicitly exempt list, no approval needed
    if (action && (APPROVAL_EXEMPT_ACTIONS as readonly string[]).includes(action)) {
      return false;
    }

    // If the action is in the approval-required list, enforce it
    if (action && (APPROVAL_REQUIRED_ACTIONS as readonly string[]).includes(action)) {
      return true;
    }

    // Default: no decorator, unknown action — allow (conservative allow)
    return false;
  }

  private buildBlockReason(
    options: HumanApprovalOptions | undefined,
    action: string | undefined,
  ): string {
    const parts: string[] = [];

    if (options?.reason) {
      parts.push(options.reason);
    }

    if (options?.severity) {
      parts.push(`Severity: ${options.severity}`);
    }

    if (action) {
      parts.push(`Action: ${action}`);
    }

    if (parts.length === 0) {
      parts.push('Action requires human approval');
    }

    return parts.join(' | ');
  }

  private recordAudit(entry: ApprovalAuditEntry): void {
    this.auditLog.push(entry);

    // Keep audit log bounded — trim entries older than 10 000
    if (this.auditLog.length > 10_000) {
      this.auditLog.splice(0, this.auditLog.length - 10_000);
    }
  }
}
