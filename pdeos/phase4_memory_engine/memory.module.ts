/**
 * PDEOS Phase 4 — Memory Module
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '../redis/redis.module';
import { MemoryEntryEntity } from './entities/memory-entry.entity';
import { MemoryCoordinator } from './services/memory-coordinator.service';
import { MemoryCleanupService } from './services/memory-cleanup.service';
import { MemoryController } from './controllers/memory.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MemoryEntryEntity]), RedisModule, ScheduleModule.forRoot()],
  controllers: [MemoryController],
  providers: [MemoryCoordinator, MemoryCleanupService],
  exports: [MemoryCoordinator],
})
export class MemoryModule {}
