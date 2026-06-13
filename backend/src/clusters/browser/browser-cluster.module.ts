import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
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

/**
 * Factory function that creates all 17 Browser Cluster agent instances.
 * Called once during module initialization.
 */
function createBrowserAgents() {
  return [
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
  ];
}

@Module({})
export class BrowserClusterModule implements OnModuleInit {
  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * On module initialization, register all 17 browser cluster agents
   * into the centralized AgentRegistryService.
   */
  onModuleInit() {
    const agents = createBrowserAgents();
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
