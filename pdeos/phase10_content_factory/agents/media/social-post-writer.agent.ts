/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 * File: backend/src/modules/content-factory/agents/media/social-post-writer.agent.ts
 *
 * Génération posts multi-réseaux : LinkedIn, Twitter, Facebook, Instagram
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { BaseContentAgent, ContentType } from '../base-content.agent';

@Injectable()
export class SocialPostWriterAgent extends BaseContentAgent {
  protected readonly supportedType = ContentType.SOCIAL_POST;

  constructor(llmService: LLMService, @Inject('REDIS_CLIENT') redis: Redis) {
    super(llmService, redis);
  }

protected defaultWordCount(): number { return 300; }
  protected async draft(dto: any, outline: any, research: any, artifact: any): Promise<string> {
    const prompt = `Generate social posts for "${dto.topic}". 4 versions: LinkedIn (300w), Twitter (280 chars), Facebook (200w), Instagram (150w). Markdown with separators.`;
    const response = await this.llmService.complete({ prompt, temperature: 0.7, maxTokens: 1500 });
    return response.text;
  }
}
