"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentConnectorBridgeModule = void 0;
const common_1 = require("@nestjs/common");
const software_factory_module_1 = require("../../software-factory/software-factory.module");
const agent_connector_bridge_service_1 = require("./agent-connector-bridge.service");
let AgentConnectorBridgeModule = class AgentConnectorBridgeModule {
};
exports.AgentConnectorBridgeModule = AgentConnectorBridgeModule;
exports.AgentConnectorBridgeModule = AgentConnectorBridgeModule = __decorate([
    (0, common_1.Module)({
        imports: [software_factory_module_1.SoftwareFactoryModule],
        providers: [agent_connector_bridge_service_1.AgentConnectorBridge],
        exports: [agent_connector_bridge_service_1.AgentConnectorBridge],
    })
], AgentConnectorBridgeModule);
//# sourceMappingURL=agent-connector-bridge.module.js.map