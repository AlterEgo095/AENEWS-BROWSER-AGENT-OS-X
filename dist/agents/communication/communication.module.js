"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const inter_agent_comm_service_1 = require("./inter-agent-comm.service");
const message_broker_service_1 = require("./message-broker.service");
const events_module_1 = require("../events/events.module");
const agent_registry_module_1 = require("../registry/agent-registry.module");
let CommunicationModule = class CommunicationModule {
};
exports.CommunicationModule = CommunicationModule;
exports.CommunicationModule = CommunicationModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, events_module_1.EventsModule, agent_registry_module_1.AgentRegistryModule],
        providers: [inter_agent_comm_service_1.InterAgentCommService, message_broker_service_1.MessageBrokerService],
        exports: [inter_agent_comm_service_1.InterAgentCommService, message_broker_service_1.MessageBrokerService],
    })
], CommunicationModule);
//# sourceMappingURL=communication.module.js.map