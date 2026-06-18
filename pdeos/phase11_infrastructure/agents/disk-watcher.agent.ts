/**
 * PDEOS Phase 11 — DiskWatcher
 * Disk space per mount
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
export class DiskWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'DiskWatcher', pollIntervalMs: 30000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const fs = require('fs');
        const { execSync } = require('child_process');
        let disks: any[] = [];
        try { const out = execSync('df -P | awk "NR>1"').toString();
          disks = out.trim().split('\n').map((l: string) => { const p = l.split(/\s+/); return { fs: p[0], mount: p[5], size: +p[1], used: +p[2], usePct: +p[4].replace('%','') }; });
        } catch {}
        const critical = disks.find((d) => d.usePct > 95);
        const warn = disks.find((d) => d.usePct > 85);
        let status = WatcherStatus.HEALTHY;
        if (critical) status = WatcherStatus.UNHEALTHY; else if (warn) status = WatcherStatus.DEGRADED;
        return { agentName: 'DiskWatcher', status, metrics: { disks, criticalMount: critical?.mount }, timestamp: new Date() };
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
