/**
 * AENEWS Software Factory — Browser Connector
 *
 * Maps browser.* capabilities to real Playwright invocations:
 *   browser.login      → Playwright: navigate + fill credentials + submit
 *   browser.navigation → Playwright: goto URL, wait for load
 *   browser.search     → Playwright: navigate to search engine + type query
 *   browser.form       → Playwright: fill form fields + submit
 *   browser.upload     → Playwright: file upload via input[type=file]
 *   browser.download   → Playwright: download file
 *   browser.screenshot → Playwright: take full-page screenshot
 *   browser.vision     → Playwright: screenshot + LLM visual analysis
 *   browser.session    → Playwright: manage cookies/storage
 *   browser.cookie     → Playwright: get/set cookies
 *   browser.popup      → Playwright: handle popup/new tab
 *   browser.ocr        → Playwright: screenshot + OCR via LLM
 *
 * Tools: playwright, z-ai-web-dev-sdk (for vision/OCR)
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  CapabilityId,
  CapabilityPack,
  BrowserCapability,
} from '../interfaces';
import {
  ICapabilityConnector,
  ConnectorInput,
  ConnectorOutput,
  GeneratedArtifact,
} from './connector.interface';
import { LLMHelper } from './llm-helper';

@Injectable()
export class BrowserConnector implements ICapabilityConnector {
  readonly supportedPack = CapabilityPack.BROWSER;
  private readonly logger = new Logger(BrowserConnector.name);
  private readonly llm = new LLMHelper();

  private static readonly BROWSER_CAPABILITIES = new Set<string>(Object.values(BrowserCapability));

  supports(capabilityId: CapabilityId): boolean {
    return BrowserConnector.BROWSER_CAPABILITIES.has(capabilityId as string);
  }

  async execute(capabilityId: CapabilityId, input: ConnectorInput): Promise<ConnectorOutput> {
    const startTime = Date.now();
    const capId = capabilityId as BrowserCapability;

    this.logger.log(`Browser connector executing: ${capId} for mission ${input.missionId}`);

    try {
      let result: ConnectorOutput;

      switch (capId) {
        case BrowserCapability.SCREENSHOT:
          result = await this.executeScreenshot(input);
          break;
        case BrowserCapability.NAVIGATION:
          result = await this.executeNavigation(input);
          break;
        case BrowserCapability.LOGIN:
          result = await this.executeLogin(input);
          break;
        case BrowserCapability.SEARCH:
          result = await this.executeSearch(input);
          break;
        case BrowserCapability.FORM:
          result = await this.executeForm(input);
          break;
        case BrowserCapability.VISION:
          result = await this.executeVision(input);
          break;
        case BrowserCapability.OCR:
          result = await this.executeOCR(input);
          break;
        case BrowserCapability.DOWNLOAD:
          result = await this.executeDownload(input);
          break;
        case BrowserCapability.UPLOAD:
          result = await this.executeUpload(input);
          break;
        case BrowserCapability.SESSION:
          result = await this.executeSession(input);
          break;
        case BrowserCapability.COOKIE:
          result = await this.executeCookie(input);
          break;
        case BrowserCapability.POPUP:
          result = await this.executePopup(input);
          break;
        default:
          result = await this.executeGenericBrowser(capId, input);
      }

      result.durationMs = Date.now() - startTime;
      return result;
    } catch (error: any) {
      this.logger.error(`Browser connector failed for ${capId}: ${error.message}`);
      return {
        success: false,
        artifacts: [],
        output: { error: error.message },
        costUsd: 0,
        durationMs: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  browser.screenshot → Playwright full-page screenshot
  // ═══════════════════════════════════════════════════════════

  private async executeScreenshot(input: ConnectorInput): Promise<ConnectorOutput> {
    const url = input.parameters.url || input.parameters.target;
    if (!url) {
      return {
        success: false,
        artifacts: [],
        output: { error: 'No URL provided for screenshot' },
        costUsd: 0,
        durationMs: 0,
        error: 'Missing url parameter',
      };
    }

    const screenshotDir = path.join(input.workspaceDir, 'screenshots');
    fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, `screenshot-${Date.now()}.png`);

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await browser.close();

      const stats = fs.statSync(screenshotPath);
      this.logger.log(`Screenshot saved: ${screenshotPath} (${stats.size} bytes)`);

      return {
        success: true,
        artifacts: [this.makeArtifact(path.basename(screenshotPath), 'screenshot', screenshotPath, stats.size)],
        output: { url, screenshotPath, sizeBytes: stats.size },
        costUsd: 0.01,
        durationMs: 0,
      };
    } catch (error: any) {
      this.logger.warn(`Playwright screenshot failed: ${error.message}`);
      // Fallback: generate a report about the attempt
      const reportPath = path.join(input.workspaceDir, 'docs', 'browser-report.md');
      const report = `# Browser Screenshot Report\n\nURL: ${url}\nStatus: FAILED\nError: ${error.message}\n\nNote: Playwright may not be installed. Run: npx playwright install chromium\n`;
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, report, 'utf-8');

      return {
        success: false,
        artifacts: [this.makeArtifact('browser-report.md', 'report', reportPath, report)],
        output: { url, error: error.message },
        costUsd: 0,
        durationMs: 0,
        error: error.message,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  browser.navigation → Playwright navigate + extract content
  // ═══════════════════════════════════════════════════════════

  private async executeNavigation(input: ConnectorInput): Promise<ConnectorOutput> {
    const url = input.parameters.url || input.parameters.target;
    if (!url) {
      return this.missingParamResult('url', 'navigation');
    }

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      const title = await page.title();
      const content = await page.content();

      // Save page content
      const contentDir = path.join(input.workspaceDir, 'browser-data');
      fs.mkdirSync(contentDir, { recursive: true });

      const htmlPath = path.join(contentDir, 'page.html');
      fs.writeFileSync(htmlPath, content, 'utf-8');

      // Extract text content
      const textContent = await page.evaluate(() => document.body?.innerText || '');
      const textPath = path.join(contentDir, 'page-text.txt');
      fs.writeFileSync(textPath, textContent, 'utf-8');

      await browser.close();

      return {
        success: true,
        artifacts: [
          this.makeArtifact('page.html', 'source', htmlPath, content),
          this.makeArtifact('page-text.txt', 'document', textPath, textContent),
        ],
        output: { url, title, textLength: textContent.length },
        costUsd: 0.01,
        durationMs: 0,
      };
    } catch (error: any) {
      return this.playwrightFallback(input, 'navigation', url, error);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  browser.login → Playwright login flow
  // ═══════════════════════════════════════════════════════════

  private async executeLogin(input: ConnectorInput): Promise<ConnectorOutput> {
    const url = input.parameters.url || input.parameters.loginUrl;
    const username = input.parameters.username || input.parameters.email;
    const password = input.parameters.password;

    if (!url || !username || !password) {
      return this.missingParamResult('url, username, password', 'login');
    }

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Try common selectors for username/email and password fields
      const usernameSelectors = ['input[type="email"]', 'input[name="username"]', 'input[name="email"]', 'input[id="username"]', 'input[id="email"]'];
      const passwordSelectors = ['input[type="password"]', 'input[name="password"]', 'input[id="password"]'];

      let filledUsername = false;
      for (const selector of usernameSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.fill(username);
            filledUsername = true;
            break;
          }
        } catch { /* try next selector */ }
      }

      let filledPassword = false;
      for (const selector of passwordSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            await element.fill(password);
            filledPassword = true;
            break;
          }
        } catch { /* try next selector */ }
      }

      // Submit form
      if (filledUsername && filledPassword) {
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      }

      const resultTitle = await page.title();
      const resultUrl = page.url();

      // Screenshot of post-login state
      const screenshotDir = path.join(input.workspaceDir, 'screenshots');
      fs.mkdirSync(screenshotDir, { recursive: true });
      const screenshotPath = path.join(screenshotDir, 'post-login.png');
      await page.screenshot({ path: screenshotPath }).catch(() => {});

      await browser.close();

      return {
        success: filledUsername && filledPassword,
        artifacts: [this.makeArtifact('post-login.png', 'screenshot', screenshotPath, fs.existsSync(screenshotPath) ? fs.statSync(screenshotPath).size : 0)],
        output: { url, resultUrl, resultTitle, usernameFilled: filledUsername, passwordFilled: filledPassword },
        costUsd: 0.02,
        durationMs: 0,
      };
    } catch (error: any) {
      return this.playwrightFallback(input, 'login', url, error);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  browser.search → Playwright search
  // ═══════════════════════════════════════════════════════════

  private async executeSearch(input: ConnectorInput): Promise<ConnectorOutput> {
    const query = input.parameters.query || input.parameters.searchQuery;
    const engine = input.parameters.engine || 'google';

    if (!query) {
      return this.missingParamResult('query', 'search');
    }

    const searchUrls: Record<string, string> = {
      google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
    };

    const url = searchUrls[engine.toLowerCase()] || searchUrls.google;

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Extract search results
      const results = await page.evaluate(() => {
        const items: any[] = [];
        document.querySelectorAll('h3').forEach((h3, i) => {
          if (i < 10) {
            const link = h3.closest('a');
            items.push({
              title: h3.textContent || '',
              url: link?.href || '',
            });
          }
        });
        return items;
      });

      // Save results
      const dataDir = path.join(input.workspaceDir, 'browser-data');
      fs.mkdirSync(dataDir, { recursive: true });
      const resultsPath = path.join(dataDir, 'search-results.json');
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf-8');

      // Screenshot
      const screenshotDir = path.join(input.workspaceDir, 'screenshots');
      fs.mkdirSync(screenshotDir, { recursive: true });
      const screenshotPath = path.join(screenshotDir, 'search-results.png');
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

      await browser.close();

      return {
        success: results.length > 0,
        artifacts: [
          this.makeArtifact('search-results.json', 'source', resultsPath, JSON.stringify(results)),
          this.makeArtifact('search-results.png', 'screenshot', screenshotPath, fs.existsSync(screenshotPath) ? fs.statSync(screenshotPath).size : 0),
        ],
        output: { query, engine, resultCount: results.length, results: results.slice(0, 5) },
        costUsd: 0.02,
        durationMs: 0,
      };
    } catch (error: any) {
      return this.playwrightFallback(input, 'search', url, error);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  browser.form → Playwright fill form
  // ═══════════════════════════════════════════════════════════

  private async executeForm(input: ConnectorInput): Promise<ConnectorOutput> {
    const url = input.parameters.url;
    const fields = input.parameters.fields || {};

    if (!url) {
      return this.missingParamResult('url', 'form');
    }

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Fill each field
      const filledFields: string[] = [];
      for (const [selector, value] of Object.entries(fields)) {
        try {
          await page.fill(selector, value as string);
          filledFields.push(selector);
        } catch {
          // Try by name attribute
          try {
            await page.fill(`[name="${selector}"]`, value as string);
            filledFields.push(`[name="${selector}"]`);
          } catch { /* skip this field */ }
        }
      }

      // Submit
      if (input.parameters.submit !== false) {
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      }

      const resultUrl = page.url();

      await browser.close();

      return {
        success: filledFields.length > 0,
        artifacts: [],
        output: { url, resultUrl, filledFields, totalFields: Object.keys(fields).length },
        costUsd: 0.01,
        durationMs: 0,
      };
    } catch (error: any) {
      return this.playwrightFallback(input, 'form', url, error);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  browser.vision → Screenshot + LLM visual analysis
  // ═══════════════════════════════════════════════════════════

  private async executeVision(input: ConnectorInput): Promise<ConnectorOutput> {
    const url = input.parameters.url || input.parameters.target;
    if (!url) {
      return this.missingParamResult('url', 'vision');
    }

    // First take a screenshot
    const screenshotResult = await this.executeScreenshot(input);

    if (!screenshotResult.success) {
      return screenshotResult;
    }

    // Then analyze with LLM
    try {
      const llmResult = await this.llm.call({
        systemPrompt: 'You are a visual UI/UX analyst. Describe what you see in a webpage screenshot and provide insights.',
        userPrompt: `Analyze this webpage screenshot from ${url}. The mission is: "${input.instruction}". Describe the layout, identify any UI issues, and suggest improvements.`,
        maxTokens: 2048,
      });

      const analysisPath = path.join(input.workspaceDir, 'browser-data', 'visual-analysis.md');
      fs.mkdirSync(path.dirname(analysisPath), { recursive: true });
      fs.writeFileSync(analysisPath, llmResult.content, 'utf-8');

      return {
        success: true,
        artifacts: [
          ...screenshotResult.artifacts,
          this.makeArtifact('visual-analysis.md', 'document', analysisPath, llmResult.content),
        ],
        output: { url, analysis: llmResult.content.substring(0, 1000) },
        costUsd: screenshotResult.costUsd + llmResult.costUsd,
        durationMs: 0,
      };
    } catch (error: any) {
      return {
        ...screenshotResult,
        output: { ...screenshotResult.output, visionError: error.message },
      };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  browser.ocr → Screenshot + LLM text extraction
  // ═══════════════════════════════════════════════════════════

  private async executeOCR(input: ConnectorInput): Promise<ConnectorOutput> {
    const url = input.parameters.url || input.parameters.target;
    if (!url) {
      return this.missingParamResult('url', 'ocr');
    }

    // Use navigation to get text content (more reliable than OCR for web pages)
    const navResult = await this.executeNavigation(input);

    if (navResult.success && navResult.output?.textLength > 0) {
      return {
        success: true,
        artifacts: navResult.artifacts,
        output: {
          url,
          extractedText: navResult.output.textContent?.substring(0, 2000),
          method: 'DOM extraction (more reliable than OCR for web)',
        },
        costUsd: navResult.costUsd,
        durationMs: 0,
      };
    }

    return navResult;
  }

  // ═══════════════════════════════════════════════════════════
  //  browser.download → Playwright download file
  // ═══════════════════════════════════════════════════════════

  private async executeDownload(input: ConnectorInput): Promise<ConnectorOutput> {
    const url = input.parameters.url;
    const outputPath = input.parameters.outputPath;

    if (!url) {
      return this.missingParamResult('url', 'download');
    }

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      const downloadDir = path.join(input.workspaceDir, 'downloads');
      fs.mkdirSync(downloadDir, { recursive: true });

      const download = await page.waitForEvent('download', { timeout: 30000 });
      const fileName = outputPath || download.suggestedFilename() || `download-${Date.now()}`;
      const savePath = path.join(downloadDir, fileName);
      await download.saveAs(savePath);

      await browser.close();

      const stats = fs.statSync(savePath);
      return {
        success: true,
        artifacts: [this.makeArtifact(fileName, 'source', savePath, stats.size)],
        output: { url, savedTo: savePath, sizeBytes: stats.size },
        costUsd: 0.01,
        durationMs: 0,
      };
    } catch (error: any) {
      return this.playwrightFallback(input, 'download', url, error);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  browser.upload → Playwright file upload
  // ═══════════════════════════════════════════════════════════

  private async executeUpload(input: ConnectorInput): Promise<ConnectorOutput> {
    const url = input.parameters.url;
    const filePath = input.parameters.filePath;
    const selector = input.parameters.selector || 'input[type="file"]';

    if (!url || !filePath) {
      return this.missingParamResult('url, filePath', 'upload');
    }

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      await page.setInputFiles(selector, filePath);

      // Submit if auto-submit not triggered
      if (input.parameters.autoSubmit !== true) {
        await page.keyboard.press('Enter').catch(() => {});
      }

      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      await browser.close();

      return {
        success: true,
        artifacts: [],
        output: { url, uploadedFile: filePath },
        costUsd: 0.01,
        durationMs: 0,
      };
    } catch (error: any) {
      return this.playwrightFallback(input, 'upload', url, error);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  browser.session → Manage browser session
  // ═══════════════════════════════════════════════════════════

  private async executeSession(input: ConnectorInput): Promise<ConnectorOutput> {
    const url = input.parameters.url;
    if (!url) {
      return this.missingParamResult('url', 'session');
    }

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Save storage state (cookies, localStorage)
      const stateDir = path.join(input.workspaceDir, 'browser-data');
      fs.mkdirSync(stateDir, { recursive: true });
      const statePath = path.join(stateDir, 'session-state.json');
      await context.storageState({ path: statePath });

      await browser.close();

      const stateContent = fs.readFileSync(statePath, 'utf-8');
      return {
        success: true,
        artifacts: [this.makeArtifact('session-state.json', 'config', statePath, stateContent)],
        output: { url, statePath },
        costUsd: 0.01,
        durationMs: 0,
      };
    } catch (error: any) {
      return this.playwrightFallback(input, 'session', url, error);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  browser.cookie → Get/set cookies
  // ═══════════════════════════════════════════════════════════

  private async executeCookie(input: ConnectorInput): Promise<ConnectorOutput> {
    const url = input.parameters.url;
    if (!url) {
      return this.missingParamResult('url', 'cookie');
    }

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Set cookies if provided
      if (input.parameters.cookies) {
        await context.addCookies(input.parameters.cookies);
      }

      // Get all cookies
      const cookies = await context.cookies();

      await browser.close();

      const dataDir = path.join(input.workspaceDir, 'browser-data');
      fs.mkdirSync(dataDir, { recursive: true });
      const cookiesPath = path.join(dataDir, 'cookies.json');
      fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2), 'utf-8');

      return {
        success: true,
        artifacts: [this.makeArtifact('cookies.json', 'config', cookiesPath, JSON.stringify(cookies))],
        output: { url, cookieCount: cookies.length },
        costUsd: 0.01,
        durationMs: 0,
      };
    } catch (error: any) {
      return this.playwrightFallback(input, 'cookie', url, error);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  browser.popup → Handle popup/new tab
  // ═══════════════════════════════════════════════════════════

  private async executePopup(input: ConnectorInput): Promise<ConnectorOutput> {
    const url = input.parameters.url;
    if (!url) {
      return this.missingParamResult('url', 'popup');
    }

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Listen for popups
      const popupPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);

      // Click the trigger if provided
      if (input.parameters.triggerSelector) {
        await page.click(input.parameters.triggerSelector).catch(() => {});
      }

      const popup = await popupPromise;
      let popupUrl = '';
      let popupTitle = '';

      if (popup) {
        popupUrl = popup.url();
        popupTitle = await popup.title();
      }

      await browser.close();

      return {
        success: true,
        artifacts: [],
        output: { url, popupUrl, popupTitle, popupDetected: !!popup },
        costUsd: 0.01,
        durationMs: 0,
      };
    } catch (error: any) {
      return this.playwrightFallback(input, 'popup', url, error);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  Generic fallback
  // ═══════════════════════════════════════════════════════════

  private async executeGenericBrowser(capId: BrowserCapability, input: ConnectorInput): Promise<ConnectorOutput> {
    const url = input.parameters.url;
    if (url) {
      // Default: navigate + screenshot
      return this.executeScreenshot(input);
    }

    return {
      success: false,
      artifacts: [],
      output: { message: `Browser capability ${capId} requires a url parameter` },
      costUsd: 0,
      durationMs: 0,
      error: `Missing url parameter for ${capId}`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  private makeArtifact(name: string, type: GeneratedArtifact['type'], fullPath: string, contentOrSize: string | number): GeneratedArtifact {
    const isString = typeof contentOrSize === 'string';
    return {
      name,
      type,
      path: fullPath,
      size: isString ? Buffer.byteLength(contentOrSize as string) : (contentOrSize as number),
      content: isString ? (contentOrSize as string).substring(0, 500) : undefined,
    };
  }

  private missingParamResult(params: string, action: string): ConnectorOutput {
    return {
      success: false,
      artifacts: [],
      output: { error: `Missing required parameters: ${params}` },
      costUsd: 0,
      durationMs: 0,
      error: `Missing required parameters: ${params} for ${action}`,
    };
  }

  private playwrightFallback(input: ConnectorInput, action: string, url: string, error: Error): ConnectorOutput {
    this.logger.warn(`Playwright ${action} failed for ${url}: ${error.message}`);

    const reportPath = path.join(input.workspaceDir, 'docs', `browser-${action}-report.md`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    const report = `# Browser ${action} Report\n\nURL: ${url}\nAction: ${action}\nStatus: FAILED\nError: ${error.message}\n\n## Troubleshooting\n1. Ensure Playwright is installed: \`npx playwright install chromium\`\n2. Check if the URL is accessible\n3. Verify network connectivity\n`;
    fs.writeFileSync(reportPath, report, 'utf-8');

    return {
      success: false,
      artifacts: [this.makeArtifact(`browser-${action}-report.md`, 'report', reportPath, report)],
      output: { url, action, error: error.message },
      costUsd: 0,
      durationMs: 0,
      error: error.message,
    };
  }
}
