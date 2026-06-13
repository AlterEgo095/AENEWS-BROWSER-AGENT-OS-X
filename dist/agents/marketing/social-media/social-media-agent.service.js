"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialMediaAgentService = exports.SOCIAL_MEDIA_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
exports.SOCIAL_MEDIA_AGENT_CONFIG = {
    id: 'marketing-social-media',
    name: 'SocialMedia',
    cluster: agent_interface_1.AgentCluster.MARKETING,
    version: '1.0.0',
    description: 'Social media management agent that handles post creation, scheduling, engagement analysis, analytics, hashtag management, and trending topic discovery across platforms.',
    capabilities: [
        {
            name: 'createPost',
            description: 'Create a social media post with content, media, and metadata',
            inputSchema: {
                type: 'object',
                properties: {
                    platform: { type: 'string', description: 'Target platform' },
                    content: { type: 'string', description: 'Post text content' },
                    mediaUrls: { type: 'array', items: { type: 'string' }, description: 'Media attachment URLs' },
                    hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags to include' },
                    mentions: { type: 'array', items: { type: 'string' }, description: 'User mentions' },
                    linkUrl: { type: 'string', description: 'Link to include' },
                },
                required: ['platform', 'content'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    postId: { type: 'string' },
                    platform: { type: 'string' },
                    status: { type: 'string' },
                    createdAt: { type: 'string' },
                },
            },
        },
        {
            name: 'schedulePost',
            description: 'Schedule a post for future publishing',
            inputSchema: {
                type: 'object',
                properties: {
                    postId: { type: 'string', description: 'Post ID to schedule' },
                    scheduledAt: { type: 'string', description: 'ISO timestamp for scheduled publishing' },
                    timezone: { type: 'string', description: 'Timezone for scheduling' },
                },
                required: ['postId', 'scheduledAt'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    postId: { type: 'string' },
                    scheduledAt: { type: 'string' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'analyzeEngagement',
            description: 'Analyze engagement metrics for posts or accounts',
            inputSchema: {
                type: 'object',
                properties: {
                    postIds: { type: 'array', items: { type: 'string' }, description: 'Post IDs to analyze' },
                    platform: { type: 'string', description: 'Platform to analyze' },
                    dateFrom: { type: 'string', description: 'Start date (ISO string)' },
                    dateTo: { type: 'string', description: 'End date (ISO string)' },
                },
                required: ['postIds'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    totalEngagement: { type: 'number' },
                    engagementRate: { type: 'number' },
                    metrics: { type: 'object' },
                    topPerformingPost: { type: 'string' },
                    recommendations: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'getAnalytics',
            description: 'Get social media analytics for a platform or date range',
            inputSchema: {
                type: 'object',
                properties: {
                    platform: { type: 'string', description: 'Platform to get analytics for' },
                    metrics: { type: 'array', items: { type: 'string' }, description: 'Metrics to retrieve' },
                    dateFrom: { type: 'string', description: 'Start date (ISO string)' },
                    dateTo: { type: 'string', description: 'End date (ISO string)' },
                    granularity: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'monthly'], description: 'Data granularity' },
                },
                required: ['platform'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    platform: { type: 'string' },
                    period: { type: 'object' },
                    metrics: { type: 'object' },
                    trends: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'manageHashtags',
            description: 'Manage, analyze, and discover hashtags for social media',
            inputSchema: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['analyze', 'suggest', 'track'], description: 'Hashtag action' },
                    hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags to process' },
                    platform: { type: 'string', description: 'Target platform' },
                    niche: { type: 'string', description: 'Industry or niche for suggestions' },
                },
                required: ['action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    result: { type: 'object' },
                    hashtags: { type: 'array', items: { type: 'object' } },
                },
            },
        },
        {
            name: 'findTrendingTopics',
            description: 'Find trending topics and conversations across platforms',
            inputSchema: {
                type: 'object',
                properties: {
                    platform: { type: 'string', description: 'Platform to search trends on' },
                    category: { type: 'string', description: 'Industry category' },
                    region: { type: 'string', description: 'Geographic region' },
                    limit: { type: 'number', description: 'Maximum number of trends' },
                },
                required: [],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    trends: { type: 'array', items: { type: 'object' } },
                    region: { type: 'string' },
                    fetchedAt: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:social',
        'write:social',
        'read:analytics',
        'publish:social',
    ],
    maxConcurrentTasks: 5,
    timeout: 45000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 1500,
        exponentialBackoff: true,
    },
};
let SocialMediaAgentService = class SocialMediaAgentService extends base_agent_service_1.BaseAgentService {
    constructor() {
        super(...arguments);
        this.posts = new Map();
        this.hashtagIndex = new Map();
        this.postCounter = 0;
    }
    defineConfig() {
        return exports.SOCIAL_MEDIA_AGENT_CONFIG;
    }
    async onInitialize() {
        this.seedHashtagData();
        this.registerTool({
            name: 'createPost',
            description: 'Create a social media post with content, media, and metadata',
            execute: async (params) => this.createPost(params),
        });
        this.registerTool({
            name: 'schedulePost',
            description: 'Schedule a post for future publishing',
            execute: async (params) => this.schedulePost(params),
        });
        this.registerTool({
            name: 'analyzeEngagement',
            description: 'Analyze engagement metrics for posts or accounts',
            execute: async (params) => this.analyzeEngagement(params),
        });
        this.registerTool({
            name: 'getAnalytics',
            description: 'Get social media analytics for a platform or date range',
            execute: async (params) => this.getAnalytics(params),
        });
        this.registerTool({
            name: 'manageHashtags',
            description: 'Manage, analyze, and discover hashtags for social media',
            execute: async (params) => this.manageHashtags(params),
        });
        this.registerTool({
            name: 'findTrendingTopics',
            description: 'Find trending topics and conversations across platforms',
            execute: async (params) => this.findTrendingTopics(params),
        });
        await this.storeInWorkingMemory('social-media:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('SocialMedia agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'createPost',
            'schedulePost',
            'analyzeEngagement',
            'getAnalytics',
            'manageHashtags',
            'findTrendingTopics',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown social media action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`social-media:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`SocialMedia execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.posts.clear();
        this.hashtagIndex.clear();
        this.postCounter = 0;
        this.logger.log('SocialMedia agent destroyed, posts and hashtag data cleared');
    }
    async createPost(params) {
        const { platform, content, mediaUrls = [], hashtags = [], mentions = [], linkUrl = '' } = params;
        if (!platform || typeof platform !== 'string') {
            throw new Error('A valid platform is required');
        }
        if (!content || typeof content !== 'string') {
            throw new Error('Post content is required');
        }
        const validPlatforms = ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok', 'threads', 'youtube'];
        if (!validPlatforms.includes(platform)) {
            throw new Error(`Invalid platform: ${platform}. Valid: ${validPlatforms.join(', ')}`);
        }
        const maxChars = this.getPlatformCharLimit(platform);
        if (content.length > maxChars) {
            throw new Error(`Content exceeds ${platform} limit of ${maxChars} characters (got ${content.length})`);
        }
        const postId = this.generatePostId();
        const post = {
            id: postId,
            platform,
            content,
            mediaUrls,
            hashtags,
            mentions,
            linkUrl,
            status: 'draft',
            scheduledAt: null,
            publishedAt: null,
            engagement: { likes: 0, comments: 0, shares: 0, impressions: 0, reach: 0, clicks: 0 },
            createdAt: new Date(),
        };
        this.posts.set(postId, post);
        this.logger.log(`Created social post: ${postId}, platform=${platform}, chars=${content.length}`);
        return {
            postId,
            platform,
            status: 'draft',
            createdAt: post.createdAt.toISOString(),
        };
    }
    async schedulePost(params) {
        const { postId, scheduledAt, timezone = 'UTC' } = params;
        if (!postId || typeof postId !== 'string') {
            throw new Error('A valid postId is required');
        }
        if (!scheduledAt || typeof scheduledAt !== 'string') {
            throw new Error('A valid scheduledAt ISO timestamp is required');
        }
        const post = this.posts.get(postId);
        if (!post) {
            throw new Error(`Post not found: ${postId}`);
        }
        if (post.status === 'published') {
            throw new Error(`Post ${postId} has already been published`);
        }
        const scheduledDate = new Date(scheduledAt);
        if (isNaN(scheduledDate.getTime())) {
            throw new Error('Invalid scheduledAt timestamp');
        }
        if (scheduledDate <= new Date()) {
            throw new Error('scheduledAt must be in the future');
        }
        post.scheduledAt = scheduledDate;
        post.status = 'scheduled';
        this.logger.log(`Scheduled post: ${postId} for ${scheduledAt} (${timezone})`);
        return {
            postId,
            scheduledAt,
            status: 'scheduled',
        };
    }
    async analyzeEngagement(params) {
        const { postIds, dateFrom, dateTo } = params;
        if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
            throw new Error('At least one postId is required');
        }
        const posts = [];
        for (const id of postIds) {
            const post = this.posts.get(id);
            if (post) {
                if (dateFrom) {
                    const fromDate = new Date(dateFrom);
                    if (post.createdAt < fromDate)
                        continue;
                }
                if (dateTo) {
                    const toDate = new Date(dateTo);
                    if (post.createdAt > toDate)
                        continue;
                }
                posts.push(post);
            }
        }
        if (posts.length === 0) {
            throw new Error('No valid posts found for the given criteria');
        }
        const metrics = {
            totalLikes: posts.reduce((sum, p) => sum + p.engagement.likes, 0),
            totalComments: posts.reduce((sum, p) => sum + p.engagement.comments, 0),
            totalShares: posts.reduce((sum, p) => sum + p.engagement.shares, 0),
            totalImpressions: posts.reduce((sum, p) => sum + p.engagement.impressions, 0),
            totalReach: posts.reduce((sum, p) => sum + p.engagement.reach, 0),
            totalClicks: posts.reduce((sum, p) => sum + p.engagement.clicks, 0),
        };
        const totalEngagement = metrics.totalLikes + metrics.totalComments + metrics.totalShares;
        const engagementRate = metrics.totalImpressions > 0
            ? (totalEngagement / metrics.totalImpressions) * 100
            : 0;
        const topPost = posts.reduce((best, p) => {
            const score = p.engagement.likes + p.engagement.comments + p.engagement.shares;
            const bestScore = best.engagement.likes + best.engagement.comments + best.engagement.shares;
            return score > bestScore ? p : best;
        });
        const recommendations = this.generateEngagementRecommendations(posts, engagementRate);
        this.logger.log(`Analyzed engagement: ${posts.length} posts, total=${totalEngagement}, rate=${engagementRate.toFixed(2)}%`);
        return {
            totalEngagement,
            engagementRate: Math.round(engagementRate * 100) / 100,
            metrics,
            topPerformingPost: topPost.id,
            recommendations,
        };
    }
    async getAnalytics(params) {
        const { platform, metrics: requestedMetrics = [], dateFrom, dateTo, granularity = 'daily' } = params;
        if (!platform || typeof platform !== 'string') {
            throw new Error('A valid platform is required');
        }
        const fromDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = dateTo ? new Date(dateTo) : new Date();
        const platformPosts = Array.from(this.posts.values())
            .filter((p) => p.platform === platform);
        const allMetrics = {
            followers: 1000 + Math.floor(Math.random() * 5000),
            following: 200 + Math.floor(Math.random() * 500),
            posts: platformPosts.length,
            totalImpressions: platformPosts.reduce((sum, p) => sum + p.engagement.impressions, 0) || Math.floor(Math.random() * 50000),
            totalReach: platformPosts.reduce((sum, p) => sum + p.engagement.reach, 0) || Math.floor(Math.random() * 30000),
            totalEngagement: platformPosts.reduce((sum, p) => sum + p.engagement.likes + p.engagement.comments + p.engagement.shares, 0) || Math.floor(Math.random() * 5000),
            avgEngagementRate: +(2 + Math.random() * 5).toFixed(2),
        };
        const resultMetrics = requestedMetrics.length > 0
            ? Object.fromEntries(Object.entries(allMetrics).filter(([key]) => requestedMetrics.includes(key)))
            : allMetrics;
        const trends = this.generateTrendData(fromDate, toDate, granularity);
        this.logger.log(`Analytics retrieved: platform=${platform}, metrics=${Object.keys(resultMetrics).length}`);
        return {
            platform,
            period: { from: fromDate.toISOString(), to: toDate.toISOString() },
            metrics: resultMetrics,
            trends,
        };
    }
    async manageHashtags(params) {
        const { action, hashtags = [], platform = 'instagram', niche = '' } = params;
        const validActions = ['analyze', 'suggest', 'track'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid hashtag action: ${action}. Valid: ${validActions.join(', ')}`);
        }
        let result = {};
        let resultHashtags = [];
        switch (action) {
            case 'analyze': {
                if (hashtags.length === 0) {
                    throw new Error('Hashtags are required for analysis');
                }
                resultHashtags = hashtags.map((tag) => {
                    const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
                    const cached = this.hashtagIndex.get(cleanTag);
                    return cached || {
                        tag: cleanTag,
                        volume: 1000 + Math.floor(Math.random() * 50000),
                        reach: 5000 + Math.floor(Math.random() * 100000),
                        engagement: +(1 + Math.random() * 8).toFixed(2),
                        competition: Math.floor(Math.random() * 100),
                    };
                });
                const avgEngagement = resultHashtags.reduce((sum, h) => sum + h.engagement, 0) / resultHashtags.length;
                const highCompetition = resultHashtags.filter((h) => h.competition > 60).length;
                result = {
                    analyzedCount: hashtags.length,
                    avgEngagement: +avgEngagement.toFixed(2),
                    highCompetitionCount: highCompetition,
                    recommendation: highCompetition > hashtags.length / 2
                        ? 'Consider mixing in lower-competition hashtags for better visibility'
                        : 'Hashtag mix looks balanced',
                };
                break;
            }
            case 'suggest': {
                const nicheKeywords = niche ? niche.split(/\s+/) : ['marketing', 'business', 'growth'];
                const suggested = nicheKeywords.flatMap((kw) => [
                    { tag: `#${kw.toLowerCase()}`, volume: 5000 + Math.floor(Math.random() * 30000), reach: 10000 + Math.floor(Math.random() * 80000), engagement: +(2 + Math.random() * 6).toFixed(2), competition: 20 + Math.floor(Math.random() * 60) },
                    { tag: `#${kw.toLowerCase()}tips`, volume: 2000 + Math.floor(Math.random() * 15000), reach: 5000 + Math.floor(Math.random() * 40000), engagement: +(3 + Math.random() * 5).toFixed(2), competition: 15 + Math.floor(Math.random() * 40) },
                    { tag: `#${kw.toLowerCase()}strategy`, volume: 1000 + Math.floor(Math.random() * 10000), reach: 3000 + Math.floor(Math.random() * 25000), engagement: +(2 + Math.random() * 7).toFixed(2), competition: 10 + Math.floor(Math.random() * 50) },
                ]);
                resultHashtags = suggested.slice(0, 15);
                result = {
                    niche: niche || 'general',
                    platform,
                    suggestedCount: resultHashtags.length,
                };
                break;
            }
            case 'track': {
                if (hashtags.length === 0) {
                    throw new Error('Hashtags are required for tracking');
                }
                resultHashtags = hashtags.map((tag) => {
                    const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
                    return {
                        tag: cleanTag,
                        volume: 1000 + Math.floor(Math.random() * 50000),
                        reach: 5000 + Math.floor(Math.random() * 100000),
                        engagement: +(1 + Math.random() * 8).toFixed(2),
                        competition: Math.floor(Math.random() * 100),
                    };
                });
                result = {
                    trackingCount: hashtags.length,
                    status: 'tracking',
                    note: 'Hashtag tracking is now active for the specified tags',
                };
                break;
            }
        }
        this.logger.log(`Hashtag ${action}: ${hashtags.length} tags, platform=${platform}`);
        return { result, hashtags: resultHashtags };
    }
    async findTrendingTopics(params) {
        const { platform = 'twitter', category = '', region = 'us', limit = 10 } = params;
        const trends = this.generateTrendingTopics(platform, category, region, limit);
        this.logger.log(`Found trending topics: ${trends.length}, platform=${platform}, region=${region}`);
        return {
            trends,
            region,
            fetchedAt: new Date().toISOString(),
        };
    }
    seedHashtagData() {
        const popularHashtags = [
            { tag: '#marketing', volume: 85000, reach: 2500000, engagement: 3.5, competition: 85 },
            { tag: '#digital', volume: 72000, reach: 2100000, engagement: 2.8, competition: 78 },
            { tag: '#socialmedia', volume: 68000, reach: 1900000, engagement: 4.1, competition: 82 },
            { tag: '#branding', volume: 45000, reach: 1200000, engagement: 3.2, competition: 65 },
            { tag: '#contentcreator', volume: 55000, reach: 1500000, engagement: 5.6, competition: 70 },
            { tag: '#growth', volume: 40000, reach: 980000, engagement: 2.9, competition: 55 },
            { tag: '#strategy', volume: 35000, reach: 850000, engagement: 2.5, competition: 48 },
            { tag: '#smallbusiness', volume: 52000, reach: 1400000, engagement: 4.8, competition: 60 },
        ];
        for (const ht of popularHashtags) {
            this.hashtagIndex.set(ht.tag, ht);
        }
    }
    generatePostId() {
        this.postCounter++;
        return `post-${Date.now()}-${this.postCounter}`;
    }
    getPlatformCharLimit(platform) {
        const limits = {
            twitter: 280,
            facebook: 63206,
            instagram: 2200,
            linkedin: 3000,
            tiktok: 2200,
            threads: 500,
            youtube: 5000,
        };
        return limits[platform] || 2200;
    }
    generateEngagementRecommendations(posts, engagementRate) {
        const recommendations = [];
        if (engagementRate < 1) {
            recommendations.push('Engagement rate is very low. Consider posting more interactive content like polls and questions.');
        }
        else if (engagementRate < 3) {
            recommendations.push('Engagement rate is below average. Try experimenting with different posting times and content formats.');
        }
        else if (engagementRate >= 3 && engagementRate < 6) {
            recommendations.push('Engagement rate is good. Continue with current strategy and test new content types.');
        }
        else {
            recommendations.push('Engagement rate is excellent. Analyze top-performing posts to replicate success.');
        }
        const postsWithMedia = posts.filter((p) => p.mediaUrls.length > 0);
        const postsWithoutMedia = posts.filter((p) => p.mediaUrls.length === 0);
        if (postsWithoutMedia.length > postsWithMedia.length) {
            recommendations.push('Posts with media tend to get higher engagement. Consider adding images or videos to more posts.');
        }
        const avgHashtags = posts.reduce((sum, p) => sum + p.hashtags.length, 0) / posts.length;
        if (avgHashtags < 3) {
            recommendations.push('Try using more relevant hashtags (5-10 recommended for most platforms).');
        }
        return recommendations;
    }
    generateTrendData(fromDate, toDate, granularity) {
        const trends = [];
        const diffMs = toDate.getTime() - fromDate.getTime();
        let intervalMs;
        switch (granularity) {
            case 'hourly':
                intervalMs = 60 * 60 * 1000;
                break;
            case 'weekly':
                intervalMs = 7 * 24 * 60 * 60 * 1000;
                break;
            case 'monthly':
                intervalMs = 30 * 24 * 60 * 60 * 1000;
                break;
            default:
                intervalMs = 24 * 60 * 60 * 1000;
        }
        const dataPoints = Math.min(Math.floor(diffMs / intervalMs), 60);
        let baseValue = 1000 + Math.floor(Math.random() * 5000);
        for (let i = 0; i < dataPoints; i++) {
            const date = new Date(fromDate.getTime() + i * intervalMs);
            baseValue += Math.floor((Math.random() - 0.4) * 500);
            baseValue = Math.max(100, baseValue);
            trends.push({
                date: date.toISOString().split('T')[0],
                value: baseValue,
            });
        }
        return trends;
    }
    generateTrendingTopics(platform, category, region, limit) {
        const generalTrends = [
            { topic: 'AI in Marketing', platform, volume: 120000, growth: 45, category: 'technology', relatedHashtags: ['#AI', '#MarketingTech', '#Automation'] },
            { topic: 'Sustainable Business', platform, volume: 85000, growth: 32, category: 'business', relatedHashtags: ['#Sustainability', '#GreenBusiness', '#ESG'] },
            { topic: 'Short-Form Video', platform, volume: 95000, growth: 28, category: 'content', relatedHashtags: ['#ShortForm', '#VideoMarketing', '#TikTok'] },
            { topic: 'Personal Branding', platform, volume: 78000, growth: 22, category: 'branding', relatedHashtags: ['#PersonalBrand', '#ThoughtLeader', '#LinkedIn'] },
            { topic: 'Community Building', platform, volume: 62000, growth: 38, category: 'engagement', relatedHashtags: ['#Community', '#Engagement', '#Audience'] },
            { topic: 'Data Privacy', platform, volume: 55000, growth: 18, category: 'technology', relatedHashtags: ['#Privacy', '#DataSecurity', '#Compliance'] },
            { topic: 'Remote Work Culture', platform, volume: 48000, growth: 15, category: 'business', relatedHashtags: ['#RemoteWork', '#WFH', '#FutureOfWork'] },
            { topic: 'Influencer Marketing', platform, volume: 72000, growth: 25, category: 'marketing', relatedHashtags: ['#Influencer', '#Collab', '#Sponsored'] },
            { topic: 'Voice Search Optimization', platform, volume: 35000, growth: 42, category: 'seo', relatedHashtags: ['#VoiceSearch', '#SEO', '#SmartSpeakers'] },
            { topic: 'Micro-Content Strategy', platform, volume: 42000, growth: 30, category: 'content', relatedHashtags: ['#MicroContent', '#Snackable', '#ContentStrategy'] },
        ];
        let filtered = category
            ? generalTrends.filter((t) => t.category === category)
            : generalTrends;
        return filtered.slice(0, limit);
    }
};
exports.SocialMediaAgentService = SocialMediaAgentService;
exports.SocialMediaAgentService = SocialMediaAgentService = __decorate([
    (0, common_1.Injectable)()
], SocialMediaAgentService);
//# sourceMappingURL=social-media-agent.service.js.map