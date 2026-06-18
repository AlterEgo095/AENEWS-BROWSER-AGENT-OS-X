/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 * File: backend/src/modules/content-factory/agents/media/subtitle-writer.agent.ts
 *
 * Génération sous-titres SRT/VTT depuis transcription
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { BaseContentAgent, ContentType } from '../base-content.agent';

@Injectable()
export class SubtitleWriterAgent extends BaseContentAgent {
  protected readonly supportedType = ContentType.SUBTITLES;

  constructor(llmService: LLMService, @Inject('REDIS_CLIENT') redis: Redis) {
    super(llmService, redis);
  }

protected defaultWordCount(): number { return 3000; }
  protected async draft(dto: any, outline: any, research: any, artifact: any): Promise<string> {
    const prompt = `Generate SRT subtitles for "${dto.topic}". Language: ${artifact.metadata.language}. 5-min video.`;
    const response = await this.llmService.complete({ prompt, temperature: 0.4, maxTokens: 2000 });
    return response.text;
  }
}
