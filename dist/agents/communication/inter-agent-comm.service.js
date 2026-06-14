"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var InterAgentCommService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterAgentCommService = exports.MessageType = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const agent_event_interface_1 = require("../interfaces/agent-event.interface");
const event_bus_service_1 = require("../events/event-bus.service");
const agent_registry_service_1 = require("../registry/agent-registry.service");
var MessageType;
(function (MessageType) {
    MessageType["DIRECT"] = "direct";
    MessageType["BROADCAST"] = "broadcast";
    MessageType["REQUEST"] = "request";
    MessageType["RESPONSE"] = "response";
    MessageType["NOTIFICATION"] = "notification";
})(MessageType || (exports.MessageType = MessageType = {}));
let InterAgentCommService = InterAgentCommService_1 = class InterAgentCommService {
    constructor(eventBus, agentRegistry) {
        this.eventBus = eventBus;
        this.agentRegistry = agentRegistry;
        this.logger = new common_1.Logger(InterAgentCommService_1.name);
        this.handlers = new Map();
        this.pendingRequests = new Map();
        this.messageHistory = [];
        this.cleanupInterval = null;
    }
    async onModuleInit() {
        await this.eventBus.subscribe({
            subscriberId: 'inter-agent-comm',
            eventType: agent_event_interface_1.AgentEventType.MESSAGE_RECEIVED,
            handler: (event) => this.handleIncomingMessage(event),
        });
        this.cleanupInterval = setInterval(() => {
            this.cleanupPendingRequests();
        }, InterAgentCommService_1.CLEANUP_INTERVAL_MS);
        this.logger.log('Inter-Agent Communication service initialized');
    }
    onModuleDestroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error('Service shutting down'));
        }
        this.pendingRequests.clear();
        this.handlers.clear();
    }
    async sendDirect(sourceAgentId, targetAgentId, payload, options) {
        const message = {
            id: (0, uuid_1.v4)(),
            type: MessageType.DIRECT,
            sourceAgentId,
            targetAgentId,
            payload,
            correlationId: options?.correlationId || (0, uuid_1.v4)(),
            timestamp: new Date(),
            ttl: options?.ttl,
            priority: options?.priority || 1,
            metadata: options?.metadata || {},
        };
        await this.publishMessage(message);
        this.logger.debug?.(`Direct message sent from ${sourceAgentId} to ${targetAgentId}`);
        return message.id;
    }
    async broadcast(sourceAgentId, targetCluster, payload, options) {
        const message = {
            id: (0, uuid_1.v4)(),
            type: MessageType.BROADCAST,
            sourceAgentId,
            targetCluster,
            payload,
            correlationId: options?.correlationId || (0, uuid_1.v4)(),
            timestamp: new Date(),
            priority: options?.priority || 1,
            metadata: options?.metadata || {},
        };
        await this.publishMessage(message);
        const agents = this.agentRegistry.getAgentsByCluster(targetCluster);
        this.logger.debug?.(`Broadcast message sent from ${sourceAgentId} to cluster ${targetCluster} (${agents.length} agents)`);
        return message.id;
    }
    async request(sourceAgentId, targetAgentId, payload, options) {
        const correlationId = options?.correlationId || (0, uuid_1.v4)();
        const timeoutMs = options?.timeout || InterAgentCommService_1.REQUEST_TIMEOUT_MS;
        const message = {
            id: (0, uuid_1.v4)(),
            type: MessageType.REQUEST,
            sourceAgentId,
            targetAgentId,
            payload,
            correlationId,
            timestamp: new Date(),
            priority: options?.priority || 2,
            metadata: options?.metadata || {},
        };
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(correlationId);
                reject(new Error(`Request timed out after ${timeoutMs}ms (correlationId: ${correlationId})`));
            }, timeoutMs);
            this.pendingRequests.set(correlationId, {
                id: correlationId,
                message,
                resolve: resolve,
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
    async respond(sourceAgentId, originalMessage, payload) {
        const message = {
            id: (0, uuid_1.v4)(),
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
        const pending = this.pendingRequests.get(originalMessage.correlationId);
        if (pending) {
            clearTimeout(pending.timeout);
            pending.resolve(message);
            this.pendingRequests.delete(originalMessage.correlationId);
        }
        return message.id;
    }
    async notify(sourceAgentId, targetAgentId, payload) {
        const message = {
            id: (0, uuid_1.v4)(),
            type: MessageType.NOTIFICATION,
            sourceAgentId,
            targetAgentId,
            payload,
            correlationId: (0, uuid_1.v4)(),
            timestamp: new Date(),
            priority: 0,
            metadata: {},
        };
        await this.publishMessage(message);
        return message.id;
    }
    registerHandler(agentId, handler) {
        this.handlers.set(agentId, handler);
    }
    unregisterHandler(agentId) {
        this.handlers.delete(agentId);
    }
    getMessageHistory(filter) {
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
    getStats() {
        const messagesByType = {};
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
            messagesByType: messagesByType,
        };
    }
    async publishMessage(message) {
        this.messageHistory.push(message);
        if (this.messageHistory.length > InterAgentCommService_1.MAX_HISTORY_SIZE) {
            this.messageHistory.shift();
        }
        await this.eventBus.publish({
            type: agent_event_interface_1.AgentEventType.MESSAGE_SENT,
            sourceAgentId: message.sourceAgentId,
            targetAgentId: message.targetAgentId,
            cluster: message.targetCluster,
            payload: message,
            priority: message.priority,
            correlationId: message.correlationId,
            metadata: message.metadata,
        });
    }
    async handleIncomingMessage(event) {
        const message = event.payload;
        if (!message)
            return;
        if (message.targetAgentId) {
            const handler = this.handlers.get(message.targetAgentId);
            if (handler) {
                try {
                    const result = await handler(message);
                    if (message.type === MessageType.REQUEST && result) {
                        await this.respond(message.targetAgentId, message, result.payload);
                    }
                }
                catch (error) {
                    this.logger.error(`Error handling message for agent ${message.targetAgentId}: ${error.message}`);
                }
            }
        }
        if (message.type === MessageType.BROADCAST && message.targetCluster) {
            const agents = this.agentRegistry.getAgentsByCluster(message.targetCluster);
            for (const agent of agents) {
                const agentId = agent.getConfig().id;
                if (agentId === message.sourceAgentId)
                    continue;
                const handler = this.handlers.get(agentId);
                if (handler) {
                    try {
                        await handler(message);
                    }
                    catch (error) {
                        this.logger.error(`Error handling broadcast for agent ${agentId}: ${error.message}`);
                    }
                }
            }
        }
    }
    cleanupPendingRequests() {
        const now = Date.now();
        const expiredRequests = [];
        for (const [correlationId, pending] of this.pendingRequests) {
            const age = now - pending.createdAt.getTime();
            if (age > InterAgentCommService_1.REQUEST_TIMEOUT_MS * 2) {
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
};
exports.InterAgentCommService = InterAgentCommService;
InterAgentCommService.REQUEST_TIMEOUT_MS = 30000;
InterAgentCommService.MAX_HISTORY_SIZE = 1000;
InterAgentCommService.CLEANUP_INTERVAL_MS = 30000;
exports.InterAgentCommService = InterAgentCommService = InterAgentCommService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService,
        agent_registry_service_1.AgentRegistryService])
], InterAgentCommService);
//# sourceMappingURL=inter-agent-comm.service.js.map