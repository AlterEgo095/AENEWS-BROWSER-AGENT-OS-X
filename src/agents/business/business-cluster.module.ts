/**
 * AENEWS Agent OS X - Business Cluster Module
 * Aggregates all 8 business agents into a single NestJS module.
 * Imports the BaseAgentModule for shared infrastructure (event bus, memory).
 * Provides all business agent services for dependency injection.
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from '../base/base-agent.module';
import { MarketResearchAgentService } from './market-research/market-research-agent.service';
import { FinancialAnalysisAgentService } from './financial-analysis/financial-analysis-agent.service';
import { StrategyAgentService } from './strategy/strategy-agent.service';
import { CRMAgentService } from './crm/crm-agent.service';
import { ComplianceAgentService } from './compliance/compliance-agent.service';
import { HRAgentService } from './hr/hr-agent.service';
import { ProcurementAgentService } from './procurement/procurement-agent.service';
import { ProjectManagementAgentService } from './project-management/project-management-agent.service';

@Module({
  imports: [BaseAgentModule],
  providers: [
    // 1. Market Research — analyzeMarket, researchCompetitor, identifyTrends, analyzeDemand, generateMarketReport, assessMarketSize
    MarketResearchAgentService,
    // 2. Financial Analysis — buildFinancialModel, analyzePnL, forecastRevenue, calculateValuation, analyzeCashFlow, generateFinancialReport
    FinancialAnalysisAgentService,
    // 3. Strategy — createStrategicPlan, performSWOT, defineOKRs, analyzeCompetitivePosition, identifyOpportunities, assessRisks
    StrategyAgentService,
    // 4. CRM — createContact, updateContact, trackDeal, managePipeline, analyzeConversion, generateCRMReport
    CRMAgentService,
    // 5. Compliance — checkCompliance, generateAuditTrail, managePolicies, assessRisk, generateComplianceReport, trackRegulations
    ComplianceAgentService,
    // 6. HR — createJobPosting, screenCandidates, manageOnboarding, trackPerformance, generateHRReport, manageLeave
    HRAgentService,
    // 7. Procurement — createPurchaseOrder, manageVendor, trackShipment, compareSuppliers, negotiateContract, generateProcurementReport
    ProcurementAgentService,
    // 8. Project Management — createProject, planSprint, allocateResources, trackMilestones, manageRisks, generateProjectReport
    ProjectManagementAgentService,
  ],
  exports: [
    MarketResearchAgentService,
    FinancialAnalysisAgentService,
    StrategyAgentService,
    CRMAgentService,
    ComplianceAgentService,
    HRAgentService,
    ProcurementAgentService,
    ProjectManagementAgentService,
  ],
})
export class BusinessClusterModule {}
