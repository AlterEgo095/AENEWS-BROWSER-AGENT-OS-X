/**
 * PDEOS Phase 11 — TokenBudgetWatcher
 * Token usage vs daily limit
 * Type A — Always-On (poll @Interval 300000ms)
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import {
  BaseWatcherAgent, WatcherResult, WatcherStatus, Alert, AlertSeverity, WatcherConfig,
  INotificationCenter,
} from './base-watcher.agent';

@Injectable()
export class TokenBudgetWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'TokenBudgetWatcher', pollIntervalMs: 300000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const today = new Date().toISOString().slice(0, 10);
        const tokens = parseInt(await this.redis.get(`tokens:total:${today}`) || '0');
        const limit = parseInt(await this.redis.get('budget:tokens:daily') || '1000000');
        const util = (tokens / limit) * 100;
        let status = WatcherStatus.HEALTHY;
        if (util > 100) status = WatcherStatus.UNHEALTHY; else if (util > 80) status = WatcherStatus.DEGRADED;
        return { agentName: 'TokenBudgetWatcher', status, metrics: { tokensToday: tokens, limit, utilization: util }, timestamp: new Date() };
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
