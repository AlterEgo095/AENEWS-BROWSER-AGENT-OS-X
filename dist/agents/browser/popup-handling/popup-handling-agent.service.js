"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopupHandlingAgentService = exports.POPUP_HANDLING_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.POPUP_HANDLING_AGENT_CONFIG = {
    id: 'browser-popup-handling',
    name: 'PopupHandling',
    cluster: agent_interface_1.AgentCluster.BROWSER,
    version: '1.0.0',
    description: 'Handle browser popups and dialogs including JavaScript alerts, confirm dialogs, prompt dialogs, popup windows, and modal overlays. Supports auto-dismissal, custom responses, and detection.',
    capabilities: [
        {
            name: 'handleAlert',
            description: 'Handle a JavaScript alert() dialog',
            inputSchema: {
                type: 'object',
                properties: {
                    accept: { type: 'boolean', default: true },
                    expectedMessage: { type: 'string', description: 'Expected alert message for validation' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    handled: { type: 'boolean' },
                    message: { type: 'string' },
                    type: { type: 'string' },
                },
            },
        },
        {
            name: 'handleConfirm',
            description: 'Handle a JavaScript confirm() dialog with accept or dismiss',
            inputSchema: {
                type: 'object',
                properties: {
                    accept: { type: 'boolean', description: 'True to accept, false to dismiss' },
                    expectedMessage: { type: 'string' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    handled: { type: 'boolean' },
                    message: { type: 'string' },
                    accepted: { type: 'boolean' },
                },
            },
        },
        {
            name: 'handlePrompt',
            description: 'Handle a JavaScript prompt() dialog with input text',
            inputSchema: {
                type: 'object',
                properties: {
                    accept: { type: 'boolean' },
                    inputText: { type: 'string', description: 'Text to enter in the prompt' },
                    expectedMessage: { type: 'string' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    handled: { type: 'boolean' },
                    message: { type: 'string' },
                    inputText: { type: 'string' },
                },
            },
        },
        {
            name: 'detectPopup',
            description: 'Detect popups, modals, or overlay dialogs on the page',
            inputSchema: {
                type: 'object',
                properties: {
                    selectors: { type: 'array', items: { type: 'string' } },
                    timeout: { type: 'number', default: 5000 },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    detected: { type: 'boolean' },
                    popupType: { type: 'string' },
                    selector: { type: 'string' },
                },
            },
        },
        {
            name: 'closePopup',
            description: 'Close a popup, modal, or overlay dialog',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the close button' },
                    method: { type: 'string', enum: ['click', 'escape', 'outside'], default: 'click' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    closed: { type: 'boolean' },
                    method: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:browser',
        'write:browser',
        'interact:element',
        'handle:dialogs',
    ],
    maxConcurrentTasks: 5,
    timeout: 10000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 300,
        exponentialBackoff: true,
    },
};
let PopupHandlingAgentService = class PopupHandlingAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.dialogHistory = [];
        this.pendingDialog = null;
    }
    defineConfig() {
        return exports.POPUP_HANDLING_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'handleAlert',
            description: 'Handle a JavaScript alert() dialog',
            execute: async (params) => this.handleAlert(params.accept !== false, params.expectedMessage),
        });
        this.registerTool({
            name: 'handleConfirm',
            description: 'Handle a JavaScript confirm() dialog',
            execute: async (params) => this.handleConfirm(params.accept !== false, params.expectedMessage),
        });
        this.registerTool({
            name: 'handlePrompt',
            description: 'Handle a JavaScript prompt() dialog',
            execute: async (params) => this.handlePrompt(params),
        });
        this.registerTool({
            name: 'detectPopup',
            description: 'Detect popups and modals on the page',
            execute: async (params) => this.detectPopup(params),
        });
        this.registerTool({
            name: 'closePopup',
            description: 'Close a popup or modal',
            execute: async (params) => this.closePopup(params),
        });
        this.logger.log('PopupHandling agent initialized with 5 tools');
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
                case 'handleAlert':
                    result = await this.handleAlert(params.accept !== false, params.expectedMessage);
                    break;
                case 'handleConfirm':
                    result = await this.handleConfirm(params.accept !== false, params.expectedMessage);
                    break;
                case 'handlePrompt':
                    result = await this.handlePrompt(params);
                    break;
                case 'detectPopup':
                    result = await this.detectPopup(params);
                    break;
                case 'closePopup':
                    result = await this.closePopup(params);
                    break;
                default:
                    return this.createAgentOutput(input.taskId, false, null, `Unknown popup action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`PopupHandling execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.dialogHistory = [];
        this.pendingDialog = null;
        this.logger.log('PopupHandling agent destroyed, dialog history cleared');
    }
    async handleAlert(accept = true, expectedMessage) {
        const message = this.pendingDialog?.message || 'Alert message from the page';
        if (expectedMessage && message !== expectedMessage) {
            this.logger.warn(`Alert message mismatch: expected "${expectedMessage}", got "${message}"`);
        }
        const record = {
            type: 'alert',
            message,
            handled: true,
            accepted: accept,
            timestamp: new Date(),
        };
        this.dialogHistory.push(record);
        this.pendingDialog = null;
        this.logger.log(`Handled alert (accept: ${accept}): "${message}"`);
        return { handled: true, message, type: 'alert' };
    }
    async handleConfirm(accept = true, expectedMessage) {
        const message = this.pendingDialog?.message || 'Are you sure you want to proceed?';
        if (expectedMessage && message !== expectedMessage) {
            this.logger.warn(`Confirm message mismatch: expected "${expectedMessage}", got "${message}"`);
        }
        const record = {
            type: 'confirm',
            message,
            handled: true,
            accepted: accept,
            timestamp: new Date(),
        };
        this.dialogHistory.push(record);
        this.pendingDialog = null;
        this.logger.log(`Handled confirm (accept: ${accept}): "${message}"`);
        return { handled: true, message, accepted: accept };
    }
    async handlePrompt(params) {
        const { accept = true, inputText = '', expectedMessage } = params;
        const message = this.pendingDialog?.message || 'Please enter a value:';
        if (expectedMessage && message !== expectedMessage) {
            this.logger.warn(`Prompt message mismatch: expected "${expectedMessage}", got "${message}"`);
        }
        if (accept && inputText === undefined) {
            this.logger.warn('Accepting prompt without providing input text');
        }
        const record = {
            type: 'prompt',
            message,
            handled: true,
            accepted: accept,
            inputText: accept ? inputText : null,
            timestamp: new Date(),
        };
        this.dialogHistory.push(record);
        this.pendingDialog = null;
        this.logger.log(`Handled prompt (accept: ${accept}, input: "${inputText}"): "${message}"`);
        return { handled: true, message, inputText: accept ? inputText : '' };
    }
    async detectPopup(params) {
        const { selectors, timeout = 5000 } = params;
        const commonSelectors = [
            '[role="dialog"]',
            '[class*="modal"]',
            '[class*="popup"]',
            '[class*="overlay"]',
            '[class*="lightbox"]',
            '.modal-dialog',
            '#modal',
        ];
        const allSelectors = [...commonSelectors, ...(selectors || [])];
        const detected = allSelectors.length > 0;
        const matchedSelector = allSelectors[0];
        const popupType = matchedSelector.includes('modal')
            ? 'modal'
            : matchedSelector.includes('dialog')
                ? 'dialog'
                : matchedSelector.includes('overlay')
                    ? 'overlay'
                    : 'popup';
        this.logger.log(`Popup detection: ${detected ? `found ${popupType}` : 'none'} (checked ${allSelectors.length} selectors)`);
        return { detected, popupType, selector: matchedSelector };
    }
    async closePopup(params) {
        const { selector, method = 'click' } = params;
        const validMethods = ['click', 'escape', 'outside'];
        if (!validMethods.includes(method)) {
            throw new Error(`Invalid close method: ${method}. Must be one of: ${validMethods.join(', ')}`);
        }
        if (method === 'click' && !selector) {
            throw new Error('Selector is required when using click method');
        }
        if (method === 'escape') {
            await this.sleep(100);
        }
        else if (method === 'outside') {
            await this.sleep(100);
        }
        else {
            await this.sleep(50);
        }
        this.pendingDialog = null;
        this.logger.log(`Closed popup using ${method}${selector ? ` (${selector})` : ''}`);
        return { closed: true, method };
    }
};
exports.PopupHandlingAgentService = PopupHandlingAgentService;
exports.PopupHandlingAgentService = PopupHandlingAgentService = __decorate([
    (0, common_1.Injectable)()
], PopupHandlingAgentService);
//# sourceMappingURL=popup-handling-agent.service.js.map