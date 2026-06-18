/**
 * PDEOS Phase 11 — HealthWatcher
 * HTTP health endpoints
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
export class HealthWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'HealthWatcher', pollIntervalMs: 30000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const endpoints = (process.env.HEALTH_ENDPOINTS || 'http://localhost:3000/api/v1/health').split(',');
        const checks = await Promise.all(endpoints.map(async (url) => {
          try { const r = await fetch(url, { signal: AbortSignal.timeout(5000) }); return { url, ok: r.ok, status: r.status }; }
          catch (e: any) { return { url, ok: false, error: e.message }; }
        }));
        const failed = checks.filter((c) => !c.ok);
        let status = WatcherStatus.HEALTHY;
        if (failed.length === checks.length) status = WatcherStatus.UNHEALTHY; else if (failed.length > 0) status = WatcherStatus.DEGRADED;
        return { agentName: 'HealthWatcher', status, metrics: { total: checks.length, healthy: checks.length - failed.length, failed: failed.length }, timestamp: new Date() };
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
