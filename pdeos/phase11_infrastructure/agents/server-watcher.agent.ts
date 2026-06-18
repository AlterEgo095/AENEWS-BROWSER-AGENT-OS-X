/**
 * PDEOS Phase 11 — ServerWatcher
 * VPS surveillance: CPU, RAM, uptime
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
export class ServerWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'ServerWatcher', pollIntervalMs: 30000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const os = require('os');
        const cpuLoad = os.loadavg()[0];
        const memTotal = os.totalmem(); const memFree = os.freemem();
        const memUsed = (memTotal - memFree) / memTotal * 100;
        let status = WatcherStatus.HEALTHY;
        if (cpuLoad > 4 || memUsed > 95) status = WatcherStatus.UNHEALTHY;
        else if (cpuLoad > 2 || memUsed > 85) status = WatcherStatus.DEGRADED;
        return { agentName: 'ServerWatcher', status, metrics: { cpuLoad, memUsed, uptime: os.uptime(), loadAvg: os.loadavg() }, message: status === WatcherStatus.HEALTHY ? undefined : `CPU ${cpuLoad} MEM ${memUsed.toFixed(1)}%`, timestamp: new Date() };
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
