/**
 * PDEOS Phase 11 — NetworkWatcher
 * Network interfaces + errors
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
export class NetworkWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'NetworkWatcher', pollIntervalMs: 30000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const os = require('os');
        const nets = os.networkInterfaces();
        const ifaces = Object.keys(nets).map((name) => ({ name, addresses: nets[name]?.map((n) => n.address) || [] }));
        return { agentName: 'NetworkWatcher', status: WatcherStatus.HEALTHY, metrics: { ifaces }, timestamp: new Date() };
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
