import { Global, Module } from '@nestjs/common';
import { LLMService } from './llm.service';
import { ZAIProvider } from './providers/zai.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { DeadHostCooldownService } from './services/dead-host-cooldown.service';
import { LLMCacheService } from './services/llm-cache.service';

/**
 * LLMModule — @Global module that provides LLM services to all agents.
 *
 * Exports:
 * - LLMService: Facade for all LLM provider interactions
 * - OpenAIProvider: Direct access to OpenAI if needed
 * - AnthropicProvider: Direct access to Anthropic if needed
 * - DeadHostCooldownService: Tracks and cools down failed LLM hosts
 * - LLMCacheService: In-memory cache for LLM responses
 *
 * Since this is a @Global module, any service in the application can
 * inject LLMService without importing LLMModule explicitly.
 */
@Global()
@Module({
  providers: [ZAIProvider, OpenAIProvider, AnthropicProvider, DeadHostCooldownService, LLMCacheService, LLMService],
  exports: [LLMService, ZAIProvider, OpenAIProvider, AnthropicProvider, DeadHostCooldownService, LLMCacheService],
})
export class LLMModule {}
