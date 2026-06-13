import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMPlannerAgent } from './agents/llm-planner.agent';
import { LLMCriticAgent } from './agents/llm-critic.agent';
import { LLMJudgeAgent } from './agents/llm-judge.agent';
import { LLMDecomposerAgent } from './agents/llm-decomposer.agent';
import { LLMRepairAgent } from './agents/llm-repair-agent';
import { LLMValidatorAgent } from './agents/llm-validator.agent';

/**
 * Factory function that creates all 6 LLM Intelligence Cluster agent instances.
 * Called once during module initialization.
 *
 * Agents created:
 * - LLMPlannerAgent   — Mission planning and strategy evaluation
 * - LLMCriticAgent    — Semantic quality critique and improvement suggestions
 * - LLMJudgeAgent     — Final go/no-go arbitration and conflict resolution
 * - LLMDecomposerAgent — Task decomposition and dependency identification
 * - LLMRepairAgent    — Failure diagnosis and repair strategy generation
 * - LLMValidatorAgent — Deliverable validation and completeness assessment
 */
function createLlmIntelligenceAgents() {
  return [
    new LLMPlannerAgent(),
    new LLMCriticAgent(),
    new LLMJudgeAgent(),
    new LLMDecomposerAgent(),
    new LLMRepairAgent(),
    new LLMValidatorAgent(),
  ];
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
  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * On module initialization, register all 6 LLM Intelligence cluster agents
   * into the centralized AgentRegistryService.
   */
  onModuleInit() {
    const agents = createLlmIntelligenceAgents();
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
