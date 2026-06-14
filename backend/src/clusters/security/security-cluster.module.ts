import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { ThreatDetectionAgent } from './agents/threat-detection.agent';
import { VulnerabilityAgent } from './agents/vulnerability.agent';
import { ComplianceAgent } from './agents/compliance.agent';
import { EncryptionAgent } from './agents/encryption.agent';
import { AccessControlAgent } from './agents/access-control.agent';
import { ForensicsAgent } from './agents/forensics.agent';
import { BaseAgent } from '../../modules/agent/agent.abstract';

function createSecurityAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
) {
  const agents: BaseAgent[] = [
    new ThreatDetectionAgent(),
    new VulnerabilityAgent(),
    new ComplianceAgent(),
    new EncryptionAgent(),
    new AccessControlAgent(),
    new ForensicsAgent(),
  ];
  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
  }
  return agents;
}

@Module({})
export class SecurityClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
  ) {}

  onModuleInit() {
    const agents = createSecurityAgents(this.llmService, this.bridgeService, this.eventBus);
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
