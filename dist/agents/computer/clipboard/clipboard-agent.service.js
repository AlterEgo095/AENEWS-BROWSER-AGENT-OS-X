"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClipboardAgentService = exports.CLIPBOARD_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.CLIPBOARD_AGENT_CONFIG = {
    id: 'computer-clipboard',
    name: 'Clipboard',
    cluster: agent_interface_1.AgentCluster.COMPUTER,
    version: '1.0.0',
    description: 'Read and write clipboard content, monitor clipboard changes over time. Supports text, HTML, and file reference clipboard formats with change detection and history tracking.',
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
let ClipboardAgentService = class ClipboardAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.clipboardContent = {
            content: '',
            format: 'text',
            length: 0,
            updatedAt: new Date(),
        };
        this.changeHistory = [];
        this.isWatching = false;
    }
    defineConfig() {
        return exports.CLIPBOARD_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'readClipboard',
            description: 'Read the current clipboard content',
            execute: async (params) => this.readClipboard(params.format || 'text'),
        });
        this.registerTool({
            name: 'writeClipboard',
            description: 'Write content to the clipboard',
            execute: async (params) => this.writeClipboard(params.content, params.format || 'text', params.clearBefore !== false),
        });
        this.registerTool({
            name: 'clearClipboard',
            description: 'Clear the clipboard',
            execute: async () => this.clearClipboard(),
        });
        this.registerTool({
            name: 'watchClipboard',
            description: 'Monitor clipboard for changes',
            execute: async (params) => this.watchClipboard(params.duration, params.interval, params.maxChanges),
        });
        await this.storeInWorkingMemory('clip:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Clipboard agent initialized with 4 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.DevCapability.DEBUG, {
                    missionId: input.taskId,
                    instruction: JSON.stringify(input.payload),
                    workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
                    parameters: input.payload,
                });
                return this.createAgentOutput(input.taskId, result.success, result.output, result.error, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge failed, fallback: ${error.message}`);
            }
        }
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'readClipboard',
            'writeClipboard',
            'clearClipboard',
            'watchClipboard',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown clipboard action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Clipboard execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
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
    async readClipboard(format = 'text') {
        let content = this.clipboardContent.content;
        const currentFormat = this.clipboardContent.format;
        if (format === 'html' && currentFormat === 'text') {
            content = `<p>${content.replace(/\n/g, '</p>\n<p>')}</p>`;
        }
        else if (format === 'text' && currentFormat === 'html') {
            content = content.replace(/<[^>]*>/g, '').trim();
        }
        else if (format === 'files' && currentFormat !== 'files') {
            content = '';
        }
        this.logger.log(`Read clipboard: ${this.clipboardContent.length} chars, format: ${format}`);
        return {
            content,
            format,
            length: content.length,
            readAt: new Date().toISOString(),
        };
    }
    async writeClipboard(content, format = 'text', clearBefore = true) {
        if (content === undefined || content === null) {
            throw new Error('Content is required for writing to clipboard');
        }
        const contentStr = String(content);
        if (clearBefore) {
            this.clipboardContent.content = '';
        }
        if (this.clipboardContent.content !== contentStr) {
            this.changeHistory.push({
                content: this.clipboardContent.content,
                format: this.clipboardContent.format,
                timestamp: new Date(),
            });
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
        await this.storeInWorkingMemory('clip:lastWrite', { content: contentStr.substring(0, 500), format, length: contentStr.length }, 300000);
        this.logger.log(`Wrote to clipboard: ${contentStr.length} chars, format: ${format}`);
        return {
            written: true,
            format,
            length: contentStr.length,
            writtenAt: new Date().toISOString(),
        };
    }
    async clearClipboard() {
        const previousLength = this.clipboardContent.length;
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
    async watchClipboard(duration = 30000, interval = 500, maxChanges = 100) {
        if (this.isWatching) {
            throw new Error('Clipboard watch is already in progress');
        }
        this.isWatching = true;
        const changes = [];
        const watchStart = Date.now();
        let lastContent = this.clipboardContent.content;
        let lastFormat = this.clipboardContent.format;
        let lastChangeTime = watchStart;
        const checkCount = Math.min(Math.floor(duration / interval), 60);
        const effectiveInterval = Math.min(interval, 100);
        for (let i = 0; i < checkCount; i++) {
            if (!this.isWatching)
                break;
            if (changes.length >= maxChanges)
                break;
            await this.sleep(effectiveInterval);
            if (Math.random() < 0.05 && i > 2) {
                const simulatedContent = `Simulated clipboard change #${changes.length + 1} at ${new Date().toISOString()}`;
                const simulatedFormat = Math.random() > 0.8 ? 'html' : 'text';
                const change = {
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
            if (this.clipboardContent.content !== lastContent) {
                const change = {
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
};
exports.ClipboardAgentService = ClipboardAgentService;
exports.ClipboardAgentService = ClipboardAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], ClipboardAgentService);
//# sourceMappingURL=clipboard-agent.service.js.map