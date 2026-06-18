/**
 * PDEOS Phase 11 — RedisWatcher
 * Redis memory + clients + ops/sec
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
export class RedisWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'RedisWatcher', pollIntervalMs: 30000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const info = await this.redis.info();
        const parse = (t: string) => { const o: any = {}; t.split('\n').forEach((l) => { if (l.includes(':')) { const [k, v] = l.split(':'); o[k.trim()] = v.trim(); } }); return o; };
        const p = parse(info);
        const memUsed = parseInt(p.used_memory || '0');
        const maxMem = parseInt(p.maxmemory || '0');
        const memUsage = maxMem > 0 ? (memUsed / maxMem) * 100 : 0;
        let status = WatcherStatus.HEALTHY;
        if (memUsage > 95) status = WatcherStatus.UNHEALTHY; else if (memUsage > 80) status = WatcherStatus.DEGRADED;
        return { agentName: 'RedisWatcher', status, metrics: { memUsed, maxMem, memUsage, clients: parseInt(p.connected_clients || '0'), opsPerSec: parseInt(p.instantaneous_ops_per_sec || '0') }, timestamp: new Date() };
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
