"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueuesModule = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const mission_queue_processor_1 = require("./mission-queue.processor");
const task_queue_processor_1 = require("./task-queue.processor");
const event_queue_processor_1 = require("./event-queue.processor");
const software_factory_module_1 = require("../software-factory/software-factory.module");
const realtime_module_1 = require("../realtime/realtime.module");
const events_module_1 = require("../agents/events/events.module");
const agent_registry_module_1 = require("../agents/registry/agent-registry.module");
const communication_module_1 = require("../agents/communication/communication.module");
let QueuesModule = class QueuesModule {
};
exports.QueuesModule = QueuesModule;
exports.QueuesModule = QueuesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bull_1.BullModule.registerQueue({
                name: 'mission:queue',
                defaultJobOptions: {
                    removeOnComplete: 100,
                    removeOnFail: 500,
                    attempts: 2,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                    timeout: 600000,
                },
            }, {
                name: 'task:queue',
                defaultJobOptions: {
                    removeOnComplete: 200,
                    removeOnFail: 500,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                    timeout: 120000,
                },
            }, {
                name: 'event:queue',
                defaultJobOptions: {
                    removeOnComplete: 500,
                    removeOnFail: 200,
                    attempts: 2,
                    backoff: {
                        type: 'exponential',
                        delay: 1000,
                    },
                    timeout: 30000,
                },
            }),
            software_factory_module_1.SoftwareFactoryModule,
            realtime_module_1.RealtimeModule,
            events_module_1.EventsModule,
            agent_registry_module_1.AgentRegistryModule,
            communication_module_1.CommunicationModule,
        ],
        providers: [
            mission_queue_processor_1.MissionQueueProcessor,
            task_queue_processor_1.TaskQueueProcessor,
            event_queue_processor_1.EventQueueProcessor,
        ],
        exports: [],
    })
], QueuesModule);
//# sourceMappingURL=queues.module.js.map