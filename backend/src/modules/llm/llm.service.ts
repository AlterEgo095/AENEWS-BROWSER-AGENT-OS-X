import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ILLMProvider,
  LLMMessage,
  LLMOptions,
  LLMResponse,
} from './interfaces/llm-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

/**
 * Usage metrics tracked per provider.
 */
interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  lastRequestAt: Date | null;
  lastError: string | null;
}

/**
 * Available provider info returned by listProviders().
 */
export interface ProviderInfo {
  name: string;
  available: boolean;
  metrics: ProviderMetrics;
}

/**
 * LLMService — facade that selects and manages LLM providers.
 *
 * Features:
 * - Chat with a specific provider or the configured default
 * - Automatic fallback to secondary provider when primary fails
 * - Per-provider usage metrics tracking
 * - Graceful degradation — never throws when LLM is unavailable
 */
@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly providers: Map<string, ILLMProvider> = new Map();
  private readonly metrics: Map<string, ProviderMetrics> = new Map();
  private readonly defaultProviderName: string;
  private readonly fallbackEnabled: boolean;
  private readonly secondaryProviderName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly openaiProvider: OpenAIProvider,
    private readonly anthropicProvider: AnthropicProvider,
  ) {
    // Register providers
    this.providers.set(openaiProvider.name, openaiProvider);
    this.providers.set(anthropicProvider.name, anthropicProvider);

    // Initialize metrics
    for (const name of this.providers.keys()) {
      this.metrics.set(name, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        lastRequestAt: null,
        lastError: null,
      });
    }

    // Configuration
    this.defaultProviderName = this.configService.get<string>(
      'llm.defaultProvider',
      'openai',
    );
    this.fallbackEnabled = this.configService.get<boolean>(
      'llm.fallback.enabled',
      false,
    );
    this.secondaryProviderName = this.configService.get<string>(
      'llm.fallback.secondaryProvider',
      'anthropic',
    );

    this.logger.log(
      `LLM Service initialized — default: ${this.defaultProviderName}, ` +
        `fallback: ${this.fallbackEnabled ? this.secondaryProviderName : 'disabled'}`,
    );
  }

  /**
   * Send a chat request using a specific provider (or the default).
   * If the primary provider fails and fallback is enabled, tries the secondary.
   */
  async chat(
    messages: LLMMessage[],
    options?: LLMOptions,
    providerName?: string,
  ): Promise<LLMResponse> {
    const targetName = providerName || this.defaultProviderName;
    const provider = this.getProvider(targetName);

    if (!provider) {
      throw new Error(`LLM provider not found: ${targetName}`);
    }

    if (!provider.isAvailable()) {
      // Try fallback if enabled
      if (this.fallbackEnabled) {
        this.logger.warn(
          `Provider "${targetName}" unavailable, trying fallback "${this.secondaryProviderName}"`,
        );
        return this.chatWithFallback(messages, options, targetName);
      }
      throw new Error(
        `LLM provider "${targetName}" is not available — API key not configured`,
      );
    }

    try {
      const response = await provider.chat(messages, options);
      this.recordSuccess(targetName, response);
      return response;
    } catch (error: any) {
      this.recordFailure(targetName, error.message);

      // Try fallback on failure
      if (this.fallbackEnabled && targetName !== this.secondaryProviderName) {
        this.logger.warn(
          `Provider "${targetName}" failed, trying fallback "${this.secondaryProviderName}": ${error.message}`,
        );
        return this.chatWithFallback(messages, options, targetName);
      }

      throw error;
    }
  }

  /**
   * Convenience method: chat with a system prompt and user message.
   */
  async chatWithSystem(
    systemPrompt: string,
    userMessage: string,
    options?: LLMOptions,
    providerName?: string,
  ): Promise<LLMResponse> {
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];
    return this.chat(messages, options, providerName);
  }

  /**
   * Returns the configured default provider.
   */
  getDefaultProvider(): ILLMProvider | null {
    return this.providers.get(this.defaultProviderName) || null;
  }

  /**
   * Returns a specific provider by name.
   */
  getProvider(name: string): ILLMProvider | null {
    return this.providers.get(name) || null;
  }

  /**
   * Lists all registered providers with their availability status and metrics.
   */
  listProviders(): ProviderInfo[] {
    const result: ProviderInfo[] = [];
    for (const [name, provider] of this.providers) {
      result.push({
        name,
        available: provider.isAvailable(),
        metrics: this.metrics.get(name) || this.emptyMetrics(),
      });
    }
    return result;
  }

  /**
   * Check if any LLM provider is available.
   */
  isAnyAvailable(): boolean {
    for (const provider of this.providers.values()) {
      if (provider.isAvailable()) return true;
    }
    return false;
  }

  /**
   * Get the name of the default provider.
   */
  getDefaultProviderName(): string {
    return this.defaultProviderName;
  }

  /**
   * Attempt chat with the fallback provider.
   */
  private async chatWithFallback(
    messages: LLMMessage[],
    options: LLMOptions | undefined,
    failedProvider: string,
  ): Promise<LLMResponse> {
    const fallbackProvider = this.providers.get(this.secondaryProviderName);

    if (!fallbackProvider) {
      throw new Error(
        `Fallback provider "${this.secondaryProviderName}" not found`,
      );
    }

    if (!fallbackProvider.isAvailable()) {
      throw new Error(
        `Both primary ("${failedProvider}") and fallback ("${this.secondaryProviderName}") providers are unavailable`,
      );
    }

    try {
      const response = await fallbackProvider.chat(messages, options);
      this.recordSuccess(this.secondaryProviderName, response);
      return response;
    } catch (error: any) {
      this.recordFailure(this.secondaryProviderName, error.message);
      throw error;
    }
  }

  private recordSuccess(providerName: string, response: LLMResponse): void {
    const metrics = this.metrics.get(providerName) || this.emptyMetrics();
    metrics.totalRequests++;
    metrics.successfulRequests++;
    metrics.totalPromptTokens += response.usage.promptTokens;
    metrics.totalCompletionTokens += response.usage.completionTokens;
    metrics.totalTokens += response.usage.totalTokens;
    metrics.lastRequestAt = new Date();
    metrics.lastError = null;
    this.metrics.set(providerName, metrics);
  }

  private recordFailure(providerName: string, errorMessage: string): void {
    const metrics = this.metrics.get(providerName) || this.emptyMetrics();
    metrics.totalRequests++;
    metrics.failedRequests++;
    metrics.lastRequestAt = new Date();
    metrics.lastError = errorMessage;
    this.metrics.set(providerName, metrics);
  }

  private emptyMetrics(): ProviderMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      lastRequestAt: null,
      lastError: null,
    };
  }
}
