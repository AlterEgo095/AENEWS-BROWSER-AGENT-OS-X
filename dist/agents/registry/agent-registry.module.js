"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistryModule = void 0;
const common_1 = require("@nestjs/common");
const agent_registry_service_1 = require("./agent-registry.service");
const events_module_1 = require("../events/events.module");
let AgentRegistryModule = class AgentRegistryModule {
};
exports.AgentRegistryModule = AgentRegistryModule;
exports.AgentRegistryModule = AgentRegistryModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [events_module_1.EventsModule],
        providers: [agent_registry_service_1.AgentRegistryService],
        exports: [agent_registry_service_1.AgentRegistryService],
    })
], AgentRegistryModule);
//# sourceMappingURL=agent-registry.module.js.map