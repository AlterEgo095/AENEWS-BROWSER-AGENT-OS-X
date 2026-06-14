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
exports.FormFillingAgentService = exports.FORM_FILLING_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.FORM_FILLING_AGENT_CONFIG = {
    id: 'browser-form-filling',
    name: 'FormFilling',
    cluster: agent_interface_1.AgentCluster.BROWSER,
    version: '1.0.0',
    description: 'Fill forms on web pages including text fields, dropdowns, checkboxes, radio buttons, and file uploads. Supports field clearing, validation, and multi-step form workflows.',
    capabilities: [
        {
            name: 'fillField',
            description: 'Fill a text input field with a value, with optional clear-first behavior',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the input field' },
                    value: { type: 'string', description: 'Value to fill in' },
                    clear: { type: 'boolean', default: true, description: 'Clear field before filling' },
                    delay: { type: 'number', description: 'Typing delay between characters in ms' },
                    pressEnter: { type: 'boolean', description: 'Press Enter after filling' },
                },
                required: ['selector', 'value'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    filled: { type: 'boolean' },
                    previousValue: { type: 'string' },
                    newValue: { type: 'string' },
                },
            },
        },
        {
            name: 'selectDropdown',
            description: 'Select an option from a dropdown/select element',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the select element' },
                    value: { type: 'string', description: 'Value of the option to select' },
                    label: { type: 'string', description: 'Visible text of the option to select' },
                    index: { type: 'number', description: 'Index of the option to select' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    selected: { type: 'boolean' },
                    selectedValue: { type: 'string' },
                    selectedLabel: { type: 'string' },
                },
            },
        },
        {
            name: 'checkCheckbox',
            description: 'Check or uncheck a checkbox element',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the checkbox' },
                    checked: { type: 'boolean', description: 'True to check, false to uncheck' },
                },
                required: ['selector'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    isChecked: { type: 'boolean' },
                    previousState: { type: 'boolean' },
                },
            },
        },
        {
            name: 'selectRadio',
            description: 'Select a radio button option',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the radio button' },
                    value: { type: 'string', description: 'Value of the radio to select' },
                    name: { type: 'string', description: 'Name attribute of the radio group' },
                },
            },
            outputSchema: {
                type: 'object',
                properties: {
                    selected: { type: 'boolean' },
                    selectedValue: { type: 'string' },
                },
            },
        },
        {
            name: 'uploadFile',
            description: 'Upload a file to a file input element',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the file input' },
                    filePath: { type: 'string', description: 'Path to the file to upload' },
                    fileName: { type: 'string', description: 'Expected file name' },
                },
                required: ['selector', 'filePath'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    uploaded: { type: 'boolean' },
                    fileName: { type: 'string' },
                    fileSize: { type: 'number' },
                },
            },
        },
        {
            name: 'clearField',
            description: 'Clear the content of an input field',
            inputSchema: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector for the input field' },
                },
                required: ['selector'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    cleared: { type: 'boolean' },
                    previousValue: { type: 'string' },
                },
            },
        },
    ],
    permissions: ['execute:task', 'read:browser', 'write:browser', 'interact:element', 'upload:file'],
    maxConcurrentTasks: 5,
    timeout: 20000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 800,
        exponentialBackoff: true,
    },
};
let FormFillingAgentService = class FormFillingAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.formState = new Map();
    }
    defineConfig() {
        return exports.FORM_FILLING_AGENT_CONFIG;
    }
    async onInitialize() {
        this.registerTool({
            name: 'fillField',
            description: 'Fill a text input field with a value',
            execute: async (params) => this.fillField(params),
        });
        this.registerTool({
            name: 'selectDropdown',
            description: 'Select an option from a dropdown element',
            execute: async (params) => this.selectDropdown(params),
        });
        this.registerTool({
            name: 'checkCheckbox',
            description: 'Check or uncheck a checkbox',
            execute: async (params) => this.checkCheckbox(params.selector, params.checked),
        });
        this.registerTool({
            name: 'selectRadio',
            description: 'Select a radio button',
            execute: async (params) => this.selectRadio(params),
        });
        this.registerTool({
            name: 'uploadFile',
            description: 'Upload a file to a file input',
            execute: async (params) => this.uploadFile(params),
        });
        this.registerTool({
            name: 'clearField',
            description: 'Clear the content of an input field',
            execute: async (params) => this.clearField(params.selector),
        });
        this.logger.log('FormFilling agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.BrowserCapability.FORM, {
                    missionId: input.taskId,
                    instruction: action || 'fillForm',
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
                case 'fillField':
                    result = await this.fillField(params);
                    break;
                case 'selectDropdown':
                    result = await this.selectDropdown(params);
                    break;
                case 'checkCheckbox':
                    result = await this.checkCheckbox(params.selector, params.checked);
                    break;
                case 'selectRadio':
                    result = await this.selectRadio(params);
                    break;
                case 'uploadFile':
                    result = await this.uploadFile(params);
                    break;
                case 'clearField':
                    result = await this.clearField(params.selector);
                    break;
                default:
                    return this.createAgentOutput(input.taskId, false, null, `Unknown form action: ${action}`, startTime);
            }
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`FormFilling execution failed: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.formState.clear();
        this.logger.log('FormFilling agent destroyed, form state cleared');
    }
    async fillField(params) {
        const { selector, value, clear = true, delay = 0, pressEnter = false } = params;
        if (!selector)
            throw new Error('Selector is required');
        if (value === undefined || value === null)
            throw new Error('Value is required');
        const previousValue = this.getOrCreateFieldState(selector, 'text').value;
        if (clear && previousValue) {
            this.formState.set(selector, {
                ...this.formState.get(selector),
                value: '',
            });
        }
        if (delay > 0) {
            for (let i = 0; i < value.length; i++) {
                await this.sleep(delay);
            }
        }
        this.formState.set(selector, {
            ...this.formState.get(selector),
            value: clear ? value : previousValue + value,
        });
        if (pressEnter) {
            await this.sleep(50);
        }
        const newValue = this.formState.get(selector).value;
        this.logger.log(`Filled field ${selector} with "${newValue}" (was: "${previousValue}")`);
        return { filled: true, previousValue, newValue };
    }
    async selectDropdown(params) {
        const { selector, value, label, index } = params;
        if (!selector)
            throw new Error('Selector is required');
        if (value === undefined && label === undefined && index === undefined) {
            throw new Error('One of value, label, or index must be provided');
        }
        const fieldState = this.getOrCreateFieldState(selector, 'select');
        if (fieldState.disabled) {
            throw new Error(`Select element is disabled: ${selector}`);
        }
        const availableOptions = fieldState.options.length > 0 ? fieldState.options : ['option1', 'option2', 'option3'];
        let selectedValue;
        let selectedLabel;
        if (value !== undefined) {
            selectedValue = value;
            selectedLabel = label || value;
        }
        else if (label !== undefined) {
            selectedValue = label.toLowerCase().replace(/\s+/g, '_');
            selectedLabel = label;
        }
        else if (index !== undefined) {
            if (index < 0 || index >= availableOptions.length) {
                throw new Error(`Option index ${index} out of range (0-${availableOptions.length - 1})`);
            }
            selectedValue = availableOptions[index];
            selectedLabel = availableOptions[index];
        }
        else {
            throw new Error('No selection criteria provided');
        }
        this.formState.set(selector, {
            ...fieldState,
            value: selectedValue,
        });
        this.logger.log(`Selected option "${selectedLabel}" (${selectedValue}) in ${selector}`);
        return { selected: true, selectedValue, selectedLabel };
    }
    async checkCheckbox(selector, checked = true) {
        if (!selector)
            throw new Error('Selector is required');
        const fieldState = this.getOrCreateFieldState(selector, 'checkbox');
        const previousState = fieldState.checked;
        if (fieldState.disabled) {
            throw new Error(`Checkbox is disabled: ${selector}`);
        }
        this.formState.set(selector, {
            ...fieldState,
            checked,
            value: checked ? 'on' : '',
        });
        this.logger.log(`${checked ? 'Checked' : 'Unchecked'} ${selector} (was: ${previousState})`);
        return { isChecked: checked, previousState };
    }
    async selectRadio(params) {
        const { selector, value, name } = params;
        if (!selector && !name && !value) {
            throw new Error('At least one of selector, name, or value is required');
        }
        const radioSelector = selector || `input[type="radio"][name="${name}"][value="${value}"]`;
        const fieldState = this.getOrCreateFieldState(radioSelector, 'radio');
        const selectedValue = value || fieldState.value || 'radio_option';
        if (fieldState.disabled) {
            throw new Error(`Radio button is disabled: ${radioSelector}`);
        }
        if (name) {
            for (const [key, state] of this.formState.entries()) {
                if (state.type === 'radio' && key !== radioSelector) {
                    this.formState.set(key, { ...state, checked: false, value: '' });
                }
            }
        }
        this.formState.set(radioSelector, {
            ...fieldState,
            checked: true,
            value: selectedValue,
        });
        this.logger.log(`Selected radio ${radioSelector} with value "${selectedValue}"`);
        return { selected: true, selectedValue };
    }
    async uploadFile(params) {
        const { selector, filePath, fileName } = params;
        if (!selector)
            throw new Error('Selector is required');
        if (!filePath)
            throw new Error('File path is required');
        if (!filePath.includes('/') && !filePath.includes('\\') && !filePath.includes('.')) {
            throw new Error(`Invalid file path format: ${filePath}`);
        }
        const derivedFileName = fileName || filePath.split(/[\\/]/).pop() || 'unknown';
        const extension = derivedFileName.split('.').pop()?.toLowerCase() || '';
        const simulatedSizes = {
            txt: 2048,
            csv: 15360,
            pdf: 524288,
            png: 1048576,
            jpg: 786432,
            docx: 262144,
            xlsx: 131072,
        };
        const fileSize = simulatedSizes[extension] || 10240;
        const fieldState = this.getOrCreateFieldState(selector, 'file');
        if (fieldState.disabled) {
            throw new Error(`File input is disabled: ${selector}`);
        }
        this.formState.set(selector, {
            ...fieldState,
            value: filePath,
        });
        this.logger.log(`Uploaded file "${derivedFileName}" (${fileSize} bytes) to ${selector}`);
        return { uploaded: true, fileName: derivedFileName, fileSize };
    }
    async clearField(selector) {
        if (!selector)
            throw new Error('Selector is required');
        const fieldState = this.formState.get(selector);
        const previousValue = fieldState?.value || '';
        this.formState.set(selector, {
            selector,
            type: fieldState?.type || 'text',
            value: '',
            checked: false,
            options: fieldState?.options || [],
            disabled: fieldState?.disabled || false,
        });
        this.logger.log(`Cleared field ${selector} (was: "${previousValue}")`);
        return { cleared: true, previousValue };
    }
    getOrCreateFieldState(selector, type) {
        let state = this.formState.get(selector);
        if (!state) {
            state = {
                selector,
                type,
                value: '',
                checked: false,
                options: type === 'select' ? ['option1', 'option2', 'option3'] : [],
                disabled: selector.includes('[disabled]') || selector.includes(':disabled'),
            };
            this.formState.set(selector, state);
        }
        return state;
    }
};
exports.FormFillingAgentService = FormFillingAgentService;
exports.FormFillingAgentService = FormFillingAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], FormFillingAgentService);
//# sourceMappingURL=form-filling-agent.service.js.map