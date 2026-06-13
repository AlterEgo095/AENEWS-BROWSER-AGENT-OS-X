"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelligentOrchestrationClusterModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("../base/base-agent.module");
const bridge_1 = require("../bridge");
const mission_orchestrator_ai_agent_service_1 = require("./mission-orchestrator-ai-agent.service");
const dynamic_scheduler_agent_service_1 = require("./dynamic-scheduler-agent.service");
const resource_negotiator_agent_service_1 = require("./resource-negotiator-agent.service");
const priority_arbiter_agent_service_1 = require("./priority-arbiter-agent.service");
let IntelligentOrchestrationClusterModule = class IntelligentOrchestrationClusterModule {
};
exports.IntelligentOrchestrationClusterModule = IntelligentOrchestrationClusterModule;
exports.IntelligentOrchestrationClusterModule = IntelligentOrchestrationClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [base_agent_module_1.BaseAgentModule, bridge_1.AgentConnectorBridgeModule],
        providers: [
            mission_orchestrator_ai_agent_service_1.MissionOrchestratorAIAgentService,
            dynamic_scheduler_agent_service_1.DynamicSchedulerAgentService,
            resource_negotiator_agent_service_1.ResourceNegotiatorAgentService,
            priority_arbiter_agent_service_1.PriorityArbiterAgentService,
        ],
        exports: [
            mission_orchestrator_ai_agent_service_1.MissionOrchestratorAIAgentService,
            dynamic_scheduler_agent_service_1.DynamicSchedulerAgentService,
            resource_negotiator_agent_service_1.ResourceNegotiatorAgentService,
            priority_arbiter_agent_service_1.PriorityArbiterAgentService,
        ],
    })
], IntelligentOrchestrationClusterModule);
//# sourceMappingURL=intelligent-orchestration-cluster.module.js.map