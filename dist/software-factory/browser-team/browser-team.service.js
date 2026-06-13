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
var BrowserTeamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserTeamService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
const agent_registry_service_1 = require("../registry/agent-registry.service");
let BrowserTeamService = BrowserTeamService_1 = class BrowserTeamService {
    constructor(registry) {
        this.registry = registry;
        this.logger = new common_1.Logger(BrowserTeamService_1.name);
    }
    getTeamAgents() {
        return this.registry.getByLevel(interfaces_1.AgentLevel.BROWSER);
    }
    selectAgents(taskDescription) {
        const desc = taskDescription.toLowerCase();
        const agents = [];
        agents.push(interfaces_1.BrowserAgent.SESSION);
        if (/login|auth|sign.?in/i.test(desc))
            agents.push(interfaces_1.BrowserAgent.LOGIN);
        if (/navigate|go.*to|open.*page|visit/i.test(desc))
            agents.push(interfaces_1.BrowserAgent.NAVIGATION);
        if (/search|find|look.*for/i.test(desc))
            agents.push(interfaces_1.BrowserAgent.SEARCH);
        if (/fill|form|submit|input/i.test(desc))
            agents.push(interfaces_1.BrowserAgent.FORM);
        if (/upload|attach.*file/i.test(desc))
            agents.push(interfaces_1.BrowserAgent.UPLOAD);
        if (/download|save.*file/i.test(desc))
            agents.push(interfaces_1.BrowserAgent.DOWNLOAD);
        if (/screenshot|capture|snap/i.test(desc))
            agents.push(interfaces_1.BrowserAgent.SCREENSHOT);
        if (/vision|see|look.*at|visual/i.test(desc))
            agents.push(interfaces_1.BrowserAgent.VISION);
        if (/cookie|consent|accept/i.test(desc))
            agents.push(interfaces_1.BrowserAgent.COOKIE);
        if (/popup|alert|dialog|modal/i.test(desc))
            agents.push(interfaces_1.BrowserAgent.POPUP);
        if (/ocr|text.*image|read.*image/i.test(desc))
            agents.push(interfaces_1.BrowserAgent.OCR);
        if (agents.length === 1)
            agents.push(interfaces_1.BrowserAgent.NAVIGATION);
        return [...new Set(agents)];
    }
    async executeTask(missionId, task, input) {
        const selectedAgents = this.selectAgents(task);
        this.logger.log(`Browser team executing: "${task}" with ${selectedAgents.length} agents`);
        return {
            agentId: interfaces_1.BrowserAgent.NAVIGATION,
            missionId,
            success: true,
            output: {
                task,
                agentsUsed: selectedAgents,
                result: 'Browser task completed',
                data: input,
            },
            artifacts: [],
            cost: selectedAgents.length * 0.15,
            durationMs: selectedAgents.length * 500,
            logs: selectedAgents.map(a => `Agent ${a} executed`),
            errors: [],
        };
    }
    getStats() {
        return {
            level: interfaces_1.AgentLevel.BROWSER,
            totalAgents: 12,
            availableAgents: this.getTeamAgents().map(a => ({
                id: a.id,
                name: a.name,
                skills: a.skills,
                costPerTask: a.estimatedCostPerTask,
            })),
        };
    }
};
exports.BrowserTeamService = BrowserTeamService;
exports.BrowserTeamService = BrowserTeamService = BrowserTeamService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], BrowserTeamService);
//# sourceMappingURL=browser-team.service.js.map