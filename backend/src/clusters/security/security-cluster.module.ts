import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { ThreatDetectionAgent } from './agents/threat-detection.agent';
import { VulnerabilityAgent } from './agents/vulnerability.agent';
import { ComplianceAgent } from './agents/compliance.agent';
import { EncryptionAgent } from './agents/encryption.agent';
import { AccessControlAgent } from './agents/access-control.agent';
import { ForensicsAgent } from './agents/forensics.agent';

/**
 * Factory function that creates all 6 Security Cluster agent instances.
 * Called once during module initialization.
 */
function createSecurityAgents() {
  return [
    new ThreatDetectionAgent(),
    new VulnerabilityAgent(),
    new ComplianceAgent(),
    new EncryptionAgent(),
    new AccessControlAgent(),
    new ForensicsAgent(),
  ];
}

@Module({})
export class SecurityClusterModule implements OnModuleInit {
  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * On module initialization, register all 6 security cluster agents
   * into the centralized AgentRegistryService.
   */
  onModuleInit() {
    const agents = createSecurityAgents();
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
