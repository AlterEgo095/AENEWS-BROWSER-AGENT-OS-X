/**
 * AENEWS Agent OS X - Memory Module
 * Provides all memory tier services and the unified RAG pipeline.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MemoryService } from './memory.service';
import { WorkingMemoryService } from './working-memory.service';
import { SessionMemoryService } from './session-memory.service';
import { LongTermMemoryService } from './long-term-memory.service';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { VectorSearchService } from './vector-search.service';
import { RAGService } from './rag.service';

@Module({
  imports: [ConfigModule],
  providers: [
    MemoryService,
    WorkingMemoryService,
    SessionMemoryService,
    LongTermMemoryService,
    KnowledgeGraphService,
    VectorSearchService,
    RAGService,
  ],
  exports: [
    MemoryService,
    WorkingMemoryService,
    SessionMemoryService,
    LongTermMemoryService,
    KnowledgeGraphService,
    VectorSearchService,
    RAGService,
  ],
})
export class MemoryModule {}
