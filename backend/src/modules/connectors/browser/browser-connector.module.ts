/**
 * AENEWS Agent OS X — Browser Connector Module
 *
 * NestJS module that provides real Playwright-based browser automation.
 *
 * Provides:
 *   - BrowserPoolService: Manages a pool of browser instances
 *   - RealBrowserConnectorService: Full browser automation via Playwright
 *
 * On module init:
 *   - Registers the real browser connector with AgentBridgeService
 *     (replaces the simulation connector)
 *
 * On module destroy:
 *   - Closes all browser instances via BrowserPoolService
 *
 * Configuration via environment variables:
 *   BROWSER_ENABLED, BROWSER_HEADLESS, BROWSER_MAX_INSTANCES,
 *   BROWSER_DEFAULT_TIMEOUT, BROWSER_VIEWPORT_WIDTH, BROWSER_VIEWPORT_HEIGHT,
 *   BROWSER_USER_AGENT, BROWSER_PROXY_URL, BROWSER_CHROMIUM_PATH
 */

import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrowserPoolService } from './browser-pool.service';
import { RealBrowserConnectorService } from './real-browser-connector.service';
import { AgentBridgeService } from '../../agent-framework/services/agent-bridge.service';
import { AgentFrameworkModule } from '../../agent-framework/agent-framework.module';

@Module({
  imports: [AgentFrameworkModule],
  providers: [BrowserPoolService, RealBrowserConnectorService],
  exports: [BrowserPoolService, RealBrowserConnectorService],
})
export class BrowserConnectorModule implements OnModuleInit {
  private readonly logger = new Logger(BrowserConnectorModule.name);

  constructor(
    private readonly realBrowserConnector: RealBrowserConnectorService,
    private readonly agentBridge: AgentBridgeService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const browserEnabled =
      this.configService.get<string>('BROWSER_ENABLED') !== 'false';

    // Register the real browser connector with the AgentBridgeService,
    // replacing the simulation connector
    const mode = browserEnabled ? 'real' : 'simulation';

    this.agentBridge.registerConnector('browser', {
      name: 'browser',
      description: browserEnabled
        ? 'Real browser automation via Playwright — navigate, scrape, interact with web pages'
        : 'Browser automation (simulation mode — Playwright not available)',
      actions: this.realBrowserConnector.getSupportedActions(),
      execute: async (action: string, params: Record<string, any>) => {
        return this.realBrowserConnector.executeAction(action, params);
      },
    }, mode as 'simulation' | 'real');

    this.logger.log(
      `Browser connector registered with AgentBridge ` +
        `(mode: ${mode}, actions: ${this.realBrowserConnector.getSupportedActions().length})`,
    );
  }
}
