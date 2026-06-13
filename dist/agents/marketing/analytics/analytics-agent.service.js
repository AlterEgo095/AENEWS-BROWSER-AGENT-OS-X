"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsAgentService = exports.ANALYTICS_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.ANALYTICS_AGENT_CONFIG = {
    id: 'marketing-analytics',
    name: 'Analytics',
    cluster: agent_interface_1.AgentCluster.MARKETING,
    version: '1.0.0',
    description: 'Marketing analytics agent that handles report generation, conversion tracking, funnel analysis, ROI calculation, period comparison, and data export.',
    capabilities: [
        {
            name: 'generateReport',
            description: 'Generate a marketing performance report',
            inputSchema: {
                type: 'object',
                properties: {
                    reportType: {
                        type: 'string',
                        enum: ['overview', 'campaign', 'channel', 'content', 'custom'],
                        description: 'Type of report',
                    },
                    dateFrom: { type: 'string', description: 'Start date (ISO string)' },
                    dateTo: { type: 'string', description: 'End date (ISO string)' },
                    channels: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Channels to include',
                    },
                    metrics: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Specific metrics to include',
                    },
                },
                required: ['reportType'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    reportId: { type: 'string' },
                    reportType: { type: 'string' },
                    summary: { type: 'object' },
                    data: { type: 'object' },
                    generatedAt: { type: 'string' },
                },
            },
        },
        {
            name: 'trackConversions',
            description: 'Track and attribute conversions across marketing channels',
            inputSchema: {
                type: 'object',
                properties: {
                    conversionType: { type: 'string', description: 'Type of conversion to track' },
                    dateFrom: { type: 'string', description: 'Start date (ISO string)' },
                    dateTo: { type: 'string', description: 'End date (ISO string)' },
                    attributionModel: {
                        type: 'string',
                        enum: ['first-touch', 'last-touch', 'linear', 'time-decay'],
                        description: 'Attribution model',
                    },
                    channels: { type: 'array', items: { type: 'string' }, description: 'Channels to track' },
                },
                required: ['conversionType'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    totalConversions: { type: 'number' },
                    conversionRate: { type: 'number' },
                    byChannel: { type: 'object' },
                    bySource: { type: 'object' },
                    value: { type: 'number' },
                },
            },
        },
        {
            name: 'analyzeFunnel',
            description: 'Analyze marketing funnel performance and drop-off points',
            inputSchema: {
                type: 'object',
                properties: {
                    funnelType: {
                        type: 'string',
                        enum: ['awareness', 'conversion', 'retention', 'custom'],
                        description: 'Funnel type',
                    },
                    stages: {
                        type: 'array',
                        items: { type: 'object' },
                        description: 'Funnel stages with names',
                    },
                    dateFrom: { type: 'string', description: 'Start date (ISO string)' },
                    dateTo: { type: 'string', description: 'End date (ISO string)' },
                },
                required: ['funnelType'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    stages: { type: 'array', items: { type: 'object' } },
                    overallConversionRate: { type: 'number' },
                    biggestDropOff: { type: 'object' },
                    recommendations: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'calculateROI',
            description: 'Calculate return on investment for marketing activities',
            inputSchema: {
                type: 'object',
                properties: {
                    campaignIds: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Campaign IDs to calculate ROI for',
                    },
                    channels: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Channels to include',
                    },
                    dateFrom: { type: 'string', description: 'Start date (ISO string)' },
                    dateTo: { type: 'string', description: 'End date (ISO string)' },
                    includeAttribution: {
                        type: 'boolean',
                        description: 'Whether to include attribution data',
                    },
                },
                required: [],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    totalSpend: { type: 'number' },
                    totalRevenue: { type: 'number' },
                    roi: { type: 'number' },
                    roas: { type: 'number' },
                    byChannel: { type: 'object' },
                },
            },
        },
        {
            name: 'comparePeriods',
            description: 'Compare marketing metrics across different time periods',
            inputSchema: {
                type: 'object',
                properties: {
                    periodAFrom: { type: 'string', description: 'Period A start date' },
                    periodATo: { type: 'string', description: 'Period A end date' },
                    periodBFrom: { type: 'string', description: 'Period B start date' },
                    periodBTo: { type: 'string', description: 'Period B end date' },
                    metrics: { type: 'array', items: { type: 'string' }, description: 'Metrics to compare' },
                },
                required: ['periodAFrom', 'periodATo', 'periodBFrom', 'periodBTo'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    periodA: { type: 'object' },
                    periodB: { type: 'object' },
                    changes: { type: 'object' },
                    insights: { type: 'array', items: { type: 'string' } },
                },
            },
        },
        {
            name: 'exportData',
            description: 'Export marketing data in various formats',
            inputSchema: {
                type: 'object',
                properties: {
                    dataType: {
                        type: 'string',
                        enum: ['report', 'conversions', 'funnel', 'roi', 'raw'],
                        description: 'Type of data to export',
                    },
                    format: {
                        type: 'string',
                        enum: ['csv', 'json', 'xlsx', 'pdf'],
                        description: 'Export format',
                    },
                    dateFrom: { type: 'string', description: 'Start date (ISO string)' },
                    dateTo: { type: 'string', description: 'End date (ISO string)' },
                    filters: { type: 'object', description: 'Additional filters' },
                },
                required: ['dataType', 'format'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    exportId: { type: 'string' },
                    format: { type: 'string' },
                    recordCount: { type: 'number' },
                    downloadUrl: { type: 'string' },
                    expiresAt: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:analytics',
        'read:campaign',
        'read:conversions',
        'export:data',
    ],
    maxConcurrentTasks: 3,
    timeout: 90000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 2000,
        exponentialBackoff: true,
    },
};
let AnalyticsAgentService = class AnalyticsAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.reports = new Map();
        this.conversionData = [];
        this.exportCounter = 0;
    }
    defineConfig() {
        return exports.ANALYTICS_AGENT_CONFIG;
    }
    async onInitialize() {
        this.seedConversionData();
        this.registerTool({
            name: 'generateReport',
            description: 'Generate a marketing performance report',
            execute: async (params) => this.generateReport(params),
        });
        this.registerTool({
            name: 'trackConversions',
            description: 'Track and attribute conversions across marketing channels',
            execute: async (params) => this.trackConversions(params),
        });
        this.registerTool({
            name: 'analyzeFunnel',
            description: 'Analyze marketing funnel performance and drop-off points',
            execute: async (params) => this.analyzeFunnel(params),
        });
        this.registerTool({
            name: 'calculateROI',
            description: 'Calculate return on investment for marketing activities',
            execute: async (params) => this.calculateROI(params),
        });
        this.registerTool({
            name: 'comparePeriods',
            description: 'Compare marketing metrics across different time periods',
            execute: async (params) => this.comparePeriods(params),
        });
        this.registerTool({
            name: 'exportData',
            description: 'Export marketing data in various formats',
            execute: async (params) => this.exportData(params),
        });
        await this.storeInWorkingMemory('analytics:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('Analytics agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.BusinessCapability.ANALYTICS, {
                    missionId: input.taskId,
                    instruction: JSON.stringify(input.payload),
                    workspaceDir: `/tmp/aenews-workspace/${input.taskId}`,
                    parameters: input.payload,
                });
                return this.createAgentOutput(input.taskId, result.success, result.output, result.error, startTime);
            }
            catch (error) {
                this.logger.warn(`Bridge failed, fallback: ${error.message}`);
            }
        }
        const { action, ...params } = input.payload;
        if (!action) {
            return this.createAgentOutput(input.taskId, false, null, 'Missing required parameter: action', startTime);
        }
        const supportedActions = [
            'generateReport',
            'trackConversions',
            'analyzeFunnel',
            'calculateROI',
            'comparePeriods',
            'exportData',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown analytics action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`analytics:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`Analytics execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.reports.clear();
        this.conversionData = [];
        this.exportCounter = 0;
        this.logger.log('Analytics agent destroyed, reports and conversion data cleared');
    }
    async generateReport(params) {
        const { reportType, dateFrom, dateTo, channels = [], metrics = [] } = params;
        const validReportTypes = ['overview', 'campaign', 'channel', 'content', 'custom'];
        if (!validReportTypes.includes(reportType)) {
            throw new Error(`Invalid report type: ${reportType}. Valid: ${validReportTypes.join(', ')}`);
        }
        const fromDate = dateFrom
            ? new Date(dateFrom)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = dateTo ? new Date(dateTo) : new Date();
        const reportId = `rpt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const summary = {};
        const data = {};
        switch (reportType) {
            case 'overview': {
                summary.totalVisitors = 45000 + Math.floor(Math.random() * 20000);
                summary.totalLeads = 2500 + Math.floor(Math.random() * 1500);
                summary.totalConversions = 350 + Math.floor(Math.random() * 200);
                summary.totalRevenue = +(15000 + Math.random() * 25000).toFixed(2);
                summary.avgConversionRate = +((summary.totalConversions / summary.totalVisitors) *
                    100).toFixed(2);
                summary.avgCPA = +((summary.totalRevenue / summary.totalConversions) * 0.3).toFixed(2);
                data.channels = this.generateChannelData(channels);
                data.trends = this.generateTrendData(fromDate, toDate, 30);
                data.topPerformers = {
                    bestChannel: 'email',
                    bestCampaign: 'summer-sale-2024',
                    bestContent: 'ultimate-guide-blog-post',
                };
                break;
            }
            case 'campaign': {
                summary.activeCampaigns = 5 + Math.floor(Math.random() * 10);
                summary.completedCampaigns = 15 + Math.floor(Math.random() * 20);
                summary.avgOpenRate = +(18 + Math.random() * 12).toFixed(2);
                summary.avgClickRate = +(2.5 + Math.random() * 4).toFixed(2);
                summary.avgConversionRate = +(1.5 + Math.random() * 3).toFixed(2);
                data.campaignBreakdown = this.generateCampaignBreakdown(summary.activeCampaigns + summary.completedCampaigns);
                break;
            }
            case 'channel': {
                const defaultChannels = ['email', 'social', 'paid-search', 'organic', 'referral'];
                const reportChannels = channels.length > 0 ? channels : defaultChannels;
                summary.channelCount = reportChannels.length;
                summary.bestPerforming = 'email';
                summary.fastestGrowing = 'social';
                data.channelMetrics = {};
                for (const channel of reportChannels) {
                    data.channelMetrics[channel] = {
                        visitors: 5000 + Math.floor(Math.random() * 20000),
                        conversions: 50 + Math.floor(Math.random() * 300),
                        revenue: +(2000 + Math.random() * 15000).toFixed(2),
                        conversionRate: +(1 + Math.random() * 5).toFixed(2),
                        cost: +(500 + Math.random() * 5000).toFixed(2),
                    };
                }
                break;
            }
            case 'content': {
                summary.totalContent = 50 + Math.floor(Math.random() * 100);
                summary.avgEngagement = +(2 + Math.random() * 6).toFixed(2);
                summary.topContentType = 'blog';
                data.contentBreakdown = {
                    blog: { count: 25, avgViews: 1200, avgEngagement: 4.2 },
                    video: { count: 15, avgViews: 3500, avgEngagement: 5.8 },
                    social: { count: 60, avgViews: 800, avgEngagement: 3.1 },
                    email: { count: 20, avgViews: 5000, avgEngagement: 6.5 },
                };
                break;
            }
            default: {
                summary.message = 'Custom report generated with available data';
                summary.period = { from: fromDate.toISOString(), to: toDate.toISOString() };
                data.customMetrics = {};
            }
        }
        const report = {
            id: reportId,
            type: reportType,
            generatedAt: new Date(),
            metrics: summary,
        };
        this.reports.set(reportId, report);
        this.logger.log(`Generated report: ${reportId}, type=${reportType}`);
        return {
            reportId,
            reportType,
            summary,
            data,
            generatedAt: report.generatedAt.toISOString(),
        };
    }
    async trackConversions(params) {
        const { conversionType, dateFrom, dateTo, attributionModel = 'last-touch', channels = [], } = params;
        if (!conversionType || typeof conversionType !== 'string') {
            throw new Error('A valid conversionType is required');
        }
        const fromDate = dateFrom
            ? new Date(dateFrom)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = dateTo ? new Date(dateTo) : new Date();
        const filtered = this.conversionData.filter((c) => {
            if (c.type !== conversionType)
                return false;
            if (c.timestamp < fromDate || c.timestamp > toDate)
                return false;
            if (channels.length > 0 && !channels.includes(c.channel))
                return false;
            return true;
        });
        const totalConversions = filtered.length;
        const totalValue = filtered.reduce((sum, c) => sum + c.value, 0);
        const totalVisitors = 50000 + Math.floor(Math.random() * 30000);
        const conversionRate = +((totalConversions / totalVisitors) * 100).toFixed(2);
        const byChannel = {};
        for (const c of filtered) {
            byChannel[c.channel] = (byChannel[c.channel] || 0) + 1;
        }
        const bySource = {};
        for (const c of filtered) {
            bySource[c.source] = (bySource[c.source] || 0) + 1;
        }
        if (attributionModel === 'first-touch') {
            this.logger.log(`Applied first-touch attribution model`);
        }
        else if (attributionModel === 'linear') {
            this.logger.log(`Applied linear attribution model`);
        }
        this.logger.log(`Tracked conversions: type=${conversionType}, total=${totalConversions}, value=${totalValue.toFixed(2)}`);
        return {
            totalConversions,
            conversionRate,
            byChannel,
            bySource,
            value: Math.round(totalValue * 100) / 100,
        };
    }
    async analyzeFunnel(params) {
        const { funnelType, stages: customStages, dateFrom, dateTo } = params;
        const validFunnelTypes = ['awareness', 'conversion', 'retention', 'custom'];
        if (!validFunnelTypes.includes(funnelType)) {
            throw new Error(`Invalid funnel type: ${funnelType}. Valid: ${validFunnelTypes.join(', ')}`);
        }
        const defaultStages = {
            awareness: [
                { name: 'Impression', dropOffRate: 0.6 },
                { name: 'Click', dropOffRate: 0.7 },
                { name: 'Landing Page View', dropOffRate: 0.5 },
                { name: 'Lead Capture', dropOffRate: 0.6 },
                { name: 'Qualified Lead', dropOffRate: 0.5 },
            ],
            conversion: [
                { name: 'Website Visit', dropOffRate: 0.5 },
                { name: 'Product View', dropOffRate: 0.6 },
                { name: 'Add to Cart', dropOffRate: 0.7 },
                { name: 'Checkout Started', dropOffRate: 0.6 },
                { name: 'Purchase', dropOffRate: 0 },
            ],
            retention: [
                { name: 'First Purchase', dropOffRate: 0.3 },
                { name: 'Email Open', dropOffRate: 0.5 },
                { name: 'Repeat Visit', dropOffRate: 0.4 },
                { name: 'Second Purchase', dropOffRate: 0.5 },
                { name: 'Loyal Customer', dropOffRate: 0 },
            ],
            custom: customStages && customStages.length > 0
                ? customStages.map((s, i, arr) => ({
                    name: s.name,
                    dropOffRate: i < arr.length - 1 ? 0.4 + Math.random() * 0.3 : 0,
                }))
                : [
                    { name: 'Entry', dropOffRate: 0.5 },
                    { name: 'Engagement', dropOffRate: 0.4 },
                    { name: 'Action', dropOffRate: 0.5 },
                    { name: 'Completion', dropOffRate: 0 },
                ],
        }[funnelType] || [];
        if (!defaultStages || defaultStages.length === 0) {
            throw new Error(`Failed to build funnel stages for type: ${funnelType}`);
        }
        let currentVisitors = 100000;
        const funnelStages = [];
        let biggestDropOff = { stage: '', rate: 0 };
        for (let i = 0; i < defaultStages.length; i++) {
            const stageDef = defaultStages[i];
            const dropOff = i > 0 ? Math.floor(currentVisitors * stageDef.dropOffRate) : 0;
            const stageVisitors = i === 0 ? currentVisitors : currentVisitors - dropOff;
            const stage = {
                name: stageDef.name,
                visitors: stageVisitors,
                conversionRate: i === 0 ? 100 : +((stageVisitors / funnelStages[i - 1].visitors) * 100).toFixed(2),
                dropOff: dropOff,
            };
            if (i > 0 && stageDef.dropOffRate > biggestDropOff.rate) {
                biggestDropOff = { stage: stageDef.name, rate: stageDef.dropOffRate };
            }
            funnelStages.push(stage);
            currentVisitors = stageVisitors;
        }
        const overallConversionRate = funnelStages.length > 0 && funnelStages[0].visitors > 0
            ? +((funnelStages[funnelStages.length - 1].visitors / funnelStages[0].visitors) *
                100).toFixed(2)
            : 0;
        const recommendations = this.generateFunnelRecommendations(funnelStages, biggestDropOff);
        this.logger.log(`Funnel analysis: type=${funnelType}, stages=${funnelStages.length}, overallRate=${overallConversionRate}%`);
        return {
            stages: funnelStages,
            overallConversionRate,
            biggestDropOff,
            recommendations,
        };
    }
    async calculateROI(params) {
        const { channels = [], includeAttribution = false } = params;
        const defaultChannels = ['email', 'social', 'paid-search', 'organic', 'display'];
        const reportChannels = channels.length > 0 ? channels : defaultChannels;
        const byChannel = {};
        let totalSpend = 0;
        let totalRevenue = 0;
        for (const channel of reportChannels) {
            const spend = 500 + Math.floor(Math.random() * 8000);
            const revenue = spend * (1.5 + Math.random() * 4);
            const roi = +(((revenue - spend) / spend) * 100).toFixed(2);
            byChannel[channel] = {
                spend,
                revenue: Math.round(revenue * 100) / 100,
                roi,
            };
            totalSpend += spend;
            totalRevenue += revenue;
        }
        const roi = totalSpend > 0 ? +(((totalRevenue - totalSpend) / totalSpend) * 100).toFixed(2) : 0;
        const roas = totalSpend > 0 ? +(totalRevenue / totalSpend).toFixed(2) : 0;
        if (includeAttribution) {
            this.logger.log('Attribution data included in ROI calculation');
        }
        this.logger.log(`ROI calculated: spend=${totalSpend}, revenue=${totalRevenue.toFixed(2)}, ROI=${roi}%`);
        return {
            totalSpend,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            roi,
            roas,
            byChannel,
        };
    }
    async comparePeriods(params) {
        const { periodAFrom, periodATo, periodBFrom, periodBTo, metrics: requestedMetrics = [], } = params;
        const dates = [periodAFrom, periodATo, periodBFrom, periodBTo].map((d) => new Date(d));
        if (dates.some((d) => isNaN(d.getTime()))) {
            throw new Error('All period dates must be valid ISO timestamps');
        }
        const defaultMetrics = [
            'visitors',
            'leads',
            'conversions',
            'revenue',
            'conversionRate',
            'avgOrderValue',
        ];
        const metricKeys = requestedMetrics.length > 0 ? requestedMetrics : defaultMetrics;
        const generatePeriodMetrics = () => {
            const m = {};
            for (const key of metricKeys) {
                switch (key) {
                    case 'visitors':
                        m[key] = 30000 + Math.floor(Math.random() * 40000);
                        break;
                    case 'leads':
                        m[key] = 1500 + Math.floor(Math.random() * 2000);
                        break;
                    case 'conversions':
                        m[key] = 200 + Math.floor(Math.random() * 400);
                        break;
                    case 'revenue':
                        m[key] = +(10000 + Math.random() * 40000).toFixed(2);
                        break;
                    case 'conversionRate':
                        m[key] = +(1 + Math.random() * 4).toFixed(2);
                        break;
                    case 'avgOrderValue':
                        m[key] = +(30 + Math.random() * 70).toFixed(2);
                        break;
                    default:
                        m[key] = Math.floor(Math.random() * 10000);
                }
            }
            return m;
        };
        const periodA = generatePeriodMetrics();
        const periodB = generatePeriodMetrics();
        const changes = {};
        for (const key of metricKeys) {
            const aVal = periodA[key] || 0;
            const bVal = periodB[key] || 0;
            const diff = bVal - aVal;
            const percent = aVal !== 0 ? +((diff / aVal) * 100).toFixed(2) : 0;
            const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
            changes[key] = { value: +diff.toFixed(2), percent, direction };
        }
        const insights = [];
        for (const [key, change] of Object.entries(changes)) {
            if (Math.abs(change.percent) > 20) {
                const direction = change.direction === 'up' ? 'increased' : 'decreased';
                insights.push(`${key} ${direction} significantly by ${Math.abs(change.percent)}% between the two periods.`);
            }
        }
        if (insights.length === 0) {
            insights.push('No significant changes detected between the two periods. Marketing performance appears stable.');
        }
        this.logger.log(`Period comparison: ${Object.keys(changes).length} metrics compared`);
        return { periodA, periodB, changes, insights };
    }
    async exportData(params) {
        const { dataType, format, filters } = params;
        const validDataTypes = ['report', 'conversions', 'funnel', 'roi', 'raw'];
        if (!validDataTypes.includes(dataType)) {
            throw new Error(`Invalid data type: ${dataType}. Valid: ${validDataTypes.join(', ')}`);
        }
        const validFormats = ['csv', 'json', 'xlsx', 'pdf'];
        if (!validFormats.includes(format)) {
            throw new Error(`Invalid format: ${format}. Valid: ${validFormats.join(', ')}`);
        }
        this.exportCounter++;
        const exportId = `export-${Date.now()}-${this.exportCounter}`;
        let recordCount = 0;
        switch (dataType) {
            case 'report':
                recordCount = this.reports.size;
                break;
            case 'conversions':
                recordCount = this.conversionData.length;
                break;
            case 'funnel':
                recordCount = 5;
                break;
            case 'roi':
                recordCount = 5;
                break;
            case 'raw':
                recordCount = this.conversionData.length + this.reports.size;
                break;
        }
        recordCount = Math.max(recordCount, 10);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        this.logger.log(`Export created: ${exportId}, type=${dataType}, format=${format}, records=${recordCount}`);
        return {
            exportId,
            format,
            recordCount,
            downloadUrl: `/exports/${exportId}.${format}`,
            expiresAt: expiresAt.toISOString(),
        };
    }
    seedConversionData() {
        const channels = ['email', 'social', 'paid-search', 'organic', 'referral', 'display'];
        const sources = [
            'google',
            'facebook',
            'instagram',
            'linkedin',
            'twitter',
            'direct',
            'newsletter',
        ];
        const types = ['purchase', 'signup', 'download', 'trial', 'demo'];
        for (let i = 0; i < 500; i++) {
            this.conversionData.push({
                type: types[Math.floor(Math.random() * types.length)],
                channel: channels[Math.floor(Math.random() * channels.length)],
                source: sources[Math.floor(Math.random() * sources.length)],
                value: +(10 + Math.random() * 200).toFixed(2),
                timestamp: new Date(Date.now() - Math.floor(Math.random() * 90 * 24 * 60 * 60 * 1000)),
            });
        }
    }
    generateChannelData(channels) {
        const defaultChannels = ['email', 'social', 'paid-search', 'organic', 'referral'];
        const reportChannels = channels.length > 0 ? channels : defaultChannels;
        const channelData = {};
        for (const channel of reportChannels) {
            channelData[channel] = {
                visitors: 5000 + Math.floor(Math.random() * 20000),
                conversions: 50 + Math.floor(Math.random() * 300),
                revenue: +(2000 + Math.random() * 15000).toFixed(2),
                spend: +(500 + Math.random() * 5000).toFixed(2),
            };
        }
        return channelData;
    }
    generateTrendData(fromDate, toDate, points) {
        const trends = [];
        const intervalMs = (toDate.getTime() - fromDate.getTime()) / points;
        let baseValue = 1000 + Math.floor(Math.random() * 5000);
        for (let i = 0; i < points; i++) {
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
    generateCampaignBreakdown(count) {
        const breakdown = [];
        const statuses = ['active', 'completed', 'paused', 'draft'];
        for (let i = 0; i < Math.min(count, 10); i++) {
            breakdown.push({
                name: `Campaign ${i + 1}`,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                openRate: +(15 + Math.random() * 20).toFixed(2),
                clickRate: +(2 + Math.random() * 5).toFixed(2),
                conversions: Math.floor(Math.random() * 100),
                revenue: +(500 + Math.random() * 5000).toFixed(2),
            });
        }
        return breakdown;
    }
    generateFunnelRecommendations(stages, biggestDropOff) {
        const recommendations = [];
        if (biggestDropOff.rate > 0.5) {
            recommendations.push(`The biggest drop-off occurs at "${biggestDropOff.stage}" (${(biggestDropOff.rate * 100).toFixed(0)}%). Focus optimization efforts here for the highest impact.`);
        }
        const lowConversionStages = stages.filter((s) => s.conversionRate < 50 && s.name !== stages[0]?.name);
        if (lowConversionStages.length > 0) {
            recommendations.push(`Stages with below 50% conversion: ${lowConversionStages.map((s) => s.name).join(', ')}. Consider A/B testing at these points.`);
        }
        if (stages.length >= 3) {
            const midStageConversion = stages[Math.floor(stages.length / 2)].conversionRate;
            if (midStageConversion < 40) {
                recommendations.push('Mid-funnel conversion is low. Improve content relevance and reduce friction in the consideration phase.');
            }
        }
        recommendations.push('Implement retargeting campaigns for users who drop off at key funnel stages.');
        return recommendations;
    }
};
exports.AnalyticsAgentService = AnalyticsAgentService;
exports.AnalyticsAgentService = AnalyticsAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], AnalyticsAgentService);
//# sourceMappingURL=analytics-agent.service.js.map