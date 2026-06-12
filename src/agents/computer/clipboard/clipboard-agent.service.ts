/**
 * AENEWS Agent OS X - Clipboard Agent
 * Read/write clipboard content, monitor clipboard changes.
 * Simulates clipboard operations for environments without direct OS clipboard access.
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

export const CLIPBOARD_AGENT_CONFIG: AgentConfig = {
  id: 'computer-clipboard',
  name: 'Clipboard',
  cluster: AgentCluster.COMPUTER,
  version: '1.0.0',
  description:
    'Read and write clipboard content, monitor clipboard changes over time. Supports text, HTML, and file reference clipboard formats with change detection and history tracking.',
  capabilities: [
    {
      name: 'readClipboard',
      description: 'Read the current content of the system clipboard',
      inputSchema: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['text', 'html', 'files'],
            default: 'text',
            description: 'Desired clipboard format to read',
          },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          format: { type: 'string' },
          length: { type: 'number' },
          readAt: { type: 'string' },
        },
      },
    },
    {
      name: 'writeClipboard',
      description: 'Write content to the system clipboard',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Content to write to clipboard' },
          format: {
            type: 'string',
            enum: ['text', 'html', 'files'],
            default: 'text',
            description: 'Content format',
          },
          clearBefore: {
            type: 'boolean',
            default: true,
            description: 'Clear clipboard before writing',
          },
        },
        required: ['content'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          written: { type: 'boolean' },
          format: { type: 'string' },
          length: { type: 'number' },
          writtenAt: { type: 'string' },
        },
      },
    },
    {
      name: 'clearClipboard',
      description: 'Clear all content from the system clipboard',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      outputSchema: {
        type: 'object',
        properties: {
          cleared: { type: 'boolean' },
          previousLength: { type: 'number' },
          clearedAt: { type: 'string' },
        },
      },
    },
    {
      name: 'watchClipboard',
      description: 'Monitor clipboard for changes over a specified duration',
      inputSchema: {
        type: 'object',
        properties: {
          duration: { type: 'number', default: 30000, description: 'Watch duration in ms' },
          interval: { type: 'number', default: 500, description: 'Polling interval in ms' },
          maxChanges: { type: 'number', default: 100, description: 'Max changes to record' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          changes: { type: 'array' },
          totalChanges: { type: 'number' },
          watchedDuration: { type: 'number' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:clipboard',
    'write:clipboard',
    'clear:clipboard',
    'monitor:clipboard',
  ],
  maxConcurrentTasks: 5,
  timeout: 30000,
  retryPolicy: {
    maxRetries: 1,
    backoffMs: 500,
    exponentialBackoff: true,
  },
};

// ─── Clipboard Types ──────────────────────────────────────────────

type ClipboardFormat = 'text' | 'html' | 'files';

interface ClipboardContent {
  content: string;
  format: ClipboardFormat;
  length: number;
  updatedAt: Date;
}

interface ClipboardChange {
  changeIndex: number;
  previousContent: string;
  newContent: string;
  previousFormat: ClipboardFormat;
  newFormat: ClipboardFormat;
  detectedAt: string;
  timeSinceLastChange: number;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class ClipboardAgentService extends BaseAgentService {
  private clipboardContent: ClipboardContent = {
    content: '',
    format: 'text',
    length: 0,
    updatedAt: new Date(),
  };

  private changeHistory: Array<{
    content: string;
    format: ClipboardFormat;
    timestamp: Date;
  }> = [];

  private isWatching = false;

  protected defineConfig(): AgentConfig {
    return CLIPBOARD_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    // Register tools
    this.registerTool({
      name: 'readClipboard',
      description: 'Read the current clipboard content',
      execute: async (params: { format?: ClipboardFormat }) =>
        this.readClipboard(params.format || 'text'),
    });

    this.registerTool({
      name: 'writeClipboard',
      description: 'Write content to the clipboard',
      execute: async (params: {
        content: string;
        format?: ClipboardFormat;
        clearBefore?: boolean;
      }) =>
        this.writeClipboard(params.content, params.format || 'text', params.clearBefore !== false),
    });

    this.registerTool({
      name: 'clearClipboard',
      description: 'Clear the clipboard',
      execute: async () => this.clearClipboard(),
    });

    this.registerTool({
      name: 'watchClipboard',
      description: 'Monitor clipboard for changes',
      execute: async (params: { duration?: number; interval?: number; maxChanges?: number }) =>
        this.watchClipboard(params.duration, params.interval, params.maxChanges),
    });

    await this.storeInWorkingMemory('clip:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('Clipboard agent initialized with 4 tools');
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

    const supportedActions = [
      'readClipboard',
      'writeClipboard',
      'clearClipboard',
      'watchClipboard',
    ];

    if (!supportedActions.includes(action)) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown clipboard action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    }

    try {
      const tool = this.getTool(action);
      if (!tool) {
        return this.createAgentOutput(
          input.taskId,
          false,
          null,
          `Tool not found: ${action}`,
          startTime,
        );
      }

      const result = await tool.execute(params);
      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Clipboard execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.isWatching = false;
    this.clipboardContent = {
      content: '',
      format: 'text',
      length: 0,
      updatedAt: new Date(),
    };
    this.changeHistory = [];
    this.logger.log('Clipboard agent destroyed, state cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async readClipboard(format: ClipboardFormat = 'text'): Promise<{
    content: string;
    format: ClipboardFormat;
    length: number;
    readAt: string;
  }> {
    // If the requested format doesn't match current, try conversion
    let content = this.clipboardContent.content;
    const currentFormat = this.clipboardContent.format;

    if (format === 'html' && currentFormat === 'text') {
      // Convert text to simple HTML
      content = `<p>${content.replace(/\n/g, '</p>\n<p>')}</p>`;
    } else if (format === 'text' && currentFormat === 'html') {
      // Strip HTML tags for plain text
      content = content.replace(/<[^>]*>/g, '').trim();
    } else if (format === 'files' && currentFormat !== 'files') {
      content = ''; // No file references available
    }

    this.logger.log(`Read clipboard: ${this.clipboardContent.length} chars, format: ${format}`);
    return {
      content,
      format,
      length: content.length,
      readAt: new Date().toISOString(),
    };
  }

  private async writeClipboard(
    content: string,
    format: ClipboardFormat = 'text',
    clearBefore: boolean = true,
  ): Promise<{
    written: boolean;
    format: ClipboardFormat;
    length: number;
    writtenAt: string;
  }> {
    if (content === undefined || content === null) {
      throw new Error('Content is required for writing to clipboard');
    }

    const contentStr = String(content);

    if (clearBefore) {
      this.clipboardContent.content = '';
    }

    // Record previous state for change history
    if (this.clipboardContent.content !== contentStr) {
      this.changeHistory.push({
        content: this.clipboardContent.content,
        format: this.clipboardContent.format,
        timestamp: new Date(),
      });

      // Keep history manageable
      if (this.changeHistory.length > 200) {
        this.changeHistory = this.changeHistory.slice(-100);
      }
    }

    this.clipboardContent = {
      content: contentStr,
      format,
      length: contentStr.length,
      updatedAt: new Date(),
    };

    await this.storeInWorkingMemory(
      'clip:lastWrite',
      { content: contentStr.substring(0, 500), format, length: contentStr.length },
      300000,
    );

    this.logger.log(`Wrote to clipboard: ${contentStr.length} chars, format: ${format}`);
    return {
      written: true,
      format,
      length: contentStr.length,
      writtenAt: new Date().toISOString(),
    };
  }

  private async clearClipboard(): Promise<{
    cleared: boolean;
    previousLength: number;
    clearedAt: string;
  }> {
    const previousLength = this.clipboardContent.length;

    // Record in history before clearing
    if (this.clipboardContent.content) {
      this.changeHistory.push({
        content: this.clipboardContent.content,
        format: this.clipboardContent.format,
        timestamp: new Date(),
      });
    }

    this.clipboardContent = {
      content: '',
      format: 'text',
      length: 0,
      updatedAt: new Date(),
    };

    this.logger.log(`Cleared clipboard (was ${previousLength} chars)`);
    return {
      cleared: true,
      previousLength,
      clearedAt: new Date().toISOString(),
    };
  }

  private async watchClipboard(
    duration: number = 30000,
    interval: number = 500,
    maxChanges: number = 100,
  ): Promise<{
    changes: ClipboardChange[];
    totalChanges: number;
    watchedDuration: number;
  }> {
    if (this.isWatching) {
      throw new Error('Clipboard watch is already in progress');
    }

    this.isWatching = true;
    const changes: ClipboardChange[] = [];
    const watchStart = Date.now();
    let lastContent = this.clipboardContent.content;
    let lastFormat = this.clipboardContent.format;
    let lastChangeTime = watchStart;

    // Simulated watch loop (compressed for simulation)
    const checkCount = Math.min(Math.floor(duration / interval), 60); // Cap at 60 checks
    const effectiveInterval = Math.min(interval, 100); // Compressed interval

    for (let i = 0; i < checkCount; i++) {
      if (!this.isWatching) break;
      if (changes.length >= maxChanges) break;

      await this.sleep(effectiveInterval);

      // Simulate occasional clipboard changes from external sources
      if (Math.random() < 0.05 && i > 2) {
        const simulatedContent = `Simulated clipboard change #${changes.length + 1} at ${new Date().toISOString()}`;
        const simulatedFormat: ClipboardFormat = Math.random() > 0.8 ? 'html' : 'text';

        const change: ClipboardChange = {
          changeIndex: changes.length + 1,
          previousContent: lastContent.substring(0, 200),
          newContent: simulatedContent,
          previousFormat: lastFormat,
          newFormat: simulatedFormat,
          detectedAt: new Date().toISOString(),
          timeSinceLastChange: Date.now() - lastChangeTime,
        };

        changes.push(change);
        lastContent = simulatedContent;
        lastFormat = simulatedFormat;
        lastChangeTime = Date.now();
      }

      // Check if actual clipboard changed
      if (this.clipboardContent.content !== lastContent) {
        const change: ClipboardChange = {
          changeIndex: changes.length + 1,
          previousContent: lastContent.substring(0, 200),
          newContent: this.clipboardContent.content.substring(0, 200),
          previousFormat: lastFormat,
          newFormat: this.clipboardContent.format,
          detectedAt: new Date().toISOString(),
          timeSinceLastChange: Date.now() - lastChangeTime,
        };

        changes.push(change);
        lastContent = this.clipboardContent.content;
        lastFormat = this.clipboardContent.format;
        lastChangeTime = Date.now();
      }
    }

    this.isWatching = false;
    const watchedDuration = Date.now() - watchStart;

    this.logger.log(`Clipboard watch completed: ${changes.length} changes in ${watchedDuration}ms`);
    return {
      changes,
      totalChanges: changes.length,
      watchedDuration,
    };
  }
}
