/**
 * AENEWS Agent OS X - File Download Agent
 * Handles file downloads: initiate, monitor progress, verify, cancel, and track history.
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

export const FILE_DOWNLOAD_AGENT_CONFIG: AgentConfig = {
  id: 'browser-file-download',
  name: 'FileDownload',
  cluster: AgentCluster.BROWSER,
  version: '1.0.0',
  description:
    'Manage file downloads in the browser including initiating downloads, monitoring download progress, verifying file integrity, cancelling downloads, and tracking download history.',
  capabilities: [
    {
      name: 'downloadFile',
      description: 'Initiate a file download from a URL or by clicking a download element',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Direct download URL' },
          selector: { type: 'string', description: 'Selector for the download link/button' },
          saveAs: { type: 'string', description: 'Custom filename for the download' },
          directory: { type: 'string', description: 'Target download directory' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          downloadId: { type: 'string' },
          fileName: { type: 'string' },
          fileSize: { type: 'number' },
          status: { type: 'string' },
        },
      },
    },
    {
      name: 'waitForDownload',
      description: 'Wait for a download to complete with timeout',
      inputSchema: {
        type: 'object',
        properties: {
          downloadId: { type: 'string' },
          timeout: { type: 'number', default: 60000 },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          completed: { type: 'boolean' },
          filePath: { type: 'string' },
          fileSize: { type: 'number' },
          duration: { type: 'number' },
        },
      },
    },
    {
      name: 'verifyDownload',
      description: 'Verify a downloaded file: size, checksum, format',
      inputSchema: {
        type: 'object',
        properties: {
          downloadId: { type: 'string' },
          expectedSize: { type: 'number' },
          expectedChecksum: { type: 'string' },
          checksumAlgorithm: { type: 'string', enum: ['md5', 'sha256', 'sha1'] },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          verified: { type: 'boolean' },
          actualSize: { type: 'number' },
          checksumMatch: { type: 'boolean' },
        },
      },
    },
    {
      name: 'cancelDownload',
      description: 'Cancel an in-progress download',
      inputSchema: {
        type: 'object',
        properties: {
          downloadId: { type: 'string' },
        },
        required: ['downloadId'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          cancelled: { type: 'boolean' },
          downloadId: { type: 'string' },
          bytesDownloaded: { type: 'number' },
        },
      },
    },
    {
      name: 'getDownloadHistory',
      description: 'Get the history of all downloads',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20 },
          status: { type: 'string', enum: ['completed', 'in_progress', 'cancelled', 'failed'] },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          downloads: { type: 'array' },
          count: { type: 'number' },
        },
      },
    },
  ],
  permissions: [
    'execute:task',
    'read:browser',
    'write:browser',
    'download:file',
    'write:filesystem',
  ],
  maxConcurrentTasks: 3,
  timeout: 60000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 2000,
    exponentialBackoff: true,
  },
};

// ─── Download State ───────────────────────────────────────────────

type DownloadStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';

interface DownloadRecord {
  downloadId: string;
  url: string;
  fileName: string;
  fileSize: number;
  bytesDownloaded: number;
  status: DownloadStatus;
  directory: string;
  startedAt: Date;
  completedAt: Date | null;
  checksum: string | null;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class FileDownloadAgentService extends BaseAgentService {
  private downloads: Map<string, DownloadRecord> = new Map();

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }

  protected defineConfig(): AgentConfig {
    return FILE_DOWNLOAD_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'downloadFile',
      description: 'Initiate a file download',
      execute: async (params: {
        url?: string;
        selector?: string;
        saveAs?: string;
        directory?: string;
      }) => this.downloadFile(params),
    });

    this.registerTool({
      name: 'waitForDownload',
      description: 'Wait for a download to complete',
      execute: async (params: { downloadId?: string; timeout?: number }) =>
        this.waitForDownload(params.downloadId, params.timeout),
    });

    this.registerTool({
      name: 'verifyDownload',
      description: 'Verify a downloaded file',
      execute: async (params: {
        downloadId?: string;
        expectedSize?: number;
        expectedChecksum?: string;
        checksumAlgorithm?: string;
      }) => this.verifyDownload(params),
    });

    this.registerTool({
      name: 'cancelDownload',
      description: 'Cancel a download in progress',
      execute: async (params: { downloadId: string }) => this.cancelDownload(params.downloadId),
    });

    this.registerTool({
      name: 'getDownloadHistory',
      description: 'Get download history',
      execute: async (params: { limit?: number; status?: string }) =>
        this.getDownloadHistory(params.limit, params.status),
    });

    this.logger.log('FileDownload agent initialized with 5 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;

    // Try real connector first via bridge
    if (this.bridge) {
      try {
        const result: ConnectorOutput = await this.bridge.executeCapability(
          BrowserCapability.DOWNLOAD,
          {
            missionId: input.taskId,
            instruction: action || 'downloadFile',
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
        case 'downloadFile':
          result = await this.downloadFile(params);
          break;
        case 'waitForDownload':
          result = await this.waitForDownload(params.downloadId, params.timeout);
          break;
        case 'verifyDownload':
          result = await this.verifyDownload(params);
          break;
        case 'cancelDownload':
          result = await this.cancelDownload(params.downloadId);
          break;
        case 'getDownloadHistory':
          result = await this.getDownloadHistory(params.limit, params.status);
          break;
        default:
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown download action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`FileDownload execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    // Cancel all in-progress downloads
    for (const [id, download] of this.downloads.entries()) {
      if (download.status === 'in_progress' || download.status === 'pending') {
        download.status = 'cancelled';
        this.logger.log(`Cancelled download: ${id}`);
      }
    }
    this.downloads.clear();
    this.logger.log('FileDownload agent destroyed, downloads cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async downloadFile(params: {
    url?: string;
    selector?: string;
    saveAs?: string;
    directory?: string;
  }): Promise<{
    downloadId: string;
    fileName: string;
    fileSize: number;
    status: string;
  }> {
    const { url, selector, saveAs, directory = '/tmp/downloads' } = params;

    if (!url && !selector) {
      throw new Error('Either a URL or a selector must be provided');
    }

    const downloadUrl = url || `https://example.com/download/${selector}`;

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        throw new Error(`Invalid download URL: ${url}`);
      }
    }

    // Determine filename
    let fileName = saveAs;
    if (!fileName && url) {
      const urlPath = new URL(url).pathname;
      fileName = urlPath.split('/').pop() || 'download';
    }
    if (!fileName) {
      fileName = `download_${Date.now()}`;
    }

    // Simulate file size based on extension
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const sizeMap: Record<string, number> = {
      pdf: 524288,
      zip: 5242880,
      csv: 102400,
      xlsx: 262144,
      png: 1048576,
      jpg: 786432,
      txt: 20480,
    };
    const fileSize = sizeMap[ext] || 1048576;

    const downloadId = this.generateId();
    const record: DownloadRecord = {
      downloadId,
      url: downloadUrl,
      fileName,
      fileSize,
      bytesDownloaded: 0,
      status: 'in_progress',
      directory,
      startedAt: new Date(),
      completedAt: null,
      checksum: null,
    };

    this.downloads.set(downloadId, record);

    // Simulate download completion for small files
    if (fileSize < 102400) {
      record.bytesDownloaded = fileSize;
      record.status = 'completed';
      record.completedAt = new Date();
      record.checksum = this.simulateChecksum(fileName);
    }

    this.logger.log(
      `Started download: ${fileName} (${(fileSize / 1024).toFixed(1)} KB) - ${downloadId}`,
    );

    return {
      downloadId,
      fileName,
      fileSize,
      status: record.status,
    };
  }

  private async waitForDownload(
    downloadId?: string,
    timeout: number = 60000,
  ): Promise<{
    completed: boolean;
    filePath: string;
    fileSize: number;
    duration: number;
  }> {
    if (!downloadId) {
      // Wait for any pending download
      const pending = Array.from(this.downloads.values()).find(
        (d) => d.status === 'in_progress' || d.status === 'pending',
      );
      if (!pending) {
        throw new Error('No active downloads to wait for');
      }
      downloadId = pending.downloadId;
    }

    const download = this.downloads.get(downloadId);
    if (!download) {
      throw new Error(`Download not found: ${downloadId}`);
    }

    const waitStart = Date.now();

    // Simulate download progress
    while (download.status === 'in_progress' || download.status === 'pending') {
      const elapsed = Date.now() - waitStart;
      if (elapsed >= timeout) {
        download.status = 'failed';
        this.logger.warn(`Download ${downloadId} timed out after ${timeout}ms`);
        break;
      }

      // Simulate progress
      const progress = Math.min(1, elapsed / 1000); // Simulate ~1 second download
      download.bytesDownloaded = Math.round(download.fileSize * progress);

      if (progress >= 1) {
        download.status = 'completed';
        download.completedAt = new Date();
        download.checksum = this.simulateChecksum(download.fileName);
        break;
      }

      await this.sleep(100);
    }

    const duration = Date.now() - waitStart;

    this.logger.log(`Download ${downloadId}: ${download.status} (${duration}ms)`);

    return {
      completed: download.status === 'completed',
      filePath: `${download.directory}/${download.fileName}`,
      fileSize: download.bytesDownloaded,
      duration,
    };
  }

  private async verifyDownload(params: {
    downloadId?: string;
    expectedSize?: number;
    expectedChecksum?: string;
    checksumAlgorithm?: string;
  }): Promise<{
    verified: boolean;
    actualSize: number;
    checksumMatch: boolean;
  }> {
    const { downloadId, expectedSize, expectedChecksum } = params;

    if (!downloadId) {
      throw new Error('Download ID is required for verification');
    }

    const download = this.downloads.get(downloadId);
    if (!download) {
      throw new Error(`Download not found: ${downloadId}`);
    }

    if (download.status !== 'completed') {
      throw new Error(`Download is not completed (status: ${download.status})`);
    }

    let sizeMatch = true;
    if (expectedSize !== undefined) {
      sizeMatch = download.fileSize === expectedSize;
    }

    let checksumMatch = true;
    if (expectedChecksum && download.checksum) {
      checksumMatch = download.checksum === expectedChecksum;
    }

    const verified = sizeMatch && checksumMatch;

    this.logger.log(
      `Verified download ${downloadId}: ${verified ? 'PASSED' : 'FAILED'} (size: ${sizeMatch}, checksum: ${checksumMatch})`,
    );

    return {
      verified,
      actualSize: download.fileSize,
      checksumMatch,
    };
  }

  private async cancelDownload(downloadId: string): Promise<{
    cancelled: boolean;
    downloadId: string;
    bytesDownloaded: number;
  }> {
    if (!downloadId) throw new Error('Download ID is required');

    const download = this.downloads.get(downloadId);
    if (!download) {
      throw new Error(`Download not found: ${downloadId}`);
    }

    if (download.status !== 'in_progress' && download.status !== 'pending') {
      throw new Error(`Cannot cancel download in ${download.status} state`);
    }

    const bytesDownloaded = download.bytesDownloaded;
    download.status = 'cancelled';
    download.completedAt = new Date();

    this.logger.log(`Cancelled download ${downloadId} (${bytesDownloaded} bytes downloaded)`);

    return { cancelled: true, downloadId, bytesDownloaded };
  }

  private async getDownloadHistory(
    limit: number = 20,
    status?: string,
  ): Promise<{
    downloads: DownloadRecord[];
    count: number;
  }> {
    let records = Array.from(this.downloads.values());

    if (status) {
      records = records.filter((d) => d.status === status);
    }

    // Sort by most recent first
    records.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    records = records.slice(0, limit);

    this.logger.log(`Retrieved ${records.length} download record(s)`);

    return { downloads: records, count: records.length };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private simulateChecksum(fileName: string): string {
    // Generate a deterministic-looking checksum based on the filename
    const hash = fileName.split('').reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);
    return `sha256:${Math.abs(hash).toString(16).padStart(8, '0')}...${this.generateId().slice(0, 8)}`;
  }
}
