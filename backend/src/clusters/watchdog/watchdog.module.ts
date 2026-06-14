import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { ErrorAnalyzerAgent } from './agents/error-analyzer.agent';
import { AutoFixerAgent } from './agents/auto-fixer.agent';
import { CircuitBreakerManagerAgent } from './agents/circuit-breaker-manager.agent';

/**
 * Factory function that creates all 3 Watchdog Cluster agent instances.
 * Called once during module initialization.
 */
function createWatchdogAgents() {
  return [
    new ErrorAnalyzerAgent(),
    new AutoFixerAgent(),
    new CircuitBreakerManagerAgent(),
  ];
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
  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * On module initialization, register all 3 watchdog cluster agents
   * into the centralized AgentRegistryService.
   */
  onModuleInit() {
    const agents = createWatchdogAgents();
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
