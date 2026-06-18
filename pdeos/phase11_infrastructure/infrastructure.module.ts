/**
 * PDEOS Phase 11 — Infrastructure Module
 * Wires 30 watcher agents + scheduler + notifications + self-healing.
 */
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { RedisModule } from '../redis/redis.module';
import { BaseWatcherAgent, INotificationCenter } from './agents/base-watcher.agent';
import { ServerWatcherAgent } from './agents/server-watcher.agent';
import { CpuWatcherAgent } from './agents/cpu-watcher.agent';
import { RamWatcherAgent } from './agents/ram-watcher.agent';
import { DiskWatcherAgent } from './agents/disk-watcher.agent';
import { NetworkWatcherAgent } from './agents/network-watcher.agent';
import { DockerWatcherAgent } from './agents/docker-watcher.agent';
import { ContainerWatcherAgent } from './agents/container-watcher.agent';
import { PostgresWatcherAgent } from './agents/postgres-watcher.agent';
import { RedisWatcherAgent } from './agents/redis-watcher.agent';
import { MongoWatcherAgent } from './agents/mongo-watcher.agent';
import { Neo4jWatcherAgent } from './agents/neo4j-watcher.agent';
import { RabbitmqWatcherAgent } from './agents/rabbitmq-watcher.agent';
import { QdrantWatcherAgent } from './agents/qdrant-watcher.agent';
import { MinioWatcherAgent } from './agents/minio-watcher.agent';
import { SslWatcherAgent } from './agents/ssl-watcher.agent';
import { DomainWatcherAgent } from './agents/domain-watcher.agent';
import { FirewallWatcherAgent } from './agents/firewall-watcher.agent';
import { SshWatcherAgent } from './agents/ssh-watcher.agent';
import { BackupWatcherAgent } from './agents/backup-watcher.agent';
import { RestoreWatcherAgent } from './agents/restore-watcher.agent';
import { LogAnalyzerAgent } from './agents/log-analyzer.agent';
import { ErrorWatcherAgent } from './agents/error-watcher.agent';
import { HealthWatcherAgent } from './agents/health-watcher.agent';
import { ApiMonitorAgent } from './agents/api-monitor.agent';
import { LlmCostWatcherAgent } from './agents/llm-cost-watcher.agent';
import { TokenBudgetWatcherAgent } from './agents/token-budget-watcher.agent';
import { PackageUpdateAgent } from './agents/package-update.agent';
import { ServiceRestartAgent } from './agents/service-restart.agent';
import { IncidentAgent } from './agents/incident.agent';
import { SelfHealingAgent } from './agents/self-healing.agent';

// Stub NotificationCenter — replace with real implementation
@Injectable()
class StubNotificationCenter implements INotificationCenter {
  async dispatch(params: any): Promise<any> {
    console.log('[NOTIF]', params.severity, params.title);
    return { id: 'stub' };
  }
}

// Scheduler stub (real impl in scheduler/services/scheduler.service.ts)
@Injectable()
class SchedulerService {
  async scheduleJob(dto: any): Promise<any> { return { id: 'stub', ...dto }; }
  async listJobs(): Promise<any[]> { return []; }
  async unscheduleJob(id: string): Promise<boolean> { return true; }
}

@Module({
  imports: [
    RedisModule, ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: 'infrastructure' }),
  ],
  providers: [
    { provide: INotificationCenter, useClass: StubNotificationCenter },
    SchedulerService,
    ServerWatcherAgent,
    CpuWatcherAgent,
    RamWatcherAgent,
    DiskWatcherAgent,
    NetworkWatcherAgent,
    DockerWatcherAgent,
    ContainerWatcherAgent,
    PostgresWatcherAgent,
    RedisWatcherAgent,
    MongoWatcherAgent,
    Neo4jWatcherAgent,
    RabbitmqWatcherAgent,
    QdrantWatcherAgent,
    MinioWatcherAgent,
    SslWatcherAgent,
    DomainWatcherAgent,
    FirewallWatcherAgent,
    SshWatcherAgent,
    BackupWatcherAgent,
    RestoreWatcherAgent,
    LogAnalyzerAgent,
    ErrorWatcherAgent,
    HealthWatcherAgent,
    ApiMonitorAgent,
    LlmCostWatcherAgent,
    TokenBudgetWatcherAgent,
    PackageUpdateAgent,
    ServiceRestartAgent,
    IncidentAgent,
    SelfHealingAgent,
  ],
  exports: [SchedulerService],
})
export class InfrastructureModule {}

// Need Injectable import
import { Injectable } from '@nestjs/common';
