/**
 * AENEWS Agent OS X - Inter-Agent Communication Service
 * Enables direct, broadcast, and request/response messaging between agents
 * with correlation ID tracking, message queue integration, timeout handling,
 * and comprehensive message history.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AgentCluster } from '../interfaces/agent.interface';
import { AgentEventType, AgentEvent } from '../interfaces/agent-event.interface';
import { EventBusService } from '../events/event-bus.service';
import { AgentRegistryService } from '../registry/agent-registry.service';

// ─── Message Types ────────────────────────────────────────────────
export enum MessageType {
  DIRECT = 'direct',
  BROADCAST = 'broadcast',
  REQUEST = 'request',
  RESPONSE = 'response',
  NOTIFICATION = 'notification',
}

// ─── Agent Message ────────────────────────────────────────────────
export interface AgentMessage<T = any> {
  id: string;
  type: MessageType;
  sourceAgentId: string;
  targetAgentId?: string;
  targetCluster?: AgentCluster;
  payload: T;
  correlationId: string;
  causationId?: string;
  timestamp: Date;
  ttl?: number;
  priority: number;
  metadata: Record<string, any>;
}

// ─── Request/Response Tracking ────────────────────────────────────
interface PendingRequest {
  id: string;
  message: AgentMessage;
  resolve: (response: AgentMessage) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  createdAt: Date;
}

// ─── Message Handler ──────────────────────────────────────────────
export type MessageHandler = (message: AgentMessage) => Promise<AgentMessage | void> | void;

@Injectable()
export class InterAgentCommService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InterAgentCommService.name);
  private readonly handlers: Map<string, MessageHandler> = new Map();
  private readonly pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly messageHistory: AgentMessage[] = [];
  private cleanupInterval: NodeJS.Timer | null = null;
  private static readonly REQUEST_TIMEOUT_MS = 30000;
  private static readonly MAX_HISTORY_SIZE = 1000;
  private static readonly CLEANUP_INTERVAL_MS = 30000;

  constructor(
    private readonly eventBus: EventBusService,
    private readonly agentRegistry: AgentRegistryService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Subscribe to inter-agent communication events
    await this.eventBus.subscribe({
      subscriberId: 'inter-agent-comm',
      eventType: AgentEventType.MESSAGE_RECEIVED,
      handler: (event: AgentEvent) => this.handleIncomingMessage(event),
    });

    // Start cleanup timer for expired pending requests
    this.cleanupInterval = setInterval(() => {
      this.cleanupPendingRequests();
    }, InterAgentCommService.CLEANUP_INTERVAL_MS);

    this.logger.log('Inter-Agent Communication service initialized');
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval as any);
    }

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Service shutting down'));
    }
    this.pendingRequests.clear();
    this.handlers.clear();
  }

  /**
   * Send a direct message to a specific agent.
   */
  async sendDirect<T>(
    sourceAgentId: string,
    targetAgentId: string,
    payload: T,
    options?: {
      correlationId?: string;
      priority?: number;
      ttl?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<string> {
    const message: AgentMessage<T> = {
      id: uuidv4(),
      type: MessageType.DIRECT,
      sourceAgentId,
      targetAgentId,
      payload,
      correlationId: options?.correlationId || uuidv4(),
      timestamp: new Date(),
      ttl: options?.ttl,
      priority: options?.priority || 1,
      metadata: options?.metadata || {},
    };

    await this.publishMessage(message);

    this.logger.debug?.(`Direct message sent from ${sourceAgentId} to ${targetAgentId}`);

    return message.id;
  }

  /**
   * Broadcast a message to all agents in a cluster.
   */
  async broadcast<T>(
    sourceAgentId: string,
    targetCluster: AgentCluster,
    payload: T,
    options?: {
      correlationId?: string;
      priority?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<string> {
    const message: AgentMessage<T> = {
      id: uuidv4(),
      type: MessageType.BROADCAST,
      sourceAgentId,
      targetCluster,
      payload,
      correlationId: options?.correlationId || uuidv4(),
      timestamp: new Date(),
      priority: options?.priority || 1,
      metadata: options?.metadata || {},
    };

    await this.publishMessage(message);

    const agents = this.agentRegistry.getAgentsByCluster(targetCluster);
    this.logger.debug?.(
      `Broadcast message sent from ${sourceAgentId} to cluster ${targetCluster} (${agents.length} agents)`,
    );

    return message.id;
  }

  /**
   * Send a request and wait for a response with correlation ID tracking.
   * Implements timeout handling for request/response patterns.
   */
  async request<TRequest, TResponse>(
    sourceAgentId: string,
    targetAgentId: string,
    payload: TRequest,
    options?: {
      correlationId?: string;
      timeout?: number;
      priority?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<AgentMessage<TResponse>> {
    const correlationId = options?.correlationId || uuidv4();
    const timeoutMs = options?.timeout || InterAgentCommService.REQUEST_TIMEOUT_MS;

    const message: AgentMessage<TRequest> = {
      id: uuidv4(),
      type: MessageType.REQUEST,
      sourceAgentId,
      targetAgentId,
      payload,
      correlationId,
      timestamp: new Date(),
      priority: options?.priority || 2,
      metadata: options?.metadata || {},
    };

    return new Promise<AgentMessage<TResponse>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(
          new Error(`Request timed out after ${timeoutMs}ms (correlationId: ${correlationId})`),
        );
      }, timeoutMs);

      this.pendingRequests.set(correlationId, {
        id: correlationId,
        message,
        resolve: resolve as (response: AgentMessage) => void,
        reject,
        timeout,
        createdAt: new Date(),
      });

      this.publishMessage(message).catch((error) => {
        clearTimeout(timeout);
        this.pendingRequests.delete(correlationId);
        reject(error);
      });
    });
  }

  /**
   * Send a response to a previous request.
   */
  async respond<T>(
    sourceAgentId: string,
    originalMessage: AgentMessage,
    payload: T,
  ): Promise<string> {
    const message: AgentMessage<T> = {
      id: uuidv4(),
      type: MessageType.RESPONSE,
      sourceAgentId,
      targetAgentId: originalMessage.sourceAgentId,
      payload,
      correlationId: originalMessage.correlationId,
      causationId: originalMessage.id,
      timestamp: new Date(),
      priority: originalMessage.priority,
      metadata: {},
    };

    await this.publishMessage(message);

    // Resolve pending request if exists
    const pending = this.pendingRequests.get(originalMessage.correlationId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(message);
      this.pendingRequests.delete(originalMessage.correlationId);
    }

    return message.id;
  }

  /**
   * Send a notification (fire-and-forget).
   */
  async notify<T>(sourceAgentId: string, targetAgentId: string, payload: T): Promise<string> {
    const message: AgentMessage<T> = {
      id: uuidv4(),
      type: MessageType.NOTIFICATION,
      sourceAgentId,
      targetAgentId,
      payload,
      correlationId: uuidv4(),
      timestamp: new Date(),
      priority: 0,
      metadata: {},
    };

    await this.publishMessage(message);

    return message.id;
  }

  /**
   * Register a message handler for an agent.
   */
  registerHandler(agentId: string, handler: MessageHandler): void {
    this.handlers.set(agentId, handler);
  }

  /**
   * Unregister a message handler.
   */
  unregisterHandler(agentId: string): void {
    this.handlers.delete(agentId);
  }

  /**
   * Get message history with optional filtering.
   */
  getMessageHistory(filter?: {
    sourceAgentId?: string;
    targetAgentId?: string;
    type?: MessageType;
    correlationId?: string;
    limit?: number;
  }): AgentMessage[] {
    let messages = [...this.messageHistory];

    if (filter?.sourceAgentId) {
      messages = messages.filter((m) => m.sourceAgentId === filter.sourceAgentId);
    }
    if (filter?.targetAgentId) {
      messages = messages.filter((m) => m.targetAgentId === filter.targetAgentId);
    }
    if (filter?.type) {
      messages = messages.filter((m) => m.type === filter.type);
    }
    if (filter?.correlationId) {
      messages = messages.filter((m) => m.correlationId === filter.correlationId);
    }

    const limit = filter?.limit || 100;
    return messages.slice(-limit);
  }

  /**
   * Get communication statistics.
   */
  getStats(): {
    totalMessages: number;
    pendingRequests: number;
    registeredHandlers: number;
    messagesByType: Record<MessageType, number>;
  } {
    const messagesByType: Record<string, number> = {};
    for (const type of Object.values(MessageType)) {
      messagesByType[type] = 0;
    }

    for (const msg of this.messageHistory) {
      messagesByType[msg.type] = (messagesByType[msg.type] || 0) + 1;
    }

    return {
      totalMessages: this.messageHistory.length,
      pendingRequests: this.pendingRequests.size,
      registeredHandlers: this.handlers.size,
      messagesByType: messagesByType as Record<MessageType, number>,
    };
  }

  // ─── Private Methods ─────────────────────────────────────────────

  private async publishMessage(message: AgentMessage): Promise<void> {
    // Record in history
    this.messageHistory.push(message);
    if (this.messageHistory.length > InterAgentCommService.MAX_HISTORY_SIZE) {
      this.messageHistory.shift();
    }

    // Publish via event bus
    await this.eventBus.publish({
      type: AgentEventType.MESSAGE_SENT,
      sourceAgentId: message.sourceAgentId,
      targetAgentId: message.targetAgentId,
      cluster: message.targetCluster,
      payload: message,
      priority: message.priority,
      correlationId: message.correlationId,
      metadata: message.metadata,
    });
  }

  private async handleIncomingMessage(event: AgentEvent): Promise<void> {
    const message = event.payload as AgentMessage;

    if (!message) return;

    // Deliver to target agent's handler
    if (message.targetAgentId) {
      const handler = this.handlers.get(message.targetAgentId);
      if (handler) {
        try {
          const result = await handler(message);

          // If it's a request and handler returns a response, send it back
          if (message.type === MessageType.REQUEST && result) {
            await this.respond(message.targetAgentId, message, (result as AgentMessage).payload);
          }
        } catch (error) {
          this.logger.error(
            `Error handling message for agent ${message.targetAgentId}: ${(error as Error).message}`,
          );
        }
      }
    }

    // Handle broadcast messages
    if (message.type === MessageType.BROADCAST && message.targetCluster) {
      const agents = this.agentRegistry.getAgentsByCluster(message.targetCluster);
      for (const agent of agents) {
        const agentId = agent.getConfig().id;
        if (agentId === message.sourceAgentId) continue; // Don't send to self

        const handler = this.handlers.get(agentId);
        if (handler) {
          try {
            await handler(message);
          } catch (error) {
            this.logger.error(
              `Error handling broadcast for agent ${agentId}: ${(error as Error).message}`,
            );
          }
        }
      }
    }
  }

  private cleanupPendingRequests(): void {
    const now = Date.now();
    const expiredRequests: string[] = [];

    for (const [correlationId, pending] of this.pendingRequests) {
      const age = now - pending.createdAt.getTime();
      if (age > InterAgentCommService.REQUEST_TIMEOUT_MS * 2) {
        expiredRequests.push(correlationId);
      }
    }

    for (const id of expiredRequests) {
      const pending = this.pendingRequests.get(id);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Request expired during cleanup'));
        this.pendingRequests.delete(id);
      }
    }

    if (expiredRequests.length > 0) {
      this.logger.debug?.(`Cleaned up ${expiredRequests.length} expired pending requests`);
    }
  }
}
