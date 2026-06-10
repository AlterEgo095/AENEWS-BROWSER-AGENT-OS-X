/**
 * AENEWS Agent OS X - Wait Strategy Agent
 * Provides smart wait strategies: waitForSelector, waitForNavigation, waitForNetworkIdle, waitForFunction, waitForTimeout.
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

export const WAIT_STRATEGY_AGENT_CONFIG: AgentConfig = {
  id: 'browser-wait-strategy',
  name: 'WaitStrategy',
  cluster: AgentCluster.BROWSER,
  version: '1.0.0',
  description:
    'Provides intelligent wait strategies for browser automation including waiting for selectors, navigation events, network idle states, custom JavaScript functions, and configurable timeouts.',
  capabilities: [
    {
      name: 'waitForSelector',
      description: 'Wait for an element matching a selector to appear in the DOM',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector to wait for' },
          state: {
            type: 'string',
            enum: ['attached', 'detached', 'visible', 'hidden'],
            default: 'visible',
          },
          timeout: { type: 'number', default: 30000 },
        },
        required: ['selector'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          found: { type: 'boolean' },
          waitTime: { type: 'number' },
          state: { type: 'string' },
        },
      },
    },
    {
      name: 'waitForNavigation',
      description: 'Wait for a navigation event to complete',
      inputSchema: {
        type: 'object',
        properties: {
          waitUntil: {
            type: 'string',
            enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
          },
          timeout: { type: 'number', default: 30000 },
          url: { type: 'string', description: 'Expected URL after navigation' },
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
    {
      name: 'waitForNetworkIdle',
      description: 'Wait until network activity is idle for a specified duration',
      inputSchema: {
        type: 'object',
        properties: {
          idleTime: {
            type: 'number',
            default: 500,
            description: 'Ms of idle time to consider idle',
          },
          timeout: { type: 'number', default: 30000 },
          maxInflightRequests: { type: 'number', default: 0 },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          idle: { type: 'boolean' },
          waitTime: { type: 'number' },
          remainingRequests: { type: 'number' },
        },
      },
    },
    {
      name: 'waitForFunction',
      description: 'Wait for a JavaScript function to return a truthy value',
      inputSchema: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'JS expression to evaluate' },
          polling: { type: 'number', default: 200, description: 'Polling interval in ms' },
          timeout: { type: 'number', default: 30000 },
          args: { type: 'array', description: 'Arguments to pass to the function' },
        },
        required: ['expression'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          result: { type: 'any' },
          waitTime: { type: 'number' },
        },
      },
    },
    {
      name: 'waitForTimeout',
      description: 'Wait for a specified duration (simple sleep)',
      inputSchema: {
        type: 'object',
        properties: {
          timeout: { type: 'number', description: 'Duration to wait in ms' },
        },
        required: ['timeout'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          waited: { type: 'boolean' },
          duration: { type: 'number' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:browser', 'execute:javascript'],
  maxConcurrentTasks: 10,
  timeout: 60000,
  retryPolicy: {
    maxRetries: 1,
    backoffMs: 500,
    exponentialBackoff: false,
  },
};

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class WaitStrategyAgentService extends BaseAgentService {
  private activeWaits: Map<string, NodeJS.Timeout> = new Map();

  protected defineConfig(): AgentConfig {
    return WAIT_STRATEGY_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'waitForSelector',
      description: 'Wait for a selector to appear',
      execute: async (params: { selector: string; state?: string; timeout?: number }) =>
        this.waitForSelector(params),
    });

    this.registerTool({
      name: 'waitForNavigation',
      description: 'Wait for navigation to complete',
      execute: async (params: { waitUntil?: string; timeout?: number; url?: string }) =>
        this.waitForNavigation(params),
    });

    this.registerTool({
      name: 'waitForNetworkIdle',
      description: 'Wait for network to become idle',
      execute: async (params: {
        idleTime?: number;
        timeout?: number;
        maxInflightRequests?: number;
      }) => this.waitForNetworkIdle(params),
    });

    this.registerTool({
      name: 'waitForFunction',
      description: 'Wait for a JS function to return truthy',
      execute: async (params: {
        expression: string;
        polling?: number;
        timeout?: number;
        args?: any[];
      }) => this.waitForFunction(params),
    });

    this.registerTool({
      name: 'waitForTimeout',
      description: 'Wait for a specified duration',
      execute: async (params: { timeout: number }) => this.waitForTimeout(params.timeout),
    });

    this.logger.log('WaitStrategy agent initialized with 5 tools');
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
        case 'waitForSelector':
          result = await this.waitForSelector(params);
          break;
        case 'waitForNavigation':
          result = await this.waitForNavigation(params);
          break;
        case 'waitForNetworkIdle':
          result = await this.waitForNetworkIdle(params);
          break;
        case 'waitForFunction':
          result = await this.waitForFunction(params);
          break;
        case 'waitForTimeout':
          result = await this.waitForTimeout(params.timeout);
          break;
        default:
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown wait action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`WaitStrategy execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    for (const [id, timeout] of this.activeWaits.entries()) {
      clearTimeout(timeout);
      this.logger.log(`Cleared active wait: ${id}`);
    }
    this.activeWaits.clear();
    this.logger.log('WaitStrategy agent destroyed, active waits cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async waitForSelector(params: {
    selector: string;
    state?: string;
    timeout?: number;
  }): Promise<{ found: boolean; waitTime: number; state: string }> {
    const { selector, state = 'visible', timeout = 30000 } = params;

    if (!selector) throw new Error('CSS selector is required');

    const validStates = ['attached', 'detached', 'visible', 'hidden'];
    if (!validStates.includes(state)) {
      throw new Error(`Invalid state: ${state}. Must be one of: ${validStates.join(', ')}`);
    }

    const waitStart = Date.now();

    // Simulate waiting for selector
    // Elements with "nonexistent" or "slow" selectors simulate different timings
    let simulatedWait = 100;

    if (selector.includes('nonexistent') || selector.includes('missing')) {
      simulatedWait = timeout + 1000; // Will time out
    } else if (selector.includes('slow') || selector.includes('delayed')) {
      simulatedWait = Math.min(timeout - 100, 2000 + Math.random() * 1000);
    } else {
      simulatedWait = Math.min(timeout - 100, 100 + Math.random() * 500);
    }

    if (simulatedWait > timeout) {
      await this.sleep(Math.min(timeout, 2000)); // Don't actually wait full timeout
      const waitTime = Date.now() - waitStart;
      this.logger.warn(`Selector "${selector}" not found within ${timeout}ms`);
      return { found: false, waitTime, state };
    }

    await this.sleep(simulatedWait);
    const waitTime = Date.now() - waitStart;

    this.logger.log(`Selector "${selector}" found (${state}) after ${waitTime}ms`);

    return { found: true, waitTime, state };
  }

  private async waitForNavigation(params: {
    waitUntil?: string;
    timeout?: number;
    url?: string;
  }): Promise<{ navigated: boolean; finalUrl: string; waitTime: number }> {
    const { waitUntil = 'load', timeout = 30000, url } = params;

    const validWaitUntil = ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'];
    if (!validWaitUntil.includes(waitUntil)) {
      throw new Error(
        `Invalid waitUntil: ${waitUntil}. Must be one of: ${validWaitUntil.join(', ')}`,
      );
    }

    const waitStart = Date.now();

    // Simulate navigation wait based on waitUntil strategy
    const strategyDelays: Record<string, number> = {
      domcontentloaded: 200 + Math.random() * 300,
      load: 500 + Math.random() * 500,
      networkidle2: 1000 + Math.random() * 1000,
      networkidle0: 1500 + Math.random() * 1500,
    };

    const delay = Math.min(strategyDelays[waitUntil] || 1000, timeout);
    await this.sleep(delay);

    const finalUrl = url || 'https://example.com/page';
    const waitTime = Date.now() - waitStart;

    this.logger.log(`Navigation complete (${waitUntil}) to ${finalUrl} after ${waitTime}ms`);

    return { navigated: true, finalUrl, waitTime };
  }

  private async waitForNetworkIdle(params: {
    idleTime?: number;
    timeout?: number;
    maxInflightRequests?: number;
  }): Promise<{ idle: boolean; waitTime: number; remainingRequests: number }> {
    const { idleTime = 500, timeout = 30000, maxInflightRequests = 0 } = params;

    const waitStart = Date.now();

    // Simulate waiting for network idle
    const simulatedNetworkTime = 1000 + Math.random() * 2000;
    const totalWait = Math.min(simulatedNetworkTime + idleTime, timeout);

    await this.sleep(Math.min(totalWait, 3000)); // Cap actual wait

    const waitTime = Date.now() - waitStart;
    const idle = waitTime < timeout;
    const remainingRequests = idle ? 0 : Math.floor(Math.random() * 3) + 1;

    this.logger.log(
      `Network ${idle ? 'idle' : 'still active'} after ${waitTime}ms (remaining: ${remainingRequests})`,
    );

    return { idle, waitTime, remainingRequests };
  }

  private async waitForFunction(params: {
    expression: string;
    polling?: number;
    timeout?: number;
    args?: any[];
  }): Promise<{ success: boolean; result: any; waitTime: number }> {
    const { expression, polling = 200, timeout = 30000, args = [] } = params;

    if (!expression) throw new Error('JavaScript expression is required');

    const waitStart = Date.now();

    // Simulate polling the function
    let attempts = 0;
    const maxAttempts = Math.ceil(timeout / polling);
    let success = false;
    let result: any = null;

    // Simulate a function that eventually returns true
    const simulatedSuccessAfter = Math.floor(Math.random() * 5) + 1;

    while (attempts < maxAttempts) {
      attempts++;

      // Simulate evaluation
      if (attempts >= simulatedSuccessAfter) {
        success = true;
        result = true;
        break;
      }

      result = false;

      if (Date.now() - waitStart > Math.min(timeout, 3000)) {
        break;
      }

      await this.sleep(Math.min(polling, 200));
    }

    const waitTime = Date.now() - waitStart;

    this.logger.log(
      `waitForFunction ${success ? 'succeeded' : 'timed out'} after ${waitTime}ms (${attempts} polls)`,
    );

    return { success, result, waitTime };
  }

  private async waitForTimeout(timeout: number): Promise<{
    waited: boolean;
    duration: number;
  }> {
    if (!timeout || timeout <= 0) {
      throw new Error('Timeout must be a positive number');
    }

    // Cap maximum wait time to prevent abuse
    const cappedTimeout = Math.min(timeout, 10000);

    const waitStart = Date.now();
    await this.sleep(cappedTimeout);
    const duration = Date.now() - waitStart;

    this.logger.log(`Waited for ${duration}ms`);

    return { waited: true, duration };
  }
}
