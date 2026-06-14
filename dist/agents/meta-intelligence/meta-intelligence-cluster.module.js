"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaIntelligenceClusterModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("../base/base-agent.module");
const bridge_1 = require("../bridge");
const orchestrator_agent_service_1 = require("./orchestrator/orchestrator-agent.service");
const planner_agent_service_1 = require("./planner/planner-agent.service");
const critic_agent_service_1 = require("./critic/critic-agent.service");
const repair_agent_service_1 = require("./repair/repair-agent.service");
const judge_agent_service_1 = require("./judge/judge-agent.service");
const learning_agent_service_1 = require("./learning/learning-agent.service");
const memory_manager_agent_service_1 = require("./memory-manager/memory-manager-agent.service");
const self_improvement_agent_service_1 = require("./self-improvement/self-improvement-agent.service");
const meta_reasoning_agent_service_1 = require("./meta-reasoning/meta-reasoning-agent.service");
const task_router_agent_service_1 = require("./task-router/task-router-agent.service");
const knowledge_synthesis_agent_service_1 = require("./knowledge-synthesis/knowledge-synthesis-agent.service");
const adaptation_agent_service_1 = require("./adaptation/adaptation-agent.service");
const governance_agent_service_1 = require("./governance/governance-agent.service");
let MetaIntelligenceClusterModule = class MetaIntelligenceClusterModule {
};
exports.MetaIntelligenceClusterModule = MetaIntelligenceClusterModule;
exports.MetaIntelligenceClusterModule = MetaIntelligenceClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [base_agent_module_1.BaseAgentModule, bridge_1.AgentConnectorBridgeModule],
        providers: [
            orchestrator_agent_service_1.OrchestratorAgentService,
            planner_agent_service_1.PlannerAgentService,
            critic_agent_service_1.CriticAgentService,
            repair_agent_service_1.RepairAgentService,
            judge_agent_service_1.JudgeAgentService,
            learning_agent_service_1.LearningAgentService,
            memory_manager_agent_service_1.MemoryManagerAgentService,
            self_improvement_agent_service_1.SelfImprovementAgentService,
            meta_reasoning_agent_service_1.MetaReasoningAgentService,
            task_router_agent_service_1.TaskRouterAgentService,
            knowledge_synthesis_agent_service_1.KnowledgeSynthesisAgentService,
            adaptation_agent_service_1.AdaptationAgentService,
            governance_agent_service_1.GovernanceAgentService,
        ],
        exports: [
            orchestrator_agent_service_1.OrchestratorAgentService,
            planner_agent_service_1.PlannerAgentService,
            critic_agent_service_1.CriticAgentService,
            repair_agent_service_1.RepairAgentService,
            judge_agent_service_1.JudgeAgentService,
            learning_agent_service_1.LearningAgentService,
            memory_manager_agent_service_1.MemoryManagerAgentService,
            self_improvement_agent_service_1.SelfImprovementAgentService,
            meta_reasoning_agent_service_1.MetaReasoningAgentService,
            task_router_agent_service_1.TaskRouterAgentService,
            knowledge_synthesis_agent_service_1.KnowledgeSynthesisAgentService,
            adaptation_agent_service_1.AdaptationAgentService,
            governance_agent_service_1.GovernanceAgentService,
        ],
    })
], MetaIntelligenceClusterModule);
//# sourceMappingURL=meta-intelligence-cluster.module.js.map