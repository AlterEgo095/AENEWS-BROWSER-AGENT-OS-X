/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 * File: backend/src/modules/content-factory/agents/text/transcript-writer.agent.ts
 *
 * Transcription audio/vidéo → texte structuré
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { BaseContentAgent, ContentType } from '../base-content.agent';

@Injectable()
export class TranscriptWriterAgent extends BaseContentAgent {
  protected readonly supportedType = ContentType.TRANSCRIPT;

  constructor(llmService: LLMService, @Inject('REDIS_CLIENT') redis: Redis) {
    super(llmService, redis);
  }

protected defaultWordCount(): number { return 5000; }
}
