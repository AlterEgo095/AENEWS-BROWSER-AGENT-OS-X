"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMIntelligenceClusterModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("../base/base-agent.module");
const bridge_1 = require("../bridge");
const llm_planner_agent_service_1 = require("./llm-planner-agent.service");
const llm_critic_agent_service_1 = require("./llm-critic-agent.service");
const llm_judge_agent_service_1 = require("./llm-judge-agent.service");
const llm_decomposer_agent_service_1 = require("./llm-decomposer-agent.service");
const llm_repair_agent_service_1 = require("./llm-repair-agent.service");
const llm_validator_agent_service_1 = require("./llm-validator-agent.service");
let LLMIntelligenceClusterModule = class LLMIntelligenceClusterModule {
};
exports.LLMIntelligenceClusterModule = LLMIntelligenceClusterModule;
exports.LLMIntelligenceClusterModule = LLMIntelligenceClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [base_agent_module_1.BaseAgentModule, bridge_1.AgentConnectorBridgeModule],
        providers: [
            llm_planner_agent_service_1.LLMPlannerAgentService,
            llm_critic_agent_service_1.LLMCriticAgentService,
            llm_judge_agent_service_1.LLMJudgeAgentService,
            llm_decomposer_agent_service_1.LLMDecomposerAgentService,
            llm_repair_agent_service_1.LLMRepairAgentService,
            llm_validator_agent_service_1.LLMValidatorAgentService,
        ],
        exports: [
            llm_planner_agent_service_1.LLMPlannerAgentService,
            llm_critic_agent_service_1.LLMCriticAgentService,
            llm_judge_agent_service_1.LLMJudgeAgentService,
            llm_decomposer_agent_service_1.LLMDecomposerAgentService,
            llm_repair_agent_service_1.LLMRepairAgentService,
            llm_validator_agent_service_1.LLMValidatorAgentService,
        ],
    })
], LLMIntelligenceClusterModule);
//# sourceMappingURL=llm-intelligence-cluster.module.js.map