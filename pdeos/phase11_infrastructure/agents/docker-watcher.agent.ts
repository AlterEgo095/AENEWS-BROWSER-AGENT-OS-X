/**
 * PDEOS Phase 11 — DockerWatcher
 * Docker daemon + containers
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
export class DockerWatcherAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'DockerWatcher', pollIntervalMs: 60000, enabled: true,
    timeoutMs: 10000, maxRetries: 3, alertCooldownMs: 300000, severity: AlertSeverity.WARNING,
  };

  constructor(notif: INotificationCenter, @Inject('REDIS_CLIENT') redis: Redis) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
let info: any = null;
        try { const { execSync } = require('child_process');
          info = JSON.parse(execSync('docker info --format "{{json .}}" 2>/dev/null').toString());
        } catch { return { agentName: 'DockerWatcher', status: WatcherStatus.OFFLINE, metrics: {}, message: 'Docker daemon unreachable', timestamp: new Date() }; }
        return { agentName: 'DockerWatcher', status: WatcherStatus.HEALTHY, metrics: { containers: info.Containers, running: info.ContainersRunning, stopped: info.ContainersStopped, version: info.ServerVersion }, timestamp: new Date() };
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
