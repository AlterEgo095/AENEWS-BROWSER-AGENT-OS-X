/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 * File: backend/src/modules/content-factory/agents/visual/white-paper-writer.agent.ts
 *
 * Génération white papers (10000 mots) : recherche, analyse, recommandations
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { BaseContentAgent, ContentType } from '../base-content.agent';

@Injectable()
export class WhitePaperWriterAgent extends BaseContentAgent {
  protected readonly supportedType = ContentType.WHITE_PAPER;

  constructor(llmService: LLMService, @Inject('REDIS_CLIENT') redis: Redis) {
    super(llmService, redis);
  }

protected defaultWordCount(): number { return 10000; }
}
