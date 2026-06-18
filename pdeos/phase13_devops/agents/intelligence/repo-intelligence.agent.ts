/**
 * PDEOS Phase 13 — RepoIntelligenceAgent
 * Scan continu: dead code, dup, TODO, vulnérabilités, dette technique
 * Condensed version (full impl in conversation history).
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import Redis from 'ioredis';
import { LLMService } from '../../../llm/llm.service';
import { BaseWatcherAgent, WatcherResult, WatcherStatus, WatcherConfig, AlertSeverity, INotificationCenter } from '../../../phase11_infrastructure/agents/base-watcher.agent';

@Injectable()
export class RepoIntelligenceAgent extends BaseWatcherAgent {
  protected config: WatcherConfig = {
    name: 'RepoIntelligence', pollIntervalMs: 86400000, enabled: true,
    timeoutMs: 60000, maxRetries: 2, alertCooldownMs: 3600000, severity: AlertSeverity.WARNING,
  };

  constructor(@Inject('REDIS_CLIENT') redis: Redis, notif: INotificationCenter, private llm?: LLMService) {
    super(notif, redis);
  }

  protected async poll(): Promise<WatcherResult> {
// This is a heavily condensed version. Full impl in conversation history.
        const issues = await this.scanRepo(process.env.REPO_PATH || '/app');
        return { agentName: 'RepoIntelligence', status: WatcherStatus.HEALTHY, metrics: issues, timestamp: new Date() };
  }
}
