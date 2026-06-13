"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMHelper = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
class LLMHelper {
    constructor(options) {
        this.logger = new common_1.Logger(LLMHelper.name);
        this.zaiInstance = null;
        this.callCount = 0;
        this.cache = new Map();
        this.totalLatencyMs = 0;
        this.totalCostUsd = 0;
        this.byConnector = new Map();
        this.maxCacheSize = options?.maxCacheSize ?? 200;
        this.cacheTtlMs = options?.cacheTtlMs ?? 30 * 60 * 1000;
    }
    async call(options) {
        const cacheKey = this.computeCacheKey(options);
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
            cached.hitCount++;
            this.logger.log(`LLM cache HIT (used ${cached.hitCount}x) — saved $${cached.result.costUsd.toFixed(4)}`);
            return { ...cached.result, retries: 0 };
        }
        await this.ensureInitialized();
        const maxRetries = options.retries ?? 3;
        let lastError = null;
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
                if (!content)
                    throw new Error('Empty LLM response');
                this.callCount++;
                const costUsd = this.estimateCost(options.userPrompt, content);
                const durationMs = Date.now() - startTime;
                this.totalLatencyMs += durationMs;
                this.totalCostUsd += costUsd;
                const result = {
                    content,
                    costUsd,
                    tokenCount: Math.ceil(options.userPrompt.length / 4) + Math.ceil(content.length / 4),
                    retries: attempt,
                };
                this.cache.set(cacheKey, { result, timestamp: Date.now(), hitCount: 0 });
                if (this.cache.size > this.maxCacheSize) {
                    this.evictOldest();
                }
                return result;
            }
            catch (err) {
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
    parseJSON(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }
        catch {
            return null;
        }
    }
    parseGeneratedFiles(response) {
        const files = new Map();
        const fileRegex = /===FILE:\s*(.+?)===\s*\n([\s\S]*?)===ENDFILE===/g;
        let match;
        while ((match = fileRegex.exec(response)) !== null) {
            const filePath = match[1].trim();
            const content = match[2].trim();
            if (filePath && content)
                files.set(filePath, content);
        }
        if (files.size > 0)
            return files;
        const codeBlockRegex = /```(\w*?)\s*\n([\s\S]*?)```/g;
        const langMap = {
            html: 'index.html', css: 'style.css', javascript: 'app.js', js: 'app.js',
            typescript: 'app.ts', ts: 'app.ts', python: 'app.py', json: 'package.json',
            yaml: 'docker-compose.yml', yml: 'docker-compose.yml', dockerfile: 'Dockerfile',
            bash: 'start.sh', sh: 'start.sh', sql: 'schema.sql', md: 'README.md',
        };
        while ((match = codeBlockRegex.exec(response)) !== null) {
            const lang = match[1].trim().toLowerCase();
            const content = match[2].trim();
            if (!content || content.length < 10)
                continue;
            const before = response.substring(Math.max(0, match.index - 200), match.index);
            const nameMatch = before.match(/(\S+\.\w+)/);
            const fileName = nameMatch?.[1] || langMap[lang];
            if (fileName && !files.has(fileName)) {
                files.set(fileName, content);
            }
        }
        return files;
    }
    buildChainContext(previousResults, maxTokens = 2000) {
        if (!previousResults || previousResults.size === 0)
            return '';
        const parts = [];
        let estimatedTokens = 0;
        for (const [capId, output] of previousResults) {
            const summary = this.summarizeOutput(capId, output);
            const tokenEstimate = Math.ceil(summary.length / 4);
            if (estimatedTokens + tokenEstimate > maxTokens) {
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
    getMetrics() {
        const byConnectorObj = {};
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
    getCacheStats() {
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
    clearCache() {
        this.cache.clear();
    }
    getCallCount() {
        return this.callCount;
    }
    async ensureInitialized() {
        if (this.zaiInstance)
            return;
        try {
            const sdk = await Promise.resolve().then(() => __importStar(require('z-ai-web-dev-sdk')));
            const ZAIClass = sdk.default || sdk;
            this.zaiInstance = await ZAIClass.create();
        }
        catch (err) {
            throw new Error(`z-ai-web-dev-sdk not available: ${err.message}`);
        }
    }
    estimateCost(prompt, response) {
        const promptTokens = Math.ceil(prompt.length / 4);
        const responseTokens = Math.ceil(response.length / 4);
        return (promptTokens + responseTokens) * 0.00001;
    }
    computeCacheKey(options) {
        const input = `${options.systemPrompt}|||${options.userPrompt}|||${options.temperature ?? 0.3}|||${options.maxTokens ?? 4096}`;
        return crypto.createHash('sha256').update(input).digest('hex').substring(0, 24);
    }
    evictOldest() {
        let oldest = null;
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
    summarizeOutput(capId, output) {
        if (!output)
            return '';
        const artifacts = output.artifacts || output.results?.artifacts || [];
        const artifactList = Array.isArray(artifacts)
            ? artifacts.map((a) => `- ${a.name || a.path} (${a.type || 'file'}, ${a.size || '?'} bytes)`).join('\n')
            : '';
        let contentSummary = '';
        if (output.output) {
            if (typeof output.output === 'string') {
                contentSummary = output.output.substring(0, 500);
            }
            else if (output.output.content) {
                contentSummary = String(output.output.content).substring(0, 500);
            }
            else if (output.output.architecture || output.output.analysis) {
                contentSummary = String(output.output.architecture || output.output.analysis || '').substring(0, 500);
            }
            else {
                contentSummary = JSON.stringify(output.output).substring(0, 500);
            }
        }
        return `### ${capId}\nSuccess: ${output.success !== false}\n${artifactList ? `Artifacts:\n${artifactList}\n` : ''}${contentSummary ? `Summary: ${contentSummary}` : ''}`;
    }
}
exports.LLMHelper = LLMHelper;
//# sourceMappingURL=llm-helper.js.map