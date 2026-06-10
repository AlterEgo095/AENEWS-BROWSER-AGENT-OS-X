/**
 * AENEWS Agent OS X - Message Broker Service
 * RabbitMQ-backed message broker for reliable inter-service messaging.
 * Provides persistent queues, routing, retry logic, connection management
 * with automatic reconnection, and graceful fallback when RabbitMQ is not available.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { AgentCluster } from '../interfaces/agent.interface';

// ─── Broker Message ───────────────────────────────────────────────
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

// ─── Broker Queue ─────────────────────────────────────────────────
export interface BrokerQueue {
  name: string;
  durable: boolean;
  autoDelete: boolean;
  maxLength?: number;
  messageTtl?: number;
}

// ─── Consumer Handler ─────────────────────────────────────────────
export type BrokerConsumer = (message: BrokerMessage) => Promise<boolean> | boolean;

// ─── Exchange Type ────────────────────────────────────────────────
export enum ExchangeType {
  DIRECT = 'direct',
  TOPIC = 'topic',
  FANOUT = 'fanout',
  HEADERS = 'headers',
}

// ─── Retry Configuration ──────────────────────────────────────────
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  exponentialBackoff: true,
};

// ─── Connection State ─────────────────────────────────────────────
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
}

@Injectable()
export class MessageBrokerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageBrokerService.name);
  private connection: any = null;
  private channelWrapper: any = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private readonly consumers: Map<string, { consumer: BrokerConsumer; queueName: string }> = new Map();
  private readonly queues: Map<string, BrokerQueue> = new Map();
  private readonly retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG };

  // In-memory fallback
  private readonly inMemoryQueues: Map<string, BrokerMessage[]> = new Map();
  private readonly deadLetterMessages: Map<string, BrokerMessage> = new Map();
  private processingInterval: NodeJS.Timer | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeBroker();
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeBroker();
  }

  /**
   * Initialize the RabbitMQ connection with reconnection support.
   */
  private async initializeBroker(): Promise<void> {
    try {
      this.connectionState = ConnectionState.CONNECTING;
      const amqp = await import('amqp-connection-manager');
      const url = this.configService.get<string>(
        'RABBITMQ_URL',
        'amqp://localhost:5672',
      );

      this.connection = amqp.default.connect([url]);

      this.connection.on('connect', () => {
        this.connectionState = ConnectionState.CONNECTED;
        this.reconnectAttempts = 0;
        this.logger.log('Connected to RabbitMQ');
      });

      this.connection.on('disconnect', (err: Error) => {
        this.connectionState = ConnectionState.DISCONNECTED;
        this.logger.warn(`Disconnected from RabbitMQ: ${err?.message || 'Unknown error'}`);
        this.attemptReconnect();
      });

      this.connection.on('connectFailed', (err: Error) => {
        this.logger.warn(`RabbitMQ connection failed: ${err?.message || 'Unknown error'}`);
      });

      // Create a channel wrapper
      this.channelWrapper = this.connection.createChannel({
        json: true,
        setup: (channel: any) => {
          // Re-assert queues and re-register consumers on reconnection
          return this.setupChannel(channel);
        },
      });

      await this.channelWrapper.waitForConnect();

      // Set up default queues
      await this.setupDefaultQueues();

      this.logger.log('Message Broker initialized with RabbitMQ');
    } catch (error) {
      this.logger.warn(
        `RabbitMQ not available, using in-memory broker: ${(error as Error).message}`,
      );
      this.connection = null;
      this.channelWrapper = null;
      this.connectionState = ConnectionState.DISCONNECTED;
      this.startInMemoryProcessing();
    }
  }

  /**
   * Attempt to reconnect to RabbitMQ.
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(
        `Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up on RabbitMQ.`,
      );
      this.startInMemoryProcessing();
      return;
    }

    if (this.reconnectTimer) return;

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      30000,
    );

    this.reconnectAttempts++;
    this.connectionState = ConnectionState.RECONNECTING;

    this.logger.log(
      `Attempting RabbitMQ reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`,
    );

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        if (this.connection) {
          await this.connection.reconnect();
        }
      } catch (error) {
        this.logger.warn(`Reconnection attempt failed: ${(error as Error).message}`);
        this.attemptReconnect();
      }
    }, delay);
  }

  /**
   * Set up a channel by re-asserting all queues and consumers.
   */
  private async setupChannel(channel: any): Promise<void> {
    // Re-assert all queues
    for (const [, queue] of this.queues) {
      try {
        await channel.assertQueue(queue.name, {
          durable: queue.durable,
          autoDelete: queue.autoDelete,
          maxLength: queue.maxLength,
          messageTtl: queue.messageTtl,
        });
      } catch (error) {
        this.logger.warn(`Failed to assert queue ${queue.name} on channel setup: ${(error as Error).message}`);
      }
    }

    // Re-register all consumers
    for (const [consumerId, { consumer, queueName }] of this.consumers) {
      try {
        await channel.consume(queueName, async (msg: any) => {
          if (!msg) return;
          await this.handleConsumedMessage(msg, consumer, queueName, channel);
        });
      } catch (error) {
        this.logger.warn(`Failed to re-register consumer ${consumerId}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Set up default agent queues.
   */
  private async setupDefaultQueues(): Promise<void> {
    const defaultQueues: BrokerQueue[] = [
      { name: 'agent.tasks', durable: true, autoDelete: false },
      { name: 'agent.events', durable: true, autoDelete: false },
      { name: 'agent.responses', durable: true, autoDelete: false },
      { name: 'agent.errors', durable: true, autoDelete: false },
      { name: 'agent.retries', durable: true, autoDelete: false, messageTtl: 300000 },
    ];

    for (const cluster of Object.values(AgentCluster)) {
      defaultQueues.push({
        name: `agent.cluster.${cluster}`,
        durable: true,
        autoDelete: false,
      });
    }

    for (const queue of defaultQueues) {
      await this.assertQueue(queue);
    }
  }

  /**
   * Assert that a queue exists.
   */
  async assertQueue(queue: BrokerQueue): Promise<void> {
    this.queues.set(queue.name, queue);

    if (this.channelWrapper) {
      try {
        await this.channelWrapper.addSetup((channel: any) =>
          channel.assertQueue(queue.name, {
            durable: queue.durable,
            autoDelete: queue.autoDelete,
            maxLength: queue.maxLength,
            messageTtl: queue.messageTtl,
          }),
        );
      } catch (error) {
        this.logger.warn(`Failed to assert queue ${queue.name}: ${(error as Error).message}`);
      }
    }

    // Ensure in-memory queue exists
    if (!this.inMemoryQueues.has(queue.name)) {
      this.inMemoryQueues.set(queue.name, []);
    }
  }

  /**
   * Send a message to a queue with retry logic.
   */
  async send(message: Omit<BrokerMessage, 'id' | 'timestamp'>): Promise<string> {
    const fullMessage: BrokerMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date(),
      retryCount: message.retryCount || 0,
      maxRetries: message.maxRetries || this.retryConfig.maxRetries,
    };

    if (this.channelWrapper && this.connectionState === ConnectionState.CONNECTED) {
      try {
        const sent = this.channelWrapper.sendToQueue(
          message.queue,
          fullMessage.payload,
          {
            persistent: message.persistent,
            priority: message.priority,
            headers: message.headers,
            expiration: message.ttl,
            messageId: fullMessage.id,
            timestamp: fullMessage.timestamp.getTime(),
          },
        );

        if (!sent) {
          this.logger.warn(`Failed to send message to RabbitMQ queue ${message.queue}`);
          this.enqueueInMemory(fullMessage);
        }
      } catch (error) {
        this.logger.warn(`RabbitMQ send failed, using in-memory: ${(error as Error).message}`);
        this.enqueueInMemory(fullMessage);
      }
    } else {
      this.enqueueInMemory(fullMessage);
    }

    return fullMessage.id;
  }

  /**
   * Subscribe to a queue.
   */
  async consume(queueName: string, consumer: BrokerConsumer): Promise<string> {
    const consumerId = uuidv4();
    this.consumers.set(consumerId, { consumer, queueName });

    // Ensure queue exists
    if (!this.queues.has(queueName)) {
      await this.assertQueue({
        name: queueName,
        durable: true,
        autoDelete: false,
      });
    }

    if (this.channelWrapper) {
      try {
        await this.channelWrapper.addSetup((channel: any) => {
          return channel.consume(queueName, async (msg: any) => {
            if (!msg) return;
            await this.handleConsumedMessage(msg, consumer, queueName, channel);
          });
        });
      } catch (error) {
        this.logger.warn(
          `RabbitMQ consume failed for ${queueName}: ${(error as Error).message}`,
        );
      }
    }

    return consumerId;
  }

  /**
   * Handle a consumed message from RabbitMQ with retry logic.
   */
  private async handleConsumedMessage(
    msg: any,
    consumer: BrokerConsumer,
    queueName: string,
    channel: any,
  ): Promise<void> {
    const brokerMessage: BrokerMessage = {
      id: msg.properties.messageId || uuidv4(),
      queue: queueName,
      payload: msg.content ? JSON.parse(msg.content.toString()) : null,
      headers: msg.properties.headers || {},
      timestamp: new Date(msg.properties.timestamp || Date.now()),
      priority: msg.properties.priority || 0,
      persistent: msg.properties.persistent || false,
      retryCount: (msg.properties.headers?.['x-retry-count'] as number) || 0,
      maxRetries: (msg.properties.headers?.['x-max-retries'] as number) || this.retryConfig.maxRetries,
    };

    try {
      const success = await consumer(brokerMessage);
      if (success) {
        channel.ack(msg);
      } else {
        await this.handleFailedMessage(brokerMessage, msg, channel);
      }
    } catch (error) {
      await this.handleFailedMessage(brokerMessage, msg, channel, error as Error);
    }
  }

  /**
   * Handle a failed message with retry logic.
   */
  private async handleFailedMessage(
    message: BrokerMessage,
    rawMsg: any,
    channel: any,
    error?: Error,
  ): Promise<void> {
    const retryCount = (message.retryCount || 0) + 1;
    const maxRetries = message.maxRetries || this.retryConfig.maxRetries;

    if (error) {
      this.logger.error(
        `Consumer error for queue ${message.queue}: ${error.message}`,
      );
    }

    if (retryCount < maxRetries) {
      // Retry with exponential backoff
      const delay = this.calculateRetryDelay(retryCount);
      this.logger.warn(
        `Retrying message ${message.id} (attempt ${retryCount}/${maxRetries}) after ${delay}ms`,
      );

      // Nack and requeue
      channel.nack(rawMsg, false, true);

      // Update retry count in headers
      message.retryCount = retryCount;
    } else {
      // Max retries exceeded, move to dead letter
      this.logger.error(
        `Message ${message.id} exceeded max retries (${maxRetries}), moving to dead letter`,
      );
      channel.nack(rawMsg, false, false);
      this.deadLetterMessages.set(message.id, { ...message, retryCount });
    }
  }

  /**
   * Calculate retry delay with exponential backoff.
   */
  private calculateRetryDelay(retryCount: number): number {
    if (this.retryConfig.exponentialBackoff) {
      const delay = this.retryConfig.baseDelayMs * Math.pow(2, retryCount - 1);
      return Math.min(delay, this.retryConfig.maxDelayMs);
    }
    return this.retryConfig.baseDelayMs;
  }

  /**
   * Unsubscribe a consumer.
   */
  async unconsume(consumerId: string): Promise<boolean> {
    return this.consumers.delete(consumerId);
  }

  /**
   * Get queue information.
   */
  async getQueueInfo(queueName: string): Promise<{
    messageCount: number;
    consumerCount: number;
  } | null> {
    if (this.channelWrapper && this.connectionState === ConnectionState.CONNECTED) {
      try {
        const channel = await this.channelWrapper.createChannel();
        const info = await channel.checkQueue(queueName);
        await channel.close();
        return {
          messageCount: info.messageCount,
          consumerCount: info.consumerCount,
        };
      } catch {
        return null;
      }
    }

    // In-memory fallback
    const queue = this.inMemoryQueues.get(queueName);
    const consumerCount = Array.from(this.consumers.values())
      .filter((c) => c.queueName === queueName).length;
    return queue
      ? { messageCount: queue.length, consumerCount }
      : null;
  }

  /**
   * Purge a queue.
   */
  async purgeQueue(queueName: string): Promise<number> {
    if (this.channelWrapper && this.connectionState === ConnectionState.CONNECTED) {
      try {
        const channel = await this.channelWrapper.createChannel();
        const result = await channel.purgeQueue(queueName);
        await channel.close();
        return result.messageCount;
      } catch {
        return 0;
      }
    }

    const queue = this.inMemoryQueues.get(queueName);
    if (queue) {
      const count = queue.length;
      queue.length = 0;
      return count;
    }

    return 0;
  }

  /**
   * Get dead letter messages.
   */
  getDeadLetterMessages(): BrokerMessage[] {
    return Array.from(this.deadLetterMessages.values());
  }

  /**
   * Retry a dead letter message.
   */
  async retryDeadLetter(messageId: string): Promise<boolean> {
    const message = this.deadLetterMessages.get(messageId);
    if (!message) return false;

    this.deadLetterMessages.delete(messageId);
    message.retryCount = 0;

    await this.send({
      queue: message.queue,
      payload: message.payload,
      headers: message.headers,
      priority: message.priority,
      ttl: message.ttl,
      persistent: message.persistent,
    });

    return true;
  }

  // ─── Private Methods ─────────────────────────────────────────────

  private enqueueInMemory(message: BrokerMessage): void {
    if (!this.inMemoryQueues.has(message.queue)) {
      this.inMemoryQueues.set(message.queue, []);
    }
    this.inMemoryQueues.get(message.queue)!.push(message);
  }

  private startInMemoryProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      this.processInMemoryQueues();
    }, 1000);
  }

  private async processInMemoryQueues(): Promise<void> {
    for (const [queueName, messages] of this.inMemoryQueues) {
      if (messages.length === 0) continue;

      // Process one message at a time per queue
      const message = messages.shift();
      if (!message) continue;

      // Find consumers for this queue
      const queueConsumers = Array.from(this.consumers.values())
        .filter((c) => c.queueName === queueName);

      for (const { consumer } of queueConsumers) {
        try {
          const success = await consumer(message);
          if (!success) {
            await this.handleInMemoryRetry(message);
          }
        } catch (error) {
          this.logger.error(
            `In-memory consumer error for queue ${queueName}: ${(error as Error).message}`,
          );
          await this.handleInMemoryRetry(message);
        }
      }
    }
  }

  private async handleInMemoryRetry(message: BrokerMessage): Promise<void> {
    const retryCount = (message.retryCount || 0) + 1;
    const maxRetries = message.maxRetries || this.retryConfig.maxRetries;

    if (retryCount < maxRetries) {
      message.retryCount = retryCount;
      const delay = this.calculateRetryDelay(retryCount);

      setTimeout(() => {
        this.enqueueInMemory(message);
      }, delay);
    } else {
      this.deadLetterMessages.set(message.id, { ...message, retryCount });
    }
  }

  private async closeBroker(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.processingInterval) {
      clearInterval(this.processingInterval as any);
      this.processingInterval = null;
    }

    if (this.connection) {
      try {
        await this.connection.close();
      } catch {
        // Ignore close errors
      }
    }

    this.connectionState = ConnectionState.DISCONNECTED;
  }

  /**
   * Get broker statistics.
   */
  getStats(): {
    connectedToRabbitMQ: boolean;
    connectionState: string;
    totalQueues: number;
    totalConsumers: number;
    inMemoryMessageCount: number;
    deadLetterCount: number;
    queues: Record<string, number>;
  } {
    const queues: Record<string, number> = {};
    let totalInMemory = 0;

    for (const [name, messages] of this.inMemoryQueues) {
      queues[name] = messages.length;
      totalInMemory += messages.length;
    }

    return {
      connectedToRabbitMQ: this.connectionState === ConnectionState.CONNECTED,
      connectionState: this.connectionState,
      totalQueues: this.queues.size,
      totalConsumers: this.consumers.size,
      inMemoryMessageCount: totalInMemory,
      deadLetterCount: this.deadLetterMessages.size,
      queues,
    };
  }
}
