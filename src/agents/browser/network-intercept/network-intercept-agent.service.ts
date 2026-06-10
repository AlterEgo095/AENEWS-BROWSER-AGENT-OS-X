/**
 * AENEWS Agent OS X - Network Intercept Agent
 * Intercepts and modifies network requests: mock responses, block requests, modify headers, log network activity.
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

export const NETWORK_INTERCEPT_AGENT_CONFIG: AgentConfig = {
  id: 'browser-network-intercept',
  name: 'NetworkIntercept',
  cluster: AgentCluster.BROWSER,
  version: '1.0.0',
  description:
    'Intercept, modify, and mock network requests in the browser. Supports request interception, response mocking, request blocking, header modification, and network activity logging for testing and debugging.',
  capabilities: [
    {
      name: 'interceptRequest',
      description: 'Intercept network requests matching a URL pattern',
      inputSchema: {
        type: 'object',
        properties: {
          urlPattern: { type: 'string', description: 'URL pattern or regex to match' },
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY'] },
          action: {
            type: 'string',
            enum: ['continue', 'modify', 'abort', 'respond'],
            default: 'continue',
          },
          modifications: { type: 'object', description: 'Modifications to apply to the request' },
        },
        required: ['urlPattern'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          interceptId: { type: 'string' },
          active: { type: 'boolean' },
          matchedRequests: { type: 'number' },
        },
      },
    },
    {
      name: 'mockResponse',
      description: 'Mock a network response for requests matching a pattern',
      inputSchema: {
        type: 'object',
        properties: {
          urlPattern: { type: 'string' },
          status: { type: 'number', default: 200 },
          headers: { type: 'object' },
          body: { type: 'string' },
          contentType: { type: 'string', default: 'application/json' },
          delay: { type: 'number', description: 'Simulated response delay in ms' },
        },
        required: ['urlPattern', 'body'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          mockId: { type: 'string' },
          active: { type: 'boolean' },
          urlPattern: { type: 'string' },
        },
      },
    },
    {
      name: 'blockRequest',
      description: 'Block network requests matching a URL pattern or resource type',
      inputSchema: {
        type: 'object',
        properties: {
          urlPattern: { type: 'string' },
          resourceType: {
            type: 'string',
            enum: [
              'image',
              'stylesheet',
              'script',
              'font',
              'media',
              'xhr',
              'fetch',
              'websocket',
              'document',
            ],
          },
          reason: { type: 'string' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          blocked: { type: 'boolean' },
          blockId: { type: 'string' },
          urlPattern: { type: 'string' },
        },
      },
    },
    {
      name: 'modifyHeaders',
      description: 'Modify request or response headers for matching requests',
      inputSchema: {
        type: 'object',
        properties: {
          urlPattern: { type: 'string' },
          requestHeaders: { type: 'object', description: 'Headers to add/modify on requests' },
          responseHeaders: { type: 'object', description: 'Headers to add/modify on responses' },
          removeRequestHeaders: { type: 'array', items: { type: 'string' } },
          removeResponseHeaders: { type: 'array', items: { type: 'string' } },
        },
        required: ['urlPattern'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          modificationId: { type: 'string' },
          active: { type: 'boolean' },
        },
      },
    },
    {
      name: 'getNetworkLog',
      description: 'Get the log of all intercepted network activity',
      inputSchema: {
        type: 'object',
        properties: {
          filter: { type: 'string', enum: ['all', 'blocked', 'modified', 'mocked', 'failed'] },
          urlPattern: { type: 'string' },
          limit: { type: 'number', default: 50 },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          entries: { type: 'array' },
          count: { type: 'number' },
          totalRequests: { type: 'number' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:browser',
    'write:browser',
    'intercept:network',
    'modify:requests',
    'mock:responses',
  ],
  maxConcurrentTasks: 5,
  timeout: 15000,
  retryPolicy: {
    maxRetries: 1,
    backoffMs: 500,
    exponentialBackoff: false,
  },
};

// ─── Network Types ────────────────────────────────────────────────

interface InterceptRule {
  id: string;
  urlPattern: string;
  method: string;
  action: string;
  modifications?: Record<string, any>;
  active: boolean;
  matchedCount: number;
  createdAt: Date;
}

interface MockResponse {
  id: string;
  urlPattern: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  contentType: string;
  delay: number;
  active: boolean;
  servedCount: number;
  createdAt: Date;
}

interface BlockRule {
  id: string;
  urlPattern?: string;
  resourceType?: string;
  reason: string;
  active: boolean;
  blockedCount: number;
  createdAt: Date;
}

interface HeaderModification {
  id: string;
  urlPattern: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  removeRequestHeaders: string[];
  removeResponseHeaders: string[];
  active: boolean;
  appliedCount: number;
  createdAt: Date;
}

interface NetworkLogEntry {
  id: string;
  url: string;
  method: string;
  resourceType: string;
  status: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  timing: { start: number; end: number; duration: number };
  blocked: boolean;
  modified: boolean;
  mocked: boolean;
  timestamp: Date;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class NetworkInterceptAgentService extends BaseAgentService {
  private interceptRules: Map<string, InterceptRule> = new Map();
  private mockResponses: Map<string, MockResponse> = new Map();
  private blockRules: Map<string, BlockRule> = new Map();
  private headerModifications: Map<string, HeaderModification> = new Map();
  private networkLog: NetworkLogEntry[] = [];

  protected defineConfig(): AgentConfig {
    return NETWORK_INTERCEPT_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'interceptRequest',
      description: 'Intercept network requests matching a pattern',
      execute: async (params: {
        urlPattern: string;
        method?: string;
        action?: string;
        modifications?: Record<string, any>;
      }) => this.interceptRequest(params),
    });

    this.registerTool({
      name: 'mockResponse',
      description: 'Mock a network response',
      execute: async (params: {
        urlPattern: string;
        status?: number;
        headers?: Record<string, string>;
        body: string;
        contentType?: string;
        delay?: number;
      }) => this.mockResponse(params),
    });

    this.registerTool({
      name: 'blockRequest',
      description: 'Block network requests',
      execute: async (params: { urlPattern?: string; resourceType?: string; reason?: string }) =>
        this.blockRequest(params),
    });

    this.registerTool({
      name: 'modifyHeaders',
      description: 'Modify request/response headers',
      execute: async (params: {
        urlPattern: string;
        requestHeaders?: Record<string, string>;
        responseHeaders?: Record<string, string>;
        removeRequestHeaders?: string[];
        removeResponseHeaders?: string[];
      }) => this.modifyHeaders(params),
    });

    this.registerTool({
      name: 'getNetworkLog',
      description: 'Get network activity log',
      execute: async (params: { filter?: string; urlPattern?: string; limit?: number }) =>
        this.getNetworkLog(params),
    });

    this.logger.log('NetworkIntercept agent initialized with 5 tools');
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
        case 'interceptRequest':
          result = await this.interceptRequest(params);
          break;
        case 'mockResponse':
          result = await this.mockResponse(params);
          break;
        case 'blockRequest':
          result = await this.blockRequest(params);
          break;
        case 'modifyHeaders':
          result = await this.modifyHeaders(params);
          break;
        case 'getNetworkLog':
          result = await this.getNetworkLog(params);
          break;
        default:
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown network action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`NetworkIntercept execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.interceptRules.clear();
    this.mockResponses.clear();
    this.blockRules.clear();
    this.headerModifications.clear();
    this.networkLog = [];
    this.logger.log('NetworkIntercept agent destroyed, all rules and logs cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async interceptRequest(params: {
    urlPattern: string;
    method?: string;
    action?: string;
    modifications?: Record<string, any>;
  }): Promise<{ interceptId: string; active: boolean; matchedRequests: number }> {
    const { urlPattern, method = 'ANY', action = 'continue', modifications } = params;

    if (!urlPattern) throw new Error('URL pattern is required');

    // Validate URL pattern
    try {
      new RegExp(urlPattern);
    } catch {
      // Not a regex, try as a plain string match
      if (!urlPattern.includes('*') && !urlPattern.startsWith('http')) {
        throw new Error(`Invalid URL pattern: ${urlPattern}`);
      }
    }

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY'];
    if (!validMethods.includes(method.toUpperCase())) {
      throw new Error(`Invalid method: ${method}`);
    }

    const validActions = ['continue', 'modify', 'abort', 'respond'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`);
    }

    const id = this.generateId();
    const rule: InterceptRule = {
      id,
      urlPattern,
      method: method.toUpperCase(),
      action,
      modifications,
      active: true,
      matchedCount: 0,
      createdAt: new Date(),
    };

    this.interceptRules.set(id, rule);

    this.logger.log(`Intercept rule created: ${urlPattern} (${method}) -> ${action}`);

    return { interceptId: id, active: true, matchedRequests: 0 };
  }

  private async mockResponse(params: {
    urlPattern: string;
    status?: number;
    headers?: Record<string, string>;
    body: string;
    contentType?: string;
    delay?: number;
  }): Promise<{ mockId: string; active: boolean; urlPattern: string }> {
    const {
      urlPattern,
      status = 200,
      headers = {},
      body,
      contentType = 'application/json',
      delay = 0,
    } = params;

    if (!urlPattern) throw new Error('URL pattern is required');
    if (body === undefined || body === null) throw new Error('Response body is required');

    // Validate status code
    if (status < 100 || status > 599) {
      throw new Error(`Invalid HTTP status code: ${status}`);
    }

    const id = this.generateId();
    const mock: MockResponse = {
      id,
      urlPattern,
      status,
      headers,
      body,
      contentType,
      delay,
      active: true,
      servedCount: 0,
      createdAt: new Date(),
    };

    this.mockResponses.set(id, mock);

    // Add a simulated network log entry
    this.networkLog.push({
      id: this.generateId(),
      url: urlPattern,
      method: 'GET',
      resourceType: 'xhr',
      status,
      requestHeaders: {},
      responseHeaders: { 'Content-Type': contentType, ...headers },
      timing: { start: Date.now(), end: Date.now() + delay, duration: delay },
      blocked: false,
      modified: false,
      mocked: true,
      timestamp: new Date(),
    });

    this.logger.log(`Mock response set: ${urlPattern} -> ${status} (${contentType})`);

    return { mockId: id, active: true, urlPattern };
  }

  private async blockRequest(params: {
    urlPattern?: string;
    resourceType?: string;
    reason?: string;
  }): Promise<{ blocked: boolean; blockId: string; urlPattern: string }> {
    const { urlPattern, resourceType, reason = 'Blocked by agent' } = params;

    if (!urlPattern && !resourceType) {
      throw new Error('Either urlPattern or resourceType must be provided');
    }

    const validResourceTypes = [
      'image',
      'stylesheet',
      'script',
      'font',
      'media',
      'xhr',
      'fetch',
      'websocket',
      'document',
    ];
    if (resourceType && !validResourceTypes.includes(resourceType)) {
      throw new Error(`Invalid resource type: ${resourceType}`);
    }

    const id = this.generateId();
    const rule: BlockRule = {
      id,
      urlPattern,
      resourceType,
      reason,
      active: true,
      blockedCount: 0,
      createdAt: new Date(),
    };

    this.blockRules.set(id, rule);

    this.logger.log(`Block rule created: ${urlPattern || resourceType} (${reason})`);

    return {
      blocked: true,
      blockId: id,
      urlPattern: urlPattern || resourceType || '*',
    };
  }

  private async modifyHeaders(params: {
    urlPattern: string;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    removeRequestHeaders?: string[];
    removeResponseHeaders?: string[];
  }): Promise<{ modificationId: string; active: boolean }> {
    const {
      urlPattern,
      requestHeaders = {},
      responseHeaders = {},
      removeRequestHeaders = [],
      removeResponseHeaders = [],
    } = params;

    if (!urlPattern) throw new Error('URL pattern is required');

    if (
      Object.keys(requestHeaders).length === 0 &&
      Object.keys(responseHeaders).length === 0 &&
      removeRequestHeaders.length === 0 &&
      removeResponseHeaders.length === 0
    ) {
      throw new Error('At least one header modification must be specified');
    }

    const id = this.generateId();
    const modification: HeaderModification = {
      id,
      urlPattern,
      requestHeaders,
      responseHeaders,
      removeRequestHeaders,
      removeResponseHeaders,
      active: true,
      appliedCount: 0,
      createdAt: new Date(),
    };

    this.headerModifications.set(id, modification);

    const changes = [
      Object.keys(requestHeaders).length > 0
        ? `${Object.keys(requestHeaders).length} request header(s)`
        : '',
      Object.keys(responseHeaders).length > 0
        ? `${Object.keys(responseHeaders).length} response header(s)`
        : '',
      removeRequestHeaders.length > 0
        ? `remove ${removeRequestHeaders.length} request header(s)`
        : '',
      removeResponseHeaders.length > 0
        ? `remove ${removeResponseHeaders.length} response header(s)`
        : '',
    ]
      .filter(Boolean)
      .join(', ');

    this.logger.log(`Header modification set for ${urlPattern}: ${changes}`);

    return { modificationId: id, active: true };
  }

  private async getNetworkLog(params: {
    filter?: string;
    urlPattern?: string;
    limit?: number;
  }): Promise<{ entries: NetworkLogEntry[]; count: number; totalRequests: number }> {
    const { filter = 'all', urlPattern, limit = 50 } = params;

    let entries = [...this.networkLog];

    // Apply filter
    switch (filter) {
      case 'blocked':
        entries = entries.filter((e) => e.blocked);
        break;
      case 'modified':
        entries = entries.filter((e) => e.modified);
        break;
      case 'mocked':
        entries = entries.filter((e) => e.mocked);
        break;
      case 'failed':
        entries = entries.filter((e) => e.status >= 400);
        break;
    }

    // Apply URL pattern filter
    if (urlPattern) {
      try {
        const regex = new RegExp(urlPattern);
        entries = entries.filter((e) => regex.test(e.url));
      } catch {
        entries = entries.filter((e) => e.url.includes(urlPattern));
      }
    }

    // Sort by most recent first
    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const totalRequests = entries.length;
    entries = entries.slice(0, limit);

    this.logger.log(`Network log: ${entries.length}/${totalRequests} entries (filter: ${filter})`);

    return { entries, count: entries.length, totalRequests };
  }
}
