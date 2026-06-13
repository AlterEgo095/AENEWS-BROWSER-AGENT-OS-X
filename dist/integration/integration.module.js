"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationModule = void 0;
const common_1 = require("@nestjs/common");
const integration_service_1 = require("./integration.service");
const integration_controller_1 = require("./integration.controller");
const software_factory_module_1 = require("../software-factory/software-factory.module");
const agents_module_1 = require("../agents/agents.module");
const mission_os_module_1 = require("../mission-os/mission-os.module");
const gateway_module_1 = require("../gateway/gateway.module");
const realtime_module_1 = require("../realtime/realtime.module");
let IntegrationModule = class IntegrationModule {
};
exports.IntegrationModule = IntegrationModule;
exports.IntegrationModule = IntegrationModule = __decorate([
    (0, common_1.Module)({
        imports: [software_factory_module_1.SoftwareFactoryModule, agents_module_1.AgentsModule, mission_os_module_1.MissionOsModule, gateway_module_1.GatewayModule, realtime_module_1.RealtimeModule],
        providers: [integration_service_1.IntegrationService],
        controllers: [integration_controller_1.IntegrationController],
        exports: [integration_service_1.IntegrationService],
    })
], IntegrationModule);
//# sourceMappingURL=integration.module.js.map