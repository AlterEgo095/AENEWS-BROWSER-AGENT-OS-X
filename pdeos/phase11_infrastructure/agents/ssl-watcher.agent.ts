/**
 * PDEOS Phase 11 — SslWatcher
 * SSL cert expiration
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
export class SslWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'SSLWatcher', pollIntervalMs: 86400000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const tls = require('tls');
        const domains = (process.env.SSL_WATCH_DOMAINS || 'localhost').split(',');
        const checks = await Promise.all(domains.map((d) => new Promise<any>((resolve) => {
          const sock = tls.connect(443, d, { servername: d, rejectUnauthorized: false }, () => {
            const cert = sock.getPeerCertificate();
            const validTo = new Date(cert.valid_to);
            const days = Math.floor((validTo.getTime() - Date.now()) / 86400000);
            sock.end(); resolve({ domain: d, validTo, daysRemaining: days });
          });
          sock.setTimeout(5000, () => { sock.destroy(); resolve({ domain: d, error: 'timeout' }); });
          sock.on('error', (e) => resolve({ domain: d, error: e.message }));
        })));
        const critical = checks.filter((c) => c.daysRemaining !== undefined && c.daysRemaining < 7);
        let status = WatcherStatus.HEALTHY;
        if (critical.length > 0) status = WatcherStatus.UNHEALTHY;
        return { agentName: 'SSLWatcher', status, metrics: { checks, criticalCount: critical.length }, timestamp: new Date() };
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
