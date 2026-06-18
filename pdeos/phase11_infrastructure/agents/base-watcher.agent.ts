/**
 * PDEOS Phase 11 — BaseWatcherAgent
 * Abstract class for all 30 Always-On infrastructure agents.
 * Factorizes: scheduling, alerting, retry, circuit breaker, metrics.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';

export enum WatcherStatus { HEALTHY = 'healthy', DEGRADED = 'degraded', UNHEALTHY = 'unhealthy', OFFLINE = 'offline' }
export enum AlertSeverity { INFO = 'info', WARNING = 'warning', ERROR = 'error', CRITICAL = 'critical' }

export interface WatcherResult {
  agentName: string; status: WatcherStatus; metrics: Record<string, any>;
  message?: string; details?: any; timestamp: Date;
}
export interface Alert {
  id: string; agentName: string; severity: AlertSeverity; title: string; message: string;
  metrics?: Record<string, any>; suggestedAction?: string; requiresHumanApproval?: boolean;
  timestamp: Date; fingerprint: string;
}
export interface WatcherConfig {
  name: string; pollIntervalMs: number; enabled: boolean; timeoutMs: number;
  maxRetries: number; alertCooldownMs: number; severity: AlertSeverity;
}

// NotificationCenter stub interface (real implementation in Phase 11 module)
export interface INotificationCenter {
  dispatch(params: any): Promise<any>;
}

export abstract class BaseWatcherAgent {
  protected logger: Logger;
  protected abstract config: WatcherConfig;
  protected lastResult: WatcherResult | null = null;
  protected lastAlertAt: Map<string, Date> = new Map();
  protected consecutiveFailures = 0;
  protected isPolling = false;
  protected pollTimer: NodeJS.Timeout | null = null;

  constructor(
    protected notificationCenter: INotificationCenter,
    @Inject('REDIS_CLIENT') protected redis: Redis,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async start(): Promise<void> {
    if (!this.config.enabled || this.pollTimer) return;
    this.logger.log(`${this.config.name} starting (interval ${this.config.pollIntervalMs}ms)`);
    await this.tick();
    this.pollTimer = setInterval(() => this.tick().catch((e) => this.logger.error(`Tick: ${e.message}`)), this.config.pollIntervalMs);
  }

  async stop(): Promise<void> {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  private async tick(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;
    try {
      const result = await this.executeWithRetry();
      this.consecutiveFailures = 0;
      this.lastResult = result;
      await this.emitMetrics(result);
      const alert = this.evaluate(result);
      if (alert) await this.dispatchAlert(alert);
    } catch (err) {
      this.consecutiveFailures++;
      this.logger.error(`${this.config.name} failed (${this.consecutiveFailures}/${this.config.maxRetries}): ${err.message}`);
      if (this.consecutiveFailures >= this.config.maxRetries) {
        await this.dispatchAlert({
          id: `alert_${uuidv4()}`, agentName: this.config.name,
          severity: AlertSeverity.CRITICAL,
          title: `${this.config.name} — Circuit breaker opened`,
          message: `Failed ${this.consecutiveFailures} times. Last: ${err.message}`,
          fingerprint: `circuit-breaker:${this.config.name}`, timestamp: new Date(),
        });
      }
    } finally { this.isPolling = false; }
  }

  private async executeWithRetry(): Promise<WatcherResult> {
    let lastErr: Error | null = null;
    for (let i = 1; i <= this.config.maxRetries; i++) {
      try {
        return await Promise.race([
          this.poll(),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`Timeout ${this.config.timeoutMs}ms`)), this.config.timeoutMs)),
        ]);
      } catch (e) { lastErr = e as Error; if (i < this.config.maxRetries) await new Promise((r) => setTimeout(r, 1000 * i)); }
    }
    throw lastErr!;
  }

  private async dispatchAlert(alert: Alert): Promise<void> {
    const lastSeen = this.lastAlertAt.get(alert.fingerprint);
    if (lastSeen && Date.now() - lastSeen.getTime() < this.config.alertCooldownMs) return;
    this.lastAlertAt.set(alert.fingerprint, new Date());
    await this.redis.set(`alert:${this.config.name}:${alert.id}`, JSON.stringify(alert), 'EX', 86400);
    await this.redis.lpush('alerts:recent', JSON.stringify(alert));
    await this.redis.ltrim('alerts:recent', 0, 99);
    await this.notificationCenter.dispatch({
      agentName: alert.agentName, severity: alert.severity,
      title: alert.title, message: alert.message, metadata: { alertId: alert.id, metrics: alert.metrics },
    });
    this.logger.warn(`Alert: [${alert.severity.toUpperCase()}] ${alert.title}`);
    await this.onAlert(alert);
  }

  private async emitMetrics(result: WatcherResult): Promise<void> {
    const payload = { agent: this.config.name, status: result.status, metrics: result.metrics, timestamp: result.timestamp.toISOString() };
    await this.redis.set(`metrics:${this.config.name}`, JSON.stringify(payload), 'EX', 300);
    await this.redis.publish('metrics:live', JSON.stringify(payload));
  }

  getLastResult() { return this.lastResult; }
  getStatus(): WatcherStatus { return this.lastResult?.status ?? WatcherStatus.OFFLINE; }
  getConfig() { return this.config; }

  protected abstract poll(): Promise<WatcherResult>;
  protected evaluate(result: WatcherResult): Alert | null {
    if (result.status === WatcherStatus.HEALTHY) return null;
    return {
      id: `alert_${uuidv4()}`, agentName: this.config.name, severity: this.config.severity,
      title: `${this.config.name} — ${result.status.toUpperCase()}`,
      message: result.message ?? `${this.config.name} reported ${result.status}`,
      metrics: result.metrics, fingerprint: `${this.config.name}:${result.status}`, timestamp: new Date(),
    };
  }
  protected async onAlert(_alert: Alert): Promise<void> {}
}
