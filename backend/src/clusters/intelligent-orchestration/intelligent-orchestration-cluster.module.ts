import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { MissionOrchestratorAIAgent } from './agents/mission-orchestrator-ai.agent';
import { DynamicSchedulerAgent } from './agents/dynamic-scheduler.agent';
import { ResourceNegotiatorAgent } from './agents/resource-negotiator.agent';
import { PriorityArbiterAgent } from './agents/priority-arbiter.agent';
import { BaseAgent } from '../../modules/agent/agent.abstract';

function createIntelligentOrchestrationAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
) {
  const agents: BaseAgent[] = [
    new MissionOrchestratorAIAgent(),
    new DynamicSchedulerAgent(),
    new ResourceNegotiatorAgent(),
    new PriorityArbiterAgent(),
  ];
  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
  }
  return agents;
}

@Module({})
export class IntelligentOrchestrationClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
  ) {}

  onModuleInit() {
    const agents = createIntelligentOrchestrationAgents(this.llmService, this.bridgeService, this.eventBus);
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
