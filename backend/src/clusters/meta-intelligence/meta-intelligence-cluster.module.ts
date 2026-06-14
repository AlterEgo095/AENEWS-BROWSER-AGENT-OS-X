import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { AgentCollaborationService } from '../../modules/agent-framework/services/agent-collaboration.service';
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
import { BaseAgent } from '../../modules/agent/agent.abstract';

function createMetaIntelligenceAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
  collaborationService?: AgentCollaborationService,
) {
  const agents: BaseAgent[] = [
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
  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
    // Phase 8: Inject collaboration service for meta-intelligence agents
    if (collaborationService && 'setCollaborationService' in agent) {
      (agent as any).setCollaborationService(collaborationService);
    }
  }
  return agents;
}

@Module({})
export class MetaIntelligenceClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
    private readonly collaborationService: AgentCollaborationService,
  ) {}

  onModuleInit() {
    const agents = createMetaIntelligenceAgents(
      this.llmService,
      this.bridgeService,
      this.eventBus,
      this.collaborationService,
    );
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
