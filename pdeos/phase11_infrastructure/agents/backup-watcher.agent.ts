/**
 * PDEOS Phase 11 — BackupWatcher
 * Last backup age + size
 * Type A — Always-On (poll @Interval 3600000ms)
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import {
  BaseWatcherAgent, WatcherResult, WatcherStatus, Alert, AlertSeverity, WatcherConfig,
  INotificationCenter,
} from './base-watcher.agent';

@Injectable()
export class BackupWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'BackupWatcher', pollIntervalMs: 3600000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const fs = require('fs/promises');
        const dir = process.env.BACKUP_DIR || '/var/backups/aenews';
        try { const entries = await fs.readdir(dir);
          const stats = await Promise.all(entries.slice(-20).map(async (n) => { const st = await fs.stat(`${dir}/${n}`); return { name: n, size: st.size, mtime: st.mtime }; }));
          stats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
          const last = stats[0];
          const hoursSince = last ? (Date.now() - last.mtime.getTime()) / 3600000 : 999;
          let status = WatcherStatus.HEALTHY;
          if (hoursSince > 48) status = WatcherStatus.UNHEALTHY; else if (hoursSince > 30) status = WatcherStatus.DEGRADED;
          return { agentName: 'BackupWatcher', status, metrics: { totalBackups: stats.length, lastBackupAge: hoursSince, lastSize: last?.size || 0 }, timestamp: new Date() };
        } catch { return { agentName: 'BackupWatcher', status: WatcherStatus.DEGRADED, metrics: {}, message: 'Backup dir not found', timestamp: new Date() }; }
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
