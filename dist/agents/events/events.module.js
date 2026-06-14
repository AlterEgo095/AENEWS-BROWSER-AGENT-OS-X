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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsModule = exports.EventsModuleInitializer = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const event_bus_service_1 = require("./event-bus.service");
const event_store_service_1 = require("./event-store.service");
const dead_letter_queue_service_1 = require("./dead-letter-queue.service");
const event_replay_service_1 = require("./event-replay.service");
let EventsModuleInitializer = class EventsModuleInitializer {
    constructor(eventBus, deadLetterQueue) {
        this.eventBus = eventBus;
        this.deadLetterQueue = deadLetterQueue;
    }
    async onModuleInit() {
        this.deadLetterQueue.setEventBus(this.eventBus);
    }
};
exports.EventsModuleInitializer = EventsModuleInitializer;
exports.EventsModuleInitializer = EventsModuleInitializer = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService,
        dead_letter_queue_service_1.DeadLetterQueueService])
], EventsModuleInitializer);
let EventsModule = class EventsModule {
};
exports.EventsModule = EventsModule;
exports.EventsModule = EventsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            event_emitter_1.EventEmitterModule.forRoot({
                wildcard: true,
                delimiter: '.',
                newListener: false,
                removeListener: false,
                maxListeners: 20,
            }),
        ],
        providers: [
            event_bus_service_1.EventBusService,
            event_store_service_1.EventStoreService,
            dead_letter_queue_service_1.DeadLetterQueueService,
            event_replay_service_1.EventReplayService,
            EventsModuleInitializer,
        ],
        exports: [event_bus_service_1.EventBusService, event_store_service_1.EventStoreService, dead_letter_queue_service_1.DeadLetterQueueService, event_replay_service_1.EventReplayService],
    })
], EventsModule);
//# sourceMappingURL=events.module.js.map