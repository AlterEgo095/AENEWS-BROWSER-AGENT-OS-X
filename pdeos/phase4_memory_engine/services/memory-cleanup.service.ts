/**
 * PDEOS Phase 4 — Memory cleanup service (daily purge of expired MTM)
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { MemoryEntryEntity } from '../entities/memory-entry.entity';

@Injectable()
export class MemoryCleanupService {
  private logger = new Logger(MemoryCleanupService.name);
  constructor(@InjectRepository(MemoryEntryEntity) private repo: Repository<MemoryEntryEntity>) {}

  @Cron('0 5 * * *')
  async purgeExpired(): Promise<{ deleted: number }> {
    const r = await this.repo.delete({ expiresAt: LessThan(new Date()) });
    const deleted = r.affected ?? 0;
    this.logger.log(`Purged ${deleted} expired entries`);
    return { deleted };
  }
}
