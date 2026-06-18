/**
 * PDEOS Phase 11 — PackageUpdate
 * npm outdated + audit
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
export class PackageUpdateAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'PackageUpdate', pollIntervalMs: 86400000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const { execSync } = require('child_process');
        let outdated = 0; let vulns = 'none';
        try { const out = execSync('cd /app && (bun outdated 2>/dev/null || npm outdated 2>/dev/null) | wc -l').toString().trim(); outdated = parseInt(out) || 0;
          const audit = execSync('cd /app && (bun audit 2>/dev/null || npm audit 2>/dev/null) | tail -5').toString(); vulns = audit.includes('vulnerabilities') ? audit : 'none';
        } catch {}
        let status = WatcherStatus.HEALTHY;
        if (vulns.includes('critical')) status = WatcherStatus.UNHEALTHY; else if (outdated > 20) status = WatcherStatus.DEGRADED;
        return { agentName: 'PackageUpdate', status, metrics: { outdatedCount: outdated, vulnerabilities: vulns }, timestamp: new Date() };
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
