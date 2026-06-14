"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AgentPoolService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentPoolService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../interfaces");
const uuid_1 = require("uuid");
let AgentPoolService = AgentPoolService_1 = class AgentPoolService {
    constructor() {
        this.logger = new common_1.Logger(AgentPoolService_1.name);
        this.agents = new Map();
        this.archive = [];
        this.constraints = {
            maxConcurrentAgents: 30,
            maxAgentsPerRole: 5,
            maxTotalCostUsd: 500,
            defaultAgentLifetimeMs: 4 * 60 * 60 * 1000,
            defaultMaxTasksPerAgent: 50,
        };
    }
    async spawn(request) {
        const activeCount = this.getActiveCount();
        if (activeCount >= this.constraints.maxConcurrentAgents) {
            this.logger.warn(`Agent pool full: ${activeCount}/${this.constraints.maxConcurrentAgents}`);
            return {
                agentId: '',
                role: request.role,
                status: interfaces_1.AgentStatus.FAILED,
                ready: false,
            };
        }
        const roleCount = this.getActiveCountByRole(request.role);
        if (roleCount >= this.constraints.maxAgentsPerRole) {
            this.logger.warn(`Role ${request.role} at capacity: ${roleCount}/${this.constraints.maxAgentsPerRole}`);
            return {
                agentId: '',
                role: request.role,
                status: interfaces_1.AgentStatus.FAILED,
                ready: false,
            };
        }
        const agentId = `agent-${(0, uuid_1.v4)().slice(0, 8)}`;
        const agent = {
            id: agentId,
            role: request.role,
            missionId: request.missionId,
            status: interfaces_1.AgentStatus.SPAWNING,
            spawnedAt: new Date(),
            tasksCompleted: 0,
            tasksFailed: 0,
            totalCostUsd: 0,
            config: {
                ...request.config,
                maxLifetime: request.maxLifetime || this.constraints.defaultAgentLifetimeMs,
                maxTasks: request.maxTasks || this.constraints.defaultMaxTasksPerAgent,
                skills: request.skills,
            },
        };
        this.agents.set(agentId, agent);
        await this.initializeAgent(agent);
        this.logger.log(`Agent spawned: ${agentId} [${request.role}] for mission ${request.missionId}`);
        return {
            agentId,
            role: request.role,
            status: agent.status,
            ready: agent.status === interfaces_1.AgentStatus.READY,
        };
    }
    async terminate(request) {
        const agent = this.agents.get(request.agentId);
        if (!agent) {
            return {
                agentId: request.agentId,
                terminated: false,
                finalStatus: interfaces_1.AgentStatus.FAILED,
                tasksCompleted: 0,
                totalCostUsd: 0,
            };
        }
        agent.status = interfaces_1.AgentStatus.TERMINATING;
        if (agent.status === interfaces_1.AgentStatus.TERMINATING) {
            this.logger.warn(`Force-terminating agent ${request.agentId}`);
        }
        agent.terminatedAt = new Date();
        agent.status = interfaces_1.AgentStatus.TERMINATED;
        const result = {
            agentId: request.agentId,
            terminated: true,
            finalStatus: interfaces_1.AgentStatus.TERMINATED,
            tasksCompleted: agent.tasksCompleted,
            totalCostUsd: agent.totalCostUsd,
            archivedPath: undefined,
        };
        if (request.archiveResults) {
            this.archive.push({ ...agent });
            result.archivedPath = `archive/${agent.missionId}/${agent.id}`;
            this.logger.log(`Agent ${request.agentId} archived to ${result.archivedPath}`);
        }
        this.agents.delete(request.agentId);
        this.logger.log(`Agent terminated: ${request.agentId} [${request.reason}] — ${agent.tasksCompleted} tasks, $${agent.totalCostUsd.toFixed(2)}`);
        return result;
    }
    async terminateMissionAgents(missionId, reason) {
        const missionAgents = this.getAgentsByMission(missionId);
        const results = [];
        for (const agent of missionAgents) {
            const result = await this.terminate({
                agentId: agent.id,
                reason,
                archiveResults: true,
            });
            results.push(result);
        }
        this.logger.log(`Terminated ${results.length} agents for mission ${missionId}`);
        return results;
    }
    startTask(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent || agent.status !== interfaces_1.AgentStatus.READY)
            return false;
        agent.status = interfaces_1.AgentStatus.EXECUTING;
        this.agents.set(agentId, agent);
        return true;
    }
    completeTask(agentId, costUsd = 0, success = true) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return false;
        if (success) {
            agent.tasksCompleted++;
        }
        else {
            agent.tasksFailed++;
        }
        agent.totalCostUsd += costUsd;
        agent.status = interfaces_1.AgentStatus.READY;
        if (agent.tasksCompleted + agent.tasksFailed >=
            (agent.config.maxTasks || this.constraints.defaultMaxTasksPerAgent)) {
            this.logger.log(`Agent ${agentId} reached task limit, auto-terminating`);
            this.terminate({ agentId, reason: 'mission_complete', archiveResults: true });
            return true;
        }
        this.agents.set(agentId, agent);
        return true;
    }
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    getAgentsByMission(missionId) {
        const result = [];
        for (const agent of this.agents.values()) {
            if (agent.missionId === missionId) {
                result.push(agent);
            }
        }
        return result;
    }
    getStatistics() {
        const active = this.getActiveAgents();
        const byRole = {};
        for (const agent of active) {
            byRole[agent.role] = (byRole[agent.role] || 0) + 1;
        }
        const allAgents = [...this.archive];
        const totalLifetime = allAgents.reduce((sum, a) => {
            if (a.terminatedAt) {
                return sum + (a.terminatedAt.getTime() - a.spawnedAt.getTime());
            }
            return sum;
        }, 0);
        return {
            totalSpawned: this.archive.length + active.length,
            totalTerminated: this.archive.length,
            currentlyActive: active.length,
            byRole,
            totalCostUsd: [...active, ...this.archive].reduce((sum, a) => sum + a.totalCostUsd, 0),
            averageLifetimeMs: allAgents.length > 0 ? totalLifetime / allAgents.length : 0,
            averageTasksPerAgent: allAgents.length > 0
                ? allAgents.reduce((sum, a) => sum + a.tasksCompleted, 0) / allAgents.length
                : 0,
        };
    }
    getConstraints() {
        return { ...this.constraints };
    }
    updateConstraints(constraints) {
        this.constraints = { ...this.constraints, ...constraints };
    }
    async initializeAgent(agent) {
        agent.status = interfaces_1.AgentStatus.READY;
        this.agents.set(agent.id, agent);
    }
    getActiveCount() {
        let count = 0;
        for (const agent of this.agents.values()) {
            if (agent.status !== interfaces_1.AgentStatus.TERMINATED && agent.status !== interfaces_1.AgentStatus.FAILED) {
                count++;
            }
        }
        return count;
    }
    getActiveCountByRole(role) {
        let count = 0;
        for (const agent of this.agents.values()) {
            if (agent.role === role &&
                agent.status !== interfaces_1.AgentStatus.TERMINATED &&
                agent.status !== interfaces_1.AgentStatus.FAILED) {
                count++;
            }
        }
        return count;
    }
    getActiveAgents() {
        const result = [];
        for (const agent of this.agents.values()) {
            if (agent.status !== interfaces_1.AgentStatus.TERMINATED && agent.status !== interfaces_1.AgentStatus.FAILED) {
                result.push(agent);
            }
        }
        return result;
    }
};
exports.AgentPoolService = AgentPoolService;
exports.AgentPoolService = AgentPoolService = AgentPoolService_1 = __decorate([
    (0, common_1.Injectable)()
], AgentPoolService);
//# sourceMappingURL=agent-pool.service.js.map