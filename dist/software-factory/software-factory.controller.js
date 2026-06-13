"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const kernel_services_2 = require("./kernel/kernel-services");
const mission_archive_service_1 = require("./archive/mission-archive.service");
const mission_runtime_engine_1 = require("./runtime/mission-runtime.engine");
const interfaces_1 = require("./interfaces");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let SoftwareFactoryController = class SoftwareFactoryController {
    constructor(runtime, pipeline, contractService, stateMachine, capabilityRegistry, capabilityResolver, workerFactory, deliveryManager, archiveService, monitoring) {
        this.runtime = runtime;
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
    async runMission(body) {
        const result = await this.runtime.executeMission({
            instruction: body.instruction,
            description: body.description,
            quality: body.quality || interfaces_1.MissionQuality.STANDARD,
            budgetMaxUsd: body.budgetMaxUsd,
            deadline: body.deadline ? new Date(body.deadline) : undefined,
        });
        return {
            success: result.success,
            data: {
                missionId: result.missionId,
                certified: result.certified,
                qualityScore: result.qualityScore,
                totalDurationMs: result.totalDurationMs,
                totalCostUsd: result.totalCostUsd,
                artifacts: result.artifacts.map(a => ({
                    name: a.name,
                    type: a.type,
                    size: a.size,
                    path: a.path,
                })),
                workspaceDir: result.workspaceDir,
                errors: result.errors,
            },
        };
    }
    getRuntimeMission(id) {
        const mission = this.runtime.getMission(id);
        if (!mission)
            return { success: false, error: 'Mission not found' };
        return { success: true, data: mission };
    }
    downloadArtifact(id, filename, res) {
        const workspaceDir = this.runtime.getWorkspaceDir(id);
        if (!workspaceDir) {
            res.status(404).json({ error: 'Mission not found' });
            return;
        }
        const filePath = path.join(workspaceDir, filename);
        if (fs.existsSync(filePath)) {
            res.download(filePath, filename);
            return;
        }
        const zipPath = path.join('/home/z/my-project/download/missions', `${id}.zip`);
        if (filename === `${id}.zip` && fs.existsSync(zipPath)) {
            res.download(zipPath, filename);
            return;
        }
        res.status(404).json({ error: `File not found: ${filename}` });
    }
    downloadZip(id, res) {
        const zipPath = path.join('/home/z/my-project/download/missions', `${id}.zip`);
        if (fs.existsSync(zipPath)) {
            res.download(zipPath, `${id}.zip`);
            return;
        }
        const workspaceDir = this.runtime.getWorkspaceDir(id);
        if (!workspaceDir) {
            res.status(404).json({ error: 'Mission not found' });
            return;
        }
        res.status(404).json({ error: 'ZIP not yet generated' });
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
        return {
            success: true,
            data: {
                runtime: this.runtime.getActiveMissions(),
                pipeline: this.pipeline.getActiveMissions(),
            },
        };
    }
    getMissionStatus(id) {
        const runtime = this.runtime.getMission(id);
        const pipeline = this.pipeline.getExecution(id);
        return { success: true, data: { runtime, pipeline } };
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
        return { success: true, data: this.capabilityRegistry.getPack(packEnum) };
    }
    searchCapabilities(query) {
        return { success: true, data: this.capabilityRegistry.searchByKeyword(query) };
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
                    runtime_engine: 'ACTIVE',
                },
                activeMissions: this.runtime.getActiveMissions().length,
                completedMissions: this.runtime.getCompletedMissions().length,
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
    (0, common_1.Post)('run'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    openapi.ApiResponse({ status: common_1.HttpStatus.ACCEPTED }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SoftwareFactoryController.prototype, "runMission", null);
__decorate([
    openapi.ApiOperation({ description: "Get runtime mission result\nGET /api/factory/run/:id" }),
    (0, common_1.Get)('run/:id'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getRuntimeMission", null);
__decorate([
    openapi.ApiOperation({ description: "Download an artifact file\nGET /api/factory/run/:id/download/:filename" }),
    (0, common_1.Get)('run/:id/download/:filename'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('filename')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "downloadArtifact", null);
__decorate([
    openapi.ApiOperation({ description: "Download the full mission as ZIP\nGET /api/factory/run/:id/zip" }),
    (0, common_1.Get)('run/:id/zip'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "downloadZip", null);
__decorate([
    (0, common_1.Post)('missions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    openapi.ApiResponse({ status: common_1.HttpStatus.ACCEPTED }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SoftwareFactoryController.prototype, "submitMission", null);
__decorate([
    (0, common_1.Get)('missions'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getActiveMissions", null);
__decorate([
    (0, common_1.Get)('missions/:id'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getMissionStatus", null);
__decorate([
    (0, common_1.Post)('missions/:id/cancel'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SoftwareFactoryController.prototype, "cancelMission", null);
__decorate([
    (0, common_1.Get)('contracts/:id'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getContract", null);
__decorate([
    (0, common_1.Get)('missions/:id/timeline'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getTimeline", null);
__decorate([
    (0, common_1.Get)('missions/:id/transitions'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getAvailableTransitions", null);
__decorate([
    (0, common_1.Get)('capabilities'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getAllCapabilities", null);
__decorate([
    (0, common_1.Get)('capabilities/pack/:pack'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('pack')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getCapabilitiesByPack", null);
__decorate([
    (0, common_1.Get)('capabilities/search'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "searchCapabilities", null);
__decorate([
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
    (0, common_1.Get)('archives/:id'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getArchive", null);
__decorate([
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
    (0, common_1.Get)('stats'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getFactoryStats", null);
exports.SoftwareFactoryController = SoftwareFactoryController = __decorate([
    (0, common_1.Controller)('api/factory'),
    __metadata("design:paramtypes", [mission_runtime_engine_1.MissionRuntimeEngine,
        mission_orchestrator_service_1.MissionOrchestratorPipeline,
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