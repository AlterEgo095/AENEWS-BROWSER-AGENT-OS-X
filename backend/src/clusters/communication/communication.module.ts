import { Global, Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { APIGatewayAgent } from './agents/api-gateway.agent';
import { WebhookAgent } from './agents/webhook.agent';
import { NotificationAgent } from './agents/notification.agent';
import { WebSocketAgent } from './agents/websocket.agent';
import { BaseAgent } from '../../modules/agent/agent.abstract';

function createCommunicationAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
) {
  const agents: BaseAgent[] = [
    new APIGatewayAgent(),
    new WebhookAgent(),
    new NotificationAgent(),
    new WebSocketAgent(),
  ];

  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
  }

  return agents;
}

@Global()
@Module({})
export class CommunicationModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
  ) {}

  onModuleInit() {
    const agents = createCommunicationAgents(
      this.llmService,
      this.bridgeService,
      this.eventBus,
    );
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
