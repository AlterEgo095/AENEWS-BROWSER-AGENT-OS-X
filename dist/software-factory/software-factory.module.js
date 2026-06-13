"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoftwareFactoryModule = void 0;
const common_1 = require("@nestjs/common");
const agent_registry_service_1 = require("./registry/agent-registry.service");
const mission_contract_service_1 = require("./mission-contract/mission-contract.service");
const mission_state_machine_service_1 = require("./mission-state-machine/mission-state-machine.service");
const agent_pool_service_1 = require("./agent-pool/agent-pool.service");
const mission_control_service_1 = require("./mission-control/mission-control.service");
const delivery_service_1 = require("./delivery/delivery.service");
const mission_memory_service_1 = require("./memory/mission-memory.service");
const mission_archive_service_1 = require("./archive/mission-archive.service");
const core_agents_service_1 = require("./core/core-agents.service");
const browser_team_service_1 = require("./browser-team/browser-team.service");
const dev_team_service_1 = require("./dev-team/dev-team.service");
const office_team_service_1 = require("./office-team/office-team.service");
const business_team_service_1 = require("./business-team/business-team.service");
const cert_team_service_1 = require("./cert-team/cert-team.service");
const delivery_team_service_1 = require("./delivery-team/delivery-team.service");
const planning_team_service_1 = require("./teams/planning/planning-team.service");
const execution_team_service_1 = require("./teams/execution/execution-team.service");
const certification_team_service_1 = require("./teams/certification/certification-team.service");
let SoftwareFactoryModule = class SoftwareFactoryModule {
};
exports.SoftwareFactoryModule = SoftwareFactoryModule;
exports.SoftwareFactoryModule = SoftwareFactoryModule = __decorate([
    (0, common_1.Module)({
        providers: [
            agent_registry_service_1.AgentRegistryService,
            mission_contract_service_1.MissionContractService,
            mission_state_machine_service_1.MissionStateMachineService,
            agent_pool_service_1.AgentPoolService,
            delivery_service_1.DeliveryService,
            mission_memory_service_1.MissionMemoryService,
            mission_archive_service_1.MissionArchiveService,
            core_agents_service_1.MissionOrchestratorAgent,
            core_agents_service_1.MissionPlannerAgent,
            core_agents_service_1.TaskSchedulerAgent,
            core_agents_service_1.MemoryManagerAgent,
            core_agents_service_1.ResourceManagerAgent,
            core_agents_service_1.SecurityManagerAgent,
            core_agents_service_1.CertificationManagerAgent,
            core_agents_service_1.DeliveryManagerAgent,
            core_agents_service_1.MonitoringManagerAgent,
            core_agents_service_1.RecoveryManagerAgent,
            browser_team_service_1.BrowserTeamService,
            dev_team_service_1.DevTeamService,
            office_team_service_1.OfficeTeamService,
            business_team_service_1.BusinessTeamService,
            cert_team_service_1.CertTeamService,
            delivery_team_service_1.DeliveryTeamService,
            planning_team_service_1.PlanningTeamService,
            execution_team_service_1.ExecutionTeamService,
            certification_team_service_1.CertificationTeamService,
            mission_control_service_1.MissionControlService,
        ],
        exports: [
            agent_registry_service_1.AgentRegistryService,
            mission_control_service_1.MissionControlService,
            mission_contract_service_1.MissionContractService,
            mission_state_machine_service_1.MissionStateMachineService,
            agent_pool_service_1.AgentPoolService,
            core_agents_service_1.MissionOrchestratorAgent,
            core_agents_service_1.MissionPlannerAgent,
            core_agents_service_1.TaskSchedulerAgent,
            core_agents_service_1.MemoryManagerAgent,
            core_agents_service_1.ResourceManagerAgent,
            core_agents_service_1.SecurityManagerAgent,
            core_agents_service_1.CertificationManagerAgent,
            core_agents_service_1.DeliveryManagerAgent,
            core_agents_service_1.MonitoringManagerAgent,
            core_agents_service_1.RecoveryManagerAgent,
            browser_team_service_1.BrowserTeamService,
            dev_team_service_1.DevTeamService,
            office_team_service_1.OfficeTeamService,
            business_team_service_1.BusinessTeamService,
            cert_team_service_1.CertTeamService,
            delivery_team_service_1.DeliveryTeamService,
            planning_team_service_1.PlanningTeamService,
            execution_team_service_1.ExecutionTeamService,
            certification_team_service_1.CertificationTeamService,
            delivery_service_1.DeliveryService,
            mission_memory_service_1.MissionMemoryService,
            mission_archive_service_1.MissionArchiveService,
        ],
    })
], SoftwareFactoryModule);
//# sourceMappingURL=software-factory.module.js.map