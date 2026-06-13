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
var AgentHealthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentHealthService = void 0;
const common_1 = require("@nestjs/common");
const agent_interface_1 = require("../interfaces/agent.interface");
const agent_registry_service_1 = require("../registry/agent-registry.service");
const event_bus_service_1 = require("../events/event-bus.service");
const agent_event_interface_1 = require("../interfaces/agent-event.interface");
let AgentHealthService = AgentHealthService_1 = class AgentHealthService {
    constructor(agentRegistry, eventBus) {
        this.agentRegistry = agentRegistry;
        this.eventBus = eventBus;
        this.logger = new common_1.Logger(AgentHealthService_1.name);
        this.healthCheckInterval = null;
        this.circuitBreakers = new Map();
        this.healthResults = new Map();
        this.lastFullCheck = new Date();
        this.failureThreshold = 5;
        this.successThreshold = 3;
        this.resetTimeoutMs = 60000;
        this.healthCheckIntervalMs = 15000;
    }
    async onModuleInit() {
        this.startHealthChecks();
        this.logger.log('Agent Health service initialized');
    }
    onModuleDestroy() {
        this.stopHealthChecks();
    }
    async checkAgentHealth(agentId) {
        const agent = this.agentRegistry.getAgent(agentId);
        const startTime = Date.now();
        if (!agent) {
            return {
                agentId,
                isHealthy: false,
                status: agent_interface_1.AgentStatus.STOPPED,
                responseTimeMs: Date.now() - startTime,
                lastHealthCheck: new Date(),
                consecutiveFailures: Infinity,
                details: { error: 'Agent not found in registry' },
            };
        }
        const state = agent.getState();
        let isHealthy = false;
        let details = {};
        try {
            const isStatusHealthy = [agent_interface_1.AgentStatus.IDLE, agent_interface_1.AgentStatus.RUNNING, agent_interface_1.AgentStatus.PAUSED].includes(state.status);
            const customHealthy = (await agent.performHealthCheck?.()) ?? true;
            isHealthy = isStatusHealthy && customHealthy;
            details = {
                status: state.status,
                currentTasks: state.currentTasks.length,
                completedTasks: state.completedTasks,
                failedTasks: state.failedTasks,
                uptimeMs: state.health.uptimeMs,
                customHealthCheck: customHealthy,
            };
        }
        catch (error) {
            isHealthy = false;
            details = { error: error.message };
        }
        const responseTimeMs = Date.now() - startTime;
        const previousResult = this.healthResults.get(agentId);
        const consecutiveFailures = isHealthy ? 0 : (previousResult?.consecutiveFailures || 0) + 1;
        if (consecutiveFailures > 0 && consecutiveFailures % 3 === 0) {
            this.logger.warn(`Agent ${agentId} has ${consecutiveFailures} consecutive health check failures`);
        }
        this.updateCircuitBreaker(agentId, isHealthy);
        const result = {
            agentId,
            isHealthy,
            status: state.status,
            responseTimeMs,
            lastHealthCheck: new Date(),
            consecutiveFailures,
            details,
        };
        if (previousResult && previousResult.isHealthy !== isHealthy) {
            await this.eventBus.publish({
                type: agent_event_interface_1.AgentEventType.AGENT_HEALTH_CHANGED,
                sourceAgentId: 'health-service',
                payload: {
                    isHealthy,
                    previousHealth: previousResult.isHealthy,
                    consecutiveFailures,
                    details,
                },
                priority: isHealthy ? 1 : 2,
                correlationId: agentId,
                metadata: {},
            });
        }
        this.healthResults.set(agentId, result);
        return result;
    }
    async checkAllAgents() {
        const agents = this.agentRegistry.getAllAgents();
        const results = {};
        const batchSize = 10;
        for (let i = 0; i < agents.length; i += batchSize) {
            const batch = agents.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(batch.map(async (agent) => {
                const config = agent.getConfig();
                return { id: config.id, result: await this.checkAgentHealth(config.id) };
            }));
            for (const settled of batchResults) {
                if (settled.status === 'fulfilled') {
                    results[settled.value.id] = settled.value.result;
                }
            }
        }
        this.lastFullCheck = new Date();
        const healthyCount = Object.values(results).filter((r) => r.isHealthy).length;
        const unhealthyCount = Object.values(results).filter((r) => !r.isHealthy).length;
        const maintenanceCount = Object.values(results).filter((r) => r.status === agent_interface_1.AgentStatus.MAINTENANCE).length;
        const openBreakers = Array.from(this.circuitBreakers.values()).filter((cb) => cb.state === 'open').length;
        let status;
        if (unhealthyCount === 0 && openBreakers === 0) {
            status = 'healthy';
        }
        else if (unhealthyCount <= healthyCount && openBreakers <= 2) {
            status = 'degraded';
        }
        else {
            status = 'unhealthy';
        }
        const systemHealth = {
            status,
            totalAgents: agents.length,
            healthyAgents: healthyCount,
            unhealthyAgents: unhealthyCount,
            agentsInMaintenance: maintenanceCount,
            circuitBreakersOpen: openBreakers,
            lastFullCheck: this.lastFullCheck,
            agentHealth: results,
        };
        return systemHealth;
    }
    getCircuitBreaker(agentId) {
        return this.circuitBreakers.get(agentId) || null;
    }
    getAllCircuitBreakers() {
        return Array.from(this.circuitBreakers.values());
    }
    getHealthResult(agentId) {
        return this.healthResults.get(agentId) || null;
    }
    getSystemHealth() {
        const healthyCount = Array.from(this.healthResults.values()).filter((r) => r.isHealthy).length;
        const unhealthyCount = Array.from(this.healthResults.values()).filter((r) => !r.isHealthy).length;
        const maintenanceCount = Array.from(this.healthResults.values()).filter((r) => r.status === agent_interface_1.AgentStatus.MAINTENANCE).length;
        const openBreakers = Array.from(this.circuitBreakers.values()).filter((cb) => cb.state === 'open').length;
        let status;
        if (unhealthyCount === 0 && openBreakers === 0) {
            status = 'healthy';
        }
        else if (unhealthyCount <= healthyCount) {
            status = 'degraded';
        }
        else {
            status = 'unhealthy';
        }
        return {
            status,
            totalAgents: this.agentRegistry.getAgentCount(),
            healthyAgents: healthyCount,
            unhealthyAgents: unhealthyCount,
            agentsInMaintenance: maintenanceCount,
            circuitBreakersOpen: openBreakers,
            lastFullCheck: this.lastFullCheck,
            agentHealth: Object.fromEntries(this.healthResults),
        };
    }
    async recoverAgent(agentId) {
        this.logger.log(`Attempting to recover agent: ${agentId}`);
        try {
            const recovered = await this.agentRegistry.recoverAgent(agentId);
            if (recovered) {
                const cb = this.circuitBreakers.get(agentId);
                if (cb) {
                    cb.state = 'closed';
                    cb.failureCount = 0;
                    cb.successCount = 0;
                    cb.lastStateChange = new Date();
                    cb.nextRetryTime = null;
                }
                const healthResult = this.healthResults.get(agentId);
                if (healthResult) {
                    healthResult.isHealthy = true;
                    healthResult.consecutiveFailures = 0;
                }
                this.logger.log(`Agent ${agentId} recovered successfully`);
            }
            return recovered;
        }
        catch (error) {
            this.logger.error(`Failed to recover agent ${agentId}: ${error.message}`);
            return false;
        }
    }
    async recoverAllUnhealthy() {
        const results = {};
        for (const [agentId, cb] of this.circuitBreakers) {
            if (cb.state === 'open' || cb.state === 'half_open') {
                results[agentId] = await this.recoverAgent(agentId);
            }
        }
        return results;
    }
    updateCircuitBreaker(agentId, isHealthy) {
        let cb = this.circuitBreakers.get(agentId);
        if (!cb) {
            cb = {
                agentId,
                state: 'closed',
                failureCount: 0,
                successCount: 0,
                lastFailureTime: null,
                lastStateChange: new Date(),
                nextRetryTime: null,
            };
            this.circuitBreakers.set(agentId, cb);
        }
        if (isHealthy) {
            cb.failureCount = 0;
            cb.successCount++;
            if (cb.state === 'half_open' && cb.successCount >= this.successThreshold) {
                cb.state = 'closed';
                cb.lastStateChange = new Date();
                cb.nextRetryTime = null;
                this.logger.log(`Circuit breaker CLOSED for agent ${agentId}`);
                this.eventBus
                    .publish({
                    type: agent_event_interface_1.AgentEventType.CIRCUIT_BREAKER_CLOSED,
                    sourceAgentId: 'health-service',
                    payload: {
                        agentId,
                        state: cb.state,
                        failureCount: cb.failureCount,
                        lastFailureTime: cb.lastFailureTime || new Date(),
                    },
                    priority: 1,
                    correlationId: agentId,
                    metadata: {},
                })
                    .catch(() => { });
            }
        }
        else {
            cb.failureCount++;
            cb.successCount = 0;
            cb.lastFailureTime = new Date();
            if (cb.state === 'half_open') {
                cb.state = 'open';
                cb.lastStateChange = new Date();
                cb.nextRetryTime = new Date(Date.now() + this.resetTimeoutMs);
                this.logger.warn(`Circuit breaker OPENED for agent ${agentId} (half-open failure)`);
            }
            else if (cb.state === 'closed' && cb.failureCount >= this.failureThreshold) {
                cb.state = 'open';
                cb.lastStateChange = new Date();
                cb.nextRetryTime = new Date(Date.now() + this.resetTimeoutMs);
                this.logger.warn(`Circuit breaker OPENED for agent ${agentId} (${cb.failureCount} failures)`);
                this.eventBus
                    .publish({
                    type: agent_event_interface_1.AgentEventType.CIRCUIT_BREAKER_OPENED,
                    sourceAgentId: 'health-service',
                    payload: {
                        agentId,
                        state: cb.state,
                        failureCount: cb.failureCount,
                        lastFailureTime: cb.lastFailureTime || new Date(),
                    },
                    priority: 2,
                    correlationId: agentId,
                    metadata: {},
                })
                    .catch(() => { });
            }
        }
    }
    checkCircuitBreakerTimeouts() {
        const now = new Date();
        for (const [agentId, cb] of this.circuitBreakers) {
            if (cb.state === 'open' && cb.nextRetryTime && now >= cb.nextRetryTime) {
                cb.state = 'half_open';
                cb.successCount = 0;
                cb.lastStateChange = now;
                cb.nextRetryTime = null;
                this.logger.log(`Circuit breaker HALF-OPEN for agent ${agentId}`);
            }
        }
    }
    startHealthChecks() {
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.checkAllAgents();
                this.checkCircuitBreakerTimeouts();
            }
            catch (error) {
                this.logger.error(`Health check cycle failed: ${error.message}`);
            }
        }, this.healthCheckIntervalMs);
    }
    stopHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
};
exports.AgentHealthService = AgentHealthService;
exports.AgentHealthService = AgentHealthService = AgentHealthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_service_1.AgentRegistryService,
        event_bus_service_1.EventBusService])
], AgentHealthService);
//# sourceMappingURL=agent-health.service.js.map