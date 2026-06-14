import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { ConnectorAwareExecutionService } from '../../modules/agent-framework/services/connector-aware-execution.service';
import { DocumentAgent } from './agents/document.agent';
import { EmailAgent } from './agents/email.agent';
import { CalendarAgent } from './agents/calendar.agent';
import { SpreadsheetAgent } from './agents/spreadsheet.agent';
import { PresentationAgent } from './agents/presentation.agent';
import { TaskManagerAgent } from './agents/task-manager.agent';
import { BaseAgent } from '../../modules/agent/agent.abstract';

function createOfficeAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
  connectorExecution?: ConnectorAwareExecutionService,
) {
  const agents: BaseAgent[] = [
    new DocumentAgent(),
    new EmailAgent(),
    new CalendarAgent(),
    new SpreadsheetAgent(),
    new PresentationAgent(),
    new TaskManagerAgent(),
  ];
  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
    // Phase 8: Inject connector-aware execution for real connector access
    if (connectorExecution && 'setConnectorExecution' in agent) {
      (agent as any).setConnectorExecution(connectorExecution);
    }
  }
  return agents;
}

@Module({})
export class OfficeClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
    private readonly connectorExecution: ConnectorAwareExecutionService,
  ) {}

  onModuleInit() {
    const agents = createOfficeAgents(
      this.llmService,
      this.bridgeService,
      this.eventBus,
      this.connectorExecution,
    );
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
