import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { DocumentAgent } from './agents/document.agent';
import { EmailAgent } from './agents/email.agent';
import { CalendarAgent } from './agents/calendar.agent';
import { SpreadsheetAgent } from './agents/spreadsheet.agent';
import { PresentationAgent } from './agents/presentation.agent';
import { TaskManagerAgent } from './agents/task-manager.agent';

/**
 * Factory function that creates all 6 Office Cluster agent instances.
 * Called once during module initialization.
 */
function createOfficeAgents() {
  return [
    new DocumentAgent(),
    new EmailAgent(),
    new CalendarAgent(),
    new SpreadsheetAgent(),
    new PresentationAgent(),
    new TaskManagerAgent(),
  ];
}

@Module({})
export class OfficeClusterModule implements OnModuleInit {
  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * On module initialization, register all 6 office cluster agents
   * into the centralized AgentRegistryService.
   */
  onModuleInit() {
    const agents = createOfficeAgents();
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
