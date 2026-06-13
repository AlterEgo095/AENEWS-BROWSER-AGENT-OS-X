"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorModule = void 0;
const common_1 = require("@nestjs/common");
const orchestrator_service_1 = require("./orchestrator.service");
const task_decomposer_service_1 = require("./task-decomposer.service");
const task_planner_service_1 = require("./task-planner.service");
const task_executor_service_1 = require("./task-executor.service");
const task_critic_service_1 = require("./task-critic.service");
const task_repair_service_1 = require("./task-repair.service");
const task_validator_service_1 = require("./task-validator.service");
const task_delivery_service_1 = require("./task-delivery.service");
const events_module_1 = require("../events/events.module");
const memory_module_1 = require("../memory/memory.module");
const agent_registry_module_1 = require("../registry/agent-registry.module");
const bridge_1 = require("../bridge");
let OrchestratorModule = class OrchestratorModule {
};
exports.OrchestratorModule = OrchestratorModule;
exports.OrchestratorModule = OrchestratorModule = __decorate([
    (0, common_1.Module)({
        imports: [events_module_1.EventsModule, memory_module_1.MemoryModule, agent_registry_module_1.AgentRegistryModule, bridge_1.AgentConnectorBridgeModule],
        providers: [
            orchestrator_service_1.OrchestratorService,
            task_decomposer_service_1.TaskDecomposerService,
            task_planner_service_1.TaskPlannerService,
            task_executor_service_1.TaskExecutorService,
            task_critic_service_1.TaskCriticService,
            task_repair_service_1.TaskRepairService,
            task_validator_service_1.TaskValidatorService,
            task_delivery_service_1.TaskDeliveryService,
        ],
        exports: [
            orchestrator_service_1.OrchestratorService,
            task_decomposer_service_1.TaskDecomposerService,
            task_planner_service_1.TaskPlannerService,
            task_executor_service_1.TaskExecutorService,
            task_critic_service_1.TaskCriticService,
            task_repair_service_1.TaskRepairService,
            task_validator_service_1.TaskValidatorService,
            task_delivery_service_1.TaskDeliveryService,
        ],
    })
], OrchestratorModule);
//# sourceMappingURL=orchestrator.module.js.map