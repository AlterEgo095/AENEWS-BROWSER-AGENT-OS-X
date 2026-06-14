import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { LLMPlannerAgent } from './agents/llm-planner.agent';
import { LLMCriticAgent } from './agents/llm-critic.agent';
import { LLMJudgeAgent } from './agents/llm-judge.agent';
import { LLMDecomposerAgent } from './agents/llm-decomposer.agent';
import { LLMRepairAgent } from './agents/llm-repair-agent';
import { LLMValidatorAgent } from './agents/llm-validator.agent';

/**
 * Factory function that creates all 6 LLM Intelligence Cluster agent instances
 * and injects LLM/Bridge/EventBus services.
 */
function createLlmIntelligenceAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
) {
  const agents = [
    new LLMPlannerAgent(),
    new LLMCriticAgent(),
    new LLMJudgeAgent(),
    new LLMDecomposerAgent(),
    new LLMRepairAgent(),
    new LLMValidatorAgent(),
  ];

  // Inject services into all agents
  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
  }

  return agents;
}

/**
 * LLMIntelligenceClusterModule — Registers all LLM Intelligence agents into the AgentRegistry.
 *
 * This cluster provides the reasoning and decision-making backbone for the
 * AENEWS Agent OS X platform. Each agent leverages LLM-powered analysis to
 * deliver intelligent planning, evaluation, arbitration, decomposition,
 * repair, and validation capabilities.
 *
 * All agents register under the `ClusterType.LLM_INTELLIGENCE` cluster
 * and are discoverable via the AgentRegistryService at runtime.
 */
@Module({})
export class LLMIntelligenceClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
  ) {}

  /**
   * On module initialization, register all 6 LLM Intelligence cluster agents
   * into the centralized AgentRegistryService with injected services.
   */
  onModuleInit() {
    const agents = createLlmIntelligenceAgents(
      this.llmService,
      this.bridgeService,
      this.eventBus,
    );
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
