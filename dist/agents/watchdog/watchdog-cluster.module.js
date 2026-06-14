"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatchdogClusterModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("../base/base-agent.module");
const bridge_1 = require("../bridge");
const error_analyzer_agent_service_1 = require("./error-analyzer-agent.service");
const auto_fixer_agent_service_1 = require("./auto-fixer-agent.service");
const circuit_breaker_manager_agent_service_1 = require("./circuit-breaker-manager-agent.service");
let WatchdogClusterModule = class WatchdogClusterModule {
};
exports.WatchdogClusterModule = WatchdogClusterModule;
exports.WatchdogClusterModule = WatchdogClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [base_agent_module_1.BaseAgentModule, bridge_1.AgentConnectorBridgeModule],
        providers: [
            error_analyzer_agent_service_1.ErrorAnalyzerAgentService,
            auto_fixer_agent_service_1.AutoFixerAgentService,
            circuit_breaker_manager_agent_service_1.CircuitBreakerManagerAgentService,
        ],
        exports: [error_analyzer_agent_service_1.ErrorAnalyzerAgentService, auto_fixer_agent_service_1.AutoFixerAgentService, circuit_breaker_manager_agent_service_1.CircuitBreakerManagerAgentService],
    })
], WatchdogClusterModule);
//# sourceMappingURL=watchdog-cluster.module.js.map