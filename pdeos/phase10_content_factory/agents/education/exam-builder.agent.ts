/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 * File: backend/src/modules/content-factory/agents/education/exam-builder.agent.ts
 *
 * Création examens : QCM, questions ouvertes, grading rubric
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { BaseContentAgent, ContentType } from '../base-content.agent';

@Injectable()
export class ExamBuilderAgent extends BaseContentAgent {
  protected readonly supportedType = ContentType.EXAM;

  constructor(llmService: LLMService, @Inject('REDIS_CLIENT') redis: Redis) {
    super(llmService, redis);
  }

protected defaultWordCount(): number { return 2000; }
  protected async draft(dto: any, outline: any, research: any, artifact: any): Promise<string> {
    const prompt = `Generate a complete exam for: "${dto.topic}". Audience: ${dto.audienceLevel}. Include 10 MCQs, 5 short answers, 1 practical. Provide answer key.`;
    const response = await this.llmService.complete({ prompt, temperature: 0.3, maxTokens: 3000 });
    return response.text;
  }
}
