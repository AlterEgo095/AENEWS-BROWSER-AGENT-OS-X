/**
 * PDEOS Phase 11 — SelfHealing
 * Execute pending safe repairs
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
export class SelfHealingAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'SelfHealing', pollIntervalMs: 30000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const pending = await this.redis.lrange('self-healing:pending', 0, 9);
        let executed = 0;
        for (const raw of pending) {
          try { const r = JSON.parse(raw);
            if (r.action === 'restart_container' && r.container) {
              const { execSync } = require('child_process');
              await new Promise((res, rej) => require('child_process').exec(`docker restart ${r.container}`, (e: any) => e ? rej(e) : res(undefined)));
              executed++;
            }
          } catch {}
        }
        if (executed > 0) await this.redis.ltrim('self-healing:pending', executed, -1);
        return { agentName: 'SelfHealing', status: WatcherStatus.HEALTHY, metrics: { pending: pending.length, executed }, timestamp: new Date() };
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
