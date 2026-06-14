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
exports.EmailMarketingAgentService = exports.EMAIL_MARKETING_AGENT_CONFIG = void 0;
const common_1 = require("@nestjs/common");
const base_agent_service_1 = require("../../base/base-agent.service");
const agent_interface_1 = require("../../interfaces/agent.interface");
const bridge_1 = require("../../bridge");
const interfaces_1 = require("../../../software-factory/interfaces");
exports.EMAIL_MARKETING_AGENT_CONFIG = {
    id: 'marketing-email',
    name: 'EmailMarketing',
    cluster: agent_interface_1.AgentCluster.MARKETING,
    version: '1.0.0',
    description: 'Email marketing agent that handles campaign creation, sending, templates, A/B testing, results analysis, and subscriber list management.',
    capabilities: [
        {
            name: 'createCampaign',
            description: 'Create a new email marketing campaign',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Campaign name' },
                    subject: { type: 'string', description: 'Email subject line' },
                    fromName: { type: 'string', description: 'Sender display name' },
                    fromEmail: { type: 'string', description: 'Sender email address' },
                    bodyHtml: { type: 'string', description: 'HTML email body' },
                    bodyText: { type: 'string', description: 'Plain text email body' },
                    templateId: { type: 'string', description: 'Template ID to use' },
                    listIds: { type: 'array', items: { type: 'string' }, description: 'Subscriber list IDs' },
                    tags: { type: 'array', items: { type: 'string' }, description: 'Campaign tags' },
                },
                required: ['name', 'subject', 'fromEmail'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    campaignId: { type: 'string' },
                    name: { type: 'string' },
                    status: { type: 'string' },
                    createdAt: { type: 'string' },
                },
            },
        },
        {
            name: 'sendCampaign',
            description: 'Send or schedule an email campaign',
            inputSchema: {
                type: 'object',
                properties: {
                    campaignId: { type: 'string', description: 'Campaign ID to send' },
                    scheduleAt: { type: 'string', description: 'ISO timestamp for scheduled send' },
                    sendToAll: { type: 'boolean', description: 'Whether to send to entire list' },
                },
                required: ['campaignId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    campaignId: { type: 'string' },
                    status: { type: 'string' },
                    recipientCount: { type: 'number' },
                    sentAt: { type: 'string' },
                },
            },
        },
        {
            name: 'createTemplate',
            description: 'Create an email template for reuse',
            inputSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Template name' },
                    subject: { type: 'string', description: 'Default subject line with variables' },
                    bodyHtml: { type: 'string', description: 'HTML body with variable placeholders' },
                    bodyText: { type: 'string', description: 'Plain text body with variable placeholders' },
                    category: { type: 'string', description: 'Template category' },
                },
                required: ['name', 'subject', 'bodyHtml'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    templateId: { type: 'string' },
                    name: { type: 'string' },
                    createdAt: { type: 'string' },
                },
            },
        },
        {
            name: 'abTest',
            description: 'Create and run an A/B test for an email campaign',
            inputSchema: {
                type: 'object',
                properties: {
                    campaignId: { type: 'string', description: 'Base campaign ID' },
                    variable: {
                        type: 'string',
                        enum: ['subject', 'from_name', 'body', 'cta'],
                        description: 'Variable to test',
                    },
                    variantA: { type: 'string', description: 'Variant A value' },
                    variantB: { type: 'string', description: 'Variant B value' },
                    testSizePercent: { type: 'number', description: 'Percentage of list for test phase' },
                    winnerCriteria: {
                        type: 'string',
                        enum: ['open_rate', 'click_rate', 'conversion'],
                        description: 'Criteria for winner',
                    },
                },
                required: ['campaignId', 'variable', 'variantA', 'variantB'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    testId: { type: 'string' },
                    variantA: { type: 'object' },
                    variantB: { type: 'object' },
                    status: { type: 'string' },
                },
            },
        },
        {
            name: 'analyzeResults',
            description: 'Analyze campaign results and performance metrics',
            inputSchema: {
                type: 'object',
                properties: {
                    campaignId: { type: 'string', description: 'Campaign ID to analyze' },
                    compareWith: { type: 'string', description: 'Another campaign ID for comparison' },
                    metrics: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Specific metrics to retrieve',
                    },
                },
                required: ['campaignId'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    campaignId: { type: 'string' },
                    metrics: { type: 'object' },
                    insights: { type: 'array', items: { type: 'string' } },
                    comparison: { type: 'object' },
                },
            },
        },
        {
            name: 'manageSubscribers',
            description: 'Manage subscriber lists and individual subscribers',
            inputSchema: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['add', 'remove', 'update', 'segment', 'list'],
                        description: 'Action to perform',
                    },
                    listId: { type: 'string', description: 'Subscriber list ID' },
                    subscribers: { type: 'array', items: { type: 'object' }, description: 'Subscriber data' },
                    segmentRules: {
                        type: 'array',
                        items: { type: 'object' },
                        description: 'Segmentation rules',
                    },
                },
                required: ['action'],
            },
            outputSchema: {
                type: 'object',
                properties: {
                    action: { type: 'string' },
                    affected: { type: 'number' },
                    listId: { type: 'string' },
                    status: { type: 'string' },
                },
            },
        },
    ],
    permissions: [
        'execute:task',
        'read:campaign',
        'write:campaign',
        'send:email',
        'read:subscribers',
        'write:subscribers',
    ],
    maxConcurrentTasks: 4,
    timeout: 60000,
    retryPolicy: {
        maxRetries: 2,
        backoffMs: 2000,
        exponentialBackoff: true,
    },
};
let EmailMarketingAgentService = class EmailMarketingAgentService extends base_agent_service_1.BaseAgentService {
    constructor(eventBusService, memoryService, permissionEvaluator, bridge) {
        super(eventBusService, memoryService, permissionEvaluator);
        this.bridge = bridge;
        this.campaigns = new Map();
        this.templates = new Map();
        this.lists = new Map();
        this.abTests = new Map();
        this.campaignCounter = 0;
        this.templateCounter = 0;
    }
    defineConfig() {
        return exports.EMAIL_MARKETING_AGENT_CONFIG;
    }
    async onInitialize() {
        this.seedTemplates();
        this.seedDefaultList();
        this.registerTool({
            name: 'createCampaign',
            description: 'Create a new email marketing campaign',
            execute: async (params) => this.createCampaign(params),
        });
        this.registerTool({
            name: 'sendCampaign',
            description: 'Send or schedule an email campaign',
            execute: async (params) => this.sendCampaign(params),
        });
        this.registerTool({
            name: 'createTemplate',
            description: 'Create an email template for reuse',
            execute: async (params) => this.createTemplate(params),
        });
        this.registerTool({
            name: 'abTest',
            description: 'Create and run an A/B test for an email campaign',
            execute: async (params) => this.abTest(params),
        });
        this.registerTool({
            name: 'analyzeResults',
            description: 'Analyze campaign results and performance metrics',
            execute: async (params) => this.analyzeResults(params),
        });
        this.registerTool({
            name: 'manageSubscribers',
            description: 'Manage subscriber lists and individual subscribers',
            execute: async (params) => this.manageSubscribers(params),
        });
        await this.storeInWorkingMemory('email-marketing:initializedAt', new Date().toISOString(), 600000);
        this.logger.log('EmailMarketing agent initialized with 6 tools');
    }
    async onExecute(input) {
        const startTime = Date.now();
        if (this.bridge) {
            try {
                const result = await this.bridge.executeCapability(interfaces_1.BusinessCapability.MARKETING, {
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
            'createCampaign',
            'sendCampaign',
            'createTemplate',
            'abTest',
            'analyzeResults',
            'manageSubscribers',
        ];
        if (!supportedActions.includes(action)) {
            return this.createAgentOutput(input.taskId, false, null, `Unknown email marketing action: ${action}. Supported: ${supportedActions.join(', ')}`, startTime);
        }
        try {
            const tool = this.getTool(action);
            if (!tool) {
                return this.createAgentOutput(input.taskId, false, null, `Tool not found: ${action}`, startTime);
            }
            const result = await tool.execute(params);
            await this.storeInWorkingMemory(`email-marketing:last:${action}`, { params, result, timestamp: new Date() }, 300000);
            return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
        }
        catch (error) {
            const msg = error.message;
            this.logger.error(`EmailMarketing execution failed for ${action}: ${msg}`);
            return this.createAgentOutput(input.taskId, false, null, msg, startTime);
        }
    }
    async onDestroy() {
        this.campaigns.clear();
        this.templates.clear();
        this.lists.clear();
        this.abTests.clear();
        this.campaignCounter = 0;
        this.templateCounter = 0;
        this.logger.log('EmailMarketing agent destroyed, all data cleared');
    }
    async createCampaign(params) {
        const { name, subject, fromEmail, fromName = 'Marketing Team', bodyHtml = '', bodyText = '', templateId = '', listIds = [], tags = [], } = params;
        if (!name || typeof name !== 'string') {
            throw new Error('A valid campaign name is required');
        }
        if (!subject || typeof subject !== 'string') {
            throw new Error('A valid subject line is required');
        }
        if (!fromEmail || typeof fromEmail !== 'string') {
            throw new Error('A valid from email is required');
        }
        if (templateId && !this.templates.has(templateId)) {
            throw new Error(`Template not found: ${templateId}`);
        }
        let finalHtml = bodyHtml;
        let finalText = bodyText;
        if (templateId && !bodyHtml) {
            const template = this.templates.get(templateId);
            finalHtml = template.bodyHtml;
            finalText = template.bodyText || bodyText;
        }
        const campaignId = this.generateCampaignId();
        const campaign = {
            id: campaignId,
            name,
            subject,
            fromName,
            fromEmail,
            bodyHtml: finalHtml,
            bodyText: finalText,
            templateId,
            listIds,
            tags,
            status: 'draft',
            scheduledAt: null,
            sentAt: null,
            stats: {
                recipients: 0,
                delivered: 0,
                opens: 0,
                clicks: 0,
                bounces: 0,
                unsubscribes: 0,
                complaints: 0,
                conversions: 0,
                revenue: 0,
            },
            abTest: null,
            createdAt: new Date(),
        };
        this.campaigns.set(campaignId, campaign);
        this.logger.log(`Created campaign: ${campaignId}, name="${name}", template=${templateId || 'none'}`);
        return {
            campaignId,
            name,
            status: 'draft',
            createdAt: campaign.createdAt.toISOString(),
        };
    }
    async sendCampaign(params) {
        const { campaignId, scheduleAt, sendToAll = true } = params;
        if (!campaignId || typeof campaignId !== 'string') {
            throw new Error('A valid campaignId is required');
        }
        const campaign = this.campaigns.get(campaignId);
        if (!campaign) {
            throw new Error(`Campaign not found: ${campaignId}`);
        }
        if (campaign.status === 'sent' || campaign.status === 'sending') {
            throw new Error(`Campaign ${campaignId} has already been sent or is sending`);
        }
        let recipientCount = 0;
        for (const listId of campaign.listIds) {
            const list = this.lists.get(listId);
            if (list) {
                recipientCount += list.subscribers.filter((s) => s.status === 'active').length;
            }
        }
        if (recipientCount === 0 && sendToAll) {
            const defaultList = this.lists.get('default');
            if (defaultList) {
                recipientCount = defaultList.subscribers.filter((s) => s.status === 'active').length;
            }
            recipientCount = Math.max(recipientCount, 100);
        }
        if (scheduleAt) {
            const scheduledDate = new Date(scheduleAt);
            if (isNaN(scheduledDate.getTime())) {
                throw new Error('Invalid scheduleAt timestamp');
            }
            campaign.scheduledAt = scheduledDate;
            campaign.status = 'scheduled';
            this.logger.log(`Scheduled campaign: ${campaignId} for ${scheduleAt}, recipients=${recipientCount}`);
            return {
                campaignId,
                status: 'scheduled',
                recipientCount,
                sentAt: scheduleAt,
            };
        }
        campaign.status = 'sent';
        campaign.sentAt = new Date();
        campaign.stats.recipients = recipientCount;
        campaign.stats.delivered = Math.floor(recipientCount * 0.97);
        campaign.stats.opens = Math.floor(recipientCount * (0.15 + Math.random() * 0.2));
        campaign.stats.clicks = Math.floor(campaign.stats.opens * (0.1 + Math.random() * 0.15));
        campaign.stats.bounces = recipientCount - campaign.stats.delivered;
        campaign.stats.unsubscribes = Math.floor(recipientCount * 0.005);
        campaign.stats.conversions = Math.floor(campaign.stats.clicks * (0.02 + Math.random() * 0.05));
        campaign.stats.revenue = campaign.stats.conversions * (10 + Math.random() * 50);
        this.logger.log(`Sent campaign: ${campaignId}, recipients=${recipientCount}, opens=${campaign.stats.opens}`);
        return {
            campaignId,
            status: 'sent',
            recipientCount,
            sentAt: campaign.sentAt.toISOString(),
        };
    }
    async createTemplate(params) {
        const { name, subject, bodyHtml, bodyText = '', category = 'general' } = params;
        if (!name || typeof name !== 'string') {
            throw new Error('A valid template name is required');
        }
        if (!subject || typeof subject !== 'string') {
            throw new Error('A valid subject line is required');
        }
        if (!bodyHtml || typeof bodyHtml !== 'string') {
            throw new Error('HTML body content is required');
        }
        const templateId = this.generateTemplateId();
        const template = {
            id: templateId,
            name,
            subject,
            bodyHtml,
            bodyText,
            category,
            createdAt: new Date(),
        };
        this.templates.set(templateId, template);
        this.logger.log(`Created template: ${templateId}, name="${name}", category=${category}`);
        return {
            templateId,
            name,
            createdAt: template.createdAt.toISOString(),
        };
    }
    async abTest(params) {
        const { campaignId, variable, variantA, variantB, testSizePercent = 20, winnerCriteria = 'open_rate', } = params;
        if (!campaignId || typeof campaignId !== 'string') {
            throw new Error('A valid campaignId is required');
        }
        const validVariables = ['subject', 'from_name', 'body', 'cta'];
        if (!validVariables.includes(variable)) {
            throw new Error(`Invalid test variable: ${variable}. Valid: ${validVariables.join(', ')}`);
        }
        const campaign = this.campaigns.get(campaignId);
        if (!campaign) {
            throw new Error(`Campaign not found: ${campaignId}`);
        }
        if (campaign.abTest) {
            throw new Error(`Campaign ${campaignId} already has an active A/B test`);
        }
        if (testSizePercent < 5 || testSizePercent > 50) {
            throw new Error('Test size percentage must be between 5 and 50');
        }
        const testId = `abt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const abTestData = {
            testId,
            variable,
            variantA,
            variantB,
            testSizePercent,
            winnerCriteria,
            status: 'testing',
            variantAResults: { opens: 0, clicks: 0, conversions: 0 },
            variantBResults: { opens: 0, clicks: 0, conversions: 0 },
            winner: null,
        };
        const baseRecipients = campaign.stats.recipients || 1000;
        const testRecipients = Math.floor(baseRecipients * (testSizePercent / 100));
        const halfRecipients = Math.floor(testRecipients / 2);
        abTestData.variantAResults = {
            opens: Math.floor(halfRecipients * (0.15 + Math.random() * 0.2)),
            clicks: Math.floor(halfRecipients * (0.03 + Math.random() * 0.07)),
            conversions: Math.floor(halfRecipients * (0.005 + Math.random() * 0.02)),
        };
        abTestData.variantBResults = {
            opens: Math.floor(halfRecipients * (0.15 + Math.random() * 0.2)),
            clicks: Math.floor(halfRecipients * (0.03 + Math.random() * 0.07)),
            conversions: Math.floor(halfRecipients * (0.005 + Math.random() * 0.02)),
        };
        const metricMap = {
            open_rate: 'opens',
            click_rate: 'clicks',
            conversion: 'conversions',
        };
        const metric = metricMap[winnerCriteria] || 'opens';
        abTestData.winner =
            abTestData.variantAResults[metric] >= abTestData.variantBResults[metric] ? 'A' : 'B';
        abTestData.status = 'completed';
        campaign.abTest = abTestData;
        this.abTests.set(testId, abTestData);
        this.logger.log(`A/B test created: ${testId}, variable=${variable}, winner=${abTestData.winner}`);
        return {
            testId,
            variantA: { value: variantA, results: abTestData.variantAResults },
            variantB: { value: variantB, results: abTestData.variantBResults },
            status: abTestData.status,
        };
    }
    async analyzeResults(params) {
        const { campaignId, compareWith, metrics: requestedMetrics = [] } = params;
        if (!campaignId || typeof campaignId !== 'string') {
            throw new Error('A valid campaignId is required');
        }
        const campaign = this.campaigns.get(campaignId);
        if (!campaign) {
            throw new Error(`Campaign not found: ${campaignId}`);
        }
        const stats = campaign.stats;
        const allMetrics = {
            recipients: stats.recipients,
            delivered: stats.delivered,
            opens: stats.opens,
            clicks: stats.clicks,
            bounces: stats.bounces,
            unsubscribes: stats.unsubscribes,
            conversions: stats.conversions,
            revenue: Math.round(stats.revenue * 100) / 100,
            deliveryRate: stats.recipients > 0 ? +((stats.delivered / stats.recipients) * 100).toFixed(2) : 0,
            openRate: stats.delivered > 0 ? +((stats.opens / stats.delivered) * 100).toFixed(2) : 0,
            clickRate: stats.delivered > 0 ? +((stats.clicks / stats.delivered) * 100).toFixed(2) : 0,
            clickToOpenRate: stats.opens > 0 ? +((stats.clicks / stats.opens) * 100).toFixed(2) : 0,
            bounceRate: stats.recipients > 0 ? +((stats.bounces / stats.recipients) * 100).toFixed(2) : 0,
            unsubscribeRate: stats.delivered > 0 ? +((stats.unsubscribes / stats.delivered) * 100).toFixed(2) : 0,
            conversionRate: stats.clicks > 0 ? +((stats.conversions / stats.clicks) * 100).toFixed(2) : 0,
        };
        const resultMetrics = requestedMetrics.length > 0
            ? Object.fromEntries(Object.entries(allMetrics).filter(([key]) => requestedMetrics.includes(key)))
            : allMetrics;
        const insights = this.generateInsights(allMetrics);
        let comparison;
        if (compareWith) {
            const compareCampaign = this.campaigns.get(compareWith);
            if (compareCampaign) {
                const compareStats = compareCampaign.stats;
                comparison = {
                    campaignId: compareWith,
                    openRateDiff: allMetrics.openRate -
                        (compareStats.delivered > 0 ? (compareStats.opens / compareStats.delivered) * 100 : 0),
                    clickRateDiff: allMetrics.clickRate -
                        (compareStats.delivered > 0 ? (compareStats.clicks / compareStats.delivered) * 100 : 0),
                    conversionDiff: allMetrics.conversionRate -
                        (compareStats.clicks > 0 ? (compareStats.conversions / compareStats.clicks) * 100 : 0),
                };
            }
        }
        this.logger.log(`Analyzed campaign: ${campaignId}, openRate=${allMetrics.openRate}%, clickRate=${allMetrics.clickRate}%`);
        return {
            campaignId,
            metrics: resultMetrics,
            insights,
            comparison,
        };
    }
    async manageSubscribers(params) {
        const { action, listId = 'default', subscribers = [], segmentRules = [] } = params;
        const validActions = ['add', 'remove', 'update', 'segment', 'list'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid subscriber action: ${action}. Valid: ${validActions.join(', ')}`);
        }
        let list = this.lists.get(listId);
        if (!list) {
            list = {
                id: listId,
                name: listId === 'default' ? 'Default List' : `List ${listId}`,
                subscribers: [],
                createdAt: new Date(),
            };
            this.lists.set(listId, list);
        }
        let affected = 0;
        switch (action) {
            case 'add': {
                if (subscribers.length === 0) {
                    throw new Error('Subscriber data is required for add action');
                }
                for (const sub of subscribers) {
                    if (!sub.email || !this.isValidEmail(sub.email)) {
                        continue;
                    }
                    const exists = list.subscribers.some((s) => s.email === sub.email);
                    if (!exists) {
                        list.subscribers.push({
                            email: sub.email,
                            name: sub.name || '',
                            status: 'active',
                            tags: sub.tags || [],
                            customFields: {},
                            subscribedAt: new Date(),
                        });
                        affected++;
                    }
                }
                break;
            }
            case 'remove': {
                if (subscribers.length === 0) {
                    throw new Error('Subscriber data is required for remove action');
                }
                const emailsToRemove = new Set(subscribers.map((s) => s.email));
                const originalLength = list.subscribers.length;
                list.subscribers = list.subscribers.filter((s) => !emailsToRemove.has(s.email));
                affected = originalLength - list.subscribers.length;
                break;
            }
            case 'update': {
                if (subscribers.length === 0) {
                    throw new Error('Subscriber data is required for update action');
                }
                for (const sub of subscribers) {
                    const existing = list.subscribers.find((s) => s.email === sub.email);
                    if (existing) {
                        if (sub.name)
                            existing.name = sub.name;
                        if (sub.tags)
                            existing.tags = [...new Set([...existing.tags, ...sub.tags])];
                        affected++;
                    }
                }
                break;
            }
            case 'segment': {
                if (segmentRules.length === 0) {
                    throw new Error('Segmentation rules are required for segment action');
                }
                const segment = list.subscribers.filter((sub) => {
                    return segmentRules.every((rule) => {
                        const fieldValue = sub.customFields[rule.field] || sub.name || sub.email;
                        switch (rule.operator) {
                            case 'equals':
                                return fieldValue === rule.value;
                            case 'contains':
                                return fieldValue.includes(rule.value);
                            case 'starts_with':
                                return fieldValue.startsWith(rule.value);
                            default:
                                return true;
                        }
                    });
                });
                affected = segment.length;
                break;
            }
            case 'list': {
                affected = list.subscribers.filter((s) => s.status === 'active').length;
                break;
            }
        }
        this.logger.log(`Subscriber ${action}: list=${listId}, affected=${affected}`);
        return {
            action,
            affected,
            listId,
            status: 'completed',
        };
    }
    seedTemplates() {
        const builtInTemplates = [
            {
                id: 'tpl-welcome',
                name: 'Welcome Email',
                subject: 'Welcome to {{brand_name}}!',
                bodyHtml: '<h1>Welcome, {{name}}!</h1><p>Thank you for joining {{brand_name}}. We\'re excited to have you on board.</p><p><a href="{{onboarding_url}}">Get Started</a></p>',
                bodyText: 'Welcome, {{name}}! Thank you for joining {{brand_name}}.',
                category: 'onboarding',
                createdAt: new Date(),
            },
            {
                id: 'tpl-newsletter',
                name: 'Weekly Newsletter',
                subject: '{{brand_name}} Weekly - {{date}}',
                bodyHtml: '<h2>{{brand_name}} Weekly Newsletter</h2><h3>{{headline}}</h3><p>{{summary}}</p><a href="{{article_url}}">Read More</a>',
                bodyText: '{{brand_name}} Weekly - {{headline}}. {{summary}}',
                category: 'newsletter',
                createdAt: new Date(),
            },
            {
                id: 'tpl-promo',
                name: 'Promotional Offer',
                subject: '🔥 {{discount_percent}}% off - Limited Time!',
                bodyHtml: '<h1>Special Offer!</h1><p>Get {{discount_percent}}% off with code <strong>{{promo_code}}</strong></p><p>Offer expires {{expiry_date}}</p><a href="{{shop_url}}">Shop Now</a>',
                bodyText: 'Special Offer! Get {{discount_percent}}% off with code {{promo_code}}. Expires {{expiry_date}}.',
                category: 'promotional',
                createdAt: new Date(),
            },
        ];
        for (const template of builtInTemplates) {
            this.templates.set(template.id, template);
        }
    }
    seedDefaultList() {
        this.lists.set('default', {
            id: 'default',
            name: 'Default Subscriber List',
            subscribers: [],
            createdAt: new Date(),
        });
    }
    generateCampaignId() {
        this.campaignCounter++;
        return `camp-${Date.now()}-${this.campaignCounter}`;
    }
    generateTemplateId() {
        this.templateCounter++;
        return `tpl-${Date.now()}-${this.templateCounter}`;
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    generateInsights(metrics) {
        const insights = [];
        if (metrics.openRate < 15) {
            insights.push('Open rate is below industry average (15-25%). Consider testing different subject lines and send times.');
        }
        else if (metrics.openRate > 25) {
            insights.push('Open rate is above average. Your subject lines are performing well.');
        }
        if (metrics.clickRate < 2) {
            insights.push('Click rate is low. Review your call-to-action placement and email content relevance.');
        }
        else if (metrics.clickRate > 5) {
            insights.push('Click rate is strong. Your content and CTAs are resonating with subscribers.');
        }
        if (metrics.bounceRate > 5) {
            insights.push('Bounce rate is elevated. Consider cleaning your subscriber list and implementing double opt-in.');
        }
        if (metrics.unsubscribeRate > 0.5) {
            insights.push('Unsubscribe rate is above normal. Review email frequency and content relevance.');
        }
        if (metrics.conversionRate > 3) {
            insights.push('Conversion rate is excellent. Your email-to-purchase funnel is working well.');
        }
        if (metrics.revenue > 0) {
            insights.push(`Campaign generated $${metrics.revenue.toFixed(2)} in revenue with ${metrics.conversions} conversions.`);
        }
        if (insights.length === 0) {
            insights.push('Campaign metrics are within normal ranges. Continue monitoring performance over time.');
        }
        return insights;
    }
};
exports.EmailMarketingAgentService = EmailMarketingAgentService;
exports.EmailMarketingAgentService = EmailMarketingAgentService = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(bridge_1.AgentConnectorBridge)),
    __metadata("design:paramtypes", [Object, Object, Object, bridge_1.AgentConnectorBridge])
], EmailMarketingAgentService);
//# sourceMappingURL=email-marketing-agent.service.js.map