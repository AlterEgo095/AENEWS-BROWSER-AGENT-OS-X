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
exports.BrowserPool = void 0;
const common_1 = require("@nestjs/common");
const playwright_1 = require("playwright");
const DEFAULT_OPTIONS = {
    maxContexts: 5,
    idleTimeoutMs: 30000,
    headless: true,
    navigationTimeout: 30000,
};
class BrowserPool {
    constructor(options) {
        this.logger = new common_1.Logger(BrowserPool.name);
        this.browser = null;
        this.contexts = new Map();
        this.cleanupTimer = null;
        this.initPromise = null;
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    async getBrowser() {
        if (this.browser?.isConnected())
            return this.browser;
        if (this.initPromise)
            return this.initPromise;
        this.initPromise = (async () => {
            try {
                this.logger.log('Launching shared Playwright browser...');
                this.browser = await playwright_1.chromium.launch({
                    headless: this.options.headless,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                    ],
                });
                this.browser.on('disconnected', () => {
                    this.logger.warn('Browser disconnected unexpectedly');
                    this.browser = null;
                    this.initPromise = null;
                });
                this.startCleanupTimer();
                this.logger.log('Shared Playwright browser launched successfully');
                return this.browser;
            }
            catch (error) {
                this.initPromise = null;
                throw new Error(`Failed to launch browser: ${error.message}`);
            }
        })();
        return this.initPromise;
    }
    async acquirePage() {
        const browser = await this.getBrowser();
        if (this.contexts.size >= this.options.maxContexts) {
            const oldest = this.findOldestIdleContext();
            if (oldest) {
                await this.releaseContext(oldest.id);
            }
        }
        const contextId = `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        const page = await context.newPage();
        page.setDefaultNavigationTimeout(this.options.navigationTimeout);
        page.setDefaultTimeout(15000);
        this.contexts.set(contextId, { context, lastUsed: Date.now(), id: contextId });
        this.logger.log(`Context acquired: ${contextId} (${this.contexts.size}/${this.options.maxContexts})`);
        return { contextId, page, context };
    }
    async releaseContext(contextId) {
        const managed = this.contexts.get(contextId);
        if (!managed)
            return;
        try {
            await managed.context.close();
        }
        catch {
        }
        this.contexts.delete(contextId);
        this.logger.log(`Context released: ${contextId} (${this.contexts.size}/${this.options.maxContexts})`);
    }
    async withPage(fn) {
        const { contextId, page, context } = await this.acquirePage();
        try {
            const result = await fn(page, context);
            return result;
        }
        finally {
            await this.releaseContext(contextId);
        }
    }
    async navigate(page, url, waitUntil = 'domcontentloaded') {
        await page.goto(url, { waitUntil, timeout: this.options.navigationTimeout });
    }
    async screenshot(url, outputPath, fullPage = false) {
        return this.withPage(async (page) => {
            await this.navigate(page, url);
            await page.screenshot({ path: outputPath, fullPage });
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            return fs.statSync(outputPath).size;
        });
    }
    getStatistics() {
        return {
            browserActive: this.browser?.isConnected() ?? false,
            activeContexts: this.contexts.size,
            maxContexts: this.options.maxContexts,
        };
    }
    async close() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        for (const [id, managed] of this.contexts) {
            try {
                await managed.context.close();
            }
            catch {
            }
        }
        this.contexts.clear();
        if (this.browser) {
            try {
                await this.browser.close();
                this.logger.log('Shared Playwright browser closed');
            }
            catch {
            }
            this.browser = null;
            this.initPromise = null;
        }
    }
    findOldestIdleContext() {
        let oldest;
        for (const managed of this.contexts.values()) {
            if (!oldest || managed.lastUsed < oldest.lastUsed) {
                oldest = managed;
            }
        }
        return oldest;
    }
    startCleanupTimer() {
        if (this.cleanupTimer)
            return;
        this.cleanupTimer = setInterval(() => {
            const now = Date.now();
            for (const [id, managed] of this.contexts) {
                if (now - managed.lastUsed > this.options.idleTimeoutMs) {
                    this.logger.log(`Cleaning up idle context: ${id}`);
                    this.releaseContext(id).catch(() => { });
                }
            }
        }, 10000);
    }
}
exports.BrowserPool = BrowserPool;
//# sourceMappingURL=browser-pool.js.map