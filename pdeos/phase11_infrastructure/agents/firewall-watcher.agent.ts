/**
 * PDEOS Phase 11 — FirewallWatcher
 * Firewall rules drift
 * Type A — Always-On (poll @Interval 1800000ms)
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import {
  BaseWatcherAgent, WatcherResult, WatcherStatus, Alert, AlertSeverity, WatcherConfig,
  INotificationCenter,
} from './base-watcher.agent';

@Injectable()
export class FirewallWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'FirewallWatcher', pollIntervalMs: 1800000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const { execSync } = require('child_process');
        let active = false;
        try { const out = execSync('ufw status 2>/dev/null || iptables -L 2>/dev/null').toString(); active = out.includes('active') || out.includes('Chain'); } catch {}
        return { agentName: 'FirewallWatcher', status: active ? WatcherStatus.HEALTHY : WatcherStatus.DEGRADED, metrics: { active }, timestamp: new Date() };
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
