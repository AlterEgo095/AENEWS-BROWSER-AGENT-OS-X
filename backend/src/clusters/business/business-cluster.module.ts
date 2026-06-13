import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { StrategyAgent } from './agents/strategy.agent';
import { FinanceAgent } from './agents/finance.agent';
import { CRMAgent } from './agents/crm.agent';
import { HRAgent } from './agents/hr.agent';
import { LegalAgent } from './agents/legal.agent';
import { ProcurementAgent } from './agents/procurement.agent';
import { ReportingAgent } from './agents/reporting.agent';
import { DecisionAgent } from './agents/decision.agent';

/**
 * Factory function that creates all 8 Business Cluster agent instances.
 * Called once during module initialization.
 */
function createBusinessAgents() {
  return [
    new StrategyAgent(),
    new FinanceAgent(),
    new CRMAgent(),
    new HRAgent(),
    new LegalAgent(),
    new ProcurementAgent(),
    new ReportingAgent(),
    new DecisionAgent(),
  ];
}

@Module({})
export class BusinessClusterModule implements OnModuleInit {
  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * On module initialization, register all 8 business cluster agents
   * into the centralized AgentRegistryService.
   */
  onModuleInit() {
    const agents = createBusinessAgents();
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
