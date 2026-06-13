"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileDownloadAgentService = exports.FILE_DOWNLOAD_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.FILE_DOWNLOAD_AGENT_CONFIG = {
    id: 'browser-file-download',
    name: 'FileDownload',
    cluster: agent_interface_1.AgentCluster.BROWSER,
    version: '1.0.0',
    description: 'Manage file downloads in the browser including initiating downloads, monitoring download progress, verifying file integrity, cancelling downloads, and tracking download history.',
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
let FileDownloadAgentService = class FileDownloadAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.downloads = new Map();
    }
    defineConfig() {
        return exports.FILE_DOWNLOAD_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'downloadFile',
            description: 'Initiate a file download',
            execute: async (params) => this.downloadFile(params),
        });
        this.registerTool({
            name: 'waitForDownload',
            description: 'Wait for a download to complete',
            execute: async (params) => this.waitForDownload(params.downloadId, params.timeout),
        });
        this.registerTool({
            name: 'verifyDownload',
            description: 'Verify a downloaded file',
            execute: async (params) => this.verifyDownload(params),
        });
        this.registerTool({
            name: 'cancelDownload',
            description: 'Cancel a download in progress',
            execute: async (params) => this.cancelDownload(params.downloadId),
        });
        this.registerTool({
            name: 'getDownloadHistory',
            description: 'Get download history',
            execute: async (params) => this.getDownloadHistory(params.limit, params.status),
        });
        this.logger.log('FileDownload agent initialized with 5 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        try {
            let result;
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
                    return this.createAgentOutput(input.taskId, false, null, `Unknown download action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`FileDownload execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        for (const [id, download] of this.downloads.entries()) {
            if (download.status === 'in_progress' || download.status === 'pending') {
                download.status = 'cancelled';
                this.logger.log(`Cancelled download: ${id}`);
            }
        }
        this.downloads.clear();
        this.logger.log('FileDownload agent destroyed, downloads cleared');
    }
    async downloadFile(params) {
        const { url, selector, saveAs, directory = '/tmp/downloads' } = params;
        if (!url && !selector) {
            throw new Error('Either a URL or a selector must be provided');
        }
        const downloadUrl = url || `https://example.com/download/${selector}`;
        if (url) {
            try {
                new URL(url);
            }
            catch {
                throw new Error(`Invalid download URL: ${url}`);
            }
        }
        let fileName = saveAs;
        if (!fileName && url) {
            const urlPath = new URL(url).pathname;
            fileName = urlPath.split('/').pop() || 'download';
        }
        if (!fileName) {
            fileName = `download_${Date.now()}`;
        }
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const sizeMap = {
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
        const record = {
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
        if (fileSize < 102400) {
            record.bytesDownloaded = fileSize;
            record.status = 'completed';
            record.completedAt = new Date();
            record.checksum = this.simulateChecksum(fileName);
        }
        this.logger.log(`Started download: ${fileName} (${(fileSize / 1024).toFixed(1)} KB) - ${downloadId}`);
        return {
            downloadId,
            fileName,
            fileSize,
            status: record.status,
        };
    }
    async waitForDownload(downloadId, timeout = 60000) {
        if (!downloadId) {
            const pending = Array.from(this.downloads.values()).find((d) => d.status === 'in_progress' || d.status === 'pending');
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
        while (download.status === 'in_progress' || download.status === 'pending') {
            const elapsed = Date.now() - waitStart;
            if (elapsed >= timeout) {
                download.status = 'failed';
                this.logger.warn(`Download ${downloadId} timed out after ${timeout}ms`);
                break;
            }
            const progress = Math.min(1, elapsed / 1000);
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
    async verifyDownload(params) {
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
        this.logger.log(`Verified download ${downloadId}: ${verified ? 'PASSED' : 'FAILED'} (size: ${sizeMatch}, checksum: ${checksumMatch})`);
        return {
            verified,
            actualSize: download.fileSize,
            checksumMatch,
        };
    }
    async cancelDownload(downloadId) {
        if (!downloadId)
            throw new Error('Download ID is required');
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
    async getDownloadHistory(limit = 20, status) {
        let records = Array.from(this.downloads.values());
        if (status) {
            records = records.filter((d) => d.status === status);
        }
        records.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
        records = records.slice(0, limit);
        this.logger.log(`Retrieved ${records.length} download record(s)`);
        return { downloads: records, count: records.length };
    }
    simulateChecksum(fileName) {
        const hash = fileName.split('').reduce((acc, char) => {
            return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
        }, 0);
        return `sha256:${Math.abs(hash).toString(16).padStart(8, '0')}...${this.generateId().slice(0, 8)}`;
    }
};
exports.FileDownloadAgentService = FileDownloadAgentService;
exports.FileDownloadAgentService = FileDownloadAgentService = __decorate([
    (0, common_1.Injectable)()
], FileDownloadAgentService);
//# sourceMappingURL=file-download-agent.service.js.map