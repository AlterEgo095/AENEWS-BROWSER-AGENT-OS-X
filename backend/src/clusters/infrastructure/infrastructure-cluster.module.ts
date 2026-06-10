import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { CloudAgent } from './agents/cloud.agent';
import { ContainerAgent } from './agents/container.agent';
import { CIAgent } from './agents/ci.agent';
import { MonitoringInfraAgent } from './agents/monitoring-infra.agent';
import { ScalingAgent } from './agents/scaling.agent';
import { BackupInfraAgent } from './agents/backup-infra.agent';
import { NetworkInfraAgent } from './agents/network-infra.agent';
import { SecurityInfraAgent } from './agents/security-infra.agent';

/**
 * Factory function that creates all 8 Infrastructure Cluster agent instances.
 * Called once during module initialization.
 */
function createInfrastructureAgents() {
  return [
    new CloudAgent(),
    new ContainerAgent(),
    new CIAgent(),
    new MonitoringInfraAgent(),
    new ScalingAgent(),
    new BackupInfraAgent(),
    new NetworkInfraAgent(),
    new SecurityInfraAgent(),
  ];
}

@Module({})
export class InfrastructureClusterModule implements OnModuleInit {
  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * On module initialization, register all 8 infrastructure cluster agents
   * into the centralized AgentRegistryService.
   */
  onModuleInit() {
    const agents = createInfrastructureAgents();
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
