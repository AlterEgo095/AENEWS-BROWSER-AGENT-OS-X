/**
 * PDEOS Phase 11 — ContainerWatcher
 * Per-container health + OOM
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
export class ContainerWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'ContainerWatcher', pollIntervalMs: 60000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const { execSync } = require('child_process');
        let containers: any[] = [];
        try { const out = execSync('docker ps -a --format "{{.Names}}|{{.Status}}|{{.ID}}" 2>/dev/null').toString();
          containers = out.trim().split('\n').filter(Boolean).map((l: string) => { const p = l.split('|'); return { name: p[0], status: p[1], id: p[2] }; });
        } catch {}
        const unhealthy = containers.filter((c) => c.status.includes('unhealthy'));
        const restarting = containers.filter((c) => c.status.includes('restarting'));
        let status = WatcherStatus.HEALTHY;
        if (unhealthy.length > 0) status = WatcherStatus.UNHEALTHY; else if (restarting.length > 0) status = WatcherStatus.DEGRADED;
        return { agentName: 'ContainerWatcher', status, metrics: { total: containers.length, unhealthy: unhealthy.length, restarting: restarting.length }, timestamp: new Date() };
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
