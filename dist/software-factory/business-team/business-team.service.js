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
var BusinessTeamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessTeamService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
const agent_registry_service_1 = require("../registry/agent-registry.service");
let BusinessTeamService = BusinessTeamService_1 = class BusinessTeamService {
    constructor(registry) {
        this.registry = registry;
        this.logger = new common_1.Logger(BusinessTeamService_1.name);
    }
    getTeamAgents() {
        return this.registry.getByLevel(interfaces_1.AgentLevel.BUSINESS);
    }
    selectAgents(taskDescription) {
        const desc = taskDescription.toLowerCase();
        const agents = [];
        if (/seo|référencement/i.test(desc))
            agents.push(interfaces_1.BusinessAgent.SEO);
        if (/marketing|campagne|campaign/i.test(desc))
            agents.push(interfaces_1.BusinessAgent.MARKETING);
        if (/copywrit|contenu|content.*writ/i.test(desc))
            agents.push(interfaces_1.BusinessAgent.COPYWRITING);
        if (/brand|marque|identité/i.test(desc))
            agents.push(interfaces_1.BusinessAgent.BRANDING);
        if (/crm|client|customer/i.test(desc))
            agents.push(interfaces_1.BusinessAgent.CRM);
        if (/analytics|stat|metric|kpi/i.test(desc))
            agents.push(interfaces_1.BusinessAgent.ANALYTICS);
        if (/financ|budget|compt/i.test(desc))
            agents.push(interfaces_1.BusinessAgent.FINANCE);
        if (/sales|vente|commercial/i.test(desc))
            agents.push(interfaces_1.BusinessAgent.SALES);
        if (agents.length === 0)
            agents.push(interfaces_1.BusinessAgent.ANALYTICS);
        return [...new Set(agents)];
    }
    async executeTask(missionId, task, input) {
        const selectedAgents = this.selectAgents(task);
        this.logger.log(`Business team executing: "${task}" with ${selectedAgents.length} agents`);
        return {
            agentId: interfaces_1.BusinessAgent.ANALYTICS,
            missionId,
            success: true,
            output: { task, agentsUsed: selectedAgents, result: 'Business task completed', data: input },
            artifacts: [],
            cost: selectedAgents.length * 0.2,
            durationMs: selectedAgents.length * 1500,
            logs: selectedAgents.map((a) => `Agent ${a} executed`),
            errors: [],
        };
    }
    getStats() {
        return {
            level: interfaces_1.AgentLevel.BUSINESS,
            totalAgents: 8,
            availableAgents: this.getTeamAgents().map((a) => ({
                id: a.id,
                name: a.name,
                skills: a.skills,
                costPerTask: a.estimatedCostPerTask,
            })),
        };
    }
};
exports.BusinessTeamService = BusinessTeamService;
exports.BusinessTeamService = BusinessTeamService = BusinessTeamService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], BusinessTeamService);
//# sourceMappingURL=business-team.service.js.map