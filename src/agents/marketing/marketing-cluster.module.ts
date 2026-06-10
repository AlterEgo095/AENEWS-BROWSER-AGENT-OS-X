/**
 * AENEWS Agent OS X - Marketing Cluster Module
 * Aggregates all 8 marketing agents into a single NestJS module.
 * Imports the BaseAgentModule for shared infrastructure (event bus, memory).
 * Provides all marketing agent services for dependency injection.
 */

import { Module } from '@nestjs/common';
import { BaseAgentModule } from '../base/base-agent.module';
import { ContentCreationAgentService } from './content-creation/content-creation-agent.service';
import { SEOOptimizationAgentService } from './seo/seo-agent.service';
import { SocialMediaAgentService } from './social-media/social-media-agent.service';
import { EmailMarketingAgentService } from './email-marketing/email-marketing-agent.service';
import { AnalyticsAgentService } from './analytics/analytics-agent.service';
import { BrandAgentService } from './brand/brand-agent.service';
import { InfluencerAgentService } from './influencer/influencer-agent.service';
import { AdCampaignAgentService } from './ad-campaign/ad-campaign-agent.service';

@Module({
  imports: [BaseAgentModule],
  providers: [
    // 1. Content Creation — blog posts, ad copy, social posts, headlines, slogans, content rewriting
    ContentCreationAgentService,
    // 2. SEO Optimization — SEO analysis, keyword research, content optimization, meta tags, competitor analysis, technical SEO audit
    SEOOptimizationAgentService,
    // 3. Social Media — post creation, scheduling, engagement analysis, analytics, hashtag management, trending topics
    SocialMediaAgentService,
    // 4. Email Marketing — campaign creation, sending, templates, A/B testing, results analysis, subscriber management
    EmailMarketingAgentService,
    // 5. Analytics — report generation, conversion tracking, funnel analysis, ROI calculation, period comparison, data export
    AnalyticsAgentService,
    // 6. Brand — consistency checking, asset management, brand guide generation, sentiment analysis, brand voice updates
    BrandAgentService,
    // 7. Influencer — influencer discovery, analysis, outreach, collaboration management, campaign ROI tracking
    InfluencerAgentService,
    // 8. Ad Campaign — campaign creation, budget, targeting, launching, optimization, performance reporting
    AdCampaignAgentService,
  ],
  exports: [
    ContentCreationAgentService,
    SEOOptimizationAgentService,
    SocialMediaAgentService,
    EmailMarketingAgentService,
    AnalyticsAgentService,
    BrandAgentService,
    InfluencerAgentService,
    AdCampaignAgentService,
  ],
})
export class MarketingClusterModule {}
