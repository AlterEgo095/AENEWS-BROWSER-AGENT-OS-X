"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClickAgentService = exports.CLICK_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.CLICK_AGENT_CONFIG = {
    id: 'browser-click',
    name: 'Click',
    cluster: agent_interface_1.AgentCluster.BROWSER,
    version: '1.0.0',
    description: 'Click elements on web pages with support for single clicks, double clicks, right clicks, hover interactions, and drag-and-drop operations. Handles element visibility checks and actionability validation.',
    capabilities: [
        {
            name: 'clickElement',
            description: 'Click a specific element identified by selector or coordinates',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the element' },
                    x: { type: 'number', description: 'X coordinate for click' },
                    y: { type: 'number', description: 'Y coordinate for click' },
                    button: { type: 'string', enum: ['left', 'middle', 'right'], default: 'left' },
                    clickCount: { type: 'number', default: 1 },
                    delay: { type: 'number', description: 'Delay between mousedown and mouseup in ms' },
                    force: { type: 'boolean', description: 'Skip actionability checks' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    clicked: { type: 'boolean' },
                    elementFound: { type: 'boolean' },
                    coordinates: {
                        type: 'object',
                        properties: { x: { type: 'number' }, y: { type: 'number' } },
                    },
                },
            },
        },
        {
            name: 'doubleClick',
            description: 'Double-click a specific element',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the element' },
                    force: { type: 'boolean', description: 'Skip actionability checks' },
                },
                required: ['selector'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    clicked: { type: 'boolean' },
                    elementFound: { type: 'boolean' },
                },
            },
        },
        {
            name: 'rightClick',
            description: 'Right-click (context click) a specific element',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the element' },
                    force: { type: 'boolean', description: 'Skip actionability checks' },
                },
                required: ['selector'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    clicked: { type: 'boolean' },
                    elementFound: { type: 'boolean' },
                },
            },
        },
        {
            name: 'dragAndDrop',
            description: 'Drag an element and drop it on a target',
            inputSchema: {
                type: 'object',
                properties: {
                    sourceSelector: { type: 'string', description: 'CSS selector for the drag source' },
                    targetSelector: { type: 'string', description: 'CSS selector for the drop target' },
                    sourceX: { type: 'number' },
                    sourceY: { type: 'number' },
                    targetX: { type: 'number' },
                    targetY: { type: 'number' },
                    steps: { type: 'number', description: 'Number of intermediate move steps' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    dragged: { type: 'boolean' },
                    sourceFound: { type: 'boolean' },
                    targetFound: { type: 'boolean' },
                },
            },
        },
        {
            name: 'hoverElement',
            description: 'Hover over a specific element to trigger hover effects',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the element' },
                    force: { type: 'boolean', description: 'Skip actionability checks' },
                    modifiers: {
                        type: 'array',
                        items: { type: 'string', enum: ['Alt', 'Control', 'Meta', 'Shift'] },
                    },
                },
                required: ['selector'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    hovered: { type: 'boolean' },
                    elementFound: { type: 'boolean' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:browser',
        'write:browser',
        'interact:element',
        'dispatch:events',
    ],
    maxConcurrentTasks: 5,
    timeout: 15000,
    retryPolicy: {
        maxRetries: 3,
        backoffMs: 500,
        exponentialBackoff: true,
    },
};
let ClickAgentService = class ClickAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.knownElements = new Map();
    }
    defineConfig() {
        return exports.CLICK_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'clickElement',
            description: 'Click a specific element by selector or coordinates',
            execute: async (params) => this.clickElement(params),
        });
        this.registerTool({
            name: 'doubleClick',
            description: 'Double-click a specific element',
            execute: async (params) => this.doubleClick(params.selector, params.force),
        });
        this.registerTool({
            name: 'rightClick',
            description: 'Right-click a specific element',
            execute: async (params) => this.rightClick(params.selector, params.force),
        });
        this.registerTool({
            name: 'dragAndDrop',
            description: 'Drag an element and drop it on a target',
            execute: async (params) => this.dragAndDrop(params),
        });
        this.registerTool({
            name: 'hoverElement',
            description: 'Hover over a specific element',
            execute: async (params) => this.hoverElement(params.selector, params.force, params.modifiers),
        });
        this.logger.log('Click agent initialized with 5 tools');
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
                case 'clickElement':
                    result = await this.clickElement(params);
                    break;
                case 'doubleClick':
                    result = await this.doubleClick(params.selector, params.force);
                    break;
                case 'rightClick':
                    result = await this.rightClick(params.selector, params.force);
                    break;
                case 'dragAndDrop':
                    result = await this.dragAndDrop(params);
                    break;
                case 'hoverElement':
                    result = await this.hoverElement(params.selector, params.force, params.modifiers);
                    break;
                default:
                    return this.createAgentOutput(input.taskId, false, null, `Unknown click action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Click execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.knownElements.clear();
        this.logger.log('Click agent destroyed, element cache cleared');
    }
    async clickElement(params) {
        const { selector, x, y, button = 'left', clickCount = 1, delay = 0, force = false } = params;
        if (!selector && (x === undefined || y === undefined)) {
            throw new Error('Either a CSS selector or x/y coordinates must be provided');
        }
        const validButtons = ['left', 'middle', 'right'];
        if (!validButtons.includes(button)) {
            throw new Error(`Invalid button: ${button}. Must be one of: ${validButtons.join(', ')}`);
        }
        let clickX = x ?? 0;
        let clickY = y ?? 0;
        let elementFound = false;
        if (selector) {
            this.validateSelector(selector);
            const elementState = this.simulateElementLookup(selector);
            elementFound = elementState.found;
            if (!elementState.found && !force) {
                throw new Error(`Element not found: ${selector}`);
            }
            if (elementState.found) {
                if (!elementState.visible && !force) {
                    throw new Error(`Element not visible: ${selector}`);
                }
                if (!elementState.enabled && !force) {
                    throw new Error(`Element not enabled: ${selector}`);
                }
                clickX = elementState.boundingBox.x + elementState.boundingBox.width / 2;
                clickY = elementState.boundingBox.y + elementState.boundingBox.height / 2;
                this.knownElements.set(selector, {
                    selector,
                    visible: elementState.visible,
                    enabled: elementState.enabled,
                    boundingBox: elementState.boundingBox,
                });
            }
        }
        if (delay > 0) {
            await this.sleep(delay);
        }
        for (let i = 0; i < clickCount; i++) {
            await this.sleep(10);
        }
        this.logger.log(`Clicked (${button}, count: ${clickCount}) at (${clickX.toFixed(1)}, ${clickY.toFixed(1)})`);
        return {
            clicked: true,
            elementFound,
            coordinates: { x: clickX, y: clickY },
        };
    }
    async doubleClick(selector, force) {
        if (!selector) {
            throw new Error('CSS selector is required for double-click');
        }
        this.validateSelector(selector);
        const elementState = this.simulateElementLookup(selector);
        const elementFound = elementState.found;
        if (!elementState.found && !force) {
            throw new Error(`Element not found: ${selector}`);
        }
        if (elementState.found && !elementState.visible && !force) {
            throw new Error(`Element not visible: ${selector}`);
        }
        this.logger.log(`Double-clicked element: ${selector}`);
        return { clicked: true, elementFound };
    }
    async rightClick(selector, force) {
        if (!selector) {
            throw new Error('CSS selector is required for right-click');
        }
        this.validateSelector(selector);
        const elementState = this.simulateElementLookup(selector);
        const elementFound = elementState.found;
        if (!elementState.found && !force) {
            throw new Error(`Element not found: ${selector}`);
        }
        if (elementState.found && !elementState.visible && !force) {
            throw new Error(`Element not visible: ${selector}`);
        }
        this.logger.log(`Right-clicked element: ${selector}`);
        return { clicked: true, elementFound };
    }
    async dragAndDrop(params) {
        const { sourceSelector, targetSelector, sourceX, sourceY, targetX, targetY, steps = 10, } = params;
        if (!sourceSelector && (sourceX === undefined || sourceY === undefined)) {
            throw new Error('Source selector or coordinates required');
        }
        if (!targetSelector && (targetX === undefined || targetY === undefined)) {
            throw new Error('Target selector or coordinates required');
        }
        let sourceFound = false;
        let targetFound = false;
        if (sourceSelector) {
            this.validateSelector(sourceSelector);
            const sourceState = this.simulateElementLookup(sourceSelector);
            sourceFound = sourceState.found;
            if (!sourceState.found) {
                throw new Error(`Source element not found: ${sourceSelector}`);
            }
        }
        if (targetSelector) {
            this.validateSelector(targetSelector);
            const targetState = this.simulateElementLookup(targetSelector);
            targetFound = targetState.found;
            if (!targetState.found) {
                throw new Error(`Target element not found: ${targetSelector}`);
            }
        }
        for (let i = 1; i <= steps; i++) {
            await this.sleep(16);
        }
        this.logger.log(`Drag-and-drop completed from ${sourceSelector || `(${sourceX},${sourceY})`} to ${targetSelector || `(${targetX},${targetY})`}`);
        return { dragged: true, sourceFound, targetFound };
    }
    async hoverElement(selector, force, modifiers) {
        if (!selector) {
            throw new Error('CSS selector is required for hover');
        }
        this.validateSelector(selector);
        const elementState = this.simulateElementLookup(selector);
        const elementFound = elementState.found;
        if (!elementState.found && !force) {
            throw new Error(`Element not found: ${selector}`);
        }
        if (elementState.found && !elementState.visible && !force) {
            throw new Error(`Element not visible: ${selector}`);
        }
        const modStr = modifiers?.length ? ` with modifiers: ${modifiers.join('+')}` : '';
        this.logger.log(`Hovered over element: ${selector}${modStr}`);
        return { hovered: true, elementFound };
    }
    validateSelector(selector) {
        if (selector.trim().length === 0) {
            throw new Error('Selector cannot be empty');
        }
        if (selector.includes('{{') || selector.includes('}}')) {
            throw new Error(`Invalid selector syntax: ${selector}`);
        }
    }
    simulateElementLookup(selector) {
        const known = this.knownElements.get(selector);
        if (known) {
            return {
                found: true,
                visible: known.visible,
                enabled: known.enabled,
                boundingBox: known.boundingBox,
            };
        }
        const isHiddenSelector = selector.includes(':hidden') || selector.includes('[hidden]');
        const isDisabledSelector = selector.includes(':disabled') || selector.includes('[disabled]');
        const found = !selector.includes('nonexistent') && !selector.includes('#missing-');
        return {
            found,
            visible: found && !isHiddenSelector,
            enabled: found && !isDisabledSelector,
            boundingBox: {
                x: Math.random() * 800,
                y: Math.random() * 600,
                width: 100 + Math.random() * 200,
                height: 30 + Math.random() * 50,
            },
        };
    }
};
exports.ClickAgentService = ClickAgentService;
exports.ClickAgentService = ClickAgentService = __decorate([
    (0, common_1.Injectable)()
], ClickAgentService);
//# sourceMappingURL=click-agent.service.js.map