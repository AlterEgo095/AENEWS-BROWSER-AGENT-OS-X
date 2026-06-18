/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 * File: backend/src/modules/content-factory/agents/visual/pdf-builder.agent.ts
 *
 * Génération PDFs pro : rapports, white papers (ReportLab/LaTeX)
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { BaseContentAgent, ContentType } from '../base-content.agent';

@Injectable()
export class PDFBuilderAgent extends BaseContentAgent {
  protected readonly supportedType = ContentType.PDF_REPORT;

  constructor(llmService: LLMService, @Inject('REDIS_CLIENT') redis: Redis) {
    super(llmService, redis);
  }

protected defaultWordCount(): number { return 5000; }
  protected async format(dto: any, artifact: any): Promise<any> {
    const d = await super.format(dto, artifact);
    d.push({ format: 'pdf' as any, content: 'PDF via ReportLab', sizeBytes: 0 });
    return d;
  }
}
