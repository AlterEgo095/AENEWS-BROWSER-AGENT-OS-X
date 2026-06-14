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
}

/**
 * LLMService — facade that selects and manages LLM providers.
 *
 * Features:
 * - Chat with a specific provider or the configured default
 * - Automatic fallback to secondary provider when primary fails
 * - Per-provider usage metrics tracking
 * - Circuit breaker integration — each provider call is wrapped in a circuit breaker
 * - Graceful degradation — never throws when LLM is unavailable
 *
 * Circuit Breaker Integration:
 * - Circuit key: `llm:{providerName}`
 * - On OPEN: automatically tries fallback provider
 * - On HALF_OPEN: allows a probe request through to test recovery
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
    @Optional() private readonly circuitBreakerService: CircuitBreakerService,
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
        `fallback: ${this.fallbackEnabled ? this.secondaryProviderName : 'disabled'}, ` +
        `circuit breaker: ${this.circuitBreakerService ? 'enabled' : 'disabled'}`,
    );
  }

  /**
   * Send a chat request using a specific provider (or the default).
   * If the primary provider fails and fallback is enabled, tries the secondary.
   * Each provider call is wrapped in a circuit breaker (when available).
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

    // Wrap the provider call with circuit breaker if available
    if (this.circuitBreakerService) {
      const circuitKey = `${CIRCUIT_KEY_PREFIX.LLM}:${targetName}`;

      return this.circuitBreakerService.execute<LLMResponse>(
        circuitKey,
        () => this.executeProviderChat(provider, targetName, messages, options),
        // Fallback: try secondary provider when circuit is OPEN
        this.fallbackEnabled && targetName !== this.secondaryProviderName
          ? () => this.chatWithFallback(messages, options, targetName)
          : undefined,
      );
    }

    // No circuit breaker — direct execution
    return this.executeProviderChat(provider, targetName, messages, options);
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
      const info: ProviderInfo = {
        name,
        available: provider.isAvailable(),
        metrics: this.metrics.get(name) || this.emptyMetrics(),
      };

      // Add circuit breaker state if available
      if (this.circuitBreakerService) {
        const circuitState = this.circuitBreakerService.getState(`${CIRCUIT_KEY_PREFIX.LLM}:${name}`);
        (info as any).circuitState = circuitState.state;
      }

      result.push(info);
    }
    return result;
  }

  /**
   * Check if any LLM provider is available.
   * Considers circuit breaker state — a provider with an OPEN circuit is not considered available.
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
   * Execute a provider chat call with metrics tracking.
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
      return response;
    } catch (error: any) {
      this.recordFailure(providerName, error.message);

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

    // Wrap fallback in its own circuit breaker
    if (this.circuitBreakerService) {
      const fallbackCircuitKey = `${CIRCUIT_KEY_PREFIX.LLM}:${this.secondaryProviderName}`;

      try {
        return await this.circuitBreakerService.execute<LLMResponse>(
          fallbackCircuitKey,
          () => {
            const response = fallbackProvider.chat(messages, options);
            return response.then((r) => {
              this.recordSuccess(this.secondaryProviderName, r);
              return r;
            });
          },
        );
      } catch (error: any) {
        if (error instanceof CircuitBreakerOpenError) {
          throw new Error(
            `Both primary ("${failedProvider}") and fallback ("${this.secondaryProviderName}") circuits are OPEN`,
          );
        }
        this.recordFailure(this.secondaryProviderName, error.message);
        throw error;
      }
    }

    // No circuit breaker — direct fallback execution
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
