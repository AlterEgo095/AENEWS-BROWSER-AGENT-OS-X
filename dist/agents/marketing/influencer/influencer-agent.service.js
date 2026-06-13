"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfluencerAgentService = exports.INFLUENCER_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.INFLUENCER_AGENT_CONFIG = {
    id: 'marketing-influencer',
    name: 'Influencer',
    cluster: agent_interface_1.AgentCluster.MARKETING,
    version: '1.0.0',
    description: 'Influencer marketing agent that handles influencer discovery, analysis, outreach, collaboration management, and campaign ROI tracking.',
    capabilities: [
        {
            name: 'findInfluencers',
            description: 'Find influencers matching specific criteria',
            inputSchema: {
                type: 'object',
                properties: {
                    niche: { type: 'string', description: 'Industry or niche' },
                    platform: { type: 'string', description: 'Social media platform' },
                    minFollowers: { type: 'number', description: 'Minimum follower count' },
                    maxFollowers: { type: 'number', description: 'Maximum follower count' },
                    location: { type: 'string', description: 'Geographic location' },
                    engagementRate: { type: 'number', description: 'Minimum engagement rate' },
                    limit: { type: 'number', description: 'Maximum results to return' },
                },
                required: ['niche'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    influencers: { type: 'array', items: { type: 'object' } },
                    totalFound: { type: 'number' },
                    searchCriteria: { type: 'object' },
                },
            },
        },
        {
            name: 'analyzeInfluencer',
            description: 'Analyze an influencer profile for authenticity, audience, and fit',
            inputSchema: {
                type: 'object',
                properties: {
                    influencerId: { type: 'string', description: 'Influencer ID or handle' },
                    platform: { type: 'string', description: 'Platform to analyze' },
                    analysisDepth: { type: 'string', enum: ['basic', 'standard', 'comprehensive'], description: 'Depth of analysis' },
                },
                required: ['influencerId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    influencerId: { type: 'string' },
                    score: { type: 'number' },
                    audience: { type: 'object' },
                    authenticity: { type: 'object' },
                    brandFit: { type: 'object' },
                },
            },
        },
        {
            name: 'createOutreach',
            description: 'Create and manage outreach campaigns to influencers',
            inputSchema: {
                type: 'object',
                properties: {
                    influencerIds: { type: 'array', items: { type: 'string' }, description: 'Influencer IDs to contact' },
                    campaignName: { type: 'string', description: 'Outreach campaign name' },
                    messageTemplate: { type: 'string', description: 'Outreach message template' },
                    offer: { type: 'object', description: 'Collaboration offer details' },
                    followUpSchedule: { type: 'string', description: 'Follow-up timing' },
                },
                required: ['influencerIds', 'campaignName'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    outreachId: { type: 'string' },
                    campaignName: { type: 'string' },
                    contacted: { type: 'number' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'manageCollaboration',
            description: 'Manage influencer collaborations and content deliverables',
            inputSchema: {
                type: 'object',
                properties: {
                    collaborationId: { type: 'string', description: 'Collaboration ID' },
                    action: { type: 'string', enum: ['create', 'update', 'deliverable', 'approve', 'complete'], description: 'Action to perform' },
                    data: { type: 'object', description: 'Action data' },
                },
                required: ['collaborationId', 'action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    collaborationId: { type: 'string' },
                    status: { type: 'string' },
                    deliverables: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'trackCampaignROI',
            description: 'Track and calculate ROI for influencer marketing campaigns',
            inputSchema: {
                type: 'object',
                properties: {
                    campaignId: { type: 'string', description: 'Campaign ID to track' },
                    dateFrom: { type: 'string', description: 'Start date (ISO string)' },
                    dateTo: { type: 'string', description: 'End date (ISO string)' },
                    metrics: { type: 'array', items: { type: 'string' }, description: 'Metrics to track' },
                },
                required: ['campaignId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    campaignId: { type: 'string' },
                    totalSpend: { type: 'number' },
                    totalValue: { type: 'number' },
                    roi: { type: 'number' },
                    byInfluencer: { type: 'object' },
                    recommendations: { type: 'array', items: { type: 'string' } },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:influencer',
        'write:influencer',
        'read:campaign',
        'write:campaign',
        'read:analytics',
    ],
    maxConcurrentTasks: 4,
    timeout: 60000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 2000,
        exponentialBackoff: true,
    },
};
let InfluencerAgentService = class InfluencerAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.influencers = new Map();
        this.outreachCampaigns = new Map();
        this.collaborations = new Map();
        this.influencerCounter = 0;
    }
    defineConfig() {
        return exports.INFLUENCER_AGENT_CONFIG;
    }
    async onInitialize() {
        this.seedInfluencerData();
        this.registerTool({
            name: 'findInfluencers',
            description: 'Find influencers matching specific criteria',
            execute: async (params) => this.findInfluencers(params),
        });
        this.registerTool({
            name: 'analyzeInfluencer',
            description: 'Analyze an influencer profile for authenticity, audience, and fit',
            execute: async (params) => this.analyzeInfluencer(params),
        });
        this.registerTool({
            name: 'createOutreach',
            description: 'Create and manage outreach campaigns to influencers',
            execute: async (params) => this.createOutreach(params),
        });
        this.registerTool({
            name: 'manageCollaboration',
            description: 'Manage influencer collaborations and content deliverables',
            execute: async (params) => this.manageCollaboration(params),
        });
        this.registerTool({
            name: 'trackCampaignROI',
            description: 'Track and calculate ROI for influencer marketing campaigns',
            execute: async (params) => this.trackCampaignROI(params),
        });
        await this.storeInWorkingMemory('influencer:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Influencer agent initialized with 5 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'findInfluencers',
            'analyzeInfluencer',
            'createOutreach',
            'manageCollaboration',
            'trackCampaignROI',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown influencer action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`influencer:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Influencer execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.influencers.clear();
        this.outreachCampaigns.clear();
        this.collaborations.clear();
        this.influencerCounter = 0;
        this.logger.log('Influencer agent destroyed, all data cleared');
    }
    async findInfluencers(params) {
        const { niche, platform = '', minFollowers = 0, maxFollowers = Infinity, location = '', engagementRate = 0, limit = 10, } = params;
        if (!niche || typeof niche !== 'string') {
            throw new Error('A valid niche is required');
        }
        let results = Array.from(this.influencers.values());
        const nicheLower = niche.toLowerCase();
        results = results.filter((inf) => inf.niche.toLowerCase().includes(nicheLower) ||
            inf.tags.some((t) => t.toLowerCase().includes(nicheLower)));
        if (platform) {
            results = results.filter((inf) => inf.platform === platform);
        }
        results = results.filter((inf) => inf.followers >= minFollowers && inf.followers <= maxFollowers);
        if (engagementRate > 0) {
            results = results.filter((inf) => inf.engagementRate >= engagementRate);
        }
        if (location) {
            const locLower = location.toLowerCase();
            results = results.filter((inf) => inf.location.toLowerCase().includes(locLower));
        }
        if (results.length < limit) {
            const generated = this.generateInfluencerResults(niche, platform, limit - results.length);
            results = [...results, ...generated];
        }
        const influencers = results.slice(0, limit);
        const totalFound = results.length;
        this.logger.log(`Found influencers: niche="${niche}", found=${totalFound}, returned=${influencers.length}`);
        return {
            influencers,
            totalFound,
            searchCriteria: { niche, platform, minFollowers, maxFollowers, location, engagementRate },
        };
    }
    async analyzeInfluencer(params) {
        const { influencerId, analysisDepth = 'standard' } = params;
        if (!influencerId || typeof influencerId !== 'string') {
            throw new Error('A valid influencerId is required');
        }
        const influencer = this.influencers.get(influencerId);
        const audience = {
            totalFollowers: influencer?.followers || 50000 + Math.floor(Math.random() * 500000),
            demographics: {
                ageGroups: { '18-24': 25 + Math.floor(Math.random() * 15), '25-34': 30 + Math.floor(Math.random() * 20), '35-44': 15 + Math.floor(Math.random() * 15), '45+': 5 + Math.floor(Math.random() * 10) },
                genderSplit: { male: 40 + Math.floor(Math.random() * 20), female: 40 + Math.floor(Math.random() * 20) },
                topLocations: ['United States', 'United Kingdom', 'Canada', 'Australia'],
            },
            engagementRate: influencer?.engagementRate || +(2 + Math.random() * 5).toFixed(2),
            avgLikes: influencer?.avgLikes || Math.floor(Math.random() * 10000),
            avgComments: influencer?.avgComments || Math.floor(Math.random() * 500),
        };
        const authenticity = {
            score: influencer?.authenticityScore || +(70 + Math.random() * 25).toFixed(0),
            fakeFollowerEstimate: Math.floor(Math.random() * 15),
            botActivity: +(Math.random() * 10).toFixed(1),
            engagementAuthenticity: +(75 + Math.random() * 20).toFixed(0),
            growthPattern: 'organic',
        };
        if (analysisDepth === 'comprehensive') {
            authenticity.sentimentAnalysis = {
                positive: +(60 + Math.random() * 25).toFixed(0),
                neutral: +(10 + Math.random() * 20).toFixed(0),
                negative: +(5 + Math.random() * 10).toFixed(0),
            };
            authenticity.postingConsistency = +(80 + Math.random() * 15).toFixed(0);
            authenticity.audienceOverlap = +(Math.random() * 30).toFixed(0);
        }
        const brandFit = {
            score: influencer?.brandFitScore || +(60 + Math.random() * 30).toFixed(0),
            contentRelevance: +(70 + Math.random() * 25).toFixed(0),
            audienceAlignment: +(65 + Math.random() * 25).toFixed(0),
            toneMatch: +(70 + Math.random() * 25).toFixed(0),
            previousPartnerships: Math.floor(Math.random() * 10),
        };
        const score = +((authenticity.score * 0.3) +
            (brandFit.score * 0.4) +
            (audience.engagementRate * 5)).toFixed(0);
        this.logger.log(`Analyzed influencer: ${influencerId}, score=${score}, authenticity=${authenticity.score}`);
        return {
            influencerId,
            score: Math.min(100, score),
            audience,
            authenticity,
            brandFit,
        };
    }
    async createOutreach(params) {
        const { influencerIds, campaignName, messageTemplate = 'Hi {{name}}, we love your content and would like to explore a collaboration opportunity with {{brand}}.', offer = { type: 'paid', amount: 0 }, followUpSchedule = '3-days', } = params;
        if (!influencerIds || !Array.isArray(influencerIds) || influencerIds.length === 0) {
            throw new Error('At least one influencerId is required');
        }
        if (!campaignName || typeof campaignName !== 'string') {
            throw new Error('A valid campaign name is required');
        }
        const outreachId = `outreach-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const outreach = {
            id: outreachId,
            name: campaignName,
            influencerIds,
            messageTemplate,
            offer,
            status: 'active',
            contactedAt: new Date(),
            responses: {},
        };
        for (const id of influencerIds) {
            const rand = Math.random();
            if (rand > 0.7) {
                outreach.responses[id] = 'interested';
            }
            else if (rand > 0.4) {
                outreach.responses[id] = 'pending';
            }
            else {
                outreach.responses[id] = 'no-response';
            }
        }
        this.outreachCampaigns.set(outreachId, outreach);
        const contacted = Object.values(outreach.responses).filter((r) => r !== 'no-response').length;
        this.logger.log(`Created outreach: ${outreachId}, campaign="${campaignName}", contacted=${contacted}/${influencerIds.length}`);
        return {
            outreachId,
            campaignName,
            contacted,
            status: 'active',
        };
    }
    async manageCollaboration(params) {
        const { collaborationId, action, data = {} } = params;
        const validActions = ['create', 'update', 'deliverable', 'approve', 'complete'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid collaboration action: ${action}. Valid: ${validActions.join(', ')}`);
        }
        let collaboration = this.collaborations.get(collaborationId);
        if (action === 'create') {
            const collabId = `collab-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            collaboration = {
                id: collabId,
                influencerId: data.influencerId || '',
                campaignId: data.campaignId || '',
                status: 'negotiating',
                deliverables: data.deliverables?.map((d, i) => ({
                    id: `del-${i + 1}`,
                    type: d.type || 'post',
                    description: d.description || '',
                    dueDate: d.dueDate ? new Date(d.dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                    status: 'pending',
                    content: '',
                })) || [],
                fee: data.fee || 0,
                startDate: new Date(),
                endDate: data.endDate ? new Date(data.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            };
            this.collaborations.set(collabId, collaboration);
        }
        if (!collaboration) {
            throw new Error(`Collaboration not found: ${collaborationId}`);
        }
        switch (action) {
            case 'update': {
                if (data.status)
                    collaboration.status = data.status;
                if (data.fee)
                    collaboration.fee = data.fee;
                break;
            }
            case 'deliverable': {
                const deliverable = collaboration.deliverables.find((d) => d.id === data.deliverableId);
                if (!deliverable) {
                    throw new Error(`Deliverable not found: ${data.deliverableId}`);
                }
                deliverable.status = 'submitted';
                deliverable.content = data.content || '';
                collaboration.status = 'review';
                break;
            }
            case 'approve': {
                const delToApprove = collaboration.deliverables.find((d) => d.id === data.deliverableId);
                if (!delToApprove) {
                    throw new Error(`Deliverable not found: ${data.deliverableId}`);
                }
                delToApprove.status = 'approved';
                const allApproved = collaboration.deliverables.every((d) => d.status === 'approved');
                if (allApproved) {
                    collaboration.status = 'published';
                }
                break;
            }
            case 'complete': {
                collaboration.status = 'completed';
                break;
            }
        }
        this.logger.log(`Collaboration ${action}: ${collaboration.id}, status=${collaboration.status}`);
        return {
            collaborationId: collaboration.id,
            status: collaboration.status,
            deliverables: collaboration.deliverables,
        };
    }
    async trackCampaignROI(params) {
        const { campaignId, metrics: requestedMetrics = [] } = params;
        if (!campaignId || typeof campaignId !== 'string') {
            throw new Error('A valid campaignId is required');
        }
        const campaignCollabs = Array.from(this.collaborations.values())
            .filter((c) => c.campaignId === campaignId);
        const influencerCount = Math.max(campaignCollabs.length, 3);
        const totalSpend = campaignCollabs.length > 0
            ? campaignCollabs.reduce((sum, c) => sum + c.fee, 0)
            : influencerCount * (500 + Math.floor(Math.random() * 2000));
        const impressions = totalSpend * (50 + Math.floor(Math.random() * 150));
        const engagements = Math.floor(impressions * (0.02 + Math.random() * 0.05));
        const conversions = Math.floor(engagements * (0.01 + Math.random() * 0.03));
        const totalValue = conversions * (30 + Math.random() * 100);
        const roi = totalSpend > 0 ? +(((totalValue - totalSpend) / totalSpend) * 100).toFixed(2) : 0;
        const byInfluencer = {};
        for (let i = 0; i < influencerCount; i++) {
            const infId = campaignCollabs[i]?.influencerId || `influencer-${i + 1}`;
            const infSpend = totalSpend / influencerCount;
            const infConversions = Math.floor(conversions / influencerCount);
            const infValue = infConversions * (30 + Math.random() * 70);
            byInfluencer[infId] = {
                spend: Math.round(infSpend),
                impressions: Math.floor(impressions / influencerCount),
                engagements: Math.floor(engagements / influencerCount),
                conversions: infConversions,
                value: Math.round(infValue * 100) / 100,
                roi: infSpend > 0 ? +(((infValue - infSpend) / infSpend) * 100).toFixed(2) : 0,
            };
        }
        const recommendations = this.generateROIRecommendations(roi, byInfluencer);
        this.logger.log(`Campaign ROI: ${campaignId}, spend=${totalSpend}, value=${totalValue.toFixed(2)}, ROI=${roi}%`);
        return {
            campaignId,
            totalSpend,
            totalValue: Math.round(totalValue * 100) / 100,
            roi,
            byInfluencer,
            recommendations,
        };
    }
    seedInfluencerData() {
        const seedInfluencers = [
            { id: 'inf-tech-001', handle: '@techsarah', name: 'Sarah Chen', platform: 'instagram', niche: 'technology', followers: 250000, engagementRate: 4.2, location: 'San Francisco, CA', avgLikes: 8500, avgComments: 420, authenticityScore: 88, brandFitScore: 82, rate: 2500, tags: ['tech', 'gadgets', 'software', 'AI'] },
            { id: 'inf-lifestyle-001', handle: '@markwithmark', name: 'Mark Johnson', platform: 'youtube', niche: 'lifestyle', followers: 500000, engagementRate: 3.5, location: 'New York, NY', avgLikes: 12000, avgComments: 800, authenticityScore: 91, brandFitScore: 75, rate: 4000, tags: ['lifestyle', 'fashion', 'travel', 'fitness'] },
            { id: 'inf-fitness-001', handle: '@fitjessica', name: 'Jessica Park', platform: 'instagram', niche: 'fitness', followers: 180000, engagementRate: 5.8, location: 'Los Angeles, CA', avgLikes: 9200, avgComments: 580, authenticityScore: 93, brandFitScore: 88, rate: 1800, tags: ['fitness', 'health', 'wellness', 'nutrition'] },
            { id: 'inf-food-001', handle: '@chefmike', name: 'Mike Torres', platform: 'tiktok', niche: 'food', followers: 750000, engagementRate: 6.2, location: 'Austin, TX', avgLikes: 35000, avgComments: 1500, authenticityScore: 87, brandFitScore: 80, rate: 3500, tags: ['food', 'cooking', 'recipes', 'restaurant'] },
            { id: 'inf-beauty-001', handle: '@beautybyemma', name: 'Emma Wilson', platform: 'instagram', niche: 'beauty', followers: 420000, engagementRate: 4.8, location: 'London, UK', avgLikes: 18000, avgComments: 900, authenticityScore: 85, brandFitScore: 90, rate: 3000, tags: ['beauty', 'skincare', 'makeup', 'selfcare'] },
            { id: 'inf-business-001', handle: '@bizleader', name: 'David Kim', platform: 'linkedin', niche: 'business', followers: 120000, engagementRate: 3.2, location: 'Seattle, WA', avgLikes: 3200, avgComments: 280, authenticityScore: 95, brandFitScore: 85, rate: 2000, tags: ['business', 'leadership', 'startup', 'SaaS'] },
        ];
        for (const inf of seedInfluencers) {
            this.influencers.set(inf.id, inf);
        }
    }
    generateInfluencerResults(niche, platform, count) {
        const platforms = ['instagram', 'youtube', 'tiktok', 'twitter', 'linkedin'];
        const locations = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany'];
        const results = [];
        for (let i = 0; i < count; i++) {
            this.influencerCounter++;
            const id = `inf-gen-${Date.now()}-${this.influencerCounter}`;
            const followers = 5000 + Math.floor(Math.random() * 500000);
            const engRate = +(1.5 + Math.random() * 7).toFixed(2);
            results.push({
                id,
                handle: `@${niche.replace(/\s/g, '')}${Math.floor(Math.random() * 999)}`,
                name: `Influencer ${this.influencerCounter}`,
                platform: platform || platforms[Math.floor(Math.random() * platforms.length)],
                niche,
                followers,
                engagementRate: engRate,
                location: locations[Math.floor(Math.random() * locations.length)],
                avgLikes: Math.floor(followers * engRate / 100),
                avgComments: Math.floor(followers * engRate / 100 * 0.05),
                authenticityScore: 65 + Math.floor(Math.random() * 30),
                brandFitScore: 60 + Math.floor(Math.random() * 35),
                rate: Math.floor(followers * 0.01),
                tags: [niche.toLowerCase()],
            });
        }
        return results;
    }
    generateROIRecommendations(roi, byInfluencer) {
        const recommendations = [];
        if (roi > 200) {
            recommendations.push('Excellent ROI. Consider scaling this campaign with increased budgets for top-performing influencers.');
        }
        else if (roi > 100) {
            recommendations.push('Good ROI. Identify top performers and allocate more budget to similar influencer profiles.');
        }
        else if (roi > 0) {
            recommendations.push('Positive but modest ROI. Optimize by focusing on influencers with higher conversion rates.');
        }
        else {
            recommendations.push('Negative ROI. Reassess influencer selection criteria and campaign messaging.');
        }
        const entries = Object.entries(byInfluencer);
        if (entries.length > 1) {
            const sorted = entries.sort((a, b) => b[1].roi - a[1].roi);
            const top = sorted[0];
            const bottom = sorted[sorted.length - 1];
            recommendations.push(`Top performer: ${top[0]} (ROI: ${top[1].roi}%). Consider re-engaging for future campaigns.`);
            if (bottom[1].roi < 0) {
                recommendations.push(`Underperformer: ${bottom[0]} (ROI: ${bottom[1].roi}%). Review content alignment and audience match.`);
            }
        }
        recommendations.push('Track long-term brand lift beyond direct conversions for a complete picture.');
        return recommendations;
    }
};
exports.InfluencerAgentService = InfluencerAgentService;
exports.InfluencerAgentService = InfluencerAgentService = __decorate([
    (0, common_1.Injectable)()
], InfluencerAgentService);
//# sourceMappingURL=influencer-agent.service.js.map