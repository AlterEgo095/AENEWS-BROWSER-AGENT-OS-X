/**
 * AENEWS Agent OS X - Form Filling Agent
 * Handles form interactions: text input, dropdowns, checkboxes, radio buttons, file uploads, and field clearing.
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

export const FORM_FILLING_AGENT_CONFIG: AgentConfig = {
  id: 'browser-form-filling',
  name: 'FormFilling',
  cluster: AgentCluster.BROWSER,
  version: '1.0.0',
  description:
    'Fill forms on web pages including text fields, dropdowns, checkboxes, radio buttons, and file uploads. Supports field clearing, validation, and multi-step form workflows.',
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

// ─── Form State Tracker ───────────────────────────────────────────

interface FieldState {
  selector: string;
  type: string;
  value: string;
  checked: boolean;
  options: string[];
  disabled: boolean;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class FormFillingAgentService extends BaseAgentService {
  private formState: Map<string, FieldState> = new Map();

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }

  protected defineConfig(): AgentConfig {
    return FORM_FILLING_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'fillField',
      description: 'Fill a text input field with a value',
      execute: async (params: {
        selector: string;
        value: string;
        clear?: boolean;
        delay?: number;
        pressEnter?: boolean;
      }) => this.fillField(params),
    });

    this.registerTool({
      name: 'selectDropdown',
      description: 'Select an option from a dropdown element',
      execute: async (params: {
        selector: string;
        value?: string;
        label?: string;
        index?: number;
      }) => this.selectDropdown(params),
    });

    this.registerTool({
      name: 'checkCheckbox',
      description: 'Check or uncheck a checkbox',
      execute: async (params: { selector: string; checked?: boolean }) =>
        this.checkCheckbox(params.selector, params.checked),
    });

    this.registerTool({
      name: 'selectRadio',
      description: 'Select a radio button',
      execute: async (params: { selector?: string; value?: string; name?: string }) =>
        this.selectRadio(params),
    });

    this.registerTool({
      name: 'uploadFile',
      description: 'Upload a file to a file input',
      execute: async (params: { selector: string; filePath: string; fileName?: string }) =>
        this.uploadFile(params),
    });

    this.registerTool({
      name: 'clearField',
      description: 'Clear the content of an input field',
      execute: async (params: { selector: string }) => this.clearField(params.selector),
    });

    this.logger.log('FormFilling agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;

    // Try real connector first via bridge
    if (this.bridge) {
      try {
        const result: ConnectorOutput = await this.bridge.executeCapability(
          BrowserCapability.FORM,
          {
            missionId: input.taskId,
            instruction: action || 'fillForm',
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
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown form action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`FormFilling execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.formState.clear();
    this.logger.log('FormFilling agent destroyed, form state cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async fillField(params: {
    selector: string;
    value: string;
    clear?: boolean;
    delay?: number;
    pressEnter?: boolean;
  }): Promise<{ filled: boolean; previousValue: string; newValue: string }> {
    const { selector, value, clear = true, delay = 0, pressEnter = false } = params;

    if (!selector) throw new Error('Selector is required');
    if (value === undefined || value === null) throw new Error('Value is required');

    // Get or create field state
    const previousValue = this.getOrCreateFieldState(selector, 'text').value;

    // Clear the field if requested
    if (clear && previousValue) {
      this.formState.set(selector, {
        ...this.formState.get(selector)!,
        value: '',
      });
    }

    // Simulate typing delay
    if (delay > 0) {
      for (let i = 0; i < value.length; i++) {
        await this.sleep(delay);
      }
    }

    // Set the value
    this.formState.set(selector, {
      ...this.formState.get(selector)!,
      value: clear ? value : previousValue + value,
    });

    if (pressEnter) {
      await this.sleep(50);
    }

    const newValue = this.formState.get(selector)!.value;

    this.logger.log(`Filled field ${selector} with "${newValue}" (was: "${previousValue}")`);

    return { filled: true, previousValue, newValue };
  }

  private async selectDropdown(params: {
    selector: string;
    value?: string;
    label?: string;
    index?: number;
  }): Promise<{ selected: boolean; selectedValue: string; selectedLabel: string }> {
    const { selector, value, label, index } = params;

    if (!selector) throw new Error('Selector is required');
    if (value === undefined && label === undefined && index === undefined) {
      throw new Error('One of value, label, or index must be provided');
    }

    const fieldState = this.getOrCreateFieldState(selector, 'select');

    if (fieldState.disabled) {
      throw new Error(`Select element is disabled: ${selector}`);
    }

    // Simulate available options
    const availableOptions =
      fieldState.options.length > 0 ? fieldState.options : ['option1', 'option2', 'option3'];

    let selectedValue: string;
    let selectedLabel: string;

    if (value !== undefined) {
      selectedValue = value;
      selectedLabel = label || value;
    } else if (label !== undefined) {
      selectedValue = label.toLowerCase().replace(/\s+/g, '_');
      selectedLabel = label;
    } else if (index !== undefined) {
      if (index < 0 || index >= availableOptions.length) {
        throw new Error(`Option index ${index} out of range (0-${availableOptions.length - 1})`);
      }
      selectedValue = availableOptions[index];
      selectedLabel = availableOptions[index];
    } else {
      throw new Error('No selection criteria provided');
    }

    this.formState.set(selector, {
      ...fieldState,
      value: selectedValue,
    });

    this.logger.log(`Selected option "${selectedLabel}" (${selectedValue}) in ${selector}`);

    return { selected: true, selectedValue, selectedLabel };
  }

  private async checkCheckbox(
    selector: string,
    checked: boolean = true,
  ): Promise<{ isChecked: boolean; previousState: boolean }> {
    if (!selector) throw new Error('Selector is required');

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

  private async selectRadio(params: {
    selector?: string;
    value?: string;
    name?: string;
  }): Promise<{ selected: boolean; selectedValue: string }> {
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

    // Uncheck all other radios in the same group
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

  private async uploadFile(params: {
    selector: string;
    filePath: string;
    fileName?: string;
  }): Promise<{ uploaded: boolean; fileName: string; fileSize: number }> {
    const { selector, filePath, fileName } = params;

    if (!selector) throw new Error('Selector is required');
    if (!filePath) throw new Error('File path is required');

    // Validate file path format
    if (!filePath.includes('/') && !filePath.includes('\\') && !filePath.includes('.')) {
      throw new Error(`Invalid file path format: ${filePath}`);
    }

    const derivedFileName = fileName || filePath.split(/[\\/]/).pop() || 'unknown';

    // Simulate file size based on extension
    const extension = derivedFileName.split('.').pop()?.toLowerCase() || '';
    const simulatedSizes: Record<string, number> = {
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

  private async clearField(selector: string): Promise<{
    cleared: boolean;
    previousValue: string;
  }> {
    if (!selector) throw new Error('Selector is required');

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

  // ─── Helpers ────────────────────────────────────────────────────

  private getOrCreateFieldState(selector: string, type: string): FieldState {
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
}
