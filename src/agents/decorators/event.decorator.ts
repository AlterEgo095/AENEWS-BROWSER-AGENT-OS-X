/**
 * AENEWS Agent OS X - @OnAgentEvent() Decorator
 * Subscribes a method to agent events with optional filtering.
 * Supports both simplified (eventType string) and full options.
 */

import { SetMetadata } from '@nestjs/common';
import {
  AgentEventType,
  EventFilter,
  AgentEvent,
} from '../interfaces/agent-event.interface';

// ─── Event Handler Metadata Key ───────────────────────────────────
export const EVENT_HANDLER_METADATA_KEY = 'agent:event_handler';
export const EVENT_HANDLERS_METADATA_KEY = 'agent:event_handlers';

// ─── Event Handler Metadata ───────────────────────────────────────
export interface EventHandlerMetadata {
  eventType: AgentEventType | string;
  filter?: EventFilter;
  methodName: string;
  priority?: number;
}

// ─── OnAgentEvent Options ─────────────────────────────────────────
export interface OnAgentEventOptions {
  /** Event type to listen for, or '*' for all events */
  eventType: AgentEventType | string;

  /** Optional filter to apply to events */
  filter?: EventFilter;

  /** Handler priority (higher = called first) */
  priority?: number;
}

/**
 * @OnAgentEvent() decorator
 *
 * Subscribes a method to handle agent events of the specified type.
 * The method will be called automatically when matching events are published.
 *
 * Supports two calling conventions:
 *
 * 1. Full options object:
 * @example
 * ```typescript
 * @OnAgentEvent({ eventType: AgentEventType.TASK_COMPLETED })
 * async handleTaskCompleted(event: AgentEvent<TaskCompletedPayload>) {
 *   this.logger.log(`Task completed: ${event.payload.taskId}`);
 * }
 *
 * @OnAgentEvent({
 *   eventType: AgentEventType.AGENT_ERROR,
 *   filter: { cluster: AgentCluster.BROWSER },
 * })
 * async handleBrowserError(event: AgentEvent<AgentErrorPayload>) {
 *   // Only handle errors from browser agents
 * }
 * ```
 *
 * 2. Simplified (eventType string):
 * @example
 * ```typescript
 * @OnAgentEvent(AgentEventType.TASK_COMPLETED)
 * async handleTaskCompleted(event: AgentEvent) {
 *   this.logger.log(`Task completed: ${event.payload.taskId}`);
 * }
 *
 * @OnAgentEvent('custom.event.type')
 * async handleCustomEvent(event: AgentEvent) {
 *   // Handle custom event type
 * }
 * ```
 */
export function OnAgentEvent(options: OnAgentEventOptions): MethodDecorator;
export function OnAgentEvent(eventType: AgentEventType | string): MethodDecorator;
export function OnAgentEvent(
  optionsOrEventType: OnAgentEventOptions | AgentEventType | string,
): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const methodName = typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey;

    let metadata: EventHandlerMetadata;

    if (typeof optionsOrEventType === 'string') {
      // Simplified signature: OnAgentEvent(eventType)
      metadata = {
        eventType: optionsOrEventType,
        methodName,
        priority: 0,
      };
    } else {
      // Full options signature: OnAgentEvent(options)
      metadata = {
        eventType: optionsOrEventType.eventType,
        filter: optionsOrEventType.filter,
        methodName,
        priority: optionsOrEventType.priority || 0,
      };
    }

    // Set method-specific metadata
    SetMetadata(EVENT_HANDLER_METADATA_KEY, metadata)(target, propertyKey, descriptor);

    // Accumulate handlers on the class
    const existingHandlers: EventHandlerMetadata[] =
      Reflect.getMetadata(EVENT_HANDLERS_METADATA_KEY, target.constructor) || [];

    existingHandlers.push(metadata);
    Reflect.defineMetadata(
      EVENT_HANDLERS_METADATA_KEY,
      existingHandlers,
      target.constructor,
    );

    // Also store on constructor for easy access
    if (!(target.constructor as any).__eventHandlers) {
      (target.constructor as any).__eventHandlers = [];
    }
    (target.constructor as any).__eventHandlers.push(metadata);

    return descriptor;
  };
}

/**
 * Helper to extract all event handler metadata from a class.
 */
export function getEventHandlerMetadata(target: Function): EventHandlerMetadata[] {
  return (
    (target as any).__eventHandlers ||
    Reflect.getMetadata(EVENT_HANDLERS_METADATA_KEY, target) ||
    []
  );
}

/**
 * @OnAgentStarted() shorthand decorator
 * Subscribes to agent started events.
 */
export function OnAgentStarted(
  filter?: EventFilter,
): MethodDecorator {
  return OnAgentEvent({
    eventType: AgentEventType.AGENT_STARTED,
    filter,
  });
}

/**
 * @OnTaskCompleted() shorthand decorator
 * Subscribes to task completed events.
 */
export function OnTaskCompleted(
  filter?: EventFilter,
): MethodDecorator {
  return OnAgentEvent({
    eventType: AgentEventType.TASK_COMPLETED,
    filter,
  });
}

/**
 * @OnTaskFailed() shorthand decorator
 * Subscribes to task failed events.
 */
export function OnTaskFailed(
  filter?: EventFilter,
): MethodDecorator {
  return OnAgentEvent({
    eventType: AgentEventType.TASK_FAILED,
    filter,
  });
}

/**
 * @OnAgentError() shorthand decorator
 * Subscribes to agent error events.
 */
export function OnAgentError(
  filter?: EventFilter,
): MethodDecorator {
  return OnAgentEvent({
    eventType: AgentEventType.AGENT_ERROR,
    filter,
  });
}

/**
 * @OnSystemAlert() shorthand decorator
 * Subscribes to system alert events.
 */
export function OnSystemAlert(
  filter?: EventFilter,
): MethodDecorator {
  return OnAgentEvent({
    eventType: AgentEventType.SYSTEM_ALERT,
    filter,
  });
}

/**
 * @OnOrchestrationCompleted() shorthand decorator
 * Subscribes to orchestration completed events.
 */
export function OnOrchestrationCompleted(
  filter?: EventFilter,
): MethodDecorator {
  return OnAgentEvent({
    eventType: AgentEventType.ORCHESTRATION_COMPLETED,
    filter,
  });
}

/**
 * @OnCircuitBreakerOpened() shorthand decorator
 * Subscribes to circuit breaker opened events.
 */
export function OnCircuitBreakerOpened(
  filter?: EventFilter,
): MethodDecorator {
  return OnAgentEvent({
    eventType: AgentEventType.CIRCUIT_BREAKER_OPENED,
    filter,
  });
}
