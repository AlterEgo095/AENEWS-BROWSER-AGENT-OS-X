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
var OfficeTeamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfficeTeamService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
const agent_registry_service_1 = require("../registry/agent-registry.service");
let OfficeTeamService = OfficeTeamService_1 = class OfficeTeamService {
    constructor(registry) {
        this.registry = registry;
        this.logger = new common_1.Logger(OfficeTeamService_1.name);
    }
    getTeamAgents() {
        return this.registry.getByLevel(interfaces_1.AgentLevel.OFFICE);
    }
    selectAgents(taskDescription) {
        const desc = taskDescription.toLowerCase();
        const agents = [];
        if (/pdf|rapport|report/i.test(desc))
            agents.push(interfaces_1.OfficeAgent.PDF);
        if (/docx|word|document/i.test(desc))
            agents.push(interfaces_1.OfficeAgent.DOCX);
        if (/excel|spreadsheet|csv|tableur/i.test(desc))
            agents.push(interfaces_1.OfficeAgent.EXCEL);
        if (/powerpoint|présentation|slide/i.test(desc))
            agents.push(interfaces_1.OfficeAgent.POWERPOINT);
        if (/ocr|text.*image|scan/i.test(desc))
            agents.push(interfaces_1.OfficeAgent.OFFICE_OCR);
        if (/signature|sign/i.test(desc))
            agents.push(interfaces_1.OfficeAgent.SIGNATURE);
        if (agents.length === 0)
            agents.push(interfaces_1.OfficeAgent.PDF);
        return [...new Set(agents)];
    }
    async executeTask(missionId, task, input) {
        const selectedAgents = this.selectAgents(task);
        this.logger.log(`Office team executing: "${task}" with ${selectedAgents.length} agents`);
        return {
            agentId: interfaces_1.OfficeAgent.PDF,
            missionId,
            success: true,
            output: { task, agentsUsed: selectedAgents, result: 'Office task completed', data: input },
            artifacts: [],
            cost: selectedAgents.length * 0.1,
            durationMs: selectedAgents.length * 1000,
            logs: selectedAgents.map((a) => `Agent ${a} executed`),
            errors: [],
        };
    }
    getStats() {
        return {
            level: interfaces_1.AgentLevel.OFFICE,
            totalAgents: 6,
            availableAgents: this.getTeamAgents().map((a) => ({
                id: a.id,
                name: a.name,
                skills: a.skills,
                costPerTask: a.estimatedCostPerTask,
            })),
        };
    }
};
exports.OfficeTeamService = OfficeTeamService;
exports.OfficeTeamService = OfficeTeamService = OfficeTeamService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], OfficeTeamService);
//# sourceMappingURL=office-team.service.js.map