import { BrowserContext, Page } from 'playwright';
export interface BrowserPoolOptions {
    maxContexts: number;
    idleTimeoutMs: number;
    headless: boolean;
    navigationTimeout: number;
}
export declare class BrowserPool {
    private readonly logger;
    private browser;
    private readonly contexts;
    private readonly options;
    private cleanupTimer;
    private initPromise;
    constructor(options?: Partial<BrowserPoolOptions>);
    private getBrowser;
    acquirePage(): Promise<{
        contextId: string;
        page: Page;
        context: BrowserContext;
    }>;
    releaseContext(contextId: string): Promise<void>;
    withPage<T>(fn: (page: Page, context: BrowserContext) => Promise<T>): Promise<T>;
    navigate(page: Page, url: string, waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'): Promise<void>;
    screenshot(url: string, outputPath: string, fullPage?: boolean): Promise<number>;
    getStatistics(): {
        browserActive: boolean;
        activeContexts: number;
        maxContexts: number;
    };
    close(): Promise<void>;
    private findOldestIdleContext;
    private startCleanupTimer;
}
