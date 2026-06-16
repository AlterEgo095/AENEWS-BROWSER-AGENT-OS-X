import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { DataPipelineAgent } from './agents/data-pipeline.agent';
import { DataWarehouseAgent } from './agents/data-warehouse.agent';
import { RealTimeAnalyticsAgent } from './agents/realtime-analytics.agent';
import { DataQualityAgent } from './agents/data-quality.agent';
import { MLPipelineAgent } from './agents/ml-pipeline.agent';
import { BaseAgent } from '../../modules/agent/agent.abstract';

function createDataIntelligenceAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
) {
  const agents: BaseAgent[] = [
    new DataPipelineAgent(),
    new DataWarehouseAgent(),
    new RealTimeAnalyticsAgent(),
    new DataQualityAgent(),
    new MLPipelineAgent(),
  ];

  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
  }

  return agents;
}

@Module({})
export class DataIntelligenceClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
  ) {}

  onModuleInit() {
    const agents = createDataIntelligenceAgents(
      this.llmService,
      this.bridgeService,
      this.eventBus,
    );
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
