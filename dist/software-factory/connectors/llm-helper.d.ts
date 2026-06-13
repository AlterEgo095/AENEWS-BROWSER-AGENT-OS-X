import { LLMCallOptions, LLMCallResult } from './connector.interface';
interface LLMMetrics {
    totalCalls: number;
    cacheHits: number;
    cacheMisses: number;
    totalCostUsd: number;
    totalTokensEstimated: number;
    avgLatencyMs: number;
    byConnector: Record<string, {
        calls: number;
        costUsd: number;
        avgMs: number;
    }>;
}
export declare class LLMHelper {
    private readonly logger;
    private zaiInstance;
    private callCount;
    private readonly cache;
    private readonly maxCacheSize;
    private readonly cacheTtlMs;
    private totalLatencyMs;
    private totalCostUsd;
    private readonly byConnector;
    constructor(options?: {
        maxCacheSize?: number;
        cacheTtlMs?: number;
    });
    call(options: LLMCallOptions): Promise<LLMCallResult>;
    parseJSON<T = any>(response: string): T | null;
    parseGeneratedFiles(response: string): Map<string, string>;
    buildChainContext(previousResults: Map<string, any>, maxTokens?: number): string;
    getMetrics(): LLMMetrics;
    getCacheStats(): {
        size: number;
        hitRate: number;
        savingsUsd: number;
    };
    clearCache(): void;
    getCallCount(): number;
    private ensureInitialized;
    private estimateCost;
    private computeCacheKey;
    private evictOldest;
    private summarizeOutput;
}
export {};
