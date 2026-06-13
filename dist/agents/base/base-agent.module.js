"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgentModule = void 0;
const common_1 = require("@nestjs/common");
const event_bus_service_1 = require("../events/event-bus.service");
const memory_service_1 = require("../memory/memory.service");
const events_module_1 = require("../events/events.module");
const memory_module_1 = require("../memory/memory.module");
let BaseAgentModule = class BaseAgentModule {
};
exports.BaseAgentModule = BaseAgentModule;
exports.BaseAgentModule = BaseAgentModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [events_module_1.EventsModule, memory_module_1.MemoryModule],
        providers: [],
        exports: [events_module_1.EventsModule, memory_module_1.MemoryModule, event_bus_service_1.EventBusService, memory_service_1.MemoryService],
    })
], BaseAgentModule);
//# sourceMappingURL=base-agent.module.js.map