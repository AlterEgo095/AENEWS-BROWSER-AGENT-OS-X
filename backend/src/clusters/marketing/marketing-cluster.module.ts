import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { ConnectorAwareExecutionService } from '../../modules/agent-framework/services/connector-aware-execution.service';
import { ContentCreationAgent } from './agents/content-creation.agent';
import { SEOAgent } from './agents/seo.agent';
import { SocialMediaAgent } from './agents/social-media.agent';
import { EmailMarketingAgent } from './agents/email-marketing.agent';
import { AnalyticsAgent } from './agents/analytics.agent';
import { AdsAgent } from './agents/ads.agent';
import { BrandingAgent } from './agents/branding.agent';
import { InfluencerAgent } from './agents/influencer.agent';
import { BaseAgent } from '../../modules/agent/agent.abstract';

function createMarketingAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
  connectorExecution?: ConnectorAwareExecutionService,
) {
  const agents: BaseAgent[] = [
    new ContentCreationAgent(),
    new SEOAgent(),
    new SocialMediaAgent(),
    new EmailMarketingAgent(),
    new AnalyticsAgent(),
    new AdsAgent(),
    new BrandingAgent(),
    new InfluencerAgent(),
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
export class MarketingClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
    private readonly connectorExecution: ConnectorAwareExecutionService,
  ) {}

  onModuleInit() {
    const agents = createMarketingAgents(
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
