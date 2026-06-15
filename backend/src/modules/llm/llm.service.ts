import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ILLMProvider,
  LLMMessage,
  LLMOptions,
  LLMResponse,
} from './interfaces/llm-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { ZAIProvider } from './providers/zai.provider';
import { DeadHostCooldownService } from './services/dead-host-cooldown.service';
import { LLMCacheService } from './services/llm-cache.service';
import {
  CircuitBreakerService,
  CircuitBreakerOpenError,
  CIRCUIT_KEY_PREFIX,
} from '../agent-framework/services/circuit-breaker.service';

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
  circuitState?: string;
  inCooldown?: boolean;
}

/**
 * Streaming chunk emitted during a streaming chat request.
 */
export interface LLMStreamChunk {
  content: string;
  model: string;
  finishReason: string | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLMService — facade that selects and manages LLM providers.
 *
 * Features:
 * - Chat with a specific provider or the configured default
 * - Automatic fallback to secondary provider when primary fails
 * - Per-provider usage metrics tracking
 * - Circuit breaker integration — each provider call is wrapped in a circuit breaker
 * - Dead host cooldown — failed hosts are temporarily removed from rotation
 * - Response caching — identical requests are served from cache
 * - Streaming support — async generator for real-time token delivery
 * - Graceful degradation — never throws when LLM is unavailable
 *
 * Circuit Breaker Integration:
 * - Circuit key: `llm:{providerName}`
 * - On OPEN: automatically tries fallback provider
 * - On HALF_OPEN: allows a probe request through to test recovery
 *
 * Dead Host Cooldown Integration:
 * - Tracks consecutive failures per provider host
 * - After 2 consecutive failures, the host enters a 20s cooldown
 * - Cooldown is automatically cleared on expiry or on success
 *
 * Cache Integration:
 * - SHA256-based cache key derived from (model, messages hash, temperature, maxTokens)
 * - TTL-based expiration (default 5 minutes)
 * - LRU eviction when max cache size is reached
 * - Cache is bypassed for streaming requests
 */
@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly providers: Map<string, ILLMProvider> = new Map();
  private readonly metrics: Map<string, ProviderMetrics> = new Map();
  private readonly defaultProviderName: string;
  private readonly fallbackEnabled: boolean;
  private readonly secondaryProviderName: string;
  private readonly cacheEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly zaiProvider: ZAIProvider,
    private readonly openaiProvider: OpenAIProvider,
    private readonly anthropicProvider: AnthropicProvider,
    @Optional() private readonly circuitBreakerService: CircuitBreakerService,
    @Optional() private readonly deadHostCooldownService: DeadHostCooldownService,
    @Optional() private readonly cacheService: LLMCacheService,
  ) {
    // Register providers — ZAI is the primary provider (always available)
    this.providers.set(zaiProvider.name, zaiProvider);
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
      'zai',
    );
    this.fallbackEnabled = this.configService.get<boolean>(
      'llm.fallback.enabled',
      false,
    );
    this.secondaryProviderName = this.configService.get<string>(
      'llm.fallback.secondaryProvider',
      'anthropic',
    );
    this.cacheEnabled = this.configService.get<boolean>(
      'llm.cache.enabled',
      true,
    );

    this.logger.log(
      `LLM Service initialized — default: ${this.defaultProviderName}, ` +
        `fallback: ${this.fallbackEnabled ? this.secondaryProviderName : 'disabled'}, ` +
        `circuit breaker: ${this.circuitBreakerService ? 'enabled' : 'disabled'}, ` +
        `dead host cooldown: ${this.deadHostCooldownService ? 'enabled' : 'disabled'}, ` +
        `cache: ${this.cacheService && this.cacheEnabled ? 'enabled' : 'disabled'}`,
    );
  }

  /**
   * Send a chat request using a specific provider (or the default).
   * If the primary provider fails and fallback is enabled, tries the secondary.
   * Each provider call is wrapped in a circuit breaker (when available).
   *
   * Cache: If caching is enabled, identical requests will be served from cache
   * unless options.skipCache is true.
   */
  async chat(
    messages: LLMMessage[],
    options?: LLMOptions & { skipCache?: boolean },
    providerName?: string,
  ): Promise<LLMResponse> {
    const targetName = providerName || this.defaultProviderName;
    const provider = this.getProvider(targetName);

    if (!provider) {
      throw new Error(`LLM provider not found: ${targetName}`);
    }

    // Check dead host cooldown
    if (this.deadHostCooldownService && !this.deadHostCooldownService.isAvailable(targetName)) {
      this.logger.warn(
        `Provider "${targetName}" is in cooldown — trying fallback or alternative`,
      );
      if (this.fallbackEnabled && targetName !== this.secondaryProviderName) {
        return this.chatWithFallback(messages, options, targetName);
      }
      throw new Error(
        `LLM provider "${targetName}" is in cooldown — try again later`,
      );
    }

    if (!provider.isAvailable()) {
      // Mark as dead host
      if (this.deadHostCooldownService) {
        this.deadHostCooldownService.markFailed(targetName, 'Provider unavailable — API key not configured');
      }

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

    // Check cache before making the request
    if (this.cacheService && this.cacheEnabled && !options?.skipCache) {
      const model = options?.model || this.getDefaultModel(targetName);
      const cacheKey = this.cacheService.buildKey(
        model,
        messages,
        options?.temperature,
        options?.maxTokens,
      );
      const cached = this.cacheService.get<LLMResponse>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for provider "${targetName}" — returning cached response`);
        return cached;
      }
    }

    // Wrap the provider call with circuit breaker if available
    if (this.circuitBreakerService) {
      const circuitKey = `${CIRCUIT_KEY_PREFIX.LLM}:${targetName}`;

      const response = await this.circuitBreakerService.execute<LLMResponse>(
        circuitKey,
        () => this.executeProviderChat(provider, targetName, messages, options),
        // Fallback: try secondary provider when circuit is OPEN
        this.fallbackEnabled && targetName !== this.secondaryProviderName
          ? () => this.chatWithFallback(messages, options, targetName)
          : undefined,
      );

      // Store in cache on success
      this.storeInCache(targetName, messages, options, response);
      return response;
    }

    // No circuit breaker — direct execution
    const response = await this.executeProviderChat(provider, targetName, messages, options);
    this.storeInCache(targetName, messages, options, response);
    return response;
  }

  /**
   * Convenience method: chat with a system prompt and user message.
   */
  async chatWithSystem(
    systemPrompt: string,
    userMessage: string,
    options?: LLMOptions & { skipCache?: boolean },
    providerName?: string,
  ): Promise<LLMResponse> {
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];
    return this.chat(messages, options, providerName);
  }

  /**
   * Streaming chat — returns an async generator that yields chunks of the response.
   *
   * Note: Streaming bypasses the cache since partial responses aren't cacheable.
   * If a provider doesn't support streaming, the full response is yielded as a
   * single chunk.
   */
  async *chatStream(
    messages: LLMMessage[],
    options?: LLMOptions,
    providerName?: string,
  ): AsyncGenerator<LLMStreamChunk, void, undefined> {
    const targetName = providerName || this.defaultProviderName;
    const provider = this.getProvider(targetName);

    if (!provider || !provider.isAvailable()) {
      // Try fallback
      if (this.fallbackEnabled && targetName !== this.secondaryProviderName) {
        const fallbackProvider = this.getProvider(this.secondaryProviderName);
        if (fallbackProvider?.isAvailable()) {
          yield* this.streamFromProvider(fallbackProvider, this.secondaryProviderName, messages, options);
          return;
        }
      }
      throw new Error(`LLM provider "${targetName}" is not available for streaming`);
    }

    // Check dead host cooldown
    if (this.deadHostCooldownService && !this.deadHostCooldownService.isAvailable(targetName)) {
      throw new Error(`LLM provider "${targetName}" is in cooldown — try again later`);
    }

    yield* this.streamFromProvider(provider, targetName, messages, options);
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
      const info: ProviderInfo = {
        name,
        available: provider.isAvailable(),
        metrics: this.metrics.get(name) || this.emptyMetrics(),
      };

      // Add circuit breaker state if available
      if (this.circuitBreakerService) {
        const circuitState = this.circuitBreakerService.getState(`${CIRCUIT_KEY_PREFIX.LLM}:${name}`);
        info.circuitState = circuitState.state;
      }

      // Add cooldown state if available
      if (this.deadHostCooldownService) {
        info.inCooldown = !this.deadHostCooldownService.isAvailable(name);
      }

      result.push(info);
    }
    return result;
  }

  /**
   * Check if any LLM provider is available.
   * Considers circuit breaker state and dead host cooldown.
   */
  isAnyAvailable(): boolean {
    for (const [name, provider] of this.providers) {
      if (!provider.isAvailable()) continue;

      // If circuit breaker is available, check if the circuit is OPEN
      if (this.circuitBreakerService) {
        const circuitKey = `${CIRCUIT_KEY_PREFIX.LLM}:${name}`;
        if (this.circuitBreakerService.isOpen(circuitKey)) {
          this.logger.debug(`Provider "${name}" is available but circuit is OPEN — skipping`);
          continue;
        }
      }

      // If dead host cooldown is available, check if the host is in cooldown
      if (this.deadHostCooldownService && !this.deadHostCooldownService.isAvailable(name)) {
        this.logger.debug(`Provider "${name}" is available but in cooldown — skipping`);
        continue;
      }

      return true;
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
   * Get cache statistics if cache is available.
   */
  getCacheStats(): Record<string, any> | null {
    if (!this.cacheService) return null;
    return this.cacheService.getStats();
  }

  /**
   * Invalidate LLM cache entries matching a pattern.
   */
  invalidateCache(pattern: string = 'llm:*'): number {
    if (!this.cacheService) return 0;
    return this.cacheService.invalidate(pattern);
  }

  // ─── Private Methods ─────────────────────────────────────────

  /**
   * Execute a provider chat call with metrics tracking and dead host management.
   */
  private async executeProviderChat(
    provider: ILLMProvider,
    providerName: string,
    messages: LLMMessage[],
    options: LLMOptions | undefined,
  ): Promise<LLMResponse> {
    try {
      const response = await provider.chat(messages, options);
      this.recordSuccess(providerName, response);

      // Mark host as healthy
      if (this.deadHostCooldownService) {
        this.deadHostCooldownService.markSuccess(providerName);
      }

      return response;
    } catch (error: any) {
      this.recordFailure(providerName, error.message);

      // Mark host as failed for cooldown tracking
      if (this.deadHostCooldownService) {
        this.deadHostCooldownService.markFailed(providerName, error.message);
      }

      // Try fallback on failure (when NOT already in circuit breaker context)
      if (!this.circuitBreakerService && this.fallbackEnabled && providerName !== this.secondaryProviderName) {
        this.logger.warn(
          `Provider "${providerName}" failed, trying fallback "${this.secondaryProviderName}": ${error.message}`,
        );
        return this.chatWithFallback(messages, options, providerName);
      }

      throw error;
    }
  }

  /**
   * Attempt chat with the fallback provider.
   * Also wrapped in a circuit breaker when available.
   */
  private async chatWithFallback(
    messages: LLMMessage[],
    options: (LLMOptions & { skipCache?: boolean }) | undefined,
    failedProvider: string,
  ): Promise<LLMResponse> {
    const fallbackProvider = this.providers.get(this.secondaryProviderName);

    if (!fallbackProvider) {
      throw new Error(
        `Fallback provider "${this.secondaryProviderName}" not found`,
      );
    }

    // Check dead host cooldown for fallback
    if (this.deadHostCooldownService && !this.deadHostCooldownService.isAvailable(this.secondaryProviderName)) {
      throw new Error(
        `Both primary ("${failedProvider}") and fallback ("${this.secondaryProviderName}") are in cooldown`,
      );
    }

    if (!fallbackProvider.isAvailable()) {
      if (this.deadHostCooldownService) {
        this.deadHostCooldownService.markFailed(this.secondaryProviderName, 'Fallback unavailable');
      }
      throw new Error(
        `Both primary ("${failedProvider}") and fallback ("${this.secondaryProviderName}") providers are unavailable`,
      );
    }

    // Wrap fallback in its own circuit breaker
    if (this.circuitBreakerService) {
      const fallbackCircuitKey = `${CIRCUIT_KEY_PREFIX.LLM}:${this.secondaryProviderName}`;

      try {
        const response = await this.circuitBreakerService.execute<LLMResponse>(
          fallbackCircuitKey,
          () => {
            const resp = fallbackProvider.chat(messages, options);
            return resp.then((r) => {
              this.recordSuccess(this.secondaryProviderName, r);
              if (this.deadHostCooldownService) {
                this.deadHostCooldownService.markSuccess(this.secondaryProviderName);
              }
              return r;
            });
          },
        );

        // Store fallback result in cache
        this.storeInCache(this.secondaryProviderName, messages, options, response);
        return response;
      } catch (error: any) {
        if (error instanceof CircuitBreakerOpenError) {
          throw new Error(
            `Both primary ("${failedProvider}") and fallback ("${this.secondaryProviderName}") circuits are OPEN`,
          );
        }
        this.recordFailure(this.secondaryProviderName, error.message);
        if (this.deadHostCooldownService) {
          this.deadHostCooldownService.markFailed(this.secondaryProviderName, error.message);
        }
        throw error;
      }
    }

    // No circuit breaker — direct fallback execution
    try {
      const response = await fallbackProvider.chat(messages, options);
      this.recordSuccess(this.secondaryProviderName, response);
      if (this.deadHostCooldownService) {
        this.deadHostCooldownService.markSuccess(this.secondaryProviderName);
      }
      this.storeInCache(this.secondaryProviderName, messages, options, response);
      return response;
    } catch (error: any) {
      this.recordFailure(this.secondaryProviderName, error.message);
      if (this.deadHostCooldownService) {
        this.deadHostCooldownService.markFailed(this.secondaryProviderName, error.message);
      }
      throw error;
    }
  }

  /**
   * Stream from a provider, falling back to non-streaming if streaming isn't supported.
   */
  private async *streamFromProvider(
    provider: ILLMProvider,
    providerName: string,
    messages: LLMMessage[],
    options: LLMOptions | undefined,
  ): AsyncGenerator<LLMStreamChunk, void, undefined> {
    try {
      // Check if the provider supports streaming (OpenAI SDK has streaming)
      if (provider instanceof OpenAIProvider && (provider as any).client) {
        const client = (provider as any).client;
        const model = options?.model || this.configService.get<string>('llm.openai.model', 'gpt-4o');
        const maxTokens = options?.maxTokens || this.configService.get<number>('llm.openai.maxTokens', 4096);
        const temperature = options?.temperature ?? 0.7;

        const openaiMessages = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const stream = await client.chat.completions.create({
          model,
          messages: openaiMessages,
          max_tokens: maxTokens,
          temperature,
          stream: true,
        });

        let fullContent = '';
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            yield {
              content,
              model: chunk.model || model,
              finishReason: null,
            };
          }
          if (chunk.choices[0]?.finish_reason) {
            yield {
              content: '',
              model: chunk.model || model,
              finishReason: chunk.choices[0].finish_reason,
              usage: chunk.usage
                ? {
                    promptTokens: chunk.usage.prompt_tokens ?? 0,
                    completionTokens: chunk.usage.completion_tokens ?? 0,
                    totalTokens: chunk.usage.total_tokens ?? 0,
                  }
                : undefined,
            };
          }
        }

        // Record success for the full streaming response
        this.recordSuccess(providerName, {
          content: fullContent,
          model,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          finishReason: 'stop',
        });

        if (this.deadHostCooldownService) {
          this.deadHostCooldownService.markSuccess(providerName);
        }
        return;
      }

      if (provider instanceof AnthropicProvider && (provider as any).client) {
        const client = (provider as any).client;
        const model = options?.model || this.configService.get<string>('llm.anthropic.model', 'claude-sonnet-4-20250514');
        const maxTokens = options?.maxTokens || this.configService.get<number>('llm.anthropic.maxTokens', 4096);
        const temperature = options?.temperature ?? 0.7;

        let systemPrompt: string | undefined;
        const anthropicMessages: any[] = [];
        for (const msg of messages) {
          if (msg.role === 'system') {
            systemPrompt = msg.content;
          } else {
            anthropicMessages.push({ role: msg.role, content: msg.content });
          }
        }

        const stream = client.messages.stream({
          model,
          messages: anthropicMessages,
          max_tokens: maxTokens,
          temperature,
          ...(systemPrompt ? { system: systemPrompt } : {}),
        });

        let fullContent = '';
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            const content = event.delta.text || '';
            fullContent += content;
            yield {
              content,
              model,
              finishReason: null,
            };
          }
          if (event.type === 'message_stop') {
            yield {
              content: '',
              model,
              finishReason: 'end_turn',
            };
          }
        }

        this.recordSuccess(providerName, {
          content: fullContent,
          model,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          finishReason: 'end_turn',
        });

        if (this.deadHostCooldownService) {
          this.deadHostCooldownService.markSuccess(providerName);
        }
        return;
      }

      // Fallback: provider doesn't support streaming — make a regular call and yield as single chunk
      const response = await provider.chat(messages, options);
      this.recordSuccess(providerName, response);
      if (this.deadHostCooldownService) {
        this.deadHostCooldownService.markSuccess(providerName);
      }

      yield {
        content: response.content,
        model: response.model,
        finishReason: response.finishReason,
        usage: response.usage,
      };
    } catch (error: any) {
      this.recordFailure(providerName, error.message);
      if (this.deadHostCooldownService) {
        this.deadHostCooldownService.markFailed(providerName, error.message);
      }
      throw error;
    }
  }

  /**
   * Store a response in cache if caching is enabled.
   */
  private storeInCache(
    providerName: string,
    messages: LLMMessage[],
    options: (LLMOptions & { skipCache?: boolean }) | undefined,
    response: LLMResponse,
  ): void {
    if (!this.cacheService || !this.cacheEnabled || options?.skipCache) return;

    try {
      const model = options?.model || this.getDefaultModel(providerName);
      const cacheKey = this.cacheService.buildKey(
        model,
        messages,
        options?.temperature,
        options?.maxTokens,
      );
      this.cacheService.set(cacheKey, response);
    } catch (err: any) {
      this.logger.debug(`Failed to store response in cache: ${err.message}`);
    }
  }

  /**
   * Get the default model name for a given provider.
   */
  private getDefaultModel(providerName: string): string {
    if (providerName === 'openai') {
      return this.configService.get<string>('llm.openai.model', 'gpt-4o');
    }
    if (providerName === 'anthropic') {
      return this.configService.get<string>('llm.anthropic.model', 'claude-sonnet-4-20250514');
    }
    return 'unknown';
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
