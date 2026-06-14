import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
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
 * Mapping from AgentEventType to WebSocket event channel.
 * Agent events are categorized into three WS channels:
 *   - agent:state     — lifecycle state changes
 *   - agent:execution — execution results (completed / failed)
 *   - agent:health    — health-related alerts
 */
const AGENT_WS_CHANNEL_MAP: Record<string, string> = {
  [AgentEventType.AGENT_INITIALIZED]: 'agent:state',
  [AgentEventType.AGENT_STARTED]: 'agent:state',
  [AgentEventType.AGENT_PAUSED]: 'agent:state',
  [AgentEventType.AGENT_RESUMED]: 'agent:state',
  [AgentEventType.AGENT_STOPPED]: 'agent:state',
  [AgentEventType.AGENT_COMPLETED]: 'agent:execution',
  [AgentEventType.AGENT_FAILED]: 'agent:execution',
  [AgentEventType.TOOL_EXECUTED]: 'agent:execution',
  [AgentEventType.MEMORY_ACCESSED]: 'agent:execution',
  [AgentEventType.COMMUNICATION_SENT]: 'agent:execution',
};

/**
 * Enhanced Event Bus — wraps NestJS EventEmitter2 with agent-specific
 * event naming conventions.
 *
 * Event naming convention: `agent.{agentId}.{eventType}`
 * Wildcard pattern:      `agent.*.started`  or  `agent.myAgent.**`
 *
 * WebSocket integration:
 *   Every event is also broadcast via the EventsGateway when available.
 *   The gateway is resolved lazily from the DI container (ModuleRef),
 *   so there is no hard dependency on the GatewayModule and the event
 *   bus degrades gracefully when no WebSocket clients are connected.
 */
@Injectable()
export class AgentEventBusService {
  private readonly logger = new Logger(AgentEventBusService.name);

  /** Lazily-resolved WebSocket gateway (optional) */
  private gatewayInstance: any = null;
  private gatewayResolved = false;

  constructor(
    private readonly emitter: EventEmitter2,
    private readonly moduleRef: ModuleRef,
  ) {}

  // ─── Gateway Resolution ──────────────────────────────────

  /**
   * Lazily resolve the EventsGateway from the DI container.
   * Uses ModuleRef to avoid hard circular dependencies.
   * If the gateway module is not loaded, silently skips.
   */
  private resolveGateway(): any {
    if (this.gatewayResolved) return this.gatewayInstance;

    try {
      // Dynamic import to avoid hard dep; gateway module may not be loaded
      const { EventsGateway } = require('../../gateway/events.gateway');
      this.gatewayInstance = this.moduleRef.get(EventsGateway, { strict: false });
      this.gatewayResolved = true;

      if (this.gatewayInstance) {
        this.logger.log('WebSocket gateway connected to event bus');
      }
    } catch {
      this.gatewayResolved = true; // don't retry on every emit
      this.gatewayInstance = null;
    }

    return this.gatewayInstance;
  }

  /**
   * Broadcast an event to WebSocket clients via the gateway.
   * Graceful degradation: if no gateway or no clients, this is a no-op.
   */
  private broadcastToClients(eventType: string, data: any): void {
    try {
      const gateway = this.resolveGateway();
      if (!gateway) return;

      // Skip broadcast if no clients are connected (save CPU)
      if (typeof gateway.getConnectedCount === 'function' && gateway.getConnectedCount() === 0) {
        return;
      }

      if (typeof gateway.broadcastEvent === 'function') {
        gateway.broadcastEvent(eventType, data);
      }
    } catch (err) {
      // Never let WS broadcast failures affect the core event bus
      this.logger.debug(`WebSocket broadcast skipped: ${(err as Error).message}`);
    }
  }

  // ─── Core Event Bus API ──────────────────────────────────

  /**
   * Emit an agent event using the canonical naming pattern.
   * Emits both:
   *   - `agent.{agentId}.{eventType}`  (specific)
   *   - `{eventType}`                  (global, for cross-agent listeners)
   *
   * Also broadcasts the event over WebSocket if the gateway is available.
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

    // Broadcast over WebSocket
    const wsChannel = AGENT_WS_CHANNEL_MAP[eventType] || 'agent:state';
    this.broadcastToClients(wsChannel, payload);

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
   *
   * Broadcasts as `mission:progress` over WebSocket.
   */
  async emitProgress(
    missionId: string,
    progress: number,
    phase: string,
  ): Promise<void> {
    const payload = {
      agentId: missionId,
      eventType: 'agent.progress',
      timestamp: Date.now(),
      data: { progress, phase, missionId },
    };

    this.emitter.emit(`agent.${missionId}.progress`, payload);

    // Broadcast as mission:progress over WebSocket
    this.broadcastToClients('mission:progress', {
      missionId,
      progress,
      phase,
      timestamp: Date.now(),
    });

    this.logger.debug(
      `Mission ${missionId} progress: ${progress}% — ${phase}`,
    );
  }

  /**
   * Emit a state change event for a mission.
   * Used by the Software Factory state machine to track lifecycle transitions.
   *
   * Broadcasts as `mission:state` over WebSocket.
   */
  async emitStateChange(
    missionId: string,
    fromState: string,
    toState: string,
    context?: Record<string, any>,
  ): Promise<void> {
    const payload = {
      agentId: missionId,
      eventType: 'agent.stateChange',
      timestamp: Date.now(),
      data: { fromState, toState, context, missionId },
    };

    this.emitter.emit(`agent.${missionId}.stateChange`, payload);

    // Broadcast as mission:state over WebSocket
    this.broadcastToClients('mission:state', {
      missionId,
      fromState,
      toState,
      context,
      timestamp: Date.now(),
    });

    this.logger.debug(
      `Mission ${missionId} state change: ${fromState} → ${toState}`,
    );
  }

  /**
   * Emit a step completion event for a mission.
   * Used by the Software Factory to track individual pipeline step completion.
   *
   * Broadcasts as `mission:step` over WebSocket.
   */
  async emitStepComplete(
    missionId: string,
    step: string,
    result?: any,
  ): Promise<void> {
    const payload = {
      agentId: missionId,
      eventType: 'agent.stepComplete',
      timestamp: Date.now(),
      data: { step, result, missionId },
    };

    this.emitter.emit(`agent.${missionId}.stepComplete`, payload);

    // Broadcast as mission:step over WebSocket
    this.broadcastToClients('mission:step', {
      missionId,
      step,
      result,
      timestamp: Date.now(),
    });

    this.logger.debug(`Mission ${missionId} step completed: ${step}`);
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
