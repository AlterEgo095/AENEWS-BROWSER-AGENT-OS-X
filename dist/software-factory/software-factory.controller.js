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
const mission_control_service_1 = require("./mission-control/mission-control.service");
const mission_contract_service_1 = require("./mission-contract/mission-contract.service");
const mission_state_machine_service_1 = require("./mission-state-machine/mission-state-machine.service");
const agent_pool_service_1 = require("./agent-pool/agent-pool.service");
const delivery_service_1 = require("./delivery/delivery.service");
const mission_archive_service_1 = require("./archive/mission-archive.service");
const agent_registry_service_1 = require("./registry/agent-registry.service");
const interfaces_1 = require("./interfaces");
let SoftwareFactoryController = class SoftwareFactoryController {
    constructor(missionControl, contractService, stateMachine, agentPool, deliveryService, archiveService, agentRegistry) {
        this.missionControl = missionControl;
        this.contractService = contractService;
        this.stateMachine = stateMachine;
        this.agentPool = agentPool;
        this.deliveryService = deliveryService;
        this.archiveService = archiveService;
        this.agentRegistry = agentRegistry;
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
        const execution = await this.missionControl.submitMission(request);
        return {
            success: true,
            data: execution,
        };
    }
    getActiveMissions() {
        return {
            success: true,
            data: this.missionControl.getActiveMissions(),
        };
    }
    getMissionStatus(id) {
        const execution = this.missionControl.getExecution(id);
        if (!execution) {
            return { success: false, error: 'Mission not found' };
        }
        return { success: true, data: execution };
    }
    async cancelMission(id) {
        const cancelled = await this.missionControl.cancelMission(id);
        return { success: cancelled };
    }
    getContract(id) {
        const contract = this.contractService.getContract(id);
        if (!contract) {
            return { success: false, error: 'Contract not found' };
        }
        return { success: true, data: contract };
    }
    getTimeline(id) {
        const timeline = this.stateMachine.getTimeline(id);
        if (!timeline) {
            return { success: false, error: 'Timeline not found' };
        }
        return { success: true, data: timeline };
    }
    getAvailableTransitions(id) {
        return {
            success: true,
            data: this.stateMachine.getAvailableTransitions(id),
        };
    }
    getAgentStats() {
        return {
            success: true,
            data: this.agentPool.getStatistics(),
        };
    }
    getDelivery(id) {
        const delivery = this.deliveryService.getDelivery(id);
        if (!delivery) {
            return { success: false, error: 'Delivery not found' };
        }
        return { success: true, data: delivery };
    }
    getArchive(id) {
        const archive = this.archiveService.getArchive(id);
        if (!archive) {
            return { success: false, error: 'Archive not found' };
        }
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
                activeMissions: this.missionControl.getActiveMissions().length,
                agentPool: this.agentPool.getStatistics(),
                archiveStats: this.archiveService.getStatistics(),
                missionsByState,
            },
        };
    }
    getAllAgents() {
        return {
            success: true,
            data: {
                total: this.agentRegistry.getTotalCount(),
                agents: this.agentRegistry.getAllDefinitions(),
            },
        };
    }
    getAgentsByLevel(level) {
        const agentLevel = Object.values(interfaces_1.AgentLevel).find(l => l.toLowerCase() === level.toLowerCase());
        if (!agentLevel) {
            return { success: false, error: `Invalid level: ${level}` };
        }
        return {
            success: true,
            data: this.agentRegistry.getByLevel(agentLevel),
        };
    }
    getTeamCompositions() {
        return {
            success: true,
            data: this.agentRegistry.getTeamCompositions(),
        };
    }
    recommendAgents(body) {
        return {
            success: true,
            data: {
                mission: body.mission,
                recommendedAgents: this.agentRegistry.findAgentsForMission(body.mission),
                totalRecommended: this.agentRegistry.findAgentsForMission(body.mission).length,
            },
        };
    }
    getAgentDefinition(id) {
        const definition = this.agentRegistry.getDefinition(id);
        if (!definition) {
            return { success: false, error: `Agent not found: ${id}` };
        }
        return { success: true, data: definition };
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
    openapi.ApiOperation({ description: "Get agent pool statistics\nGET /api/factory/agents/stats" }),
    (0, common_1.Get)('agents/stats'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getAgentStats", null);
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
    openapi.ApiOperation({ description: "Get factory statistics\nGET /api/factory/stats" }),
    (0, common_1.Get)('stats'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getFactoryStats", null);
__decorate([
    openapi.ApiOperation({ description: "Get all 64 agent definitions\nGET /api/factory/agents" }),
    (0, common_1.Get)('agents'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getAllAgents", null);
__decorate([
    openapi.ApiOperation({ description: "Get agents by level\nGET /api/factory/agents/level/:level" }),
    (0, common_1.Get)('agents/level/:level'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('level')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getAgentsByLevel", null);
__decorate([
    openapi.ApiOperation({ description: "Get team compositions\nGET /api/factory/agents/teams" }),
    (0, common_1.Get)('agents/teams'),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getTeamCompositions", null);
__decorate([
    openapi.ApiOperation({ description: "Find agents needed for a mission\nPOST /api/factory/agents/recommend" }),
    (0, common_1.Post)('agents/recommend'),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "recommendAgents", null);
__decorate([
    openapi.ApiOperation({ description: "Get single agent definition\nGET /api/factory/agents/:id" }),
    (0, common_1.Get)('agents/:id'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SoftwareFactoryController.prototype, "getAgentDefinition", null);
exports.SoftwareFactoryController = SoftwareFactoryController = __decorate([
    (0, common_1.Controller)('api/factory'),
    __metadata("design:paramtypes", [mission_control_service_1.MissionControlService,
        mission_contract_service_1.MissionContractService,
        mission_state_machine_service_1.MissionStateMachineService,
        agent_pool_service_1.AgentPoolService,
        delivery_service_1.DeliveryService,
        mission_archive_service_1.MissionArchiveService,
        agent_registry_service_1.AgentRegistryService])
], SoftwareFactoryController);
//# sourceMappingURL=software-factory.controller.js.map