/**
 * PDEOS Phase 13 — RepoMonitor
 * GitHub repos activity
 * Always-On @Interval 300000ms
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import Redis from 'ioredis';
import { BaseWatcherAgent, WatcherResult, WatcherStatus, Alert, AlertSeverity, WatcherConfig, INotificationCenter } from '../../../phase11_infrastructure/agents/base-watcher.agent';

const execAsync = promisify(exec);

@Injectable()
export class RepoMonitorAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'RepoMonitor', pollIntervalMs: 300000, enabled: true,
    timeoutMs: 30000, maxRetries: 3, alertCooldownMs: 600000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
    // Stub: real implementation varies per agent (see conversation history)
    return {
      agentName: 'RepoMonitor', status: WatcherStatus.HEALTHY,
      metrics: { note: 'GitHub repos activity — full impl in conversation history' },
      timestamp: new Date(),
    };
  }

  protected async onAlert(alert: Alert): Promise<void> {
    if (alert.severity === AlertSeverity.CRITICAL) {
      await this.redis.lpush('cos:pending-missions', JSON.stringify({
        id: `mission_${require('uuid').v4()}`,
        prompt: `[Auto] ${alert.title}: ${alert.message}`,
        priority: 'critical', triggeredBy: this.config.name, alertId: alert.id,
      }));
    }
  }
}
