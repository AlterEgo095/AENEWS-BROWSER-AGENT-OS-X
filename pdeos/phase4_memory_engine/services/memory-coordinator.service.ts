/**
 * PDEOS Phase 4 — Memory Coordinator
 * Routes remember/recall/forget to STM (Redis), MTM (Postgres), LTM (Postgres + future Qdrant).
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { MemoryEntryEntity } from '../entities/memory-entry.entity';
import { MemoryLevel, MemoryType, MemoryEntry, RecallResult } from '../dto/memory.dto';

@Injectable()
export class MemoryCoordinator {
  private logger = new Logger(MemoryCoordinator.name);

  constructor(
    @InjectRepository(MemoryEntryEntity) private mtmRepo: Repository<MemoryEntryEntity>,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  async remember(params: {
    level: MemoryLevel; key: string; value: any; type?: MemoryType;
    ttlSeconds?: number; tenantId?: string; userId?: string;
  }): Promise<string> {
    const { level, key, value, type, ttlSeconds, tenantId, userId } = params;
    const id = `mem_${uuidv4()}`;
    switch (level) {
      case MemoryLevel.STM: return this.rememberSTM(id, key, value, type, ttlSeconds ?? 3600, tenantId, userId);
      case MemoryLevel.MTM: return this.rememberMTM(id, key, value, type, ttlSeconds ?? 30 * 86400, tenantId, userId);
      case MemoryLevel.LTM: return this.rememberLTM(id, key, value, type, tenantId, userId);
    }
  }

  private async rememberSTM(id: string, key: string, value: any, type: MemoryType | undefined, ttl: number, tenantId?: string, userId?: string) {
    const redisKey = this.buildRedisKey(key, tenantId, userId);
    const entry: MemoryEntry = {
      id, level: MemoryLevel.STM, type: type ?? MemoryType.CONTEXT, key, value, tenantId, userId,
      createdAt: new Date(), expiresAt: new Date(Date.now() + ttl * 1000),
    };
    await this.redis.set(redisKey, JSON.stringify(entry), 'EX', ttl);
    return id;
  }

  private async rememberMTM(id: string, key: string, value: any, type: MemoryType | undefined, ttl: number, tenantId?: string, userId?: string) {
    const expiresAt = new Date(Date.now() + ttl * 1000);
    await this.mtmRepo.save(this.mtmRepo.create({
      id, level: MemoryLevel.MTM, type: type ?? MemoryType.MISSION, key, value,
      tenantId: tenantId ?? null, userId: userId ?? null, expiresAt,
    }));
    return id;
  }

  private async rememberLTM(id: string, key: string, value: any, type: MemoryType | undefined, tenantId?: string, userId?: string) {
    await this.mtmRepo.save(this.mtmRepo.create({
      id, level: MemoryLevel.LTM, type: type ?? MemoryType.KNOWLEDGE, key, value,
      tenantId: tenantId ?? null, userId: userId ?? null, expiresAt: null,
    }));
    return id;
  }

  async recall(params: { query: string; level?: MemoryLevel; limit?: number; tenantId?: string; userId?: string }): Promise<RecallResult> {
    const { query, level, limit = 10, tenantId, userId } = params;
    const targetLevel = level ?? MemoryLevel.MTM;
    if (targetLevel === MemoryLevel.STM) return this.recallSTM(query, limit, tenantId, userId);
    return this.recallFromPostgres(query, targetLevel, limit, tenantId, userId);
  }

  private async recallSTM(query: string, limit: number, tenantId?: string, userId?: string): Promise<RecallResult> {
    const pattern = this.buildRedisPattern(tenantId, userId);
    const keys = await this.redis.keys(pattern);
    const entries: MemoryEntry[] = [];
    for (const k of keys.slice(0, limit * 2)) {
      const raw = await this.redis.get(k);
      if (!raw) continue;
      try {
        const e: MemoryEntry = JSON.parse(raw);
        if (e.key.includes(query) || JSON.stringify(e.value).includes(query)) entries.push(e);
      } catch {}
    }
    return { entries: entries.slice(0, limit), total: entries.length, query, level: MemoryLevel.STM };
  }

  private async recallFromPostgres(query: string, level: MemoryLevel, limit: number, tenantId?: string, userId?: string): Promise<RecallResult> {
    const qb = this.mtmRepo.createQueryBuilder('m')
      .where('m.level = :level', { level })
      .andWhere('(m.key ILIKE :q OR m.value::text ILIKE :q)', { q: `%${query}%` })
      .andWhere('(m.expiresAt IS NULL OR m.expiresAt > NOW())')
      .orderBy('m.createdAt', 'DESC').limit(limit);
    if (tenantId) qb.andWhere('(m.tenantId = :tenantId OR m.tenantId IS NULL)', { tenantId });
    if (userId) qb.andWhere('(m.userId = :userId OR m.userId IS NULL)', { userId });
    const [entities, total] = await qb.getManyAndCount();
    return {
      entries: entities.map((e) => ({
        id: e.id, level: e.level, type: e.type, key: e.key, value: e.value,
        tenantId: e.tenantId ?? undefined, userId: e.userId ?? undefined,
        createdAt: e.createdAt, expiresAt: e.expiresAt ?? undefined,
      })),
      total, query, level,
    };
  }

  async forget(level: MemoryLevel, key: string, tenantId?: string, userId?: string): Promise<boolean> {
    if (level === MemoryLevel.STM) {
      return (await this.redis.del(this.buildRedisKey(key, tenantId, userId))) > 0;
    }
    const qb = this.mtmRepo.createQueryBuilder().delete().where('level = :level', { level }).andWhere('key = :key', { key });
    if (tenantId) qb.andWhere('tenantId = :tenantId', { tenantId });
    if (userId) qb.andWhere('userId = :userId', { userId });
    return ((await qb.execute()).affected ?? 0) > 0;
  }

  private buildRedisKey(key: string, tenantId?: string, userId?: string): string {
    return ['stm', tenantId ? `t:${tenantId}` : null, userId ? `u:${userId}` : null, key].filter(Boolean).join(':');
  }
  private buildRedisPattern(tenantId?: string, userId?: string): string {
    return ['stm', tenantId ? `t:${tenantId}` : null, userId ? `u:${userId}` : null, '*'].filter(Boolean).join(':');
  }
}
