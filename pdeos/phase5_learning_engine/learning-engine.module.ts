/**
 * AENEWS Agent OS X → PDEOS — Phase 5
 *
 * File: backend/src/modules/learning-engine/learning-engine.module.ts
 */
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LLMModule } from '../llm/llm.module';
import { RedisModule } from '../redis/redis.module';
import { LearningEngine } from './services/learning-engine.service';
import { LearningController } from './controllers/learning.controller';

@Module({
  imports: [LLMModule, RedisModule, ScheduleModule.forRoot()],
  controllers: [LearningController],
  providers: [LearningEngine],
  exports: [LearningEngine],
})
export class LearningEngineModule {}
