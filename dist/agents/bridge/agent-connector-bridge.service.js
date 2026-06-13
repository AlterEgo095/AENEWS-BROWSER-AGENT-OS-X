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
var AgentConnectorBridge_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentConnectorBridge = void 0;
const common_1 = require("@nestjs/common");
const connector_registry_1 = require("../../software-factory/connectors/connector-registry");
const llm_helper_1 = require("../../software-factory/connectors/llm-helper");
let AgentConnectorBridge = AgentConnectorBridge_1 = class AgentConnectorBridge {
    constructor(connectorRegistry) {
        this.connectorRegistry = connectorRegistry;
        this.logger = new common_1.Logger(AgentConnectorBridge_1.name);
        this.llm = new llm_helper_1.LLMHelper();
        this.logger.log('Agent-Connector Bridge initialized — agents can now use real connectors');
    }
    async executeCapability(capabilityId, input) {
        const connector = this.connectorRegistry.getConnector(capabilityId);
        if (!connector) {
            this.logger.warn(`No connector found for capability: ${capabilityId} — returning error output`);
            return {
                success: false,
                artifacts: [],
                output: null,
                costUsd: 0,
                durationMs: 0,
                error: `No connector found for capability: ${capabilityId}`,
            };
        }
        const connectorInput = {
            missionId: input.missionId || `agent-${Date.now()}`,
            instruction: input.instruction,
            workspaceDir: input.workspaceDir || `/tmp/aenews-agent-workspace/${Date.now()}`,
            parameters: input.parameters,
            previousResults: input.previousResults || new Map(),
            tools: [],
        };
        this.logger.log(`Executing capability "${capabilityId}" for mission "${connectorInput.missionId}" via ${connector.constructor.name}`);
        const startTime = Date.now();
        try {
            const result = await connector.execute(capabilityId, connectorInput);
            const totalMs = Date.now() - startTime;
            this.logger.log(`Capability "${capabilityId}" completed: success=${result.success}, cost=$${result.costUsd.toFixed(4)}, duration=${totalMs}ms, artifacts=${result.artifacts.length}`);
            return result;
        }
        catch (error) {
            const totalMs = Date.now() - startTime;
            this.logger.error(`Capability "${capabilityId}" threw error after ${totalMs}ms: ${error.message}`);
            return {
                success: false,
                artifacts: [],
                output: null,
                costUsd: 0,
                durationMs: totalMs,
                error: `Connector execution failed: ${error.message}`,
            };
        }
    }
    async callLLM(options) {
        this.logger.log(`Direct LLM call: systemPrompt=${options.systemPrompt.substring(0, 50)}...`);
        return this.llm.call(options);
    }
    hasConnector(capabilityId) {
        return this.connectorRegistry.hasConnector(capabilityId);
    }
    getRegisteredConnectors() {
        return this.connectorRegistry.getAllConnectors();
    }
    getRegistryStatistics() {
        return this.connectorRegistry.getStatistics();
    }
    getLLMCacheStats() {
        return this.llm.getCacheStats();
    }
    getLLMMetrics() {
        return this.llm.getMetrics();
    }
};
exports.AgentConnectorBridge = AgentConnectorBridge;
exports.AgentConnectorBridge = AgentConnectorBridge = AgentConnectorBridge_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [connector_registry_1.ConnectorRegistry])
], AgentConnectorBridge);
//# sourceMappingURL=agent-connector-bridge.service.js.map