/**
 * PDEOS Phase 11 — RestoreWatcher
 * Restore test weekly
 * Type A — Always-On (poll @Interval 604800000ms)
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import {
  BaseWatcherAgent, WatcherResult, WatcherStatus, Alert, AlertSeverity, WatcherConfig,
  INotificationCenter,
} from './base-watcher.agent';

@Injectable()
export class RestoreWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'RestoreWatcher', pollIntervalMs: 604800000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const fs = require('fs/promises');
        try { const raw = await fs.readFile('/var/log/aenews/last-restore-test.json', 'utf-8');
          const d = JSON.parse(raw); const days = (Date.now() - new Date(d.timestamp).getTime()) / 86400000;
          let status = WatcherStatus.HEALTHY;
          if (days > 14) status = WatcherStatus.UNHEALTHY; else if (days > 7) status = WatcherStatus.DEGRADED;
          return { agentName: 'RestoreWatcher', status, metrics: { lastTest: d.timestamp, daysSince: days, success: d.success }, timestamp: new Date() };
        } catch { return { agentName: 'RestoreWatcher', status: WatcherStatus.DEGRADED, metrics: {}, message: 'No restore test ever performed', timestamp: new Date() }; }
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
