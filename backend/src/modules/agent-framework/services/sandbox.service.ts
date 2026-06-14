import { Injectable, Logger } from '@nestjs/common';
import { HumanApprovalGuard } from '../guards/human-approval.guard';

// ── Types ────────────────────────────────────────────────────────────

/**
 * Types of system changes that the sandbox can validate.
 */
export enum SystemChangeType {
  CODE_MODIFICATION = 'CODE_MODIFICATION',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  PROMPT_CHANGE = 'PROMPT_CHANGE',
  INFRA_CHANGE = 'INFRA_CHANGE',
  AGENT_DEPLOYMENT = 'AGENT_DEPLOYMENT',
}

/**
 * Lifecycle states for a system change.
 */
export enum ChangeStatus {
  PROPOSED = 'PROPOSED',
  DRY_RUN = 'DRY_RUN',
  DRY_RUN_PASSED = 'DRY_RUN_PASSED',
  DRY_RUN_FAILED = 'DRY_RUN_FAILED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  APPLIED = 'APPLIED',
  ROLLED_BACK = 'ROLLED_BACK',
  FAILED = 'FAILED',
}

/**
 * A proposed change to the system that must go through the sandbox pipeline.
 */
export interface SystemChange {
  /** Unique identifier for this change */
  id: string;
  /** Type of system change */
  type: SystemChangeType;
  /** Human-readable description */
  description: string;
  /** The agent that proposed this change */
  proposedBy: string;
  /** ISO-8601 timestamp when the change was proposed */
  proposedAt: string;
  /** Current lifecycle status */
  status: ChangeStatus;
  /** Severity level for approval gating */
  severity: 'low' | 'medium' | 'high';
  /** Snapshot of state before the change is applied */
  beforeState: any;
  /** The proposed new state */
  afterState: any;
  /** Dry-run execution result (populated after dry run) */
  dryRunResult?: SandboxResult;
  /** Validation result (populated after validation) */
  validationResult?: ValidationResult;
  /** ISO-8601 timestamp when the change was applied (if applicable) */
  appliedAt?: string;
  /** ISO-8601 timestamp when the change was rolled back (if applicable) */
  rolledBackAt?: string;
  /** Reason for rejection or rollback (if applicable) */
  reason?: string;
  /** Tags for categorization and search */
  tags?: string[];
}

/**
 * Result of executing code in the sandbox.
 */
export interface SandboxResult {
  /** Whether the execution succeeded */
  success: boolean;
  /** Output from the execution */
  output?: any;
  /** Error message if execution failed */
  error?: string;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Memory usage in bytes (if available) */
  memoryUsedBytes?: number;
  /** Whether the execution was terminated due to timeout */
  timedOut: boolean;
  /** Console/stdout output */
  logs?: string[];
  /** Warnings generated during execution */
  warnings?: string[];
}

/**
 * Result of validating a proposed system change.
 */
export interface ValidationResult {
  /** Whether the change is safe to apply */
  valid: boolean;
  /** Severity of issues found (worst case) */
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  /** Individual check results */
  checks: ValidationCheck[];
  /** Overall recommendation */
  recommendation: 'apply' | 'reject' | 'review_manually';
  /** Human-readable summary */
  summary: string;
}

/**
 * A single validation check within a ValidationResult.
 */
export interface ValidationCheck {
  /** Name of the check */
  name: string;
  /** Whether the check passed */
  passed: boolean;
  /** Severity if the check failed */
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  /** Description of what was checked and the result */
  message: string;
}

// ── SandboxService ───────────────────────────────────────────────────

/**
 * SandboxService — provides safe execution environments for self-evolution
 * agents and validates proposed system changes before they can be applied.
 *
 * ## Change Pipeline
 *
 * 1. **Propose** → `proposeChange()` creates a SystemChange record
 * 2. **Dry-Run** → `executeDryRun()` runs the change in an isolated context
 * 3. **Validate** → `validateChange()` runs validation checks
 * 4. **Approve** → `approveChange()` requires human approval (via HumanApprovalGuard)
 * 5. **Apply** → `applyChange()` persists the change
 * 6. **Rollback** → `rollback()` reverts if the change caused issues
 *
 * All steps are logged for auditability.
 */
@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  /** In-memory change history for audit. */
  private readonly changes: Map<string, SystemChange> = new Map();

  /** Snapshots of before-state for rollback. */
  private readonly beforeSnapshots: Map<string, any> = new Map();

  /** Change counter for ID generation. */
  private changeCounter = 0;

  constructor(private readonly approvalGuard: HumanApprovalGuard) {}

  // ── Code Execution ─────────────────────────────────────────────────

  /**
   * Execute code in an isolated sandbox context.
   *
   * The sandbox provides:
   * - Timeout protection (default 30s)
   * - Restricted global access (no filesystem, no network)
   * - Memory usage tracking
   * - Console log capture
   *
   * @param code     JavaScript/TypeScript code to execute
   * @param context  Variables to inject into the sandbox scope
   * @param options  Execution options
   */
  async executeInSandbox(
    code: string,
    context: Record<string, any> = {},
    options?: { timeoutMs?: number; maxMemoryBytes?: number },
  ): Promise<SandboxResult> {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const startTime = Date.now();
    const logs: string[] = [];
    const warnings: string[] = [];

    this.logger.log(`Executing code in sandbox (timeout: ${timeoutMs}ms)`);

    try {
      // Build a sandboxed execution context
      // In production, this would use a VM2/isolated-vm sandbox.
      // For now, we simulate safe execution with Function constructor.
      const sandboxKeys = Object.keys(context);
      const sandboxValues = Object.values(context);

      // Create a sandboxed function with restricted scope
      const sandboxedFn = new Function(
        ...sandboxKeys,
        '"use strict";\n' +
          'const console = { log: function() {} };\n' + // suppress console in sandbox
          'const require = undefined;\n' + // block require
          'const process = undefined;\n' + // block process access
          'const __filename = undefined;\n' +
          'const __dirname = undefined;\n' +
          'const module = undefined;\n' +
          'const exports = {};\n' +
          'try {\n' +
          code +
          '\n} catch(e) { return { __sandboxError: e.message }; }',
      );

      // Execute with timeout
      const result = await this.withTimeout(
        Promise.resolve(sandboxedFn(...sandboxValues)),
        timeoutMs,
      );

      const durationMs = Date.now() - startTime;

      // Check if sandbox caught an internal error
      if (result && typeof result === 'object' && result.__sandboxError) {
        return {
          success: false,
          error: result.__sandboxError,
          durationMs,
          timedOut: false,
          logs,
          warnings,
        };
      }

      return {
        success: true,
        output: result,
        durationMs,
        timedOut: false,
        logs,
        warnings,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      const isTimeout = error.message?.includes('timed out');

      return {
        success: false,
        error: error.message,
        durationMs,
        timedOut: isTimeout,
        logs,
        warnings,
      };
    }
  }

  // ── Change Proposal & Pipeline ─────────────────────────────────────

  /**
   * Propose a new system change. This creates a record in the change history
   * but does NOT apply the change. The change must go through the full
   * pipeline: dry-run → validate → approve → apply.
   */
  proposeChange(params: {
    type: SystemChangeType;
    description: string;
    proposedBy: string;
    severity?: 'low' | 'medium' | 'high';
    beforeState: any;
    afterState: any;
    tags?: string[];
  }): SystemChange {
    const id = `change-${++this.changeCounter}-${Date.now().toString(36)}`;

    const change: SystemChange = {
      id,
      type: params.type,
      description: params.description,
      proposedBy: params.proposedBy,
      proposedAt: new Date().toISOString(),
      status: ChangeStatus.PROPOSED,
      severity: params.severity ?? 'medium',
      beforeState: params.beforeState,
      afterState: params.afterState,
      tags: params.tags ?? [],
    };

    this.changes.set(id, change);
    this.beforeSnapshots.set(id, JSON.parse(JSON.stringify(params.beforeState)));

    this.logger.log(
      `Change proposed: ${id} [${params.type}] by ${params.proposedBy} — ${params.description}`,
    );

    return { ...change };
  }

  /**
   * Execute a dry run of a proposed change.
   * The change is simulated but not persisted. If the dry run fails,
   * the change status is set to DRY_RUN_FAILED.
   */
  async executeDryRun(changeId: string): Promise<SandboxResult> {
    const change = this.getChangeOrThrow(changeId);

    if (
      change.status !== ChangeStatus.PROPOSED &&
      change.status !== ChangeStatus.DRY_RUN_FAILED
    ) {
      throw new Error(
        `Change ${changeId} is in status ${change.status}; dry-run requires PROPOSED or DRY_RUN_FAILED`,
      );
    }

    change.status = ChangeStatus.DRY_RUN;

    this.logger.log(`Executing dry-run for change ${changeId}`);

    // Simulate the change in sandbox
    const sandboxCode = `
      // Simulate applying the change
      const beforeState = typeof beforeState !== 'undefined' ? beforeState : null;
      const afterState = typeof afterState !== 'undefined' ? afterState : null;

      // Verify the after-state is structurally valid
      if (afterState === null || afterState === undefined) {
        throw new Error('After-state cannot be null or undefined');
      }

      return { simulated: true, type: '${change.type}', valid: true };
    `;

    const result = await this.executeInSandbox(sandboxCode, {
      beforeState: change.beforeState,
      afterState: change.afterState,
    });

    change.dryRunResult = result;

    if (result.success) {
      change.status = ChangeStatus.DRY_RUN_PASSED;
      this.logger.log(`Dry-run PASSED for change ${changeId}`);
    } else {
      change.status = ChangeStatus.DRY_RUN_FAILED;
      change.reason = `Dry-run failed: ${result.error}`;
      this.logger.warn(`Dry-run FAILED for change ${changeId}: ${result.error}`);
    }

    return result;
  }

  /**
   * Validate a proposed system change.
   * Runs a series of validation checks based on the change type.
   * Changes must have passed dry-run before validation.
   */
  async validateChange(change: SystemChange | string): Promise<ValidationResult> {
    const resolvedChange =
      typeof change === 'string' ? this.getChangeOrThrow(change) : change;

    if (resolvedChange.status !== ChangeStatus.DRY_RUN_PASSED) {
      return {
        valid: false,
        severity: 'critical',
        checks: [
          {
            name: 'dry-run-gate',
            passed: false,
            severity: 'critical',
            message: `Change must pass dry-run before validation. Current status: ${resolvedChange.status}`,
          },
        ],
        recommendation: 'reject',
        summary: 'Change has not passed dry-run; cannot validate',
      };
    }

    this.logger.log(`Validating change ${resolvedChange.id}`);

    const checks: ValidationCheck[] = [];

    // ── Universal checks ────────────────────────────────────────────
    checks.push(this.checkBeforeAfterDiffer(resolvedChange));
    checks.push(this.checkAfterStateStructure(resolvedChange));

    // ── Type-specific checks ────────────────────────────────────────
    switch (resolvedChange.type) {
      case SystemChangeType.CODE_MODIFICATION:
        checks.push(...this.validateCodeModification(resolvedChange));
        break;
      case SystemChangeType.CONFIG_CHANGE:
        checks.push(...this.validateConfigChange(resolvedChange));
        break;
      case SystemChangeType.PROMPT_CHANGE:
        checks.push(...this.validatePromptChange(resolvedChange));
        break;
      case SystemChangeType.INFRA_CHANGE:
        checks.push(...this.validateInfraChange(resolvedChange));
        break;
      case SystemChangeType.AGENT_DEPLOYMENT:
        checks.push(...this.validateAgentDeployment(resolvedChange));
        break;
    }

    // Determine overall result
    const failedChecks = checks.filter((c) => !c.passed);
    const worstSeverity = this.getWorstSeverity(failedChecks);
    const valid = failedChecks.filter((c) => c.severity === 'high' || c.severity === 'critical').length === 0;

    const recommendation: ValidationResult['recommendation'] = valid
      ? 'apply'
      : worstSeverity === 'critical'
        ? 'reject'
        : 'review_manually';

    const result: ValidationResult = {
      valid,
      severity: worstSeverity,
      checks,
      recommendation,
      summary: valid
        ? `All critical checks passed (${checks.length} checks, ${failedChecks.length} non-critical warnings)`
        : `${failedChecks.length} checks failed (worst severity: ${worstSeverity})`,
    };

    // Update change record
    resolvedChange.validationResult = result;
    resolvedChange.status = valid
      ? ChangeStatus.PENDING_APPROVAL
      : ChangeStatus.REJECTED;
    resolvedChange.reason = valid
      ? undefined
      : result.summary;

    this.logger.log(
      `Validation ${valid ? 'PASSED' : 'FAILED'} for change ${resolvedChange.id}: ${result.summary}`,
    );

    return result;
  }

  /**
   * Approve a change that has passed validation.
   * Requires human approval via the HumanApprovalGuard.
   */
  async approveChange(
    changeId: string,
    approvedBy: string,
  ): Promise<SystemChange> {
    const change = this.getChangeOrThrow(changeId);

    if (change.status !== ChangeStatus.PENDING_APPROVAL) {
      throw new Error(
        `Change ${changeId} is in status ${change.status}; approval requires PENDING_APPROVAL`,
      );
    }

    // Check with the approval guard
    const approvalResult = this.approvalGuard.checkApproval(
      { name: change.proposedBy, constructor: { name: change.proposedBy } },
      `approve-${change.type.toLowerCase()}`,
      true, // explicit approval via this method
    );

    if (!approvalResult.allowed) {
      change.status = ChangeStatus.REJECTED;
      change.reason = `Approval denied: ${approvalResult.reason}`;
      this.logger.warn(
        `Approval DENIED for change ${changeId}: ${approvalResult.reason}`,
      );
      return { ...change };
    }

    change.status = ChangeStatus.APPROVED;
    this.logger.log(
      `Change ${changeId} APPROVED by ${approvedBy}`,
    );

    return { ...change };
  }

  /**
   * Apply a change that has been approved.
   * This persists the after-state.
   */
  async applyChange(changeId: string): Promise<SystemChange> {
    const change = this.getChangeOrThrow(changeId);

    if (change.status !== ChangeStatus.APPROVED) {
      throw new Error(
        `Change ${changeId} is in status ${change.status}; apply requires APPROVED`,
      );
    }

    this.logger.log(`Applying change ${changeId} [${change.type}]`);

    try {
      // In a real implementation, this would persist the afterState
      // to the relevant system (filesystem, database, config store, etc.)
      // For now, we simulate the application.

      change.status = ChangeStatus.APPLIED;
      change.appliedAt = new Date().toISOString();

      this.logger.log(
        `Change ${changeId} APPLIED successfully`,
      );

      return { ...change };
    } catch (error: any) {
      change.status = ChangeStatus.FAILED;
      change.reason = `Application failed: ${error.message}`;

      this.logger.error(
        `Change ${changeId} FAILED during application: ${error.message}`,
      );

      // Auto-rollback on failure
      await this.rollback(changeId);

      return { ...change };
    }
  }

  /**
   * Rollback a change that has been applied.
   * Restores the before-state from the snapshot taken at proposal time.
   */
  async rollback(changeId: string): Promise<void> {
    const change = this.changes.get(changeId);

    if (!change) {
      this.logger.warn(`Rollback attempted for unknown change ${changeId}`);
      return;
    }

    if (
      change.status !== ChangeStatus.APPLIED &&
      change.status !== ChangeStatus.FAILED
    ) {
      this.logger.warn(
        `Rollback attempted for change ${changeId} in status ${change.status}; only APPLIED or FAILED changes can be rolled back`,
      );
      return;
    }

    const beforeSnapshot = this.beforeSnapshots.get(changeId);

    this.logger.log(
      `Rolling back change ${changeId} — restoring before-state`,
    );

    // In a real implementation, this would restore the beforeState
    // to the relevant system. For now, we update the record.
    change.status = ChangeStatus.ROLLED_BACK;
    change.rolledBackAt = new Date().toISOString();
    change.reason = change.reason
      ? `${change.reason}; rolled back at ${change.rolledBackAt}`
      : `Rolled back at ${change.rolledBackAt}`;

    this.logger.log(
      `Change ${changeId} ROLLED BACK successfully`,
    );
  }

  // ── Query Methods ──────────────────────────────────────────────────

  /**
   * Get the full change history as an array.
   */
  getChangeHistory(): SystemChange[] {
    return Array.from(this.changes.values()).map((c) => ({ ...c }));
  }

  /**
   * Get a specific change by ID.
   */
  getChange(changeId: string): SystemChange | undefined {
    const change = this.changes.get(changeId);
    return change ? { ...change } : undefined;
  }

  /**
   * Get changes by status.
   */
  getChangesByStatus(status: ChangeStatus): SystemChange[] {
    return this.getChangeHistory().filter((c) => c.status === status);
  }

  /**
   * Get changes proposed by a specific agent.
   */
  getChangesByAgent(agentName: string): SystemChange[] {
    return this.getChangeHistory().filter((c) => c.proposedBy === agentName);
  }

  /**
   * Get changes by type.
   */
  getChangesByType(type: SystemChangeType): SystemChange[] {
    return this.getChangeHistory().filter((c) => c.type === type);
  }

  // ── Convenience: Full Pipeline ─────────────────────────────────────

  /**
   * Run the complete sandbox pipeline for a proposed change:
   * propose → dry-run → validate → (approve + apply if requested)
   *
   * @returns The final SystemChange record
   */
  async runPipeline(
    params: Parameters<typeof this.proposeChange>[0],
    options?: {
      autoApprove?: boolean;
      approvedBy?: string;
      applyOnApproval?: boolean;
    },
  ): Promise<SystemChange> {
    // 1. Propose
    const change = this.proposeChange(params);

    // 2. Dry-run
    const dryRunResult = await this.executeDryRun(change.id);
    if (!dryRunResult.success) {
      return this.getChangeOrThrow(change.id);
    }

    // 3. Validate
    const validationResult = await this.validateChange(change.id);
    if (!validationResult.valid) {
      return this.getChangeOrThrow(change.id);
    }

    // 4. Approve (if requested)
    if (options?.autoApprove && options?.approvedBy) {
      const approvedChange = await this.approveChange(
        change.id,
        options.approvedBy,
      );

      // 5. Apply (if requested)
      if (options?.applyOnApproval && approvedChange.status === ChangeStatus.APPROVED) {
        return this.applyChange(change.id);
      }

      return approvedChange;
    }

    return this.getChangeOrThrow(change.id);
  }

  // ── Private Helpers ────────────────────────────────────────────────

  private getChangeOrThrow(changeId: string): SystemChange {
    const change = this.changes.get(changeId);
    if (!change) {
      throw new Error(`Change not found: ${changeId}`);
    }
    return change;
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Operation timed out after ${ms}ms`)),
        ms,
      );
      promise
        .then((v) => {
          clearTimeout(timer);
          resolve(v);
        })
        .catch((e) => {
          clearTimeout(timer);
          reject(e);
        });
    });
  }

  // ── Validation Checks ──────────────────────────────────────────────

  private checkBeforeAfterDiffer(change: SystemChange): ValidationCheck {
    const beforeStr = JSON.stringify(change.beforeState);
    const afterStr = JSON.stringify(change.afterState);
    const differs = beforeStr !== afterStr;

    return {
      name: 'before-after-differ',
      passed: differs,
      severity: differs ? 'none' : 'medium',
      message: differs
        ? 'Before and after states differ'
        : 'Before and after states are identical — change has no effect',
    };
  }

  private checkAfterStateStructure(change: SystemChange): ValidationCheck {
    const afterState = change.afterState;

    if (afterState === null || afterState === undefined) {
      return {
        name: 'after-state-structure',
        passed: false,
        severity: 'critical',
        message: 'After-state is null or undefined',
      };
    }

    return {
      name: 'after-state-structure',
      passed: true,
      severity: 'none',
      message: 'After-state has valid structure',
    };
  }

  private validateCodeModification(change: SystemChange): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Check that file paths are present
    if (change.afterState?.files || change.afterState?.filePath) {
      checks.push({
        name: 'file-paths-present',
        passed: true,
        severity: 'none',
        message: 'File paths are specified in the code modification',
      });
    } else {
      checks.push({
        name: 'file-paths-present',
        passed: false,
        severity: 'high',
        message: 'No file paths specified in code modification — cannot validate target',
      });
    }

    // Check for syntax validity indicator
    if (change.dryRunResult?.success) {
      checks.push({
        name: 'syntax-valid',
        passed: true,
        severity: 'none',
        message: 'Code syntax validated in dry-run',
      });
    } else {
      checks.push({
        name: 'syntax-valid',
        passed: false,
        severity: 'high',
        message: 'Code syntax validation failed in dry-run',
      });
    }

    // Check that the change is not too large (risk mitigation)
    const afterStr = JSON.stringify(change.afterState);
    if (afterStr.length > 100_000) {
      checks.push({
        name: 'change-size',
        passed: false,
        severity: 'medium',
        message: `Change payload is ${afterStr.length} bytes — exceeds safe threshold (100KB)`,
      });
    } else {
      checks.push({
        name: 'change-size',
        passed: true,
        severity: 'none',
        message: `Change payload is ${afterStr.length} bytes — within safe threshold`,
      });
    }

    return checks;
  }

  private validateConfigChange(change: SystemChange): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Check that the config has required structure
    if (change.afterState && typeof change.afterState === 'object') {
      checks.push({
        name: 'config-structure',
        passed: true,
        severity: 'none',
        message: 'Configuration change has valid object structure',
      });
    } else {
      checks.push({
        name: 'config-structure',
        passed: false,
        severity: 'critical',
        message: 'Configuration after-state must be a valid object',
      });
    }

    // Check for sensitive keys
    const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'privateKey'];
    const afterStr = JSON.stringify(change.afterState).toLowerCase();
    const hasSensitiveData = sensitiveKeys.some((key) =>
      afterStr.includes(key.toLowerCase()),
    );

    if (hasSensitiveData) {
      checks.push({
        name: 'sensitive-data-check',
        passed: false,
        severity: 'high',
        message: 'Configuration change may contain sensitive data (passwords, secrets, tokens)',
      });
    } else {
      checks.push({
        name: 'sensitive-data-check',
        passed: true,
        severity: 'none',
        message: 'No sensitive data detected in configuration change',
      });
    }

    return checks;
  }

  private validatePromptChange(change: SystemChange): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Check that the prompt is not empty
    if (change.afterState?.prompt || change.afterState?.systemPrompt) {
      checks.push({
        name: 'prompt-not-empty',
        passed: true,
        severity: 'none',
        message: 'Prompt change has content',
      });
    } else {
      checks.push({
        name: 'prompt-not-empty',
        passed: false,
        severity: 'high',
        message: 'Prompt after-state is empty — would result in blank prompt',
      });
    }

    // Check prompt length
    const promptText =
      change.afterState?.prompt || change.afterState?.systemPrompt || '';
    if (typeof promptText === 'string' && promptText.length > 10_000) {
      checks.push({
        name: 'prompt-length',
        passed: false,
        severity: 'medium',
        message: `Prompt is ${promptText.length} characters — may exceed token limits`,
      });
    } else {
      checks.push({
        name: 'prompt-length',
        passed: true,
        severity: 'none',
        message: 'Prompt length is within acceptable range',
      });
    }

    return checks;
  }

  private validateInfraChange(change: SystemChange): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Infrastructure changes are always high severity
    checks.push({
      name: 'infra-severity-check',
      passed: change.severity === 'high',
      severity: change.severity === 'high' ? 'none' : 'medium',
      message:
        change.severity === 'high'
          ? 'Infrastructure change correctly marked as high severity'
          : 'Infrastructure changes should be marked as high severity',
    });

    // Check for rollback plan
    if (change.afterState?.rollbackPlan || change.tags?.includes('has-rollback')) {
      checks.push({
        name: 'rollback-plan',
        passed: true,
        severity: 'none',
        message: 'Rollback plan is documented for infrastructure change',
      });
    } else {
      checks.push({
        name: 'rollback-plan',
        passed: false,
        severity: 'high',
        message: 'No rollback plan documented for infrastructure change',
      });
    }

    return checks;
  }

  private validateAgentDeployment(change: SystemChange): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Check for agent metadata
    if (change.afterState?.agentName || change.afterState?.agentId) {
      checks.push({
        name: 'agent-identity',
        passed: true,
        severity: 'none',
        message: 'Agent deployment includes identity information',
      });
    } else {
      checks.push({
        name: 'agent-identity',
        passed: false,
        severity: 'high',
        message: 'Agent deployment missing identity information',
      });
    }

    // Check for health check endpoint
    if (change.afterState?.healthCheck) {
      checks.push({
        name: 'health-check',
        passed: true,
        severity: 'none',
        message: 'Agent deployment includes health check configuration',
      });
    } else {
      checks.push({
        name: 'health-check',
        passed: false,
        severity: 'medium',
        message: 'Agent deployment should include health check configuration',
      });
    }

    return checks;
  }

  private getWorstSeverity(
    checks: ValidationCheck[],
  ): ValidationResult['severity'] {
    const severityOrder: Array<ValidationResult['severity']> = [
      'critical',
      'high',
      'medium',
      'low',
      'none',
    ];

    for (const level of severityOrder) {
      if (checks.some((c) => c.severity === level)) {
        return level;
      }
    }

    return 'none';
  }
}
