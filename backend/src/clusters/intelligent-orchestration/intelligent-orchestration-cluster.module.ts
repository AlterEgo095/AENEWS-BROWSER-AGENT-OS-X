import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { MissionOrchestratorAIAgent } from './agents/mission-orchestrator-ai.agent';
import { DynamicSchedulerAgent } from './agents/dynamic-scheduler.agent';
import { ResourceNegotiatorAgent } from './agents/resource-negotiator.agent';
import { PriorityArbiterAgent } from './agents/priority-arbiter.agent';

/**
 * Factory function that creates all 4 Intelligent Orchestration Cluster agent instances.
 * Called once during module initialization.
 */
function createIntelligentOrchestrationAgents() {
  return [
    new MissionOrchestratorAIAgent(),
    new DynamicSchedulerAgent(),
    new ResourceNegotiatorAgent(),
    new PriorityArbiterAgent(),
  ];
}

@Module({})
export class IntelligentOrchestrationClusterModule implements OnModuleInit {
  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * On module initialization, register all 4 intelligent orchestration cluster agents
   * into the centralized AgentRegistryService.
   */
  onModuleInit() {
    const agents = createIntelligentOrchestrationAgents();
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
