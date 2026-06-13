/**
 * AENEWS Software Factory — LLM Helper
 *
 * Shared LLM call utility used by all connectors that need
 * z-ai-web-dev-sdk. Handles lazy initialization, retries,
 * rate limiting, and cost tracking.
 */

import { Logger } from '@nestjs/common';
import { LLMCallOptions, LLMCallResult } from './connector.interface';

export class LLMHelper {
  private readonly logger = new Logger(LLMHelper.name);
  private zaiInstance: any = null;
  private callCount = 0;

  /**
   * Call the LLM with automatic retry and rate-limit handling
   */
  async call(options: LLMCallOptions): Promise<LLMCallResult> {
    await this.ensureInitialized();

    const maxRetries = options.retries ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const completion = await this.zaiInstance.chat.completions.create({
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userPrompt },
          ],
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 4096,
        });

        const content = completion.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty LLM response');

        this.callCount++;
        return {
          content,
          costUsd: this.estimateCost(options.userPrompt, content),
          retries: attempt,
        };
      } catch (err: any) {
        lastError = err;
        const isRateLimit = err.message?.includes('429') || err.message?.includes('rate');
        if (isRateLimit && attempt < maxRetries - 1) {
          const delayMs = Math.pow(2, attempt) * 3000;
          this.logger.warn(`Rate limited, retrying in ${delayMs / 1000}s... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        this.logger.warn(`LLM call failed (attempt ${attempt + 1}): ${err.message}`);
      }
    }

    throw new Error(`LLM call failed after ${maxRetries} retries: ${lastError?.message}`);
  }

  /**
   * Parse JSON from LLM response (extracts first JSON object)
   */
  parseJSON<T = any>(response: string): T | null {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      return null;
    }
  }

  /**
   * Parse generated files from LLM response
   * Supports ===FILE: path=== ... ===ENDFILE=== format and markdown code blocks
   */
  parseGeneratedFiles(response: string): Map<string, string> {
    const files = new Map<string, string>();

    // Format 1: ===FILE: path=== ... ===ENDFILE===
    const fileRegex = /===FILE:\s*(.+?)===\s*\n([\s\S]*?)===ENDFILE===/g;
    let match;
    while ((match = fileRegex.exec(response)) !== null) {
      const filePath = match[1].trim();
      const content = match[2].trim();
      if (filePath && content) files.set(filePath, content);
    }
    if (files.size > 0) return files;

    // Format 2: ```language ... ``` with filename inference
    const codeBlockRegex = /```(\w*?)\s*\n([\s\S]*?)```/g;
    const langMap: Record<string, string> = {
      html: 'index.html', css: 'style.css', javascript: 'app.js', js: 'app.js',
      typescript: 'app.ts', ts: 'app.ts', python: 'app.py', json: 'package.json',
      yaml: 'docker-compose.yml', yml: 'docker-compose.yml', dockerfile: 'Dockerfile',
      bash: 'start.sh', sh: 'start.sh', sql: 'schema.sql', md: 'README.md',
    };

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const lang = match[1].trim().toLowerCase();
      const content = match[2].trim();
      if (!content || content.length < 10) continue;

      // Look for filename before code block
      const before = response.substring(Math.max(0, match.index - 200), match.index);
      const nameMatch = before.match(/(\S+\.\w+)/);

      const fileName = nameMatch?.[1] || langMap[lang];
      if (fileName && !files.has(fileName)) {
        files.set(fileName, content);
      }
    }

    return files;
  }

  getCallCount(): number {
    return this.callCount;
  }

  // ─── Private ─────────────────────────────────────────────

  private async ensureInitialized(): Promise<void> {
    if (this.zaiInstance) return;
    try {
      const sdk: any = await import('z-ai-web-dev-sdk');
      const ZAIClass = sdk.default || sdk;
      this.zaiInstance = await ZAIClass.create();
    } catch (err: any) {
      throw new Error(`z-ai-web-dev-sdk not available: ${err.message}`);
    }
  }

  private estimateCost(prompt: string, response: string): number {
    // Rough estimation: ~$0.01 per 1K tokens
    const promptTokens = Math.ceil(prompt.length / 4);
    const responseTokens = Math.ceil(response.length / 4);
    return (promptTokens + responseTokens) * 0.00001;
  }
}
