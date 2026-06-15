import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { LLMService } from '../../modules/llm/llm.service';
import { AgentBridgeService } from '../../modules/agent-framework/services/agent-bridge.service';
import { AgentEventBusService } from '../../modules/agent-framework/services/agent-event-bus.service';
import { NavigationAgent } from './agents/navigation.agent';
import { ScrapingAgent } from './agents/scraping.agent';
import { FormFillingAgent } from './agents/form-filling.agent';
import { ScreenshotAgent } from './agents/screenshot.agent';
import { AuthenticationAgent } from './agents/authentication.agent';
import { SearchAgent } from './agents/search.agent';
import { MonitoringAgent } from './agents/monitoring.agent';
import { CrawlerAgent } from './agents/crawler.agent';
import { TestingAgent } from './agents/testing.agent';
import { DownloadAgent } from './agents/download.agent';
import { UploadAgent } from './agents/upload.agent';
import { InteractionAgent } from './agents/interaction.agent';
import { ProxyAgent } from './agents/proxy.agent';
import { CaptchaAgent } from './agents/captcha.agent';
import { SessionAgent } from './agents/session.agent';
import { HeadlessAgent } from './agents/headless.agent';
import { AutomationAgent } from './agents/automation.agent';
import { DeepWebAgent } from './agents/deep-web.agent';
import { BaseAgent } from '../../modules/agent/agent.abstract';

/**
 * Factory function that creates all 18 Browser Cluster agent instances
 * and injects LLM/Bridge/EventBus services.
 */
function createBrowserAgents(
  llmService?: LLMService,
  bridgeService?: AgentBridgeService,
  eventBus?: AgentEventBusService,
) {
  const agents: BaseAgent[] = [
    new NavigationAgent(),
    new ScrapingAgent(),
    new FormFillingAgent(),
    new ScreenshotAgent(),
    new AuthenticationAgent(),
    new SearchAgent(),
    new MonitoringAgent(),
    new CrawlerAgent(),
    new TestingAgent(),
    new DownloadAgent(),
    new UploadAgent(),
    new InteractionAgent(),
    new ProxyAgent(),
    new CaptchaAgent(),
    new SessionAgent(),
    new HeadlessAgent(),
    new AutomationAgent(),
    new DeepWebAgent(),
  ];

  // Inject services into all agents
  for (const agent of agents) {
    agent.setServices({ llmService, bridgeService, eventBus });
  }

  return agents;
}

@Module({})
export class BrowserClusterModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly llmService: LLMService,
    private readonly bridgeService: AgentBridgeService,
    private readonly eventBus: AgentEventBusService,
  ) {}

  /**
   * On module initialization, register all 18 browser cluster agents
   * into the centralized AgentRegistryService with injected services.
   */
  onModuleInit() {
    const agents = createBrowserAgents(
      this.llmService,
      this.bridgeService,
      this.eventBus,
    );
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
