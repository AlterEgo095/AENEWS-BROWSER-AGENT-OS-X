/**
 * AENEWS Agent OS X - Mission Monitor Service
 *
 * Progress tracking, health monitoring, and alerting for active missions.
 *
 * Features:
 *   - Start/stop monitoring for individual missions
 *   - Per-phase progress tracking (0–100%)
 *   - Alert recording with severity levels
 *   - Mission health assessment
 *   - Active mission enumeration
 *   - Aggregate statistics
 */

import { Injectable, Logger } from '@nestjs/common';

// ─── Local Types ─────────────────────────────────────────────────────────

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum MissionHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN',
}

export interface Alert {
  id: string;
  missionId: string;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  metadata: Record<string, unknown>;
}

export interface PhaseProgress {
  phaseType: string;
  progress: number; // 0–100
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  startedAt: Date | null;
  lastUpdatedAt: Date | null;
  estimatedCompletionAt: Date | null;
}

export interface MissionProgress {
  missionId: string;
  overallProgress: number; // 0–100
  phases: PhaseProgress[];
  startedAt: Date | null;
  estimatedCompletionAt: Date | null;
  lastUpdatedAt: Date;
}

export interface MissionHealth {
  missionId: string;
  status: MissionHealthStatus;
  activeAlerts: number;
  totalAlerts: number;
  criticalAlerts: number;
  errorAlerts: number;
  lastAlertAt: Date | null;
  phaseFailureCount: number;
  monitoringSince: Date | null;
  uptimeMs: number;
}

export interface MonitorStats {
  totalMissionsMonitored: number;
  currentlyActive: number;
  totalAlertsRecorded: number;
  alertsBySeverity: Record<string, number>;
  averageMissionProgress: number;
  healthDistribution: Record<string, number>;
}

interface MissionMonitorState {
  missionId: string;
  isMonitoring: boolean;
  startedAt: Date | null;
  progress: MissionProgress;
  alerts: Alert[];
  health: MissionHealth;
  phaseFailures: number;
}

// ─── Service ─────────────────────────────────────────────────────────────

@Injectable()
export class MissionMonitorService {
  private readonly logger = new Logger(MissionMonitorService.name);

  /** missionId → MissionMonitorState */
  private readonly states: Map<string, MissionMonitorState> = new Map();

  private alertIdCounter = 0;

  // ─── 1. startMonitoring ────────────────────────────────────────────

  /**
   * Begin monitoring a mission. Initialises progress tracking for
   * all standard phases and sets health to HEALTHY.
   */
  startMonitoring(missionId: string): void {
    if (this.states.has(missionId)) {
      this.logger.warn(`Mission "${missionId}" is already being monitored`);
      return;
    }

    const now = new Date();
    const defaultPhases: PhaseProgress[] = [
      'PLANNING',
      'BROWSER',
      'DEVELOPMENT',
      'BUSINESS',
      'CERTIFICATION',
      'DELIVERY',
    ].map((phase) => ({
      phaseType: phase,
      progress: 0,
      status: 'PENDING' as PhaseProgress['status'],
      startedAt: null,
      lastUpdatedAt: null,
      estimatedCompletionAt: null,
    }));

    const state: MissionMonitorState = {
      missionId,
      isMonitoring: true,
      startedAt: now,
      progress: {
        missionId,
        overallProgress: 0,
        phases: defaultPhases,
        startedAt: now,
        estimatedCompletionAt: null,
        lastUpdatedAt: now,
      },
      alerts: [],
      health: {
        missionId,
        status: MissionHealthStatus.HEALTHY,
        activeAlerts: 0,
        totalAlerts: 0,
        criticalAlerts: 0,
        errorAlerts: 0,
        lastAlertAt: null,
        phaseFailureCount: 0,
        monitoringSince: now,
        uptimeMs: 0,
      },
      phaseFailures: 0,
    };

    this.states.set(missionId, state);
    this.logger.log(`Started monitoring mission "${missionId}"`);
  }

  // ─── 2. stopMonitoring ─────────────────────────────────────────────

  /**
   * Stop monitoring a mission. Retains the state for historical queries
   * but marks it as no longer actively monitored.
   */
  stopMonitoring(missionId: string): void {
    const state = this.states.get(missionId);
    if (!state) {
      this.logger.warn(`Mission "${missionId}" is not being monitored`);
      return;
    }

    state.isMonitoring = false;
    this.logger.log(`Stopped monitoring mission "${missionId}"`);
  }

  // ─── 3. updateProgress ─────────────────────────────────────────────

  /**
   * Update the progress of a specific phase within a mission.
   * Recalculates overall progress as the average of all phases.
   * Automatically transitions phase status based on progress value.
   */
  updateProgress(missionId: string, phaseType: string, progress: number): void {
    const state = this.getMonitorStateOrThrow(missionId);

    const phase = state.progress.phases.find((p) => p.phaseType === phaseType);
    if (!phase) {
      this.logger.warn(
        `Mission "${missionId}": phase "${phaseType}" not found for progress update`,
      );
      return;
    }

    // Clamp progress 0–100
    progress = Math.max(0, Math.min(100, Math.round(progress)));

    phase.progress = progress;
    phase.lastUpdatedAt = new Date();

    // Auto-transition status based on progress
    if (progress >= 100) {
      phase.status = 'COMPLETED';
    } else if (progress > 0) {
      phase.status = 'IN_PROGRESS';
      if (!phase.startedAt) {
        phase.startedAt = new Date();
      }
    }

    // Recalculate overall progress
    const totalPhases = state.progress.phases.length;
    const totalProgress = state.progress.phases.reduce((sum, p) => sum + p.progress, 0);
    state.progress.overallProgress = Math.round(totalProgress / totalPhases);
    state.progress.lastUpdatedAt = new Date();

    this.logger.debug(
      `Mission "${missionId}": phase "${phaseType}" progress → ${progress}% (overall: ${state.progress.overallProgress}%)`,
    );
  }

  // ─── 4. getProgress ────────────────────────────────────────────────

  /**
   * Get the current progress snapshot for a mission.
   */
  getProgress(missionId: string): MissionProgress {
    const state = this.getMonitorStateOrThrow(missionId);
    return { ...state.progress };
  }

  // ─── 5. recordAlert ────────────────────────────────────────────────

  /**
   * Record an alert for a mission. Updates the health status based
   on the alert severity:
   *   - INFO/WARNING → DEGRADED (if not already worse)
   *   - ERROR → UNHEALTHY
   *   - CRITICAL → CRITICAL
   */
  recordAlert(
    missionId: string,
    severity: AlertSeverity,
    message: string,
    metadata?: Record<string, unknown>,
  ): Alert {
    const state = this.getMonitorStateOrThrow(missionId);
    this.alertIdCounter++;

    const alert: Alert = {
      id: `alert_${this.alertIdCounter}`,
      missionId,
      severity,
      message,
      timestamp: new Date(),
      acknowledged: false,
      metadata: metadata ?? {},
    };

    state.alerts.push(alert);

    // Update health based on severity
    this.reassessHealth(state);

    state.health.totalAlerts++;
    state.health.activeAlerts = state.alerts.filter((a) => !a.acknowledged).length;
    state.health.lastAlertAt = new Date();

    if (severity === AlertSeverity.CRITICAL) {
      state.health.criticalAlerts++;
    } else if (severity === AlertSeverity.ERROR) {
      state.health.errorAlerts++;
    }

    this.logger.warn(`Mission "${missionId}" alert [${severity}]: ${message}`);

    return alert;
  }

  // ─── 6. getAlerts ──────────────────────────────────────────────────

  /**
   * Get alerts for a mission, optionally filtered by severity.
   */
  getAlerts(missionId: string, severity?: AlertSeverity): Alert[] {
    const state = this.states.get(missionId);
    if (!state) {
      return [];
    }

    let alerts = [...state.alerts];
    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity);
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // ─── 7. acknowledgeAlert ───────────────────────────────────────────

  /**
   * Mark an alert as acknowledged. May improve mission health status.
   */
  acknowledgeAlert(missionId: string, alertId: string): boolean {
    const state = this.states.get(missionId);
    if (!state) {
      return false;
    }

    const alert = state.alerts.find((a) => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    state.health.activeAlerts = state.alerts.filter((a) => !a.acknowledged).length;

    // Reassess health after acknowledgment
    this.reassessHealth(state);

    this.logger.log(`Mission "${missionId}": alert "${alertId}" acknowledged`);
    return true;
  }

  // ─── 8. getHealth ──────────────────────────────────────────────────

  /**
   * Get the current health status of a mission.
   */
  getHealth(missionId: string): MissionHealth {
    const state = this.getMonitorStateOrThrow(missionId);

    // Update uptime
    if (state.health.monitoringSince) {
      state.health.uptimeMs = Date.now() - state.health.monitoringSince.getTime();
    }

    return { ...state.health };
  }

  // ─── 9. getActiveMissions ──────────────────────────────────────────

  /**
   * Get IDs of all currently monitored missions.
   */
  getActiveMissions(): string[] {
    return [...this.states.entries()]
      .filter(([, state]) => state.isMonitoring)
      .map(([missionId]) => missionId);
  }

  // ─── 10. getStats ──────────────────────────────────────────────────

  /**
   * Compute aggregate monitoring statistics.
   */
  getStats(): MonitorStats {
    const allStates = [...this.states.values()];
    const activeStates = allStates.filter((s) => s.isMonitoring);

    const alertsBySeverity: Record<string, number> = {
      INFO: 0,
      WARNING: 0,
      ERROR: 0,
      CRITICAL: 0,
    };

    let totalAlerts = 0;
    for (const state of allStates) {
      for (const alert of state.alerts) {
        alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] ?? 0) + 1;
        totalAlerts++;
      }
    }

    const averageMissionProgress =
      activeStates.length > 0
        ? Math.round(
            activeStates.reduce((sum, s) => sum + s.progress.overallProgress, 0) /
              activeStates.length,
          )
        : 0;

    const healthDistribution: Record<string, number> = {};
    for (const state of allStates) {
      const status = state.health.status;
      healthDistribution[status] = (healthDistribution[status] ?? 0) + 1;
    }

    return {
      totalMissionsMonitored: allStates.length,
      currentlyActive: activeStates.length,
      totalAlertsRecorded: totalAlerts,
      alertsBySeverity,
      averageMissionProgress,
      healthDistribution,
    };
  }

  // ─── 11. recordPhaseFailure ────────────────────────────────────────

  /**
   * Record that a phase has failed for a mission. Increments the failure
   * counter and may degrade health status.
   */
  recordPhaseFailure(missionId: string, phaseType: string, error: string): void {
    const state = this.getMonitorStateOrThrow(missionId);

    state.phaseFailures++;
    state.health.phaseFailureCount = state.phaseFailures;

    // Mark the phase as FAILED in progress
    const phase = state.progress.phases.find((p) => p.phaseType === phaseType);
    if (phase) {
      phase.status = 'FAILED';
      phase.lastUpdatedAt = new Date();
    }

    // Record a corresponding alert
    this.recordAlert(missionId, AlertSeverity.ERROR, `Phase "${phaseType}" failed: ${error}`, {
      phaseType,
      error,
    });

    this.logger.error(`Mission "${missionId}": phase "${phaseType}" FAILED — ${error}`);
  }

  // ─── Private helpers ───────────────────────────────────────────────

  private getMonitorStateOrThrow(missionId: string): MissionMonitorState {
    const state = this.states.get(missionId);
    if (!state) {
      throw new Error(
        `Mission "${missionId}" is not being monitored. Call startMonitoring() first.`,
      );
    }
    return state;
  }

  /**
   * Reassess mission health based on the worst unacknowledged alert.
   */
  private reassessHealth(state: MissionMonitorState): void {
    const unacknowledged = state.alerts.filter((a) => !a.acknowledged);

    if (unacknowledged.some((a) => a.severity === AlertSeverity.CRITICAL)) {
      state.health.status = MissionHealthStatus.CRITICAL;
    } else if (unacknowledged.some((a) => a.severity === AlertSeverity.ERROR)) {
      state.health.status = MissionHealthStatus.UNHEALTHY;
    } else if (unacknowledged.some((a) => a.severity === AlertSeverity.WARNING)) {
      state.health.status = MissionHealthStatus.DEGRADED;
    } else if (state.phaseFailures > 0) {
      state.health.status = MissionHealthStatus.DEGRADED;
    } else {
      state.health.status = MissionHealthStatus.HEALTHY;
    }
  }
}
