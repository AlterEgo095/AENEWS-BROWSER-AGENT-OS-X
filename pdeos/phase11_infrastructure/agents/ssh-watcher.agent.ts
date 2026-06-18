/**
 * PDEOS Phase 11 — SshWatcher
 * SSH failed attempts
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
export class SshWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'SSHWatcher', pollIntervalMs: 60000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const { execSync } = require('child_process');
        let failed = 0;
        try { failed = parseInt(execSync('grep "Failed password" /var/log/auth.log 2>/dev/null | wc -l || echo 0').toString().trim()) || 0; } catch {}
        let status = WatcherStatus.HEALTHY;
        if (failed > 50) status = WatcherStatus.UNHEALTHY; else if (failed > 10) status = WatcherStatus.DEGRADED;
        return { agentName: 'SSHWatcher', status, metrics: { failedAttempts1h: failed }, timestamp: new Date() };
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
