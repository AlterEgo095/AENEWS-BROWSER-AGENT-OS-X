import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { SandboxService } from '../../modules/agent-framework/services/sandbox.service';
import { MetricAnalyzerAgent } from './agents/metric-analyzer.agent';
import { WeaknessDetectorAgent } from './agents/weakness-detector.agent';
import { RefactorProposerAgent } from './agents/refactor-proposer.agent';
import { PatchGeneratorAgent } from './agents/patch-generator.agent';
import { AutoCertifierAgent } from './agents/auto-certifier.agent';
import { BaseAgent } from '../../modules/agent/agent.abstract';

/**
 * Factory function that creates all 5 Self-Evolution Cluster agent instances
 * and injects LLM/Bridge/EventBus/Sandbox services.
 */
function createSelfEvolutionAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
  sandboxService?: SandboxService,
) {
  const agents: BaseAgent[] = [
    new MetricAnalyzerAgent(),
    new WeaknessDetectorAgent(),
    new RefactorProposerAgent(),
    new PatchGeneratorAgent(),
    new AutoCertifierAgent(),
  ];

  // Inject core services into all agents
  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
  }

  // Inject SandboxService into agents that support it
  if (sandboxService) {
    for (const agent of agents) {
      if ('setSandboxService' in agent && typeof (agent as any).setSandboxService === 'function') {
        (agent as any).setSandboxService(sandboxService);
      }
    }
  }

  return agents;
}

/**
 * SelfEvolutionClusterModule
 *
 * NestJS module that registers all self-evolution cluster agents into the
 * centralized AgentRegistryService on initialization. The self-evolution loop
 * continuously monitors, detects, proposes, patches, and certifies changes
 * to ensure the system only evolves when the Evolution Quality Index (EQI)
 * demonstrably increases.
 *
 * ## Safety Integration
 *
 * All self-evolution agents are decorated with @RequiresHumanApproval()
 * and integrated with the SandboxService for safe execution. The
 * HumanApprovalGuard and SandboxService are provided by the global
 * AgentFrameworkModule.
 */
@Module({})
export class SelfEvolutionClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
    private readonly sandboxService: SandboxService,
  ) {}

  /**
   * On module initialization, register all 5 self-evolution cluster agents
   * into the centralized AgentRegistryService with injected services.
   */
  onModuleInit() {
    const agents = createSelfEvolutionAgents(
      this.llmService,
      this.bridgeService,
      this.eventBus,
      this.sandboxService,
    );
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
