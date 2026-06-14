import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { StrategyAgent } from './agents/strategy.agent';
import { FinanceAgent } from './agents/finance.agent';
import { CRMAgent } from './agents/crm.agent';
import { HRAgent } from './agents/hr.agent';
import { LegalAgent } from './agents/legal.agent';
import { ProcurementAgent } from './agents/procurement.agent';
import { ReportingAgent } from './agents/reporting.agent';
import { DecisionAgent } from './agents/decision.agent';
import { BaseAgent } from '../../modules/agent/agent.abstract';

function createBusinessAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
) {
  const agents: BaseAgent[] = [
    new StrategyAgent(),
    new FinanceAgent(),
    new CRMAgent(),
    new HRAgent(),
    new LegalAgent(),
    new ProcurementAgent(),
    new ReportingAgent(),
    new DecisionAgent(),
  ];
  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
  }
  return agents;
}

@Module({})
export class BusinessClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
  ) {}

  onModuleInit() {
    const agents = createBusinessAgents(this.llmService, this.bridgeService, this.eventBus);
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
