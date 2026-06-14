import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Standard agent event types used across the framework.
 */
export enum AgentEventType {
  AGENT_INITIALIZED = 'agent.initialized',
  AGENT_STARTED = 'agent.started',
  AGENT_COMPLETED = 'agent.completed',
  AGENT_FAILED = 'agent.failed',
  AGENT_PAUSED = 'agent.paused',
  AGENT_RESUMED = 'agent.resumed',
  AGENT_STOPPED = 'agent.stopped',
  TOOL_EXECUTED = 'tool.executed',
  MEMORY_ACCESSED = 'memory.accessed',
  COMMUNICATION_SENT = 'communication.sent',
}

/**
 * Payload envelope for every agent event.
 */
export interface AgentEventPayload {
  agentId: string;
  eventType: AgentEventType;
  timestamp: number;
  data?: any;
}

/**
 * Enhanced Event Bus — wraps NestJS EventEmitter2 with agent-specific
 * event naming conventions.
 *
 * Event naming convention: `agent.{agentId}.{eventType}`
 * Wildcard pattern:      `agent.*.started`  or  `agent.myAgent.**`
 */
@Injectable()
export class AgentEventBusService {
  private readonly logger = new Logger(AgentEventBusService.name);

  constructor(private readonly emitter: EventEmitter2) {}

  /**
   * Emit an agent event using the canonical naming pattern.
   * Emits both:
   *   - `agent.{agentId}.{eventType}`  (specific)
   *   - `{eventType}`                  (global, for cross-agent listeners)
   */
  emit(
    eventType: AgentEventType,
    agentId: string,
    data?: any,
  ): boolean {
    const payload: AgentEventPayload = {
      agentId,
      eventType,
      timestamp: Date.now(),
      data,
    };

    const specificEvent = `agent.${agentId}.${eventType}`;

    // Emit specific namespaced event
    const specificResult = this.emitter.emit(specificEvent, payload);

    // Also emit the global event type so listeners can subscribe to all
    // agents of a given event type regardless of ID
    this.emitter.emit(eventType, payload);

    this.logger.debug(`Emitted ${specificEvent}`);
    return specificResult;
  }

  /**
   * Subscribe to events of a specific type for a specific agent.
   * Pattern: `agent.{agentId}.{eventType}`
   */
  on(
    eventType: AgentEventType,
    handler: (payload: AgentEventPayload) => void,
    agentId?: string,
  ): void {
    const event = agentId
      ? `agent.${agentId}.${eventType}`
      : eventType;

    this.emitter.on(event, handler);
  }

  /**
   * Subscribe to a single occurrence of an event.
   */
  once(
    eventType: AgentEventType,
    handler: (payload: AgentEventPayload) => void,
    agentId?: string,
  ): void {
    const event = agentId
      ? `agent.${agentId}.${eventType}`
      : eventType;

    this.emitter.once(event, handler);
  }

  /**
   * Remove all listeners for an event type, optionally scoped to an agent.
   */
  removeAllListeners(eventType?: AgentEventType, agentId?: string): void {
    if (!eventType) {
      this.emitter.removeAllListeners();
      return;
    }

    const event = agentId
      ? `agent.${agentId}.${eventType}`
      : eventType;

    this.emitter.removeAllListeners(event);
  }

  /**
   * Subscribe using a wildcard pattern.
   * Example: onPattern('agent.*.started', handler)
   */
  onPattern(
    pattern: string,
    handler: (payload: AgentEventPayload) => void,
  ): void {
    this.emitter.on(pattern, handler);
  }

  // ─── Software Factory Helpers ────────────────────────────────

  /**
   * Emit a progress event for a mission.
   * Used by the Software Factory to track pipeline progress.
   */
  async emitProgress(
    missionId: string,
    progress: number,
    phase: string,
  ): Promise<void> {
    this.emitter.emit(`agent.${missionId}.progress`, {
      agentId: missionId,
      eventType: 'agent.progress',
      timestamp: Date.now(),
      data: { progress, phase },
    });
    this.logger.debug(
      `Mission ${missionId} progress: ${progress}% — ${phase}`,
    );
  }

  /**
   * Emit a state change event for a mission.
   * Used by the Software Factory state machine to track lifecycle transitions.
   */
  async emitStateChange(
    missionId: string,
    fromState: string,
    toState: string,
    context?: Record<string, any>,
  ): Promise<void> {
    this.emitter.emit(`agent.${missionId}.stateChange`, {
      agentId: missionId,
      eventType: 'agent.stateChange',
      timestamp: Date.now(),
      data: { fromState, toState, context },
    });
    this.logger.debug(
      `Mission ${missionId} state change: ${fromState} → ${toState}`,
    );
  }

  /**
   * Emit a connector execution event.
   * Used by the Software Factory connector registry to track connector actions.
   */
  async emitConnectorEvent(
    connectorName: string,
    action: string,
    success: boolean,
    durationMs: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    this.emitter.emit(`connector.${connectorName}.${action}`, {
      agentId: connectorName,
      eventType: 'connector.executed',
      timestamp: Date.now(),
      data: { connectorName, action, success, durationMs, metadata },
    });
    this.logger.debug(
      `Connector ${connectorName}.${action}: ${success ? 'ok' : 'failed'} (${durationMs}ms)`,
    );
  }
}
