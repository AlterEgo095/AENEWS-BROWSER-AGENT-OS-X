"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessClusterModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("../base/base-agent.module");
const market_research_agent_service_1 = require("./market-research/market-research-agent.service");
const financial_analysis_agent_service_1 = require("./financial-analysis/financial-analysis-agent.service");
const strategy_agent_service_1 = require("./strategy/strategy-agent.service");
const crm_agent_service_1 = require("./crm/crm-agent.service");
const compliance_agent_service_1 = require("./compliance/compliance-agent.service");
const hr_agent_service_1 = require("./hr/hr-agent.service");
const procurement_agent_service_1 = require("./procurement/procurement-agent.service");
const project_management_agent_service_1 = require("./project-management/project-management-agent.service");
let BusinessClusterModule = class BusinessClusterModule {
};
exports.BusinessClusterModule = BusinessClusterModule;
exports.BusinessClusterModule = BusinessClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [base_agent_module_1.BaseAgentModule],
        providers: [
            market_research_agent_service_1.MarketResearchAgentService,
            financial_analysis_agent_service_1.FinancialAnalysisAgentService,
            strategy_agent_service_1.StrategyAgentService,
            crm_agent_service_1.CRMAgentService,
            compliance_agent_service_1.ComplianceAgentService,
            hr_agent_service_1.HRAgentService,
            procurement_agent_service_1.ProcurementAgentService,
            project_management_agent_service_1.ProjectManagementAgentService,
        ],
        exports: [
            market_research_agent_service_1.MarketResearchAgentService,
            financial_analysis_agent_service_1.FinancialAnalysisAgentService,
            strategy_agent_service_1.StrategyAgentService,
            crm_agent_service_1.CRMAgentService,
            compliance_agent_service_1.ComplianceAgentService,
            hr_agent_service_1.HRAgentService,
            procurement_agent_service_1.ProcurementAgentService,
            project_management_agent_service_1.ProjectManagementAgentService,
        ],
    })
], BusinessClusterModule);
//# sourceMappingURL=business-cluster.module.js.map