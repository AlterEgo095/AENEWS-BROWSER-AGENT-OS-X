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
var AgentRegistryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistryService = exports.RoutingStrategy = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const agent_interface_1 = require("../interfaces/agent.interface");
const agent_event_interface_1 = require("../interfaces/agent-event.interface");
const event_bus_service_1 = require("../events/event-bus.service");
var RoutingStrategy;
(function (RoutingStrategy) {
    RoutingStrategy["ROUND_ROBIN"] = "round_robin";
    RoutingStrategy["LEAST_LOADED"] = "least_loaded";
    RoutingStrategy["RANDOM"] = "random";
    RoutingStrategy["CAPABILITY_BASED"] = "capability_based";
    RoutingStrategy["PRIORITY_BASED"] = "priority_based";
})(RoutingStrategy || (exports.RoutingStrategy = RoutingStrategy = {}));
let AgentRegistryService = AgentRegistryService_1 = class AgentRegistryService {
    constructor(eventBusService) {
        this.eventBusService = eventBusService;
        this.logger = new common_1.Logger(AgentRegistryService_1.name);
        this.registry = new Map();
        this.clusterIndex = new Map();
        this.capabilityIndex = new Map();
        this.nameIndex = new Map();
        this.roundRobinCounters = new Map();
        this.heartbeatInterval = null;
        for (const cluster of Object.values(agent_interface_1.AgentCluster)) {
            this.clusterIndex.set(cluster, new Set());
        }
    }
    async onModuleInit() {
        this.startHeartbeatMonitoring();
        this.logger.log('Agent Registry initialized');
    }
    async onModuleDestroy() {
        this.stopHeartbeatMonitoring();
        this.logger.log('Agent Registry destroyed');
    }
    async register(agent) {
        const config = agent.getConfig();
        const existingEntry = this.registry.get(config.id);
        if (existingEntry) {
            this.logger.warn(`Agent ${config.id} already registered, updating entry`);
            await this.unregister(config.id);
        }
        const entry = {
            agentInstance: agent,
            config,
            registeredAt: new Date(),
            lastHeartbeat: new Date(),
        };
        this.registry.set(config.id, entry);
        const clusterAgents = this.clusterIndex.get(config.cluster);
        if (clusterAgents) {
            clusterAgents.add(config.id);
        }
        for (const capability of config.capabilities) {
            if (!this.capabilityIndex.has(capability.name)) {
                this.capabilityIndex.set(capability.name, new Set());
            }
            this.capabilityIndex.get(capability.name).add(config.id);
        }
        this.nameIndex.set(config.name, config.id);
        this.logger.log(`Registered agent: ${config.id} (${config.name}) in cluster ${config.cluster}`);
        this.eventBusService.publish({
            type: agent_event_interface_1.AgentEventType.AGENT_INITIALIZED,
            sourceAgentId: config.id,
            cluster: config.cluster,
            payload: {
                agentId: config.id,
                name: config.name,
                cluster: config.cluster,
                capabilities: config.capabilities.map((c) => c.name),
            },
            priority: 1,
            correlationId: (0, uuid_1.v4)(),
            metadata: {},
        }).catch((err) => {
            this.logger.warn(`Failed to publish registration event: ${err.message}`);
        });
    }
    async unregister(agentId) {
        const entry = this.registry.get(agentId);
        if (!entry) {
            return false;
        }
        const { config } = entry;
        const clusterAgents = this.clusterIndex.get(config.cluster);
        if (clusterAgents) {
            clusterAgents.delete(agentId);
        }
        for (const capability of config.capabilities) {
            const capAgents = this.capabilityIndex.get(capability.name);
            if (capAgents) {
                capAgents.delete(agentId);
                if (capAgents.size === 0) {
                    this.capabilityIndex.delete(capability.name);
                }
            }
        }
        if (this.nameIndex.get(config.name) === agentId) {
            this.nameIndex.delete(config.name);
        }
        this.registry.delete(agentId);
        this.logger.log(`Unregistered agent: ${agentId} (${config.name})`);
        return true;
    }
    get(agentId) {
        const entry = this.registry.get(agentId);
        return entry?.agentInstance;
    }
    getAgent(agentId) {
        const entry = this.registry.get(agentId);
        return entry?.agentInstance ?? null;
    }
    getAgentByName(name) {
        const agentId = this.nameIndex.get(name);
        if (!agentId)
            return null;
        return this.getAgent(agentId);
    }
    getByCluster(cluster) {
        const agentIds = this.clusterIndex.get(cluster);
        if (!agentIds)
            return [];
        return Array.from(agentIds)
            .map((id) => this.registry.get(id)?.agentInstance)
            .filter((agent) => agent !== undefined);
    }
    getAgentsByCluster(cluster) {
        return this.getByCluster(cluster);
    }
    getByCapability(capabilityName) {
        const agentIds = this.capabilityIndex.get(capabilityName);
        if (!agentIds)
            return [];
        return Array.from(agentIds)
            .map((id) => this.registry.get(id)?.agentInstance)
            .filter((agent) => agent !== undefined);
    }
    getAgentsByCapability(capabilityName) {
        return this.getByCapability(capabilityName);
    }
    getAll() {
        return Array.from(this.registry.values())
            .map((entry) => entry.agentInstance);
    }
    getAllAgents() {
        return this.getAll();
    }
    getAllStates() {
        return Array.from(this.registry.values())
            .map((entry) => entry.agentInstance.getState());
    }
    getAllAgentStates() {
        return this.getAllStates();
    }
    getAvailableAgents(cluster) {
        const agents = cluster
            ? this.getByCluster(cluster)
            : this.getAll();
        return agents.filter((agent) => agent.canAcceptTask());
    }
    findBestAgent(capability, priority) {
        const capableAgents = this.getByCapability(capability);
        if (capableAgents.length === 0) {
            this.logger.warn(`No agents found with capability: ${capability}`);
            return undefined;
        }
        let availableAgents = capableAgents.filter((agent) => agent.canAcceptTask());
        if (availableAgents.length === 0) {
            this.logger.warn(`No available agents with capability: ${capability} (all busy or unhealthy)`);
            return undefined;
        }
        if (priority !== undefined && priority >= agent_interface_1.TaskPriority.HIGH) {
            availableAgents.sort((a, b) => a.getCurrentTaskCount() - b.getCurrentTaskCount());
            return availableAgents[0];
        }
        availableAgents.sort((a, b) => a.getCurrentTaskCount() - b.getCurrentTaskCount());
        return availableAgents[0];
    }
    routeTask(input, strategy = RoutingStrategy.LEAST_LOADED, targetCluster) {
        const availableAgents = this.getAvailableAgents(targetCluster);
        if (availableAgents.length === 0) {
            this.logger.warn(`No available agents${targetCluster ? ` in cluster ${targetCluster}` : ''} for task ${input.taskId}`);
            return null;
        }
        let selectedAgent = null;
        let reason = '';
        switch (strategy) {
            case RoutingStrategy.ROUND_ROBIN: {
                const clusterKey = targetCluster || 'global';
                const counter = (this.roundRobinCounters.get(clusterKey) || 0) + 1;
                this.roundRobinCounters.set(clusterKey, counter);
                selectedAgent = availableAgents[counter % availableAgents.length];
                reason = `Round-robin selection (counter: ${counter})`;
                break;
            }
            case RoutingStrategy.LEAST_LOADED: {
                selectedAgent = availableAgents.reduce((best, agent) => {
                    const bestCount = best.getCurrentTaskCount();
                    const agentCount = agent.getCurrentTaskCount();
                    return agentCount < bestCount ? agent : best;
                });
                reason = `Least loaded agent (${selectedAgent.getCurrentTaskCount()} tasks)`;
                break;
            }
            case RoutingStrategy.RANDOM: {
                const index = Math.floor(Math.random() * availableAgents.length);
                selectedAgent = availableAgents[index];
                reason = `Random selection (index: ${index})`;
                break;
            }
            case RoutingStrategy.CAPABILITY_BASED: {
                const requiredCapability = input.context?.requiredCapability;
                if (requiredCapability) {
                    const capableAgents = availableAgents.filter((agent) => agent.hasCapability(requiredCapability));
                    if (capableAgents.length > 0) {
                        selectedAgent = capableAgents.reduce((best, agent) => {
                            const bestCount = best.getCurrentTaskCount();
                            const agentCount = agent.getCurrentTaskCount();
                            return agentCount < bestCount ? agent : best;
                        });
                        reason = `Capability-based: ${requiredCapability}`;
                    }
                }
                if (!selectedAgent) {
                    selectedAgent = availableAgents.reduce((best, agent) => {
                        const bestCount = best.getCurrentTaskCount();
                        const agentCount = agent.getCurrentTaskCount();
                        return agentCount < bestCount ? agent : best;
                    });
                    reason = 'Capability-based: fallback to least loaded';
                }
                break;
            }
            case RoutingStrategy.PRIORITY_BASED: {
                const priority = input.priority ?? agent_interface_1.TaskPriority.NORMAL;
                if (priority >= agent_interface_1.TaskPriority.HIGH) {
                    selectedAgent = availableAgents.reduce((best, agent) => {
                        const bestCount = best.getCurrentTaskCount();
                        const agentCount = agent.getCurrentTaskCount();
                        return agentCount < bestCount ? agent : best;
                    });
                    reason = `Priority-based routing (priority: ${priority})`;
                }
                else {
                    const clusterKey = targetCluster || 'global';
                    const counter = (this.roundRobinCounters.get(clusterKey) || 0) + 1;
                    this.roundRobinCounters.set(clusterKey, counter);
                    selectedAgent = availableAgents[counter % availableAgents.length];
                    reason = `Priority-based: round-robin (priority: ${priority})`;
                }
                break;
            }
        }
        if (!selectedAgent) {
            return null;
        }
        const config = selectedAgent.getConfig();
        return {
            agentId: config.id,
            agentName: config.name,
            cluster: config.cluster,
            reason,
        };
    }
    async initializeAll() {
        this.logger.log(`Initializing ${this.registry.size} agents...`);
        const results = await Promise.allSettled(Array.from(this.registry.values()).map(async (entry) => {
            try {
                await entry.agentInstance.onModuleInit();
                return { agentId: entry.config.id, success: true };
            }
            catch (error) {
                this.logger.error(`Failed to initialize agent ${entry.config.id}: ${error.message}`);
                return { agentId: entry.config.id, success: false, error: error.message };
            }
        }));
        const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - succeeded;
        this.logger.log(`Agent initialization complete: ${succeeded} succeeded, ${failed} failed out of ${results.length} total`);
    }
    async healthCheckAll() {
        const healthResults = new Map();
        const checkPromises = Array.from(this.registry.entries()).map(async ([agentId, entry]) => {
            try {
                const isHealthy = await entry.agentInstance.healthCheck();
                healthResults.set(agentId, isHealthy);
            }
            catch (error) {
                this.logger.error(`Health check failed for agent ${agentId}: ${error.message}`);
                healthResults.set(agentId, false);
            }
        });
        await Promise.allSettled(checkPromises);
        this.logger.log(`Health check complete: ${Array.from(healthResults.values()).filter(Boolean).length}/${healthResults.size} healthy`);
        return healthResults;
    }
    getHealthStatus() {
        const status = {};
        for (const [agentId, entry] of this.registry) {
            const state = entry.agentInstance.getState();
            status[agentId] = {
                isHealthy: state.health.isHealthy,
                status: state.status,
                consecutiveFailures: state.health.consecutiveFailures,
                uptimeMs: state.health.uptimeMs,
            };
        }
        return status;
    }
    getUnhealthyAgents() {
        return this.getAll().filter((agent) => {
            const state = agent.getState();
            return !state.health.isHealthy || state.status === agent_interface_1.AgentStatus.ERROR;
        });
    }
    async recoverAgent(agentId) {
        const entry = this.registry.get(agentId);
        if (!entry) {
            this.logger.warn(`Cannot recover unknown agent: ${agentId}`);
            return false;
        }
        const agent = entry.agentInstance;
        const state = agent.getState();
        try {
            this.logger.log(`Attempting to recover agent: ${agentId}`);
            if (state.status === agent_interface_1.AgentStatus.ERROR) {
                try {
                    await agent.stop();
                }
                catch {
                }
                await agent.onModuleInit();
                this.logger.log(`Agent ${agentId} recovered successfully`);
                return true;
            }
            if (state.status === agent_interface_1.AgentStatus.STOPPED) {
                await agent.onModuleInit();
                await agent.start();
                this.logger.log(`Agent ${agentId} restarted successfully`);
                return true;
            }
            this.logger.warn(`Agent ${agentId} is in ${state.status} state, not recoverable`);
            return false;
        }
        catch (error) {
            this.logger.error(`Failed to recover agent ${agentId}: ${error.message}`);
            return false;
        }
    }
    startHeartbeatMonitoring() {
        this.heartbeatInterval = setInterval(() => {
            this.performHeartbeatCheck();
        }, 60000);
    }
    stopHeartbeatMonitoring() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    performHeartbeatCheck() {
        for (const [agentId, entry] of this.registry) {
            try {
                const state = entry.agentInstance.getState();
                entry.lastHeartbeat = new Date();
                const timeSinceActivity = Date.now() - state.lastActivity.getTime();
                if (state.status === agent_interface_1.AgentStatus.RUNNING &&
                    timeSinceActivity > 300000) {
                    this.logger.warn(`Agent ${agentId} has been idle for ${Math.round(timeSinceActivity / 1000)}s while in RUNNING state`);
                }
            }
            catch (error) {
                this.logger.error(`Heartbeat check failed for agent ${agentId}: ${error.message}`);
            }
        }
    }
    getStats() {
        const byCluster = {};
        for (const cluster of Object.values(agent_interface_1.AgentCluster)) {
            const agents = this.getByCluster(cluster);
            byCluster[cluster] = agents.length;
        }
        let healthy = 0;
        for (const entry of this.registry.values()) {
            const state = entry.agentInstance.getState();
            if (state.health.isHealthy) {
                healthy++;
            }
        }
        return {
            total: this.registry.size,
            byCluster,
            healthy,
        };
    }
    getExtendedStats() {
        const agentsByCluster = {};
        const agentsByStatus = {};
        for (const cluster of Object.values(agent_interface_1.AgentCluster)) {
            const agents = this.getByCluster(cluster);
            agentsByCluster[cluster] = agents.length;
        }
        let healthyAgents = 0;
        for (const entry of this.registry.values()) {
            const status = entry.agentInstance.getStatus();
            agentsByStatus[status] = (agentsByStatus[status] || 0) + 1;
            const state = entry.agentInstance.getState();
            if (state.health.isHealthy) {
                healthyAgents++;
            }
        }
        return {
            totalAgents: this.registry.size,
            agentsByCluster,
            agentsByStatus,
            totalCapabilities: this.capabilityIndex.size,
            availableAgents: this.getAvailableAgents().length,
            healthyAgents,
        };
    }
    isRegistered(agentId) {
        return this.registry.has(agentId);
    }
    getAgentCount() {
        return this.registry.size;
    }
};
exports.AgentRegistryService = AgentRegistryService;
exports.AgentRegistryService = AgentRegistryService = AgentRegistryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService])
], AgentRegistryService);
//# sourceMappingURL=agent-registry.service.js.map