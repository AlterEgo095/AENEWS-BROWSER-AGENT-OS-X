/**
 * AENEWS Agent OS X — Browser Pool Service
 *
 * Manages a pool of Playwright browser instances for efficient reuse.
 * Lazy initialization with configurable max concurrent instances.
 * Auto-cleanup of stale pages idle for > 5 minutes.
 *
 * Features:
 *   - Lazy browser initialization (max 5 concurrent by default)
 *   - Page recycling via getPage() / releasePage()
 *   - Auto-cleanup of stale pages (idle > 5 min)
 *   - Headless mode by default (configurable)
 *   - Browser launch options: viewport, user-agent, locale, proxy
 *   - Chromium only (for size)
 *   - Graceful shutdown via closeAll()
 */

import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ─── Types (avoid direct import of playwright at module level) ────────

type Browser = import('playwright').Browser;
type BrowserContext = import('playwright').BrowserContext;
type Page = import('playwright').Page;
type LaunchOptions = import('playwright').LaunchOptions;
type BrowserContextOptions = import('playwright').BrowserContextOptions;

interface PooledPage {
  page: Page;
  context: BrowserContext;
  browser: Browser;
  lastUsed: number;
  inUse: boolean;
}

// ─── Pool Config ─────────────────────────────────────────────────────

export interface BrowserPoolConfig {
  maxInstances: number;
  headless: boolean;
  defaultTimeout: number;
  viewportWidth: number;
  viewportHeight: number;
  userAgent?: string;
  locale?: string;
  proxyUrl?: string;
  chromiumPath?: string;
  stalePageTimeoutMs: number;
}

const DEFAULT_POOL_CONFIG: BrowserPoolConfig = {
  maxInstances: 5,
  headless: true,
  defaultTimeout: 30_000,
  viewportWidth: 1920,
  viewportHeight: 1080,
  stalePageTimeoutMs: 5 * 60 * 1000, // 5 minutes
};

// ─── Service ─────────────────────────────────────────────────────────

@Injectable()
export class BrowserPoolService implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserPoolService.name);
  private readonly config: BrowserPoolConfig;

  /** Pool of available pages (recycled) */
  private readonly pool: PooledPage[] = [];

  /** Number of browser instances currently launched */
  private browserCount = 0;

  /** Playwright module — lazily loaded */
  private playwrightModule: typeof import('playwright') | null = null;

  /** Whether Playwright is available on this system */
  private playwrightAvailable: boolean | null = null;

  /** Stale page cleanup timer */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(@Optional() private readonly configService?: ConfigService) {
    this.config = this.buildConfig();
    this.startCleanupTimer();
    this.logger.log(
      `BrowserPool initialized — maxInstances=${this.config.maxInstances}, ` +
        `headless=${this.config.headless}, viewport=${this.config.viewportWidth}x${this.config.viewportHeight}`,
    );
  }

  // ─── Public API ───────────────────────────────────────────────

  /**
   * Get a page from the pool. Creates a new browser context/page if needed.
   * Returns null if Playwright is not available.
   */
  async getPage(): Promise<Page | null> {
    // Check Playwright availability
    if (!(await this.ensurePlaywright())) {
      this.logger.warn('Playwright not available — cannot provide a browser page');
      return null;
    }

    // Try to reuse an idle page from the pool
    const idleEntry = this.pool.find((entry) => !entry.inUse);
    if (idleEntry) {
      idleEntry.inUse = true;
      idleEntry.lastUsed = Date.now();

      // Verify the page is still functional
      try {
        if (idleEntry.page.isClosed()) {
          this.logger.debug('Pooled page was closed — removing and creating new one');
          this.removeEntry(idleEntry);
          return this.createNewPage();
        }
        this.logger.debug('Reusing idle page from pool');
        return idleEntry.page;
      } catch {
        this.removeEntry(idleEntry);
        return this.createNewPage();
      }
    }

    // No idle pages — create a new one
    return this.createNewPage();
  }

  /**
   * Return a page to the pool for reuse.
   */
  releasePage(page: Page): void {
    const entry = this.pool.find((e) => e.page === page);
    if (entry) {
      entry.inUse = false;
      entry.lastUsed = Date.now();
      this.logger.debug('Page returned to pool');
    } else {
      // Page not from our pool — close it
      try {
        page.close().catch(() => {});
      } catch {
        // ignore
      }
    }
  }

  /**
   * Close all browsers and clean up the pool.
   */
  async closeAll(): Promise<void> {
    this.logger.log('Closing all browser instances...');

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Close all pages/contexts/browsers
    const closePromises: Promise<void>[] = [];
    for (const entry of this.pool) {
      closePromises.push(this.closeEntry(entry));
    }

    await Promise.allSettled(closePromises);
    this.pool.length = 0;
    this.browserCount = 0;

    this.logger.log('All browser instances closed');
  }

  /**
   * Check if Playwright / browser is available.
   */
  async isAvailable(): Promise<boolean> {
    return this.ensurePlaywright();
  }

  /**
   * Get pool statistics for monitoring.
   */
  getStats(): {
    totalEntries: number;
    inUse: number;
    idle: number;
    browserCount: number;
    playwrightAvailable: boolean | null;
  } {
    return {
      totalEntries: this.pool.length,
      inUse: this.pool.filter((e) => e.inUse).length,
      idle: this.pool.filter((e) => !e.inUse).length,
      browserCount: this.browserCount,
      playwrightAvailable: this.playwrightAvailable,
    };
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  async onModuleDestroy(): Promise<void> {
    await this.closeAll();
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private buildConfig(): BrowserPoolConfig {
    return {
      maxInstances:
        this.configService?.get<number>('BROWSER_MAX_INSTANCES') ??
        DEFAULT_POOL_CONFIG.maxInstances,
      headless:
        this.configService?.get<string>('BROWSER_HEADLESS') !== 'false',
      defaultTimeout:
        this.configService?.get<number>('BROWSER_DEFAULT_TIMEOUT') ??
        DEFAULT_POOL_CONFIG.defaultTimeout,
      viewportWidth:
        this.configService?.get<number>('BROWSER_VIEWPORT_WIDTH') ??
        DEFAULT_POOL_CONFIG.viewportWidth,
      viewportHeight:
        this.configService?.get<number>('BROWSER_VIEWPORT_HEIGHT') ??
        DEFAULT_POOL_CONFIG.viewportHeight,
      userAgent:
        this.configService?.get<string>('BROWSER_USER_AGENT') || undefined,
      locale:
        this.configService?.get<string>('BROWSER_LOCALE') || undefined,
      proxyUrl:
        this.configService?.get<string>('BROWSER_PROXY_URL') || undefined,
      chromiumPath:
        this.configService?.get<string>('BROWSER_CHROMIUM_PATH') || undefined,
      stalePageTimeoutMs:
        this.configService?.get<number>('BROWSER_STALE_PAGE_TIMEOUT_MS') ??
        DEFAULT_POOL_CONFIG.stalePageTimeoutMs,
    };
  }

  /**
   * Lazily load and verify Playwright availability.
   */
  private async ensurePlaywright(): Promise<boolean> {
    if (this.playwrightAvailable !== null) {
      return this.playwrightAvailable;
    }

    try {
      this.playwrightModule = await import('playwright');
      // Quick check that chromium launcher exists
      if (!this.playwrightModule.chromium) {
        throw new Error('Chromium launcher not found in Playwright module');
      }
      this.playwrightAvailable = true;
      this.logger.log('Playwright is available');
    } catch (err) {
      this.playwrightAvailable = false;
      this.playwrightModule = null;
      this.logger.warn(
        `Playwright not available: ${(err as Error).message}. ` +
          'Browser connector will fall back to simulation mode.',
      );
    }

    return this.playwrightAvailable;
  }

  /**
   * Create a new browser, context, and page.
   */
  private async createNewPage(): Promise<Page | null> {
    if (!this.playwrightModule) {
      return null;
    }

    // Enforce max instances — if at max, evict oldest idle entry
    if (this.browserCount >= this.config.maxInstances) {
      const idleEntry = this.pool.find((e) => !e.inUse);
      if (idleEntry) {
        this.logger.debug('Max instances reached — evicting oldest idle page');
        await this.closeEntry(idleEntry);
        this.removeEntry(idleEntry);
      } else {
        this.logger.warn(
          'Max browser instances reached and all pages are in use — waiting',
        );
        // In a real scenario you might queue; for now, reject
        return null;
      }
    }

    try {
      const launchOptions: LaunchOptions = {
        headless: this.config.headless,
      };

      if (this.config.chromiumPath) {
        launchOptions.executablePath = this.config.chromiumPath;
      }

      if (this.config.proxyUrl) {
        launchOptions.proxy = { server: this.config.proxyUrl };
      }

      const browser = await this.playwrightModule.chromium.launch(launchOptions);
      this.browserCount++;

      const contextOptions: BrowserContextOptions = {
        viewport: {
          width: this.config.viewportWidth,
          height: this.config.viewportHeight,
        },
      };

      if (this.config.userAgent) {
        contextOptions.userAgent = this.config.userAgent;
      }
      if (this.config.locale) {
        contextOptions.locale = this.config.locale;
      }

      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();

      page.setDefaultTimeout(this.config.defaultTimeout);
      page.setDefaultNavigationTimeout(this.config.defaultTimeout);

      const entry: PooledPage = {
        page,
        context,
        browser,
        lastUsed: Date.now(),
        inUse: true,
      };

      this.pool.push(entry);

      // Listen for page close to clean up
      page.on('close', () => {
        this.removeEntry(entry);
      });

      this.logger.debug(
        `Created new browser page (total browsers: ${this.browserCount}, pool size: ${this.pool.length})`,
      );

      return page;
    } catch (err) {
      this.logger.error(`Failed to create browser page: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Close a pool entry (page → context → browser).
   */
  private async closeEntry(entry: PooledPage): Promise<void> {
    try {
      if (!entry.page.isClosed()) {
        await entry.page.close().catch(() => {});
      }
    } catch {
      // ignore
    }

    try {
      await entry.context.close().catch(() => {});
    } catch {
      // ignore
    }

    try {
      await entry.browser.close().catch(() => {});
      this.browserCount = Math.max(0, this.browserCount - 1);
    } catch {
      // ignore
    }
  }

  /**
   * Remove an entry from the pool.
   */
  private removeEntry(entry: PooledPage): void {
    const idx = this.pool.indexOf(entry);
    if (idx !== -1) {
      this.pool.splice(idx, 1);
    }
  }

  /**
   * Start periodic cleanup of stale pages.
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStalePages();
    }, 60_000); // check every minute

    // Don't prevent process exit
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Clean up pages that have been idle for too long.
   */
  private async cleanupStalePages(): Promise<void> {
    const now = Date.now();
    const stale: PooledPage[] = [];

    for (const entry of this.pool) {
      if (
        !entry.inUse &&
        now - entry.lastUsed > this.config.stalePageTimeoutMs
      ) {
        stale.push(entry);
      }
    }

    if (stale.length > 0) {
      this.logger.debug(`Cleaning up ${stale.length} stale page(s)`);
      for (const entry of stale) {
        await this.closeEntry(entry);
        this.removeEntry(entry);
      }
    }
  }
}
