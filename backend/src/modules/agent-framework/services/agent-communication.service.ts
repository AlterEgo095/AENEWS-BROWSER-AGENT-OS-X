import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AgentEventBusService,
  AgentEventType,
} from './agent-event-bus.service';

/**
 * Message envelope for inter-agent communication.
 */
export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'message' | 'request' | 'response' | 'broadcast';
  content: any;
  timestamp: number;
  correlationId?: string; // for request/response pairing
}

/**
 * Handler type for incoming messages.
 */
export type MessageHandler = (message: AgentMessage) => void | Promise<void>;

/**
 * Inter-Agent Communication Service
 *
 * Enables agents to send direct messages, broadcast, and
 * perform request/response communication via the event emitter.
 *
 * Event naming:
 *   - Direct:  `agent.comm.{toAgentId}`
 *   - Broadcast: `agent.comm.broadcast`
 *   - Response: `agent.comm.response.{correlationId}`
 */
@Injectable()
export class AgentCommunicationService {
  private readonly logger = new Logger(AgentCommunicationService.name);

  /** Pending request-response promises keyed by correlationId */
  private readonly pendingRequests = new Map<
    string,
    {
      resolve: (response: AgentMessage) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();

  /** Registered message handlers per agent */
  private readonly handlers = new Map<string, Set<MessageHandler>>();

  /** Default request timeout in ms */
  private readonly DEFAULT_REQUEST_TIMEOUT = 30_000;

  constructor(
    private readonly emitter: EventEmitter2,
    private readonly eventBus: AgentEventBusService,
  ) {
    // Listen for all incoming messages to route them to handlers
    this.emitter.on('agent.comm.**', (message: AgentMessage) => {
      this.routeMessage(message);
    });
  }

  // ─── Public API ─────────────────────────────────────────────

  /**
   * Send a direct message from one agent to another.
   */
  async send(fromAgentId: string, toAgentId: string, content: any): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: this.generateId(),
      from: fromAgentId,
      to: toAgentId,
      type: 'message',
      content,
      timestamp: Date.now(),
    };

    this.emitter.emit(`agent.comm.${toAgentId}`, message);

    this.eventBus.emit(AgentEventType.COMMUNICATION_SENT, fromAgentId, {
      messageId: message.id,
      to: toAgentId,
      type: 'message',
    });

    this.logger.debug(
      `Message ${message.id}: ${fromAgentId} → ${toAgentId}`,
    );

    return message;
  }

  /**
   * Broadcast a message to all agents.
   */
  async broadcast(fromAgentId: string, content: any): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: this.generateId(),
      from: fromAgentId,
      to: '*',
      type: 'broadcast',
      content,
      timestamp: Date.now(),
    };

    this.emitter.emit('agent.comm.broadcast', message);

    this.eventBus.emit(AgentEventType.COMMUNICATION_SENT, fromAgentId, {
      messageId: message.id,
      to: 'broadcast',
      type: 'broadcast',
    });

    this.logger.debug(`Broadcast ${message.id} from ${fromAgentId}`);
    return message;
  }

  /**
   * Subscribe an agent to incoming messages.
   * The handler will be called for every message addressed to that agent
   * and for every broadcast.
   */
  subscribe(agentId: string, handler: MessageHandler): void {
    if (!this.handlers.has(agentId)) {
      this.handlers.set(agentId, new Set());
    }
    this.handlers.get(agentId)!.add(handler);
    this.logger.debug(`Agent ${agentId} subscribed to messages`);
  }

  /**
   * Send a request and wait for a response (request-response pattern).
   * Returns a promise that resolves when the target agent responds,
   * or rejects after a timeout.
   */
  async request(
    fromAgentId: string,
    toAgentId: string,
    content: any,
    timeoutMs?: number,
  ): Promise<AgentMessage> {
    const correlationId = this.generateId();

    const message: AgentMessage = {
      id: this.generateId(),
      from: fromAgentId,
      to: toAgentId,
      type: 'request',
      content,
      timestamp: Date.now(),
      correlationId,
    };

    return new Promise<AgentMessage>((resolve, reject) => {
      const effectiveTimeout = timeoutMs ?? this.DEFAULT_REQUEST_TIMEOUT;

      const timer = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(
          new Error(
            `Request ${message.id} timed out after ${effectiveTimeout}ms`,
          ),
        );
      }, effectiveTimeout);

      this.pendingRequests.set(correlationId, {
        resolve,
        reject,
        timeout: timer,
      });

      // Emit the request
      this.emitter.emit(`agent.comm.${toAgentId}`, message);

      this.eventBus.emit(AgentEventType.COMMUNICATION_SENT, fromAgentId, {
        messageId: message.id,
        to: toAgentId,
        type: 'request',
        correlationId,
      });

      this.logger.debug(
        `Request ${message.id}: ${fromAgentId} → ${toAgentId}`,
      );
    });
  }

  /**
   * Send a response to a previous request.
   */
  async respond(
    fromAgentId: string,
    originalMessage: AgentMessage,
    content: any,
  ): Promise<AgentMessage> {
    const response: AgentMessage = {
      id: this.generateId(),
      from: fromAgentId,
      to: originalMessage.from,
      type: 'response',
      content,
      timestamp: Date.now(),
      correlationId: originalMessage.correlationId,
    };

    // Resolve the pending request if one exists
    if (originalMessage.correlationId) {
      const pending = this.pendingRequests.get(originalMessage.correlationId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(originalMessage.correlationId);
        pending.resolve(response);
      }
    }

    // Also emit so any listeners can see the response
    this.emitter.emit(`agent.comm.${originalMessage.from}`, response);

    this.eventBus.emit(AgentEventType.COMMUNICATION_SENT, fromAgentId, {
      messageId: response.id,
      to: originalMessage.from,
      type: 'response',
      correlationId: originalMessage.correlationId,
    });

    this.logger.debug(
      `Response ${response.id}: ${fromAgentId} → ${originalMessage.from}`,
    );

    return response;
  }

  // ─── Private helpers ────────────────────────────────────────

  /**
   * Route an incoming message to registered handlers.
   */
  private async routeMessage(message: AgentMessage): Promise<void> {
    // For direct messages and requests, route to the target agent's handlers
    if (message.type === 'message' || message.type === 'request') {
      const agentHandlers = this.handlers.get(message.to);
      if (agentHandlers) {
        for (const handler of agentHandlers) {
          try {
            await handler(message);
          } catch (err) {
            this.logger.warn(
              `Handler error for agent ${message.to}: ${(err as Error).message}`,
            );
          }
        }
      }
    }

    // For broadcasts, route to ALL registered agents
    if (message.type === 'broadcast') {
      for (const [agentId, agentHandlers] of this.handlers.entries()) {
        if (agentId === message.from) continue; // don't send to self
        for (const handler of agentHandlers) {
          try {
            await handler(message);
          } catch (err) {
            this.logger.warn(
              `Broadcast handler error for agent ${agentId}: ${(err as Error).message}`,
            );
          }
        }
      }
    }

    // For responses, the pending request is already resolved in `respond()`
    // but we also notify the target agent's handlers
    if (message.type === 'response') {
      const agentHandlers = this.handlers.get(message.to);
      if (agentHandlers) {
        for (const handler of agentHandlers) {
          try {
            await handler(message);
          } catch (err) {
            this.logger.warn(
              `Response handler error for agent ${message.to}: ${(err as Error).message}`,
            );
          }
        }
      }
    }
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
