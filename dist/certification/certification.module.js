"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificationModule = void 0;
const common_1 = require("@nestjs/common");
const eqi_calculator_service_1 = require("./eqi-calculator.service");
const architect_certification_service_1 = require("./architect/architect-certification.service");
const dependency_analyzer_service_1 = require("./architect/dependency-analyzer.service");
const agent_integrity_certification_service_1 = require("./integrity/agent-integrity-certification.service");
const orchestration_certification_service_1 = require("./orchestration/orchestration-certification.service");
const browser_certification_service_1 = require("./browser/browser-certification.service");
const performance_certification_service_1 = require("./performance/performance-certification.service");
const communication_certification_service_1 = require("./communication/communication-certification.service");
const memory_certification_service_1 = require("./memory/memory-certification.service");
const resilience_certification_service_1 = require("./resilience/resilience-certification.service");
const security_certification_service_1 = require("./security/security-certification.service");
const certification_runner_service_1 = require("./certification-runner.service");
const certification_controller_1 = require("./certification.controller");
let CertificationModule = class CertificationModule {
};
exports.CertificationModule = CertificationModule;
exports.CertificationModule = CertificationModule = __decorate([
    (0, common_1.Module)({
        providers: [
            eqi_calculator_service_1.EqiCalculatorService,
            dependency_analyzer_service_1.DependencyAnalyzerService,
            architect_certification_service_1.ArchitectCertificationService,
            agent_integrity_certification_service_1.AgentIntegrityCertificationService,
            orchestration_certification_service_1.OrchestrationCertificationService,
            browser_certification_service_1.BrowserCertificationService,
            performance_certification_service_1.PerformanceCertificationService,
            communication_certification_service_1.CommunicationCertificationService,
            memory_certification_service_1.MemoryCertificationService,
            resilience_certification_service_1.ResilienceCertificationService,
            security_certification_service_1.SecurityCertificationService,
            certification_runner_service_1.CertificationRunnerService,
        ],
        controllers: [certification_controller_1.CertificationController],
        exports: [
            eqi_calculator_service_1.EqiCalculatorService,
            dependency_analyzer_service_1.DependencyAnalyzerService,
            architect_certification_service_1.ArchitectCertificationService,
            agent_integrity_certification_service_1.AgentIntegrityCertificationService,
            orchestration_certification_service_1.OrchestrationCertificationService,
            browser_certification_service_1.BrowserCertificationService,
            performance_certification_service_1.PerformanceCertificationService,
            communication_certification_service_1.CommunicationCertificationService,
            memory_certification_service_1.MemoryCertificationService,
            resilience_certification_service_1.ResilienceCertificationService,
            security_certification_service_1.SecurityCertificationService,
            certification_runner_service_1.CertificationRunnerService,
        ],
    })
], CertificationModule);
//# sourceMappingURL=certification.module.js.map