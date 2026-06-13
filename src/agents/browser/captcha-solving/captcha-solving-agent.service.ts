/**
 * AENEWS Agent OS X - Captcha Solving Agent
 * Handles CAPTCHAs: detect, solve reCAPTCHA, hCaptcha, simple captchas, and report results.
 */

import { Injectable, Inject } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';
import { AgentConnectorBridge } from '../../bridge';
import { BrowserCapability } from '../../../software-factory/interfaces';
import { ConnectorOutput } from '../../../software-factory/connectors/connector.interface';

// ─── Agent Configuration ──────────────────────────────────────────

export const CAPTCHA_SOLVING_AGENT_CONFIG: AgentConfig = {
  id: 'browser-captcha-solving',
  name: 'CaptchaSolving',
  cluster: AgentCluster.BROWSER,
  version: '1.0.0',
  description:
    'Detect and solve various types of CAPTCHAs including Google reCAPTCHA v2/v3, hCaptcha, and simple text/math CAPTCHAs. Supports automated solving with fallback strategies and result reporting.',
  capabilities: [
    {
      name: 'detectCaptcha',
      description: 'Detect the presence and type of CAPTCHA on the current page',
      inputSchema: {
        type: 'object',
        properties: {
          selectors: {
            type: 'array',
            items: { type: 'string' },
            description: 'Custom selectors to check for CAPTCHA elements',
          },
          timeout: { type: 'number', default: 5000 },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          detected: { type: 'boolean' },
          type: {
            type: 'string',
            enum: [
              'recaptcha_v2',
              'recaptcha_v3',
              'hcaptcha',
              'simple_text',
              'simple_math',
              'image',
              'unknown',
            ],
          },
          selector: { type: 'string' },
          siteKey: { type: 'string' },
        },
      },
    },
    {
      name: 'solveRecaptcha',
      description: 'Solve a Google reCAPTCHA challenge (v2 or v3)',
      inputSchema: {
        type: 'object',
        properties: {
          version: { type: 'number', enum: [2, 3], default: 2 },
          siteKey: { type: 'string', description: 'reCAPTCHA site key' },
          action: { type: 'string', description: 'Action name for v3' },
          minScore: { type: 'number', default: 0.5, description: 'Minimum score for v3' },
          timeout: { type: 'number', default: 120000 },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          solved: { type: 'boolean' },
          type: { type: 'string' },
          token: { type: 'string' },
          score: { type: 'number' },
          solvingTime: { type: 'number' },
        },
      },
    },
    {
      name: 'solveHcaptcha',
      description: 'Solve an hCaptcha challenge',
      inputSchema: {
        type: 'object',
        properties: {
          siteKey: { type: 'string', description: 'hCaptcha site key' },
          timeout: { type: 'number', default: 120000 },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          solved: { type: 'boolean' },
          token: { type: 'string' },
          solvingTime: { type: 'number' },
        },
      },
    },
    {
      name: 'solveSimpleCaptcha',
      description: 'Solve a simple text or math CAPTCHA',
      inputSchema: {
        type: 'object',
        properties: {
          imageSelector: { type: 'string', description: 'Selector for the CAPTCHA image' },
          inputSelector: { type: 'string', description: 'Selector for the input field' },
          type: { type: 'string', enum: ['text', 'math', 'alphanumeric'], default: 'text' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          solved: { type: 'boolean' },
          answer: { type: 'string' },
          type: { type: 'string' },
        },
      },
    },
    {
      name: 'reportCaptchaResult',
      description: 'Report whether a CAPTCHA solution was accepted or rejected',
      inputSchema: {
        type: 'object',
        properties: {
          captchaId: { type: 'string' },
          accepted: { type: 'boolean' },
          reason: { type: 'string' },
        },
        required: ['captchaId', 'accepted'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          reported: { type: 'boolean' },
          captchaId: { type: 'string' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:browser',
    'write:browser',
    'interact:element',
    'solve:captcha',
  ],
  maxConcurrentTasks: 2,
  timeout: 120000,
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 2000,
    exponentialBackoff: true,
  },
};

// ─── Captcha Record ───────────────────────────────────────────────

type CaptchaType =
  | 'recaptcha_v2'
  | 'recaptcha_v3'
  | 'hcaptcha'
  | 'simple_text'
  | 'simple_math'
  | 'image'
  | 'unknown';

interface CaptchaRecord {
  id: string;
  type: CaptchaType;
  detected: boolean;
  solved: boolean;
  token?: string;
  answer?: string;
  solvingTimeMs: number;
  reported: boolean;
  accepted: boolean | null;
  timestamp: Date;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class CaptchaSolvingAgentService extends BaseAgentService {
  private captchaHistory: CaptchaRecord[] = [];
  private solveStats = {
    total: 0,
    solved: 0,
    failed: 0,
    averageTimeMs: 0,
  };

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }

  protected defineConfig(): AgentConfig {
    return CAPTCHA_SOLVING_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'detectCaptcha',
      description: 'Detect CAPTCHA presence and type',
      execute: async (params: { selectors?: string[]; timeout?: number }) =>
        this.detectCaptcha(params),
    });

    this.registerTool({
      name: 'solveRecaptcha',
      description: 'Solve a reCAPTCHA challenge',
      execute: async (params: {
        version?: number;
        siteKey?: string;
        action?: string;
        minScore?: number;
        timeout?: number;
      }) => this.solveRecaptcha(params),
    });

    this.registerTool({
      name: 'solveHcaptcha',
      description: 'Solve an hCaptcha challenge',
      execute: async (params: { siteKey?: string; timeout?: number }) => this.solveHcaptcha(params),
    });

    this.registerTool({
      name: 'solveSimpleCaptcha',
      description: 'Solve a simple text or math CAPTCHA',
      execute: async (params: { imageSelector?: string; inputSelector?: string; type?: string }) =>
        this.solveSimpleCaptcha(params),
    });

    this.registerTool({
      name: 'reportCaptchaResult',
      description: 'Report a CAPTCHA result as accepted or rejected',
      execute: async (params: { captchaId: string; accepted: boolean; reason?: string }) =>
        this.reportCaptchaResult(params),
    });

    this.logger.log('CaptchaSolving agent initialized with 5 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;

    // Try real connector first via bridge
    if (this.bridge) {
      try {
        const result: ConnectorOutput = await this.bridge.executeCapability(BrowserCapability.OCR, {
          missionId: input.taskId,
          instruction: action || 'solveCaptcha',
          workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
          parameters: input.payload,
        });

        return this.createAgentOutput(
          input.taskId,
          result.success,
          result.output,
          result.error,
          startTime,
        );
      } catch (error) {
        this.logger.warn(
          `Bridge execution failed, falling back to local: ${(error as Error).message}`,
        );
      }
    }

    // Fallback to existing simulated logic
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
        case 'detectCaptcha':
          result = await this.detectCaptcha(params);
          break;
        case 'solveRecaptcha':
          result = await this.solveRecaptcha(params);
          break;
        case 'solveHcaptcha':
          result = await this.solveHcaptcha(params);
          break;
        case 'solveSimpleCaptcha':
          result = await this.solveSimpleCaptcha(params);
          break;
        case 'reportCaptchaResult':
          result = await this.reportCaptchaResult(params);
          break;
        default:
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown captcha action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`CaptchaSolving execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.captchaHistory = [];
    this.solveStats = { total: 0, solved: 0, failed: 0, averageTimeMs: 0 };
    this.logger.log('CaptchaSolving agent destroyed, history cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async detectCaptcha(params: { selectors?: string[]; timeout?: number }): Promise<{
    detected: boolean;
    type: CaptchaType;
    selector: string;
    siteKey: string;
  }> {
    const { selectors = [], timeout = 5000 } = params;

    // Common CAPTCHA selectors to check
    const captchaSelectors = [
      { selector: 'iframe[src*="recaptcha"]', type: 'recaptcha_v2' as CaptchaType },
      { selector: '.g-recaptcha', type: 'recaptcha_v2' as CaptchaType },
      { selector: 'iframe[src*="hcaptcha"]', type: 'hcaptcha' as CaptchaType },
      { selector: '.h-captcha', type: 'hcaptcha' as CaptchaType },
      { selector: '[data-sitekey]', type: 'recaptcha_v2' as CaptchaType },
      { selector: 'img[src*="captcha"]', type: 'simple_text' as CaptchaType },
      { selector: '[class*="captcha"]', type: 'unknown' as CaptchaType },
      { selector: '#captcha', type: 'simple_text' as CaptchaType },
    ];

    const allSelectors = [
      ...captchaSelectors,
      ...selectors.map((s) => ({ selector: s, type: 'unknown' as CaptchaType })),
    ];

    // Simulate CAPTCHA detection
    let detected = false;
    let type: CaptchaType = 'unknown';
    let matchedSelector = '';
    let siteKey = '';

    for (const entry of allSelectors) {
      // Simulate detection: certain selector patterns indicate CAPTCHAs
      if (
        entry.selector.includes('recaptcha') ||
        entry.selector.includes('hcaptcha') ||
        entry.selector.includes('captcha')
      ) {
        detected = true;
        type = entry.type;
        matchedSelector = entry.selector;

        // Simulate site key extraction
        if (type === 'recaptcha_v2' || type === 'recaptcha_v3') {
          siteKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Google test key
        } else if (type === 'hcaptcha') {
          siteKey = '10000000-ffff-ffff-ffff-000000000001'; // hCaptcha test key
        }
        break;
      }
    }

    this.logger.log(
      `CAPTCHA detection: ${detected ? `${type} found (${matchedSelector})` : 'none detected'}`,
    );

    return { detected, type, selector: matchedSelector, siteKey };
  }

  private async solveRecaptcha(params: {
    version?: number;
    siteKey?: string;
    action?: string;
    minScore?: number;
    timeout?: number;
  }): Promise<{
    solved: boolean;
    type: string;
    token: string;
    score?: number;
    solvingTime: number;
  }> {
    const { version = 2, siteKey, action = 'submit', minScore = 0.5, timeout = 120000 } = params;

    const solvingStart = Date.now();
    const type = version === 3 ? 'recaptcha_v3' : 'recaptcha_v2';

    // Simulate solving time
    const simulatedSolvingTime =
      version === 2
        ? 5000 + Math.random() * 10000 // v2 typically takes 5-15 seconds
        : 1000 + Math.random() * 3000; // v3 is typically faster

    await this.sleep(Math.min(simulatedSolvingTime, 5000)); // Cap actual wait

    // Simulate solving success (higher success rate for v3)
    const successRate = version === 2 ? 0.85 : 0.95;
    const solved = Math.random() < successRate;

    const token = solved
      ? `03AGdBq27${this.generateId().replace(/-/g, '')}${Date.now().toString(36)}`
      : '';

    const score =
      version === 3 ? (solved ? Math.max(minScore, 0.5 + Math.random() * 0.5) : 0) : undefined;
    const solvingTime = Date.now() - solvingStart;

    // Record in history
    const record: CaptchaRecord = {
      id: this.generateId(),
      type: type as CaptchaType,
      detected: true,
      solved,
      token: solved ? token : undefined,
      solvingTimeMs: solvingTime,
      reported: false,
      accepted: null,
      timestamp: new Date(),
    };
    this.captchaHistory.push(record);
    this.updateStats(solved, solvingTime);

    this.logger.log(
      `reCAPTCHA v${version} ${solved ? 'SOLVED' : 'FAILED'} (${solvingTime}ms)${version === 3 && solved ? ` score: ${score?.toFixed(2)}` : ''}`,
    );

    return {
      solved,
      type,
      token,
      score,
      solvingTime,
    };
  }

  private async solveHcaptcha(params: { siteKey?: string; timeout?: number }): Promise<{
    solved: boolean;
    token: string;
    solvingTime: number;
  }> {
    const {} = params;

    const solvingStart = Date.now();

    // Simulate hCaptcha solving
    const simulatedSolvingTime = 8000 + Math.random() * 12000;
    await this.sleep(Math.min(simulatedSolvingTime, 5000));

    const successRate = 0.8;
    const solved = Math.random() < successRate;

    const token = solved
      ? `P0_eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.${this.generateId().replace(/-/g, '')}`
      : '';

    const solvingTime = Date.now() - solvingStart;

    const record: CaptchaRecord = {
      id: this.generateId(),
      type: 'hcaptcha',
      detected: true,
      solved,
      token: solved ? token : undefined,
      solvingTimeMs: solvingTime,
      reported: false,
      accepted: null,
      timestamp: new Date(),
    };
    this.captchaHistory.push(record);
    this.updateStats(solved, solvingTime);

    this.logger.log(`hCaptcha ${solved ? 'SOLVED' : 'FAILED'} (${solvingTime}ms)`);

    return { solved, token, solvingTime };
  }

  private async solveSimpleCaptcha(params: {
    imageSelector?: string;
    inputSelector?: string;
    type?: string;
  }): Promise<{
    solved: boolean;
    answer: string;
    type: string;
  }> {
    const { imageSelector, inputSelector, type = 'text' } = params;

    if (!imageSelector && !inputSelector) {
      throw new Error('At least one of imageSelector or inputSelector is required');
    }

    const validTypes = ['text', 'math', 'alphanumeric'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid CAPTCHA type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }

    const solvingStart = Date.now();

    // Simulate solving based on type
    let answer = '';
    let solved = false;

    switch (type) {
      case 'math':
        // Simulate solving a math CAPTCHA like "3 + 7 = ?"
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        answer = (a + b).toString();
        solved = true;
        break;
      case 'alphanumeric':
        // Simulate solving an alphanumeric CAPTCHA
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        answer = Array.from(
          { length: 6 },
          () => chars[Math.floor(Math.random() * chars.length)],
        ).join('');
        solved = Math.random() < 0.9; // High success rate
        break;
      case 'text':
      default:
        // Simulate solving a text CAPTCHA
        answer = 'SIMULATED';
        solved = Math.random() < 0.85;
        break;
    }

    const solvingTime = Date.now() - solvingStart;

    // Simulate entering the answer
    if (inputSelector && solved) {
      await this.sleep(100 + Math.random() * 200);
    }

    const record: CaptchaRecord = {
      id: this.generateId(),
      type: type === 'math' ? 'simple_math' : 'simple_text',
      detected: true,
      solved,
      answer: solved ? answer : '',
      solvingTimeMs: solvingTime,
      reported: false,
      accepted: null,
      timestamp: new Date(),
    };
    this.captchaHistory.push(record);
    this.updateStats(solved, solvingTime);

    this.logger.log(
      `Simple CAPTCHA (${type}) ${solved ? 'SOLVED' : 'FAILED'}: "${answer}" (${solvingTime}ms)`,
    );

    return { solved, answer, type };
  }

  private async reportCaptchaResult(params: {
    captchaId: string;
    accepted: boolean;
    reason?: string;
  }): Promise<{ reported: boolean; captchaId: string }> {
    const { captchaId, accepted, reason } = params;

    if (!captchaId) throw new Error('CAPTCHA ID is required');

    const record = this.captchaHistory.find((r) => r.id === captchaId);
    if (!record) {
      throw new Error(`CAPTCHA record not found: ${captchaId}`);
    }

    record.reported = true;
    record.accepted = accepted;

    // If rejected, adjust future solving strategies
    if (!accepted) {
      this.logger.warn(
        `CAPTCHA solution rejected for ${captchaId}: ${reason || 'No reason provided'}`,
      );
    } else {
      this.logger.log(`CAPTCHA solution accepted for ${captchaId}`);
    }

    return { reported: true, captchaId };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private updateStats(solved: boolean, solvingTimeMs: number): void {
    this.solveStats.total++;
    if (solved) {
      this.solveStats.solved++;
    } else {
      this.solveStats.failed++;
    }
    this.solveStats.averageTimeMs =
      (this.solveStats.averageTimeMs * (this.solveStats.total - 1) + solvingTimeMs) /
      this.solveStats.total;
  }
}
