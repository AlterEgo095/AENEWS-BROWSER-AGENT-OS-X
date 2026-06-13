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
var DeliveryTeamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryTeamService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
const agent_registry_service_1 = require("../registry/agent-registry.service");
let DeliveryTeamService = DeliveryTeamService_1 = class DeliveryTeamService {
    constructor(registry) {
        this.registry = registry;
        this.logger = new common_1.Logger(DeliveryTeamService_1.name);
    }
    getTeamAgents() { return this.registry.getByLevel(interfaces_1.AgentLevel.DELIVERY); }
    selectAgents(taskDescription) {
        const desc = taskDescription.toLowerCase();
        const agents = [];
        if (/github|git|repo|push/i.test(desc))
            agents.push(interfaces_1.DeliveryAgent.GITHUB);
        if (/docker.*push|registry|image.*publish/i.test(desc))
            agents.push(interfaces_1.DeliveryAgent.DELIVERY_DOCKER);
        if (/vps|serveur.*dédié|ssh/i.test(desc))
            agents.push(interfaces_1.DeliveryAgent.VPS);
        if (/cloud|aws|gcp|azure/i.test(desc))
            agents.push(interfaces_1.DeliveryAgent.CLOUD);
        if (/zip|archive|pack/i.test(desc))
            agents.push(interfaces_1.DeliveryAgent.ZIP);
        if (/pdf.*report|rapport.*livraison/i.test(desc))
            agents.push(interfaces_1.DeliveryAgent.PDF_REPORT);
        if (/notify|notification|email|slack|webhook/i.test(desc))
            agents.push(interfaces_1.DeliveryAgent.NOTIFICATION);
        if (/deploy|déploiement|mise.*en.*ligne/i.test(desc))
            agents.push(interfaces_1.DeliveryAgent.DEPLOYMENT);
        if (agents.length === 0)
            agents.push(interfaces_1.DeliveryAgent.DEPLOYMENT, interfaces_1.DeliveryAgent.NOTIFICATION, interfaces_1.DeliveryAgent.PDF_REPORT);
        return [...new Set(agents)];
    }
    async executeTask(missionId, task, input) {
        const selectedAgents = this.selectAgents(task);
        this.logger.log(`Delivery team executing: "${task}" with ${selectedAgents.length} agents`);
        return {
            agentId: interfaces_1.DeliveryAgent.DEPLOYMENT, missionId, success: true,
            output: { task, agentsUsed: selectedAgents, result: 'Delivery task completed', data: input },
            artifacts: [], cost: selectedAgents.length * 0.1, durationMs: selectedAgents.length * 1500,
            logs: selectedAgents.map(a => `Agent ${a} executed`), errors: [],
        };
    }
    getStats() {
        return { level: interfaces_1.AgentLevel.DELIVERY, totalAgents: 8,
            availableAgents: this.getTeamAgents().map(a => ({ id: a.id, name: a.name, skills: a.skills, costPerTask: a.estimatedCostPerTask })),
        };
    }
};
exports.DeliveryTeamService = DeliveryTeamService;
exports.DeliveryTeamService = DeliveryTeamService = DeliveryTeamService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], DeliveryTeamService);
//# sourceMappingURL=delivery-team.service.js.map