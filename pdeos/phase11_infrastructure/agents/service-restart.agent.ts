/**
 * PDEOS Phase 11 — ServiceRestart
 * Failed systemd services + restarting containers
 * Type A — Always-On (poll @Interval 60000ms)
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import {
  BaseWatcherAgent, WatcherResult, WatcherStatus, Alert, AlertSeverity, WatcherConfig,
  INotificationCenter,
} from './base-watcher.agent';

@Injectable()
export class ServiceRestartAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'ServiceRestart', pollIntervalMs: 60000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const { execSync } = require('child_process');
        let failed: string[] = [];
        try { const out = execSync('systemctl --failed --no-legend 2>/dev/null | awk "{print $1}"').toString().trim(); failed = out.split('\n').filter(Boolean); } catch {}
        let restarting: string[] = [];
        try { const out = execSync('docker ps -a --filter "status=restarting" --format "{{.Names}}" 2>/dev/null').toString().trim(); restarting = out.split('\n').filter(Boolean); } catch {}
        const total = failed.length + restarting.length;
        let status = WatcherStatus.HEALTHY;
        if (total > 5) status = WatcherStatus.UNHEALTHY; else if (total > 0) status = WatcherStatus.DEGRADED;
        return { agentName: 'ServiceRestart', status, metrics: { failedServices: failed, restartingContainers: restarting, totalIssues: total }, timestamp: new Date() };
  }

  protected async onAlert(alert: Alert): Promise<void> {
    if (alert.severity === AlertSeverity.CRITICAL && this.config.name !== 'SelfHealing') {
      await this.redis.lpush('self-healing:pending', JSON.stringify({
        id: uuidv4(), source: this.config.name, alertId: alert.id,
        reason: alert.message, timestamp: new Date().toISOString(),
      }));
    }
  }
}
