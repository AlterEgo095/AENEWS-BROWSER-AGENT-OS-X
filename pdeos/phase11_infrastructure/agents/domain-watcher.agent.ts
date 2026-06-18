/**
 * PDEOS Phase 11 — DomainWatcher
 * Domain expiration via RDAP
 * Type A — Always-On (poll @Interval 86400000ms)
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import {
  BaseWatcherAgent, WatcherResult, WatcherStatus, Alert, AlertSeverity, WatcherConfig,
  INotificationCenter,
} from './base-watcher.agent';

@Injectable()
export class DomainWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'DomainWatcher', pollIntervalMs: 86400000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const domains = (process.env.DOMAIN_WATCH_LIST || '').split(',').filter(Boolean);
        if (domains.length === 0) return { agentName: 'DomainWatcher', status: WatcherStatus.HEALTHY, metrics: { domains: 0 }, timestamp: new Date() };
        const checks = await Promise.all(domains.slice(0, 5).map(async (d) => {
          try { const r = await fetch(`https://rdap.org/domain/${d}`, { signal: AbortSignal.timeout(5000) }); const j = await r.json();
            const exp = j.events?.find((e: any) => e.eventAction === 'expiration')?.eventDate;
            return { domain: d, expiry: exp };
          } catch (e: any) { return { domain: d, error: e.message }; }
        }));
        return { agentName: 'DomainWatcher', status: WatcherStatus.HEALTHY, metrics: { checks }, timestamp: new Date() };
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
