import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { ArchitectureAuditorAgent } from './agents/architecture-auditor.agent';
import { SecurityAuditorAgent } from './agents/security-auditor.agent';
import { PerformanceAuditorAgent } from './agents/performance-auditor.agent';
import { MemoryAuditorAgent } from './agents/memory-auditor.agent';
import { PluginAuditorAgent } from './agents/plugin-auditor.agent';
import { BrowserAuditorAgent } from './agents/browser-auditor.agent';
import { OrchestratorAuditorAgent } from './agents/orchestrator-auditor.agent';
import { DocumentationAuditorAgent } from './agents/documentation-auditor.agent';
import { TestAuditorAgent } from './agents/test-auditor.agent';
import { RegressionAuditorAgent } from './agents/regression-auditor.agent';
import { ComplianceAuditorAgent } from './agents/compliance-auditor.agent';
import { ObservabilityAuditorAgent } from './agents/observability-auditor.agent';
import { AIQualityAuditorAgent } from './agents/ai-quality-auditor.agent';

/**
 * Factory function that creates all 13 Certification Cluster agent instances.
 * Called once during module initialization.
 */
function createCertificationAgents() {
  return [
    new ArchitectureAuditorAgent(),
    new SecurityAuditorAgent(),
    new PerformanceAuditorAgent(),
    new MemoryAuditorAgent(),
    new PluginAuditorAgent(),
    new BrowserAuditorAgent(),
    new OrchestratorAuditorAgent(),
    new DocumentationAuditorAgent(),
    new TestAuditorAgent(),
    new RegressionAuditorAgent(),
    new ComplianceAuditorAgent(),
    new ObservabilityAuditorAgent(),
    new AIQualityAuditorAgent(),
  ];
}

@Module({})
export class CertificationClusterModule implements OnModuleInit {
  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * On module initialization, register all 13 certification cluster agents
   * into the centralized AgentRegistryService.
   */
  onModuleInit() {
    const agents = createCertificationAgents();
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
