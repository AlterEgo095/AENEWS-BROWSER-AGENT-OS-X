"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MissionMonitorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionMonitorService = exports.MissionHealthStatus = exports.AlertSeverity = void 0;
const common_1 = require("@nestjs/common");
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["INFO"] = "INFO";
    AlertSeverity["WARNING"] = "WARNING";
    AlertSeverity["ERROR"] = "ERROR";
    AlertSeverity["CRITICAL"] = "CRITICAL";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var MissionHealthStatus;
(function (MissionHealthStatus) {
    MissionHealthStatus["HEALTHY"] = "HEALTHY";
    MissionHealthStatus["DEGRADED"] = "DEGRADED";
    MissionHealthStatus["UNHEALTHY"] = "UNHEALTHY";
    MissionHealthStatus["CRITICAL"] = "CRITICAL";
    MissionHealthStatus["UNKNOWN"] = "UNKNOWN";
})(MissionHealthStatus || (exports.MissionHealthStatus = MissionHealthStatus = {}));
let MissionMonitorService = MissionMonitorService_1 = class MissionMonitorService {
    constructor() {
        this.logger = new common_1.Logger(MissionMonitorService_1.name);
        this.states = new Map();
        this.alertIdCounter = 0;
    }
    startMonitoring(missionId) {
        if (this.states.has(missionId)) {
            this.logger.warn(`Mission "${missionId}" is already being monitored`);
            return;
        }
        const now = new Date();
        const defaultPhases = [
            'PLANNING', 'BROWSER', 'DEVELOPMENT', 'BUSINESS', 'CERTIFICATION', 'DELIVERY',
        ].map((phase) => ({
            phaseType: phase,
            progress: 0,
            status: 'PENDING',
            startedAt: null,
            lastUpdatedAt: null,
            estimatedCompletionAt: null,
        }));
        const state = {
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
    stopMonitoring(missionId) {
        const state = this.states.get(missionId);
        if (!state) {
            this.logger.warn(`Mission "${missionId}" is not being monitored`);
            return;
        }
        state.isMonitoring = false;
        this.logger.log(`Stopped monitoring mission "${missionId}"`);
    }
    updateProgress(missionId, phaseType, progress) {
        const state = this.getMonitorStateOrThrow(missionId);
        const phase = state.progress.phases.find((p) => p.phaseType === phaseType);
        if (!phase) {
            this.logger.warn(`Mission "${missionId}": phase "${phaseType}" not found for progress update`);
            return;
        }
        progress = Math.max(0, Math.min(100, Math.round(progress)));
        phase.progress = progress;
        phase.lastUpdatedAt = new Date();
        if (progress >= 100) {
            phase.status = 'COMPLETED';
        }
        else if (progress > 0) {
            phase.status = 'IN_PROGRESS';
            if (!phase.startedAt) {
                phase.startedAt = new Date();
            }
        }
        const totalPhases = state.progress.phases.length;
        const totalProgress = state.progress.phases.reduce((sum, p) => sum + p.progress, 0);
        state.progress.overallProgress = Math.round(totalProgress / totalPhases);
        state.progress.lastUpdatedAt = new Date();
        this.logger.debug(`Mission "${missionId}": phase "${phaseType}" progress → ${progress}% (overall: ${state.progress.overallProgress}%)`);
    }
    getProgress(missionId) {
        const state = this.getMonitorStateOrThrow(missionId);
        return { ...state.progress };
    }
    recordAlert(missionId, severity, message, metadata) {
        const state = this.getMonitorStateOrThrow(missionId);
        this.alertIdCounter++;
        const alert = {
            id: `alert_${this.alertIdCounter}`,
            missionId,
            severity,
            message,
            timestamp: new Date(),
            acknowledged: false,
            metadata: metadata ?? {},
        };
        state.alerts.push(alert);
        this.reassessHealth(state);
        state.health.totalAlerts++;
        state.health.activeAlerts = state.alerts.filter((a) => !a.acknowledged).length;
        state.health.lastAlertAt = new Date();
        if (severity === AlertSeverity.CRITICAL) {
            state.health.criticalAlerts++;
        }
        else if (severity === AlertSeverity.ERROR) {
            state.health.errorAlerts++;
        }
        this.logger.warn(`Mission "${missionId}" alert [${severity}]: ${message}`);
        return alert;
    }
    getAlerts(missionId, severity) {
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
    acknowledgeAlert(missionId, alertId) {
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
        this.reassessHealth(state);
        this.logger.log(`Mission "${missionId}": alert "${alertId}" acknowledged`);
        return true;
    }
    getHealth(missionId) {
        const state = this.getMonitorStateOrThrow(missionId);
        if (state.health.monitoringSince) {
            state.health.uptimeMs = Date.now() - state.health.monitoringSince.getTime();
        }
        return { ...state.health };
    }
    getActiveMissions() {
        return [...this.states.entries()]
            .filter(([, state]) => state.isMonitoring)
            .map(([missionId]) => missionId);
    }
    getStats() {
        const allStates = [...this.states.values()];
        const activeStates = allStates.filter((s) => s.isMonitoring);
        const alertsBySeverity = {
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
        const averageMissionProgress = activeStates.length > 0
            ? Math.round(activeStates.reduce((sum, s) => sum + s.progress.overallProgress, 0) /
                activeStates.length)
            : 0;
        const healthDistribution = {};
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
    recordPhaseFailure(missionId, phaseType, error) {
        const state = this.getMonitorStateOrThrow(missionId);
        state.phaseFailures++;
        state.health.phaseFailureCount = state.phaseFailures;
        const phase = state.progress.phases.find((p) => p.phaseType === phaseType);
        if (phase) {
            phase.status = 'FAILED';
            phase.lastUpdatedAt = new Date();
        }
        this.recordAlert(missionId, AlertSeverity.ERROR, `Phase "${phaseType}" failed: ${error}`, { phaseType, error });
        this.logger.error(`Mission "${missionId}": phase "${phaseType}" FAILED — ${error}`);
    }
    getMonitorStateOrThrow(missionId) {
        const state = this.states.get(missionId);
        if (!state) {
            throw new Error(`Mission "${missionId}" is not being monitored. Call startMonitoring() first.`);
        }
        return state;
    }
    reassessHealth(state) {
        const unacknowledged = state.alerts.filter((a) => !a.acknowledged);
        if (unacknowledged.some((a) => a.severity === AlertSeverity.CRITICAL)) {
            state.health.status = MissionHealthStatus.CRITICAL;
        }
        else if (unacknowledged.some((a) => a.severity === AlertSeverity.ERROR)) {
            state.health.status = MissionHealthStatus.UNHEALTHY;
        }
        else if (unacknowledged.some((a) => a.severity === AlertSeverity.WARNING)) {
            state.health.status = MissionHealthStatus.DEGRADED;
        }
        else if (state.phaseFailures > 0) {
            state.health.status = MissionHealthStatus.DEGRADED;
        }
        else {
            state.health.status = MissionHealthStatus.HEALTHY;
        }
    }
};
exports.MissionMonitorService = MissionMonitorService;
exports.MissionMonitorService = MissionMonitorService = MissionMonitorService_1 = __decorate([
    (0, common_1.Injectable)()
], MissionMonitorService);
//# sourceMappingURL=mission-monitor.service.js.map