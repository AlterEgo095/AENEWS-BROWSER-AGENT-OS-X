import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { ErrorAnalyzerAgent } from './agents/error-analyzer.agent';
import { AutoFixerAgent } from './agents/auto-fixer.agent';
import { CircuitBreakerManagerAgent } from './agents/circuit-breaker-manager.agent';
import { BaseAgent } from '../../modules/agent/agent.abstract';

/**
 * Factory function that creates all 3 Watchdog Cluster agent instances
 * and injects LLM/Bridge/EventBus services.
 */
function createWatchdogAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
) {
  const agents: BaseAgent[] = [
    new ErrorAnalyzerAgent(),
    new AutoFixerAgent(),
    new CircuitBreakerManagerAgent(),
  ];

  // Inject services into all agents
  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
  }

  return agents;
}

/**
 * WatchdogClusterModule — Self-Healing Cluster
 *
 * Registers the Watchdog cluster agents into the centralized AgentRegistryService
 * on module initialization. The Watchdog cluster is responsible for error analysis,
 * automated remediation, and circuit breaker management across the AENEWS Agent OS X
 * platform.
 *
 * Agents:
 * - ErrorAnalyzerAgent         → Analyzes, classifies, and traces errors; suggests remediation
 * - AutoFixerAgent             → Applies automated fixes: retry, reassign, fallback, escalation
 * - CircuitBreakerManagerAgent → Manages circuit breaker states and coordinates recovery
 */
@Module({})
export class WatchdogClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
  ) {}

  /**
   * On module initialization, register all 3 watchdog cluster agents
   * into the centralized AgentRegistryService with injected services.
   */
  onModuleInit() {
    const agents = createWatchdogAgents(
      this.llmService,
      this.bridgeService,
      this.eventBus,
    );
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
