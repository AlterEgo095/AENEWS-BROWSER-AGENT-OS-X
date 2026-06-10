/**
 * AENEWS Agent OS X - Tab Management Agent
 * Manages browser tabs: open, close, switch, list, and wait for tabs.
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

export const TAB_MANAGEMENT_AGENT_CONFIG: AgentConfig = {
  id: 'browser-tab-management',
  name: 'TabManagement',
  cluster: AgentCluster.BROWSER,
  version: '1.0.0',
  description:
    'Manage browser tabs including opening new tabs, closing tabs, switching between tabs, listing all open tabs, and waiting for new tabs to appear.',
  capabilities: [
    {
      name: 'openTab',
      description: 'Open a new browser tab and optionally navigate to a URL',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to open in the new tab' },
          active: {
            type: 'boolean',
            default: true,
            description: 'Whether to switch to the new tab',
          },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          tabId: { type: 'string' },
          url: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
    },
    {
      name: 'closeTab',
      description: 'Close a specific tab or the current tab',
      inputSchema: {
        type: 'object',
        properties: {
          tabId: { type: 'string', description: 'Tab ID to close (defaults to current)' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          closed: { type: 'boolean' },
          closedTabId: { type: 'string' },
          remainingTabs: { type: 'number' },
        },
      },
    },
    {
      name: 'switchTab',
      description: 'Switch to a different tab by ID, index, or URL pattern',
      inputSchema: {
        type: 'object',
        properties: {
          tabId: { type: 'string' },
          index: { type: 'number' },
          urlPattern: { type: 'string' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          switched: { type: 'boolean' },
          tabId: { type: 'string' },
          url: { type: 'string' },
        },
      },
    },
    {
      name: 'getTabList',
      description: 'Get a list of all open tabs with their details',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      outputSchema: {
        type: 'object',
        properties: {
          tabs: { type: 'array' },
          count: { type: 'number' },
          activeTabId: { type: 'string' },
        },
      },
    },
    {
      name: 'waitForTab',
      description: 'Wait for a new tab to open matching criteria',
      inputSchema: {
        type: 'object',
        properties: {
          urlPattern: { type: 'string' },
          timeout: { type: 'number', default: 10000 },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          found: { type: 'boolean' },
          tabId: { type: 'string' },
          url: { type: 'string' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:browser', 'write:browser', 'manage:tabs'],
  maxConcurrentTasks: 5,
  timeout: 15000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 500,
    exponentialBackoff: true,
  },
};

// ─── Tab State ────────────────────────────────────────────────────

interface TabInfo {
  tabId: string;
  url: string;
  title: string;
  active: boolean;
  openedAt: Date;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class TabManagementAgentService extends BaseAgentService {
  private tabs: Map<string, TabInfo> = new Map();
  private activeTabId: string | null = null;

  protected defineConfig(): AgentConfig {
    return TAB_MANAGEMENT_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    // Initialize with a default tab
    const defaultTabId = this.generateId();
    this.tabs.set(defaultTabId, {
      tabId: defaultTabId,
      url: 'about:blank',
      title: 'New Tab',
      active: true,
      openedAt: new Date(),
    });
    this.activeTabId = defaultTabId;

    this.registerTool({
      name: 'openTab',
      description: 'Open a new browser tab',
      execute: async (params: { url?: string; active?: boolean }) =>
        this.openTab(params.url, params.active),
    });

    this.registerTool({
      name: 'closeTab',
      description: 'Close a browser tab',
      execute: async (params: { tabId?: string }) => this.closeTab(params.tabId),
    });

    this.registerTool({
      name: 'switchTab',
      description: 'Switch to a different tab',
      execute: async (params: { tabId?: string; index?: number; urlPattern?: string }) =>
        this.switchTab(params),
    });

    this.registerTool({
      name: 'getTabList',
      description: 'List all open tabs',
      execute: async () => this.getTabList(),
    });

    this.registerTool({
      name: 'waitForTab',
      description: 'Wait for a new tab to appear',
      execute: async (params: { urlPattern?: string; timeout?: number }) => this.waitForTab(params),
    });

    this.logger.log('TabManagement agent initialized with 5 tools and default tab');
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
        case 'openTab':
          result = await this.openTab(params.url, params.active);
          break;
        case 'closeTab':
          result = await this.closeTab(params.tabId);
          break;
        case 'switchTab':
          result = await this.switchTab(params);
          break;
        case 'getTabList':
          result = await this.getTabList();
          break;
        case 'waitForTab':
          result = await this.waitForTab(params);
          break;
        default:
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown tab action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`TabManagement execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.tabs.clear();
    this.activeTabId = null;
    this.logger.log('TabManagement agent destroyed, all tabs closed');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async openTab(
    url?: string,
    active: boolean = true,
  ): Promise<{ tabId: string; url: string; isActive: boolean }> {
    const tabId = this.generateId();
    const tabUrl = url || 'about:blank';

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        throw new Error(`Invalid URL: ${url}`);
      }
    }

    // Deactivate current tab if making new one active
    if (active && this.activeTabId) {
      const currentTab = this.tabs.get(this.activeTabId);
      if (currentTab) {
        currentTab.active = false;
      }
    }

    const title = url ? new URL(url).hostname : 'New Tab';
    const tab: TabInfo = {
      tabId,
      url: tabUrl,
      title,
      active,
      openedAt: new Date(),
    };

    this.tabs.set(tabId, tab);
    if (active) {
      this.activeTabId = tabId;
    }

    this.logger.log(`Opened tab ${tabId} (${tabUrl}) - ${active ? 'active' : 'background'}`);

    return { tabId, url: tabUrl, isActive: active };
  }

  private async closeTab(tabId?: string): Promise<{
    closed: boolean;
    closedTabId: string;
    remainingTabs: number;
  }> {
    const targetId = tabId || this.activeTabId;

    if (!targetId) {
      throw new Error('No tab to close');
    }

    const tab = this.tabs.get(targetId);
    if (!tab) {
      throw new Error(`Tab not found: ${targetId}`);
    }

    if (this.tabs.size <= 1) {
      throw new Error('Cannot close the last remaining tab');
    }

    this.tabs.delete(targetId);

    // If the closed tab was active, switch to the most recent remaining tab
    const closedTabId = targetId;
    if (this.activeTabId === targetId) {
      const remainingTabs = Array.from(this.tabs.values());
      const newActive = remainingTabs[remainingTabs.length - 1];
      if (newActive) {
        newActive.active = true;
        this.activeTabId = newActive.tabId;
      }
    }

    this.logger.log(`Closed tab ${closedTabId}, ${this.tabs.size} remaining`);

    return {
      closed: true,
      closedTabId,
      remainingTabs: this.tabs.size,
    };
  }

  private async switchTab(params: {
    tabId?: string;
    index?: number;
    urlPattern?: string;
  }): Promise<{ switched: boolean; tabId: string; url: string }> {
    const { tabId, index, urlPattern } = params;

    if (!tabId && index === undefined && !urlPattern) {
      throw new Error('One of tabId, index, or urlPattern is required');
    }

    let targetTab: TabInfo | undefined;

    if (tabId) {
      targetTab = this.tabs.get(tabId);
      if (!targetTab) {
        throw new Error(`Tab not found: ${tabId}`);
      }
    } else if (index !== undefined) {
      const tabList = Array.from(this.tabs.values());
      if (index < 0 || index >= tabList.length) {
        throw new Error(`Tab index ${index} out of range (0-${tabList.length - 1})`);
      }
      targetTab = tabList[index];
    } else if (urlPattern) {
      try {
        const regex = new RegExp(urlPattern);
        targetTab = Array.from(this.tabs.values()).find((t) => regex.test(t.url));
      } catch {
        targetTab = Array.from(this.tabs.values()).find((t) => t.url.includes(urlPattern!));
      }
      if (!targetTab) {
        throw new Error(`No tab found matching pattern: ${urlPattern}`);
      }
    }

    if (!targetTab) {
      throw new Error('Target tab not found');
    }

    // Deactivate current tab
    if (this.activeTabId) {
      const current = this.tabs.get(this.activeTabId);
      if (current) current.active = false;
    }

    targetTab.active = true;
    this.activeTabId = targetTab.tabId;

    this.logger.log(`Switched to tab ${targetTab.tabId} (${targetTab.url})`);

    return {
      switched: true,
      tabId: targetTab.tabId,
      url: targetTab.url,
    };
  }

  private async getTabList(_params?: Record<string, unknown>): Promise<{
    tabs: TabInfo[];
    count: number;
    activeTabId: string | null;
  }> {
    const tabs = Array.from(this.tabs.values());

    this.logger.log(`Listed ${tabs.length} open tab(s)`);

    return {
      tabs,
      count: tabs.length,
      activeTabId: this.activeTabId,
    };
  }

  private async waitForTab(params: {
    urlPattern?: string;
    timeout?: number;
  }): Promise<{ found: boolean; tabId: string; url: string }> {
    const { urlPattern, timeout = 10000 } = params;

    const waitStart = Date.now();

    // Simulate waiting for a tab to appear
    // In real implementation, this would listen for tab creation events
    const simulatedWait = Math.min(timeout, Math.random() * 2000);
    await this.sleep(simulatedWait);

    // Check if any existing tab matches
    if (urlPattern) {
      try {
        const regex = new RegExp(urlPattern);
        const match = Array.from(this.tabs.values()).find((t) => regex.test(t.url));
        if (match) {
          return { found: true, tabId: match.tabId, url: match.url };
        }
      } catch {
        const match = Array.from(this.tabs.values()).find((t) => t.url.includes(urlPattern));
        if (match) {
          return { found: true, tabId: match.tabId, url: match.url };
        }
      }
    }

    const waitTime = Date.now() - waitStart;
    this.logger.log(
      `Wait for tab: ${urlPattern ? `matching "${urlPattern}"` : 'any new tab'} - ${waitTime}ms elapsed`,
    );

    return { found: false, tabId: '', url: '' };
  }
}
