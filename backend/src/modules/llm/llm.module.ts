import { Global, Module } from '@nestjs/common';
import { LLMService } from './llm.service';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

/**
 * LLMModule — @Global module that provides LLM services to all agents.
 *
 * Exports:
 * - LLMService: Facade for all LLM provider interactions
 * - OpenAIProvider: Direct access to OpenAI if needed
 * - AnthropicProvider: Direct access to Anthropic if needed
 *
 * Since this is a @Global module, any service in the application can
 * inject LLMService without importing LLMModule explicitly.
 */
@Global()
@Module({
  providers: [OpenAIProvider, AnthropicProvider, LLMService],
  exports: [LLMService, OpenAIProvider, AnthropicProvider],
})
export class LLMModule {}
