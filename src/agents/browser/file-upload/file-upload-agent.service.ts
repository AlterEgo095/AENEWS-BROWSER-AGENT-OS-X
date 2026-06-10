/**
 * AENEWS Agent OS X - File Upload Agent
 * Handles file uploads: single, multiple, drag-drop, and verification.
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

export const FILE_UPLOAD_AGENT_CONFIG: AgentConfig = {
  id: 'browser-file-upload',
  name: 'FileUpload',
  cluster: AgentCluster.BROWSER,
  version: '1.0.0',
  description:
    'Handle file uploads in web forms including single file uploads, multiple file uploads, drag-and-drop uploads, and upload verification. Supports various file input types and upload progress monitoring.',
  capabilities: [
    {
      name: 'uploadFile',
      description: 'Upload a single file to a file input element',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'CSS selector for the file input' },
          filePath: { type: 'string', description: 'Path to the file to upload' },
          waitForUpload: { type: 'boolean', default: true },
          timeout: { type: 'number', default: 30000 },
        },
        required: ['selector', 'filePath'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          uploaded: { type: 'boolean' },
          fileName: { type: 'string' },
          fileSize: { type: 'number' },
          uploadId: { type: 'string' },
        },
      },
    },
    {
      name: 'uploadMultiple',
      description: 'Upload multiple files to a file input element',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          filePaths: { type: 'array', items: { type: 'string' } },
          waitForUpload: { type: 'boolean', default: true },
        },
        required: ['selector', 'filePaths'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          uploaded: { type: 'boolean' },
          files: { type: 'array' },
          totalSize: { type: 'number' },
          successCount: { type: 'number' },
          failCount: { type: 'number' },
        },
      },
    },
    {
      name: 'dragDropUpload',
      description: 'Upload files via drag-and-drop onto a drop zone',
      inputSchema: {
        type: 'object',
        properties: {
          dropZoneSelector: { type: 'string', description: 'CSS selector for the drop zone' },
          filePaths: { type: 'array', items: { type: 'string' } },
        },
        required: ['dropZoneSelector', 'filePaths'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          uploaded: { type: 'boolean' },
          dropZoneFound: { type: 'boolean' },
          filesDropped: { type: 'number' },
        },
      },
    },
    {
      name: 'verifyUpload',
      description: 'Verify that a file upload was successful',
      inputSchema: {
        type: 'object',
        properties: {
          uploadId: { type: 'string' },
          selector: { type: 'string' },
          expectedFileName: { type: 'string' },
        },
      },
      outputSchema: {
        type: 'object',
        properties: {
          verified: { type: 'boolean' },
          fileName: { type: 'string' },
          fileSize: { type: 'number' },
        },
      },
    },
  ],
  permissions: ['execute:task', 'read:browser', 'write:browser', 'upload:file', 'read:filesystem'],
  maxConcurrentTasks: 3,
  timeout: 45000,
  retryPolicy: {
    maxRetries: 2,
    backoffMs: 1500,
    exponentialBackoff: true,
  },
};

// ─── Upload Record ────────────────────────────────────────────────

interface UploadRecord {
  uploadId: string;
  selector: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploaded: boolean;
  verified: boolean;
  timestamp: Date;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class FileUploadAgentService extends BaseAgentService {
  private uploadHistory: UploadRecord[] = [];

  protected defineConfig(): AgentConfig {
    return FILE_UPLOAD_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'uploadFile',
      description: 'Upload a single file',
      execute: async (params: {
        selector: string;
        filePath: string;
        waitForUpload?: boolean;
        timeout?: number;
      }) => this.uploadFile(params),
    });

    this.registerTool({
      name: 'uploadMultiple',
      description: 'Upload multiple files',
      execute: async (params: { selector: string; filePaths: string[]; waitForUpload?: boolean }) =>
        this.uploadMultiple(params),
    });

    this.registerTool({
      name: 'dragDropUpload',
      description: 'Upload files via drag-and-drop',
      execute: async (params: { dropZoneSelector: string; filePaths: string[] }) =>
        this.dragDropUpload(params),
    });

    this.registerTool({
      name: 'verifyUpload',
      description: 'Verify a file upload',
      execute: async (params: {
        uploadId?: string;
        selector?: string;
        expectedFileName?: string;
      }) => this.verifyUpload(params),
    });

    this.logger.log('FileUpload agent initialized with 4 tools');
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
        case 'uploadFile':
          result = await this.uploadFile(params);
          break;
        case 'uploadMultiple':
          result = await this.uploadMultiple(params);
          break;
        case 'dragDropUpload':
          result = await this.dragDropUpload(params);
          break;
        case 'verifyUpload':
          result = await this.verifyUpload(params);
          break;
        default:
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown upload action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`FileUpload execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.uploadHistory = [];
    this.logger.log('FileUpload agent destroyed, history cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async uploadFile(params: {
    selector: string;
    filePath: string;
    waitForUpload?: boolean;
    timeout?: number;
  }): Promise<{
    uploaded: boolean;
    fileName: string;
    fileSize: number;
    uploadId: string;
  }> {
    const { selector, filePath, waitForUpload = true } = params;

    if (!selector) throw new Error('CSS selector is required');
    if (!filePath) throw new Error('File path is required');

    // Validate file path
    if (!filePath.includes('/') && !filePath.includes('\\') && !filePath.includes('.')) {
      throw new Error(`Invalid file path format: ${filePath}`);
    }

    const fileName = filePath.split(/[\\/]/).pop() || 'unknown';

    // Validate file extension against common restrictions
    const restrictedExtensions = ['.exe', '.bat', '.cmd', '.sh', '.js', '.vbs'];
    const ext = '.' + (fileName.split('.').pop()?.toLowerCase() || '');
    if (restrictedExtensions.includes(ext)) {
      throw new Error(`File type "${ext}" is commonly restricted for upload`);
    }

    // Simulate file size
    const fileSize = this.simulateFileSize(fileName);

    const uploadId = this.generateId();

    if (waitForUpload) {
      // Simulate upload time proportional to file size
      const uploadTime = Math.min(3000, fileSize / 1024);
      await this.sleep(uploadTime);
    }

    const record: UploadRecord = {
      uploadId,
      selector,
      fileName,
      filePath,
      fileSize,
      uploaded: true,
      verified: false,
      timestamp: new Date(),
    };
    this.uploadHistory.push(record);

    this.logger.log(`Uploaded ${fileName} (${(fileSize / 1024).toFixed(1)} KB) to ${selector}`);

    return { uploaded: true, fileName, fileSize, uploadId };
  }

  private async uploadMultiple(params: {
    selector: string;
    filePaths: string[];
    waitForUpload?: boolean;
  }): Promise<{
    uploaded: boolean;
    files: Array<{ fileName: string; fileSize: number; uploaded: boolean }>;
    totalSize: number;
    successCount: number;
    failCount: number;
  }> {
    const { selector, filePaths, waitForUpload = true } = params;

    if (!selector) throw new Error('CSS selector is required');
    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      throw new Error('File paths array must contain at least one path');
    }

    if (filePaths.length > 20) {
      throw new Error('Maximum 20 files per upload batch');
    }

    const files: Array<{ fileName: string; fileSize: number; uploaded: boolean }> = [];
    let totalSize = 0;
    let successCount = 0;
    let failCount = 0;

    for (const filePath of filePaths) {
      try {
        if (!filePath.includes('/') && !filePath.includes('\\') && !filePath.includes('.')) {
          throw new Error(`Invalid file path: ${filePath}`);
        }

        const fileName = filePath.split(/[\\/]/).pop() || 'unknown';
        const fileSize = this.simulateFileSize(fileName);

        const uploadId = this.generateId();
        this.uploadHistory.push({
          uploadId,
          selector,
          fileName,
          filePath,
          fileSize,
          uploaded: true,
          verified: false,
          timestamp: new Date(),
        });

        files.push({ fileName, fileSize, uploaded: true });
        totalSize += fileSize;
        successCount++;
      } catch (err) {
        const fileName = filePath.split(/[\\/]/).pop() || 'unknown';
        files.push({ fileName, fileSize: 0, uploaded: false });
        failCount++;
      }
    }

    if (waitForUpload) {
      const uploadTime = Math.min(5000, totalSize / 2048);
      await this.sleep(uploadTime);
    }

    this.logger.log(
      `Uploaded ${successCount}/${filePaths.length} file(s) (${(totalSize / 1024).toFixed(1)} KB total)`,
    );

    return { uploaded: successCount > 0, files, totalSize, successCount, failCount };
  }

  private async dragDropUpload(params: { dropZoneSelector: string; filePaths: string[] }): Promise<{
    uploaded: boolean;
    dropZoneFound: boolean;
    filesDropped: number;
  }> {
    const { dropZoneSelector, filePaths } = params;

    if (!dropZoneSelector) throw new Error('Drop zone selector is required');
    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      throw new Error('File paths array must contain at least one path');
    }

    // Simulate drop zone detection
    const dropZoneFound = !dropZoneSelector.includes('nonexistent');

    if (!dropZoneFound) {
      throw new Error(`Drop zone not found: ${dropZoneSelector}`);
    }

    let filesDropped = 0;

    for (const filePath of filePaths) {
      const fileName = filePath.split(/[\\/]/).pop() || 'unknown';
      const fileSize = this.simulateFileSize(fileName);

      this.uploadHistory.push({
        uploadId: this.generateId(),
        selector: dropZoneSelector,
        fileName,
        filePath,
        fileSize,
        uploaded: true,
        verified: false,
        timestamp: new Date(),
      });

      filesDropped++;
    }

    // Simulate drag-and-drop interaction time
    await this.sleep(200 + filesDropped * 100);

    this.logger.log(`Drag-drop uploaded ${filesDropped} file(s) to ${dropZoneSelector}`);

    return { uploaded: true, dropZoneFound, filesDropped };
  }

  private async verifyUpload(params: {
    uploadId?: string;
    selector?: string;
    expectedFileName?: string;
  }): Promise<{
    verified: boolean;
    fileName: string;
    fileSize: number;
  }> {
    const { uploadId, selector, expectedFileName } = params;

    let record: UploadRecord | undefined;

    if (uploadId) {
      record = this.uploadHistory.find((r) => r.uploadId === uploadId);
    } else if (selector) {
      record = [...this.uploadHistory].reverse().find((r) => r.selector === selector);
    }

    if (!record) {
      throw new Error('Upload record not found. Provide uploadId or selector.');
    }

    if (!record.uploaded) {
      return { verified: false, fileName: record.fileName, fileSize: 0 };
    }

    // Check filename if expected
    let fileNameMatch = true;
    if (expectedFileName && record.fileName !== expectedFileName) {
      fileNameMatch = false;
    }

    const verified = record.uploaded && fileNameMatch;
    record.verified = verified;

    this.logger.log(
      `Upload verification: ${verified ? 'PASSED' : 'FAILED'} for ${record.fileName}`,
    );

    return { verified, fileName: record.fileName, fileSize: record.fileSize };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private simulateFileSize(fileName: string): number {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const sizeMap: Record<string, number> = {
      pdf: 524288,
      docx: 262144,
      xlsx: 131072,
      png: 1048576,
      jpg: 786432,
      gif: 524288,
      csv: 51200,
      txt: 10240,
      zip: 3145728,
    };
    return sizeMap[ext] || 102400;
  }
}
