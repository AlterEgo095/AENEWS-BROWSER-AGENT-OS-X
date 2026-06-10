/**
 * AENEWS Agent OS X - Navigation Agent
 * Handles URL navigation, browser history management, redirects, and page transitions.
 */

import { Injectable } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';

// ─── Agent Configuration ──────────────────────────────────────────

export const NAVIGATION_AGENT_CONFIG: AgentConfig = {
  id: 'browser-navigation',
  name: 'Navigation',
  cluster: AgentCluster.BROWSER,
  version: '1.0.0',
  description:
    'Navigate to URLs, handle redirects, manage browser history, and control page transitions. Supports navigation with wait strategies, URL validation, and redirect chain tracking.',
  capabilities: [
    {
      name: 'navigateTo',
      description: 'Navigate the browser to a specified URL with optional wait conditions',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Target URL to navigate to' },
          waitUntil: {
            type: 'string',
            enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
            description: 'When to consider navigation complete',
          },
          timeout: { type: 'number', description: 'Maximum navigation timeout in ms' },
          referer: { type: 'string', description: 'HTTP referer header' },
        },
        required: ['url'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          finalUrl: { type: 'string' },
          statusCode: { type: 'number' },
          redirectChain: { type: 'array', items: { type: 'string' } },
          loadTime: { type: 'number' },
        },
      },
    },
    {
      name: 'goBack',
      description: 'Navigate back in browser history',
      inputSchema: {
        type: 'object',
        properties: {
          steps: { type: 'number', description: 'Number of steps to go back' },
          waitUntil: { type: 'string', description: 'Navigation wait condition' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          previousUrl: { type: 'string' },
          currentUrl: { type: 'string' },
          success: { type: 'boolean' },
        },
      },
    },
    {
      name: 'goForward',
      description: 'Navigate forward in browser history',
      inputSchema: {
        type: 'object',
        properties: {
          steps: { type: 'number', description: 'Number of steps to go forward' },
          waitUntil: { type: 'string', description: 'Navigation wait condition' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          previousUrl: { type: 'string' },
          currentUrl: { type: 'string' },
          success: { type: 'boolean' },
        },
      },
    },
    {
      name: 'refresh',
      description: 'Refresh the current page with optional cache bypass',
      inputSchema: {
        type: 'object',
        properties: {
          hardRefresh: { type: 'boolean', description: 'Bypass cache on refresh' },
          waitUntil: { type: 'string', description: 'Navigation wait condition' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          currentUrl: { type: 'string' },
          loadTime: { type: 'number' },
          fromCache: { type: 'boolean' },
        },
      },
    },
    {
      name: 'waitForNavigation',
      description: 'Wait for a navigation event to occur within a specified timeout',
      inputSchema: {
        type: 'object',
        properties: {
          timeout: { type: 'number', description: 'Maximum wait time in ms' },
          waitUntil: { type: 'string', description: 'Navigation wait condition' },
          urlPattern: { type: 'string', description: 'URL pattern to wait for' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          navigated: { type: 'boolean' },
          finalUrl: { type: 'string' },
          waitTime: { type: 'number' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:browser', 'write:browser', 'navigate:url', 'access:history'],
  maxConcurrentTasks: 5,
  timeout: 30000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1000,
    exponentialBackoff: true,
  },
};

// ─── Navigation History Tracker ───────────────────────────────────

interface NavigationEntry {
  url: string;
  timestamp: Date;
  statusCode?: number;
  redirectChain: string[];
  loadTimeMs: number;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class NavigationAgentService extends BaseAgentService {
  private navigationHistory: NavigationEntry[] = [];
  private currentUrl: string = '';
  private historyIndex: number = -1;

  protected defineConfig(): AgentConfig {
    return NAVIGATION_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'navigateTo',
      description: 'Navigate the browser to a specified URL',
      execute: async (params: {
        url: string;
        waitUntil?: string;
        timeout?: number;
        referer?: string;
      }) => this.navigateTo(params),
    });

    this.registerTool({
      name: 'goBack',
      description: 'Navigate back in browser history',
      execute: async (params: { steps?: number; waitUntil?: string }) =>
        this.goBack(params.steps || 1),
    });

    this.registerTool({
      name: 'goForward',
      description: 'Navigate forward in browser history',
      execute: async (params: { steps?: number; waitUntil?: string }) =>
        this.goForward(params.steps || 1),
    });

    this.registerTool({
      name: 'refresh',
      description: 'Refresh the current page',
      execute: async (params: { hardRefresh?: boolean; waitUntil?: string }) =>
        this.refresh(params.hardRefresh || false),
    });

    this.registerTool({
      name: 'waitForNavigation',
      description: 'Wait for a navigation event',
      execute: async (params: { timeout?: number; waitUntil?: string; urlPattern?: string }) =>
        this.waitForNavigation(params),
    });

    this.logger.log('Navigation agent initialized with 5 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;

    if (!action) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        'Missing required parameter: action',
        startTime,
      );
    }

    try {
      let result: any;

      switch (action) {
        case 'navigateTo':
          result = await this.navigateTo(params);
          break;
        case 'goBack':
          result = await this.goBack(params.steps || 1);
          break;
        case 'goForward':
          result = await this.goForward(params.steps || 1);
          break;
        case 'refresh':
          result = await this.refresh(params.hardRefresh || false);
          break;
        case 'waitForNavigation':
          result = await this.waitForNavigation(params);
          break;
        default:
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown navigation action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Navigation execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.navigationHistory = [];
    this.currentUrl = '';
    this.historyIndex = -1;
    this.logger.log('Navigation agent destroyed, history cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async navigateTo(params: {
    url: string;
    waitUntil?: string;
    timeout?: number;
    referer?: string;
  }): Promise<{
    finalUrl: string;
    statusCode: number;
    redirectChain: string[];
    loadTime: number;
  }> {
    const { url, timeout = 30000, referer } = params;

    // Validate URL
    if (!url || typeof url !== 'string') {
      throw new Error('A valid URL string is required');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error(`Invalid URL format: ${url}`);
    }

    const supportedProtocols = ['http:', 'https:', 'file:'];
    if (!supportedProtocols.includes(parsedUrl.protocol)) {
      throw new Error(`Unsupported protocol: ${parsedUrl.protocol}. Use http, https, or file.`);
    }

    const navigationStart = Date.now();
    const redirectChain: string[] = [];
    let currentRedirectUrl = url;

    // Simulate redirect chain resolution (max 10 redirects)
    const maxRedirects = 10;
    for (let i = 0; i < maxRedirects; i++) {
      const simulatedRedirect = this.simulateRedirectCheck(currentRedirectUrl);
      if (!simulatedRedirect) break;
      redirectChain.push(currentRedirectUrl);
      currentRedirectUrl = simulatedRedirect;
    }

    const finalUrl = currentRedirectUrl;
    const loadTime = Date.now() - navigationStart;

    // Simulate HTTP status code based on URL characteristics
    const statusCode = this.simulateStatusCode(finalUrl);

    // Record in navigation history
    const entry: NavigationEntry = {
      url: finalUrl,
      timestamp: new Date(),
      statusCode,
      redirectChain,
      loadTimeMs: loadTime,
    };

    // Truncate forward history if we navigated after going back
    if (this.historyIndex < this.navigationHistory.length - 1) {
      this.navigationHistory = this.navigationHistory.slice(0, this.historyIndex + 1);
    }

    this.navigationHistory.push(entry);
    this.historyIndex = this.navigationHistory.length - 1;
    this.currentUrl = finalUrl;

    // Store referer in working memory if provided
    if (referer) {
      await this.storeInWorkingMemory('lastReferer', referer, 300000);
    }

    this.logger.log(`Navigated to ${finalUrl} (status: ${statusCode}, load: ${loadTime}ms)`);

    return {
      finalUrl,
      statusCode,
      redirectChain,
      loadTime,
    };
  }

  private async goBack(
    steps: number,
  ): Promise<{ previousUrl: string; currentUrl: string; success: boolean }> {
    if (this.navigationHistory.length === 0) {
      throw new Error('No navigation history available to go back');
    }

    const previousUrl = this.currentUrl;
    const targetIndex = Math.max(0, this.historyIndex - steps);

    if (targetIndex === this.historyIndex) {
      this.logger.warn('Already at the beginning of history, cannot go back further');
      return { previousUrl, currentUrl: this.currentUrl, success: false };
    }

    this.historyIndex = targetIndex;
    this.currentUrl = this.navigationHistory[targetIndex].url;

    this.logger.log(`Went back ${steps} step(s) to ${this.currentUrl}`);

    return {
      previousUrl,
      currentUrl: this.currentUrl,
      success: true,
    };
  }

  private async goForward(
    steps: number,
  ): Promise<{ previousUrl: string; currentUrl: string; success: boolean }> {
    if (this.historyIndex >= this.navigationHistory.length - 1) {
      throw new Error('No forward history available');
    }

    const previousUrl = this.currentUrl;
    const targetIndex = Math.min(this.navigationHistory.length - 1, this.historyIndex + steps);

    if (targetIndex === this.historyIndex) {
      this.logger.warn('Already at the end of history, cannot go forward further');
      return { previousUrl, currentUrl: this.currentUrl, success: false };
    }

    this.historyIndex = targetIndex;
    this.currentUrl = this.navigationHistory[targetIndex].url;

    this.logger.log(`Went forward ${steps} step(s) to ${this.currentUrl}`);

    return {
      previousUrl,
      currentUrl: this.currentUrl,
      success: true,
    };
  }

  private async refresh(
    hardRefresh: boolean,
  ): Promise<{ currentUrl: string; loadTime: number; fromCache: boolean }> {
    if (!this.currentUrl) {
      throw new Error('No current page to refresh');
    }

    const refreshStart = Date.now();
    const fromCache = !hardRefresh;

    // Update the current history entry timestamp
    if (this.historyIndex >= 0 && this.historyIndex < this.navigationHistory.length) {
      this.navigationHistory[this.historyIndex].timestamp = new Date();
      this.navigationHistory[this.historyIndex].loadTimeMs = Date.now() - refreshStart;
    }

    const loadTime = Date.now() - refreshStart;

    this.logger.log(`Refreshed ${this.currentUrl} (hard: ${hardRefresh}, cache: ${fromCache})`);

    return {
      currentUrl: this.currentUrl,
      loadTime,
      fromCache,
    };
  }

  private async waitForNavigation(params: {
    timeout?: number;
    waitUntil?: string;
    urlPattern?: string;
  }): Promise<{ navigated: boolean; finalUrl: string; waitTime: number }> {
    const { timeout = 10000, urlPattern } = params;

    // In a real implementation, this would hook into browser navigation events.
    // Here we simulate by checking current state.
    const waitStart = Date.now();

    // Simulate waiting for navigation
    const simulatedWaitTime = Math.min(timeout, Math.random() * 2000);
    await this.sleep(simulatedWaitTime);

    let navigated = true;

    if (urlPattern) {
      try {
        const regex = new RegExp(urlPattern);
        navigated = regex.test(this.currentUrl);
      } catch {
        navigated = this.currentUrl.includes(urlPattern);
      }
    }

    const waitTime = Date.now() - waitStart;

    return {
      navigated,
      finalUrl: this.currentUrl,
      waitTime,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private simulateRedirectCheck(url: string): string | null {
    // Simulate common redirect patterns
    const parsed = new URL(url);
    // Short URLs often redirect
    if (parsed.hostname.includes('bit.ly') || parsed.hostname.includes('t.co')) {
      return `https://example.com/redirected-from-${parsed.pathname.replace('/', '')}`;
    }
    // HTTP to HTTPS redirect
    if (parsed.protocol === 'http:') {
      return url.replace('http://', 'https://');
    }
    // No redirect
    return null;
  }

  private simulateStatusCode(url: string): number {
    const parsed = new URL(url);
    if (parsed.pathname === '/404') return 404;
    if (parsed.pathname === '/500') return 500;
    if (parsed.pathname === '/403') return 403;
    if (parsed.pathname === '/redirect') return 301;
    return 200;
  }
}
