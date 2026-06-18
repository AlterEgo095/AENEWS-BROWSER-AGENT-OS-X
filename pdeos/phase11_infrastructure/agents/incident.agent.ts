/**
 * PDEOS Phase 11 — Incident
 * Correlate alerts into incidents
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
export class IncidentAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'Incident', pollIntervalMs: 60000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const recentRaw = await this.redis.lrange('alerts:recent', 0, 19);
        const recent = recentRaw.map((r: string) => JSON.parse(r));
        const critical = recent.filter((a: any) => a.severity === 'critical');
        const openIncidents = await this.redis.llen('incidents:open');
        let status = WatcherStatus.HEALTHY;
        if (critical.length > 0 || openIncidents > 0) status = WatcherStatus.UNHEALTHY;
        return { agentName: 'Incident', status, metrics: { criticalAlerts5min: critical.length, openIncidents }, timestamp: new Date() };
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
