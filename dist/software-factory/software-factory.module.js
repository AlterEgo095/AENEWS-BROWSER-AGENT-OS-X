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
const capability_registry_service_1 = require("./capability-registry/capability-registry.service");
const execution_graph_builder_service_1 = require("./execution-graph/execution-graph-builder.service");
const capability_resolver_service_1 = require("./capability-resolver/capability-resolver.service");
const worker_factory_service_1 = require("./worker-factory/worker-factory.service");
const kernel_services_1 = require("./kernel/kernel-services");
const mission_contract_service_1 = require("./mission-contract/mission-contract.service");
const mission_state_machine_service_1 = require("./mission-state-machine/mission-state-machine.service");
const mission_memory_service_1 = require("./memory/mission-memory.service");
const mission_archive_service_1 = require("./archive/mission-archive.service");
const mission_orchestrator_service_1 = require("./mission-orchestrator/mission-orchestrator.service");
const mission_runtime_engine_1 = require("./runtime/mission-runtime.engine");
const mission_metrics_service_1 = require("./runtime/mission-metrics.service");
const development_connector_1 = require("./connectors/development-connector");
const browser_connector_1 = require("./connectors/browser-connector");
const certification_connector_1 = require("./connectors/certification-connector");
const delivery_connector_1 = require("./connectors/delivery-connector");
const office_connector_1 = require("./connectors/office-connector");
const business_connector_1 = require("./connectors/business-connector");
const connector_registry_1 = require("./connectors/connector-registry");
const software_factory_controller_1 = require("./software-factory.controller");
let SoftwareFactoryModule = class SoftwareFactoryModule {
};
exports.SoftwareFactoryModule = SoftwareFactoryModule;
exports.SoftwareFactoryModule = SoftwareFactoryModule = __decorate([
    (0, common_1.Module)({
        controllers: [software_factory_controller_1.SoftwareFactoryController],
        providers: [
            capability_registry_service_1.CapabilityRegistryService,
            execution_graph_builder_service_1.ExecutionGraphBuilderService,
            capability_resolver_service_1.CapabilityResolverService,
            development_connector_1.DevelopmentConnector,
            browser_connector_1.BrowserConnector,
            certification_connector_1.CertificationConnector,
            delivery_connector_1.DeliveryConnector,
            office_connector_1.OfficeConnector,
            business_connector_1.BusinessConnector,
            connector_registry_1.ConnectorRegistry,
            worker_factory_service_1.WorkerFactoryService,
            kernel_services_1.MissionOrchestratorService,
            kernel_services_1.MissionPlannerService,
            kernel_services_1.TaskSchedulerService,
            kernel_services_1.ResourceManagerService,
            kernel_services_1.SecurityManagerService,
            kernel_services_1.CertificationManagerService,
            kernel_services_1.DeliveryManagerService,
            kernel_services_1.MonitoringManagerService,
            kernel_services_1.RecoveryManagerService,
            mission_contract_service_1.MissionContractService,
            mission_state_machine_service_1.MissionStateMachineService,
            mission_memory_service_1.MissionMemoryService,
            mission_archive_service_1.MissionArchiveService,
            mission_orchestrator_service_1.MissionOrchestratorPipeline,
            mission_runtime_engine_1.MissionRuntimeEngine,
            mission_metrics_service_1.MissionMetricsService,
        ],
        exports: [
            capability_registry_service_1.CapabilityRegistryService,
            execution_graph_builder_service_1.ExecutionGraphBuilderService,
            capability_resolver_service_1.CapabilityResolverService,
            worker_factory_service_1.WorkerFactoryService,
            connector_registry_1.ConnectorRegistry,
            mission_orchestrator_service_1.MissionOrchestratorPipeline,
            mission_runtime_engine_1.MissionRuntimeEngine,
            mission_metrics_service_1.MissionMetricsService,
            mission_contract_service_1.MissionContractService,
            mission_state_machine_service_1.MissionStateMachineService,
            mission_memory_service_1.MissionMemoryService,
            mission_archive_service_1.MissionArchiveService,
        ],
    })
], SoftwareFactoryModule);
//# sourceMappingURL=software-factory.module.js.map