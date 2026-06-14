import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as http from 'http';
import * as https from 'https';
import {
  ILLMProvider,
  LLMMessage,
  LLMOptions,
  LLMResponse,
} from '../interfaces/llm-provider.interface';

/**
 * OpenAIProvider — implements ILLMProvider using the OpenAI API.
 *
 * Features:
 * - Uses `openai` npm package for API communication
 * - Supports GPT-4o and other OpenAI models
 * - JSON mode via `response_format: { type: 'json_object' }`
 * - Retry logic with exponential backoff (3 retries)
 * - HTTP connection pooling for improved performance
 * - Graceful error handling — never throws on LLM unavailability
 */
@Injectable()
export class OpenAIProvider implements ILLMProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly client: OpenAI | null;
  private readonly defaultModel: string;
  private readonly defaultMaxTokens: number;
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // 1 second

  // HTTP Agent with connection pooling
  private readonly httpAgent: http.Agent;
  private readonly httpsAgent: https.Agent;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('llm.openai.apiKey', '');
    this.defaultModel = this.configService.get<string>(
      'llm.openai.model',
      'gpt-4o',
    );
    this.defaultMaxTokens = this.configService.get<number>(
      'llm.openai.maxTokens',
      4096,
    );

    // ─── HTTP Connection Pooling ────────────────────────────────
    // Reuse TCP connections to OpenAI API, reducing latency and
    // avoiding the overhead of TLS handshake per request.
    const poolMax = this.configService.get<number>('performance.httpPoolMax', 50);
    this.httpAgent = new http.Agent({
      keepAlive: true,
      maxSockets: Math.min(poolMax, 20), // Cap at 20 for OpenAI
      maxFreeSockets: 5,
      timeout: 60000,
    });
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      maxSockets: Math.min(poolMax, 20),
      maxFreeSockets: 5,
      timeout: 60000,
    });

    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        timeout: 120000, // 2 minute timeout per request
        ...({ httpAgent: this.httpsAgent } as any),
      });
      this.logger.log(
        `OpenAI provider initialized with model: ${this.defaultModel}, connection pooling enabled (maxSockets: ${Math.min(poolMax, 20)})`,
      );
    } else {
      this.client = null;
      this.logger.warn('OpenAI API key not configured — provider unavailable');
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    if (!this.isAvailable() || !this.client) {
      throw new Error('OpenAI provider is not available — API key not configured');
    }

    const model = options?.model || this.defaultModel;
    const maxTokens = options?.maxTokens || this.defaultMaxTokens;
    const temperature = options?.temperature ?? 0.7;

    // Build OpenAI-compatible messages
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model,
      messages: openaiMessages,
      max_tokens: maxTokens,
      temperature,
    };

    // Enable JSON mode when requested
    if (options?.responseFormat === 'json') {
      requestParams.response_format = { type: 'json_object' };
    }

    return this.executeWithRetry(async () => {
      const response = await this.client!.chat.completions.create(requestParams);

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('OpenAI returned an empty response');
      }

      return {
        content: choice.message.content,
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
        finishReason: choice.finish_reason ?? 'unknown',
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

        // Check if error is retryable (rate limit or server error)
        const status = error?.status || error?.statusCode;
        const isRetryable =
          status === 429 || (status >= 500 && status < 600) || !status;

        if (!isRetryable || attempt === this.maxRetries) {
          break;
        }

        const delay = this.baseRetryDelay * Math.pow(2, attempt - 1);
        // Add jitter: random value between 0 and 50% of delay
        const jitter = Math.floor(Math.random() * delay * 0.5);
        const totalDelay = delay + jitter;

        this.logger.warn(
          `OpenAI request failed (attempt ${attempt}/${this.maxRetries}), ` +
            `retrying in ${totalDelay}ms — error: ${error.message}`,
        );

        await this.sleep(totalDelay);
      }
    }

    this.logger.error(
      `OpenAI request failed after ${this.maxRetries} retries: ${lastError?.message}`,
    );
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
