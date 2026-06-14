"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionOsModule = void 0;
const common_1 = require("@nestjs/common");
const constitutional_ai_service_1 = require("./constitutional/constitutional-ai.service");
const mission_graph_service_1 = require("./mission-graph/mission-graph.service");
const human_approval_service_1 = require("./human-approval/human-approval.service");
const temporal_memory_service_1 = require("./temporal-memory/temporal-memory.service");
const resource_optimizer_service_1 = require("./resource-optimizer/resource-optimizer.service");
const observability_center_service_1 = require("./observability/observability-center.service");
const auto_recovery_service_1 = require("./auto-recovery/auto-recovery.service");
let MissionOsModule = class MissionOsModule {
};
exports.MissionOsModule = MissionOsModule;
exports.MissionOsModule = MissionOsModule = __decorate([
    (0, common_1.Module)({
        providers: [
            constitutional_ai_service_1.ConstitutionalAiService,
            human_approval_service_1.HumanApprovalService,
            mission_graph_service_1.MissionGraphService,
            temporal_memory_service_1.TemporalMemoryService,
            resource_optimizer_service_1.ResourceOptimizerService,
            observability_center_service_1.ObservabilityCenterService,
            auto_recovery_service_1.AutoRecoveryService,
        ],
        exports: [
            constitutional_ai_service_1.ConstitutionalAiService,
            human_approval_service_1.HumanApprovalService,
            mission_graph_service_1.MissionGraphService,
            temporal_memory_service_1.TemporalMemoryService,
            resource_optimizer_service_1.ResourceOptimizerService,
            observability_center_service_1.ObservabilityCenterService,
            auto_recovery_service_1.AutoRecoveryService,
        ],
    })
], MissionOsModule);
//# sourceMappingURL=mission-os.module.js.map