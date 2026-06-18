/**
 * AENEWS Agent OS X → PDEOS — Phase 10
 * File: backend/src/modules/content-factory/agents/visual/infographic-builder.agent.ts
 *
 * Génération infographies : data viz, layout, design pro
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { LLMService } from '../../llm/llm.service';
import { BaseContentAgent, ContentType } from '../base-content.agent';

@Injectable()
export class InfographicBuilderAgent extends BaseContentAgent {
  protected readonly supportedType = ContentType.INFOGRAPHIC;

  constructor(llmService: LLMService, @Inject('REDIS_CLIENT') redis: Redis) {
    super(llmService, redis);
  }

protected defaultWordCount(): number { return 800; }
}
