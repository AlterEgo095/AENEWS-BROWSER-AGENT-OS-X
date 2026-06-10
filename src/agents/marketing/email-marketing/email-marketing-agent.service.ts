/**
 * AENEWS Agent OS X - Email Marketing Agent
 * Email campaign management, templates, A/B testing, results analysis,
 * and subscriber management for marketing email operations.
 */

import { Injectable } from '@nestjs/common';
import { BaseAgentService } from '../../base/base-agent.service';
import {
  AgentConfig,
  AgentCluster,
  AgentInput,
  AgentOutput,
} from '../../interfaces/agent.interface';

// ─── Agent Configuration ──────────────────────────────────────────

export const EMAIL_MARKETING_AGENT_CONFIG: AgentConfig = {
  id: 'marketing-email',
  name: 'EmailMarketing',
  cluster: AgentCluster.MARKETING,
  version: '1.0.0',
  description:
    'Email marketing agent that handles campaign creation, sending, templates, A/B testing, results analysis, and subscriber list management.',
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
          variable: { type: 'string', enum: ['subject', 'from_name', 'body', 'cta'], description: 'Variable to test' },
          variantA: { type: 'string', description: 'Variant A value' },
          variantB: { type: 'string', description: 'Variant B value' },
          testSizePercent: { type: 'number', description: 'Percentage of list for test phase' },
          winnerCriteria: { type: 'string', enum: ['open_rate', 'click_rate', 'conversion'], description: 'Criteria for winner' },
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
          metrics: { type: 'array', items: { type: 'string' }, description: 'Specific metrics to retrieve' },
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
          action: { type: 'string', enum: ['add', 'remove', 'update', 'segment', 'list'], description: 'Action to perform' },
          listId: { type: 'string', description: 'Subscriber list ID' },
          subscribers: { type: 'array', items: { type: 'object' }, description: 'Subscriber data' },
          segmentRules: { type: 'array', items: { type: 'object' }, description: 'Segmentation rules' },
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

// ─── Internal Types ───────────────────────────────────────────────

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  bodyHtml: string;
  bodyText: string;
  templateId: string;
  listIds: string[];
  tags: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'archived';
  scheduledAt: Date | null;
  sentAt: Date | null;
  stats: CampaignStats;
  abTest: ABTestData | null;
  createdAt: Date;
}

interface CampaignStats {
  recipients: number;
  delivered: number;
  opens: number;
  clicks: number;
  bounces: number;
  unsubscribes: number;
  complaints: number;
  conversions: number;
  revenue: number;
}

interface ABTestData {
  testId: string;
  variable: string;
  variantA: string;
  variantB: string;
  testSizePercent: number;
  winnerCriteria: string;
  status: 'testing' | 'completed' | 'cancelled';
  variantAResults: { opens: number; clicks: number; conversions: number };
  variantBResults: { opens: number; clicks: number; conversions: number };
  winner: string | null;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  category: string;
  createdAt: Date;
}

interface SubscriberList {
  id: string;
  name: string;
  subscribers: Subscriber[];
  createdAt: Date;
}

interface Subscriber {
  email: string;
  name: string;
  status: 'active' | 'unsubscribed' | 'bounced' | 'complained';
  tags: string[];
  customFields: Record<string, string>;
  subscribedAt: Date;
}

// ─── Agent Service ────────────────────────────────────────────────

@Injectable()
export class EmailMarketingAgentService extends BaseAgentService {
  private campaigns: Map<string, EmailCampaign> = new Map();
  private templates: Map<string, EmailTemplate> = new Map();
  private lists: Map<string, SubscriberList> = new Map();
  private abTests: Map<string, ABTestData> = new Map();
  private campaignCounter: number = 0;
  private templateCounter: number = 0;

  protected defineConfig(): AgentConfig {
    return EMAIL_MARKETING_AGENT_CONFIG;
  }

  protected async onInitialize(): Promise<void> {
    this.seedTemplates();
    this.seedDefaultList();

    // Register tools
    this.registerTool({
      name: 'createCampaign',
      description: 'Create a new email marketing campaign',
      execute: async (params: {
        name: string;
        subject: string;
        fromEmail: string;
        fromName?: string;
        bodyHtml?: string;
        bodyText?: string;
        templateId?: string;
        listIds?: string[];
        tags?: string[];
      }) => this.createCampaign(params),
    });

    this.registerTool({
      name: 'sendCampaign',
      description: 'Send or schedule an email campaign',
      execute: async (params: {
        campaignId: string;
        scheduleAt?: string;
        sendToAll?: boolean;
      }) => this.sendCampaign(params),
    });

    this.registerTool({
      name: 'createTemplate',
      description: 'Create an email template for reuse',
      execute: async (params: {
        name: string;
        subject: string;
        bodyHtml: string;
        bodyText?: string;
        category?: string;
      }) => this.createTemplate(params),
    });

    this.registerTool({
      name: 'abTest',
      description: 'Create and run an A/B test for an email campaign',
      execute: async (params: {
        campaignId: string;
        variable: string;
        variantA: string;
        variantB: string;
        testSizePercent?: number;
        winnerCriteria?: string;
      }) => this.abTest(params),
    });

    this.registerTool({
      name: 'analyzeResults',
      description: 'Analyze campaign results and performance metrics',
      execute: async (params: {
        campaignId: string;
        compareWith?: string;
        metrics?: string[];
      }) => this.analyzeResults(params),
    });

    this.registerTool({
      name: 'manageSubscribers',
      description: 'Manage subscriber lists and individual subscribers',
      execute: async (params: {
        action: string;
        listId?: string;
        subscribers?: Array<{ email: string; name: string; tags?: string[] }>;
        segmentRules?: Array<{ field: string; operator: string; value: string }>;
      }) => this.manageSubscribers(params),
    });

    await this.storeInWorkingMemory('email-marketing:initializedAt', new Date().toISOString(), 600000);
    this.logger.log('EmailMarketing agent initialized with 6 tools');
  }

  protected async onExecute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const { action, ...params } = input.payload;

    if (!action) {
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        'Missing required parameter: action',
        startTime,
      );
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
      return this.createAgentOutput(
        input.taskId,
        false,
        null,
        `Unknown email marketing action: ${action}. Supported: ${supportedActions.join(', ')}`,
        startTime,
      );
    }

    try {
      const tool = this.getTool(action);
      if (!tool) {
        return this.createAgentOutput(
          input.taskId,
          false,
          null,
          `Tool not found: ${action}`,
          startTime,
        );
      }

      const result = await tool.execute(params);

      await this.storeInWorkingMemory(
        `email-marketing:last:${action}`,
        { params, result, timestamp: new Date() },
        300000,
      );

      return this.createAgentOutput(input.taskId, true, result, undefined, startTime);
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`EmailMarketing execution failed for ${action}: ${msg}`);
      return this.createAgentOutput(input.taskId, false, null, msg, startTime);
    }
  }

  protected async onDestroy(): Promise<void> {
    this.campaigns.clear();
    this.templates.clear();
    this.lists.clear();
    this.abTests.clear();
    this.campaignCounter = 0;
    this.templateCounter = 0;
    this.logger.log('EmailMarketing agent destroyed, all data cleared');
  }

  // ─── Tool Implementations ──────────────────────────────────────

  private async createCampaign(params: {
    name: string;
    subject: string;
    fromEmail: string;
    fromName?: string;
    bodyHtml?: string;
    bodyText?: string;
    templateId?: string;
    listIds?: string[];
    tags?: string[];
  }): Promise<{
    campaignId: string;
    name: string;
    status: string;
    createdAt: string;
  }> {
    const {
      name,
      subject,
      fromEmail,
      fromName = 'Marketing Team',
      bodyHtml = '',
      bodyText = '',
      templateId = '',
      listIds = [],
      tags = [],
    } = params;

    if (!name || typeof name !== 'string') {
      throw new Error('A valid campaign name is required');
    }
    if (!subject || typeof subject !== 'string') {
      throw new Error('A valid subject line is required');
    }
    if (!fromEmail || typeof fromEmail !== 'string') {
      throw new Error('A valid from email is required');
    }

    // Validate template if specified
    if (templateId && !this.templates.has(templateId)) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Apply template if specified and no custom body
    let finalHtml = bodyHtml;
    let finalText = bodyText;

    if (templateId && !bodyHtml) {
      const template = this.templates.get(templateId)!;
      finalHtml = template.bodyHtml;
      finalText = template.bodyText || bodyText;
    }

    const campaignId = this.generateCampaignId();
    const campaign: EmailCampaign = {
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

    this.logger.log(
      `Created campaign: ${campaignId}, name="${name}", template=${templateId || 'none'}`,
    );

    return {
      campaignId,
      name,
      status: 'draft',
      createdAt: campaign.createdAt.toISOString(),
    };
  }

  private async sendCampaign(params: {
    campaignId: string;
    scheduleAt?: string;
    sendToAll?: boolean;
  }): Promise<{
    campaignId: string;
    status: string;
    recipientCount: number;
    sentAt: string;
  }> {
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

    // Calculate recipient count from lists
    let recipientCount = 0;
    for (const listId of campaign.listIds) {
      const list = this.lists.get(listId);
      if (list) {
        recipientCount += list.subscribers.filter((s) => s.status === 'active').length;
      }
    }

    // Use default list if no lists specified
    if (recipientCount === 0 && sendToAll) {
      const defaultList = this.lists.get('default');
      if (defaultList) {
        recipientCount = defaultList.subscribers.filter((s) => s.status === 'active').length;
      }
      recipientCount = Math.max(recipientCount, 100); // Minimum simulated
    }

    if (scheduleAt) {
      const scheduledDate = new Date(scheduleAt);
      if (isNaN(scheduledDate.getTime())) {
        throw new Error('Invalid scheduleAt timestamp');
      }
      campaign.scheduledAt = scheduledDate;
      campaign.status = 'scheduled';

      this.logger.log(
        `Scheduled campaign: ${campaignId} for ${scheduleAt}, recipients=${recipientCount}`,
      );

      return {
        campaignId,
        status: 'scheduled',
        recipientCount,
        sentAt: scheduleAt,
      };
    }

    // Send immediately (simulated)
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

    this.logger.log(
      `Sent campaign: ${campaignId}, recipients=${recipientCount}, opens=${campaign.stats.opens}`,
    );

    return {
      campaignId,
      status: 'sent',
      recipientCount,
      sentAt: campaign.sentAt.toISOString(),
    };
  }

  private async createTemplate(params: {
    name: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    category?: string;
  }): Promise<{
    templateId: string;
    name: string;
    createdAt: string;
  }> {
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
    const template: EmailTemplate = {
      id: templateId,
      name,
      subject,
      bodyHtml,
      bodyText,
      category,
      createdAt: new Date(),
    };

    this.templates.set(templateId, template);

    this.logger.log(
      `Created template: ${templateId}, name="${name}", category=${category}`,
    );

    return {
      templateId,
      name,
      createdAt: template.createdAt.toISOString(),
    };
  }

  private async abTest(params: {
    campaignId: string;
    variable: string;
    variantA: string;
    variantB: string;
    testSizePercent?: number;
    winnerCriteria?: string;
  }): Promise<{
    testId: string;
    variantA: Record<string, any>;
    variantB: Record<string, any>;
    status: string;
  }> {
    const {
      campaignId,
      variable,
      variantA,
      variantB,
      testSizePercent = 20,
      winnerCriteria = 'open_rate',
    } = params;

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
    const abTestData: ABTestData = {
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

    // Simulate test results
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

    // Determine winner based on criteria
    const metricMap: Record<string, keyof typeof abTestData.variantAResults> = {
      open_rate: 'opens',
      click_rate: 'clicks',
      conversion: 'conversions',
    };

    const metric = metricMap[winnerCriteria] || 'opens';
    abTestData.winner = abTestData.variantAResults[metric] >= abTestData.variantBResults[metric]
      ? 'A'
      : 'B';
    abTestData.status = 'completed';

    campaign.abTest = abTestData;
    this.abTests.set(testId, abTestData);

    this.logger.log(
      `A/B test created: ${testId}, variable=${variable}, winner=${abTestData.winner}`,
    );

    return {
      testId,
      variantA: { value: variantA, results: abTestData.variantAResults },
      variantB: { value: variantB, results: abTestData.variantBResults },
      status: abTestData.status,
    };
  }

  private async analyzeResults(params: {
    campaignId: string;
    compareWith?: string;
    metrics?: string[];
  }): Promise<{
    campaignId: string;
    metrics: Record<string, number>;
    insights: string[];
    comparison?: Record<string, any>;
  }> {
    const { campaignId, compareWith, metrics: requestedMetrics = [] } = params;

    if (!campaignId || typeof campaignId !== 'string') {
      throw new Error('A valid campaignId is required');
    }

    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const stats = campaign.stats;

    // Calculate derived metrics
    const allMetrics: Record<string, number> = {
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

    // Filter metrics if specific ones were requested
    const resultMetrics = requestedMetrics.length > 0
      ? Object.fromEntries(Object.entries(allMetrics).filter(([key]) => requestedMetrics.includes(key)))
      : allMetrics;

    // Generate insights
    const insights = this.generateInsights(allMetrics);

    // Comparison if requested
    let comparison: Record<string, any> | undefined;
    if (compareWith) {
      const compareCampaign = this.campaigns.get(compareWith);
      if (compareCampaign) {
        const compareStats = compareCampaign.stats;
        comparison = {
          campaignId: compareWith,
          openRateDiff: allMetrics.openRate - (compareStats.delivered > 0 ? (compareStats.opens / compareStats.delivered) * 100 : 0),
          clickRateDiff: allMetrics.clickRate - (compareStats.delivered > 0 ? (compareStats.clicks / compareStats.delivered) * 100 : 0),
          conversionDiff: allMetrics.conversionRate - (compareStats.clicks > 0 ? (compareStats.conversions / compareStats.clicks) * 100 : 0),
        };
      }
    }

    this.logger.log(
      `Analyzed campaign: ${campaignId}, openRate=${allMetrics.openRate}%, clickRate=${allMetrics.clickRate}%`,
    );

    return {
      campaignId,
      metrics: resultMetrics,
      insights,
      comparison,
    };
  }

  private async manageSubscribers(params: {
    action: string;
    listId?: string;
    subscribers?: Array<{ email: string; name: string; tags?: string[] }>;
    segmentRules?: Array<{ field: string; operator: string; value: string }>;
  }): Promise<{
    action: string;
    affected: number;
    listId: string;
    status: string;
  }> {
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
            if (sub.name) existing.name = sub.name;
            if (sub.tags) existing.tags = [...new Set([...existing.tags, ...sub.tags])];
            affected++;
          }
        }
        break;
      }

      case 'segment': {
        if (segmentRules.length === 0) {
          throw new Error('Segmentation rules are required for segment action');
        }
        // Apply segment rules (simplified)
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

    this.logger.log(
      `Subscriber ${action}: list=${listId}, affected=${affected}`,
    );

    return {
      action,
      affected,
      listId,
      status: 'completed',
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private seedTemplates(): void {
    const builtInTemplates: EmailTemplate[] = [
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

  private seedDefaultList(): void {
    this.lists.set('default', {
      id: 'default',
      name: 'Default Subscriber List',
      subscribers: [],
      createdAt: new Date(),
    });
  }

  private generateCampaignId(): string {
    this.campaignCounter++;
    return `camp-${Date.now()}-${this.campaignCounter}`;
  }

  private generateTemplateId(): string {
    this.templateCounter++;
    return `tpl-${Date.now()}-${this.templateCounter}`;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private generateInsights(metrics: Record<string, number>): string[] {
    const insights: string[] = [];

    if (metrics.openRate < 15) {
      insights.push('Open rate is below industry average (15-25%). Consider testing different subject lines and send times.');
    } else if (metrics.openRate > 25) {
      insights.push('Open rate is above average. Your subject lines are performing well.');
    }

    if (metrics.clickRate < 2) {
      insights.push('Click rate is low. Review your call-to-action placement and email content relevance.');
    } else if (metrics.clickRate > 5) {
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
}
