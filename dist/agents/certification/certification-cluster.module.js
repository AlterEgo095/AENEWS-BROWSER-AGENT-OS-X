"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificationClusterModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("../base/base-agent.module");
const architecture_auditor_agent_service_1 = require("./architecture/architecture-auditor-agent.service");
const security_auditor_agent_service_1 = require("./security/security-auditor-agent.service");
const performance_auditor_agent_service_1 = require("./performance/performance-auditor-agent.service");
const memory_auditor_agent_service_1 = require("./memory/memory-auditor-agent.service");
const plugin_auditor_agent_service_1 = require("./plugin/plugin-auditor-agent.service");
const browser_auditor_agent_service_1 = require("./browser/browser-auditor-agent.service");
const orchestrator_auditor_agent_service_1 = require("./orchestrator/orchestrator-auditor-agent.service");
const documentation_auditor_agent_service_1 = require("./documentation/documentation-auditor-agent.service");
const test_auditor_agent_service_1 = require("./test/test-auditor-agent.service");
const regression_auditor_agent_service_1 = require("./regression/regression-auditor-agent.service");
const compliance_auditor_agent_service_1 = require("./compliance/compliance-auditor-agent.service");
const observability_auditor_agent_service_1 = require("./observability/observability-auditor-agent.service");
const ai_quality_auditor_agent_service_1 = require("./ai-quality/ai-quality-auditor-agent.service");
let CertificationClusterModule = class CertificationClusterModule {
};
exports.CertificationClusterModule = CertificationClusterModule;
exports.CertificationClusterModule = CertificationClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [base_agent_module_1.BaseAgentModule],
        providers: [
            architecture_auditor_agent_service_1.ArchitectureAuditorAgent,
            security_auditor_agent_service_1.SecurityAuditorAgent,
            performance_auditor_agent_service_1.PerformanceAuditorAgent,
            memory_auditor_agent_service_1.MemoryAuditorAgent,
            plugin_auditor_agent_service_1.PluginAuditorAgent,
            browser_auditor_agent_service_1.BrowserAuditorAgent,
            orchestrator_auditor_agent_service_1.OrchestratorAuditorAgent,
            documentation_auditor_agent_service_1.DocumentationAuditorAgent,
            test_auditor_agent_service_1.TestAuditorAgent,
            regression_auditor_agent_service_1.RegressionAuditorAgent,
            compliance_auditor_agent_service_1.ComplianceAuditorAgent,
            observability_auditor_agent_service_1.ObservabilityAuditorAgent,
            ai_quality_auditor_agent_service_1.AIQualityAuditorAgent,
        ],
        exports: [
            architecture_auditor_agent_service_1.ArchitectureAuditorAgent,
            security_auditor_agent_service_1.SecurityAuditorAgent,
            performance_auditor_agent_service_1.PerformanceAuditorAgent,
            memory_auditor_agent_service_1.MemoryAuditorAgent,
            plugin_auditor_agent_service_1.PluginAuditorAgent,
            browser_auditor_agent_service_1.BrowserAuditorAgent,
            orchestrator_auditor_agent_service_1.OrchestratorAuditorAgent,
            documentation_auditor_agent_service_1.DocumentationAuditorAgent,
            test_auditor_agent_service_1.TestAuditorAgent,
            regression_auditor_agent_service_1.RegressionAuditorAgent,
            compliance_auditor_agent_service_1.ComplianceAuditorAgent,
            observability_auditor_agent_service_1.ObservabilityAuditorAgent,
            ai_quality_auditor_agent_service_1.AIQualityAuditorAgent,
        ],
    })
], CertificationClusterModule);
//# sourceMappingURL=certification-cluster.module.js.map