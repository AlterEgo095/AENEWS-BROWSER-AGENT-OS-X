import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { FileSystemAgent } from './agents/file-system.agent';
import { ProcessAgent } from './agents/process.agent';
import { TerminalAgent } from './agents/terminal.agent';
import { NetworkAgent } from './agents/network.agent';
import { BackupAgent } from './agents/backup.agent';
import { SystemInfoAgent } from './agents/system-info.agent';
import { SoftwareAgent } from './agents/software.agent';

/**
 * Factory function that creates all 7 Computer Cluster agent instances.
 * Called once during module initialization.
 */
function createComputerAgents() {
  return [
    new FileSystemAgent(),
    new ProcessAgent(),
    new TerminalAgent(),
    new NetworkAgent(),
    new BackupAgent(),
    new SystemInfoAgent(),
    new SoftwareAgent(),
  ];
}

@Module({})
export class ComputerClusterModule implements OnModuleInit {
  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * On module initialization, register all 7 computer cluster agents
   * into the centralized AgentRegistryService.
   */
  onModuleInit() {
    const agents = createComputerAgents();
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
