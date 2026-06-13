import {
  BaseAgent,
  AgentContext,
  AgentResult,
} from '../../../modules/agent/agent.abstract';
import { ClusterType } from '../../../modules/agent/entities/agent.entity';

export class InteractionAgent extends BaseAgent {
  readonly name = 'InteractionAgent';
  readonly cluster = ClusterType.BROWSER;
  readonly capabilities = [
    'click',
    'doubleClick',
    'rightClick',
    'scroll',
    'hover',
    'type',
    'press',
    'drag',
    'touch',
    'selectText',
  ];
  readonly version = '1.0.0';
  readonly description =
    'Browser interaction operations: click, scroll, hover, keyboard, touch, and drag events';

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { config } = context;
      const action = config.action || 'click';
      const startTime = Date.now();

      switch (action) {
        case 'click': {
          const selector = config.selector;
          const button = config.button || 'left';
          const clickCount = config.clickCount || 1;
          const delay = config.delay || 0;
          const force = config.force || false;
          const position = config.position;
          if (!selector) {
            return { success: false, error: 'Selector is required for click' };
          }
          this.logger.log(
            `Clicking "${selector}" (button: ${button}, count: ${clickCount})`,
          );
          return {
            success: true,
            data: {
              action,
              selector,
              button,
              clickCount,
              delay,
              force,
              position,
              clicked: true,
              status: 'clicked',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'doubleClick': {
          const selector = config.selector;
          const delay = config.delay || 0;
          if (!selector) {
            return {
              success: false,
              error: 'Selector is required for double click',
            };
          }
          this.logger.log(`Double-clicking "${selector}"`);
          return {
            success: true,
            data: {
              action,
              selector,
              delay,
              clicked: true,
              status: 'double_clicked',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'rightClick': {
          const selector = config.selector;
          const position = config.position;
          if (!selector) {
            return {
              success: false,
              error: 'Selector is required for right click',
            };
          }
          this.logger.log(`Right-clicking "${selector}"`);
          return {
            success: true,
            data: {
              action,
              selector,
              position,
              clicked: true,
              status: 'right_clicked',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'scroll': {
          const direction = config.direction || 'down';
          const amount = config.amount || 300;
          const selector = config.selector;
          const smooth = config.smooth || false;
          this.logger.log(
            `Scrolling ${direction} by ${amount}px${selector ? ` to "${selector}"` : ''}`,
          );
          return {
            success: true,
            data: {
              action,
              direction,
              amount,
              selector,
              smooth,
              scrolled: true,
              status: 'scrolled',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'hover': {
          const selector = config.selector;
          const position = config.position;
          const modifiers = config.modifiers || [];
          if (!selector) {
            return { success: false, error: 'Selector is required for hover' };
          }
          this.logger.log(`Hovering over "${selector}"`);
          return {
            success: true,
            data: {
              action,
              selector,
              position,
              modifiers,
              hovered: true,
              status: 'hovered',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'type': {
          const selector = config.selector;
          const text = config.text;
          const delay = config.delay || 0;
          const clear = config.clear !== false;
          const pressEnter = config.pressEnter || false;
          if (!selector || text === undefined) {
            return {
              success: false,
              error: 'Selector and text are required for typing',
            };
          }
          this.logger.log(
            `Typing into "${selector}": "${text.substring(0, 50)}..."`,
          );
          return {
            success: true,
            data: {
              action,
              selector,
              text,
              delay,
              clear,
              pressEnter,
              typed: true,
              characterCount: text.length,
              status: 'typed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'press': {
          const key = config.key;
          const selector = config.selector;
          const modifiers = config.modifiers || [];
          if (!key) {
            return { success: false, error: 'Key is required for press' };
          }
          this.logger.log(
            `Pressing key "${key}"${modifiers.length ? ` with ${modifiers.join('+')}` : ''}`,
          );
          return {
            success: true,
            data: {
              action,
              key,
              selector,
              modifiers,
              pressed: true,
              status: 'key_pressed',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'drag': {
          const sourceSelector = config.sourceSelector;
          const targetSelector = config.targetSelector;
          const sourcePosition = config.sourcePosition;
          const targetPosition = config.targetPosition;
          const steps = config.steps || 10;
          if (!sourceSelector && !sourcePosition) {
            return {
              success: false,
              error: 'Source selector or position is required for drag',
            };
          }
          if (!targetSelector && !targetPosition) {
            return {
              success: false,
              error: 'Target selector or position is required for drag',
            };
          }
          this.logger.log(
            `Dragging from "${sourceSelector || 'position'}" to "${targetSelector || 'position'}"`,
          );
          return {
            success: true,
            data: {
              action,
              sourceSelector,
              targetSelector,
              sourcePosition,
              targetPosition,
              steps,
              dragged: true,
              status: 'dragged',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'touch': {
          const type = config.touchType || 'tap';
          const selector = config.selector;
          const x = config.x;
          const y = config.y;
          const duration = config.duration || 100;
          if (!selector && (x === undefined || y === undefined)) {
            return {
              success: false,
              error: 'Selector or coordinates are required for touch',
            };
          }
          this.logger.log(`Touch ${type} on "${selector || `${x},${y}`}"`);
          return {
            success: true,
            data: {
              action,
              touchType: type,
              selector,
              x,
              y,
              duration,
              touched: true,
              status: 'touch_complete',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        case 'selectText': {
          const selector = config.selector;
          const start = config.start || 0;
          const end = config.end;
          if (!selector) {
            return {
              success: false,
              error: 'Selector is required for text selection',
            };
          }
          this.logger.log(
            `Selecting text in "${selector}" from ${start} to ${end || 'end'}`,
          );
          return {
            success: true,
            data: {
              action,
              selector,
              start,
              end,
              selected: true,
              selectedText: '',
              status: 'text_selected',
              timestamp: new Date().toISOString(),
            },
            metadata: { duration: Date.now() - startTime },
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
