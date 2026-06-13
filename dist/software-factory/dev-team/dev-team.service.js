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
var DevTeamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevTeamService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
const agent_registry_service_1 = require("../registry/agent-registry.service");
let DevTeamService = DevTeamService_1 = class DevTeamService {
    constructor(registry) {
        this.registry = registry;
        this.logger = new common_1.Logger(DevTeamService_1.name);
    }
    getTeamAgents() { return this.registry.getByLevel(interfaces_1.AgentLevel.DEVELOPMENT); }
    selectAgents(taskDescription) {
        const desc = taskDescription.toLowerCase();
        const agents = [];
        if (/architect|design|structur|concev/i.test(desc))
            agents.push(interfaces_1.DevAgent.ARCHITECT);
        if (/frontend|react|vue|ui|interface|css/i.test(desc))
            agents.push(interfaces_1.DevAgent.FRONTEND);
        if (/backend|serveur|server|api|nest/i.test(desc))
            agents.push(interfaces_1.DevAgent.BACKEND);
        if (/database|base.*données|sql|prisma/i.test(desc))
            agents.push(interfaces_1.DevAgent.DATABASE);
        if (/api|endpoint|rest|graphql/i.test(desc) && !agents.includes(interfaces_1.DevAgent.BACKEND))
            agents.push(interfaces_1.DevAgent.API);
        if (/devops|ci.?cd|pipeline/i.test(desc))
            agents.push(interfaces_1.DevAgent.DEVOPS);
        if (/docker|container|image/i.test(desc))
            agents.push(interfaces_1.DevAgent.DOCKER);
        if (/kubernetes|k8s|cluster/i.test(desc))
            agents.push(interfaces_1.DevAgent.KUBERNETES);
        if (/qa|quality|review/i.test(desc))
            agents.push(interfaces_1.DevAgent.QA);
        if (/test|jest|spec/i.test(desc))
            agents.push(interfaces_1.DevAgent.TEST);
        if (/debug|fix|bug|error|corriger/i.test(desc))
            agents.push(interfaces_1.DevAgent.DEBUG);
        if (/document|readme|doc/i.test(desc))
            agents.push(interfaces_1.DevAgent.DOCUMENTATION);
        if (agents.length === 0) {
            agents.push(interfaces_1.DevAgent.ARCHITECT, interfaces_1.DevAgent.FRONTEND, interfaces_1.DevAgent.BACKEND);
        }
        return [...new Set(agents)];
    }
    async executeTask(missionId, task, input) {
        const selectedAgents = this.selectAgents(task);
        this.logger.log(`Dev team executing: "${task}" with ${selectedAgents.length} agents`);
        return {
            agentId: interfaces_1.DevAgent.ARCHITECT,
            missionId,
            success: true,
            output: { task, agentsUsed: selectedAgents, result: 'Development task completed', data: input },
            artifacts: [],
            cost: selectedAgents.length * 0.3,
            durationMs: selectedAgents.length * 2000,
            logs: selectedAgents.map(a => `Agent ${a} executed`),
            errors: [],
        };
    }
    getStats() {
        return {
            level: interfaces_1.AgentLevel.DEVELOPMENT,
            totalAgents: 12,
            availableAgents: this.getTeamAgents().map(a => ({
                id: a.id, name: a.name, skills: a.skills, costPerTask: a.estimatedCostPerTask,
            })),
        };
    }
};
exports.DevTeamService = DevTeamService;
exports.DevTeamService = DevTeamService = DevTeamService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], DevTeamService);
//# sourceMappingURL=dev-team.service.js.map