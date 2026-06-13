"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IframeHandlingAgentService = exports.IFRAME_HANDLING_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.IFRAME_HANDLING_AGENT_CONFIG = {
    id: 'browser-iframe-handling',
    name: 'IframeHandling',
    cluster: agent_interface_1.AgentCluster.BROWSER,
    version: '1.0.0',
    description: 'Work with iframe elements in web pages including switching execution context between frames, listing available frames, executing actions within specific frames, and managing frame hierarchies.',
    capabilities: [
        {
            name: 'switchToIframe',
            description: 'Switch the execution context to a specific iframe',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the iframe' },
                    index: { type: 'number', description: 'Index of the iframe (0-based)' },
                    name: { type: 'string', description: 'Name attribute of the iframe' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    switched: { type: 'boolean' },
                    frameId: { type: 'string' },
                    frameUrl: { type: 'string' },
                },
            },
        },
        {
            name: 'switchToMainFrame',
            description: 'Switch back to the main/top frame context',
            inputSchema: {
                type: 'object',
                properties: {},
            },
            outputSchema: {
                type: 'object',
                properties: {
                    switched: { type: 'boolean' },
                    frameId: { type: 'string' },
                },
            },
        },
        {
            name: 'getIframeList',
            description: 'Get a list of all iframes on the current page',
            inputSchema: {
                type: 'object',
                properties: {
                    includeNested: { type: 'boolean', default: true },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    iframes: { type: 'array' },
                    count: { type: 'number' },
                },
            },
        },
        {
            name: 'executeInFrame',
            description: 'Execute an action within a specific iframe context',
            inputSchema: {
                type: 'object',
                properties: {
                    frameSelector: { type: 'string' },
                    frameIndex: { type: 'number' },
                    action: { type: 'string', description: 'Action to execute in the frame' },
                    actionParams: { type: 'object', description: 'Parameters for the action' },
                },
                required: ['action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    executed: { type: 'boolean' },
                    result: { type: 'any' },
                    frameId: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:browser',
        'write:browser',
        'access:frames',
        'interact:element',
    ],
    maxConcurrentTasks: 5,
    timeout: 15000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 500,
        exponentialBackoff: true,
    },
};
let IframeHandlingAgentService = class IframeHandlingAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.iframes = new Map();
        this.currentFrameId = 'main';
    }
    defineConfig() {
        return exports.IFRAME_HANDLING_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'switchToIframe',
            description: 'Switch execution context to an iframe',
            execute: async (params) => this.switchToIframe(params),
        });
        this.registerTool({
            name: 'switchToMainFrame',
            description: 'Switch back to the main frame',
            execute: async () => this.switchToMainFrame(),
        });
        this.registerTool({
            name: 'getIframeList',
            description: 'List all iframes on the page',
            execute: async (params) => this.getIframeList(params.includeNested),
        });
        this.registerTool({
            name: 'executeInFrame',
            description: 'Execute an action within an iframe',
            execute: async (params) => this.executeInFrame(params),
        });
        this.initializeSimulatedIframes();
        this.logger.log('IframeHandling agent initialized with 4 tools');
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
                case 'switchToIframe':
                    result = await this.switchToIframe(params);
                    break;
                case 'switchToMainFrame':
                    result = await this.switchToMainFrame();
                    break;
                case 'getIframeList':
                    result = await this.getIframeList(params.includeNested);
                    break;
                case 'executeInFrame':
                    result = await this.executeInFrame(params);
                    break;
                default:
                    return this.createAgentOutput(input.taskId, false, null, `Unknown iframe action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`IframeHandling execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.iframes.clear();
        this.currentFrameId = 'main';
        this.logger.log('IframeHandling agent destroyed, frame data cleared');
    }
    async switchToIframe(params) {
        const { selector, index, name } = params;
        if (!selector && index === undefined && !name) {
            throw new Error('One of selector, index, or name is required');
        }
        let targetFrame;
        if (selector) {
            targetFrame = Array.from(this.iframes.values()).find((f) => f.selector === selector);
        }
        else if (index !== undefined) {
            targetFrame = Array.from(this.iframes.values()).find((f) => f.index === index);
        }
        else if (name) {
            targetFrame = Array.from(this.iframes.values()).find((f) => f.name === name);
        }
        if (!targetFrame) {
            throw new Error(`Iframe not found: ${selector || index || name}`);
        }
        this.currentFrameId = targetFrame.frameId;
        this.logger.log(`Switched to iframe: ${targetFrame.selector} (${targetFrame.src})`);
        return {
            switched: true,
            frameId: targetFrame.frameId,
            frameUrl: targetFrame.src,
        };
    }
    async switchToMainFrame() {
        const previousFrame = this.currentFrameId;
        this.currentFrameId = 'main';
        this.logger.log(`Switched from frame ${previousFrame} back to main frame`);
        return { switched: true, frameId: 'main' };
    }
    async getIframeList(includeNested = true) {
        let iframes = Array.from(this.iframes.values());
        if (!includeNested) {
            iframes = iframes.filter((f) => f.depth === 0);
        }
        iframes.sort((a, b) => a.index - b.index);
        this.logger.log(`Found ${iframes.length} iframe(s) on the page`);
        return { iframes, count: iframes.length };
    }
    async executeInFrame(params) {
        const { frameSelector, frameIndex, action, actionParams = {} } = params;
        if (!action)
            throw new Error('Action is required');
        let targetFrameId = this.currentFrameId;
        let switchedTemporarily = false;
        if (frameSelector || frameIndex !== undefined) {
            const previousFrame = this.currentFrameId;
            await this.switchToIframe({
                selector: frameSelector,
                index: frameIndex,
            });
            targetFrameId = this.currentFrameId;
            switchedTemporarily = true;
            const restoreFrame = previousFrame;
            const finalAction = async () => {
                if (restoreFrame === 'main') {
                    await this.switchToMainFrame();
                }
                else {
                    this.currentFrameId = restoreFrame;
                }
            };
            try {
                const result = await this.executeActionInContext(action, actionParams);
                if (switchedTemporarily) {
                    await finalAction();
                }
                return { executed: true, result, frameId: targetFrameId };
            }
            catch (error) {
                if (switchedTemporarily) {
                    await finalAction();
                }
                throw error;
            }
        }
        const result = await this.executeActionInContext(action, actionParams);
        return { executed: true, result, frameId: targetFrameId };
    }
    initializeSimulatedIframes() {
        const frames = [
            {
                frameId: 'frame-0',
                selector: 'iframe#main-content',
                name: 'main-content',
                src: 'https://example.com/embedded',
                index: 0,
                parentId: null,
                depth: 0,
            },
            {
                frameId: 'frame-1',
                selector: 'iframe#sidebar-widget',
                name: 'sidebar-widget',
                src: 'https://widget.example.com/sidebar',
                index: 1,
                parentId: null,
                depth: 0,
            },
            {
                frameId: 'frame-2',
                selector: 'iframe[class*="video-player"]',
                name: 'video-player',
                src: 'https://video.example.com/embed/123',
                index: 2,
                parentId: null,
                depth: 0,
            },
        ];
        for (const frame of frames) {
            this.iframes.set(frame.frameId, frame);
        }
    }
    async executeActionInContext(action, params) {
        switch (action) {
            case 'click':
                return { clicked: true, selector: params.selector };
            case 'fill':
                return { filled: true, selector: params.selector, value: params.value };
            case 'extract':
                return { extracted: true, text: 'Content from iframe', selector: params.selector };
            case 'getText':
                return { text: 'Text content from iframe' };
            case 'getTitle':
                return { title: 'Iframe Page Title' };
            case 'getUrl':
                return { url: 'https://example.com/embedded' };
            default:
                return { action, executed: true, params };
        }
    }
};
exports.IframeHandlingAgentService = IframeHandlingAgentService;
exports.IframeHandlingAgentService = IframeHandlingAgentService = __decorate([
    (0, common_1.Injectable)()
], IframeHandlingAgentService);
//# sourceMappingURL=iframe-handling-agent.service.js.map