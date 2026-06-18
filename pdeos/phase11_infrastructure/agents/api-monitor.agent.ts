/**
 * PDEOS Phase 11 — ApiMonitor
 * API latency + throughput
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
export class ApiMonitorAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'APIMonitor', pollIntervalMs: 60000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const start = Date.now();
        try { await fetch(process.env.API_MONITOR_URL || 'http://localhost:3000/api/v1/health', { signal: AbortSignal.timeout(5000) });
          const latency = Date.now() - start;
          let status = WatcherStatus.HEALTHY;
          if (latency > 5000) status = WatcherStatus.UNHEALTHY; else if (latency > 2000) status = WatcherStatus.DEGRADED;
          return { agentName: 'APIMonitor', status, metrics: { latencyMs: latency }, timestamp: new Date() };
        } catch (e: any) { return { agentName: 'APIMonitor', status: WatcherStatus.UNHEALTHY, metrics: {}, message: e.message, timestamp: new Date() }; }
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
