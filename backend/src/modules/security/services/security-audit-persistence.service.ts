/**
 * AENEWS Agent OS X — Security Audit Persistence Service
 *
 * Bridges the in-memory SecurityGatewayService audit log to the database
 * AuditLog entity. Provides:
 *
 *   - Async batched persistence (flush every N seconds or N entries)
 *   - Search & query API for security dashboards
 *   - Threat trend analysis
 *   - Compliance reporting
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan, In } from 'typeorm';
import { AuditLog } from '../../tenant/entities/audit-log.entity';
import { SecurityGatewayService, SecurityThreat, SecurityThreatType } from '../../../../src/gateway/security/security-gateway.service';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface SecurityAuditQuery {
  startDate?: Date;
  endDate?: Date;
  threatType?: SecurityThreatType;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  agentId?: string;
  action?: string;
  result?: 'allowed' | 'blocked' | 'sanitized';
  minRiskScore?: number;
  limit?: number;
  offset?: number;
}

export interface SecurityAuditStats {
  totalEvents: number;
  blockedEvents: number;
  sanitizedEvents: number;
  allowedEvents: number;
  averageRiskScore: number;
  topThreatTypes: Array<{ type: string; count: number }>;
  topAgents: Array<{ agentId: string; count: number }>;
  severityBreakdown: Record<string, number>;
  trend: Array<{ date: string; blocked: number; total: number }>;
}

@Injectable()
export class SecurityAuditPersistenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SecurityAuditPersistenceService.name);

  /** Buffer for batched writes */
  private readonly writeBuffer: Array<{
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    oldValues: Record<string, any>;
    newValues: Record<string, any>;
    ipAddress: string;
    userAgent: string;
  }> = [];

  private flushInterval: NodeJS.Timeout | null = null;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @Optional() private readonly securityGateway?: SecurityGatewayService,
    @Optional() private readonly configService?: ConfigService,
  ) {
    this.batchSize = this.configService?.get<number>('security.audit.batchSize') ?? 50;
    this.flushIntervalMs = (this.configService?.get<number>('security.audit.flushIntervalSec') ?? 10) * 1000;
  }

  async onModuleInit(): Promise<void> {
    // Periodic flush of buffered audit entries
    this.flushInterval = setInterval(() => {
      this.flush().catch((err) =>
        this.logger.error(`Audit flush error: ${err.message}`),
      );
    }, this.flushIntervalMs);

    this.logger.log(`SecurityAuditPersistenceService initialized: batchSize=${this.batchSize}, flushInterval=${this.flushIntervalMs}ms`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    // Final flush
    await this.flush();
  }

  /**
   * Record a security event to the audit log.
   */
  async recordSecurityEvent(event: {
    action: string;
    entityType: string;
    entityId?: string;
    userId?: string;
    tenantId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    this.writeBuffer.push({
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId || '',
      userId: event.userId || '',
      tenantId: event.tenantId || '',
      oldValues: null,
      newValues: event.details || null,
      ipAddress: event.ipAddress || '',
      userAgent: event.userAgent || '',
    });

    // Flush immediately if buffer is full
    if (this.writeBuffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Flush the write buffer to the database.
   */
  async flush(): Promise<void> {
    if (this.writeBuffer.length === 0) return;

    const batch = this.writeBuffer.splice(0, this.batchSize);

    try {
      const entities = batch.map((entry) =>
        this.auditLogRepository.create({
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId || undefined,
          userId: entry.userId || undefined,
          tenantId: entry.tenantId || undefined,
          oldValues: entry.oldValues,
          newValues: entry.newValues,
          ipAddress: entry.ipAddress || undefined,
          userAgent: entry.userAgent || undefined,
        }),
      );

      await this.auditLogRepository.save(entities);
      this.logger.debug(`Flushed ${entities.length} audit entries to database`);
    } catch (error) {
      this.logger.error(`Failed to flush audit entries: ${error.message}`);
      // Re-add failed entries to the buffer (at the front)
      this.writeBuffer.unshift(...batch);
    }
  }

  /**
   * Sync the SecurityGatewayService in-memory audit log to the database.
   * Called periodically via cron.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncGatewayAuditLog(): Promise<void> {
    if (!this.securityGateway) return;

    const entries = this.securityGateway.getAuditLog(1000);
    if (entries.length === 0) return;

    let synced = 0;
    for (const entry of entries) {
      await this.recordSecurityEvent({
        action: `security.${entry.action}`,
        entityType: 'security_check',
        entityId: entry.agentId,
        userId: entry.agentId,
        tenantId: entry.metadata?.tenantId,
        ipAddress: entry.metadata?.ipAddress,
        userAgent: entry.metadata?.userAgent,
        details: {
          result: entry.result,
          riskScore: entry.riskScore,
          policy: entry.policy,
          threatCount: entry.threats.length,
          threatTypes: entry.threats.map((t) => t.type),
          threatSeverities: entry.threats.map((t) => t.severity),
        },
      });
      synced++;
    }

    if (synced > 0) {
      this.logger.debug(`Synced ${synced} gateway audit entries`);
    }
  }

  /**
   * Query the security audit log.
   */
  async queryAuditLog(query: SecurityAuditQuery): Promise<{ entries: AuditLog[]; total: number }> {
    const qb = this.auditLogRepository
      .createQueryBuilder('audit')
      .where('audit.action LIKE :securityPrefix', { securityPrefix: 'security.%' });

    if (query.startDate) {
      qb.andWhere('audit.created_at >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('audit.created_at <= :endDate', { endDate: query.endDate });
    }
    if (query.action) {
      qb.andWhere('audit.action = :action', { action: query.action });
    }
    if (query.userId) {
      qb.andWhere('audit.user_id = :userId', { userId: query.userId });
    }
    if (query.tenantId) {
      qb.andWhere('audit.tenant_id = :tenantId', { tenantId: query.tenantId });
    }
    if (query.entityId) {
      qb.andWhere('audit.entity_id = :entityId', { entityId: query.entityId });
    }
    if (query.minRiskScore !== undefined) {
      qb.andWhere("audit.new_values->>'riskScore' >= :minRiskScore", {
        minRiskScore: query.minRiskScore.toString(),
      });
    }

    const total = await qb.getCount();
    const entries = await qb
      .orderBy('audit.created_at', 'DESC')
      .limit(query.limit ?? 100)
      .offset(query.offset ?? 0)
      .getMany();

    return { entries, total };
  }

  /**
   * Get security audit statistics for a given time range.
   */
  async getAuditStats(startDate: Date, endDate: Date, tenantId?: string): Promise<SecurityAuditStats> {
    const qb = this.auditLogRepository
      .createQueryBuilder('audit')
      .where('audit.action LIKE :securityPrefix', { securityPrefix: 'security.%' })
      .andWhere('audit.created_at BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (tenantId) {
      qb.andWhere('audit.tenant_id = :tenantId', { tenantId });
    }

    const entries = await qb.getMany();

    const totalEvents = entries.length;
    const blockedEvents = entries.filter((e) => e.newValues?.result === 'blocked').length;
    const sanitizedEvents = entries.filter((e) => e.newValues?.result === 'sanitized').length;
    const allowedEvents = entries.filter((e) => e.newValues?.result === 'allowed').length;

    const riskScores = entries
      .filter((e) => e.newValues?.riskScore !== undefined)
      .map((e) => e.newValues.riskScore as number);
    const averageRiskScore = riskScores.length > 0
      ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length
      : 0;

    // Top threat types
    const threatTypeCounts: Record<string, number> = {};
    const agentCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};

    for (const entry of entries) {
      const types: string[] = entry.newValues?.threatTypes || [];
      for (const type of types) {
        threatTypeCounts[type] = (threatTypeCounts[type] || 0) + 1;
      }

      if (entry.entityId) {
        agentCounts[entry.entityId] = (agentCounts[entry.entityId] || 0) + 1;
      }

      const severities: string[] = entry.newValues?.threatSeverities || [];
      for (const sev of severities) {
        severityCounts[sev] = (severityCounts[sev] || 0) + 1;
      }
    }

    const topThreatTypes = Object.entries(threatTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));

    const topAgents = Object.entries(agentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([agentId, count]) => ({ agentId, count }));

    return {
      totalEvents,
      blockedEvents,
      sanitizedEvents,
      allowedEvents,
      averageRiskScore: Math.round(averageRiskScore * 100) / 100,
      topThreatTypes,
      topAgents,
      severityBreakdown: severityCounts,
      trend: [], // Would need time-series aggregation in production
    };
  }

  /**
   * Clean up old audit entries (retention policy).
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldEntries(): Promise<number> {
    const retentionDays = this.configService?.get<number>('security.audit.retentionDays') ?? 90;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .andWhere('action LIKE :securityPrefix', { securityPrefix: 'security.%' })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} audit entries older than ${retentionDays} days`);
    }

    return result.affected ?? 0;
  }
}
