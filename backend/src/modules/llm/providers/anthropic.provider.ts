import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import * as http from 'http';
import * as https from 'https';
import {
  ILLMProvider,
  LLMMessage,
  LLMOptions,
  LLMResponse,
} from '../interfaces/llm-provider.interface';

/**
 * AnthropicProvider — implements ILLMProvider using the Anthropic API.
 *
 * Features:
 * - Uses `@anthropic-ai/sdk` npm package for API communication
 * - Supports Claude models (claude-sonnet-4-20250514, etc.)
 * - JSON output via prompting (Anthropic doesn't have native JSON mode)
 * - Retry logic with exponential backoff (3 retries)
 * - HTTP connection pooling for improved performance
 * - Graceful error handling — never throws on LLM unavailability
 */
@Injectable()
export class AnthropicProvider implements ILLMProvider {
  readonly name = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic | null;
  private readonly defaultModel: string;
  private readonly defaultMaxTokens: number;
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // 1 second

  // HTTP Agent with connection pooling
  private readonly httpsAgent: https.Agent;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('llm.anthropic.apiKey', '');
    this.defaultModel = this.configService.get<string>(
      'llm.anthropic.model',
      'claude-sonnet-4-20250514',
    );
    this.defaultMaxTokens = this.configService.get<number>(
      'llm.anthropic.maxTokens',
      4096,
    );

    // ─── HTTP Connection Pooling ────────────────────────────────
    const poolMax = this.configService.get<number>('performance.httpPoolMax', 50);
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      maxSockets: Math.min(poolMax, 20),
      maxFreeSockets: 5,
      timeout: 60000,
    });

    if (apiKey) {
      this.client = new Anthropic({
        apiKey,
        timeout: 120000,
        ...({ httpAgent: this.httpsAgent } as any),
      });
      this.logger.log(
        `Anthropic provider initialized with model: ${this.defaultModel}, connection pooling enabled (maxSockets: ${Math.min(poolMax, 20)})`,
      );
    } else {
      this.client = null;
      this.logger.warn(
        'Anthropic API key not configured — provider unavailable',
      );
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    if (!this.isAvailable() || !this.client) {
      throw new Error(
        'Anthropic provider is not available — API key not configured',
      );
    }

    const model = options?.model || this.defaultModel;
    const maxTokens = options?.maxTokens || this.defaultMaxTokens;
    const temperature = options?.temperature ?? 0.7;

    // Anthropic API requires system prompt to be separate from messages
    let systemPrompt: string | undefined;
    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Anthropic uses a dedicated system parameter
        systemPrompt = msg.content;
      } else {
        anthropicMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // If JSON mode is requested, add instruction to the system prompt
    if (options?.responseFormat === 'json') {
      const jsonInstruction =
        'You MUST respond with valid JSON only. Do not include any text before or after the JSON object. Ensure the response is a well-formed JSON object.';
      systemPrompt = systemPrompt
        ? `${systemPrompt}\n\n${jsonInstruction}`
        : jsonInstruction;
    }

    const requestParams: Anthropic.MessageCreateParams = {
      model,
      messages: anthropicMessages,
      max_tokens: maxTokens,
      temperature,
      ...(systemPrompt ? { system: systemPrompt } : {}),
    };

    return this.executeWithRetry(async () => {
      const response = await this.client!.messages.create(requestParams);

      // Extract text content from response
      const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      if (!textContent) {
        throw new Error('Anthropic returned an empty response');
      }

      return {
        content: textContent,
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: response.stop_reason ?? 'unknown',
      };
    });
  }

  async chatWithSystem(
    systemPrompt: string,
    userMessage: string,
    options?: LLMOptions,
  ): Promise<LLMResponse> {
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];
    return this.chat(messages, options);
  }

  /**
   * Execute a function with retry logic and exponential backoff.
   * Handles rate limits (429) and server errors (5xx) with retries.
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        const status =
          error?.status || error?.statusCode;
        const isRetryable =
          status === 429 || (status >= 500 && status < 600) || !status;

        // Also check for Anthropic-specific overload error
        const isOverloaded =
          error?.error?.type === 'overloaded_error';

        if ((!isRetryable && !isOverloaded) || attempt === this.maxRetries) {
          break;
        }

        const delay = this.baseRetryDelay * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * delay * 0.5);
        const totalDelay = delay + jitter;

        this.logger.warn(
          `Anthropic request failed (attempt ${attempt}/${this.maxRetries}), ` +
            `retrying in ${totalDelay}ms — error: ${error.message}`,
        );

        await this.sleep(totalDelay);
      }
    }

    this.logger.error(
      `Anthropic request failed after ${this.maxRetries} retries: ${lastError?.message}`,
    );
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
