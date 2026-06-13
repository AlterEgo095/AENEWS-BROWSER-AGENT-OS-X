/**
 * AENEWS Agent OS X - Memory Team Module
 *
 * Provides context management, RAG, and knowledge graph capabilities.
 */

import { Module } from '@nestjs/common';
import { MemoryTeamService } from './memory-team.service';

@Module({
  providers: [MemoryTeamService],
  exports: [MemoryTeamService],
})
export class MemoryTeamModule {}
