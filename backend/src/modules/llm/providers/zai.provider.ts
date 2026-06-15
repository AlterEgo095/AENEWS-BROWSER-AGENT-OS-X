import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ILLMProvider,
  LLMMessage,
  LLMOptions,
  LLMResponse,
} from '../interfaces/llm-provider.interface';

/**
 * ZAIProvider — implements ILLMProvider using the z-ai-web-dev-sdk.
 *
 * This is the PRIMARY LLM provider for AENEWS Agent OS X.
 * Uses the built-in AI infrastructure available in the deployment environment.
 *
 * Features:
 * - Uses z-ai-web-dev-sdk for API communication (glm-4-plus model)
 * - JSON mode via explicit instruction in system prompt
 * - Retry logic with exponential backoff (3 retries)
 * - Graceful error handling — never throws on LLM unavailability
 * - Auto-initializes the SDK on first use
 */
@Injectable()
export class ZAIProvider implements ILLMProvider {
  readonly name = 'zai';
  private readonly logger = new Logger(ZAIProvider.name);
  private zaiClient: any = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private readonly defaultModel = 'glm-4-plus';
  private readonly defaultMaxTokens: number;
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000;

  constructor(private readonly configService: ConfigService) {
    this.defaultMaxTokens = this.configService.get<number>(
      'llm.zai.maxTokens',
      4096,
    );

    // Kick off async initialization
    this.initPromise = this.initialize().catch((err) => {
      this.logger.warn(`Z-AI SDK initialization failed: ${err.message}`);
    });
  }

  private async initialize(): Promise<void> {
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      this.zaiClient = await ZAI.create();
      this.initialized = true;
      this.logger.log(
        `Z-AI provider initialized successfully (model: ${this.defaultModel})`,
      );
    } catch (error: any) {
      this.logger.warn(
        `Z-AI SDK initialization failed: ${error.message} — provider unavailable`,
      );
      this.initialized = false;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
  }

  isAvailable(): boolean {
    return this.initialized && this.zaiClient !== null;
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    await this.ensureInitialized();

    if (!this.isAvailable() || !this.zaiClient) {
      throw new Error('Z-AI provider is not available — SDK initialization failed');
    }

    const maxTokens = options?.maxTokens || this.defaultMaxTokens;
    const temperature = options?.temperature ?? 0.7;

    // Build messages for z-ai SDK
    const sdkMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // If JSON mode is requested, append instruction to the system message
    if (options?.responseFormat === 'json') {
      const systemIdx = sdkMessages.findIndex((m) => m.role === 'system');
      if (systemIdx >= 0) {
        sdkMessages[systemIdx].content +=
          '\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown, no explanation, just pure JSON.';
      } else {
        sdkMessages.unshift({
          role: 'system',
          content:
            'You MUST respond with valid JSON only. No markdown, no explanation, just pure JSON.',
        });
      }
    }

    return this.executeWithRetry(async () => {
      const response = await this.zaiClient.chat.completions.create({
        messages: sdkMessages,
        temperature,
        max_tokens: maxTokens,
      });

      const content = response.choices?.[0]?.message?.content || '';
      if (!content) {
        throw new Error('Z-AI returned an empty response');
      }

      // Try to extract JSON from markdown code blocks if responseFormat is json
      let finalContent = content;
      if (options?.responseFormat === 'json') {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          finalContent = jsonMatch[1].trim();
        } else {
          // Try to find JSON object in response
          const start = content.indexOf('{');
          const end = content.lastIndexOf('}');
          if (start !== -1 && end > start) {
            finalContent = content.slice(start, end + 1);
          } else {
            const arrStart = content.indexOf('[');
            const arrEnd = content.lastIndexOf(']');
            if (arrStart !== -1 && arrEnd > arrStart) {
              finalContent = content.slice(arrStart, arrEnd + 1);
            }
          }
        }
      }

      return {
        content: finalContent,
        model: response.model || this.defaultModel,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
        finishReason: response.choices?.[0]?.finish_reason || 'stop',
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

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const status = error?.status || error?.statusCode;
        const isRetryable =
          status === 429 || (status >= 500 && status < 600) || !status;

        if (!isRetryable || attempt === this.maxRetries) {
          break;
        }

        const delay = this.baseRetryDelay * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * delay * 0.5);
        const totalDelay = delay + jitter;

        this.logger.warn(
          `Z-AI request failed (attempt ${attempt}/${this.maxRetries}), ` +
            `retrying in ${totalDelay}ms — error: ${error.message}`,
        );

        await this.sleep(totalDelay);
      }
    }

    this.logger.error(
      `Z-AI request failed after ${this.maxRetries} retries: ${lastError?.message}`,
    );
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
