import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { CloudAgent } from './agents/cloud.agent';
import { ContainerAgent } from './agents/container.agent';
import { CIAgent } from './agents/ci.agent';
import { MonitoringInfraAgent } from './agents/monitoring-infra.agent';
import { ScalingAgent } from './agents/scaling.agent';
import { BackupInfraAgent } from './agents/backup-infra.agent';
import { NetworkInfraAgent } from './agents/network-infra.agent';
import { SecurityInfraAgent } from './agents/security-infra.agent';
import { BaseAgent } from '../../modules/agent/agent.abstract';

function createInfrastructureAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
) {
  const agents: BaseAgent[] = [
    new CloudAgent(),
    new ContainerAgent(),
    new CIAgent(),
    new MonitoringInfraAgent(),
    new ScalingAgent(),
    new BackupInfraAgent(),
    new NetworkInfraAgent(),
    new SecurityInfraAgent(),
  ];
  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
  }
  return agents;
}

@Module({})
export class InfrastructureClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
  ) {}

  onModuleInit() {
    const agents = createInfrastructureAgents(this.llmService, this.bridgeService, this.eventBus);
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
