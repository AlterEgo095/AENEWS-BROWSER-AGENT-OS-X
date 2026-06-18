/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 * File: backend/src/modules/content-factory/agents/text/article-writer.agent.ts
 *
 * Génération articles long-form SEO (1500+ mots) avec recherche intégrée
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { BaseContentAgent, ContentType } from '../base-content.agent';

@Injectable()
export class ArticleWriterAgent extends BaseContentAgent {
  protected readonly supportedType = ContentType.ARTICLE;

  constructor(llmService: LLMService, @Inject('REDIS_CLIENT') redis: Redis) {
    super(llmService, redis);
  }

protected async research(dto: any, artifact: any): Promise<any> {
    const baseResearch = await super.research(dto, artifact);
    return { ...baseResearch, contentType: 'article', seoKeywords: dto.keywords || [] };
  }
  protected defaultWordCount(): number { return 1500; }
}
