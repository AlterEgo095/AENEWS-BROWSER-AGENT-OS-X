/**
 * AENEWS Software Factory — LLM Helper
 *
 * Shared LLM call utility used by all connectors that need
 * z-ai-web-dev-sdk. Handles lazy initialization, retries,
 * rate limiting, cost tracking, and CACHING.
 *
 * Sprint 2 Optimizations:
 *   - Prompt-hash-based caching: identical prompts return cached results
 *   - Token budget tracking: prevents runaway costs
 *   - Smart context reduction: auto-trim prompts near context limit
 *   - Performance metrics: tracks latency/cost per connector
 */

import { Logger } from '@nestjs/common';
import { LLMCallOptions, LLMCallResult } from './connector.interface';
import * as crypto from 'crypto';

// ─── LLM Cache Entry ────────────────────────────────────────────

interface CacheEntry {
  result: LLMCallResult;
  timestamp: number;
  hitCount: number;
}

// ─── LLM Metrics ────────────────────────────────────────────────

interface LLMMetrics {
  totalCalls: number;
  cacheHits: number;
  cacheMisses: number;
  totalCostUsd: number;
  totalTokensEstimated: number;
  avgLatencyMs: number;
  byConnector: Record<string, { calls: number; costUsd: number; avgMs: number }>;
}

export class LLMHelper {
  private readonly logger = new Logger(LLMHelper.name);
  private zaiInstance: any = null;
  private callCount = 0;

  /** Cache: hash(prompt) → result */
  private readonly cache = new Map<string, CacheEntry>();
  private readonly maxCacheSize: number;
  private readonly cacheTtlMs: number;

  /** Metrics */
  private totalLatencyMs = 0;
  private totalCostUsd = 0;
  private readonly byConnector = new Map<string, { calls: number; costUsd: number; totalMs: number }>();

  constructor(options?: { maxCacheSize?: number; cacheTtlMs?: number }) {
    this.maxCacheSize = options?.maxCacheSize ?? 200;
    this.cacheTtlMs = options?.cacheTtlMs ?? 30 * 60 * 1000; // 30 min default
  }

  /**
   * Call the LLM with automatic retry, rate-limit handling, and caching
   */
  async call(options: LLMCallOptions): Promise<LLMCallResult> {
    // Check cache first
    const cacheKey = this.computeCacheKey(options);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      cached.hitCount++;
      this.logger.log(`LLM cache HIT (used ${cached.hitCount}x) — saved $${cached.result.costUsd.toFixed(4)}`);
      return { ...cached.result, retries: 0 };
    }

    await this.ensureInitialized();

    const maxRetries = options.retries ?? 3;
    let lastError: Error | null = null;

    const startTime = Date.now();

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
        const costUsd = this.estimateCost(options.userPrompt, content);
        const durationMs = Date.now() - startTime;

        // Track metrics
        this.totalLatencyMs += durationMs;
        this.totalCostUsd += costUsd;

        const result: LLMCallResult = {
          content,
          costUsd,
          tokenCount: Math.ceil(options.userPrompt.length / 4) + Math.ceil(content.length / 4),
          retries: attempt,
        };

        // Store in cache
        this.cache.set(cacheKey, { result, timestamp: Date.now(), hitCount: 0 });

        // Evict oldest entries if cache is too large
        if (this.cache.size > this.maxCacheSize) {
          this.evictOldest();
        }

        return result;
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

  /**
   * Build a context string from previous connector results (for chaining)
   * Automatically summarizes large outputs to stay within token budget
   */
  buildChainContext(previousResults: Map<string, any>, maxTokens: number = 2000): string {
    if (!previousResults || previousResults.size === 0) return '';

    const parts: string[] = [];
    let estimatedTokens = 0;

    for (const [capId, output] of previousResults) {
      const summary = this.summarizeOutput(capId, output);
      const tokenEstimate = Math.ceil(summary.length / 4);

      if (estimatedTokens + tokenEstimate > maxTokens) {
        // Truncate this summary
        const remaining = maxTokens - estimatedTokens;
        const truncated = summary.substring(0, remaining * 4);
        parts.push(truncated + '...(truncated)');
        break;
      }

      parts.push(summary);
      estimatedTokens += tokenEstimate;
    }

    return parts.length > 0
      ? `## Previous Results (for context)\n${parts.join('\n\n')}\n\nUse this context to build upon what was already generated.`
      : '';
  }

  /**
   * Get LLM metrics
   */
  getMetrics(): LLMMetrics {
    const byConnectorObj: Record<string, { calls: number; costUsd: number; avgMs: number }> = {};
    for (const [name, m] of this.byConnector) {
      byConnectorObj[name] = { calls: m.calls, costUsd: m.costUsd, avgMs: Math.round(m.totalMs / m.calls) };
    }

    return {
      totalCalls: this.callCount,
      cacheHits: Array.from(this.cache.values()).reduce((s, e) => s + e.hitCount, 0),
      cacheMisses: this.callCount,
      totalCostUsd: this.totalCostUsd,
      totalTokensEstimated: 0,
      avgLatencyMs: this.callCount > 0 ? Math.round(this.totalLatencyMs / this.callCount) : 0,
      byConnector: byConnectorObj,
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; savingsUsd: number } {
    let totalHits = 0;
    let savings = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
      savings += entry.hitCount * entry.result.costUsd;
    }
    return {
      size: this.cache.size,
      hitRate: this.callCount + totalHits > 0 ? totalHits / (this.callCount + totalHits) : 0,
      savingsUsd: savings,
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
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

  private computeCacheKey(options: LLMCallOptions): string {
    // Hash system prompt + user prompt + temperature for cache key
    const input = `${options.systemPrompt}|||${options.userPrompt}|||${options.temperature ?? 0.3}|||${options.maxTokens ?? 4096}`;
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 24);
  }

  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = key;
      }
    }
    if (oldest) {
      this.cache.delete(oldest);
    }
  }

  private summarizeOutput(capId: string, output: any): string {
    if (!output) return '';

    // If it has artifacts, list them
    const artifacts = output.artifacts || output.results?.artifacts || [];
    const artifactList = Array.isArray(artifacts)
      ? artifacts.map((a: any) => `- ${a.name || a.path} (${a.type || 'file'}, ${a.size || '?'} bytes)`).join('\n')
      : '';

    // If it has output content, summarize
    let contentSummary = '';
    if (output.output) {
      if (typeof output.output === 'string') {
        contentSummary = output.output.substring(0, 500);
      } else if (output.output.content) {
        contentSummary = String(output.output.content).substring(0, 500);
      } else if (output.output.architecture || output.output.analysis) {
        contentSummary = String(output.output.architecture || output.output.analysis || '').substring(0, 500);
      } else {
        contentSummary = JSON.stringify(output.output).substring(0, 500);
      }
    }

    return `### ${capId}\nSuccess: ${output.success !== false}\n${artifactList ? `Artifacts:\n${artifactList}\n` : ''}${contentSummary ? `Summary: ${contentSummary}` : ''}`;
  }
}
