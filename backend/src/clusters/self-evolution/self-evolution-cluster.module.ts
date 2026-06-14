import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { MetricAnalyzerAgent } from './agents/metric-analyzer.agent';
import { WeaknessDetectorAgent } from './agents/weakness-detector.agent';
import { RefactorProposerAgent } from './agents/refactor-proposer.agent';
import { PatchGeneratorAgent } from './agents/patch-generator.agent';
import { AutoCertifierAgent } from './agents/auto-certifier.agent';

/**
 * Factory function that creates all 5 Self-Evolution Cluster agent instances.
 * Called once during module initialization.
 *
 * Agent lifecycle within the Self-Evolution loop:
 *   1. MetricAnalyzerAgent    → detect anomalies & collect baselines
 *   2. WeaknessDetectorAgent  → identify & prioritise weaknesses
 *   3. RefactorProposerAgent  → propose refactoring strategies & plans
 *   4. PatchGeneratorAgent    → generate, validate & test code patches
 *   5. AutoCertifierAgent     → certify patches & guard merge on EQI↑
 */
function createSelfEvolutionAgents() {
  return [
    new MetricAnalyzerAgent(),
    new WeaknessDetectorAgent(),
    new RefactorProposerAgent(),
    new PatchGeneratorAgent(),
    new AutoCertifierAgent(),
  ];
}

/**
 * SelfEvolutionClusterModule
 *
 * NestJS module that registers all self-evolution cluster agents into the
 * centralized AgentRegistryService on initialization. The self-evolution loop
 * continuously monitors, detects, proposes, patches, and certifies changes
 * to ensure the system only evolves when the Evolution Quality Index (EQI)
 * demonstrably increases.
 */
@Module({})
export class SelfEvolutionClusterModule implements OnModuleInit {
  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * On module initialization, register all 5 self-evolution cluster agents
   * into the centralized AgentRegistryService.
   */
  onModuleInit() {
    const agents = createSelfEvolutionAgents();
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
