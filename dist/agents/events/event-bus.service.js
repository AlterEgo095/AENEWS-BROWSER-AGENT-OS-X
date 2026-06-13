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
var EventBusService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBusService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const uuid_1 = require("uuid");
const event_store_service_1 = require("./event-store.service");
const dead_letter_queue_service_1 = require("./dead-letter-queue.service");
let EventBusService = EventBusService_1 = class EventBusService {
    constructor(eventEmitter, eventStore, deadLetterQueue) {
        this.eventEmitter = eventEmitter;
        this.eventStore = eventStore;
        this.deadLetterQueue = deadLetterQueue;
        this.logger = new common_1.Logger(EventBusService_1.name);
        this.subscriptions = new Map();
        this.typeIndex = new Map();
        this.subscriberIndex = new Map();
        this.eventVersion = 1;
    }
    async onModuleInit() {
        this.logger.log('Event Bus initialized');
    }
    async onModuleDestroy() {
        this.subscriptions.clear();
        this.typeIndex.clear();
        this.subscriberIndex.clear();
        this.logger.log('Event Bus destroyed');
    }
    async publish(eventData) {
        const event = {
            ...eventData,
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            version: this.eventVersion,
        };
        this.logger.debug?.(`Publishing event ${event.type} from ${event.sourceAgentId}`);
        try {
            await this.eventStore.store(event);
        }
        catch (error) {
            this.logger.warn(`Failed to store event ${event.id}: ${error.message}`);
        }
        try {
            await this.eventEmitter.emitAsync(event.type, event);
            await this.eventEmitter.emitAsync('*', event);
            if (event.cluster) {
                await this.eventEmitter.emitAsync(`cluster:${event.cluster}`, event);
            }
        }
        catch (error) {
            this.logger.error(`Error emitting event ${event.type}: ${error.message}`);
        }
        await this.deliverToSubscriptions(event);
        return event;
    }
    async subscribe(subscription) {
        const id = (0, uuid_1.v4)();
        const fullSubscription = {
            ...subscription,
            id,
            createdAt: new Date(),
        };
        this.subscriptions.set(id, fullSubscription);
        const eventType = subscription.eventType;
        if (!this.typeIndex.has(eventType)) {
            this.typeIndex.set(eventType, new Set());
        }
        this.typeIndex.get(eventType).add(id);
        const subscriberId = subscription.subscriberId;
        if (!this.subscriberIndex.has(subscriberId)) {
            this.subscriberIndex.set(subscriberId, new Set());
        }
        this.subscriberIndex.get(subscriberId).add(id);
        if (eventType === '*') {
            this.eventEmitter.on('*', (event) => {
                this.handleEvent(fullSubscription, event);
            });
        }
        else {
            this.eventEmitter.on(eventType, (event) => {
                this.handleEvent(fullSubscription, event);
            });
        }
        this.logger.debug?.(`Subscription ${id} created for ${eventType} by ${subscriberId}`);
        return id;
    }
    async unsubscribe(subscriptionId) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription)
            return false;
        const typeSet = this.typeIndex.get(subscription.eventType);
        if (typeSet) {
            typeSet.delete(subscriptionId);
            if (typeSet.size === 0) {
                this.typeIndex.delete(subscription.eventType);
            }
        }
        const subscriberSet = this.subscriberIndex.get(subscription.subscriberId);
        if (subscriberSet) {
            subscriberSet.delete(subscriptionId);
            if (subscriberSet.size === 0) {
                this.subscriberIndex.delete(subscription.subscriberId);
            }
        }
        this.eventEmitter.removeListener(subscription.eventType, subscription.handler);
        this.subscriptions.delete(subscriptionId);
        this.logger.debug?.(`Subscription ${subscriptionId} removed`);
        return true;
    }
    async getSubscriptions(subscriberId) {
        if (subscriberId) {
            const subscriptionIds = this.subscriberIndex.get(subscriberId);
            if (!subscriptionIds)
                return [];
            return Array.from(subscriptionIds)
                .map((id) => this.subscriptions.get(id))
                .filter((s) => s !== undefined);
        }
        return Array.from(this.subscriptions.values());
    }
    async publishEvent(event) {
        if (!event.id) {
            event.id = (0, uuid_1.v4)();
        }
        if (!event.timestamp) {
            event.timestamp = new Date();
        }
        if (!event.version) {
            event.version = this.eventVersion;
        }
        this.logger.debug?.(`Publishing event ${event.type} from ${event.sourceAgentId}`);
        try {
            await this.eventStore.store(event);
        }
        catch (error) {
            this.logger.warn(`Failed to store event ${event.id}: ${error.message}`);
        }
        try {
            await this.eventEmitter.emitAsync(event.type, event);
            await this.eventEmitter.emitAsync('*', event);
            if (event.cluster) {
                await this.eventEmitter.emitAsync(`cluster:${event.cluster}`, event);
            }
        }
        catch (error) {
            this.logger.error(`Error emitting event ${event.type}: ${error.message}`);
        }
        await this.deliverToSubscriptions(event);
    }
    subscribeTo(eventType, handler) {
        const id = (0, uuid_1.v4)();
        const subscription = {
            id,
            subscriberId: `sub-${id.substring(0, 8)}`,
            eventType: eventType,
            handler,
            createdAt: new Date(),
        };
        this.subscriptions.set(id, subscription);
        if (!this.typeIndex.has(eventType)) {
            this.typeIndex.set(eventType, new Set());
        }
        this.typeIndex.get(eventType).add(id);
        if (!this.subscriberIndex.has(subscription.subscriberId)) {
            this.subscriberIndex.set(subscription.subscriberId, new Set());
        }
        this.subscriberIndex.get(subscription.subscriberId).add(id);
        this.eventEmitter.on(eventType, (event) => {
            this.handleEvent(subscription, event);
        });
        this.logger.debug?.(`Simple subscription ${id} created for ${eventType}`);
        return id;
    }
    unsubscribeFrom(subscriptionId) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription)
            return;
        const typeSet = this.typeIndex.get(subscription.eventType);
        if (typeSet) {
            typeSet.delete(subscriptionId);
            if (typeSet.size === 0) {
                this.typeIndex.delete(subscription.eventType);
            }
        }
        const subscriberSet = this.subscriberIndex.get(subscription.subscriberId);
        if (subscriberSet) {
            subscriberSet.delete(subscriptionId);
            if (subscriberSet.size === 0) {
                this.subscriberIndex.delete(subscription.subscriberId);
            }
        }
        this.eventEmitter.removeListener(subscription.eventType, subscription.handler);
        this.subscriptions.delete(subscriptionId);
        this.logger.debug?.(`Subscription ${subscriptionId} removed (IAgentEventBus)`);
    }
    async getEventHistory(agentId, limit) {
        const entries = await this.eventStore.query({
            sourceAgentId: agentId,
            limit: limit || 100,
        });
        return entries.map((entry) => entry.event);
    }
    async *replayEvents(fromTimestamp, toTimestamp) {
        const entries = await this.eventStore.query({
            fromTimestamp,
            toTimestamp,
            limit: 10000,
        });
        for (const entry of entries) {
            yield entry.event;
        }
    }
    getDeadLetterQueue() {
        return this.deadLetterQueue.getAll();
    }
    async retryDeadLetter(entryId) {
        const success = await this.deadLetterQueue.retry(entryId);
        if (!success) {
            this.logger.warn(`Failed to retry dead letter entry ${entryId}`);
        }
    }
    purgeDeadLetterQueue() {
        this.deadLetterQueue.purge();
        this.logger.log('Dead letter queue purged');
    }
    async deliverToSubscriptions(event) {
        const matchingSubscriptions = [];
        const typeSubs = this.typeIndex.get(event.type);
        if (typeSubs) {
            for (const subId of typeSubs) {
                const sub = this.subscriptions.get(subId);
                if (sub)
                    matchingSubscriptions.push(sub);
            }
        }
        const wildcardSubs = this.typeIndex.get('*');
        if (wildcardSubs) {
            for (const subId of wildcardSubs) {
                const sub = this.subscriptions.get(subId);
                if (sub && !matchingSubscriptions.includes(sub)) {
                    matchingSubscriptions.push(sub);
                }
            }
        }
        for (const subscription of matchingSubscriptions) {
            await this.handleEvent(subscription, event);
        }
    }
    async handleEvent(subscription, event) {
        try {
            if (subscription.filter && !this.matchesFilter(event, subscription.filter)) {
                return;
            }
            await subscription.handler(event);
            const storeEntry = await this.eventStore.getEvent(event.id);
            if (storeEntry) {
                await this.eventStore.markProcessed(storeEntry.id);
            }
        }
        catch (error) {
            this.logger.error(`Error handling event ${event.type} for subscription ${subscription.id}: ${error.message}`);
            try {
                await this.deadLetterQueue.add({
                    originalEvent: event,
                    error: error.message,
                    failureCount: 1,
                    lastFailedAt: new Date(),
                    canRetry: true,
                    metadata: {
                        subscriptionId: subscription.id,
                        subscriberId: subscription.subscriberId,
                    },
                });
            }
            catch (dlqError) {
                this.logger.error(`Failed to add event to dead letter queue: ${dlqError.message}`);
            }
            this.eventEmitter.emit('event.handler.failed', {
                event,
                subscription,
                error: error.message,
            });
        }
    }
    matchesFilter(event, filter) {
        if (filter.sourceAgentId && event.sourceAgentId !== filter.sourceAgentId) {
            return false;
        }
        if (filter.cluster && event.cluster !== filter.cluster) {
            return false;
        }
        if (filter.priorityMin !== undefined && event.priority < filter.priorityMin) {
            return false;
        }
        if (filter.custom && !filter.custom(event)) {
            return false;
        }
        return true;
    }
    getStats() {
        const subscriptionsByType = {};
        for (const [type, subs] of this.typeIndex) {
            subscriptionsByType[type] = subs.size;
        }
        return {
            totalSubscriptions: this.subscriptions.size,
            subscriptionsByType,
            totalSubscribers: this.subscriberIndex.size,
            deadLetterCount: this.deadLetterQueue.getCount(),
        };
    }
};
exports.EventBusService = EventBusService;
exports.EventBusService = EventBusService = EventBusService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2,
        event_store_service_1.EventStoreService,
        dead_letter_queue_service_1.DeadLetterQueueService])
], EventBusService);
//# sourceMappingURL=event-bus.service.js.map