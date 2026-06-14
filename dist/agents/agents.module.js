"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("./base/base-agent.module");
const agent_registry_module_1 = require("./registry/agent-registry.module");
const orchestrator_module_1 = require("./orchestrator/orchestrator.module");
const memory_module_1 = require("./memory/memory.module");
const events_module_1 = require("./events/events.module");
const communication_module_1 = require("./communication/communication.module");
const health_module_1 = require("./health/health.module");
const bridge_1 = require("./bridge");
const browser_cluster_module_1 = require("./browser/browser-cluster.module");
const computer_cluster_module_1 = require("./computer/computer-cluster.module");
const coding_cluster_module_1 = require("./coding/coding-cluster.module");
const office_cluster_module_1 = require("./office/office-cluster.module");
const marketing_cluster_module_1 = require("./marketing/marketing-cluster.module");
const business_cluster_module_1 = require("./business/business-cluster.module");
const infrastructure_cluster_module_1 = require("./infrastructure/infrastructure-cluster.module");
const security_cluster_module_1 = require("./security/security-cluster.module");
const meta_intelligence_cluster_module_1 = require("./meta-intelligence/meta-intelligence-cluster.module");
const certification_cluster_module_1 = require("./certification/certification-cluster.module");
const self_evolution_cluster_module_1 = require("./self-evolution/self-evolution-cluster.module");
const llm_intelligence_1 = require("./llm-intelligence");
const watchdog_1 = require("./watchdog");
const intelligent_orchestration_1 = require("./intelligent-orchestration");
let AgentsModule = class AgentsModule {
};
exports.AgentsModule = AgentsModule;
exports.AgentsModule = AgentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            base_agent_module_1.BaseAgentModule,
            events_module_1.EventsModule,
            memory_module_1.MemoryModule,
            agent_registry_module_1.AgentRegistryModule,
            orchestrator_module_1.OrchestratorModule,
            communication_module_1.CommunicationModule,
            health_module_1.HealthModule,
            bridge_1.AgentConnectorBridgeModule,
            browser_cluster_module_1.BrowserClusterModule,
            computer_cluster_module_1.ComputerClusterModule,
            coding_cluster_module_1.CodingClusterModule,
            office_cluster_module_1.OfficeClusterModule,
            marketing_cluster_module_1.MarketingClusterModule,
            business_cluster_module_1.BusinessClusterModule,
            infrastructure_cluster_module_1.InfrastructureClusterModule,
            security_cluster_module_1.SecurityClusterModule,
            meta_intelligence_cluster_module_1.MetaIntelligenceClusterModule,
            certification_cluster_module_1.CertificationClusterModule,
            self_evolution_cluster_module_1.SelfEvolutionClusterModule,
            llm_intelligence_1.LLMIntelligenceClusterModule,
            watchdog_1.WatchdogClusterModule,
            intelligent_orchestration_1.IntelligentOrchestrationClusterModule,
        ],
        exports: [
            base_agent_module_1.BaseAgentModule,
            events_module_1.EventsModule,
            memory_module_1.MemoryModule,
            agent_registry_module_1.AgentRegistryModule,
            orchestrator_module_1.OrchestratorModule,
            communication_module_1.CommunicationModule,
            health_module_1.HealthModule,
            bridge_1.AgentConnectorBridgeModule,
            browser_cluster_module_1.BrowserClusterModule,
            computer_cluster_module_1.ComputerClusterModule,
            coding_cluster_module_1.CodingClusterModule,
            office_cluster_module_1.OfficeClusterModule,
            marketing_cluster_module_1.MarketingClusterModule,
            business_cluster_module_1.BusinessClusterModule,
            infrastructure_cluster_module_1.InfrastructureClusterModule,
            security_cluster_module_1.SecurityClusterModule,
            meta_intelligence_cluster_module_1.MetaIntelligenceClusterModule,
            certification_cluster_module_1.CertificationClusterModule,
            self_evolution_cluster_module_1.SelfEvolutionClusterModule,
            llm_intelligence_1.LLMIntelligenceClusterModule,
            watchdog_1.WatchdogClusterModule,
            intelligent_orchestration_1.IntelligentOrchestrationClusterModule,
        ],
    })
], AgentsModule);
//# sourceMappingURL=agents.module.js.map