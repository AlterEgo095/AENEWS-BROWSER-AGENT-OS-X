/**
 * PDEOS Phase 11 — CpuWatcher
 * CPU load + top processes
 * Type A — Always-On (poll @Interval 30000ms)
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import {
  BaseWatcherAgent, WatcherResult, WatcherStatus, Alert, AlertSeverity, WatcherConfig,
  INotificationCenter,
} from './base-watcher.agent';

@Injectable()
export class CpuWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'CPUWatcher', pollIntervalMs: 30000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const os = require('os');
        const load = os.loadavg()[0];
        let status = WatcherStatus.HEALTHY;
        if (load > 4) status = WatcherStatus.UNHEALTHY; else if (load > 2) status = WatcherStatus.DEGRADED;
        return { agentName: 'CPUWatcher', status, metrics: { load1: load, load5: os.loadavg()[1], load15: os.loadavg()[2], cores: os.cpus().length }, timestamp: new Date() };
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
