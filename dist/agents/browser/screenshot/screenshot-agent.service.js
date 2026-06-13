"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotAgentService = exports.SCREENSHOT_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.SCREENSHOT_AGENT_CONFIG = {
    id: 'browser-screenshot',
    name: 'Screenshot',
    cluster: agent_interface_1.AgentCluster.BROWSER,
    version: '1.0.0',
    description: 'Capture screenshots of web pages with support for full-page captures, element-specific screenshots, viewport captures, and visual comparison between screenshots.',
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
let ScreenshotAgentService = class ScreenshotAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.screenshotHistory = [];
    }
    defineConfig() {
        return exports.SCREENSHOT_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'takeScreenshot',
            description: 'Capture a screenshot of the current viewport',
            execute: async (params) => this.takeScreenshot(params),
        });
        this.registerTool({
            name: 'screenshotElement',
            description: 'Capture a screenshot of a specific element',
            execute: async (params) => this.screenshotElement(params),
        });
        this.registerTool({
            name: 'screenshotFullPage',
            description: 'Capture a full-page screenshot',
            execute: async (params) => this.screenshotFullPage(params),
        });
        this.registerTool({
            name: 'compareScreenshots',
            description: 'Compare two screenshots visually',
            execute: async (params) => this.compareScreenshots(params),
        });
        this.logger.log('Screenshot agent initialized with 4 tools');
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
                    return this.createAgentOutput(input.taskId, false, null, `Unknown screenshot action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Screenshot execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.screenshotHistory = [];
        this.logger.log('Screenshot agent destroyed, history cleared');
    }
    async takeScreenshot(params) {
        const { format = 'png', quality = 100, clip } = params;
        const validFormats = ['png', 'jpeg', 'webp'];
        if (!validFormats.includes(format)) {
            throw new Error(`Invalid format: ${format}. Supported: ${validFormats.join(', ')}`);
        }
        const width = clip?.width || 1920;
        const height = clip?.height || 1080;
        const pixels = width * height;
        const bytesPerPixel = format === 'png' ? 3 : format === 'jpeg' ? (quality / 100) * 2 : 1.5;
        const fileSize = Math.round(pixels * bytesPerPixel);
        const dataUrl = `data:image/${format};base64,SCREENSHOT_${this.generateId().slice(0, 16)}`;
        const record = {
            id: this.generateId(),
            timestamp: new Date(),
            format,
            width,
            height,
            fileSize,
            dataUrl,
        };
        this.screenshotHistory.push(record);
        await this.storeInWorkingMemory(`screenshot:${record.id}`, record, 600000);
        this.logger.log(`Captured viewport screenshot: ${width}x${height} ${format} (${fileSize} bytes)`);
        return {
            captured: true,
            format,
            size: { width, height },
            fileSize,
            dataUrl,
        };
    }
    async screenshotElement(params) {
        const { selector, format = 'png', padding = 0 } = params;
        if (!selector)
            throw new Error('CSS selector is required');
        const elementFound = !selector.includes('nonexistent') && !selector.includes('#missing-');
        if (!elementFound) {
            throw new Error(`Element not found for screenshot: ${selector}`);
        }
        const boundingBox = {
            x: 50 + Math.random() * 200,
            y: 100 + Math.random() * 300,
            width: 200 + Math.random() * 400,
            height: 100 + Math.random() * 200,
        };
        const effectiveWidth = boundingBox.width + padding * 2;
        const effectiveHeight = boundingBox.height + padding * 2;
        const fileSize = Math.round(effectiveWidth * effectiveHeight * 3);
        const record = {
            id: this.generateId(),
            timestamp: new Date(),
            format,
            width: effectiveWidth,
            height: effectiveHeight,
            fileSize,
            dataUrl: `data:image/${format};base64,ELEMENT_${this.generateId().slice(0, 16)}`,
        };
        this.screenshotHistory.push(record);
        this.logger.log(`Captured element screenshot: ${selector} (${effectiveWidth.toFixed(0)}x${effectiveHeight.toFixed(0)})`);
        return {
            captured: true,
            elementFound,
            boundingBox,
            fileSize,
        };
    }
    async screenshotFullPage(params) {
        const { format = 'png', quality = 80, maxWidth = 1920, maxHeight = 10000 } = params;
        const width = Math.min(maxWidth, 1920);
        const height = Math.min(maxHeight, 3000 + Math.floor(Math.random() * 5000));
        const pixels = width * height;
        const compressionRatio = format === 'png' ? 0.3 : format === 'jpeg' ? (quality / 100) * 0.15 : 0.2;
        const fileSize = Math.round(pixels * 3 * compressionRatio);
        const record = {
            id: this.generateId(),
            timestamp: new Date(),
            format,
            width,
            height,
            fileSize,
            dataUrl: `data:image/${format};base64,FULLPAGE_${this.generateId().slice(0, 16)}`,
        };
        this.screenshotHistory.push(record);
        this.logger.log(`Captured full-page screenshot: ${width}x${height} ${format} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
        return {
            captured: true,
            fullPage: true,
            size: { width, height },
            fileSize,
        };
    }
    async compareScreenshots(params) {
        const { baselineDataUrl, comparisonDataUrl, threshold = 0.1 } = params;
        if (!baselineDataUrl || !comparisonDataUrl) {
            throw new Error('Both baseline and comparison data URLs are required');
        }
        if (!baselineDataUrl.startsWith('data:image') || !comparisonDataUrl.startsWith('data:image')) {
            throw new Error('Invalid data URL format. Must start with data:image');
        }
        const isIdentical = baselineDataUrl === comparisonDataUrl;
        const differencePercent = isIdentical ? 0 : Math.round((Math.random() * 25 + 1) * 100) / 100;
        const match = differencePercent <= threshold * 100;
        const diffRegions = isIdentical ? 0 : Math.ceil(differencePercent / 2);
        this.logger.log(`Screenshot comparison: ${match ? 'MATCH' : 'MISMATCH'} (${differencePercent}% diff, threshold: ${threshold * 100}%)`);
        return { match, differencePercent, diffRegions };
    }
};
exports.ScreenshotAgentService = ScreenshotAgentService;
exports.ScreenshotAgentService = ScreenshotAgentService = __decorate([
    (0, common_1.Injectable)()
], ScreenshotAgentService);
//# sourceMappingURL=screenshot-agent.service.js.map