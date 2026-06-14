"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MessageBrokerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageBrokerService = exports.ExchangeType = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const uuid_1 = require("uuid");
const agent_interface_1 = require("../interfaces/agent.interface");
var ExchangeType;
(function (ExchangeType) {
    ExchangeType["DIRECT"] = "direct";
    ExchangeType["TOPIC"] = "topic";
    ExchangeType["FANOUT"] = "fanout";
    ExchangeType["HEADERS"] = "headers";
})(ExchangeType || (exports.ExchangeType = ExchangeType = {}));
const DEFAULT_RETRY_CONFIG = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    exponentialBackoff: true,
};
var ConnectionState;
(function (ConnectionState) {
    ConnectionState["DISCONNECTED"] = "disconnected";
    ConnectionState["CONNECTING"] = "connecting";
    ConnectionState["CONNECTED"] = "connected";
    ConnectionState["RECONNECTING"] = "reconnecting";
})(ConnectionState || (ConnectionState = {}));
let MessageBrokerService = MessageBrokerService_1 = class MessageBrokerService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(MessageBrokerService_1.name);
        this.connection = null;
        this.channelWrapper = null;
        this.connectionState = ConnectionState.DISCONNECTED;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectTimer = null;
        this.consumers = new Map();
        this.queues = new Map();
        this.retryConfig = { ...DEFAULT_RETRY_CONFIG };
        this.inMemoryQueues = new Map();
        this.deadLetterMessages = new Map();
        this.processingInterval = null;
    }
    async onModuleInit() {
        await this.initializeBroker();
    }
    async onModuleDestroy() {
        await this.closeBroker();
    }
    async initializeBroker() {
        try {
            this.connectionState = ConnectionState.CONNECTING;
            const amqp = await Promise.resolve().then(() => __importStar(require('amqp-connection-manager')));
            const url = this.configService.get('RABBITMQ_URL', 'amqp://localhost:5672');
            this.connection = amqp.default.connect([url]);
            this.connection.on('connect', () => {
                this.connectionState = ConnectionState.CONNECTED;
                this.reconnectAttempts = 0;
                this.logger.log('Connected to RabbitMQ');
            });
            this.connection.on('disconnect', (err) => {
                this.connectionState = ConnectionState.DISCONNECTED;
                this.logger.warn(`Disconnected from RabbitMQ: ${err?.message || 'Unknown error'}`);
                this.attemptReconnect();
            });
            this.connection.on('connectFailed', (err) => {
                this.logger.warn(`RabbitMQ connection failed: ${err?.message || 'Unknown error'}`);
            });
            this.channelWrapper = this.connection.createChannel({
                json: true,
                setup: (channel) => {
                    return this.setupChannel(channel);
                },
            });
            await this.channelWrapper.waitForConnect();
            await this.setupDefaultQueues();
            this.logger.log('Message Broker initialized with RabbitMQ');
        }
        catch (error) {
            this.logger.warn(`RabbitMQ not available, using in-memory broker: ${error.message}`);
            this.connection = null;
            this.channelWrapper = null;
            this.connectionState = ConnectionState.DISCONNECTED;
            this.startInMemoryProcessing();
        }
    }
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up on RabbitMQ.`);
            this.startInMemoryProcessing();
            return;
        }
        if (this.reconnectTimer)
            return;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;
        this.connectionState = ConnectionState.RECONNECTING;
        this.logger.log(`Attempting RabbitMQ reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            try {
                if (this.connection) {
                    await this.connection.reconnect();
                }
            }
            catch (error) {
                this.logger.warn(`Reconnection attempt failed: ${error.message}`);
                this.attemptReconnect();
            }
        }, delay);
    }
    async setupChannel(channel) {
        for (const [, queue] of this.queues) {
            try {
                await channel.assertQueue(queue.name, {
                    durable: queue.durable,
                    autoDelete: queue.autoDelete,
                    maxLength: queue.maxLength,
                    messageTtl: queue.messageTtl,
                });
            }
            catch (error) {
                this.logger.warn(`Failed to assert queue ${queue.name} on channel setup: ${error.message}`);
            }
        }
        for (const [consumerId, { consumer, queueName }] of this.consumers) {
            try {
                await channel.consume(queueName, async (msg) => {
                    if (!msg)
                        return;
                    await this.handleConsumedMessage(msg, consumer, queueName, channel);
                });
            }
            catch (error) {
                this.logger.warn(`Failed to re-register consumer ${consumerId}: ${error.message}`);
            }
        }
    }
    async setupDefaultQueues() {
        const defaultQueues = [
            { name: 'agent.tasks', durable: true, autoDelete: false },
            { name: 'agent.events', durable: true, autoDelete: false },
            { name: 'agent.responses', durable: true, autoDelete: false },
            { name: 'agent.errors', durable: true, autoDelete: false },
            { name: 'agent.retries', durable: true, autoDelete: false, messageTtl: 300000 },
        ];
        for (const cluster of Object.values(agent_interface_1.AgentCluster)) {
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
    async assertQueue(queue) {
        this.queues.set(queue.name, queue);
        if (this.channelWrapper) {
            try {
                await this.channelWrapper.addSetup((channel) => channel.assertQueue(queue.name, {
                    durable: queue.durable,
                    autoDelete: queue.autoDelete,
                    maxLength: queue.maxLength,
                    messageTtl: queue.messageTtl,
                }));
            }
            catch (error) {
                this.logger.warn(`Failed to assert queue ${queue.name}: ${error.message}`);
            }
        }
        if (!this.inMemoryQueues.has(queue.name)) {
            this.inMemoryQueues.set(queue.name, []);
        }
    }
    async send(message) {
        const fullMessage = {
            ...message,
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            retryCount: message.retryCount || 0,
            maxRetries: message.maxRetries || this.retryConfig.maxRetries,
        };
        if (this.channelWrapper && this.connectionState === ConnectionState.CONNECTED) {
            try {
                const sent = this.channelWrapper.sendToQueue(message.queue, fullMessage.payload, {
                    persistent: message.persistent,
                    priority: message.priority,
                    headers: message.headers,
                    expiration: message.ttl,
                    messageId: fullMessage.id,
                    timestamp: fullMessage.timestamp.getTime(),
                });
                if (!sent) {
                    this.logger.warn(`Failed to send message to RabbitMQ queue ${message.queue}`);
                    this.enqueueInMemory(fullMessage);
                }
            }
            catch (error) {
                this.logger.warn(`RabbitMQ send failed, using in-memory: ${error.message}`);
                this.enqueueInMemory(fullMessage);
            }
        }
        else {
            this.enqueueInMemory(fullMessage);
        }
        return fullMessage.id;
    }
    async consume(queueName, consumer) {
        const consumerId = (0, uuid_1.v4)();
        this.consumers.set(consumerId, { consumer, queueName });
        if (!this.queues.has(queueName)) {
            await this.assertQueue({
                name: queueName,
                durable: true,
                autoDelete: false,
            });
        }
        if (this.channelWrapper) {
            try {
                await this.channelWrapper.addSetup((channel) => {
                    return channel.consume(queueName, async (msg) => {
                        if (!msg)
                            return;
                        await this.handleConsumedMessage(msg, consumer, queueName, channel);
                    });
                });
            }
            catch (error) {
                this.logger.warn(`RabbitMQ consume failed for ${queueName}: ${error.message}`);
            }
        }
        return consumerId;
    }
    async handleConsumedMessage(msg, consumer, queueName, channel) {
        const brokerMessage = {
            id: msg.properties.messageId || (0, uuid_1.v4)(),
            queue: queueName,
            payload: msg.content ? JSON.parse(msg.content.toString()) : null,
            headers: msg.properties.headers || {},
            timestamp: new Date(msg.properties.timestamp || Date.now()),
            priority: msg.properties.priority || 0,
            persistent: msg.properties.persistent || false,
            retryCount: msg.properties.headers?.['x-retry-count'] || 0,
            maxRetries: msg.properties.headers?.['x-max-retries'] || this.retryConfig.maxRetries,
        };
        try {
            const success = await consumer(brokerMessage);
            if (success) {
                channel.ack(msg);
            }
            else {
                await this.handleFailedMessage(brokerMessage, msg, channel);
            }
        }
        catch (error) {
            await this.handleFailedMessage(brokerMessage, msg, channel, error);
        }
    }
    async handleFailedMessage(message, rawMsg, channel, error) {
        const retryCount = (message.retryCount || 0) + 1;
        const maxRetries = message.maxRetries || this.retryConfig.maxRetries;
        if (error) {
            this.logger.error(`Consumer error for queue ${message.queue}: ${error.message}`);
        }
        if (retryCount < maxRetries) {
            const delay = this.calculateRetryDelay(retryCount);
            this.logger.warn(`Retrying message ${message.id} (attempt ${retryCount}/${maxRetries}) after ${delay}ms`);
            channel.nack(rawMsg, false, true);
            message.retryCount = retryCount;
        }
        else {
            this.logger.error(`Message ${message.id} exceeded max retries (${maxRetries}), moving to dead letter`);
            channel.nack(rawMsg, false, false);
            this.deadLetterMessages.set(message.id, { ...message, retryCount });
        }
    }
    calculateRetryDelay(retryCount) {
        if (this.retryConfig.exponentialBackoff) {
            const delay = this.retryConfig.baseDelayMs * Math.pow(2, retryCount - 1);
            return Math.min(delay, this.retryConfig.maxDelayMs);
        }
        return this.retryConfig.baseDelayMs;
    }
    async unconsume(consumerId) {
        return this.consumers.delete(consumerId);
    }
    async getQueueInfo(queueName) {
        if (this.channelWrapper && this.connectionState === ConnectionState.CONNECTED) {
            try {
                const channel = await this.channelWrapper.createChannel();
                const info = await channel.checkQueue(queueName);
                await channel.close();
                return {
                    messageCount: info.messageCount,
                    consumerCount: info.consumerCount,
                };
            }
            catch {
                return null;
            }
        }
        const queue = this.inMemoryQueues.get(queueName);
        const consumerCount = Array.from(this.consumers.values()).filter((c) => c.queueName === queueName).length;
        return queue ? { messageCount: queue.length, consumerCount } : null;
    }
    async purgeQueue(queueName) {
        if (this.channelWrapper && this.connectionState === ConnectionState.CONNECTED) {
            try {
                const channel = await this.channelWrapper.createChannel();
                const result = await channel.purgeQueue(queueName);
                await channel.close();
                return result.messageCount;
            }
            catch {
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
    getDeadLetterMessages() {
        return Array.from(this.deadLetterMessages.values());
    }
    async retryDeadLetter(messageId) {
        const message = this.deadLetterMessages.get(messageId);
        if (!message)
            return false;
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
    enqueueInMemory(message) {
        if (!this.inMemoryQueues.has(message.queue)) {
            this.inMemoryQueues.set(message.queue, []);
        }
        this.inMemoryQueues.get(message.queue).push(message);
    }
    startInMemoryProcessing() {
        if (this.processingInterval)
            return;
        this.processingInterval = setInterval(() => {
            this.processInMemoryQueues();
        }, 1000);
    }
    async processInMemoryQueues() {
        for (const [queueName, messages] of this.inMemoryQueues) {
            if (messages.length === 0)
                continue;
            const message = messages.shift();
            if (!message)
                continue;
            const queueConsumers = Array.from(this.consumers.values()).filter((c) => c.queueName === queueName);
            for (const { consumer } of queueConsumers) {
                try {
                    const success = await consumer(message);
                    if (!success) {
                        await this.handleInMemoryRetry(message);
                    }
                }
                catch (error) {
                    this.logger.error(`In-memory consumer error for queue ${queueName}: ${error.message}`);
                    await this.handleInMemoryRetry(message);
                }
            }
        }
    }
    async handleInMemoryRetry(message) {
        const retryCount = (message.retryCount || 0) + 1;
        const maxRetries = message.maxRetries || this.retryConfig.maxRetries;
        if (retryCount < maxRetries) {
            message.retryCount = retryCount;
            const delay = this.calculateRetryDelay(retryCount);
            setTimeout(() => {
                this.enqueueInMemory(message);
            }, delay);
        }
        else {
            this.deadLetterMessages.set(message.id, { ...message, retryCount });
        }
    }
    async closeBroker() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        if (this.connection) {
            try {
                await this.connection.close();
            }
            catch {
            }
        }
        this.connectionState = ConnectionState.DISCONNECTED;
    }
    getStats() {
        const queues = {};
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
};
exports.MessageBrokerService = MessageBrokerService;
exports.MessageBrokerService = MessageBrokerService = MessageBrokerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MessageBrokerService);
//# sourceMappingURL=message-broker.service.js.map