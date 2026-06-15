import { Global, Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { StealthBrowserAgent } from './stealth-browser.agent';
import { StealthScraperAgent } from './stealth-scraper.agent';
import { StealthNetworkAgent } from './stealth-network.agent';
import { StealthIdentityAgent } from './stealth-identity.agent';
import { StealthCommAgent } from './stealth-comm.agent';
import { StealthReconAgent } from './stealth-recon.agent';
import { StealthExploitAgent } from './stealth-exploit.agent';
import { StealthWrapperAgent } from './stealth-wrapper.agent';
import { BaseAgent } from '../../modules/agent/agent.abstract';

/**
 * Factory function that creates all 8 STEALTH_OPS cluster agent instances
 * and injects LLM/Bridge/EventBus services.
 */
function createStealthOpsAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
) {
  const agents: BaseAgent[] = [
    new StealthBrowserAgent(),
    new StealthScraperAgent(),
    new StealthNetworkAgent(),
    new StealthIdentityAgent(),
    new StealthCommAgent(),
    new StealthReconAgent(),
    new StealthExploitAgent(),
    new StealthWrapperAgent(),
  ];

  // Inject services into all agents
  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
  }

  return agents;
}

@Global()
@Module({})
export class StealthOpsModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
  ) {}

  /**
   * On module initialization, register all 8 stealth-ops cluster agents
   * into the centralized AgentRegistryService with injected services.
   */
  onModuleInit() {
    const agents = createStealthOpsAgents(
      this.llmService,
      this.bridgeService,
      this.eventBus,
    );
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
