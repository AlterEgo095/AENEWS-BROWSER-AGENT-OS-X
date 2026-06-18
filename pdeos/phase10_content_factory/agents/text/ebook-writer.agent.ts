/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 * File: backend/src/modules/content-factory/agents/text/ebook-writer.agent.ts
 *
 * Génération ebooks complets (15000+ mots) avec chapitres, TOC, epub
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { BaseContentAgent, ContentType } from '../base-content.agent';

@Injectable()
export class EbookWriterAgent extends BaseContentAgent {
  protected readonly supportedType = ContentType.EBOOK;

  constructor(llmService: LLMService, @Inject('REDIS_CLIENT') redis: Redis) {
    super(llmService, redis);
  }

protected async draft(dto: any, outline: any, research: any, artifact: any): Promise<string> {
    const chapters = outline.sections || [];
    let fullContent = `# ${outline.title}\n\n## Table of Contents\n\n`;
    for (let i = 0; i < chapters.length; i++) fullContent += `${i + 1}. ${chapters[i].heading}\n`;
    fullContent += `\n---\n\n`;
    for (let i = 0; i < chapters.length; i++) {
      const content = await this.writeSection({ ...chapters[i], estimatedWords: 2000 }, dto, research, artifact);
      fullContent += `## Chapter ${i + 1}: ${chapters[i].heading}\n\n${content}\n\n---\n\n`;
    }
    return fullContent;
  }
  protected defaultWordCount(): number { return 15000; }
}
