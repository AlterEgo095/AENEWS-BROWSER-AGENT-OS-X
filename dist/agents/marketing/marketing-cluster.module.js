"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingClusterModule = void 0;
const common_1 = require("@nestjs/common");
const base_agent_module_1 = require("../base/base-agent.module");
const content_creation_agent_service_1 = require("./content-creation/content-creation-agent.service");
const seo_agent_service_1 = require("./seo/seo-agent.service");
const social_media_agent_service_1 = require("./social-media/social-media-agent.service");
const email_marketing_agent_service_1 = require("./email-marketing/email-marketing-agent.service");
const analytics_agent_service_1 = require("./analytics/analytics-agent.service");
const brand_agent_service_1 = require("./brand/brand-agent.service");
const influencer_agent_service_1 = require("./influencer/influencer-agent.service");
const ad_campaign_agent_service_1 = require("./ad-campaign/ad-campaign-agent.service");
let MarketingClusterModule = class MarketingClusterModule {
};
exports.MarketingClusterModule = MarketingClusterModule;
exports.MarketingClusterModule = MarketingClusterModule = __decorate([
    (0, common_1.Module)({
        imports: [base_agent_module_1.BaseAgentModule],
        providers: [
            content_creation_agent_service_1.ContentCreationAgentService,
            seo_agent_service_1.SEOOptimizationAgentService,
            social_media_agent_service_1.SocialMediaAgentService,
            email_marketing_agent_service_1.EmailMarketingAgentService,
            analytics_agent_service_1.AnalyticsAgentService,
            brand_agent_service_1.BrandAgentService,
            influencer_agent_service_1.InfluencerAgentService,
            ad_campaign_agent_service_1.AdCampaignAgentService,
        ],
        exports: [
            content_creation_agent_service_1.ContentCreationAgentService,
            seo_agent_service_1.SEOOptimizationAgentService,
            social_media_agent_service_1.SocialMediaAgentService,
            email_marketing_agent_service_1.EmailMarketingAgentService,
            analytics_agent_service_1.AnalyticsAgentService,
            brand_agent_service_1.BrandAgentService,
            influencer_agent_service_1.InfluencerAgentService,
            ad_campaign_agent_service_1.AdCampaignAgentService,
        ],
    })
], MarketingClusterModule);
//# sourceMappingURL=marketing-cluster.module.js.map