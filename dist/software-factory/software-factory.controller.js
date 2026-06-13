"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoftwareFactoryController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const mission_orchestrator_service_1 = require("./mission-orchestrator/mission-orchestrator.service");
const mission_contract_service_1 = require("./mission-contract/mission-contract.service");
const mission_state_machine_service_1 = require("./mission-state-machine/mission-state-machine.service");
const capability_registry_service_1 = require("./capability-registry/capability-registry.service");
const capability_resolver_service_1 = require("./capability-resolver/capability-resolver.service");
const worker_factory_service_1 = require("./worker-factory/worker-factory.service");
const kernel_services_1 = require("./kernel/kernel-services");
const mission_archive_service_1 = require("./archive/mission-archive.service");
const kernel_services_2 = require("./kernel/kernel-services");
const interfaces_1 = require("./interfaces");
let SoftwareFactoryController = class SoftwareFactoryController {
    constructor(pipeline, contractService, stateMachine, capabilityRegistry, capabilityResolver, workerFactory, deliveryManager, archiveService, monitoring) {
        this.pipeline = pipeline;
        this.contractService = contractService;
        this.stateMachine = stateMachine;
        this.capabilityRegistry = capabilityRegistry;
        this.capabilityResolver = capabilityResolver;
        this.workerFactory = workerFactory;
        this.deliveryManager = deliveryManager;
        this.archiveService = archiveService;
        this.monitoring = monitoring;
    }
    async submitMission(body) {
        const request = {
            instruction: body.instruction,
            description: body.description,
            quality: body.quality || interfaces_1.MissionQuality.STANDARD,
            deadline: body.deadline ? new Date(body.deadline) : undefined,
            budgetMaxUsd: body.budgetMaxUsd,
            deliverables: body.deliverables,
            tags: body.tags,
        };
        const execution = await this.pipeline.submitMission(request);
        return { success: true, data: execution };
    }
    getActiveMissions() {
        return { success: true, data: this.pipeline.getActiveMissions() };
    }
    getMissionStatus(id) {
        const execution = this.pipeline.getExecution(id);
        if (!execution)
            return { success: false, error: 'Mission not found' };
        return { success: true, data: execution };
    }
    async cancelMission(id) {
        const cancelled = await this.pipeline.cancelMission(id);
        return { success: cancelled };
    }
    getContract(id) {
        const contract = this.contractService.getContract(id);
        if (!contract)
            return { success: false, error: 'Contract not found' };
        return { success: true, data: contract };
    }
    getTimeline(id) {
        const timeline = this.stateMachine.getTimeline(id);
        if (!timeline)
            return { success: false, error: 'Timeline not found' };
        return { success: true, data: timeline };
    }
    getAvailableTransitions(id) {
        return { success: true, data: this.stateMachine.getAvailableTransitions(id) };
    }
    getDelivery(id) {
        const delivery = this.deliveryManager.getDelivery(id);
        if (!delivery)
            return { success: false, error: 'Delivery not found' };
        return { success: true, data: delivery };
    }
    getArchive(id) {
        const archive = this.archiveService.getArchive(id);
        if (!archive)
            return { success: false, error: 'Archive not found' };
        return { success: true, data: archive };
    }
    searchArchives(result, minQuality, maxCost) {
        return {
            success: true,
            data: this.archiveService.searchArchives({
                result,
                minQuality: minQuality ? Number(minQuality) : undefined,
                maxCost: maxCost ? Number(maxCost) : undefined,
            }),
        };
    }
    getAllCapabilities() {
        return {
            success: true,
            data: {
                total: this.capabilityRegistry.getTotalCount(),
                overview: this.capabilityRegistry.getPackOverview(),
                capabilities: this.capabilityRegistry.getAllCapabilities(),
            },
        };
    }
    getCapabilitiesByPack(pack) {
        const packEnum = Object.values(interfaces_1.CapabilityPack).find(p => p.toLowerCase() === pack.toLowerCase());
        if (!packEnum)
            return { success: false, error: `Invalid pack: ${pack}` };
        return {
            success: true,
            data: this.capabilityRegistry.getPack(packEnum),
        };
    }
    searchCapabilities(query) {
        return {
            success: true,
            data: this.capabilityRegistry.searchByKeyword(query),
        };
    }
    resolveCapabilities(body) {
        const resolution = this.capabilityResolver.resolve({
            missionId: `preview-${Date.now()}`,
            instruction: body.mission,
        });
        return { success: true, data: resolution };
    }
    getWorkerStats() {
        return { success: true, data: this.workerFactory.getStatistics() };
    }
    getFactoryStats() {
        const missionsByState = {};
        for (const state of Object.values(mission_state_machine_service_1.MissionState)) {
            missionsByState[state] = this.stateMachine.getMissionsInState(state).length;
        }
        return {
            success: true,
            data: {
                architecture: {
                    concepts: 3,
                    concepts_list: ['Mission', 'Capability', 'Worker'],
                    kernel_services: 10,
                    capability_packs: 6,
                    total_capabilities: this.capabilityRegistry.getTotalCount(),
                },
                activeMissions: this.pipeline.getActiveMissions().length,
                workerPool: this.workerFactory.getStatistics(),
                archiveStats: this.archiveService.getStatistics(),
                systemHealth: this.monitoring.getSystemHealth(),
                missionsByState,
            },
        };
    }
};
exports.SoftwareFactoryController = SoftwareFactoryController;
__decorate([
    openapi.ApiOperation({ description: "Submit a new mission\nPOST /api/factory/missions" }),
    (0, common_1.Post)('missions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    openapi.ApiResponse({ status: common_1.HttpStatus.ACCEPTED }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SoftwareFactoryController.prototype, "submitMission", null);
__decorate([
    openapi.ApiOperation({ description: "Get active missions\nGET /api/factory/missions" }),
    (0, common_1.Get)('missions'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getActiveMissions", null);
__decorate([
    openapi.ApiOperation({ description: "Get mission execution status\nGET /api/factory/missions/:id" }),
    (0, common_1.Get)('missions/:id'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getMissionStatus", null);
__decorate([
    openapi.ApiOperation({ description: "Cancel a mission\nPOST /api/factory/missions/:id/cancel" }),
    (0, common_1.Post)('missions/:id/cancel'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SoftwareFactoryController.prototype, "cancelMission", null);
__decorate([
    openapi.ApiOperation({ description: "Get mission contract\nGET /api/factory/contracts/:id" }),
    (0, common_1.Get)('contracts/:id'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getContract", null);
__decorate([
    openapi.ApiOperation({ description: "Get mission timeline\nGET /api/factory/missions/:id/timeline" }),
    (0, common_1.Get)('missions/:id/timeline'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getTimeline", null);
__decorate([
    openapi.ApiOperation({ description: "Get available transitions for a mission\nGET /api/factory/missions/:id/transitions" }),
    (0, common_1.Get)('missions/:id/transitions'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getAvailableTransitions", null);
__decorate([
    openapi.ApiOperation({ description: "Get delivery package\nGET /api/factory/missions/:id/delivery" }),
    (0, common_1.Get)('missions/:id/delivery'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getDelivery", null);
__decorate([
    openapi.ApiOperation({ description: "Get archived mission\nGET /api/factory/archives/:id" }),
    (0, common_1.Get)('archives/:id'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getArchive", null);
__decorate([
    openapi.ApiOperation({ description: "Search archives\nGET /api/factory/archives" }),
    (0, common_1.Get)('archives'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('result')),
    __param(1, (0, common_1.Query)('minQuality')),
    __param(2, (0, common_1.Query)('maxCost')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "searchArchives", null);
__decorate([
    (0, common_1.Get)('capabilities'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getAllCapabilities", null);
__decorate([
    openapi.ApiOperation({ description: "Get capabilities by pack\nGET /api/factory/capabilities/pack/:pack" }),
    (0, common_1.Get)('capabilities/pack/:pack'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('pack')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getCapabilitiesByPack", null);
__decorate([
    openapi.ApiOperation({ description: "Search capabilities by keyword\nGET /api/factory/capabilities/search?q=..." }),
    (0, common_1.Get)('capabilities/search'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "searchCapabilities", null);
__decorate([
    openapi.ApiOperation({ description: "Resolve capabilities needed for a mission\nPOST /api/factory/capabilities/resolve" }),
    (0, common_1.Post)('capabilities/resolve'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "resolveCapabilities", null);
__decorate([
    (0, common_1.Get)('workers/stats'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getWorkerStats", null);
__decorate([
    (0, common_1.Get)('stats'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getFactoryStats", null);
exports.SoftwareFactoryController = SoftwareFactoryController = __decorate([
    (0, common_1.Controller)('api/factory'),
    __metadata("design:paramtypes", [mission_orchestrator_service_1.MissionOrchestratorPipeline,
        mission_contract_service_1.MissionContractService,
        mission_state_machine_service_1.MissionStateMachineService,
        capability_registry_service_1.CapabilityRegistryService,
        capability_resolver_service_1.CapabilityResolverService,
        worker_factory_service_1.WorkerFactoryService,
        kernel_services_1.DeliveryManagerService,
        mission_archive_service_1.MissionArchiveService,
        kernel_services_2.MonitoringManagerService])
], SoftwareFactoryController);
//# sourceMappingURL=software-factory.controller.js.map