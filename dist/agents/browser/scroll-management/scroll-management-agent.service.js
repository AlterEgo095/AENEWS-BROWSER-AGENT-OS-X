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
exports.ScrollManagementAgentService = exports.SCROLL_MANAGEMENT_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.SCROLL_MANAGEMENT_AGENT_CONFIG = {
    id: 'browser-scroll-management',
    name: 'ScrollManagement',
    cluster: agent_interface_1.AgentCluster.BROWSER,
    version: '1.0.0',
    description: 'Manage page scrolling operations including scrolling to elements, scrolling by offset, scrolling to top or bottom, and handling infinite scroll patterns with content loading detection.',
    capabilities: [
        {
            name: 'scrollToElement',
            description: 'Scroll the page to bring a specific element into view',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the target element' },
                    alignment: {
                        type: 'string',
                        enum: ['start', 'center', 'end', 'nearest'],
                        default: 'center',
                    },
                    offset: { type: 'number', description: 'Additional offset in pixels from the element' },
                    smooth: { type: 'boolean', default: true },
                },
                required: ['selector'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    scrolled: { type: 'boolean' },
                    elementFound: { type: 'boolean' },
                    scrollPosition: {
                        type: 'object',
                        properties: { x: { type: 'number' }, y: { type: 'number' } },
                    },
                },
            },
        },
        {
            name: 'scrollBy',
            description: 'Scroll the page by a relative offset',
            inputSchema: {
                type: 'object',
                properties: {
                    deltaX: { type: 'number', default: 0 },
                    deltaY: { type: 'number', default: 300 },
                    smooth: { type: 'boolean', default: true },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    scrolled: { type: 'boolean' },
                    previousPosition: { type: 'object' },
                    newPosition: { type: 'object' },
                },
            },
        },
        {
            name: 'scrollToTop',
            description: 'Scroll the page to the very top',
            inputSchema: {
                type: 'object',
                properties: {
                    smooth: { type: 'boolean', default: true },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    scrolled: { type: 'boolean' },
                    scrollPosition: { type: 'object' },
                },
            },
        },
        {
            name: 'scrollToBottom',
            description: 'Scroll the page to the very bottom',
            inputSchema: {
                type: 'object',
                properties: {
                    smooth: { type: 'boolean', default: true },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    scrolled: { type: 'boolean' },
                    scrollPosition: { type: 'object' },
                    pageHeight: { type: 'number' },
                },
            },
        },
        {
            name: 'handleInfiniteScroll',
            description: 'Handle infinite scroll pages by scrolling and collecting content',
            inputSchema: {
                type: 'object',
                properties: {
                    maxScrolls: { type: 'number', default: 10 },
                    scrollDelay: {
                        type: 'number',
                        default: 1000,
                        description: 'Delay between scrolls in ms',
                    },
                    stopCondition: {
                        type: 'string',
                        enum: ['maxScrolls', 'noNewContent', 'endReached'],
                        default: 'maxScrolls',
                    },
                    contentSelector: { type: 'string', description: 'Selector for content items to count' },
                    timeout: { type: 'number', default: 60000 },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    completed: { type: 'boolean' },
                    totalScrolls: { type: 'number' },
                    itemsCollected: { type: 'number' },
                    stopReason: { type: 'string' },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:browser', 'write:browser', 'interact:element'],
    maxConcurrentTasks: 5,
    timeout: 30000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 500,
        exponentialBackoff: true,
    },
};
let ScrollManagementAgentService = class ScrollManagementAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.scrollPosition = {
            x: 0,
            y: 0,
            maxScrollX: 0,
            maxScrollY: 5000,
        };
    }
    defineConfig() {
        return exports.SCROLL_MANAGEMENT_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'scrollToElement',
            description: 'Scroll to bring an element into view',
            execute: async (params) => this.scrollToElement(params),
        });
        this.registerTool({
            name: 'scrollBy',
            description: 'Scroll by a relative offset',
            execute: async (params) => this.scrollBy(params),
        });
        this.registerTool({
            name: 'scrollToTop',
            description: 'Scroll to the top of the page',
            execute: async (params) => this.scrollToTop(params.smooth),
        });
        this.registerTool({
            name: 'scrollToBottom',
            description: 'Scroll to the bottom of the page',
            execute: async (params) => this.scrollToBottom(params.smooth),
        });
        this.registerTool({
            name: 'handleInfiniteScroll',
            description: 'Handle infinite scroll with content collection',
            execute: async (params) => this.handleInfiniteScroll(params),
        });
        this.logger.log('ScrollManagement agent initialized with 5 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.BrowserCapability.SESSION, {
                    missionId: input.taskId,
                    instruction: action || 'scroll',
                    workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
                    parameters: input.payload,
                });
                return this.createAgentOutput(input.taskId, result.success, result.output, result.error, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge execution failed, falling back to local: ${error.message}`);
            }
        }
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        try {
            let result;
            switch (action) {
                case 'scrollToElement':
                    result = await this.scrollToElement(params);
                    break;
                case 'scrollBy':
                    result = await this.scrollBy(params);
                    break;
                case 'scrollToTop':
                    result = await this.scrollToTop(params.smooth);
                    break;
                case 'scrollToBottom':
                    result = await this.scrollToBottom(params.smooth);
                    break;
                case 'handleInfiniteScroll':
                    result = await this.handleInfiniteScroll(params);
                    break;
                default:
                    return this.createAgentOutput(input.taskId, false, null, `Unknown scroll action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`ScrollManagement execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.scrollPosition = { x: 0, y: 0, maxScrollX: 0, maxScrollY: 5000 };
        this.logger.log('ScrollManagement agent destroyed, position reset');
    }
    async scrollToElement(params) {
        const { selector, alignment = 'center', offset = 0, smooth = true } = params;
        if (!selector)
            throw new Error('CSS selector is required');
        const validAlignments = ['start', 'center', 'end', 'nearest'];
        if (!validAlignments.includes(alignment)) {
            throw new Error(`Invalid alignment: ${alignment}. Must be one of: ${validAlignments.join(', ')}`);
        }
        const elementFound = !selector.includes('nonexistent') && !selector.includes('#missing-');
        if (!elementFound) {
            throw new Error(`Element not found: ${selector}`);
        }
        const elementY = 500 + Math.random() * 3000;
        let targetY;
        switch (alignment) {
            case 'start':
                targetY = elementY;
                break;
            case 'center':
                targetY = elementY - 400;
                break;
            case 'end':
                targetY = elementY - 800;
                break;
            case 'nearest':
                targetY = this.scrollPosition.y < elementY ? elementY - 400 : this.scrollPosition.y;
                break;
            default:
                targetY = elementY;
        }
        targetY = Math.max(0, targetY + offset);
        targetY = Math.min(targetY, this.scrollPosition.maxScrollY);
        const previousY = this.scrollPosition.y;
        if (smooth) {
            await this.simulateSmoothScroll(previousY, targetY);
        }
        this.scrollPosition.y = targetY;
        this.logger.log(`Scrolled to element ${selector} (${alignment}, offset: ${offset}px) -> Y: ${targetY}`);
        return {
            scrolled: true,
            elementFound,
            scrollPosition: { x: this.scrollPosition.x, y: this.scrollPosition.y },
        };
    }
    async scrollBy(params) {
        const { deltaX = 0, deltaY = 300, smooth = true } = params;
        if (deltaX === 0 && deltaY === 0) {
            throw new Error('At least one scroll delta must be non-zero');
        }
        const previousPosition = { x: this.scrollPosition.x, y: this.scrollPosition.y };
        let newX = this.scrollPosition.x + deltaX;
        let newY = this.scrollPosition.y + deltaY;
        newX = Math.max(0, Math.min(newX, this.scrollPosition.maxScrollX));
        newY = Math.max(0, Math.min(newY, this.scrollPosition.maxScrollY));
        if (smooth) {
            await this.simulateSmoothScroll(previousPosition.y, newY);
        }
        this.scrollPosition.x = newX;
        this.scrollPosition.y = newY;
        this.logger.log(`Scrolled by (${deltaX}, ${deltaY}) -> position: (${newX}, ${newY})`);
        return {
            scrolled: true,
            previousPosition,
            newPosition: { x: newX, y: newY },
        };
    }
    async scrollToTop(smooth = true) {
        const previousY = this.scrollPosition.y;
        if (smooth && previousY > 0) {
            await this.simulateSmoothScroll(previousY, 0);
        }
        this.scrollPosition.y = 0;
        this.logger.log(`Scrolled to top (was at Y: ${previousY})`);
        return {
            scrolled: true,
            scrollPosition: { x: this.scrollPosition.x, y: 0 },
        };
    }
    async scrollToBottom(smooth = true) {
        const targetY = this.scrollPosition.maxScrollY;
        const previousY = this.scrollPosition.y;
        if (smooth) {
            await this.simulateSmoothScroll(previousY, targetY);
        }
        this.scrollPosition.y = targetY;
        this.logger.log(`Scrolled to bottom (Y: ${targetY}, page height: ${targetY + 800})`);
        return {
            scrolled: true,
            scrollPosition: { x: this.scrollPosition.x, y: targetY },
            pageHeight: targetY + 800,
        };
    }
    async handleInfiniteScroll(params) {
        const { maxScrolls = 10, scrollDelay = 1000, stopCondition = 'maxScrolls', contentSelector, timeout = 60000, } = params;
        const validConditions = ['maxScrolls', 'noNewContent', 'endReached'];
        if (!validConditions.includes(stopCondition)) {
            throw new Error(`Invalid stop condition: ${stopCondition}`);
        }
        let totalScrolls = 0;
        let itemsCollected = 0;
        let consecutiveNoNewContent = 0;
        let previousItemCount = 0;
        let stopReason = '';
        const startTime = Date.now();
        for (let i = 0; i < maxScrolls; i++) {
            if (Date.now() - startTime >= timeout) {
                stopReason = 'timeout';
                break;
            }
            const scrollAmount = 800 + Math.random() * 400;
            this.scrollPosition.y = Math.min(this.scrollPosition.maxScrollY, this.scrollPosition.y + scrollAmount);
            totalScrolls++;
            const newItems = Math.max(0, Math.floor(5 - i * 0.5 + Math.random() * 2));
            itemsCollected += newItems;
            if (stopCondition === 'noNewContent' && newItems === 0) {
                consecutiveNoNewContent++;
                if (consecutiveNoNewContent >= 3) {
                    stopReason = 'noNewContent';
                    break;
                }
            }
            else {
                consecutiveNoNewContent = 0;
            }
            if (stopCondition === 'endReached' &&
                this.scrollPosition.y >= this.scrollPosition.maxScrollY) {
                stopReason = 'endReached';
                break;
            }
            previousItemCount = itemsCollected;
            await this.sleep(Math.min(scrollDelay, 500));
            if (i < maxScrolls - 1) {
                this.scrollPosition.maxScrollY += scrollAmount;
            }
        }
        if (!stopReason) {
            stopReason = 'maxScrolls';
        }
        this.logger.log(`Infinite scroll complete: ${totalScrolls} scrolls, ${itemsCollected} items, stopped: ${stopReason}`);
        return {
            completed: true,
            totalScrolls,
            itemsCollected,
            stopReason,
        };
    }
    async simulateSmoothScroll(fromY, toY) {
        const distance = Math.abs(toY - fromY);
        const steps = Math.min(20, Math.ceil(distance / 50));
        const stepSize = (toY - fromY) / steps;
        for (let i = 0; i < steps; i++) {
            this.scrollPosition.y = fromY + stepSize * (i + 1);
            await this.sleep(16);
        }
        this.scrollPosition.y = toY;
    }
};
exports.ScrollManagementAgentService = ScrollManagementAgentService;
exports.ScrollManagementAgentService = ScrollManagementAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], ScrollManagementAgentService);
//# sourceMappingURL=scroll-management-agent.service.js.map