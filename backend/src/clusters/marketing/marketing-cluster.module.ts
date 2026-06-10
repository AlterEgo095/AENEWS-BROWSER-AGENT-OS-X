import { Module, OnModuleInit } from '@nestjs/common';
import { AgentRegistryService } from '../../modules/agent/registry/agent-registry.service';
import { ContentCreationAgent } from './agents/content-creation.agent';
import { SEOAgent } from './agents/seo.agent';
import { SocialMediaAgent } from './agents/social-media.agent';
import { EmailMarketingAgent } from './agents/email-marketing.agent';
import { AnalyticsAgent } from './agents/analytics.agent';
import { AdsAgent } from './agents/ads.agent';
import { BrandingAgent } from './agents/branding.agent';
import { InfluencerAgent } from './agents/influencer.agent';

/**
 * Factory function that creates all 8 Marketing Cluster agent instances.
 * Called once during module initialization.
 */
function createMarketingAgents() {
  return [
    new ContentCreationAgent(),
    new SEOAgent(),
    new SocialMediaAgent(),
    new EmailMarketingAgent(),
    new AnalyticsAgent(),
    new AdsAgent(),
    new BrandingAgent(),
    new InfluencerAgent(),
  ];
}

@Module({})
export class MarketingClusterModule implements OnModuleInit {
  constructor(private readonly registry: AgentRegistryService) {}

  /**
   * On module initialization, register all 8 marketing cluster agents
   * into the centralized AgentRegistryService.
   */
  onModuleInit() {
    const agents = createMarketingAgents();
    for (const agent of agents) {
      this.registry.register(agent);
    }
  }
}
