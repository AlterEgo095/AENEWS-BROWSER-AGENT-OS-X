import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface BrokerMessage {
    id: string;
    queue: string;
    payload: any;
    headers: Record<string, string>;
    timestamp: Date;
    priority: number;
    ttl?: number;
    persistent: boolean;
    retryCount?: number;
    maxRetries?: number;
}
export interface BrokerQueue {
    name: string;
    durable: boolean;
    autoDelete: boolean;
    maxLength?: number;
    messageTtl?: number;
}
export type BrokerConsumer = (message: BrokerMessage) => Promise<boolean> | boolean;
export declare enum ExchangeType {
    DIRECT = "direct",
    TOPIC = "topic",
    FANOUT = "fanout",
    HEADERS = "headers"
}
export declare class MessageBrokerService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private connection;
    private channelWrapper;
    private connectionState;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectTimer;
    private readonly consumers;
    private readonly queues;
    private readonly retryConfig;
    private readonly inMemoryQueues;
    private readonly deadLetterMessages;
    private processingInterval;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private initializeBroker;
    private attemptReconnect;
    private setupChannel;
    private setupDefaultQueues;
    assertQueue(queue: BrokerQueue): Promise<void>;
    send(message: Omit<BrokerMessage, 'id' | 'timestamp'>): Promise<string>;
    consume(queueName: string, consumer: BrokerConsumer): Promise<string>;
    private handleConsumedMessage;
    private handleFailedMessage;
    private calculateRetryDelay;
    unconsume(consumerId: string): Promise<boolean>;
    getQueueInfo(queueName: string): Promise<{
        messageCount: number;
        consumerCount: number;
    } | null>;
    purgeQueue(queueName: string): Promise<number>;
    getDeadLetterMessages(): BrokerMessage[];
    retryDeadLetter(messageId: string): Promise<boolean>;
    private enqueueInMemory;
    private startInMemoryProcessing;
    private processInMemoryQueues;
    private handleInMemoryRetry;
    private closeBroker;
    getStats(): {
        connectedToRabbitMQ: boolean;
        connectionState: string;
        totalQueues: number;
        totalConsumers: number;
        inMemoryMessageCount: number;
        deadLetterCount: number;
        queues: Record<string, number>;
    };
}
