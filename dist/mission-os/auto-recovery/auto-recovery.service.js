"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AutoRecoveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoRecoveryService = exports.MEMORY_RESTORED = exports.MEMORY_SNAPSHOT_TAKEN = exports.HEALTH_CHECK_FAILED_EVENT = exports.RECOVERY_ESCALATED = exports.RECOVERY_FAILED = exports.RECOVERY_SUCCEEDED = exports.RECOVERY_STARTED = exports.RecoveryStatus = exports.RecoveryStrategy = exports.FailureType = void 0;
const common_1 = require("@nestjs/common");
var FailureType;
(function (FailureType) {
    FailureType["CRASH"] = "crash";
    FailureType["TIMEOUT"] = "timeout";
    FailureType["OOM"] = "oom";
    FailureType["CIRCUIT_BREAKER_OPEN"] = "circuit_breaker_open";
    FailureType["HEALTH_CHECK_FAILED"] = "health_check_failed";
    FailureType["UNHANDLED_EXCEPTION"] = "unhandled_exception";
    FailureType["DEADLOCK"] = "deadlock";
    FailureType["DEPENDENCY_FAILURE"] = "dependency_failure";
})(FailureType || (exports.FailureType = FailureType = {}));
var RecoveryStrategy;
(function (RecoveryStrategy) {
    RecoveryStrategy["RESTART"] = "restart";
    RecoveryStrategy["RESTORE_MEMORY_RESUME"] = "restore_memory_resume";
    RecoveryStrategy["FAILOVER"] = "failover";
    RecoveryStrategy["SCALE_OUT"] = "scale_out";
    RecoveryStrategy["DEGRADE"] = "degrade";
    RecoveryStrategy["QUARANTINE"] = "quarantine";
})(RecoveryStrategy || (exports.RecoveryStrategy = RecoveryStrategy = {}));
var RecoveryStatus;
(function (RecoveryStatus) {
    RecoveryStatus["DETECTED"] = "detected";
    RecoveryStatus["ANALYZING"] = "analyzing";
    RecoveryStatus["RECOVERING"] = "recovering";
    RecoveryStatus["SUCCEEDED"] = "succeeded";
    RecoveryStatus["FAILED"] = "failed";
    RecoveryStatus["ESCALATED"] = "escalated";
})(RecoveryStatus || (exports.RecoveryStatus = RecoveryStatus = {}));
exports.RECOVERY_STARTED = 'recovery.started';
exports.RECOVERY_SUCCEEDED = 'recovery.succeeded';
exports.RECOVERY_FAILED = 'recovery.failed';
exports.RECOVERY_ESCALATED = 'recovery.escalated';
exports.HEALTH_CHECK_FAILED_EVENT = 'health_check.failed';
exports.MEMORY_SNAPSHOT_TAKEN = 'memory.snapshot_taken';
exports.MEMORY_RESTORED = 'memory.restored';
const MAX_HISTORY_SIZE = 10_000;
const MAX_ESCALATION_RECORDS = 5_000;
const MAX_SNAPSHOTS_PER_AGENT = 10;
const HEALTH_CHECK_INTERVAL_MS = 30_000;
let AutoRecoveryService = AutoRecoveryService_1 = class AutoRecoveryService {
    constructor() {
        this.logger = new common_1.Logger(AutoRecoveryService_1.name);
        this.actions = new Map();
        this.policies = new Map();
        this.snapshots = new Map();
        this.agentSnapshots = new Map();
        this.history = [];
        this.escalations = [];
        this.healthStatuses = new Map();
        this.degradedAgents = new Set();
        this.quarantinedAgents = new Set();
        this.agentCapabilities = new Map();
        this.agentRunningState = new Map();
        this.eventListeners = new Map();
        this.healthCheckInterval = null;
        this.recoveryDurations = [];
    }
    onModuleInit() {
        this.initialize();
        this.startHealthCheckLoop();
        this.logger.log('AutoRecoveryService initialised');
    }
    on(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(listener);
        return () => {
            const listeners = this.eventListeners.get(event);
            if (listeners) {
                const idx = listeners.indexOf(listener);
                if (idx >= 0)
                    listeners.splice(idx, 1);
            }
        };
    }
    emitEvent(event, payload) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(payload);
                }
                catch (err) {
                    this.logger.warn(`Event listener error on "${event}": ${err}`);
                }
            }
        }
    }
    initialize() {
        this.logger.log('Loading default recovery policies...');
        const defaultPolicies = [
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
    detectFailure(agentId, failureType, context) {
        const policy = this.policies.get(failureType);
        if (!policy) {
            this.logger.error(`No recovery policy found for failure type "${failureType}". Using default RESTART strategy.`);
        }
        const strategy = policy?.strategy ?? RecoveryStrategy.RESTART;
        const maxAttempts = policy?.maxAttempts ?? 2;
        const failureDescription = this.buildFailureDescription(agentId, failureType, context);
        const actionId = this.generateActionId();
        const action = {
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
        this.logger.warn(`Failure detected: agent="${agentId}" type=${failureType} strategy=${strategy} action=${actionId}`);
        this.emitEvent(exports.RECOVERY_STARTED, {
            actionId,
            agentId,
            failureType,
            strategy,
            timestamp: Date.now(),
        });
        this.executeRecovery(actionId);
        return { ...action };
    }
    async executeRecovery(actionId) {
        const action = this.actions.get(actionId);
        if (!action) {
            this.logger.error(`Cannot execute recovery — action "${actionId}" not found`);
            return;
        }
        if (action.status === RecoveryStatus.SUCCEEDED) {
            this.logger.warn(`Action "${actionId}" already succeeded — skipping re-execution`);
            return;
        }
        if (action.status === RecoveryStatus.ESCALATED) {
            this.logger.warn(`Action "${actionId}" is escalated — requires human intervention`);
            return;
        }
        const policy = this.policies.get(action.failureType);
        const cooldownMs = policy?.cooldownMs ?? 5_000;
        if (action.attempts > 0 && action.lastAttemptAt) {
            const elapsed = Date.now() - action.lastAttemptAt.getTime();
            if (elapsed < cooldownMs) {
                const waitMs = cooldownMs - elapsed;
                this.logger.log(`Cooldown in effect for action "${actionId}" — waiting ${waitMs}ms before retry`);
                await this.sleep(waitMs);
            }
        }
        action.status = RecoveryStatus.ANALYZING;
        this.logger.log(`Analyzing failure for action "${actionId}": agent="${action.agentId}" type=${action.failureType}`);
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
            const duration = Date.now() - recoveryStart;
            this.recoveryDurations.push(duration);
            if (this.recoveryDurations.length > MAX_HISTORY_SIZE) {
                this.recoveryDurations.splice(0, this.recoveryDurations.length - MAX_HISTORY_SIZE);
            }
            action.result = `Recovery succeeded via ${action.recoveryStrategy} in ${duration}ms`;
            this.handleRecoverySuccess(actionId);
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Recovery attempt ${action.attempts}/${action.maxAttempts} failed for action "${actionId}": ${errMsg}`);
            action.result = `Attempt ${action.attempts} failed: ${errMsg}`;
            this.handleRecoveryFailure(actionId);
        }
    }
    handleRecoverySuccess(actionId) {
        const action = this.actions.get(actionId);
        if (!action) {
            this.logger.error(`Cannot handle recovery success — action "${actionId}" not found`);
            return;
        }
        action.status = RecoveryStatus.SUCCEEDED;
        if (action.recoveryStrategy !== RecoveryStrategy.QUARANTINE) {
            this.degradedAgents.delete(action.agentId);
        }
        this.addToHistory(action);
        this.actions.delete(actionId);
        this.logger.log(`Recovery succeeded: action="${actionId}" agent="${action.agentId}" strategy=${action.recoveryStrategy} attempts=${action.attempts}`);
        this.emitEvent(exports.RECOVERY_SUCCEEDED, {
            actionId,
            agentId: action.agentId,
            failureType: action.failureType,
            strategy: action.recoveryStrategy,
            timestamp: Date.now(),
            attempts: action.attempts,
        });
    }
    handleRecoveryFailure(actionId) {
        const action = this.actions.get(actionId);
        if (!action) {
            this.logger.error(`Cannot handle recovery failure — action "${actionId}" not found`);
            return;
        }
        const policy = this.policies.get(action.failureType);
        if (action.attempts < action.maxAttempts) {
            const cooldownMs = policy?.cooldownMs ?? 5_000;
            this.logger.warn(`Recovery attempt ${action.attempts}/${action.maxAttempts} failed for agent "${action.agentId}". ` +
                `Retrying after ${cooldownMs}ms cooldown...`);
            action.status = RecoveryStatus.RECOVERING;
            setTimeout(() => {
                this.executeRecovery(actionId).catch((err) => {
                    this.logger.error(`Scheduled retry failed for action "${actionId}": ${err}`);
                });
            }, cooldownMs);
        }
        else {
            action.status = RecoveryStatus.FAILED;
            this.logger.error(`All ${action.maxAttempts} recovery attempts exhausted for agent "${action.agentId}" ` +
                `(failure: ${action.failureType}). Escalating to human.`);
            const escalationAfter = policy?.escalationAfterAttempts ?? action.maxAttempts;
            if (action.attempts >= escalationAfter) {
                this.escalate(actionId);
            }
        }
    }
    escalate(actionId) {
        const action = this.actions.get(actionId);
        if (!action) {
            throw new Error(`Cannot escalate — action "${actionId}" not found`);
        }
        action.status = RecoveryStatus.ESCALATED;
        const escalationReason = `Auto-recovery failed after ${action.attempts} attempts. ` +
            `Failure type: ${action.failureType}. Strategy: ${action.recoveryStrategy}. ` +
            `Last result: ${action.result ?? 'unknown'}`;
        action.escalationReason = escalationReason;
        const escalation = {
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
        if (this.escalations.length > MAX_ESCALATION_RECORDS) {
            this.escalations.splice(0, this.escalations.length - MAX_ESCALATION_RECORDS);
        }
        this.addToHistory(action);
        this.actions.delete(actionId);
        this.logger.error(`ESCALATION: action="${actionId}" agent="${action.agentId}" — ${escalationReason}`);
        this.emitEvent(exports.RECOVERY_ESCALATED, {
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
    getRecoveryAction(actionId) {
        const active = this.actions.get(actionId);
        if (active)
            return { ...active };
        const historical = this.history.find((a) => a.id === actionId);
        if (historical)
            return { ...historical };
        return null;
    }
    getActiveRecoveries() {
        return [...this.actions.values()].map((a) => ({ ...a }));
    }
    getRecoveryHistory(agentId) {
        let result = this.history;
        if (agentId) {
            result = result.filter((a) => a.agentId === agentId);
        }
        return result.map((a) => ({ ...a }));
    }
    getRecoveryPolicies() {
        return [...this.policies.values()].map((p) => ({ ...p }));
    }
    updatePolicy(failureType, policy) {
        const existing = this.policies.get(failureType);
        if (!existing) {
            if (!policy.strategy) {
                throw new Error(`New policy for "${failureType}" must specify a strategy`);
            }
            const newPolicy = {
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
        const updated = {
            ...existing,
            ...policy,
            failureType,
        };
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
        this.logger.log(`Updated recovery policy for failure type "${failureType}": strategy=${updated.strategy} maxAttempts=${updated.maxAttempts}`);
        return { ...updated };
    }
    getRecoveryStats() {
        const allActions = [...this.history, ...this.actions.values()];
        const byFailureType = {};
        const byStrategy = {};
        const byStatus = {};
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
        const averageRecoveryTimeMs = this.recoveryDurations.length > 0
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
    performHealthChecks() {
        const results = [];
        for (const [agentId, runningState] of this.agentRunningState.entries()) {
            const status = this.checkAgentHealth(agentId, runningState);
            this.healthStatuses.set(agentId, status);
            results.push(status);
            if (!status.healthy) {
                const hasActiveRecovery = [...this.actions.values()].some((a) => a.agentId === agentId);
                if (!hasActiveRecovery) {
                    this.logger.warn(`Preemptive recovery triggered: agent="${agentId}" is unhealthy — ${status.issues.join(', ')}`);
                    this.emitEvent(exports.HEALTH_CHECK_FAILED_EVENT, {
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
    snapshotAgentMemory(agentId) {
        const snapshotId = this.generateSnapshotId();
        const memoryState = this.agentRunningState.get(agentId) ?? {};
        const activeAction = [...this.actions.values()].find((a) => a.agentId === agentId);
        const snapshot = {
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
        if (!this.agentSnapshots.has(agentId)) {
            this.agentSnapshots.set(agentId, []);
        }
        const agentSnapshotList = this.agentSnapshots.get(agentId);
        agentSnapshotList.push(snapshotId);
        while (agentSnapshotList.length > MAX_SNAPSHOTS_PER_AGENT) {
            const oldestId = agentSnapshotList.shift();
            this.snapshots.delete(oldestId);
            this.logger.debug(`Pruned old snapshot "${oldestId}" for agent "${agentId}"`);
        }
        this.logger.log(`Memory snapshot taken: snapshot="${snapshotId}" agent="${agentId}"`);
        this.emitEvent(exports.MEMORY_SNAPSHOT_TAKEN, {
            actionId: '',
            agentId,
            failureType: FailureType.CRASH,
            strategy: RecoveryStrategy.RESTORE_MEMORY_RESUME,
            timestamp: Date.now(),
            snapshotId,
        });
        return snapshotId;
    }
    restoreAgentMemory(agentId, snapshotId) {
        const snapshot = this.snapshots.get(snapshotId);
        if (!snapshot) {
            this.logger.error(`Cannot restore memory — snapshot "${snapshotId}" not found`);
            return false;
        }
        if (snapshot.agentId !== agentId) {
            this.logger.error(`Cannot restore memory — snapshot "${snapshotId}" belongs to agent "${snapshot.agentId}", not "${agentId}"`);
            return false;
        }
        this.agentRunningState.set(agentId, 'running');
        this.logger.log(`Memory restored: snapshot="${snapshotId}" agent="${agentId}" (snapshot age: ${Date.now() - snapshot.timestamp.getTime()}ms)`);
        this.emitEvent(exports.MEMORY_RESTORED, {
            actionId: '',
            agentId,
            failureType: FailureType.CRASH,
            strategy: RecoveryStrategy.RESTORE_MEMORY_RESUME,
            timestamp: Date.now(),
            snapshotId,
        });
        return true;
    }
    registerAgent(agentId, capabilities = []) {
        this.agentCapabilities.set(agentId, capabilities);
        this.agentRunningState.set(agentId, 'running');
        this.degradedAgents.delete(agentId);
        this.quarantinedAgents.delete(agentId);
        this.logger.log(`Agent "${agentId}" registered with auto-recovery (capabilities: ${capabilities.length})`);
    }
    unregisterAgent(agentId) {
        this.agentCapabilities.delete(agentId);
        this.agentRunningState.delete(agentId);
        this.degradedAgents.delete(agentId);
        this.quarantinedAgents.delete(agentId);
        this.healthStatuses.delete(agentId);
        this.agentSnapshots.delete(agentId);
        this.logger.log(`Agent "${agentId}" unregistered from auto-recovery`);
    }
    isAgentDegraded(agentId) {
        return this.degradedAgents.has(agentId);
    }
    isAgentQuarantined(agentId) {
        return this.quarantinedAgents.has(agentId);
    }
    getAgentHealthStatus(agentId) {
        return this.healthStatuses.get(agentId) ?? null;
    }
    acknowledgeEscalation(escalationId, acknowledgedBy) {
        const record = this.escalations.find((e) => e.id === escalationId);
        if (!record) {
            this.logger.warn(`Escalation "${escalationId}" not found`);
            return null;
        }
        record.acknowledged = true;
        record.acknowledgedBy = acknowledgedBy;
        record.acknowledgedAt = new Date();
        this.logger.log(`Escalation "${escalationId}" acknowledged by "${acknowledgedBy}"`);
        return { ...record };
    }
    getUnacknowledgedEscalations() {
        return this.escalations
            .filter((e) => !e.acknowledged)
            .map((e) => ({ ...e }));
    }
    getEscalations(agentId) {
        let result = this.escalations;
        if (agentId) {
            result = result.filter((e) => e.agentId === agentId);
        }
        return result.map((e) => ({ ...e }));
    }
    async executeRestart(action) {
        const { agentId } = action;
        this.logger.log(`RESTART: Stopping agent "${agentId}"...`);
        this.agentRunningState.set(agentId, 'stopped');
        await this.sleep(500);
        this.logger.log(`RESTART: Reinitializing agent "${agentId}"...`);
        this.agentRunningState.set(agentId, 'initializing');
        await this.sleep(300);
        this.logger.log(`RESTART: Starting agent "${agentId}"...`);
        this.agentRunningState.set(agentId, 'running');
        this.degradedAgents.delete(agentId);
        this.logger.log(`RESTART: Agent "${agentId}" restarted successfully`);
    }
    async executeRestoreMemoryResume(action) {
        const { agentId } = action;
        this.logger.log(`RESTORE_MEMORY_RESUME: Snapshotting memory for agent "${agentId}"...`);
        const snapshotId = this.snapshotAgentMemory(agentId);
        action.memorySnapshotId = snapshotId;
        this.logger.log(`RESTORE_MEMORY_RESUME: Restarting agent "${agentId}"...`);
        this.agentRunningState.set(agentId, 'stopped');
        await this.sleep(500);
        this.agentRunningState.set(agentId, 'initializing');
        await this.sleep(300);
        this.agentRunningState.set(agentId, 'running');
        this.logger.log(`RESTORE_MEMORY_RESUME: Restoring memory for agent "${agentId}" from snapshot "${snapshotId}"...`);
        const restored = this.restoreAgentMemory(agentId, snapshotId);
        if (!restored) {
            throw new Error(`Failed to restore memory from snapshot "${snapshotId}"`);
        }
        if (action.taskId) {
            this.logger.log(`RESTORE_MEMORY_RESUME: Resuming task "${action.taskId}" for agent "${agentId}"...`);
            action.metadata.taskResumed = true;
            action.metadata.resumedAt = new Date().toISOString();
        }
        else {
            this.logger.log(`RESTORE_MEMORY_RESUME: No task to resume for agent "${agentId}"`);
        }
        this.logger.log(`RESTORE_MEMORY_RESUME: Agent "${agentId}" recovered successfully`);
    }
    async executeFailover(action) {
        const { agentId } = action;
        const capabilities = this.agentCapabilities.get(agentId) ?? [];
        this.logger.log(`FAILOVER: Looking for alternative agent for "${agentId}" with capabilities: [${capabilities.join(', ')}]`);
        let failoverTarget = null;
        for (const [candidateId, candidateCaps] of this.agentCapabilities.entries()) {
            if (candidateId === agentId)
                continue;
            if (this.quarantinedAgents.has(candidateId))
                continue;
            if (this.degradedAgents.has(candidateId))
                continue;
            if (this.agentRunningState.get(candidateId) !== 'running')
                continue;
            const hasAllCapabilities = capabilities.every((cap) => candidateCaps.includes(cap));
            if (hasAllCapabilities) {
                failoverTarget = candidateId;
                break;
            }
        }
        if (!failoverTarget) {
            for (const [candidateId, candidateCaps] of this.agentCapabilities.entries()) {
                if (candidateId === agentId)
                    continue;
                if (this.quarantinedAgents.has(candidateId))
                    continue;
                if (this.agentRunningState.get(candidateId) !== 'running')
                    continue;
                const matchingCaps = capabilities.filter((cap) => candidateCaps.includes(cap));
                if (matchingCaps.length > 0) {
                    failoverTarget = candidateId;
                    break;
                }
            }
        }
        if (!failoverTarget) {
            throw new Error(`No suitable failover target found for agent "${agentId}" with capabilities: [${capabilities.join(', ')}]`);
        }
        this.logger.log(`FAILOVER: Transferring task from "${agentId}" to "${failoverTarget}"`);
        this.agentRunningState.set(agentId, 'stopped');
        if (action.taskId) {
            this.logger.log(`FAILOVER: Task "${action.taskId}" transferred from "${agentId}" to "${failoverTarget}"`);
            action.metadata.failoverTarget = failoverTarget;
            action.metadata.taskTransferred = true;
            action.metadata.transferredAt = new Date().toISOString();
        }
        const snapshotId = this.snapshotAgentMemory(agentId);
        action.memorySnapshotId = snapshotId;
        this.logger.log(`FAILOVER: Agent "${agentId}" failed over to "${failoverTarget}" successfully`);
    }
    async executeScaleOut(action) {
        const { agentId } = action;
        const capabilities = this.agentCapabilities.get(agentId) ?? [];
        const newAgentId = `${agentId}-clone-${Date.now()}`;
        this.logger.log(`SCALE_OUT: Creating new agent instance "${newAgentId}" (clone of "${agentId}")`);
        this.registerAgent(newAgentId, [...capabilities]);
        await this.sleep(1000);
        this.logger.log(`SCALE_OUT: New agent "${newAgentId}" is running. Original agent "${agentId}" remains stopped.`);
        this.agentRunningState.set(agentId, 'stopped');
        if (action.taskId) {
            this.logger.log(`SCALE_OUT: Task "${action.taskId}" reassigned from "${agentId}" to "${newAgentId}"`);
            action.metadata.scaledOutAgentId = newAgentId;
            action.metadata.taskTransferred = true;
            action.metadata.transferredAt = new Date().toISOString();
        }
    }
    async executeDegrade(action) {
        const { agentId } = action;
        this.logger.log(`DEGRADE: Marking agent "${agentId}" as degraded — reducing capabilities`);
        this.degradedAgents.add(agentId);
        const currentCaps = this.agentCapabilities.get(agentId) ?? [];
        if (currentCaps.length > 0) {
            const reducedCaps = currentCaps.slice(0, Math.max(1, Math.floor(currentCaps.length / 2)));
            this.agentCapabilities.set(agentId, reducedCaps);
            this.logger.log(`DEGRADE: Agent "${agentId}" capabilities reduced from [${currentCaps.join(', ')}] to [${reducedCaps.join(', ')}]`);
        }
        action.metadata.degradedCapabilities = this.agentCapabilities.get(agentId);
        this.logger.log(`DEGRADE: Agent "${agentId}" is now running in degraded mode`);
    }
    async executeQuarantine(action) {
        const { agentId } = action;
        this.logger.warn(`QUARANTINE: Isolating agent "${agentId}" — preventing new task assignments`);
        this.quarantinedAgents.add(agentId);
        this.degradedAgents.delete(agentId);
        const snapshotId = this.snapshotAgentMemory(agentId);
        action.memorySnapshotId = snapshotId;
        action.metadata.quarantinedAt = new Date().toISOString();
        action.metadata.memorySnapshotForForensics = snapshotId;
        this.logger.warn(`QUARANTINE: Agent "${agentId}" is now quarantined. Memory snapshot "${snapshotId}" saved for forensics.`);
    }
    buildFailureDescription(agentId, failureType, context) {
        const descriptions = {
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
    checkAgentHealth(agentId, runningState) {
        const issues = [];
        let healthy = true;
        if (runningState !== 'running') {
            issues.push(`Agent is not running (state: ${runningState})`);
            healthy = false;
        }
        if (this.degradedAgents.has(agentId)) {
            issues.push('Agent is in degraded mode');
        }
        if (this.quarantinedAgents.has(agentId)) {
            issues.push('Agent is quarantined');
            healthy = false;
        }
        const metrics = {
            responseTimeMs: Math.random() * 500,
            errorRate: Math.random() * 0.1,
            memoryUsageMb: 128 + Math.random() * 512,
            cpuUsagePercent: Math.random() * 100,
            taskQueueDepth: Math.floor(Math.random() * 50),
        };
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
    startHealthCheckLoop() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        this.healthCheckInterval = setInterval(() => {
            try {
                this.performHealthChecks();
            }
            catch (err) {
                this.logger.error(`Health check loop error: ${err}`);
            }
        }, HEALTH_CHECK_INTERVAL_MS);
        this.logger.log(`Health check loop started (interval: ${HEALTH_CHECK_INTERVAL_MS}ms)`);
    }
    stopHealthCheckLoop() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
            this.logger.log('Health check loop stopped');
        }
    }
    addToHistory(action) {
        this.history.push({ ...action });
        if (this.history.length > MAX_HISTORY_SIZE) {
            this.history.splice(0, this.history.length - MAX_HISTORY_SIZE);
        }
    }
    generateActionId() {
        return `recovery-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    generateEscalationId() {
        return `escalation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    generateSnapshotId() {
        return `snapshot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    getSnapshot(snapshotId) {
        return this.snapshots.get(snapshotId) ?? null;
    }
    getAgentSnapshots(agentId) {
        return this.agentSnapshots.get(agentId) ?? [];
    }
    getRegisteredAgentIds() {
        return [...this.agentRunningState.keys()];
    }
    getAgentRunningState(agentId) {
        return this.agentRunningState.get(agentId) ?? null;
    }
    clear() {
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
};
exports.AutoRecoveryService = AutoRecoveryService;
exports.AutoRecoveryService = AutoRecoveryService = AutoRecoveryService_1 = __decorate([
    (0, common_1.Injectable)()
], AutoRecoveryService);
//# sourceMappingURL=auto-recovery.service.js.map