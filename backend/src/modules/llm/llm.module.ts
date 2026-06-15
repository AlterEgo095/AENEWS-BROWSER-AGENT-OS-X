import { Global, Module, OnModuleInit } from '@nestjs/common';
import { LLMService } from './llm.service';
import { LLMController } from './llm.controller';
import { ZAIProvider } from './providers/zai.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { DeadHostCooldownService } from './services/dead-host-cooldown.service';
import { LLMCacheService } from './services/llm-cache.service';
import { CreditService } from '../credit/credit.service';
import { CreditModule } from '../credit/credit.module';

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
  imports: [CreditModule],
  providers: [ZAIProvider, OpenAIProvider, AnthropicProvider, DeadHostCooldownService, LLMCacheService, LLMService],
  controllers: [LLMController],
  exports: [LLMService, ZAIProvider, OpenAIProvider, AnthropicProvider, DeadHostCooldownService, LLMCacheService],
})
export class LLMModule implements OnModuleInit {
  constructor(
    private readonly llmService: LLMService,
    private readonly creditService: CreditService,
  ) {}

  /**
   * On module init, load any persisted LLM configuration from the database.
   * If admin has previously saved LLM config via the admin API, apply it
   * so that the runtime state matches the last saved configuration.
   */
  async onModuleInit(): Promise<void> {
    try {
      const savedProvider = await this.creditService.getSetting('llm_default_provider');
      const savedFallbackEnabled = await this.creditService.getSetting('llm_fallback_enabled');
      const savedSecondaryProvider = await this.creditService.getSetting('llm_secondary_provider');

      if (savedProvider || savedFallbackEnabled !== null || savedSecondaryProvider) {
        const currentConfig = this.llmService.getConfig();
        const config = {
          defaultProvider: savedProvider || currentConfig.defaultProvider,
          fallbackEnabled: savedFallbackEnabled === 'true',
          secondaryProvider: savedSecondaryProvider || currentConfig.secondaryProvider,
        };

        this.llmService.applyConfig(config);
      }
    } catch (error: any) {
      // Non-critical: if DB is not ready yet, use env var defaults
      // This can happen during initial migration when credit schema doesn't exist yet
    }
  }
}
