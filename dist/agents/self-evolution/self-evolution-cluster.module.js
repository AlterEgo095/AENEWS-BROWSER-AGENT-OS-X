"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfEvolutionClusterModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("../base/base-agent.module");
const bridge_1 = require("../bridge");
const metric_analyzer_agent_1 = require("./metric-analyzer.agent");
const weakness_detector_agent_1 = require("./weakness-detector.agent");
const refactor_proposer_agent_1 = require("./refactor-proposer.agent");
const patch_generator_agent_1 = require("./patch-generator.agent");
const auto_certifier_agent_1 = require("./auto-certifier.agent");
let SelfEvolutionClusterModule = class SelfEvolutionClusterModule {
};
exports.SelfEvolutionClusterModule = SelfEvolutionClusterModule;
exports.SelfEvolutionClusterModule = SelfEvolutionClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [base_agent_module_1.BaseAgentModule, bridge_1.AgentConnectorBridgeModule],
        providers: [
            metric_analyzer_agent_1.MetricAnalyzerAgent,
            weakness_detector_agent_1.WeaknessDetectorAgent,
            refactor_proposer_agent_1.RefactorProposerAgent,
            patch_generator_agent_1.PatchGeneratorAgent,
            auto_certifier_agent_1.AutoCertifierAgent,
        ],
        exports: [
            metric_analyzer_agent_1.MetricAnalyzerAgent,
            weakness_detector_agent_1.WeaknessDetectorAgent,
            refactor_proposer_agent_1.RefactorProposerAgent,
            patch_generator_agent_1.PatchGeneratorAgent,
            auto_certifier_agent_1.AutoCertifierAgent,
        ],
    })
], SelfEvolutionClusterModule);
//# sourceMappingURL=self-evolution-cluster.module.js.map