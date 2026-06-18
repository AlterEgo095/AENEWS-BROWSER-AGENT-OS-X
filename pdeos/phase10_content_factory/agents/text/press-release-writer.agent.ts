/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 * File: backend/src/modules/content-factory/agents/text/press-release-writer.agent.ts
 *
 * Génération communiqués de presse (600 mots) format AP
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { BaseContentAgent, ContentType } from '../base-content.agent';

@Injectable()
export class PressReleaseWriterAgent extends BaseContentAgent {
  protected readonly supportedType = ContentType.PRESS_RELEASE;

  constructor(llmService: LLMService, @Inject('REDIS_CLIENT') redis: Redis) {
    super(llmService, redis);
  }

protected defaultWordCount(): number { return 600; }
}
