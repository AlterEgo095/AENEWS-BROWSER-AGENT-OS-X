import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { OrchestrationAgent } from './agents/orchestration.agent';
import { LearningAgent } from './agents/learning.agent';
import { ReasoningAgent } from './agents/reasoning.agent';
import { MemoryAgent } from './agents/memory.agent';
import { PerceptionAgent } from './agents/perception.agent';
import { CreativityAgent } from './agents/creativity.agent';
import { EvaluationAgent } from './agents/evaluation.agent';
import { OptimizationAgent } from './agents/optimization.agent';
import { CollaborationAgent } from './agents/collaboration.agent';
import { AdaptationAgent } from './agents/adaptation.agent';
import { MetaCognitionAgent } from './agents/meta-cognition.agent';
import { KnowledgeAgent } from './agents/knowledge.agent';
import { SelfHealingAgent } from './agents/self-healing.agent';

/**
 * Factory function that creates all 13 Meta Intelligence Cluster capability agents.
 * Called once during module initialization.
 */
function createMetaIntelligenceAgents() {
  return [
    new OrchestrationAgent(),
    new LearningAgent(),
    new ReasoningAgent(),
    new MemoryAgent(),
    new PerceptionAgent(),
    new CreativityAgent(),
    new EvaluationAgent(),
    new OptimizationAgent(),
    new CollaborationAgent(),
    new AdaptationAgent(),
    new MetaCognitionAgent(),
    new KnowledgeAgent(),
    new SelfHealingAgent(),
  ];
}

@Module({})
export class MetaIntelligenceClusterModule implements OnModuleInit {
  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * On module initialization, register all 13 meta-intelligence cluster
   * capability agents into the centralized AgentRegistryService.
   */
  onModuleInit() {
    const agents = createMetaIntelligenceAgents();
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
