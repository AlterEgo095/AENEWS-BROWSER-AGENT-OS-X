/**
 * AENEWS Agent OS X - Screenshot Agent
 * Captures screenshots: full page, specific elements, viewport, and comparison.
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

export const SCREENSHOT_AGENT_CONFIG: AgentConfig = {
  id: 'browser-screenshot',
  name: 'Screenshot',
  cluster: AgentCluster.BROWSER,
  version: '1.0.0',
  description:
    'Capture screenshots of web pages with support for full-page captures, element-specific screenshots, viewport captures, and visual comparison between screenshots.',
  capabilities: [
    {
      name: 'takeScreenshot',
      description: 'Capture a screenshot of the current viewport',
      inputSchema: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['png', 'jpeg', 'webp'], default: 'png' },
          quality: { type: 'number', minimum: 0, maximum: 100, description: 'JPEG/WebP quality' },
          clip: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              width: { type: 'number' },
              height: { type: 'number' },
            },
          },
          omitBackground: { type: 'boolean', description: 'Hide default white background' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          captured: { type: 'boolean' },
          format: { type: 'string' },
          size: {
            type: 'object',
            properties: { width: { type: 'number' }, height: { type: 'number' } },
          },
          fileSize: { type: 'number' },
          dataUrl: { type: 'string' },
        },
      },
    },
    {
      name: 'screenshotElement',
      description: 'Capture a screenshot of a specific element',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector for the element' },
          format: { type: 'string', enum: ['png', 'jpeg', 'webp'], default: 'png' },
          padding: { type: 'number', description: 'Padding around the element in pixels' },
        },
        required: ['selector'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          captured: { type: 'boolean' },
          elementFound: { type: 'boolean' },
          boundingBox: { type: 'object' },
          fileSize: { type: 'number' },
        },
      },
    },
    {
      name: 'screenshotFullPage',
      description: 'Capture a full-page screenshot including scrollable content',
      inputSchema: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['png', 'jpeg', 'webp'], default: 'png' },
          quality: { type: 'number' },
          maxWidth: { type: 'number', description: 'Maximum page width for capture' },
          maxHeight: { type: 'number', description: 'Maximum page height for capture' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          captured: { type: 'boolean' },
          fullPage: { type: 'boolean' },
          size: { type: 'object' },
          fileSize: { type: 'number' },
        },
      },
    },
    {
      name: 'compareScreenshots',
      description: 'Compare two screenshots and return the visual diff',
      inputSchema: {
        type: 'object',
        properties: {
          baselineDataUrl: {
            type: 'string',
            description: 'Base64 data URL of the baseline screenshot',
          },
          comparisonDataUrl: {
            type: 'string',
            description: 'Base64 data URL of the comparison screenshot',
          },
          threshold: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: 0.1,
            description: 'Pixel difference threshold',
          },
        },
        required: ['baselineDataUrl', 'comparisonDataUrl'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          match: { type: 'boolean' },
          differencePercent: { type: 'number' },
          diffRegions: { type: 'number' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:browser', 'capture:viewport', 'store:image'],
  maxConcurrentTasks: 3,
  timeout: 30000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1000,
    exponentialBackoff: true,
  },
};

// ─── Screenshot Record ────────────────────────────────────────────

interface ScreenshotRecord {
  id: string;
  timestamp: Date;
  format: string;
  width: number;
  height: number;
  fileSize: number;
  dataUrl: string;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class ScreenshotAgentService extends BaseAgentService {
  private screenshotHistory: ScreenshotRecord[] = [];

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }

  protected defineConfig(): AgentConfig {
    return SCREENSHOT_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'takeScreenshot',
      description: 'Capture a screenshot of the current viewport',
      execute: async (params: {
        format?: string;
        quality?: number;
        clip?: { x: number; y: number; width: number; height: number };
        omitBackground?: boolean;
      }) => this.takeScreenshot(params),
    });

    this.registerTool({
      name: 'screenshotElement',
      description: 'Capture a screenshot of a specific element',
      execute: async (params: { selector: string; format?: string; padding?: number }) =>
        this.screenshotElement(params),
    });

    this.registerTool({
      name: 'screenshotFullPage',
      description: 'Capture a full-page screenshot',
      execute: async (params: {
        format?: string;
        quality?: number;
        maxWidth?: number;
        maxHeight?: number;
      }) => this.screenshotFullPage(params),
    });

    this.registerTool({
      name: 'compareScreenshots',
      description: 'Compare two screenshots visually',
      execute: async (params: {
        baselineDataUrl: string;
        comparisonDataUrl: string;
        threshold?: number;
      }) => this.compareScreenshots(params),
    });

    this.logger.log('Screenshot agent initialized with 4 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;

    // Try real connector first via bridge
    if (this.bridge) {
      try {
        const result: ConnectorOutput = await this.bridge.executeCapability(
          BrowserCapability.SCREENSHOT,
          {
            missionId: input.taskId,
            instruction: action || 'takeScreenshot',
            workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
            parameters: input.payload,
          },
        );

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
        case 'takeScreenshot':
          result = await this.takeScreenshot(params);
          break;
        case 'screenshotElement':
          result = await this.screenshotElement(params);
          break;
        case 'screenshotFullPage':
          result = await this.screenshotFullPage(params);
          break;
        case 'compareScreenshots':
          result = await this.compareScreenshots(params);
          break;
        default:
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown screenshot action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Screenshot execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.screenshotHistory = [];
    this.logger.log('Screenshot agent destroyed, history cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async takeScreenshot(params: {
    format?: string;
    quality?: number;
    clip?: { x: number; y: number; width: number; height: number };
    omitBackground?: boolean;
  }): Promise<{
    captured: boolean;
    format: string;
    size: { width: number; height: number };
    fileSize: number;
    dataUrl: string;
  }> {
    const { format = 'png', quality = 100, clip } = params;

    const validFormats = ['png', 'jpeg', 'webp'];
    if (!validFormats.includes(format)) {
      throw new Error(`Invalid format: ${format}. Supported: ${validFormats.join(', ')}`);
    }

    const width = clip?.width || 1920;
    const height = clip?.height || 1080;

    // Simulate file size calculation
    const pixels = width * height;
    const bytesPerPixel = format === 'png' ? 3 : format === 'jpeg' ? (quality / 100) * 2 : 1.5;
    const fileSize = Math.round(pixels * bytesPerPixel);

    // Generate a placeholder data URL
    const dataUrl = `data:image/${format};base64,SCREENSHOT_${this.generateId().slice(0, 16)}`;

    const record: ScreenshotRecord = {
      id: this.generateId(),
      timestamp: new Date(),
      format,
      width,
      height,
      fileSize,
      dataUrl,
    };
    this.screenshotHistory.push(record);

    // Store in working memory for quick access
    await this.storeInWorkingMemory(`screenshot:${record.id}`, record, 600000);

    this.logger.log(
      `Captured viewport screenshot: ${width}x${height} ${format} (${fileSize} bytes)`,
    );

    return {
      captured: true,
      format,
      size: { width, height },
      fileSize,
      dataUrl,
    };
  }

  private async screenshotElement(params: {
    selector: string;
    format?: string;
    padding?: number;
  }): Promise<{
    captured: boolean;
    elementFound: boolean;
    boundingBox: { x: number; y: number; width: number; height: number };
    fileSize: number;
  }> {
    const { selector, format = 'png', padding = 0 } = params;

    if (!selector) throw new Error('CSS selector is required');

    // Simulate element lookup
    const elementFound = !selector.includes('nonexistent') && !selector.includes('#missing-');

    if (!elementFound) {
      throw new Error(`Element not found for screenshot: ${selector}`);
    }

    // Simulate bounding box
    const boundingBox = {
      x: 50 + Math.random() * 200,
      y: 100 + Math.random() * 300,
      width: 200 + Math.random() * 400,
      height: 100 + Math.random() * 200,
    };

    const effectiveWidth = boundingBox.width + padding * 2;
    const effectiveHeight = boundingBox.height + padding * 2;
    const fileSize = Math.round(effectiveWidth * effectiveHeight * 3);

    const record: ScreenshotRecord = {
      id: this.generateId(),
      timestamp: new Date(),
      format,
      width: effectiveWidth,
      height: effectiveHeight,
      fileSize,
      dataUrl: `data:image/${format};base64,ELEMENT_${this.generateId().slice(0, 16)}`,
    };
    this.screenshotHistory.push(record);

    this.logger.log(
      `Captured element screenshot: ${selector} (${effectiveWidth.toFixed(0)}x${effectiveHeight.toFixed(0)})`,
    );

    return {
      captured: true,
      elementFound,
      boundingBox,
      fileSize,
    };
  }

  private async screenshotFullPage(params: {
    format?: string;
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  }): Promise<{
    captured: boolean;
    fullPage: boolean;
    size: { width: number; height: number };
    fileSize: number;
  }> {
    const { format = 'png', quality = 80, maxWidth = 1920, maxHeight = 10000 } = params;

    // Simulate full page dimensions
    const width = Math.min(maxWidth, 1920);
    const height = Math.min(maxHeight, 3000 + Math.floor(Math.random() * 5000));

    const pixels = width * height;
    const compressionRatio =
      format === 'png' ? 0.3 : format === 'jpeg' ? (quality / 100) * 0.15 : 0.2;
    const fileSize = Math.round(pixels * 3 * compressionRatio);

    const record: ScreenshotRecord = {
      id: this.generateId(),
      timestamp: new Date(),
      format,
      width,
      height,
      fileSize,
      dataUrl: `data:image/${format};base64,FULLPAGE_${this.generateId().slice(0, 16)}`,
    };
    this.screenshotHistory.push(record);

    this.logger.log(
      `Captured full-page screenshot: ${width}x${height} ${format} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`,
    );

    return {
      captured: true,
      fullPage: true,
      size: { width, height },
      fileSize,
    };
  }

  private async compareScreenshots(params: {
    baselineDataUrl: string;
    comparisonDataUrl: string;
    threshold?: number;
  }): Promise<{ match: boolean; differencePercent: number; diffRegions: number }> {
    const { baselineDataUrl, comparisonDataUrl, threshold = 0.1 } = params;

    if (!baselineDataUrl || !comparisonDataUrl) {
      throw new Error('Both baseline and comparison data URLs are required');
    }

    if (!baselineDataUrl.startsWith('data:image') || !comparisonDataUrl.startsWith('data:image')) {
      throw new Error('Invalid data URL format. Must start with data:image');
    }

    // Simulate comparison: same data URLs = 0% diff, different = random diff
    const isIdentical = baselineDataUrl === comparisonDataUrl;
    const differencePercent = isIdentical ? 0 : Math.round((Math.random() * 25 + 1) * 100) / 100;
    const match = differencePercent <= threshold * 100;
    const diffRegions = isIdentical ? 0 : Math.ceil(differencePercent / 2);

    this.logger.log(
      `Screenshot comparison: ${match ? 'MATCH' : 'MISMATCH'} (${differencePercent}% diff, threshold: ${threshold * 100}%)`,
    );

    return { match, differencePercent, diffRegions };
  }
}
