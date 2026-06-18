/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 * File: backend/src/modules/content-factory/agents/text/translation-writer.agent.ts
 *
 * Traduction multi-langues avec préservation du sens
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { BaseContentAgent, ContentType } from '../base-content.agent';

@Injectable()
export class TranslationWriterAgent extends BaseContentAgent {
  protected readonly supportedType = ContentType.TRANSLATION;

  constructor(llmService: LLMService, @Inject('REDIS_CLIENT') redis: Redis) {
    super(llmService, redis);
  }

protected async draft(dto: any, outline: any, research: any, artifact: any): Promise<string> {
    const prompt = `Translate the following content to ${artifact.metadata.language}. Preserve tone and cultural nuances.\n\nSOURCE:\n${dto.references?.[0] || dto.topic}`;
    const response = await this.llmService.complete({ prompt, temperature: 0.3, maxTokens: 4000 });
    return response.text;
  }
}
