import { LLMCallOptions, LLMCallResult } from './connector.interface';
export declare class LLMHelper {
    private readonly logger;
    private zaiInstance;
    private callCount;
    call(options: LLMCallOptions): Promise<LLMCallResult>;
    parseJSON<T = any>(response: string): T | null;
    parseGeneratedFiles(response: string): Map<string, string>;
    getCallCount(): number;
    private ensureInitialized;
    private estimateCost;
}
