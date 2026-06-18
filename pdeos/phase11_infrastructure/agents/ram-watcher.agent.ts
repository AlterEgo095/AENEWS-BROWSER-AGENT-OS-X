/**
 * PDEOS Phase 11 — RamWatcher
 * RAM usage + swap
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
export class RamWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'RAMWatcher', pollIntervalMs: 30000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const memUsed = (os.totalmem() - os.freemem()) / os.totalmem() * 100;
        let status = WatcherStatus.HEALTHY;
        if (memUsed > 95) status = WatcherStatus.UNHEALTHY; else if (memUsed > 85) status = WatcherStatus.DEGRADED;
        return { agentName: 'RAMWatcher', status, metrics: { memUsed, memTotal: os.totalmem(), memFree: os.freemem() }, message: status !== WatcherStatus.HEALTHY ? `Memory ${memUsed.toFixed(1)}%` : undefined, timestamp: new Date() };
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
