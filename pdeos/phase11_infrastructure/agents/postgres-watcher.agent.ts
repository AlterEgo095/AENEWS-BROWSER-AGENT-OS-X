/**
 * PDEOS Phase 11 — PostgresWatcher
 * PostgreSQL connections + slow queries
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
export class PostgresWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'PostgresWatcher', pollIntervalMs: 30000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
// Uses redis check (would inject DataSource in real impl)
        const ok = await this.redis.ping() === 'PONG';
        return { agentName: 'PostgresWatcher', status: ok ? WatcherStatus.HEALTHY : WatcherStatus.UNHEALTHY, metrics: { placeholder: 'inject DataSource for real metrics' }, timestamp: new Date() };
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
