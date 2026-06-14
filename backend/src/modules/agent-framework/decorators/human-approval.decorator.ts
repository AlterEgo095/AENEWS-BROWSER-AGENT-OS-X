import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for the @RequiresHumanApproval() decorator.
 * Stored on the handler/class via Reflect metadata so the
 * HumanApprovalGuard can read it at runtime.
 */
export const HUMAN_APPROVAL_KEY = 'requiresHumanApproval';

/**
 * Options for the @RequiresHumanApproval() decorator.
 */
export interface HumanApprovalOptions {
  /**
   * Human-readable reason why this action requires approval.
   * Shown in audit logs and approval prompts.
   */
  reason?: string;

  /**
   * Severity level of the action being guarded.
   * - `low`    : Informational changes (e.g., comment formatting)
   * - `medium` : Standard changes (e.g., config tweaks, prompt adjustments)
   * - `high`   : Destructive or wide-reaching changes (e.g., code modification,
   *              infrastructure changes, agent deployment)
   */
  severity?: 'low' | 'medium' | 'high';
}

/**
 * @RequiresHumanApproval(options?) — Method or class decorator that marks
 * an action as requiring human approval before it can make persistent changes.
 *
 * Used by the HumanApprovalGuard to block unapproved self-evolution actions.
 * Also consumed by the SandboxService to enforce approval checks for
 * programmatic agent execution.
 *
 * Usage:
 *   @RequiresHumanApproval({ reason: 'Generates code patches', severity: 'high' })
 *   async generatePatch() { ... }
 *
 *   @RequiresHumanApproval()  // defaults: severity='medium'
 *   async execute() { ... }
 */
export const RequiresHumanApproval = (
  options?: HumanApprovalOptions,
): MethodDecorator & ClassDecorator => {
  const resolved: HumanApprovalOptions = {
    severity: options?.severity ?? 'medium',
    reason: options?.reason,
  };

  return SetMetadata(HUMAN_APPROVAL_KEY, resolved) as any;
};

/**
 * Retrieve the human-approval metadata from a target (class or method).
 * Returns `undefined` if the decorator was not applied.
 */
export function getHumanApprovalMetadata(
  target: any,
  propertyKey?: string,
): HumanApprovalOptions | undefined {
  if (propertyKey) {
    return Reflect.getMetadata(HUMAN_APPROVAL_KEY, target, propertyKey);
  }
  return (
    Reflect.getMetadata(HUMAN_APPROVAL_KEY, target) ??
    Reflect.getMetadata(HUMAN_APPROVAL_KEY, target.constructor)
  );
}
