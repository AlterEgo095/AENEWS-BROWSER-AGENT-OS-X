"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("./base/base-agent.module");
const agent_registry_module_1 = require("./registry/agent-registry.module");
const orchestrator_module_1 = require("./orchestrator/orchestrator.module");
const memory_module_1 = require("./memory/memory.module");
const events_module_1 = require("./events/events.module");
const communication_module_1 = require("./communication/communication.module");
const health_module_1 = require("./health/health.module");
let AgentsModule = class AgentsModule {
};
exports.AgentsModule = AgentsModule;
exports.AgentsModule = AgentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            base_agent_module_1.BaseAgentModule,
            events_module_1.EventsModule,
            memory_module_1.MemoryModule,
            agent_registry_module_1.AgentRegistryModule,
            orchestrator_module_1.OrchestratorModule,
            communication_module_1.CommunicationModule,
            health_module_1.HealthModule,
        ],
        exports: [
            base_agent_module_1.BaseAgentModule,
            events_module_1.EventsModule,
            memory_module_1.MemoryModule,
            agent_registry_module_1.AgentRegistryModule,
            orchestrator_module_1.OrchestratorModule,
            communication_module_1.CommunicationModule,
            health_module_1.HealthModule,
        ],
    })
], AgentsModule);
//# sourceMappingURL=agents.module.js.map