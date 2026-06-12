/**
 * AENEWS Agent OS X - Auto Recovery Service
 *
 * When an agent fails, this service orchestrates the full recovery pipeline:
 *   Health Check → Detect Failure → Restart → Restore Memory → Resume Task
 *
 * No human intervention required — unless auto-recovery is exhausted, in which
 * case the service escalates to a human operator.
 *
 * Recovery strategies range from a simple restart all the way to quarantine,
 * with policy-driven configuration per failure type.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// ─── Type Definitions ──────────────────────────────────────────────

export enum FailureType {
  CRASH = 'crash',
  TIMEOUT = 'timeout',
  OOM = 'oom',
  CIRCUIT_BREAKER_OPEN = 'circuit_breaker_open',
  HEALTH_CHECK_FAILED = 'health_check_failed',
  UNHANDLED_EXCEPTION = 'unhandled_exception',
  DEADLOCK = 'deadlock',
  DEPENDENCY_FAILURE = 'dependency_failure',
}

export enum RecoveryStrategy {
  RESTART = 'restart',                             // Simple restart
  RESTORE_MEMORY_RESUME = 'restore_memory_resume', // Restart + restore memory + resume task
  FAILOVER = 'failover',                           // Switch to backup agent
  SCALE_OUT = 'scale_out',                         // Create new agent instance
  DEGRADE = 'degrade',                             // Continue with reduced functionality
  QUARANTINE = 'quarantine',                       // Isolate the failing agent
}

export enum RecoveryStatus {
  DETECTED = 'detected',
  ANALYZING = 'analyzing',
  RECOVERING = 'recovering',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  ESCALATED = 'escalated',
}

export interface AutoRecoveryAction {
  id: string;
  agentId: string;
  failureType: FailureType;
  failureDescription: string;
  detectionTime: Date;
  recoveryStrategy: RecoveryStrategy;
  status: RecoveryStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: Date | null;
  result: string | null;
  taskId: string | null;
  memorySnapshotId: string | null;
  escalationReason: string | null;
  metadata: Record<string, any>;
}

export interface RecoveryPolicy {
  failureType: FailureType;
  strategy: RecoveryStrategy;
  maxAttempts: number;
  cooldownMs: number;
  escalationAfterAttempts: number;
  autoRestart: boolean;
  preserveMemory: boolean;
}

export interface RecoveryContext {
  agentId: string;
  failureType: FailureType;
  taskId?: string;
  errorMessage?: string;
  stackTrace?: string;
  memoryState?: any;
  lastKnownGoodState?: any;
}

export interface MemorySnapshot {
  id: string;
  agentId: string;
  timestamp: Date;
  state: any;
  taskId: string | null;
  metadata: Record<string, any>;
}

export interface AgentHealthStatus {
  agentId: string;
  healthy: boolean;
  lastChecked: Date;
  issues: string[];
  metrics: {
    responseTimeMs: number;
    errorRate: number;
    memoryUsageMb: number;
    cpuUsagePercent: number;
    taskQueueDepth: number;
  };
}

export interface RecoveryStats {
  totalRecoveries: number;
  byFailureType: Record<string, number>;
  byStrategy: Record<string, number>;
  byStatus: Record<string, number>;
  successRate: number;
  averageRecoveryTimeMs: number;
  totalEscalations: number;
  activeRecoveryCount: number;
}

export interface EscalationRecord {
  id: string;
  actionId: string;
  agentId: string;
  failureType: FailureType;
  reason: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
}

// ─── Event types emitted by the service ────────────────────────────

export const RECOVERY_STARTED = 'recovery.started';
export const RECOVERY_SUCCEEDED = 'recovery.succeeded';
export const RECOVERY_FAILED = 'recovery.failed';
export const RECOVERY_ESCALATED = 'recovery.escalated';
export const HEALTH_CHECK_FAILED_EVENT = 'health_check.failed';
export const MEMORY_SNAPSHOT_TAKEN = 'memory.snapshot_taken';
export const MEMORY_RESTORED = 'memory.restored';

export interface RecoveryEventPayload {
  actionId: string;
  agentId: string;
  failureType: FailureType;
  strategy: RecoveryStrategy;
  timestamp: number;
  [key: string]: any;
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_HISTORY_SIZE = 10_000;
const MAX_ESCALATION_RECORDS = 5_000;
const MAX_SNAPSHOTS_PER_AGENT = 10;
const HEALTH_CHECK_INTERVAL_MS = 30_000; // 30 seconds

// ─── Service ────────────────────────────────────────────────────────

@Injectable()
export class AutoRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(AutoRecoveryService.name);

  /** action id → AutoRecoveryAction */
  private readonly actions: Map<string, AutoRecoveryAction> = new Map();

  /** failure type → RecoveryPolicy */
  private readonly policies: Map<FailureType, RecoveryPolicy> = new Map();

  /** snapshot id → MemorySnapshot */
  private readonly snapshots: Map<string, MemorySnapshot> = new Map();

  /** agent id → array of snapshot ids (most recent last) */
  private readonly agentSnapshots: Map<string, string[]> = new Map();

  /** Completed / historical actions (bounded) */
  private readonly history: AutoRecoveryAction[] = [];

  /** Escalation records (bounded) */
  private readonly escalations: EscalationRecord[] = [];

  /** agent id → latest health status */
  private readonly healthStatuses: Map<string, AgentHealthStatus> = new Map();

  /** agent id → degraded flag */
  private readonly degradedAgents: Set<string> = new Set();

  /** agent id → quarantined flag */
  private readonly quarantinedAgents: Set<string> = new Set();

  /** agent id → agent capabilities (for failover lookup) */
  private readonly agentCapabilities: Map<string, string[]> = new Map();

  /** agent id → running state (for restart simulation) */
  private readonly agentRunningState: Map<string, 'running' | 'stopped' | 'initializing'> = new Map();

  /** Simple event listeners — in production this would use an EventBus */
  private readonly eventListeners: Map<string, Array<(payload: RecoveryEventPayload) => void>> = new Map();

  /** Health check interval handle */
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  /** Track recovery durations for stats */
  private readonly recoveryDurations: number[] = [];

  // ─── Lifecycle ────────────────────────────────────────────────────

  onModuleInit(): void {
    this.initialize();
    this.startHealthCheckLoop();
    this.logger.log('AutoRecoveryService initialised');
  }

  // ─── Event helpers ────────────────────────────────────────────────

  /**
   * Register a listener for a recovery event.
   * Returns an unsubscribe function.
   */
  on(
    event: string,
    listener: (payload: RecoveryEventPayload) => void,
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      }
    };
  }

  private emitEvent(event: string, payload: RecoveryEventPayload): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(payload);
        } catch (err) {
          this.logger.warn(`Event listener error on "${event}": ${err}`);
        }
      }
    }
  }

  // ─── 1. initialize ────────────────────────────────────────────────

  /**
   * Load default recovery policies for each FailureType.
   * These policies define the strategy, max attempts, cooldown, and
   * escalation threshold for every category of failure the system
   * can encounter.
   */
  initialize(): void {
    this.logger.log('Loading default recovery policies...');

    const defaultPolicies: RecoveryPolicy[] = [
      {
        failureType: FailureType.CRASH,
        strategy: RecoveryStrategy.RESTORE_MEMORY_RESUME,
        maxAttempts: 3,
        cooldownMs: 5_000,
        escalationAfterAttempts: 3,
        autoRestart: true,
        preserveMemory: true,
      },
      {
        failureType: FailureType.TIMEOUT,
        strategy: RecoveryStrategy.RESTART,
        maxAttempts: 3,
        cooldownMs: 10_000,
        escalationAfterAttempts: 3,
        autoRestart: true,
        preserveMemory: false,
      },
      {
        failureType: FailureType.OOM,
        strategy: RecoveryStrategy.RESTART,
        maxAttempts: 2,
        cooldownMs: 15_000,
        escalationAfterAttempts: 2,
        autoRestart: true,
        preserveMemory: false,
      },
      {
        failureType: FailureType.CIRCUIT_BREAKER_OPEN,
        strategy: RecoveryStrategy.FAILOVER,
        maxAttempts: 3,
        cooldownMs: 30_000,
        escalationAfterAttempts: 2,
        autoRestart: false,
        preserveMemory: true,
      },
      {
        failureType: FailureType.HEALTH_CHECK_FAILED,
        strategy: RecoveryStrategy.RESTORE_MEMORY_RESUME,
        maxAttempts: 3,
        cooldownMs: 10_000,
        escalationAfterAttempts: 3,
        autoRestart: true,
        preserveMemory: true,
      },
      {
        failureType: FailureType.UNHANDLED_EXCEPTION,
        strategy: RecoveryStrategy.RESTORE_MEMORY_RESUME,
        maxAttempts: 2,
        cooldownMs: 5_000,
        escalationAfterAttempts: 2,
        autoRestart: true,
        preserveMemory: true,
      },
      {
        failureType: FailureType.DEADLOCK,
        strategy: RecoveryStrategy.RESTART,
        maxAttempts: 2,
        cooldownMs: 20_000,
        escalationAfterAttempts: 2,
        autoRestart: true,
        preserveMemory: false,
      },
      {
        failureType: FailureType.DEPENDENCY_FAILURE,
        strategy: RecoveryStrategy.FAILOVER,
        maxAttempts: 3,
        cooldownMs: 15_000,
        escalationAfterAttempts: 2,
        autoRestart: false,
        preserveMemory: true,
      },
    ];

    for (const policy of defaultPolicies) {
      this.policies.set(policy.failureType, { ...policy });
    }

    this.logger.log(`Loaded ${defaultPolicies.length} default recovery policies`);
  }

  // ─── 2. detectFailure ─────────────────────────────────────────────

  /**
   * Called when a failure is detected. Creates an AutoRecoveryAction,
   * determines the strategy from the matching policy, and begins the
   * recovery process immediately.
   *
   * @returns The created AutoRecoveryAction
   */
  detectFailure(
    agentId: string,
    failureType: FailureType,
    context?: RecoveryContext,
  ): AutoRecoveryAction {
    const policy = this.policies.get(failureType);
    if (!policy) {
      this.logger.error(
        `No recovery policy found for failure type "${failureType}". Using default RESTART strategy.`,
      );
    }

    const strategy = policy?.strategy ?? RecoveryStrategy.RESTART;
    const maxAttempts = policy?.maxAttempts ?? 2;

    // Build a human-readable description
    const failureDescription = this.buildFailureDescription(agentId, failureType, context);

    const actionId = this.generateActionId();

    const action: AutoRecoveryAction = {
      id: actionId,
      agentId,
      failureType,
      failureDescription,
      detectionTime: new Date(),
      recoveryStrategy: strategy,
      status: RecoveryStatus.DETECTED,
      attempts: 0,
      maxAttempts,
      lastAttemptAt: null,
      result: null,
      taskId: context?.taskId ?? null,
      memorySnapshotId: null,
      escalationReason: null,
      metadata: {
        errorMessage: context?.errorMessage ?? null,
        stackTrace: context?.stackTrace ?? null,
        policySnapshot: policy ? { ...policy } : null,
      },
    };

    this.actions.set(actionId, action);

    this.logger.warn(
      `Failure detected: agent="${agentId}" type=${failureType} strategy=${strategy} action=${actionId}`,
    );

    this.emitEvent(RECOVERY_STARTED, {
      actionId,
      agentId,
      failureType,
      strategy,
      timestamp: Date.now(),
    });

    // Begin recovery immediately
    this.executeRecovery(actionId);

    return { ...action };
  }

  // ─── 3. executeRecovery ───────────────────────────────────────────

  /**
   * THE CORE METHOD. Execute the recovery strategy for the given action.
   *
   * Strategies:
   *   RESTART               — Stop agent, reinitialize, start
   *   RESTORE_MEMORY_RESUME — Snapshot memory, restart agent, restore memory, resume task
   *   FAILOVER              — Find alternative agent with same capabilities, transfer task
   *   SCALE_OUT             — Create new agent instance
   *   DEGRADE               — Mark agent as degraded, reduce capabilities
   *   QUARANTINE            — Isolate agent, prevent it from receiving new tasks
   */
  async executeRecovery(actionId: string): Promise<void> {
    const action = this.actions.get(actionId);
    if (!action) {
      this.logger.error(`Cannot execute recovery — action "${actionId}" not found`);
      return;
    }

    // Guard: if already succeeded, do not re-execute
    if (action.status === RecoveryStatus.SUCCEEDED) {
      this.logger.warn(`Action "${actionId}" already succeeded — skipping re-execution`);
      return;
    }

    // Guard: if escalated, do not re-execute
    if (action.status === RecoveryStatus.ESCALATED) {
      this.logger.warn(`Action "${actionId}" is escalated — requires human intervention`);
      return;
    }

    const policy = this.policies.get(action.failureType);
    const cooldownMs = policy?.cooldownMs ?? 5_000;

    // If this is a retry, apply cooldown
    if (action.attempts > 0 && action.lastAttemptAt) {
      const elapsed = Date.now() - action.lastAttemptAt.getTime();
      if (elapsed < cooldownMs) {
        const waitMs = cooldownMs - elapsed;
        this.logger.log(
          `Cooldown in effect for action "${actionId}" — waiting ${waitMs}ms before retry`,
        );
        await this.sleep(waitMs);
      }
    }

    // Transition to ANALYZING
    action.status = RecoveryStatus.ANALYZING;
    this.logger.log(
      `Analyzing failure for action "${actionId}": agent="${action.agentId}" type=${action.failureType}`,
    );

    // Transition to RECOVERING
    action.status = RecoveryStatus.RECOVERING;
    action.attempts++;
    action.lastAttemptAt = new Date();

    const recoveryStart = Date.now();

    try {
      switch (action.recoveryStrategy) {
        case RecoveryStrategy.RESTART:
          await this.executeRestart(action);
          break;

        case RecoveryStrategy.RESTORE_MEMORY_RESUME:
          await this.executeRestoreMemoryResume(action);
          break;

        case RecoveryStrategy.FAILOVER:
          await this.executeFailover(action);
          break;

        case RecoveryStrategy.SCALE_OUT:
          await this.executeScaleOut(action);
          break;

        case RecoveryStrategy.DEGRADE:
          await this.executeDegrade(action);
          break;

        case RecoveryStrategy.QUARANTINE:
          await this.executeQuarantine(action);
          break;

        default:
          throw new Error(`Unknown recovery strategy: ${action.recoveryStrategy}`);
      }

      // Record recovery duration
      const duration = Date.now() - recoveryStart;
      this.recoveryDurations.push(duration);
      if (this.recoveryDurations.length > MAX_HISTORY_SIZE) {
        this.recoveryDurations.splice(0, this.recoveryDurations.length - MAX_HISTORY_SIZE);
      }

      action.result = `Recovery succeeded via ${action.recoveryStrategy} in ${duration}ms`;
      this.handleRecoverySuccess(actionId);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Recovery attempt ${action.attempts}/${action.maxAttempts} failed for action "${actionId}": ${errMsg}`,
      );

      action.result = `Attempt ${action.attempts} failed: ${errMsg}`;
      this.handleRecoveryFailure(actionId);
    }
  }

  // ─── 4. handleRecoverySuccess ─────────────────────────────────────

  /**
   * Process a successful recovery. Updates the action status to SUCCEEDED,
   * records the action in history, clears any transient failure state for
   * the agent, and emits the RECOVERY_SUCCEEDED event.
   */
  handleRecoverySuccess(actionId: string): void {
    const action = this.actions.get(actionId);
    if (!action) {
      this.logger.error(`Cannot handle recovery success — action "${actionId}" not found`);
      return;
    }

    action.status = RecoveryStatus.SUCCEEDED;

    // Clear degraded / quarantined state if the agent was recovered
    if (action.recoveryStrategy !== RecoveryStrategy.QUARANTINE) {
      this.degradedAgents.delete(action.agentId);
    }

    // Move to history
    this.addToHistory(action);
    this.actions.delete(actionId);

    this.logger.log(
      `Recovery succeeded: action="${actionId}" agent="${action.agentId}" strategy=${action.recoveryStrategy} attempts=${action.attempts}`,
    );

    this.emitEvent(RECOVERY_SUCCEEDED, {
      actionId,
      agentId: action.agentId,
      failureType: action.failureType,
      strategy: action.recoveryStrategy,
      timestamp: Date.now(),
      attempts: action.attempts,
    });
  }

  // ─── 5. handleRecoveryFailure ─────────────────────────────────────

  /**
   * Process a failed recovery attempt. If the action has remaining
   * attempts, schedule a retry after cooldown. If all attempts are
   * exhausted, escalate to human.
   */
  handleRecoveryFailure(actionId: string): void {
    const action = this.actions.get(actionId);
    if (!action) {
      this.logger.error(`Cannot handle recovery failure — action "${actionId}" not found`);
      return;
    }

    const policy = this.policies.get(action.failureType);

    if (action.attempts < action.maxAttempts) {
      // Still have retries remaining — schedule another attempt
      const cooldownMs = policy?.cooldownMs ?? 5_000;

      this.logger.warn(
        `Recovery attempt ${action.attempts}/${action.maxAttempts} failed for agent "${action.agentId}". ` +
        `Retrying after ${cooldownMs}ms cooldown...`,
      );

      action.status = RecoveryStatus.RECOVERING;

      // Schedule retry (fire-and-forget — in production use a scheduler)
      setTimeout(() => {
        this.executeRecovery(actionId).catch((err) => {
          this.logger.error(`Scheduled retry failed for action "${actionId}": ${err}`);
        });
      }, cooldownMs);
    } else {
      // All attempts exhausted — mark as failed and escalate
      action.status = RecoveryStatus.FAILED;

      this.logger.error(
        `All ${action.maxAttempts} recovery attempts exhausted for agent "${action.agentId}" ` +
        `(failure: ${action.failureType}). Escalating to human.`,
      );

      // Check if we should escalate before the escalation threshold
      const escalationAfter = policy?.escalationAfterAttempts ?? action.maxAttempts;
      if (action.attempts >= escalationAfter) {
        this.escalate(actionId);
      }
    }
  }

  // ─── 6. escalate ──────────────────────────────────────────────────

  /**
   * Escalate to a human when auto-recovery fails. Creates an escalation
   * record, marks the action as ESCALATED, and emits the
   * RECOVERY_ESCALATED event.
   */
  escalate(actionId: string): EscalationRecord {
    const action = this.actions.get(actionId);
    if (!action) {
      throw new Error(`Cannot escalate — action "${actionId}" not found`);
    }

    action.status = RecoveryStatus.ESCALATED;

    const escalationReason =
      `Auto-recovery failed after ${action.attempts} attempts. ` +
      `Failure type: ${action.failureType}. Strategy: ${action.recoveryStrategy}. ` +
      `Last result: ${action.result ?? 'unknown'}`;

    action.escalationReason = escalationReason;

    const escalation: EscalationRecord = {
      id: this.generateEscalationId(),
      actionId,
      agentId: action.agentId,
      failureType: action.failureType,
      reason: escalationReason,
      timestamp: new Date(),
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
    };

    this.escalations.push(escalation);

    // Bound escalation records
    if (this.escalations.length > MAX_ESCALATION_RECORDS) {
      this.escalations.splice(0, this.escalations.length - MAX_ESCALATION_RECORDS);
    }

    // Move action to history
    this.addToHistory(action);
    this.actions.delete(actionId);

    this.logger.error(
      `ESCALATION: action="${actionId}" agent="${action.agentId}" — ${escalationReason}`,
    );

    this.emitEvent(RECOVERY_ESCALATED, {
      actionId,
      agentId: action.agentId,
      failureType: action.failureType,
      strategy: action.recoveryStrategy,
      timestamp: Date.now(),
      escalationId: escalation.id,
      reason: escalationReason,
    });

    return { ...escalation };
  }

  // ─── 7. getRecoveryAction ─────────────────────────────────────────

  /**
   * Get a recovery action by its ID. Returns null if not found
   * among active actions or history.
   */
  getRecoveryAction(actionId: string): AutoRecoveryAction | null {
    // Check active actions first
    const active = this.actions.get(actionId);
    if (active) return { ...active };

    // Then check history
    const historical = this.history.find((a) => a.id === actionId);
    if (historical) return { ...historical };

    return null;
  }

  // ─── 8. getActiveRecoveries ───────────────────────────────────────

  /**
   * Get all currently active recovery actions (not yet completed,
   * failed, or escalated).
   */
  getActiveRecoveries(): AutoRecoveryAction[] {
    return [...this.actions.values()].map((a) => ({ ...a }));
  }

  // ─── 9. getRecoveryHistory ────────────────────────────────────────

  /**
   * Get recovery history for audit. Optionally filtered by agent ID.
   * Returns actions that have completed (succeeded, failed, or escalated).
   */
  getRecoveryHistory(agentId?: string): AutoRecoveryAction[] {
    let result = this.history;

    if (agentId) {
      result = result.filter((a) => a.agentId === agentId);
    }

    return result.map((a) => ({ ...a }));
  }

  // ─── 10. getRecoveryPolicies ──────────────────────────────────────

  /**
   * Get all recovery policies currently configured.
   */
  getRecoveryPolicies(): RecoveryPolicy[] {
    return [...this.policies.values()].map((p) => ({ ...p }));
  }

  // ─── 11. updatePolicy ─────────────────────────────────────────────

  /**
   * Update a recovery policy for a given failure type.
   * Validates the policy before applying.
   */
  updatePolicy(failureType: FailureType, policy: Partial<RecoveryPolicy>): RecoveryPolicy {
    const existing = this.policies.get(failureType);

    if (!existing) {
      // Creating a new policy for this failure type
      if (!policy.strategy) {
        throw new Error(`New policy for "${failureType}" must specify a strategy`);
      }

      const newPolicy: RecoveryPolicy = {
        failureType,
        strategy: policy.strategy,
        maxAttempts: policy.maxAttempts ?? 3,
        cooldownMs: policy.cooldownMs ?? 5_000,
        escalationAfterAttempts: policy.escalationAfterAttempts ?? 3,
        autoRestart: policy.autoRestart ?? true,
        preserveMemory: policy.preserveMemory ?? false,
      };

      this.policies.set(failureType, newPolicy);
      this.logger.log(`Created new recovery policy for failure type "${failureType}"`);

      return { ...newPolicy };
    }

    // Merge updates into the existing policy
    const updated: RecoveryPolicy = {
      ...existing,
      ...policy,
      failureType, // failureType is the identity key — never change it
    };

    // Validate
    if (!Object.values(RecoveryStrategy).includes(updated.strategy)) {
      throw new Error(`Invalid recovery strategy: ${updated.strategy}`);
    }
    if (updated.maxAttempts < 1) {
      throw new Error('maxAttempts must be >= 1');
    }
    if (updated.cooldownMs < 0) {
      throw new Error('cooldownMs must be >= 0');
    }
    if (updated.escalationAfterAttempts < 1) {
      throw new Error('escalationAfterAttempts must be >= 1');
    }

    this.policies.set(failureType, updated);
    this.logger.log(
      `Updated recovery policy for failure type "${failureType}": strategy=${updated.strategy} maxAttempts=${updated.maxAttempts}`,
    );

    return { ...updated };
  }

  // ─── 12. getRecoveryStats ─────────────────────────────────────────

  /**
   * Compute and return recovery statistics:
   *   - total recoveries
   *   - by failure type, strategy, and status
   *   - success rate
   *   - average recovery time
   *   - total escalations
   *   - currently active count
   */
  getRecoveryStats(): RecoveryStats {
    const allActions = [...this.history, ...this.actions.values()];

    const byFailureType: Record<string, number> = {};
    const byStrategy: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    let succeeded = 0;
    let total = allActions.length;

    for (const action of allActions) {
      byFailureType[action.failureType] = (byFailureType[action.failureType] ?? 0) + 1;
      byStrategy[action.recoveryStrategy] = (byStrategy[action.recoveryStrategy] ?? 0) + 1;
      byStatus[action.status] = (byStatus[action.status] ?? 0) + 1;

      if (action.status === RecoveryStatus.SUCCEEDED) {
        succeeded++;
      }
    }

    const successRate = total > 0 ? succeeded / total : 0;

    const averageRecoveryTimeMs =
      this.recoveryDurations.length > 0
        ? this.recoveryDurations.reduce((sum, d) => sum + d, 0) / this.recoveryDurations.length
        : 0;

    return {
      totalRecoveries: total,
      byFailureType,
      byStrategy,
      byStatus,
      successRate,
      averageRecoveryTimeMs,
      totalEscalations: this.escalations.length,
      activeRecoveryCount: this.actions.size,
    };
  }

  // ─── 13. performHealthChecks ──────────────────────────────────────

  /**
   * Proactively check agent health. Detect issues before they become
   * failures. If an agent is unhealthy, preemptively start recovery.
   *
   * @returns Array of health statuses for all known agents
   */
  performHealthChecks(): AgentHealthStatus[] {
    const results: AgentHealthStatus[] = [];

    for (const [agentId, runningState] of this.agentRunningState.entries()) {
      const status = this.checkAgentHealth(agentId, runningState);
      this.healthStatuses.set(agentId, status);
      results.push(status);

      // If unhealthy and not already being recovered, preemptively start recovery
      if (!status.healthy) {
        const hasActiveRecovery = [...this.actions.values()].some(
          (a) => a.agentId === agentId,
        );

        if (!hasActiveRecovery) {
          this.logger.warn(
            `Preemptive recovery triggered: agent="${agentId}" is unhealthy — ${status.issues.join(', ')}`,
          );

          this.emitEvent(HEALTH_CHECK_FAILED_EVENT, {
            actionId: '',
            agentId,
            failureType: FailureType.HEALTH_CHECK_FAILED,
            strategy: RecoveryStrategy.RESTART,
            timestamp: Date.now(),
            issues: status.issues,
          });

          this.detectFailure(agentId, FailureType.HEALTH_CHECK_FAILED, {
            agentId,
            failureType: FailureType.HEALTH_CHECK_FAILED,
            errorMessage: `Health check failed: ${status.issues.join('; ')}`,
          });
        }
      }
    }

    return results;
  }

  // ─── 14. snapshotAgentMemory ──────────────────────────────────────

  /**
   * Take a snapshot of agent memory for recovery purposes.
   * Returns the snapshot ID. Snapshots are bounded per agent
   * (oldest are pruned when the limit is exceeded).
   */
  snapshotAgentMemory(agentId: string): string {
    const snapshotId = this.generateSnapshotId();

    // Retrieve the agent's current memory state
    // In production this would call the agent's memory export API
    const memoryState = this.agentRunningState.get(agentId) ?? {};

    // Find the current task if any
    const activeAction = [...this.actions.values()].find((a) => a.agentId === agentId);

    const snapshot: MemorySnapshot = {
      id: snapshotId,
      agentId,
      timestamp: new Date(),
      state: memoryState,
      taskId: activeAction?.taskId ?? null,
      metadata: {
        agentRunningState: this.agentRunningState.get(agentId) ?? 'unknown',
        isDegraded: this.degradedAgents.has(agentId),
        isQuarantined: this.quarantinedAgents.has(agentId),
      },
    };

    this.snapshots.set(snapshotId, snapshot);

    // Track per-agent snapshots
    if (!this.agentSnapshots.has(agentId)) {
      this.agentSnapshots.set(agentId, []);
    }
    const agentSnapshotList = this.agentSnapshots.get(agentId)!;
    agentSnapshotList.push(snapshotId);

    // Prune oldest snapshots if over the per-agent limit
    while (agentSnapshotList.length > MAX_SNAPSHOTS_PER_AGENT) {
      const oldestId = agentSnapshotList.shift()!;
      this.snapshots.delete(oldestId);
      this.logger.debug(`Pruned old snapshot "${oldestId}" for agent "${agentId}"`);
    }

    this.logger.log(
      `Memory snapshot taken: snapshot="${snapshotId}" agent="${agentId}"`,
    );

    this.emitEvent(MEMORY_SNAPSHOT_TAKEN, {
      actionId: '',
      agentId,
      failureType: FailureType.CRASH,
      strategy: RecoveryStrategy.RESTORE_MEMORY_RESUME,
      timestamp: Date.now(),
      snapshotId,
    });

    return snapshotId;
  }

  // ─── 15. restoreAgentMemory ───────────────────────────────────────

  /**
   * Restore agent memory from a snapshot. Returns true if the snapshot
   * was found and restoration succeeded.
   */
  restoreAgentMemory(agentId: string, snapshotId: string): boolean {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      this.logger.error(
        `Cannot restore memory — snapshot "${snapshotId}" not found`,
      );
      return false;
    }

    if (snapshot.agentId !== agentId) {
      this.logger.error(
        `Cannot restore memory — snapshot "${snapshotId}" belongs to agent "${snapshot.agentId}", not "${agentId}"`,
      );
      return false;
    }

    // In production, this would call the agent's memory import API
    // and validate the state is compatible with the agent's current version
    this.agentRunningState.set(agentId, 'running');

    this.logger.log(
      `Memory restored: snapshot="${snapshotId}" agent="${agentId}" (snapshot age: ${Date.now() - snapshot.timestamp.getTime()}ms)`,
    );

    this.emitEvent(MEMORY_RESTORED, {
      actionId: '',
      agentId,
      failureType: FailureType.CRASH,
      strategy: RecoveryStrategy.RESTORE_MEMORY_RESUME,
      timestamp: Date.now(),
      snapshotId,
    });

    return true;
  }

  // ─── Agent registration helpers ───────────────────────────────────

  /**
   * Register an agent with the auto-recovery system so it can be
   * monitored and recovered.
   */
  registerAgent(agentId: string, capabilities: string[] = []): void {
    this.agentCapabilities.set(agentId, capabilities);
    this.agentRunningState.set(agentId, 'running');
    this.degradedAgents.delete(agentId);
    this.quarantinedAgents.delete(agentId);

    this.logger.log(`Agent "${agentId}" registered with auto-recovery (capabilities: ${capabilities.length})`);
  }

  /**
   * Unregister an agent from the auto-recovery system.
   */
  unregisterAgent(agentId: string): void {
    this.agentCapabilities.delete(agentId);
    this.agentRunningState.delete(agentId);
    this.degradedAgents.delete(agentId);
    this.quarantinedAgents.delete(agentId);
    this.healthStatuses.delete(agentId);
    this.agentSnapshots.delete(agentId);

    this.logger.log(`Agent "${agentId}" unregistered from auto-recovery`);
  }

  /**
   * Check if an agent is currently degraded.
   */
  isAgentDegraded(agentId: string): boolean {
    return this.degradedAgents.has(agentId);
  }

  /**
   * Check if an agent is currently quarantined.
   */
  isAgentQuarantined(agentId: string): boolean {
    return this.quarantinedAgents.has(agentId);
  }

  /**
   * Get the latest health status for an agent.
   */
  getAgentHealthStatus(agentId: string): AgentHealthStatus | null {
    return this.healthStatuses.get(agentId) ?? null;
  }

  /**
   * Acknowledge an escalation, marking it as handled by a human.
   */
  acknowledgeEscalation(escalationId: string, acknowledgedBy: string): EscalationRecord | null {
    const record = this.escalations.find((e) => e.id === escalationId);
    if (!record) {
      this.logger.warn(`Escalation "${escalationId}" not found`);
      return null;
    }

    record.acknowledged = true;
    record.acknowledgedBy = acknowledgedBy;
    record.acknowledgedAt = new Date();

    this.logger.log(
      `Escalation "${escalationId}" acknowledged by "${acknowledgedBy}"`,
    );

    return { ...record };
  }

  /**
   * Get all unacknowledged escalations.
   */
  getUnacknowledgedEscalations(): EscalationRecord[] {
    return this.escalations
      .filter((e) => !e.acknowledged)
      .map((e) => ({ ...e }));
  }

  /**
   * Get all escalation records, optionally filtered by agent.
   */
  getEscalations(agentId?: string): EscalationRecord[] {
    let result = this.escalations;
    if (agentId) {
      result = result.filter((e) => e.agentId === agentId);
    }
    return result.map((e) => ({ ...e }));
  }

  // ─── Strategy implementations ─────────────────────────────────────

  /**
   * RESTART: Stop the agent, reinitialize it, and start it again.
   */
  private async executeRestart(action: AutoRecoveryAction): Promise<void> {
    const { agentId } = action;

    this.logger.log(`RESTART: Stopping agent "${agentId}"...`);

    // Stop the agent
    this.agentRunningState.set(agentId, 'stopped');
    await this.sleep(500); // Simulate graceful shutdown

    // Reinitialize
    this.logger.log(`RESTART: Reinitializing agent "${agentId}"...`);
    this.agentRunningState.set(agentId, 'initializing');
    await this.sleep(300); // Simulate initialization

    // Start
    this.logger.log(`RESTART: Starting agent "${agentId}"...`);
    this.agentRunningState.set(agentId, 'running');

    // Clear any degraded/quarantined state
    this.degradedAgents.delete(agentId);

    this.logger.log(`RESTART: Agent "${agentId}" restarted successfully`);
  }

  /**
   * RESTORE_MEMORY_RESUME: Take a memory snapshot, restart the agent,
   * restore its memory, and resume the interrupted task.
   */
  private async executeRestoreMemoryResume(action: AutoRecoveryAction): Promise<void> {
    const { agentId } = action;

    // Step 1: Snapshot current memory before restart
    this.logger.log(`RESTORE_MEMORY_RESUME: Snapshotting memory for agent "${agentId}"...`);
    const snapshotId = this.snapshotAgentMemory(agentId);
    action.memorySnapshotId = snapshotId;

    // Step 2: Restart the agent
    this.logger.log(`RESTORE_MEMORY_RESUME: Restarting agent "${agentId}"...`);
    this.agentRunningState.set(agentId, 'stopped');
    await this.sleep(500);

    this.agentRunningState.set(agentId, 'initializing');
    await this.sleep(300);

    this.agentRunningState.set(agentId, 'running');

    // Step 3: Restore memory from snapshot
    this.logger.log(`RESTORE_MEMORY_RESUME: Restoring memory for agent "${agentId}" from snapshot "${snapshotId}"...`);
    const restored = this.restoreAgentMemory(agentId, snapshotId);
    if (!restored) {
      throw new Error(`Failed to restore memory from snapshot "${snapshotId}"`);
    }

    // Step 4: Resume interrupted task
    if (action.taskId) {
      this.logger.log(
        `RESTORE_MEMORY_RESUME: Resuming task "${action.taskId}" for agent "${agentId}"...`,
      );
      // In production, this would call the task scheduler to resume
      action.metadata.taskResumed = true;
      action.metadata.resumedAt = new Date().toISOString();
    } else {
      this.logger.log(
        `RESTORE_MEMORY_RESUME: No task to resume for agent "${agentId}"`,
      );
    }

    this.logger.log(`RESTORE_MEMORY_RESUME: Agent "${agentId}" recovered successfully`);
  }

  /**
   * FAILOVER: Find an alternative agent with the same capabilities
   * and transfer the task to it.
   */
  private async executeFailover(action: AutoRecoveryAction): Promise<void> {
    const { agentId } = action;
    const capabilities = this.agentCapabilities.get(agentId) ?? [];

    this.logger.log(
      `FAILOVER: Looking for alternative agent for "${agentId}" with capabilities: [${capabilities.join(', ')}]`,
    );

    // Find an agent with matching capabilities that is running and not degraded/quarantined
    let failoverTarget: string | null = null;

    for (const [candidateId, candidateCaps] of this.agentCapabilities.entries()) {
      if (candidateId === agentId) continue;
      if (this.quarantinedAgents.has(candidateId)) continue;
      if (this.degradedAgents.has(candidateId)) continue;
      if (this.agentRunningState.get(candidateId) !== 'running') continue;

      // Check if the candidate has all required capabilities
      const hasAllCapabilities = capabilities.every((cap) =>
        candidateCaps.includes(cap),
      );

      if (hasAllCapabilities) {
        failoverTarget = candidateId;
        break;
      }
    }

    if (!failoverTarget) {
      // If no exact match, try to find an agent with at least some matching capabilities
      for (const [candidateId, candidateCaps] of this.agentCapabilities.entries()) {
        if (candidateId === agentId) continue;
        if (this.quarantinedAgents.has(candidateId)) continue;
        if (this.agentRunningState.get(candidateId) !== 'running') continue;

        const matchingCaps = capabilities.filter((cap) =>
          candidateCaps.includes(cap),
        );

        if (matchingCaps.length > 0) {
          failoverTarget = candidateId;
          break;
        }
      }
    }

    if (!failoverTarget) {
      throw new Error(
        `No suitable failover target found for agent "${agentId}" with capabilities: [${capabilities.join(', ')}]`,
      );
    }

    this.logger.log(
      `FAILOVER: Transferring task from "${agentId}" to "${failoverTarget}"`,
    );

    // Mark the original agent as stopped
    this.agentRunningState.set(agentId, 'stopped');

    // Transfer the task to the failover target
    if (action.taskId) {
      this.logger.log(
        `FAILOVER: Task "${action.taskId}" transferred from "${agentId}" to "${failoverTarget}"`,
      );
      action.metadata.failoverTarget = failoverTarget;
      action.metadata.taskTransferred = true;
      action.metadata.transferredAt = new Date().toISOString();
    }

    // Take a memory snapshot of the original agent for the new agent
    // (so the failover target has context about what happened)
    const snapshotId = this.snapshotAgentMemory(agentId);
    action.memorySnapshotId = snapshotId;

    this.logger.log(
      `FAILOVER: Agent "${agentId}" failed over to "${failoverTarget}" successfully`,
    );
  }

  /**
   * SCALE_OUT: Create a new agent instance to handle the load
   * while the failing agent recovers.
   */
  private async executeScaleOut(action: AutoRecoveryAction): Promise<void> {
    const { agentId } = action;
    const capabilities = this.agentCapabilities.get(agentId) ?? [];

    const newAgentId = `${agentId}-clone-${Date.now()}`;

    this.logger.log(
      `SCALE_OUT: Creating new agent instance "${newAgentId}" (clone of "${agentId}")`,
    );

    // Register the new agent with the same capabilities
    this.registerAgent(newAgentId, [...capabilities]);

    // Simulate the time it takes to spin up a new instance
    await this.sleep(1000);

    this.logger.log(
      `SCALE_OUT: New agent "${newAgentId}" is running. Original agent "${agentId}" remains stopped.`,
    );

    // Keep the original agent stopped
    this.agentRunningState.set(agentId, 'stopped');

    // Transfer the task
    if (action.taskId) {
      this.logger.log(
        `SCALE_OUT: Task "${action.taskId}" reassigned from "${agentId}" to "${newAgentId}"`,
      );
      action.metadata.scaledOutAgentId = newAgentId;
      action.metadata.taskTransferred = true;
      action.metadata.transferredAt = new Date().toISOString();
    }
  }

  /**
   * DEGRADE: Mark the agent as degraded, reducing its capabilities.
   * It continues running but with limited functionality.
   */
  private async executeDegrade(action: AutoRecoveryAction): Promise<void> {
    const { agentId } = action;

    this.logger.log(
      `DEGRADE: Marking agent "${agentId}" as degraded — reducing capabilities`,
    );

    this.degradedAgents.add(agentId);

    // Reduce capabilities — keep only essential ones
    const currentCaps = this.agentCapabilities.get(agentId) ?? [];
    if (currentCaps.length > 0) {
      // Keep at most half of the capabilities (the first ones, assumed most critical)
      const reducedCaps = currentCaps.slice(0, Math.max(1, Math.floor(currentCaps.length / 2)));
      this.agentCapabilities.set(agentId, reducedCaps);

      this.logger.log(
        `DEGRADE: Agent "${agentId}" capabilities reduced from [${currentCaps.join(', ')}] to [${reducedCaps.join(', ')}]`,
      );
    }

    // Agent remains running but in a degraded state
    action.metadata.degradedCapabilities = this.agentCapabilities.get(agentId);

    this.logger.log(`DEGRADE: Agent "${agentId}" is now running in degraded mode`);
  }

  /**
   * QUARANTINE: Isolate the agent so it cannot receive new tasks
   * or interact with other agents. This is a safety measure for
   * agents that are exhibiting dangerous or erratic behaviour.
   */
  private async executeQuarantine(action: AutoRecoveryAction): Promise<void> {
    const { agentId } = action;

    this.logger.warn(
      `QUARANTINE: Isolating agent "${agentId}" — preventing new task assignments`,
    );

    this.quarantinedAgents.add(agentId);
    this.degradedAgents.delete(agentId);

    // Snapshot memory before quarantine for forensic analysis
    const snapshotId = this.snapshotAgentMemory(agentId);
    action.memorySnapshotId = snapshotId;

    // The agent is NOT stopped — it's isolated but still running
    // so we can observe its behaviour and potentially recover it later
    action.metadata.quarantinedAt = new Date().toISOString();
    action.metadata.memorySnapshotForForensics = snapshotId;

    this.logger.warn(
      `QUARANTINE: Agent "${agentId}" is now quarantined. Memory snapshot "${snapshotId}" saved for forensics.`,
    );
  }

  // ─── Private helpers ──────────────────────────────────────────────

  /**
   * Build a human-readable description of the failure.
   */
  private buildFailureDescription(
    agentId: string,
    failureType: FailureType,
    context?: RecoveryContext,
  ): string {
    const descriptions: Record<FailureType, string> = {
      [FailureType.CRASH]: `Agent "${agentId}" crashed unexpectedly`,
      [FailureType.TIMEOUT]: `Agent "${agentId}" exceeded execution timeout`,
      [FailureType.OOM]: `Agent "${agentId}" ran out of memory`,
      [FailureType.CIRCUIT_BREAKER_OPEN]: `Agent "${agentId}" circuit breaker opened — too many failures`,
      [FailureType.HEALTH_CHECK_FAILED]: `Agent "${agentId}" failed health check`,
      [FailureType.UNHANDLED_EXCEPTION]: `Agent "${agentId}" threw an unhandled exception`,
      [FailureType.DEADLOCK]: `Agent "${agentId}" is in a deadlock state`,
      [FailureType.DEPENDENCY_FAILURE]: `Agent "${agentId}" experienced a dependency failure`,
    };

    let description = descriptions[failureType] ?? `Agent "${agentId}" failed with ${failureType}`;

    if (context?.errorMessage) {
      description += `: ${context.errorMessage}`;
    }

    return description;
  }

  /**
   * Perform a health check on a single agent.
   * In production this would call the agent's health endpoint.
   */
  private checkAgentHealth(
    agentId: string,
    runningState: string,
  ): AgentHealthStatus {
    const issues: string[] = [];
    let healthy = true;

    // Check if agent is running
    if (runningState !== 'running') {
      issues.push(`Agent is not running (state: ${runningState})`);
      healthy = false;
    }

    // Check if agent is degraded
    if (this.degradedAgents.has(agentId)) {
      issues.push('Agent is in degraded mode');
      // Degraded agents are still "healthy" — just limited
    }

    // Check if agent is quarantined
    if (this.quarantinedAgents.has(agentId)) {
      issues.push('Agent is quarantined');
      healthy = false;
    }

    // Simulate metric collection (in production, these would be real metrics)
    const metrics: AgentHealthStatus['metrics'] = {
      responseTimeMs: Math.random() * 500,
      errorRate: Math.random() * 0.1,
      memoryUsageMb: 128 + Math.random() * 512,
      cpuUsagePercent: Math.random() * 100,
      taskQueueDepth: Math.floor(Math.random() * 50),
    };

    // Check for concerning metric thresholds
    if (metrics.errorRate > 0.05) {
      issues.push(`High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
      healthy = false;
    }
    if (metrics.cpuUsagePercent > 90) {
      issues.push(`High CPU usage: ${metrics.cpuUsagePercent.toFixed(1)}%`);
      healthy = false;
    }
    if (metrics.memoryUsageMb > 512) {
      issues.push(`High memory usage: ${metrics.memoryUsageMb.toFixed(0)}MB`);
      healthy = false;
    }

    return {
      agentId,
      healthy,
      lastChecked: new Date(),
      issues,
      metrics,
    };
  }

  /**
   * Start the periodic health check loop.
   */
  private startHealthCheckLoop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      try {
        this.performHealthChecks();
      } catch (err) {
        this.logger.error(`Health check loop error: ${err}`);
      }
    }, HEALTH_CHECK_INTERVAL_MS);

    this.logger.log(
      `Health check loop started (interval: ${HEALTH_CHECK_INTERVAL_MS}ms)`,
    );
  }

  /**
   * Stop the health check loop (useful for graceful shutdown).
   */
  stopHealthCheckLoop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.logger.log('Health check loop stopped');
    }
  }

  /**
   * Add an action to the bounded history.
   */
  private addToHistory(action: AutoRecoveryAction): void {
    this.history.push({ ...action });

    if (this.history.length > MAX_HISTORY_SIZE) {
      this.history.splice(0, this.history.length - MAX_HISTORY_SIZE);
    }
  }

  /**
   * Generate a unique action ID.
   */
  private generateActionId(): string {
    return `recovery-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate a unique escalation ID.
   */
  private generateEscalationId(): string {
    return `escalation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate a unique snapshot ID.
   */
  private generateSnapshotId(): string {
    return `snapshot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Simple promise-based sleep helper.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─── Utility / inspection ─────────────────────────────────────────

  /**
   * Get a memory snapshot by ID.
   */
  getSnapshot(snapshotId: string): MemorySnapshot | null {
    return this.snapshots.get(snapshotId) ?? null;
  }

  /**
   * Get all snapshot IDs for an agent.
   */
  getAgentSnapshots(agentId: string): string[] {
    return this.agentSnapshots.get(agentId) ?? [];
  }

  /**
   * Get all registered agent IDs.
   */
  getRegisteredAgentIds(): string[] {
    return [...this.agentRunningState.keys()];
  }

  /**
   * Get the running state of an agent.
   */
  getAgentRunningState(agentId: string): string | null {
    return this.agentRunningState.get(agentId) ?? null;
  }

  /**
   * Clear all state (useful for testing).
   */
  clear(): void {
    this.actions.clear();
    this.policies.clear();
    this.snapshots.clear();
    this.agentSnapshots.clear();
    this.history.length = 0;
    this.escalations.length = 0;
    this.healthStatuses.clear();
    this.degradedAgents.clear();
    this.quarantinedAgents.clear();
    this.agentCapabilities.clear();
    this.agentRunningState.clear();
    this.recoveryDurations.length = 0;
    this.stopHealthCheckLoop();
    this.logger.log('AutoRecoveryService cleared');
  }
}
