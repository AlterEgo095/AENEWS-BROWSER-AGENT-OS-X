/**
 * PDEOS Phase 11 — LlmCostWatcher
 * LLM daily cost vs budget
 * Type A — Always-On (poll @Interval 300000ms)
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import {
  BaseWatcherAgent, WatcherResult, WatcherStatus, Alert, AlertSeverity, WatcherConfig,
  INotificationCenter,
} from './base-watcher.agent';

@Injectable()
export class LlmCostWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'LLMCostWatcher', pollIntervalMs: 300000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
const today = new Date().toISOString().slice(0, 10);
        const cost = parseFloat(await this.redis.get(`cost:llm:${today}`) || '0');
        const budget = parseFloat(await this.redis.get('budget:llm:daily') || '20');
        const util = (cost / budget) * 100;
        let status = WatcherStatus.HEALTHY;
        if (util > 100) status = WatcherStatus.UNHEALTHY; else if (util > 80) status = WatcherStatus.DEGRADED;
        return { agentName: 'LLMCostWatcher', status, metrics: { costToday: cost, budgetToday: budget, utilization: util }, timestamp: new Date() };
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
