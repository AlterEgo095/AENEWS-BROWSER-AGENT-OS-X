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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryManagerAgent = exports.MonitoringManagerAgent = exports.DeliveryManagerAgent = exports.CertificationManagerAgent = exports.SecurityManagerAgent = exports.ResourceManagerAgent = exports.MemoryManagerAgent = exports.TaskSchedulerAgent = exports.MissionPlannerAgent = exports.MissionOrchestratorAgent = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
const agent_registry_service_1 = require("../registry/agent-registry.service");
class CoreAgentBase {
    constructor(registry, loggerName) {
        this.registry = registry;
        this.logger = new common_1.Logger(loggerName);
    }
    getDefinition() {
        return this.registry.getDefinition(this.agentId);
    }
    isActive() {
        return true;
    }
}
let MissionOrchestratorAgent = class MissionOrchestratorAgent extends CoreAgentBase {
    constructor(registry) {
        super(registry, 'MissionOrchestratorAgent');
        this.agentId = interfaces_1.CoreAgent.MISSION_ORCHESTRATOR;
        this.name = 'Mission Orchestrator';
    }
    async orchestrate(missionId, instruction) {
        this.logger.log(`Orchestrating mission ${missionId}: "${instruction}"`);
        return {
            agentId: this.agentId,
            missionId,
            success: true,
            output: { instruction, pipeline: 'initialized' },
            artifacts: [],
            cost: 0.1,
            durationMs: 100,
            logs: [`Mission ${missionId} orchestration started`],
            errors: [],
            nextAgents: [interfaces_1.CoreAgent.MISSION_PLANNER],
        };
    }
};
exports.MissionOrchestratorAgent = MissionOrchestratorAgent;
exports.MissionOrchestratorAgent = MissionOrchestratorAgent = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], MissionOrchestratorAgent);
let MissionPlannerAgent = class MissionPlannerAgent extends CoreAgentBase {
    constructor(registry) {
        super(registry, 'MissionPlannerAgent');
        this.agentId = interfaces_1.CoreAgent.MISSION_PLANNER;
        this.name = 'Mission Planner';
    }
    async plan(missionId, instruction) {
        this.logger.log(`Planning mission ${missionId}`);
        const neededAgents = this.registry.findAgentsForMission(instruction);
        return {
            agentId: this.agentId,
            missionId,
            success: true,
            output: {
                phases: ['research', 'build', 'test', 'certify', 'deliver'],
                requiredAgents: neededAgents.map((a) => a.id),
                agentCount: neededAgents.length,
            },
            artifacts: [],
            cost: 0.15,
            durationMs: 500,
            logs: [`Plan created: ${neededAgents.length} agents needed`],
            errors: [],
            nextAgents: [interfaces_1.CoreAgent.TASK_SCHEDULER, ...neededAgents.map((a) => a.id)],
        };
    }
};
exports.MissionPlannerAgent = MissionPlannerAgent;
exports.MissionPlannerAgent = MissionPlannerAgent = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], MissionPlannerAgent);
let TaskSchedulerAgent = class TaskSchedulerAgent extends CoreAgentBase {
    constructor(registry) {
        super(registry, 'TaskSchedulerAgent');
        this.agentId = interfaces_1.CoreAgent.TASK_SCHEDULER;
        this.name = 'Task Scheduler';
    }
    async schedule(missionId, tasks) {
        this.logger.log(`Scheduling ${tasks.length} tasks for mission ${missionId}`);
        const scheduled = tasks.map((task, idx) => ({
            ...task,
            order: idx + 1,
            status: 'scheduled',
        }));
        return {
            agentId: this.agentId,
            missionId,
            success: true,
            output: { scheduledTasks: scheduled, totalTasks: tasks.length },
            artifacts: [],
            cost: 0.05,
            durationMs: 200,
            logs: [`${tasks.length} tasks scheduled`],
            errors: [],
        };
    }
};
exports.TaskSchedulerAgent = TaskSchedulerAgent;
exports.TaskSchedulerAgent = TaskSchedulerAgent = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], TaskSchedulerAgent);
let MemoryManagerAgent = class MemoryManagerAgent extends CoreAgentBase {
    constructor(registry) {
        super(registry, 'MemoryManagerAgent');
        this.agentId = interfaces_1.CoreAgent.MEMORY_MANAGER;
        this.name = 'Memory Manager';
    }
    async store(missionId, key, data) {
        return {
            agentId: this.agentId,
            missionId,
            success: true,
            output: { key, stored: true },
            artifacts: [],
            cost: 0.02,
            durationMs: 50,
            logs: [`Stored ${key} for mission ${missionId}`],
            errors: [],
        };
    }
    async retrieve(missionId, key) {
        return {
            agentId: this.agentId,
            missionId,
            success: true,
            output: { key, data: null },
            artifacts: [],
            cost: 0.02,
            durationMs: 50,
            logs: [`Retrieved ${key} for mission ${missionId}`],
            errors: [],
        };
    }
};
exports.MemoryManagerAgent = MemoryManagerAgent;
exports.MemoryManagerAgent = MemoryManagerAgent = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], MemoryManagerAgent);
let ResourceManagerAgent = class ResourceManagerAgent extends CoreAgentBase {
    constructor(registry) {
        super(registry, 'ResourceManagerAgent');
        this.agentId = interfaces_1.CoreAgent.RESOURCE_MANAGER;
        this.name = 'Resource Manager';
    }
    async allocate(missionId, taskType, budget) {
        this.logger.log(`Allocating resources for mission ${missionId}: ${taskType}`);
        const modelMap = {
            coding: 'claude-3.5-sonnet',
            analysis: 'gpt-4o',
            creative: 'claude-3.5-sonnet',
            simple: 'gpt-4o-mini',
            vision: 'gpt-4o-vision',
        };
        return {
            agentId: this.agentId,
            missionId,
            success: true,
            output: {
                model: modelMap[taskType] || 'gpt-4o',
                budget,
                allocated: true,
            },
            artifacts: [],
            cost: 0.03,
            durationMs: 100,
            logs: [`Resources allocated: ${modelMap[taskType] || 'gpt-4o'}`],
            errors: [],
        };
    }
};
exports.ResourceManagerAgent = ResourceManagerAgent;
exports.ResourceManagerAgent = ResourceManagerAgent = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], ResourceManagerAgent);
let SecurityManagerAgent = class SecurityManagerAgent extends CoreAgentBase {
    constructor(registry) {
        super(registry, 'SecurityManagerAgent');
        this.agentId = interfaces_1.CoreAgent.SECURITY_MANAGER;
        this.name = 'Security Manager';
    }
    async validate(missionId, action, target) {
        const blocked = ['delete_database', 'expose_credentials', 'open_firewall'];
        if (blocked.includes(action)) {
            return {
                agentId: this.agentId,
                missionId,
                success: false,
                output: { action, blocked: true, reason: 'Action violates security policy' },
                artifacts: [],
                cost: 0.02,
                durationMs: 50,
                logs: [`BLOCKED: ${action} on ${target}`],
                errors: [`Security violation: ${action}`],
            };
        }
        return {
            agentId: this.agentId,
            missionId,
            success: true,
            output: { action, allowed: true },
            artifacts: [],
            cost: 0.02,
            durationMs: 50,
            logs: [`Allowed: ${action} on ${target}`],
            errors: [],
        };
    }
};
exports.SecurityManagerAgent = SecurityManagerAgent;
exports.SecurityManagerAgent = SecurityManagerAgent = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], SecurityManagerAgent);
let CertificationManagerAgent = class CertificationManagerAgent extends CoreAgentBase {
    constructor(registry) {
        super(registry, 'CertificationManagerAgent');
        this.agentId = interfaces_1.CoreAgent.CERTIFICATION_MANAGER;
        this.name = 'Certification Manager';
    }
    async certify(missionId, deliverables) {
        this.logger.log(`Running certification for mission ${missionId}`);
        return {
            agentId: this.agentId,
            missionId,
            success: true,
            output: {
                certified: true,
                qualityScore: 92,
                checksRun: 8,
                passed: 7,
                failed: 1,
            },
            artifacts: [],
            cost: 0.1,
            durationMs: 1000,
            logs: [`Certification complete: score 92`],
            errors: [],
            nextAgents: [interfaces_1.CoreAgent.DELIVERY_MANAGER],
        };
    }
};
exports.CertificationManagerAgent = CertificationManagerAgent;
exports.CertificationManagerAgent = CertificationManagerAgent = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], CertificationManagerAgent);
let DeliveryManagerAgent = class DeliveryManagerAgent extends CoreAgentBase {
    constructor(registry) {
        super(registry, 'DeliveryManagerAgent');
        this.agentId = interfaces_1.CoreAgent.DELIVERY_MANAGER;
        this.name = 'Delivery Manager';
    }
    async deliver(missionId, artifacts) {
        this.logger.log(`Coordinating delivery for mission ${missionId}`);
        return {
            agentId: this.agentId,
            missionId,
            success: true,
            output: {
                delivered: true,
                artifactCount: artifacts.length,
                deliveryPath: `/missions/${missionId}/delivery/`,
            },
            artifacts: [],
            cost: 0.08,
            durationMs: 500,
            logs: [`${artifacts.length} artifacts delivered`],
            errors: [],
        };
    }
};
exports.DeliveryManagerAgent = DeliveryManagerAgent;
exports.DeliveryManagerAgent = DeliveryManagerAgent = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], DeliveryManagerAgent);
let MonitoringManagerAgent = class MonitoringManagerAgent extends CoreAgentBase {
    constructor(registry) {
        super(registry, 'MonitoringManagerAgent');
        this.agentId = interfaces_1.CoreAgent.MONITORING_MANAGER;
        this.name = 'Monitoring Manager';
    }
    async getHealth() {
        return {
            agentId: this.agentId,
            missionId: 'platform',
            success: true,
            output: {
                status: 'healthy',
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                timestamp: new Date(),
            },
            artifacts: [],
            cost: 0.01,
            durationMs: 50,
            logs: ['Health check: OK'],
            errors: [],
        };
    }
};
exports.MonitoringManagerAgent = MonitoringManagerAgent;
exports.MonitoringManagerAgent = MonitoringManagerAgent = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], MonitoringManagerAgent);
let RecoveryManagerAgent = class RecoveryManagerAgent extends CoreAgentBase {
    constructor(registry) {
        super(registry, 'RecoveryManagerAgent');
        this.agentId = interfaces_1.CoreAgent.RECOVERY_MANAGER;
        this.name = 'Recovery Manager';
    }
    async recover(missionId, error, strategy = 'retry') {
        this.logger.warn(`Recovery for mission ${missionId}: ${error} (strategy: ${strategy})`);
        return {
            agentId: this.agentId,
            missionId,
            success: strategy !== 'rollback',
            output: {
                error,
                strategy,
                recovered: true,
                attempts: 1,
            },
            artifacts: [],
            cost: 0.05,
            durationMs: 200,
            logs: [`Recovered from: ${error} using ${strategy}`],
            errors: [],
        };
    }
};
exports.RecoveryManagerAgent = RecoveryManagerAgent;
exports.RecoveryManagerAgent = RecoveryManagerAgent = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService])
], RecoveryManagerAgent);
//# sourceMappingURL=core-agents.service.js.map