/**
 * AENEWS Agent OS X — Real Browser Connector Service
 *
 * Playwright-based browser connector that replaces the simulation connector
 * with real browser automation capabilities.
 *
 * Capabilities:
 *   Navigation:  navigate, goBack, goForward, refresh
 *   Interaction: click, type, press, hover, scroll, selectOption, uploadFile
 *   Extraction:  screenshot, getText, getHtml, getLinks, getImages, getMetadata, getTable, scrape
 *   Forms:       fillForm, submitForm
 *   Wait:        waitForSelector, waitForNavigation, waitForText
 *   Session:     setCookie, getCookies, clearCookies, setViewport, setUserAgent
 *   Advanced:    evaluate, interceptRequests, blockResources, pdf, emulateDevice
 *
 * Integration:
 *   - Uses BrowserPoolService for page management
 *   - Circuit breaker key: connector:browser
 *   - Emits events via AgentEventBusService
 *   - Records metrics via MetricsService
 *   - Graceful fallback to simulation when Playwright is not available
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentEventBusService, AgentEventType } from '../../agent-framework/services/agent-event-bus.service';
import { CircuitBreakerService, CIRCUIT_KEY_PREFIX } from '../../agent-framework/services/circuit-breaker.service';
import { MetricsService } from '../../observability/services/metrics.service';
import { BrowserPoolService } from './browser-pool.service';

// ─── Type helpers (avoid top-level playwright import) ─────────────────

type Page = import('playwright').Page;

// ─── Result Types ────────────────────────────────────────────────────

export interface BrowserResult {
  success: boolean;
  data?: any;
  error?: string;
  durationMs: number;
  meta?: {
    source: 'playwright' | 'simulation';
    url?: string;
    title?: string;
  };
}

export interface NavigationResult extends BrowserResult {
  data?: {
    url: string;
    title: string;
    status: number | null;
  };
}

export interface ScreenshotResult extends BrowserResult {
  data?: {
    base64: string;
    width: number;
    height: number;
    fullPage: boolean;
  };
}

export interface TextResult extends BrowserResult {
  data?: {
    text: string;
    selector?: string;
  };
}

export interface LinksResult extends BrowserResult {
  data?: {
    links: Array<{ text: string; href: string }>;
    count: number;
  };
}

export interface ImagesResult extends BrowserResult {
  data?: {
    images: Array<{ src: string; alt: string }>;
    count: number;
  };
}

export interface MetadataResult extends BrowserResult {
  data?: {
    title: string;
    description: string;
    ogTags: Record<string, string>;
    url: string;
  };
}

export interface TableResult extends BrowserResult {
  data?: {
    headers: string[];
    rows: string[][];
    rowCount: number;
  };
}

export interface ScrapeResult extends BrowserResult {
  data?: Record<string, any>;
}

export interface CookieResult extends BrowserResult {
  data?: Array<Record<string, any>>;
}

export interface EvaluateResult extends BrowserResult {
  data?: any;
}

// ─── Circuit Breaker Key ─────────────────────────────────────────────

const CIRCUIT_KEY = `${CIRCUIT_KEY_PREFIX.CONNECTOR}:browser`;

// ─── Service ─────────────────────────────────────────────────────────

@Injectable()
export class RealBrowserConnectorService {
  private readonly logger = new Logger(RealBrowserConnectorService.name);
  private readonly defaultTimeout: number;
  private readonly browserEnabled: boolean;

  constructor(
    private readonly pool: BrowserPoolService,
    @Optional() private readonly eventBus?: AgentEventBusService,
    @Optional() private readonly circuitBreaker?: CircuitBreakerService,
    @Optional() private readonly metrics?: MetricsService,
    @Optional() private readonly configService?: ConfigService,
  ) {
    this.defaultTimeout =
      configService?.get<number>('BROWSER_DEFAULT_TIMEOUT') ?? 30_000;
    this.browserEnabled =
      configService?.get<string>('BROWSER_ENABLED') !== 'false';

    this.logger.log(
      `RealBrowserConnector initialized — enabled=${this.browserEnabled}, timeout=${this.defaultTimeout}ms`,
    );
  }

  // ─── Navigation ───────────────────────────────────────────────

  /**
   * Navigate to a URL with wait until networkidle.
   */
  async navigate(url: string, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit'; timeout?: number }): Promise<NavigationResult> {
    return this.executeWithResilience('navigate', async (page) => {
      const response = await page.goto(url, {
        waitUntil: options?.waitUntil ?? 'networkidle',
        timeout: options?.timeout ?? this.defaultTimeout,
      });

      return {
        url: page.url(),
        title: await page.title(),
        status: response?.status() ?? null,
      };
    }, { url });
  }

  /**
   * Navigate back in browser history.
   */
  async goBack(): Promise<NavigationResult> {
    return this.executeWithResilience('goBack', async (page) => {
      await page.goBack({ timeout: this.defaultTimeout });
      return {
        url: page.url(),
        title: await page.title(),
        status: null,
      };
    });
  }

  /**
   * Navigate forward in browser history.
   */
  async goForward(): Promise<NavigationResult> {
    return this.executeWithResilience('goForward', async (page) => {
      await page.goForward({ timeout: this.defaultTimeout });
      return {
        url: page.url(),
        title: await page.title(),
        status: null,
      };
    });
  }

  /**
   * Reload the current page.
   */
  async refresh(): Promise<NavigationResult> {
    return this.executeWithResilience('refresh', async (page) => {
      const response = await page.reload({ timeout: this.defaultTimeout });
      return {
        url: page.url(),
        title: await page.title(),
        status: response?.status() ?? null,
      };
    });
  }

  // ─── Interaction ──────────────────────────────────────────────

  /**
   * Click an element matching the selector.
   */
  async click(selector: string, options?: { timeout?: number }): Promise<BrowserResult> {
    return this.executeWithResilience('click', async (page) => {
      await page.waitForSelector(selector, { state: 'visible', timeout: options?.timeout ?? this.defaultTimeout });
      await page.click(selector);
      return { selector, clicked: true };
    }, { selector });
  }

  /**
   * Type text into an element with human-like delay.
   */
  async type(selector: string, text: string, options?: { delay?: number; timeout?: number }): Promise<BrowserResult> {
    return this.executeWithResilience('type', async (page) => {
      await page.waitForSelector(selector, { state: 'visible', timeout: options?.timeout ?? this.defaultTimeout });
      await page.fill(selector, '');
      await page.type(selector, text, { delay: options?.delay ?? 50 });
      return { selector, text, typed: true };
    }, { selector, text });
  }

  /**
   * Press a keyboard key.
   */
  async press(key: string): Promise<BrowserResult> {
    return this.executeWithResilience('press', async (page) => {
      await page.keyboard.press(key);
      return { key, pressed: true };
    }, { key });
  }

  /**
   * Hover over an element.
   */
  async hover(selector: string, options?: { timeout?: number }): Promise<BrowserResult> {
    return this.executeWithResilience('hover', async (page) => {
      await page.waitForSelector(selector, { state: 'visible', timeout: options?.timeout ?? this.defaultTimeout });
      await page.hover(selector);
      return { selector, hovered: true };
    }, { selector });
  }

  /**
   * Scroll the page in a direction by a given amount.
   */
  async scroll(direction: 'up' | 'down' | 'left' | 'right', amount: number = 300): Promise<BrowserResult> {
    return this.executeWithResilience('scroll', async (page) => {
      const delta = direction === 'up' || direction === 'left' ? -amount : amount;
      if (direction === 'up' || direction === 'down') {
        await page.mouse.wheel(0, delta);
      } else {
        await page.mouse.wheel(delta, 0);
      }
      return { direction, amount, scrolled: true };
    }, { direction, amount });
  }

  /**
   * Select an option in a dropdown.
   */
  async selectOption(selector: string, value: string): Promise<BrowserResult> {
    return this.executeWithResilience('selectOption', async (page) => {
      await page.waitForSelector(selector, { state: 'visible', timeout: this.defaultTimeout });
      const selectedValues = await page.selectOption(selector, value);
      return { selector, value, selectedValues };
    }, { selector, value });
  }

  /**
   * Upload a file to a file input element.
   */
  async uploadFile(selector: string, filePath: string): Promise<BrowserResult> {
    return this.executeWithResilience('uploadFile', async (page) => {
      await page.waitForSelector(selector, { state: 'visible', timeout: this.defaultTimeout });
      const input = page.locator(selector);
      await input.setInputFiles(filePath);
      return { selector, filePath, uploaded: true };
    }, { selector, filePath });
  }

  // ─── Data Extraction ─────────────────────────────────────────

  /**
   * Capture a screenshot (PNG, base64-encoded).
   */
  async screenshot(options?: { fullPage?: boolean; selector?: string; timeout?: number }): Promise<ScreenshotResult> {
    return this.executeWithResilience('screenshot', async (page) => {
      let buffer: Buffer;

      if (options?.selector) {
        const element = await page.waitForSelector(options.selector, {
          state: 'visible',
          timeout: options?.timeout ?? this.defaultTimeout,
        });
        buffer = await element.screenshot({ type: 'png' });
      } else {
        buffer = await page.screenshot({
          type: 'png',
          fullPage: options?.fullPage ?? false,
          timeout: options?.timeout ?? this.defaultTimeout,
        });
      }

      return {
        base64: buffer.toString('base64'),
        width: page.viewportSize()?.width ?? 0,
        height: page.viewportSize()?.height ?? 0,
        fullPage: options?.fullPage ?? false,
      };
    }, { fullPage: options?.fullPage, selector: options?.selector });
  }

  /**
   * Extract text content from the page or a specific selector.
   */
  async getText(selector?: string): Promise<TextResult> {
    return this.executeWithResilience('getText', async (page) => {
      let text: string;
      if (selector) {
        const element = await page.waitForSelector(selector, { timeout: this.defaultTimeout });
        text = (await element?.textContent()) ?? '';
      } else {
        text = await page.textContent('body') ?? '';
      }
      return { text, selector };
    }, { selector });
  }

  /**
   * Extract HTML from the page or a specific selector.
   */
  async getHtml(selector?: string): Promise<BrowserResult> {
    return this.executeWithResilience('getHtml', async (page) => {
      let html: string;
      if (selector) {
        const element = await page.waitForSelector(selector, { timeout: this.defaultTimeout });
        html = await element?.innerHTML() ?? '';
      } else {
        html = await page.content();
      }
      return { html, selector };
    }, { selector });
  }

  /**
   * Extract all links with text + href.
   */
  async getLinks(): Promise<LinksResult> {
    return this.executeWithResilience('getLinks', async (page) => {
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]')).map((el) => ({
          text: (el as HTMLAnchorElement).textContent?.trim() ?? '',
          href: (el as HTMLAnchorElement).href,
        }));
      });
      return { links, count: links.length };
    });
  }

  /**
   * Extract all images with src + alt.
   */
  async getImages(): Promise<ImagesResult> {
    return this.executeWithResilience('getImages', async (page) => {
      const images = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).map((el) => ({
          src: (el as HTMLImageElement).src,
          alt: (el as HTMLImageElement).alt ?? '',
        }));
      });
      return { images, count: images.length };
    });
  }

  /**
   * Extract page metadata (title, description, OG tags).
   */
  async getMetadata(): Promise<MetadataResult> {
    return this.executeWithResilience('getMetadata', async (page) => {
      const metadata = await page.evaluate(() => {
        const getMeta = (name: string): string => {
          const el =
            document.querySelector(`meta[name="${name}"]`) ??
            document.querySelector(`meta[property="${name}"]`);
          return el?.getAttribute('content') ?? '';
        };

        const ogTags: Record<string, string> = {};
        document.querySelectorAll('meta[property^="og:"]').forEach((el) => {
          const prop = el.getAttribute('property') ?? '';
          const content = el.getAttribute('content') ?? '';
          ogTags[prop] = content;
        });

        return {
          title: document.title,
          description: getMeta('description'),
          ogTags,
          url: window.location.href,
        };
      });
      return metadata;
    });
  }

  /**
   * Extract table data as arrays.
   */
  async getTable(selector: string): Promise<TableResult> {
    return this.executeWithResilience('getTable', async (page) => {
      await page.waitForSelector(selector, { timeout: this.defaultTimeout });
      const tableData = await page.evaluate((sel) => {
        const table = document.querySelector(sel);
        if (!table) return null;

        const headers: string[] = [];
        const headerCells = table.querySelectorAll('thead th, tr:first-child th');
        headerCells.forEach((cell) => headers.push(cell.textContent?.trim() ?? ''));

        const rows: string[][] = [];
        const bodyRows = table.querySelectorAll('tbody tr, tr');
        bodyRows.forEach((row) => {
          const cells: string[] = [];
          row.querySelectorAll('td').forEach((cell) => cells.push(cell.textContent?.trim() ?? ''));
          if (cells.length > 0) rows.push(cells);
        });

        return { headers, rows, rowCount: rows.length };
      }, selector);
      return tableData;
    }, { selector });
  }

  /**
   * Structured extraction with CSS selectors.
   */
  async scrape(schema: Record<string, string>): Promise<ScrapeResult> {
    return this.executeWithResilience('scrape', async (page) => {
      const result = await page.evaluate((s) => {
        const output: Record<string, any> = {};
        for (const [key, selector] of Object.entries(s)) {
          const elements = document.querySelectorAll(selector as string);
          if (elements.length === 0) {
            output[key] = null;
          } else if (elements.length === 1) {
            output[key] = elements[0].textContent?.trim() ?? '';
          } else {
            output[key] = Array.from(elements).map(
              (el) => el.textContent?.trim() ?? '',
            );
          }
        }
        return output;
      }, schema as any);
      return result;
    }, { schema });
  }

  // ─── Form Handling ────────────────────────────────────────────

  /**
   * Fill multiple form fields.
   */
  async fillForm(fields: Array<{ selector: string; value: string }>): Promise<BrowserResult> {
    return this.executeWithResilience('fillForm', async (page) => {
      let filledCount = 0;
      for (const field of fields) {
        try {
          await page.waitForSelector(field.selector, { state: 'visible', timeout: this.defaultTimeout });
          await page.fill(field.selector, field.value);
          filledCount++;
        } catch (err) {
          this.logger.warn(`Failed to fill field "${field.selector}": ${(err as Error).message}`);
        }
      }
      return { fieldsCompleted: filledCount, totalFields: fields.length };
    }, { fieldCount: fields.length });
  }

  /**
   * Submit a form by clicking the submit button or pressing Enter.
   */
  async submitForm(selector: string): Promise<BrowserResult> {
    return this.executeWithResilience('submitForm', async (page) => {
      await page.waitForSelector(selector, { state: 'visible', timeout: this.defaultTimeout });
      await page.click(selector);
      // Wait for navigation or network idle after submit
      try {
        await page.waitForLoadState('networkidle', { timeout: this.defaultTimeout });
      } catch {
        // May not navigate — that's fine
      }
      return { selector, submitted: true, url: page.url() };
    }, { selector });
  }

  // ─── Wait ─────────────────────────────────────────────────────

  /**
   * Wait for a selector to appear in the DOM.
   */
  async waitForSelector(selector: string, options?: { state?: 'attached' | 'detached' | 'visible' | 'hidden'; timeout?: number }): Promise<BrowserResult> {
    return this.executeWithResilience('waitForSelector', async (page) => {
      await page.waitForSelector(selector, {
        state: options?.state ?? 'visible',
        timeout: options?.timeout ?? this.defaultTimeout,
      });
      return { selector, found: true };
    }, { selector });
  }

  /**
   * Wait for navigation to a specific URL or any navigation.
   */
  async waitForNavigation(url?: string, options?: { timeout?: number }): Promise<NavigationResult> {
    return this.executeWithResilience('waitForNavigation', async (page) => {
      if (url) {
        await page.waitForURL(url, { timeout: options?.timeout ?? this.defaultTimeout });
      } else {
        await page.waitForLoadState('networkidle', { timeout: options?.timeout ?? this.defaultTimeout });
      }
      return {
        url: page.url(),
        title: await page.title(),
        status: null,
      };
    }, { url });
  }

  /**
   * Wait for specific text to appear on the page.
   */
  async waitForText(text: string, options?: { timeout?: number }): Promise<BrowserResult> {
    return this.executeWithResilience('waitForText', async (page) => {
      await page.waitForFunction(
        (txt) => document.body?.textContent?.includes(txt) ?? false,
        text,
        { timeout: options?.timeout ?? this.defaultTimeout },
      );
      return { text, found: true };
    }, { text });
  }

  // ─── Session ──────────────────────────────────────────────────

  /**
   * Set cookies on the current context.
   */
  async setCookie(cookies: Array<{ name: string; value: string; domain?: string; path?: string }>): Promise<BrowserResult> {
    return this.executeWithResilience('setCookie', async (page) => {
      const context = page.context();
      await context.addCookies(
        cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain ?? new URL(page.url()).hostname,
          path: c.path ?? '/',
        })),
      );
      return { cookiesSet: cookies.length };
    }, { cookieCount: cookies.length });
  }

  /**
   * Get all cookies from the current context.
   */
  async getCookies(): Promise<CookieResult> {
    return this.executeWithResilience('getCookies', async (page) => {
      const context = page.context();
      const cookies = await context.cookies();
      return cookies;
    });
  }

  /**
   * Clear all cookies from the current context.
   */
  async clearCookies(): Promise<BrowserResult> {
    return this.executeWithResilience('clearCookies', async (page) => {
      const context = page.context();
      await context.clearCookies();
      return { cleared: true };
    });
  }

  /**
   * Change viewport size.
   */
  async setViewport(width: number, height: number): Promise<BrowserResult> {
    return this.executeWithResilience('setViewport', async (page) => {
      await page.setViewportSize({ width, height });
      return { width, height };
    }, { width, height });
  }

  /**
   * Change user agent (requires new context — will close current page).
   */
  async setUserAgent(ua: string): Promise<BrowserResult> {
    // This is complex because you can't change UA on an existing context.
    // We return a note that a new session is needed.
    return {
      success: true,
      data: { userAgent: ua, note: 'User agent change requires a new browser session. Set BROWSER_USER_AGENT env var for persistent change.' },
      durationMs: 0,
      meta: { source: 'simulation' },
    };
  }

  // ─── Advanced ─────────────────────────────────────────────────

  /**
   * Run JavaScript in the page context.
   */
  async evaluate(expression: string): Promise<EvaluateResult> {
    return this.executeWithResilience('evaluate', async (page) => {
      const result = await page.evaluate(expression);
      return result;
    }, { expression });
  }

  /**
   * Intercept network requests matching a URL pattern.
   * Returns a function to stop intercepting.
   */
  async interceptRequests(
    pattern: string,
    handler: 'block' | 'log' | 'modify',
  ): Promise<BrowserResult> {
    return this.executeWithResilience('interceptRequests', async (page) => {
      await page.route(pattern, (route) => {
        switch (handler) {
          case 'block':
            return route.abort();
          case 'log':
            this.logger.debug(`Intercepted request: ${route.request().url()}`);
            return route.continue();
          case 'modify':
            return route.continue();
          default:
            return route.continue();
        }
      });
      return { pattern, handler, intercepting: true };
    }, { pattern, handler });
  }

  /**
   * Block resource types (images, css, fonts, etc.) for speed.
   */
  async blockResources(types: Array<'image' | 'stylesheet' | 'font' | 'media' | 'script'>): Promise<BrowserResult> {
    return this.executeWithResilience('blockResources', async (page) => {
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType() as string;
        if (types.includes(resourceType as any)) {
          return route.abort();
        }
        return route.continue();
      });
      return { blockedTypes: types, blocking: true };
    }, { types });
  }

  /**
   * Generate a PDF from the current page (Chromium only).
   */
  async pdf(options?: { format?: string; printBackground?: boolean }): Promise<BrowserResult> {
    return this.executeWithResilience('pdf', async (page) => {
      const buffer = await page.pdf({
        format: (options?.format as any) ?? 'A4',
        printBackground: options?.printBackground ?? true,
      });
      return {
        base64: buffer.toString('base64'),
        size: buffer.length,
      };
    }, { format: options?.format });
  }

  /**
   * Emulate a mobile device.
   */
  async emulateDevice(device: string): Promise<BrowserResult> {
    return this.executeWithResilience('emulateDevice', async (page) => {
      try {
        const playwright = await import('playwright');
        const deviceDescriptor = (playwright.devices as any)[device];
        if (!deviceDescriptor) {
          return { error: `Device "${device}" not found in Playwright devices`, emulated: false };
        }
        // Apply viewport and user agent
        await page.setViewportSize(deviceDescriptor.viewport);
        return {
          device,
          viewport: deviceDescriptor.viewport,
          userAgent: deviceDescriptor.userAgent,
          emulated: true,
        };
      } catch (err) {
        return { error: (err as Error).message, emulated: false };
      }
    }, { device });
  }

  // ─── Bridge Connector Interface ──────────────────────────────

  /**
   * Get the list of supported actions for the AgentBridgeService connector.
   */
  getSupportedActions(): string[] {
    return [
      'navigate', 'goBack', 'goForward', 'refresh',
      'click', 'type', 'press', 'hover', 'scroll', 'selectOption', 'uploadFile',
      'screenshot', 'getText', 'getHtml', 'getLinks', 'getImages', 'getMetadata', 'getTable', 'scrape',
      'fillForm', 'submitForm',
      'waitForSelector', 'waitForNavigation', 'waitForText',
      'setCookie', 'getCookies', 'clearCookies', 'setViewport', 'setUserAgent',
      'evaluate', 'interceptRequests', 'blockResources', 'pdf', 'emulateDevice',
    ];
  }

  /**
   * Execute an action by name (used by AgentBridgeService connector interface).
   */
  async executeAction(action: string, params: Record<string, any>): Promise<any> {
    const startTime = Date.now();

    try {
      let result: BrowserResult;

      switch (action) {
        // Navigation
        case 'navigate':
          result = await this.navigate(params.url, params.options);
          break;
        case 'goBack':
          result = await this.goBack();
          break;
        case 'goForward':
          result = await this.goForward();
          break;
        case 'refresh':
          result = await this.refresh();
          break;

        // Interaction
        case 'click':
          result = await this.click(params.selector, params.options);
          break;
        case 'type':
          result = await this.type(params.selector, params.text, params.options);
          break;
        case 'press':
          result = await this.press(params.key);
          break;
        case 'hover':
          result = await this.hover(params.selector, params.options);
          break;
        case 'scroll':
          result = await this.scroll(params.direction ?? 'down', params.amount ?? 300);
          break;
        case 'selectOption':
          result = await this.selectOption(params.selector, params.value);
          break;
        case 'uploadFile':
          result = await this.uploadFile(params.selector, params.filePath);
          break;

        // Extraction
        case 'screenshot':
          result = await this.screenshot(params.options);
          break;
        case 'getText':
          result = await this.getText(params.selector);
          break;
        case 'getHtml':
          result = await this.getHtml(params.selector);
          break;
        case 'getLinks':
          result = await this.getLinks();
          break;
        case 'getImages':
          result = await this.getImages();
          break;
        case 'getMetadata':
          result = await this.getMetadata();
          break;
        case 'getTable':
          result = await this.getTable(params.selector);
          break;
        case 'scrape':
          result = await this.scrape(params.schema);
          break;

        // Form handling
        case 'fillForm':
          result = await this.fillForm(params.fields);
          break;
        case 'submitForm':
          result = await this.submitForm(params.selector);
          break;

        // Wait
        case 'waitForSelector':
          result = await this.waitForSelector(params.selector, params.options);
          break;
        case 'waitForNavigation':
          result = await this.waitForNavigation(params.url, params.options);
          break;
        case 'waitForText':
          result = await this.waitForText(params.text, params.options);
          break;

        // Session
        case 'setCookie':
          result = await this.setCookie(params.cookies);
          break;
        case 'getCookies':
          result = await this.getCookies();
          break;
        case 'clearCookies':
          result = await this.clearCookies();
          break;
        case 'setViewport':
          result = await this.setViewport(params.width, params.height);
          break;
        case 'setUserAgent':
          result = await this.setUserAgent(params.userAgent);
          break;

        // Advanced
        case 'evaluate':
          result = await this.evaluate(params.expression);
          break;
        case 'interceptRequests':
          result = await this.interceptRequests(params.pattern, params.handler ?? 'log');
          break;
        case 'blockResources':
          result = await this.blockResources(params.types);
          break;
        case 'pdf':
          result = await this.pdf(params.options);
          break;
        case 'emulateDevice':
          result = await this.emulateDevice(params.device);
          break;

        default:
          result = {
            success: false,
            error: `Unknown action: ${action}`,
            durationMs: Date.now() - startTime,
          };
      }

      return result;
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
        durationMs: Date.now() - startTime,
      };
    }
  }

  // ─── Resilience Wrapper ───────────────────────────────────────

  /**
   * Execute a browser operation with circuit breaker, metrics, events,
   * and graceful fallback to simulation.
   */
  private async executeWithResilience<T extends BrowserResult>(
    action: string,
    fn: (page: Page) => Promise<any>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const startTime = Date.now();

    // Check if browser is enabled
    if (!this.browserEnabled) {
      return this.simulateFallback(action, metadata, startTime) as T;
    }

    // Check pool availability
    const available = await this.pool.isAvailable();
    if (!available) {
      return this.simulateFallback(action, metadata, startTime) as T;
    }

    // Wrap in circuit breaker if available
    if (this.circuitBreaker) {
      try {
        return await this.circuitBreaker.execute(
          CIRCUIT_KEY,
          () => this.executeWithPage(action, fn, metadata, startTime),
          async () => this.simulateFallback(action, metadata, startTime) as T,
        );
      } catch (err) {
        return this.createErrorResult((err as Error).message, startTime) as T;
      }
    }

    // No circuit breaker — direct execution
    return this.executeWithPage(action, fn, metadata, startTime);
  }

  /**
   * Execute with a page from the pool.
   */
  private async executeWithPage<T extends BrowserResult>(
    action: string,
    fn: (page: Page) => Promise<any>,
    metadata: Record<string, any> | undefined,
    startTime: number,
  ): Promise<T> {
    const page = await this.pool.getPage();
    if (!page) {
      return this.simulateFallback(action, metadata, startTime) as T;
    }

    try {
      const data = await fn(page);
      const durationMs = Date.now() - startTime;

      // Emit success event
      this.emitEvent(action, true, durationMs);
      this.recordMetric(action, durationMs, true);

      let pageMeta: BrowserResult['meta'] = { source: 'playwright' };
      try {
        pageMeta = {
          source: 'playwright',
          url: page.url(),
          title: await page.title(),
        };
      } catch {
        // page might have navigated away or closed
      }

      return {
        success: true,
        data,
        durationMs,
        meta: pageMeta,
      } as T;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMsg = (err as Error).message;

      // Emit failure event
      this.emitEvent(action, false, durationMs, errorMsg);
      this.recordMetric(action, durationMs, false);

      return this.createErrorResult(errorMsg, startTime) as T;
    } finally {
      this.pool.releasePage(page);
    }
  }

  /**
   * Fallback simulation result when Playwright is not available.
   */
  private simulateFallback(
    action: string,
    metadata: Record<string, any> | undefined,
    startTime: number,
  ): BrowserResult {
    this.logger.debug(`Simulation fallback for browser.${action}`);

    const simulatedData: Record<string, any> = {
      action,
      status: 'simulated',
      timestamp: Date.now(),
      note: 'Playwright not available — using simulation fallback',
    };

    // Add action-specific simulation data
    switch (action) {
      case 'navigate':
        simulatedData.url = metadata?.url ?? 'https://example.com';
        simulatedData.title = 'Simulated Page Title';
        simulatedData.status = 200;
        break;
      case 'screenshot':
        simulatedData.base64 = '';
        simulatedData.width = 1920;
        simulatedData.height = 1080;
        simulatedData.fullPage = false;
        break;
      case 'getText':
        simulatedData.text = 'Simulated page text content';
        simulatedData.selector = metadata?.selector;
        break;
      case 'getLinks':
        simulatedData.links = [
          { text: 'Example Link', href: 'https://example.com' },
        ];
        simulatedData.count = 1;
        break;
      case 'getImages':
        simulatedData.images = [
          { src: 'https://example.com/image.png', alt: 'Example Image' },
        ];
        simulatedData.count = 1;
        break;
      case 'getMetadata':
        simulatedData.title = 'Simulated Page';
        simulatedData.description = 'Simulated page description';
        simulatedData.ogTags = {};
        simulatedData.url = 'https://example.com';
        break;
    }

    return {
      success: true,
      data: simulatedData,
      durationMs: Date.now() - startTime,
      meta: { source: 'simulation' },
    };
  }

  /**
   * Create an error result.
   */
  private createErrorResult(error: string, startTime: number): BrowserResult {
    return {
      success: false,
      error,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Emit an event via the AgentEventBusService.
   */
  private emitEvent(action: string, success: boolean, durationMs: number, error?: string): void {
    try {
      this.eventBus?.emit(AgentEventType.TOOL_EXECUTED, 'browser', {
        action,
        success,
        durationMs,
        error,
      });
    } catch {
      // Never let event emission affect core logic
    }
  }

  /**
   * Record a metric via the MetricsService.
   */
  private recordMetric(action: string, durationMs: number, success: boolean): void {
    try {
      this.metrics?.recordAgentExecution('connector', `browser.${action}`, durationMs, success);
    } catch {
      // Never let metrics recording affect core logic
    }
  }
}
