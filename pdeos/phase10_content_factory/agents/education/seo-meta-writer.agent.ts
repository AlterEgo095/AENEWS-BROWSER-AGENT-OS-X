/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 * File: backend/src/modules/content-factory/agents/education/seo-meta-writer.agent.ts
 *
 * Génération metadata SEO : meta title, description, OG, schema
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { BaseContentAgent, ContentType } from '../base-content.agent';

@Injectable()
export class SEOMetaWriterAgent extends BaseContentAgent {
  protected readonly supportedType = ContentType.SEO_META;

  constructor(llmService: LLMService, @Inject('REDIS_CLIENT') redis: Redis) {
    super(llmService, redis);
  }

protected defaultWordCount(): number { return 200; }
  protected async draft(dto: any, outline: any, research: any, artifact: any): Promise<string> {
    const prompt = `Generate SEO metadata for "${dto.topic}". Keywords: ${dto.keywords?.join(', ')}. Respond in JSON: { metaTitle, metaDescription, ogTitle, ogDescription, schemaMarkup }`;
    const response = await this.llmService.complete({ prompt, temperature: 0.3, maxTokens: 500 });
    const parsed = JSON.parse(response.text); artifact.seo = parsed;
    return JSON.stringify(parsed, null, 2);
  }
}
