"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayModule = void 0;
const common_1 = require("@nestjs/common");
const memory_gateway_service_1 = require("./memory/memory-gateway.service");
const security_gateway_service_1 = require("./security/security-gateway.service");
const documentation_generator_service_1 = require("./documentation/documentation-generator.service");
let GatewayModule = class GatewayModule {
};
exports.GatewayModule = GatewayModule;
exports.GatewayModule = GatewayModule = __decorate([
    (0, common_1.Module)({
        providers: [memory_gateway_service_1.MemoryGatewayService, security_gateway_service_1.SecurityGatewayService, documentation_generator_service_1.DocumentationGeneratorService],
        exports: [memory_gateway_service_1.MemoryGatewayService, security_gateway_service_1.SecurityGatewayService, documentation_generator_service_1.DocumentationGeneratorService],
    })
], GatewayModule);
//# sourceMappingURL=gateway.module.js.map