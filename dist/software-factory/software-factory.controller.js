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
const mission_metrics_service_1 = require("./runtime/mission-metrics.service");
const connector_registry_1 = require("./connectors/connector-registry");
const reference_missions_1 = require("./runtime/reference-missions");
const interfaces_1 = require("./interfaces");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let SoftwareFactoryController = class SoftwareFactoryController {
    constructor(runtime, metrics, pipeline, contractService, stateMachine, capabilityRegistry, capabilityResolver, workerFactory, deliveryManager, archiveService, monitoring, connectorRegistry) {
        this.runtime = runtime;
        this.metrics = metrics;
        this.pipeline = pipeline;
        this.contractService = contractService;
        this.stateMachine = stateMachine;
        this.capabilityRegistry = capabilityRegistry;
        this.capabilityResolver = capabilityResolver;
        this.workerFactory = workerFactory;
        this.deliveryManager = deliveryManager;
        this.archiveService = archiveService;
        this.monitoring = monitoring;
        this.connectorRegistry = connectorRegistry;
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
                    connectors: this.connectorRegistry.getStatistics(),
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
    getMSR() {
        const aggregate = this.metrics.getAggregate();
        return {
            success: true,
            data: {
                msr: aggregate.msr,
                msrPercent: `${(aggregate.msr * 100).toFixed(1)}%`,
                totalMissions: aggregate.totalMissions,
                successes: aggregate.successes,
                certified: aggregate.certified,
                certificationRate: aggregate.certificationRate,
                currentTarget: this.metrics.getCurrentMsrTarget(),
                msrTargets: mission_metrics_service_1.MSR_TARGETS,
                msrGap: aggregate.msrGap,
                trend: aggregate.recentTrend,
            },
        };
    }
    getMetrics(category) {
        if (category) {
            const catMetrics = this.metrics.getByCategory(category);
            return { success: true, data: { category, missions: catMetrics } };
        }
        return { success: true, data: this.metrics.getAggregate() };
    }
    getRecentMetrics(count) {
        const n = count ? parseInt(count) : 20;
        return { success: true, data: this.metrics.getRecent(n) };
    }
    getFailures() {
        return { success: true, data: this.metrics.getFailures() };
    }
    getSlowest(count) {
        const n = count ? parseInt(count) : 10;
        return { success: true, data: this.metrics.getSlowest(n) };
    }
    getLowestQuality(count) {
        const n = count ? parseInt(count) : 10;
        return { success: true, data: this.metrics.getLowestQuality(n) };
    }
    getConnectorStats() {
        return {
            success: true,
            data: {
                ...this.connectorRegistry.getStatistics(),
                workerFactoryConnectors: this.workerFactory.getConnectorStats(),
            },
        };
    }
    async testConnector(body) {
        const capId = body.capabilityId;
        const connector = this.connectorRegistry.getConnector(capId);
        if (!connector) {
            return { success: false, error: `No connector for capability: ${body.capabilityId}` };
        }
        const missionId = `test-${Date.now()}`;
        const workspaceDir = `/home/z/my-project/download/missions/${missionId}`;
        this.workerFactory.setMissionWorkspace(missionId, workspaceDir);
        try {
            const result = await connector.execute(capId, {
                missionId,
                instruction: body.instruction,
                workspaceDir,
                parameters: body.parameters || {},
                previousResults: new Map(),
                tools: [],
            });
            return {
                success: result.success,
                data: {
                    connector: connector.constructor.name,
                    durationMs: result.durationMs,
                    costUsd: result.costUsd,
                    artifactCount: result.artifacts.length,
                    artifacts: result.artifacts.map(a => ({ name: a.name, type: a.type, size: a.size })),
                    output: typeof result.output === 'object' ? JSON.stringify(result.output).substring(0, 1000) : result.output,
                    error: result.error,
                },
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    getReferenceMissions(pack, difficulty, category) {
        let missions = reference_missions_1.ReferenceMissions.ALL;
        if (pack)
            missions = reference_missions_1.ReferenceMissions.getByPack(pack);
        if (difficulty)
            missions = reference_missions_1.ReferenceMissions.getByDifficulty(difficulty);
        if (category)
            missions = reference_missions_1.ReferenceMissions.getByCategory(category);
        return {
            success: true,
            data: {
                total: missions.length,
                stats: reference_missions_1.ReferenceMissions.getStats(),
                missions,
            },
        };
    }
    getReferenceMissionStats() {
        return { success: true, data: reference_missions_1.ReferenceMissions.getStats() };
    }
};
exports.SoftwareFactoryController = SoftwareFactoryController;
__decorate([
    (0, common_1.Post)('run'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SoftwareFactoryController.prototype, "runMission", null);
__decorate([
    (0, common_1.Get)('run/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getRuntimeMission", null);
__decorate([
    (0, common_1.Get)('run/:id/download/:filename'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('filename')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "downloadArtifact", null);
__decorate([
    (0, common_1.Get)('run/:id/zip'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "downloadZip", null);
__decorate([
    (0, common_1.Post)('missions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SoftwareFactoryController.prototype, "submitMission", null);
__decorate([
    (0, common_1.Get)('missions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getActiveMissions", null);
__decorate([
    (0, common_1.Get)('missions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getMissionStatus", null);
__decorate([
    (0, common_1.Post)('missions/:id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SoftwareFactoryController.prototype, "cancelMission", null);
__decorate([
    (0, common_1.Get)('contracts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getContract", null);
__decorate([
    (0, common_1.Get)('missions/:id/timeline'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getTimeline", null);
__decorate([
    (0, common_1.Get)('missions/:id/transitions'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getAvailableTransitions", null);
__decorate([
    (0, common_1.Get)('capabilities'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getAllCapabilities", null);
__decorate([
    (0, common_1.Get)('capabilities/pack/:pack'),
    __param(0, (0, common_1.Param)('pack')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getCapabilitiesByPack", null);
__decorate([
    (0, common_1.Get)('capabilities/search'),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "searchCapabilities", null);
__decorate([
    (0, common_1.Post)('capabilities/resolve'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "resolveCapabilities", null);
__decorate([
    (0, common_1.Get)('workers/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getWorkerStats", null);
__decorate([
    (0, common_1.Get)('archives/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getArchive", null);
__decorate([
    (0, common_1.Get)('archives'),
    __param(0, (0, common_1.Query)('result')),
    __param(1, (0, common_1.Query)('minQuality')),
    __param(2, (0, common_1.Query)('maxCost')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "searchArchives", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getFactoryStats", null);
__decorate([
    (0, common_1.Get)('metrics/msr'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getMSR", null);
__decorate([
    (0, common_1.Get)('metrics'),
    __param(0, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getMetrics", null);
__decorate([
    (0, common_1.Get)('metrics/recent'),
    __param(0, (0, common_1.Query)('count')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getRecentMetrics", null);
__decorate([
    (0, common_1.Get)('metrics/failures'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getFailures", null);
__decorate([
    (0, common_1.Get)('metrics/slowest'),
    __param(0, (0, common_1.Query)('count')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getSlowest", null);
__decorate([
    (0, common_1.Get)('metrics/lowest-quality'),
    __param(0, (0, common_1.Query)('count')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getLowestQuality", null);
__decorate([
    (0, common_1.Get)('connectors'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getConnectorStats", null);
__decorate([
    (0, common_1.Post)('connectors/test'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SoftwareFactoryController.prototype, "testConnector", null);
__decorate([
    (0, common_1.Get)('reference-missions'),
    __param(0, (0, common_1.Query)('pack')),
    __param(1, (0, common_1.Query)('difficulty')),
    __param(2, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getReferenceMissions", null);
__decorate([
    (0, common_1.Get)('reference-missions/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getReferenceMissionStats", null);
exports.SoftwareFactoryController = SoftwareFactoryController = __decorate([
    (0, common_1.Controller)('api/factory'),
    __metadata("design:paramtypes", [mission_runtime_engine_1.MissionRuntimeEngine,
        mission_metrics_service_1.MissionMetricsService,
        mission_orchestrator_service_1.MissionOrchestratorPipeline,
        mission_contract_service_1.MissionContractService,
        mission_state_machine_service_1.MissionStateMachineService,
        capability_registry_service_1.CapabilityRegistryService,
        capability_resolver_service_1.CapabilityResolverService,
        worker_factory_service_1.WorkerFactoryService,
        kernel_services_1.DeliveryManagerService,
        mission_archive_service_1.MissionArchiveService,
        kernel_services_2.MonitoringManagerService,
        connector_registry_1.ConnectorRegistry])
], SoftwareFactoryController);
//# sourceMappingURL=software-factory.controller.js.map