import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
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
import { BaseAgent } from '../../modules/agent/agent.abstract';

function createCertificationAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
) {
  const agents: BaseAgent[] = [
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
  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
  }
  return agents;
}

@Module({})
export class CertificationClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
  ) {}

  onModuleInit() {
    const agents = createCertificationAgents(this.llmService, this.bridgeService, this.eventBus);
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
