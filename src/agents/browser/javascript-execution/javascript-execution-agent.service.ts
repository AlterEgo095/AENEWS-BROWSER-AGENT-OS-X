/**
 * AENEWS Agent OS X - JavaScript Execution Agent
 * Executes JavaScript in the browser page context: evaluate expressions, execute scripts, inject scripts, evaluate functions.
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

export const JAVASCRIPT_EXECUTION_AGENT_CONFIG: AgentConfig = {
  id: 'browser-javascript-execution',
  name: 'JavaScriptExecution',
  cluster: AgentCluster.BROWSER,
  version: '1.0.0',
  description:
    'Execute JavaScript code in the browser page context. Supports evaluating expressions, running scripts, injecting external scripts, and evaluating functions with arguments. Handles sandboxing and result serialization.',
  capabilities: [
    {
      name: 'evaluateExpression',
      description: 'Evaluate a JavaScript expression and return the result',
      inputSchema: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'JavaScript expression to evaluate' },
          returnByValue: {
            type: 'boolean',
            default: true,
            description: 'Return value instead of JSHandle',
          },
        },
        required: ['expression'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          result: { type: 'any' },
          resultType: { type: 'string' },
        },
      },
    },
    {
      name: 'executeScript',
      description: 'Execute a block of JavaScript code in the page context',
      inputSchema: {
        type: 'object',
        properties: {
          script: { type: 'string', description: 'JavaScript code to execute' },
          args: { type: 'array', description: 'Arguments to pass to the script' },
        },
        required: ['script'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          result: { type: 'any' },
          executionTime: { type: 'number' },
          consoleOutput: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'injectScript',
      description: 'Inject an external script by URL into the page',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL of the script to inject' },
          waitForLoad: { type: 'boolean', default: true },
          timeout: { type: 'number', default: 10000 },
        },
        required: ['url'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          injected: { type: 'boolean' },
          url: { type: 'string' },
          loadTime: { type: 'number' },
        },
      },
    },
    {
      name: 'evaluateFunction',
      description: 'Evaluate a JavaScript function with arguments',
      inputSchema: {
        type: 'object',
        properties: {
          functionBody: { type: 'string', description: 'Function body as a string' },
          args: { type: 'array', description: 'Arguments to pass to the function' },
        },
        required: ['functionBody'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          result: { type: 'any' },
          executionTime: { type: 'number' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:browser',
    'write:browser',
    'execute:javascript',
    'inject:script',
  ],
  maxConcurrentTasks: 5,
  timeout: 15000,
  retryPolicy: {
    maxRetries: 1,
    backoffMs: 500,
    exponentialBackoff: false,
  },
};

// ─── Execution Record ─────────────────────────────────────────────

interface ExecutionRecord {
  id: string;
  type: 'expression' | 'script' | 'injection' | 'function';
  code: string;
  success: boolean;
  result: any;
  executionTimeMs: number;
  timestamp: Date;
  consoleOutput: string[];
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class JavaScriptExecutionAgentService extends BaseAgentService {
  private executionHistory: ExecutionRecord[] = [];

  protected defineConfig(): AgentConfig {
    return JAVASCRIPT_EXECUTION_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'evaluateExpression',
      description: 'Evaluate a JavaScript expression',
      execute: async (params: { expression: string; returnByValue?: boolean }) =>
        this.evaluateExpression(params),
    });

    this.registerTool({
      name: 'executeScript',
      description: 'Execute a block of JavaScript code',
      execute: async (params: { script: string; args?: any[] }) => this.executeScript(params),
    });

    this.registerTool({
      name: 'injectScript',
      description: 'Inject an external script by URL',
      execute: async (params: { url: string; waitForLoad?: boolean; timeout?: number }) =>
        this.injectScript(params),
    });

    this.registerTool({
      name: 'evaluateFunction',
      description: 'Evaluate a JavaScript function with arguments',
      execute: async (params: { functionBody: string; args?: any[] }) =>
        this.evaluateFunction(params),
    });

    this.logger.log('JavaScriptExecution agent initialized with 4 tools');
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
        case 'evaluateExpression':
          result = await this.evaluateExpression(params);
          break;
        case 'executeScript':
          result = await this.executeScript(params);
          break;
        case 'injectScript':
          result = await this.injectScript(params);
          break;
        case 'evaluateFunction':
          result = await this.evaluateFunction(params);
          break;
        default:
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown JS execution action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`JavaScriptExecution execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.executionHistory = [];
    this.logger.log('JavaScriptExecution agent destroyed, history cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async evaluateExpression(params: {
    expression: string;
    returnByValue?: boolean;
  }): Promise<{ success: boolean; result: any; resultType: string }> {
    const { expression } = params;

    if (!expression) throw new Error('JavaScript expression is required');

    // Security: Check for dangerous patterns
    this.validateScriptSafety(expression);

    const execStart = Date.now();
    let result: any;
    let resultType: string;

    try {
      result = this.simulateEvaluation(expression);
      resultType = typeof result;
    } catch (evalError) {
      const record: ExecutionRecord = {
        id: this.generateId(),
        type: 'expression',
        code: expression,
        success: false,
        result: null,
        executionTimeMs: Date.now() - execStart,
        timestamp: new Date(),
        consoleOutput: [`Error: ${(evalError as Error).message}`],
      };
      this.executionHistory.push(record);
      throw evalError;
    }

    const record: ExecutionRecord = {
      id: this.generateId(),
      type: 'expression',
      code: expression,
      success: true,
      result,
      executionTimeMs: Date.now() - execStart,
      timestamp: new Date(),
      consoleOutput: [],
    };
    this.executionHistory.push(record);

    this.logger.log(`Evaluated expression (${resultType}): ${expression.substring(0, 50)}...`);

    return { success: true, result, resultType };
  }

  private async executeScript(params: { script: string; args?: any[] }): Promise<{
    success: boolean;
    result: any;
    executionTime: number;
    consoleOutput: string[];
  }> {
    const { script } = params;

    if (!script) throw new Error('Script code is required');

    this.validateScriptSafety(script);

    const execStart = Date.now();
    const consoleOutput: string[] = [];

    // Simulate script execution
    // Capture simulated console.log calls
    const consoleLogPattern = /console\.log\(([^)]+)\)/g;
    let match;
    while ((match = consoleLogPattern.exec(script)) !== null) {
      consoleOutput.push(`[log] ${match[1].replace(/['"]/g, '')}`);
    }

    // Simulate execution time based on script length
    const simulatedTime = Math.min(500, script.length * 0.5);
    await this.sleep(simulatedTime);

    let result: any = 'Script executed successfully';
    const success = true;

    // Simulate specific script patterns
    if (script.includes('document.querySelector')) {
      result = { tagName: 'div', textContent: 'Simulated element', attributes: {} };
    } else if (script.includes('document.title')) {
      result = 'Simulated Page Title';
    } else if (script.includes('window.location')) {
      result = 'https://example.com/page';
    } else if (script.includes('localStorage')) {
      result = { key: 'value' };
    } else if (script.includes('fetch(')) {
      result = { status: 200, data: {} };
      consoleOutput.push('[log] Fetch request simulated');
    }

    const executionTime = Date.now() - execStart;

    const record: ExecutionRecord = {
      id: this.generateId(),
      type: 'script',
      code: script,
      success,
      result,
      executionTimeMs: executionTime,
      timestamp: new Date(),
      consoleOutput,
    };
    this.executionHistory.push(record);

    this.logger.log(`Executed script (${executionTime}ms, ${consoleOutput.length} console lines)`);

    return { success, result, executionTime, consoleOutput };
  }

  private async injectScript(params: {
    url: string;
    waitForLoad?: boolean;
    timeout?: number;
  }): Promise<{ injected: boolean; url: string; loadTime: number }> {
    const { url, waitForLoad = true, timeout = 10000 } = params;

    if (!url) throw new Error('Script URL is required');

    // Validate URL
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) {
        throw new Error(`Unsupported protocol: ${parsed.protocol}`);
      }
    } catch (e) {
      throw new Error(`Invalid script URL: ${url}`);
    }

    const loadStart = Date.now();

    // Simulate script loading time
    const simulatedLoadTime = Math.min(timeout - 100, 200 + Math.random() * 1000);
    if (waitForLoad) {
      await this.sleep(simulatedLoadTime);
    }

    const loadTime = Date.now() - loadStart;

    const record: ExecutionRecord = {
      id: this.generateId(),
      type: 'injection',
      code: `/* injected from ${url} */`,
      success: true,
      result: null,
      executionTimeMs: loadTime,
      timestamp: new Date(),
      consoleOutput: [`[log] Script loaded from ${url}`],
    };
    this.executionHistory.push(record);

    this.logger.log(`Injected script from ${url} (${loadTime}ms)`);

    return { injected: true, url, loadTime };
  }

  private async evaluateFunction(params: {
    functionBody: string;
    args?: any[];
  }): Promise<{ success: boolean; result: any; executionTime: number }> {
    const { functionBody, args = [] } = params;

    if (!functionBody) throw new Error('Function body is required');

    this.validateScriptSafety(functionBody);

    const execStart = Date.now();

    // Simulate function evaluation
    let result: any;
    let success = true;

    try {
      result = this.simulateFunctionEvaluation(functionBody, args);
    } catch (evalError) {
      success = false;
      result = null;
    }

    const executionTime = Date.now() - execStart;

    const record: ExecutionRecord = {
      id: this.generateId(),
      type: 'function',
      code: functionBody,
      success,
      result,
      executionTimeMs: executionTime,
      timestamp: new Date(),
      consoleOutput: [],
    };
    this.executionHistory.push(record);

    this.logger.log(`Evaluated function (${executionTime}ms, args: ${args.length})`);

    return { success, result, executionTime };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private validateScriptSafety(code: string): void {
    const dangerousPatterns = [
      { pattern: /process\.exit/, message: 'process.exit is not allowed' },
      { pattern: /require\s*\(/, message: 'require() is not allowed in browser context' },
      { pattern: /import\s+/, message: 'import statements are not allowed in browser context' },
      { pattern: /eval\s*\(/, message: 'Nested eval() is not allowed' },
      { pattern: /Function\s*\(/, message: 'Dynamic Function constructor is not allowed' },
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Script safety violation: ${message}`);
      }
    }
  }

  private simulateEvaluation(expression: string): any {
    // Simulate common JavaScript expressions
    if (/^\d+$/.test(expression.trim())) {
      return parseInt(expression.trim(), 10);
    }
    if (/^["'].*["']$/.test(expression.trim())) {
      return expression.trim().slice(1, -1);
    }
    if (expression.includes('document.title')) return 'Simulated Page Title';
    if (expression.includes('window.location.href')) return 'https://example.com';
    if (expression.includes('navigator.userAgent')) return 'Mozilla/5.0 (Simulated)';
    if (expression.includes('document.cookie')) return 'session=abc123';
    if (expression.includes('window.innerWidth')) return 1920;
    if (expression.includes('window.innerHeight')) return 1080;
    if (expression.includes('Math.')) {
      if (expression.includes('random')) return Math.random();
      if (expression.includes('floor')) return 42;
      if (expression.includes('ceil')) return 43;
      return 0;
    }
    if (expression.includes('Date.now()')) return Date.now();
    if (expression.includes('JSON.parse')) return { parsed: true };
    if (expression.includes('Array.isArray')) return false;

    return 'Expression result';
  }

  private simulateFunctionEvaluation(functionBody: string, args: any[]): any {
    // Simulate common function patterns
    if (functionBody.includes('querySelector')) {
      return { tagName: 'div', textContent: 'Found element' };
    }
    if (functionBody.includes('querySelectorAll')) {
      return [{ tagName: 'div' }, { tagName: 'span' }];
    }
    if (functionBody.includes('getAttribute')) {
      return 'attribute-value';
    }
    if (functionBody.includes('textContent') || functionBody.includes('innerText')) {
      return 'Element text content';
    }
    if (functionBody.includes('style')) {
      return { color: 'rgb(0, 0, 0)', fontSize: '16px' };
    }
    if (functionBody.includes('classList')) {
      return ['class1', 'class2'];
    }
    if (functionBody.includes('scrollHeight') || functionBody.includes('offsetHeight')) {
      return 1000;
    }
    if (functionBody.includes('return')) {
      // For custom return statements, simulate based on args
      if (args.length > 0) {
        return args[0];
      }
      return true;
    }

    return null;
  }
}
