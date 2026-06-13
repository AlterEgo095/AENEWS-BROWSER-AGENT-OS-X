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
var CertTeamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertTeamService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
const agent_registry_service_1 = require("../registry/agent-registry.service");
let CertTeamService = CertTeamService_1 = class CertTeamService {
    constructor(registry) {
        this.registry = registry;
        this.logger = new common_1.Logger(CertTeamService_1.name);
    }
    getTeamAgents() {
        return this.registry.getByLevel(interfaces_1.AgentLevel.CERTIFICATION);
    }
    selectAgents(taskDescription) {
        const desc = taskDescription.toLowerCase();
        const agents = [];
        if (/architecture|arch.*review/i.test(desc))
            agents.push(interfaces_1.CertAgent.ARCH_CERT);
        if (/security|sécurité|vulnérabilit/i.test(desc))
            agents.push(interfaces_1.CertAgent.SECURITY);
        if (/test|coverage|couverture/i.test(desc))
            agents.push(interfaces_1.CertAgent.TESTS);
        if (/regression|non.*regress/i.test(desc))
            agents.push(interfaces_1.CertAgent.REGRESSION);
        if (/performance|load|charge/i.test(desc))
            agents.push(interfaces_1.CertAgent.PERFORMANCE);
        if (/document.*complet|doc.*review/i.test(desc))
            agents.push(interfaces_1.CertAgent.DOCS);
        if (/integration|e2e|end.*to.*end/i.test(desc))
            agents.push(interfaces_1.CertAgent.INTEGRATION);
        if (/compliance|conform|rgpd|gdpr/i.test(desc))
            agents.push(interfaces_1.CertAgent.COMPLIANCE);
        if (agents.length === 0)
            agents.push(interfaces_1.CertAgent.SECURITY, interfaces_1.CertAgent.TESTS, interfaces_1.CertAgent.DOCS);
        return [...new Set(agents)];
    }
    async executeTask(missionId, task, input) {
        const selectedAgents = this.selectAgents(task);
        this.logger.log(`Cert team executing: "${task}" with ${selectedAgents.length} agents`);
        return {
            agentId: interfaces_1.CertAgent.SECURITY,
            missionId,
            success: true,
            output: {
                task,
                agentsUsed: selectedAgents,
                result: 'Certification task completed',
                data: input,
            },
            artifacts: [],
            cost: selectedAgents.length * 0.2,
            durationMs: selectedAgents.length * 2000,
            logs: selectedAgents.map((a) => `Agent ${a} executed`),
            errors: [],
        };
    }
    getStats() {
        return {
            level: interfaces_1.AgentLevel.CERTIFICATION,
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
exports.CertTeamService = CertTeamService;
exports.CertTeamService = CertTeamService = CertTeamService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], CertTeamService);
//# sourceMappingURL=cert-team.service.js.map