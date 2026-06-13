import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AgentCluster } from '../interfaces/agent.interface';
import { EventBusService } from '../events/event-bus.service';
import { AgentRegistryService } from '../registry/agent-registry.service';
export declare enum MessageType {
    DIRECT = "direct",
    BROADCAST = "broadcast",
    REQUEST = "request",
    RESPONSE = "response",
    NOTIFICATION = "notification"
}
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
export type MessageHandler = (message: AgentMessage) => Promise<AgentMessage | void> | void;
export declare class InterAgentCommService implements OnModuleInit, OnModuleDestroy {
    private readonly eventBus;
    private readonly agentRegistry;
    private readonly logger;
    private readonly handlers;
    private readonly pendingRequests;
    private readonly messageHistory;
    private cleanupInterval;
    private static readonly REQUEST_TIMEOUT_MS;
    private static readonly MAX_HISTORY_SIZE;
    private static readonly CLEANUP_INTERVAL_MS;
    constructor(eventBus: EventBusService, agentRegistry: AgentRegistryService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    sendDirect<T>(sourceAgentId: string, targetAgentId: string, payload: T, options?: {
        correlationId?: string;
        priority?: number;
        ttl?: number;
        metadata?: Record<string, any>;
    }): Promise<string>;
    broadcast<T>(sourceAgentId: string, targetCluster: AgentCluster, payload: T, options?: {
        correlationId?: string;
        priority?: number;
        metadata?: Record<string, any>;
    }): Promise<string>;
    request<TRequest, TResponse>(sourceAgentId: string, targetAgentId: string, payload: TRequest, options?: {
        correlationId?: string;
        timeout?: number;
        priority?: number;
        metadata?: Record<string, any>;
    }): Promise<AgentMessage<TResponse>>;
    respond<T>(sourceAgentId: string, originalMessage: AgentMessage, payload: T): Promise<string>;
    notify<T>(sourceAgentId: string, targetAgentId: string, payload: T): Promise<string>;
    registerHandler(agentId: string, handler: MessageHandler): void;
    unregisterHandler(agentId: string): void;
    getMessageHistory(filter?: {
        sourceAgentId?: string;
        targetAgentId?: string;
        type?: MessageType;
        correlationId?: string;
        limit?: number;
    }): AgentMessage[];
    getStats(): {
        totalMessages: number;
        pendingRequests: number;
        registeredHandlers: number;
        messagesByType: Record<MessageType, number>;
    };
    private publishMessage;
    private handleIncomingMessage;
    private cleanupPendingRequests;
}
