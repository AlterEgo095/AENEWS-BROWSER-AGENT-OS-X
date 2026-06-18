/**
 * PDEOS Phase 11 — LogAnalyzer
 * Log error patterns
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
export class LogAnalyzerAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'LogAnalyzer', pollIntervalMs: 60000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const { execSync } = require('child_process');
        let errors = 0;
        try { errors = parseInt(execSync('journalctl -u aenews-backend --since "1 hour ago" -p err 2>/dev/null | wc -l').toString().trim()) || 0; } catch {}
        let status = WatcherStatus.HEALTHY;
        if (errors > 50) status = WatcherStatus.UNHEALTHY; else if (errors > 10) status = WatcherStatus.DEGRADED;
        return { agentName: 'LogAnalyzer', status, metrics: { errorsLastHour: errors }, timestamp: new Date() };
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
