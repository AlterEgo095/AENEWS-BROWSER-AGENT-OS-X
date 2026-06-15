import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { CodeGenerationAgent } from './agents/code-generation.agent';
import { CodeReviewAgent } from './agents/code-review.agent';
import { TestingCodeAgent } from './agents/testing-code.agent';
import { DocumentationAgent } from './agents/documentation.agent';
import { DeploymentAgent } from './agents/deployment.agent';
import { VersionControlAgent } from './agents/version-control.agent';
import { DependencyAgent } from './agents/dependency.agent';
import { DebuggingAgent } from './agents/debugging.agent';
import { AICodeArchitectAgent } from './agents/ai-code-architect.agent';
import { BaseAgent } from '../../modules/agent/agent.abstract';

/**
 * Factory function that creates all 9 Coding Cluster agent instances
 * and injects LLM/Bridge/EventBus services.
 */
function createCodingAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
) {
  const agents: BaseAgent[] = [
    new CodeGenerationAgent(),
    new CodeReviewAgent(),
    new TestingCodeAgent(),
    new DocumentationAgent(),
    new DeploymentAgent(),
    new VersionControlAgent(),
    new DependencyAgent(),
    new DebuggingAgent(),
    new AICodeArchitectAgent(),
  ];

  // Inject services into all agents
  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
  }

  return agents;
}

@Module({})
export class CodingClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
  ) {}

  /**
   * On module initialization, register all 9 coding cluster agents
   * into the centralized AgentRegistryService with injected services.
   */
  onModuleInit() {
    const agents = createCodingAgents(
      this.llmService,
      this.bridgeService,
      this.eventBus,
    );
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
