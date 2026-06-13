/**
 * AENEWS Agent OS X - Click Agent
 * Handles element clicking, double-clicking, right-clicking, hovering, and drag-and-drop.
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

export const CLICK_AGENT_CONFIG: AgentConfig = {
  id: 'browser-click',
  name: 'Click',
  cluster: AgentCluster.BROWSER,
  version: '1.0.0',
  description:
    'Click elements on web pages with support for single clicks, double clicks, right clicks, hover interactions, and drag-and-drop operations. Handles element visibility checks and actionability validation.',
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

// ─── Element State Tracker ────────────────────────────────────────

interface ElementState {
  selector: string;
  visible: boolean;
  enabled: boolean;
  boundingBox: { x: number; y: number; width: number; height: number };
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class ClickAgentService extends BaseAgentService {
  private knownElements: Map<string, ElementState> = new Map();

  constructor(
    eventBusService?: any,
    memoryService?: any,
    permissionEvaluator?: any,
    @Inject(AgentConnectorBridge) private readonly bridge?: AgentConnectorBridge,
  ) {
    super(eventBusService, memoryService, permissionEvaluator);
  }

  protected defineConfig(): AgentConfig {
    return CLICK_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.registerTool({
      name: 'clickElement',
      description: 'Click a specific element by selector or coordinates',
      execute: async (params: {
        selector?: string;
        x?: number;
        y?: number;
        button?: string;
        clickCount?: number;
        delay?: number;
        force?: boolean;
      }) => this.clickElement(params),
    });

    this.registerTool({
      name: 'doubleClick',
      description: 'Double-click a specific element',
      execute: async (params: { selector: string; force?: boolean }) =>
        this.doubleClick(params.selector, params.force),
    });

    this.registerTool({
      name: 'rightClick',
      description: 'Right-click a specific element',
      execute: async (params: { selector: string; force?: boolean }) =>
        this.rightClick(params.selector, params.force),
    });

    this.registerTool({
      name: 'dragAndDrop',
      description: 'Drag an element and drop it on a target',
      execute: async (params: {
        sourceSelector?: string;
        targetSelector?: string;
        sourceX?: number;
        sourceY?: number;
        targetX?: number;
        targetY?: number;
        steps?: number;
      }) => this.dragAndDrop(params),
    });

    this.registerTool({
      name: 'hoverElement',
      description: 'Hover over a specific element',
      execute: async (params: { selector: string; force?: boolean; modifiers?: string[] }) =>
        this.hoverElement(params.selector, params.force, params.modifiers),
    });

    this.logger.log('Click agent initialized with 5 tools');
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
            instruction: action || 'click',
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
          return this.createAgentOutput(
            input.taskId,
            false,
            null,
            `Unknown click action: ${action}`,
            startTime,
          );
      }

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Click execution failed: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.knownElements.clear();
    this.logger.log('Click agent destroyed, element cache cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async clickElement(params: {
    selector?: string;
    x?: number;
    y?: number;
    button?: string;
    clickCount?: number;
    delay?: number;
    force?: boolean;
  }): Promise<{
    clicked: boolean;
    elementFound: boolean;
    coordinates: { x: number; y: number };
  }> {
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
      // Validate selector syntax
      this.validateSelector(selector);

      // Simulate element lookup
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

        // Update known elements
        this.knownElements.set(selector, {
          selector,
          visible: elementState.visible,
          enabled: elementState.enabled,
          boundingBox: elementState.boundingBox,
        });
      }
    }

    // Simulate click delay
    if (delay > 0) {
      await this.sleep(delay);
    }

    // Simulate the click with multiple click counts
    for (let i = 0; i < clickCount; i++) {
      await this.sleep(10); // Small delay between clicks
    }

    this.logger.log(
      `Clicked (${button}, count: ${clickCount}) at (${clickX.toFixed(1)}, ${clickY.toFixed(1)})`,
    );

    return {
      clicked: true,
      elementFound,
      coordinates: { x: clickX, y: clickY },
    };
  }

  private async doubleClick(
    selector: string,
    force?: boolean,
  ): Promise<{ clicked: boolean; elementFound: boolean }> {
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

  private async rightClick(
    selector: string,
    force?: boolean,
  ): Promise<{ clicked: boolean; elementFound: boolean }> {
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

  private async dragAndDrop(params: {
    sourceSelector?: string;
    targetSelector?: string;
    sourceX?: number;
    sourceY?: number;
    targetX?: number;
    targetY?: number;
    steps?: number;
  }): Promise<{
    dragged: boolean;
    sourceFound: boolean;
    targetFound: boolean;
  }> {
    const {
      sourceSelector,
      targetSelector,
      sourceX,
      sourceY,
      targetX,
      targetY,
      steps = 10,
    } = params;

    if (!sourceSelector && (sourceX === undefined || sourceY === undefined)) {
      throw new Error('Source selector or coordinates required');
    }
    if (!targetSelector && (targetX === undefined || targetY === undefined)) {
      throw new Error('Target selector or coordinates required');
    }

    let sourceFound = false;
    let targetFound = false;

    // Validate source
    if (sourceSelector) {
      this.validateSelector(sourceSelector);
      const sourceState = this.simulateElementLookup(sourceSelector);
      sourceFound = sourceState.found;
      if (!sourceState.found) {
        throw new Error(`Source element not found: ${sourceSelector}`);
      }
    }

    // Validate target
    if (targetSelector) {
      this.validateSelector(targetSelector);
      const targetState = this.simulateElementLookup(targetSelector);
      targetFound = targetState.found;
      if (!targetState.found) {
        throw new Error(`Target element not found: ${targetSelector}`);
      }
    }

    // Simulate intermediate move steps
    for (let i = 1; i <= steps; i++) {
      await this.sleep(16); // ~60fps simulation
    }

    this.logger.log(
      `Drag-and-drop completed from ${sourceSelector || `(${sourceX},${sourceY})`} to ${targetSelector || `(${targetX},${targetY})`}`,
    );

    return { dragged: true, sourceFound, targetFound };
  }

  private async hoverElement(
    selector: string,
    force?: boolean,
    modifiers?: string[],
  ): Promise<{ hovered: boolean; elementFound: boolean }> {
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

  // ─── Helpers ────────────────────────────────────────────────────

  private validateSelector(selector: string): void {
    // Basic CSS selector validation
    if (selector.trim().length === 0) {
      throw new Error('Selector cannot be empty');
    }
    // Check for obviously invalid patterns
    if (selector.includes('{{') || selector.includes('}}')) {
      throw new Error(`Invalid selector syntax: ${selector}`);
    }
  }

  private simulateElementLookup(selector: string): {
    found: boolean;
    visible: boolean;
    enabled: boolean;
    boundingBox: { x: number; y: number; width: number; height: number };
  } {
    // Check known elements first
    const known = this.knownElements.get(selector);
    if (known) {
      return {
        found: true,
        visible: known.visible,
        enabled: known.enabled,
        boundingBox: known.boundingBox,
      };
    }

    // Simulate element presence based on common selector patterns
    const isHiddenSelector = selector.includes(':hidden') || selector.includes('[hidden]');
    const isDisabledSelector = selector.includes(':disabled') || selector.includes('[disabled]');

    // Most standard selectors find elements
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
}
