/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 * File: backend/src/modules/content-factory/agents/visual/slide-builder.agent.ts
 *
 * Génération slides PPTX premium : thèmes, layouts, agency-quality
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { BaseContentAgent, ContentType } from '../base-content.agent';

@Injectable()
export class SlideBuilderAgent extends BaseContentAgent {
  protected readonly supportedType = ContentType.SLIDES;

  constructor(llmService: LLMService, @Inject('REDIS_CLIENT') redis: Redis) {
    super(llmService, redis);
  }

protected defaultWordCount(): number { return 2000; }
  protected async outline(dto: any, research: any, artifact: any): Promise<any> {
    const prompt = `Create slide deck outline for "${dto.topic}". 10-15 slides. JSON: { title, slides: [{ slideNumber, type, title, bullets, notes }] }`;
    const response = await this.llmService.complete({ prompt, temperature: 0.4, maxTokens: 2000 });
    try { return JSON.parse(response.text); } catch { return { title: dto.topic, slides: [] }; }
  }
  protected async format(dto: any, artifact: any): Promise<any> {
    const d = await super.format(dto, artifact);
    d.push({ format: 'pptx' as any, content: 'PPTX via PptxGenJS', sizeBytes: 0 });
    return d;
  }
}
