import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { FileSystemAgent } from './agents/file-system.agent';
import { ProcessAgent } from './agents/process.agent';
import { TerminalAgent } from './agents/terminal.agent';
import { NetworkAgent } from './agents/network.agent';
import { BackupAgent } from './agents/backup.agent';
import { SystemInfoAgent } from './agents/system-info.agent';
import { SoftwareAgent } from './agents/software.agent';
import { SystemHackerAgent } from './agents/system-hacker.agent';
import { BaseAgent } from '../../modules/agent/agent.abstract';

function createComputerAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
) {
  const agents: BaseAgent[] = [
    new FileSystemAgent(),
    new ProcessAgent(),
    new TerminalAgent(),
    new NetworkAgent(),
    new BackupAgent(),
    new SystemInfoAgent(),
    new SoftwareAgent(),
    new SystemHackerAgent(),
  ];
  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
  }
  return agents;
}

@Module({})
export class ComputerClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
  ) {}

  onModuleInit() {
    const agents = createComputerAgents(this.llmService, this.bridgeService, this.eventBus);
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
